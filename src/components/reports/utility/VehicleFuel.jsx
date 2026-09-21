import React, { useEffect, useState, useMemo } from "react";
import { Calendar, Filter } from "lucide-react";
import { getAllPlants } from "../../../services/plantService";
import { getVehicleFuelDetails, getVehiclesByPlant } from "../../../services/vehicleService";
import * as XLSX from "xlsx";
import companyLogo from '../company_logo1.jpg'
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const formatDisplayDate = (dateString) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (isNaN(d)) return "-";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};

const formatIndian = (val) => {
  if (val === null || val === undefined) return "-";
  return Number(val).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  });
};

const VehicleFuel = () => {

  const [plants,setPlants] = useState([]);
  const [fuelData,setFuelData] = useState([]);
  const [selectedZone,setSelectedZone] = useState("ALL");
  const [selectedPhase, setSelectedPhase] = useState("ALL");
  const [dateRange,setDateRange] = useState({from:"",to:""});
const [billFilter, setBillFilter] = useState("ALL");
  /* FETCH PLANTS */

  useEffect(()=>{
    getAllPlants().then(setPlants);
  },[]);

  /* FETCH VEHICLES + FUEL */

  useEffect(() => {

    if (!plants.length) return;

    const fetchData = async () => {

      const results = await Promise.all(

        plants.map(async (p) => {

          const vehicles = await getVehiclesByPlant(p.plantID);

          const vehicleMap = {};

          for(const v of vehicles || []){

            const fuel = await getVehicleFuelDetails(v.vehicleID);

            vehicleMap[v.vehicleNumber] = Array.isArray(fuel) ? fuel : [];

          }

          return {
            ...p,
            vehicles: vehicles || [],
            vehicleMap
          };

        })

      );

      setFuelData(results);

    };

    fetchData();

  },[plants]);

  /* ZONES */

 const zones = useMemo(()=>{

  const clean = plants
    .map(p => p.zones)
    .filter(z => z);

  const sortedZones = [...new Set(clean)].sort((a,b)=>{

    const numA = parseInt(String(a).replace(/\D/g,'')) || 0;
    const numB = parseInt(String(b).replace(/\D/g,'')) || 0;

    return numA - numB;

  });

  return ["ALL", ...sortedZones];

},[plants]);

const phases = useMemo(() => {

  const clean = plants
    .map((p) => p.plantPhase)
    .filter((p) => p !== null && p !== undefined);

  return [
    "ALL",
    ...[...new Set(clean)].sort((a, b) => Number(a) - Number(b)),
  ];

}, [plants]);

  /* ZONE FILTER */

const filteredPlants = useMemo(() => {

  return fuelData.filter((p) => {

    const zoneMatch =
      selectedZone === "ALL" ||
      String(p.zones) === String(selectedZone);

    const phaseMatch =
      selectedPhase === "ALL" ||
      String(p.plantPhase) === String(selectedPhase);

    return zoneMatch && phaseMatch;

  });

}, [fuelData, selectedZone, selectedPhase]);


const calculateMileage = (records) => {

  if (!records || records.length === 0) return [];

  const sorted = [...records].sort(
    (a, b) => new Date(a.lastFuelFilledDate) - new Date(b.lastFuelFilledDate)
  );

  const result = [];

  sorted.forEach((curr, index) => {

    if (index === 0) {
      result.push({
        ...curr,
        mileage: null
      });
      return;
    }

    const prev = sorted[index - 1];

    const distance =
      (curr.currentOdometerReading || 0) -
      (prev.currentOdometerReading || 0);

    const fuel = Number(curr.filledLiters) || 0;

    const mileage = fuel > 0 ? distance / fuel : 0;

    result.push({
      ...curr,
      distanceTravelled: distance,
      mileage: mileage.toFixed(2)
    });

  });

  return result;
};

  /* DATE FILTER PER VEHICLE */

 const finalData = filteredPlants.map(p => {

  const filteredVehicleMap = {};

  Object.keys(p.vehicleMap).forEach(vehicleNumber => {

    const records = p.vehicleMap[vehicleNumber] || [];

const mileageRecords = calculateMileage(records);

const dateFiltered = mileageRecords.filter(f => {

      const d = new Date(f.lastFuelFilledDate);

      if (dateRange.from && d < new Date(dateRange.from)) return false;
      if (dateRange.to && d > new Date(dateRange.to)) return false;

      return true;

    });

    /* BILL FILTER */

    if (billFilter === "ENTERED" && dateFiltered.length === 0) return;
    if (billFilter === "NO_RECORD" && dateFiltered.length > 0) return;

    filteredVehicleMap[vehicleNumber] = dateFiltered;

  });

  return {
    ...p,
    vehicleMap: filteredVehicleMap
  };

});

  /* KPI TOTALS */

  const overviewTotals = useMemo(()=>{

    let totalPlants = finalData.length;
    let totalVehicles = 0;
    let totalFuel = 0;

    finalData.forEach(p=>{

      totalVehicles += Object.keys(p.vehicleMap).length;

      Object.values(p.vehicleMap).forEach(records=>{
        records.forEach(f=>{
          totalFuel += Number(f.filledLiters) || 0;
        });
      });

    });

    return [
      {label:"Plants",value:totalPlants},
      {label:"Vehicles",value:totalVehicles},
      {label:"Fuel Used (Ltrs)",value:totalFuel}
    ];

  },[finalData]);



  const exportRows = useMemo(() => {

  const rows = [];

  finalData.forEach((p) => {

    Object.keys(p.vehicleMap).forEach((vehicleNumber) => {

      const records = p.vehicleMap[vehicleNumber];

      if (!records.length) {
        rows.push({
          plantID: p.plantID,
          plantName: p.plantName,
          kld: p.kld,
          district: p.district,
          zone: p.zones,
          vehicle: vehicleNumber,
          date: "",
          liters: "",
          odometer: ""
        });
      } else {

        records.forEach((f) => {
          rows.push({
            plantID: p.plantID,
            plantName: p.plantName,
            kld: p.kld,
            district: p.district,
            zone: p.zones,
            vehicle: vehicleNumber,
            date: formatDisplayDate(f.lastFuelFilledDate),
            liters: f.filledLiters,
            odometer: f.currentOdometerReading
          });
        });

      }

    });

  });

  return rows;

}, [finalData]);
const imageToBase64 = (url) =>
new Promise((resolve) => {
const img = new Image();
img.crossOrigin = "anonymous";
img.src = url;
img.onload = () => {
const canvas = document.createElement("canvas");
canvas.width = img.width;
canvas.height = img.height;
const ctx = canvas.getContext("2d");
ctx.drawImage(img, 0, 0);
resolve(canvas.toDataURL("image/png"));
};
});

const exportExcel = async () => {

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("Vehicle Fuel Report");

/* =====================================================
LOGO (TOP LEFT)
===================================================== */

const logoBase64 = await imageToBase64(companyLogo);

const logoId = workbook.addImage({
base64: logoBase64,
extension: "png",
});

sheet.addImage(logoId, {
tl: { col: 0, row: 0 },
ext: { width: 100, height: 55 },
});

/* =====================================================
COMPANY HEADER
===================================================== */

sheet.mergeCells("A1:J1");
const companyCell = sheet.getCell("A1");
companyCell.value = "MVR TECHNOLOGY";
companyCell.font = {
name: "Times New Roman",
size: 22,
bold: true,
color: { argb: "FFC80000" }
};
companyCell.alignment = { horizontal: "center", vertical: "middle" };

sheet.mergeCells("A2:J2");
const subCell = sheet.getCell("A2");
subCell.value = "FSTP RAJASTHAN";
subCell.font = {
name: "Times New Roman",
size: 12,
bold: true
};
subCell.alignment = { horizontal: "center", vertical: "middle" };

sheet.mergeCells("A3:J3");
const titleCell = sheet.getCell("A3");
titleCell.value = "Vehicle Fuel Report";
titleCell.font = {
name: "Times New Roman",
size: 11,
bold: true
};
titleCell.alignment = { horizontal: "center", vertical: "middle" };

/* =====================================================
TABLE HEADER
===================================================== */

const startRow = 5;

const headers = [
"S.No",
"Plant ID",
"Plant Name",
"KLD",
"District",
"Zone",
"Vehicle Number",
"Fuel Filled Date",
"Quantity (Liters)",
"Odometer Reading"
];

const headerRow = sheet.getRow(startRow);

headers.forEach((h, i) => {


const cell = headerRow.getCell(i + 1);

cell.value = h;

cell.font = {
  name: "Times New Roman",
  bold: true,
  size: 11
};

cell.alignment = {
  horizontal: "center",
  vertical: "middle",
  wrapText: true
};

cell.fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD3EAC8" }
};

cell.border = {
  top: { style: "thin" },
  bottom: { style: "thin" },
  left: { style: "thin" },
  right: { style: "thin" }
};


});

/* =====================================================
DATA ROWS
===================================================== */

finalData.forEach((p, i) => {


const vehicles = Object.keys(p.vehicleMap);
const plantStartRow = sheet.rowCount + 1;

vehicles.forEach(vehicleNumber => {

  const records = p.vehicleMap[vehicleNumber];
  const vehicleStartRow = sheet.rowCount + 1;

  if (!records.length) {

    const row = sheet.addRow([
      i + 1,
      p.plantID,
      p.plantName,
      p.kld,
      p.district,
      p.zones,
      vehicleNumber,
      "No Fuel Records",
      "",
      ""
    ]);

    sheet.mergeCells(row.number, 8, row.number, 10);

  } else {

    records.forEach((f, idx) => {

      sheet.addRow([
        idx === 0 ? i + 1 : "",
        idx === 0 ? p.plantID : "",
        idx === 0 ? p.plantName : "",
        idx === 0 ? p.kld : "",
        idx === 0 ? p.district : "",
        idx === 0 ? p.zones : "",
        idx === 0 ? vehicleNumber : "",
        formatDisplayDate(f.lastFuelFilledDate),
        formatIndian(f.filledLiters),
        f.currentOdometerReading ?? "-"
      ]);

    });

  }

  const vehicleEndRow = sheet.rowCount;

  if (vehicleEndRow > vehicleStartRow) {
    sheet.mergeCells(vehicleStartRow, 7, vehicleEndRow, 7);
  }

});

const plantEndRow = sheet.rowCount;

if (plantEndRow > plantStartRow) {

  for (let col = 1; col <= 6; col++) {
    sheet.mergeCells(plantStartRow, col, plantEndRow, col);
  }

}


});

/* =====================================================
APPLY BORDERS + ALIGNMENT
===================================================== */

sheet.eachRow((row, rowNumber) => {

  row.eachCell((cell) => {

    // Skip company header rows so their styling remains
    if (rowNumber > 3) {
      cell.font = {
        name: "Times New Roman",
        size: 10
      };
    }

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    };

    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };

  });

});

/* =====================================================
COLUMN WIDTH
===================================================== */

sheet.columns = [
{ width: 6 },
{ width: 12 },
{ width: 30 },
{ width: 8 },
{ width: 18 },
{ width: 10 },
{ width: 18 },
{ width: 16 },
{ width: 18 },
{ width: 18 }
];

sheet.views = [{ state: "frozen", ySplit: startRow }];

/* =====================================================
DOWNLOAD
===================================================== */

const buffer = await workbook.xlsx.writeBuffer();

saveAs(
new Blob([buffer]),
"Vehicle_Fuel_Report.xlsx"
);

};

 /* ================= EXPORT PDF ================= */

const exportPDF = async () => {

  const doc = new jsPDF("portrait", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  /* ================= LOGO ================= */

  const logoBase64 = await imageToBase64(companyLogo);

  doc.addImage(
    logoBase64,
    "PNG",
    8,
    6,
    22,
    12
  );

  /* ================= HEADER ================= */

  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(200, 0, 0); // maroon

  doc.text("MVR TECHNOLOGY", pageWidth / 2, 14, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  doc.text("FSTP RAJASTHAN", pageWidth / 2, 20, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(10);

  doc.text("Vehicle Fuel Report", pageWidth / 2, 25, { align: "center" });

  doc.setDrawColor(200);
  doc.line(6, 28, pageWidth - 6, 28);

  /* ================= TABLE HEADER ================= */

  const tableColumn = [
    "Plant ID",
    "Plant Name",
    "KLD",
    "District",
    "Zone",
    "Vehicle Number",
    "Fuel Filled Date",
    "Quantity (Liters)",
    "Odometer Reading"
  ];

  /* ================= TABLE DATA ================= */

  const tableRows = [];

  finalData.forEach((p) => {

    Object.keys(p.vehicleMap).forEach((vehicleNumber) => {

      const records = p.vehicleMap[vehicleNumber];

      if (!records.length) {

        tableRows.push([
          p.plantID,
          p.plantName,
          p.kld,
          p.district,
          p.zones,
          vehicleNumber,
          {
            content: "No Fuel Records",
            colSpan: 4,
            styles: {
              halign: "center",
              fontStyle: "bold"
            }
          }
        ]);

      } else {

        records.forEach((f) => {

          tableRows.push([
            p.plantID,
            p.plantName,
            p.kld,
            p.district,
            p.zones,
            vehicleNumber,
            formatDisplayDate(f.lastFuelFilledDate),
            formatIndian(f.filledLiters),
            f.currentOdometerReading ?? "-"
          ]);

        });

      }

    });

  });

  /* ================= TABLE ================= */

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 32,
    styles: {
      fontSize: 8,
      halign: "center",
      valign: "middle"
    },
    headStyles: {
      fillColor: [55, 65, 81],
      textColor: 255,
      fontStyle: "bold"
    }
  });

  /* ================= DOWNLOAD ================= */

  doc.save("Vehicle_Fuel_Report.pdf");

};
  return(

    <div className="p-6 space-y-4">

      {/* FILTER BAR */}

      <div className="bg-white rounded-xl border p-4 flex gap-10 flex-wrap">

        <div>
          <label className="text-xs font-bold">From</label>
          <div className="flex gap-2 mt-1">
            <Calendar size={16}/>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e)=>setDateRange(prev=>({...prev,from:e.target.value}))}
              className="border p-2 rounded text-xs"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold">To</label>
          <div className="flex gap-2 mt-1">
            <Calendar size={16}/>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e)=>setDateRange(prev=>({...prev,to:e.target.value}))}
              className="border p-2 rounded text-xs"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold">Zone</label>
          <div className="flex gap-2 mt-1">
            <Filter size={16}/>
            <select
              value={selectedZone}
              onChange={(e)=>setSelectedZone(e.target.value)}
              className="border p-2 rounded text-xs"
            >
              {zones.map(z=>(
                <option key={z} value={z}>
                  {z==="ALL"?"All Zones":z}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
  <label className="text-xs font-bold">
    Phase
  </label>

  <div className="flex gap-2 mt-1">
    <Filter size={16} />

    <select
      value={selectedPhase}
      onChange={(e) => setSelectedPhase(e.target.value)}
      className="border p-2 rounded text-xs"
    >
      {phases.map((phase) => (
        <option
          key={phase}
          value={phase}
        >
          {phase === "ALL"
            ? "All Phases"
            : `Phase ${phase}`}
        </option>
      ))}
    </select>
  </div>
</div>
<div>
  <label className="text-xs font-bold">Fuel Bills</label>
  <div className="flex gap-2 mt-1">
    <Filter size={16}/>
    <select
      value={billFilter}
      onChange={(e)=>setBillFilter(e.target.value)}
      className="border p-2 rounded text-xs"
    >
      <option value="ALL">All</option>
      <option value="ENTERED">Entered Bills</option>
      <option value="NO_RECORD">No Fuel Records</option>
    </select>
  </div>
</div>
<div className="bg-white rounded-xl  p-4 flex justify-between flex-wrap gap-4">

  {/* LEFT FILTERS */}
  <div className="flex gap-10 flex-wrap">
    {/* your existing From / To / Zone filters remain here */}
  </div>

  {/* RIGHT EXPORT BUTTONS */}

  <div className="ml-auto flex gap-2">

    <button
      onClick={exportExcel}
      className="bg-green-600 text-white px-4 py-2 rounded text-xs font-semibold"
    >
      Export Excel
    </button>

    <button
      onClick={exportPDF}
      className="bg-red-600 text-white px-4 py-2 rounded text-xs font-semibold"
    >
      Export PDF
    </button>

  </div>

</div>
      </div>

      {/* KPI */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {overviewTotals.map(t=>(
          <div key={t.label} className="bg-slate-50 border rounded-xl p-4">
            <p className="text-xs text-slate-500 font-semibold">
              Total {t.label}
            </p>
            <p className="text-xl font-bold text-indigo-700">
              {formatIndian(t.value)}
            </p>
          </div>
        ))}

      </div>

      {/* TABLE */}

      <div className="overflow-x-auto border rounded-lg">

        <table className="w-full text-sm border-collapse">

          <thead className="bg-slate-100 text-xs font-bold">

            <tr>
              <th className="border p-2 text-center">S.NO</th>
              <th className="border p-2 text-center">Plant ID</th>
              <th className="border p-2 text-center">Plant Name</th>
              <th className="border p-2 text-center">KLD</th>
              <th className="border p-2 text-center">District</th>
              <th className="border p-2 text-center">Zone</th>
              <th className="border p-2 text-center">Vehicle Number</th>
              <th className="border p-2 text-center">Fuel Filled Date</th>
              <th className="border p-2 text-center">Quantity (Liters)</th>
              <th className="border p-2 text-center">Odometer Reading</th>
              {/* <th className="border p-2 text-center">Mileage (Km/L)</th> */}
            </tr>

          </thead>

          <tbody>

          {finalData.map((p,i)=>{

            const vehicles = Object.keys(p.vehicleMap);

            const plantRowSpan = vehicles.reduce((acc,v)=>{
              const r = p.vehicleMap[v];
              return acc + (r.length || 1);
            },0);

            let plantPrinted = false;

            return vehicles.flatMap(vehicleNumber=>{

              const records = p.vehicleMap[vehicleNumber];

              if(!records.length){

                const row = (
                  <tr key={`${p.plantID}-${vehicleNumber}`}>

                    {!plantPrinted && (
                      <>
                        <td rowSpan={plantRowSpan} className="border p-2 text-center">{i+1}</td>
                        <td rowSpan={plantRowSpan} className="border p-2 text-center">{p.plantID}</td>
                        <td rowSpan={plantRowSpan} className="border p-2 text-center font-semibold">{p.plantName}</td>
                        <td rowSpan={plantRowSpan} className="border p-2 text-center">{p.kld}</td>
                        <td rowSpan={plantRowSpan} className="border p-2 text-center">{p.district}</td>
                        <td rowSpan={plantRowSpan} className="border p-2 text-center">{p.zones}</td>
                      </>
                    )}

                    <td className="border p-2 text-center">{vehicleNumber}</td>

                    <td colSpan={4} className="border p-2 text-center text-slate-500 font-semibold">
                      No Fuel Records
                    </td>

                  </tr>
                );

                plantPrinted = true;
                return row;

              }

              return records.map((f,idx)=>{

                const row = (
                  <tr key={`${p.plantID}-${vehicleNumber}-${idx}`}>

                    {!plantPrinted && idx===0 && (
                      <>
                        <td rowSpan={plantRowSpan} className="border p-2 text-center">{i+1}</td>
                        <td rowSpan={plantRowSpan} className="border p-2 text-center">{p.plantID}</td>
                        <td rowSpan={plantRowSpan} className="border p-2 text-center font-semibold">{p.plantName}</td>
                        <td rowSpan={plantRowSpan} className="border p-2 text-center">{p.kld}</td>
                        <td rowSpan={plantRowSpan} className="border p-2 text-center">{p.district}</td>
                        <td rowSpan={plantRowSpan} className="border p-2 text-center">{p.zones}</td>
                      </>
                    )}

                    {idx===0 && (
                      <td rowSpan={records.length} className="border p-2 text-center">
                        {vehicleNumber}
                      </td>
                    )}

                    <td className="border p-2 text-center">
                      {formatDisplayDate(f.lastFuelFilledDate)}
                    </td>

                    <td className="border p-2 text-center">
                      {formatIndian(f.filledLiters)}
                    </td>

                    <td className="border p-2 text-center">
                      {f.currentOdometerReading ?? "-"}
                    </td>

{/* <td className="border p-2 text-center">
 {f.mileage || "-"}
</td> */}

                  </tr>
                );

                plantPrinted = true;
                return row;

              });

            });

          })}

          </tbody>

        </table>

      </div>

    </div>

  )

}

export default VehicleFuel;