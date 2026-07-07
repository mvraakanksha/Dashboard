import React, { useEffect, useState, useMemo } from "react";
import { Calendar, Filter } from "lucide-react";
import { getAllPlants } from "../../../services/plantService";
import { getOperationsByDateRange } from "../../../services/operationService";
import companyLogo from "../company_logo1.jpg";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ================= FORMAT ================= */

const formatIndian = (v) =>
  v == null ? "-" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const formatDisplayDate = (dateValue) => {
  if (!dateValue) return "-";
  const d = new Date(dateValue);
  if (isNaN(d)) return "-";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};

const imageToBase64 = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
  });

/* ================= COMPONENT ================= */

const DgReport = () => {

  const [plants, setPlants] = useState([]);
  const [operations, setOperations] = useState([]);

  const [selectedZone, setSelectedZone] = useState("ALL");
  const [selectedPhase, setSelectedPhase] = useState("ALL");
const [previewMode, setPreviewMode] = useState(false);
  const today = new Date().toISOString().split("T")[0];
const [selectedPlantIds, setSelectedPlantIds] = useState([]);
const [dgFilter, setDgFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState({
    from: today,
    to: today
  });

  /* ================= FETCH PLANTS ================= */

  useEffect(() => {
    getAllPlants().then(setPlants);
  }, []);

  /* ================= FETCH OPERATIONS ================= */

  useEffect(() => {

    if (!dateRange.from || !dateRange.to) return;

    const fetchData = async () => {

      try {

        const res = await getOperationsByDateRange(
          dateRange.from,
          dateRange.to
        );

        const list =
          Array.isArray(res) ? res :
          Array.isArray(res?.data) ? res.data :
          Array.isArray(res?.items) ? res.items :
          [];

        setOperations(list);

      } catch (err) {

        console.error("DG API error:", err);
        setOperations([]);

      }

    };

    fetchData();

  }, [dateRange]);

  /* ================= ZONES ================= */

  const zones = useMemo(() => {

    const clean = plants.map(p => p.zones).filter(Boolean);
    const unique = [...new Set(clean)].sort((a,b)=>a-b);

    return ["ALL", ...unique];

  }, [plants]);


  /* ================= PHASES ================= */
const phases = useMemo(() => {

  const clean = plants
    .map((p) => p.plantPhase)
    .filter((p) => p !== null && p !== undefined);

  return [
    "ALL",
    ...[...new Set(clean)].sort((a, b) => Number(a) - Number(b))
  ];

}, [plants]);

  /* ================= MERGE DATA ================= */

  const mergedData = useMemo(() => {

    return operations.map((row) => {

      const op = row.operation ?? {};

      const plant =
        plants.find((p) =>
          String(p.plantID) === String(row.plantId)
        ) || {};

      const opDate =
        row.operation?.operationDate ??
        row.operation?.createdAt ??
        null;

      const am = op.dgReadingAm ?? null;
      const pm = op.dgReadingPm ?? null;

      const dieselAm = op.dgDiesalPercentageAm ?? null;
      const dieselPm = op.dgDiesalPercentagePm ?? null;

      const runHours = op.dgRunHours ?? 0;

      const units =
        am != null && pm != null ? Math.max(pm - am, 0) : 0;

      const dieselUsed =
        dieselAm != null && dieselPm != null
          ? Math.max(dieselAm - dieselPm, 0)
          : 0;

      const unitsPerHour =
        runHours > 0 ? units / runHours : 0;

      return {
        ...plant,
        operationDate: opDate,
        dgRunHours: runHours,
        dieselUsed,
        
      };

    });

  }, [operations, plants]);

  /* ================= ZONE FILTER ================= */
const finalData = useMemo(() => {

  let data = mergedData;

data = data.filter((p) => {

  const zoneMatch =
    selectedZone === "ALL" ||
    String(p.zones) === String(selectedZone);

  const phaseMatch =
    selectedPhase === "ALL" ||
    String(p.plantPhase) === String(selectedPhase);

  return zoneMatch && phaseMatch;

});

  const plantMap = {};

  data.forEach(r => {

    const id = r.plantID;

    if (!plantMap[id]) {
      plantMap[id] = {
        plant: r,
        records: [],
        usedDG: false
      };
    }

    plantMap[id].records.push(r);

    if (Number(r.dgRunHours) > 0) {
      plantMap[id].usedDG = true;
    }

  });

  let plantsList = Object.values(plantMap);

  if (dgFilter === "USED") {
    plantsList = plantsList.filter(p => p.usedDG);
  }

  if (dgFilter === "NOT_USED") {
    plantsList = plantsList.filter(p => !p.usedDG);
  }

  // ⭐ APPLY SELECTED PLANTS ONLY AFTER GENERATE
  if (previewMode && selectedPlantIds.length > 0) {
    plantsList = plantsList.filter(p =>
      selectedPlantIds.includes(p.plant.plantID)
    );
  }

  return plantsList.flatMap(p => p.records);

}, [mergedData, selectedZone, dgFilter, previewMode, selectedPlantIds]);
  /* ================= KPI ================= */
const overview = useMemo(() => {

  // plants filtered by zone
 const zonePlants = plants.filter((p) => {

  const zoneMatch =
    selectedZone === "ALL" ||
    String(p.zones) === String(selectedZone);

  const phaseMatch =
    selectedPhase === "ALL" ||
    String(p.plantPhase) === String(selectedPhase);

  return zoneMatch && phaseMatch;

});

  const plantSet = new Set(zonePlants.map(p => p.plantID));

  const usedSet = new Set();

  let runHours = 0;
  let diesel = 0;

  mergedData.forEach(r => {

    // ignore plants outside selected zone
    if (!plantSet.has(r.plantID)) return;

    if (Number(r.dgRunHours) > 0) {
      usedSet.add(r.plantID);
    }

    runHours += Number(r.dgRunHours) || 0;
    diesel += Number(r.dieselUsed) || 0;

  });

  const notUsedCount = plantSet.size - usedSet.size;

  return [
    { label: "Total Plants", value: plantSet.size },
    { label: "DG Used Plants", value: usedSet.size },
    { label: "DG Not Used Plants", value: notUsedCount },
    { label: "Total DG Run Hours", value: runHours },
    { label: "Diesel Consumed %", value: diesel }
  ];

}, [plants, mergedData, selectedZone, selectedPhase]);
  /* ================= DATE LIST ================= */

  const dates = useMemo(() => {

    const list = [];

    if (!dateRange.from || !dateRange.to) return list;

    let d = new Date(dateRange.from);
    const end = new Date(dateRange.to);

    while (d <= end) {

      list.push(d.toISOString().split("T")[0]);
      d.setDate(d.getDate() + 1);

    }

    return list;

  }, [dateRange]);

  /* ================= GROUP BY PLANT ================= */
const plantDateMap = useMemo(() => {

let basePlants = plants.filter((p) => {

  const zoneMatch =
    selectedZone === "ALL" ||
    String(p.zones) === String(selectedZone);

  const phaseMatch =
    selectedPhase === "ALL" ||
    String(p.plantPhase) === String(selectedPhase);

  return zoneMatch && phaseMatch;

});

  // apply preview filter
  if (previewMode && selectedPlantIds.length > 0) {
    basePlants = basePlants.filter(p =>
      selectedPlantIds.includes(p.plantID)
    );
  }

  // DG used / not used filter
  if (dgFilter !== "ALL") {

    const usedSet = new Set();

    mergedData.forEach(r => {
      if (Number(r.dgRunHours) > 0) {
        usedSet.add(r.plantID);
      }
    });

    if (dgFilter === "USED") {
      basePlants = basePlants.filter(p =>
        usedSet.has(p.plantID)
      );
    }

    if (dgFilter === "NOT_USED") {
      basePlants = basePlants.filter(p =>
        !usedSet.has(p.plantID)
      );
    }

  }

  return basePlants.map(p => {

    const values = {};

    dates.forEach(date => {

      const record = mergedData.find(r =>
        String(r.plantID) === String(p.plantID) &&
        r.operationDate &&
        r.operationDate.split("T")[0] === date
      );

      values[date] = record || null;

    });

    return {
      plant: p,
      values
    };

  });

}, [
  plants,
  mergedData,
  dates,
  selectedZone,
  selectedPhase,
  previewMode,
  selectedPlantIds,
  dgFilter
]);

  /* ================= EXPORT EXCEL ================= */

/* ================= EXPORT EXCEL ================= */

const exportExcel = async () => {

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("DG Report");

  const logoBase64 = await imageToBase64(companyLogo);

  const logoId = workbook.addImage({
    base64: logoBase64,
    extension: "png"
  });

  sheet.addImage(logoId,{
    tl:{col:0,row:0},
    ext:{width:100,height:55}
  });

  const totalColumns = 6 + (dates.length * 2);

  /* ================= COMPANY HEADER ================= */

  sheet.mergeCells(1,1,1,totalColumns);
  const companyCell = sheet.getCell("A1");
  companyCell.value = "MVR TECHNOLOGY";
  companyCell.font = {
    name:"Times New Roman",
    bold:true,
    size:18,
    color:{argb:"FFC80000"}
  };
  companyCell.alignment = { horizontal:"center", vertical:"middle" };

  sheet.mergeCells(2,1,2,totalColumns);
  const subCell = sheet.getCell("A2");
  subCell.value = "FSTP RAJASTHAN";
  subCell.font = {
    name:"Times New Roman",
    bold:true,
    size:12
  };
  subCell.alignment = { horizontal:"center", vertical:"middle" };

  sheet.mergeCells(3,1,3,totalColumns);
  const titleCell = sheet.getCell("A3");
  titleCell.value = "DG Report";
  titleCell.font = {
    name:"Times New Roman",
    bold:true,
    size:11
  };
  titleCell.alignment = { horizontal:"center", vertical:"middle" };

  /* ================= HEADER ROW 1 ================= */

  const headerRow1 = sheet.addRow([
    "S.No",
    "Plant ID",
    "Plant Name",
    "KLD",
    "District",
    "Zone"
  ]);

  dates.forEach(d=>{
    headerRow1.getCell(headerRow1.cellCount+1).value = formatDisplayDate(d);
    headerRow1.getCell(headerRow1.cellCount+1).value = "";
  });

  let startCol = 7;

  dates.forEach(()=>{
    sheet.mergeCells(headerRow1.number,startCol,headerRow1.number,startCol+1);
    startCol += 2;
  });

  /* ================= HEADER ROW 2 ================= */

  const headerRow2 = sheet.addRow([
    "",
    "",
    "",
    "",
    "",
    ""
  ]);

  dates.forEach(()=>{
    headerRow2.getCell(headerRow2.cellCount+1).value = "DG Run Hrs";
    headerRow2.getCell(headerRow2.cellCount+1).value = "Diesel Consumed";
  });
/* ================= MERGE S.NO → ZONE (ROWS 4 & 5) ================= */

for (let col = 1; col <= 6; col++) {

  sheet.mergeCells(4, col, 5, col);

  const cell = sheet.getCell(4, col);

  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true
  };

  cell.font = {
    name: "Times New Roman",
    bold: true,
    size: 11
  };

}
  /* ================= DATA ================= */

  plantDateMap.forEach((row,i)=>{

    const p = row.plant;

    const dataRow = [
      i+1,
      p.plantID,
      p.plantName,
      p.kld,
      p.district,
      p.zones
    ];

    dates.forEach(date=>{

      const dg = row.values[date];

      dataRow.push(formatIndian(dg?.dgRunHours));
      dataRow.push(formatIndian(dg?.dieselUsed));

    });

    sheet.addRow(dataRow);

  });

  /* ================= STYLE ================= */

  sheet.eachRow((row,rowNumber)=>{

    row.eachCell((cell)=>{

      if(rowNumber > 3){
        cell.font = {
          name:"Times New Roman",
          size:11
        };
      }

      cell.alignment = {
        horizontal:"center",
        vertical:"middle",
        wrapText:true
      };

      cell.border = {
        top:{style:"thin"},
        bottom:{style:"thin"},
        left:{style:"thin"},
        right:{style:"thin"}
      };

    });

  });

  /* ================= COLUMN WIDTH ================= */

  sheet.columns = [
    {width:6},
    {width:12},
    {width:28},
    {width:8},
    {width:18},
    {width:10},
    ...dates.flatMap(()=>[
      {width:14},
      {width:18}
    ])
  ];

  /* ================= FREEZE HEADER ================= */

  sheet.views = [{ state:"frozen", ySplit:5 }];

  /* ================= DOWNLOAD ================= */

  const buffer = await workbook.xlsx.writeBuffer();

  saveAs(
    new Blob([buffer]),
    "DG_Report.xlsx"
  );

};

  /* ================= EXPORT PDF ================= */

  const exportPDF = async () => {

  const doc = new jsPDF("landscape","mm","a4");

  const pageWidth = doc.internal.pageSize.getWidth();

  const logo = await imageToBase64(companyLogo);

  /* ================= LOGO ================= */

  doc.addImage(logo,"PNG",10,6,25,12);

  /* ================= HEADER ================= */

  doc.setFont("times","bold");
  doc.setFontSize(18);
  doc.setTextColor(200,0,0);

  doc.text("MVR TECHNOLOGY",pageWidth/2,14,{align:"center"});

  doc.setFontSize(12);
  doc.setTextColor(0,0,0);

  doc.text("FSTP RAJASTHAN",pageWidth/2,20,{align:"center"});

  doc.setFontSize(11);

  doc.text("DG Report",pageWidth/2,26,{align:"center"});

  /* ================= TABLE HEADER ================= */

  const tableColumn = [
    "S.No",
    "Plant ID",
    "Plant Name",
    "KLD",
    "District",
    "Zone"
  ];

  dates.forEach(d=>{
    tableColumn.push(`${formatDisplayDate(d)} DG Run Hours`);
    tableColumn.push(`${formatDisplayDate(d)} Diesel consumed`);
  });

  /* ================= TABLE ROWS ================= */

  const tableRows = [];

  const pdfPlants =
  selectedPlantIds.length > 0
    ? plantDateMap.filter(r =>
        selectedPlantIds.includes(r.plant.plantID)
      )
    : plantDateMap;

pdfPlants.forEach((row,i)=>{

    const p = row.plant;

    const dataRow = [
      i+1,
      p.plantID,
      p.plantName,
      p.kld,
      p.district,
      p.zones
    ];

    dates.forEach(date=>{

      const dg = row.values[date];

      dataRow.push(formatIndian(dg?.dgRunHours));
      dataRow.push(formatIndian(dg?.dieselUsed));

    });

    tableRows.push(dataRow);

  });

  /* ================= TABLE ================= */

  autoTable(doc,{
    startY:32,
    head:[tableColumn],
    body:tableRows,
    styles:{
      font:"times",
      fontSize:8,
      halign:"center",
      valign:"middle"
    },
    headStyles:{
      fillColor:[55,65,81],
      textColor:255,
      fontStyle:"bold"
    }
  });

  /* ================= DOWNLOAD ================= */

  doc.save("DG_Report.pdf");

};

const handlePlantSelect = (plantId) => {

  setSelectedPlantIds(prev => {

    if (prev.includes(plantId)) {
      return prev.filter(id => id !== plantId);
    }

    return [...prev, plantId];

  });

};


  /* ================= UI ================= */

  return (

<div className="p-6 space-y-6">

{/* FILTER BAR */}

<div className="bg-white border rounded-xl p-4 flex gap-8 flex-wrap">

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
{z==="ALL"?"All Zones":`Zone ${z}`}
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
<label className="text-xs font-bold">DG Usage</label>
<div className="flex gap-2 mt-1">
<Filter size={16}/>
<select
value={dgFilter}
onChange={(e)=>setDgFilter(e.target.value)}
className="border p-2 rounded text-xs"
>
<option value="ALL">All Plants</option>
<option value="USED">DG Used Plants</option>
<option value="NOT_USED">DG Not Used Plants</option>
</select>
</div>
</div>
<div className="flex gap-4 items-end">
<button
onClick={() => setPreviewMode(true)}
disabled={selectedPlantIds.length === 0}
className={`px-4 py-2 rounded text-xs font-semibold ${
  selectedPlantIds.length === 0
    ? "bg-gray-400 text-white cursor-not-allowed"
    : "bg-indigo-600 text-white"
}`}
>
Generate Report
</button>

<button
onClick={()=>{
  setPreviewMode(false);
  setSelectedPlantIds([]);
}}
className="bg-gray-500 text-white px-4 py-2 rounded text-xs font-semibold"
>
Reset
</button>
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


{/* KPI */}

<div className="grid md:grid-cols-5 gap-4">

{overview.map(k=>(
<div key={k.label} className="border rounded-xl p-4 bg-slate-50">
<p className="text-xs text-slate-500">{k.label}</p>
<p className="text-xl font-bold text-indigo-700">
{formatIndian(k.value)}
</p>
</div>
))}

</div>


{/* TABLE */}

<div className="overflow-x-auto border rounded-lg">

<table className="w-full text-sm border-collapse">

<thead className="bg-slate-100 text-xs font-bold">

<tr>

<th rowSpan={2} className="border p-2">Select</th>
<th rowSpan={2} className="border p-2">S.No</th>
<th rowSpan={2} className="border p-2">Plant ID</th>
<th rowSpan={2} className="border p-2">Plant Name</th>
<th rowSpan={2} className="border p-2">KLD</th>
<th rowSpan={2} className="border p-2">District</th>
<th rowSpan={2} className="border p-2">Zone</th>

{dates.map(d=>(
<th key={d} colSpan={2} className="border p-2 text-center">
{formatDisplayDate(d)}
</th>
))}

</tr>

<tr>

{dates.map(d=>(
<React.Fragment key={d}>
<th className="border p-2">DG Run Hrs</th>
<th className="border p-2">Diesel Consumed</th>
</React.Fragment>
))}

</tr>

</thead>

<tbody>

{plantDateMap.map((row,i)=>{

const plant = row.plant;

return (

<tr key={plant.plantID}>

<td className="border p-2 text-center">
<input
type="checkbox"
checked={selectedPlantIds.includes(plant.plantID)}
onChange={() => handlePlantSelect(plant.plantID)}
/>
</td>

<td className="border p-2 text-center">{i+1}</td>
<td className="border p-2 text-center">{plant.plantID}</td>
<td className="border p-2 text-center">{plant.plantName}</td>
<td className="border p-2 text-center">{plant.kld}</td>
<td className="border p-2 text-center">{plant.district}</td>
<td className="border p-2 text-center">{plant.zones}</td>

{dates.map(date=>{

const dg = row.values[date];

return (
<React.Fragment key={date}>
<td className="border p-2 text-center">
{formatIndian(dg?.dgRunHours)}
</td>

<td className="border p-2 text-center">
{formatIndian(dg?.dieselUsed)}
</td>
</React.Fragment>
);

})}

</tr>

);

})}

</tbody>

</table>

</div>

</div>

  );

};

export default DgReport;