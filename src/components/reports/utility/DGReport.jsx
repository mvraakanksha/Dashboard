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

  const today = new Date().toISOString().split("T")[0];

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

    if (selectedZone === "ALL") return mergedData;

    return mergedData.filter(
      p => String(p.zones) === String(selectedZone)
    );

  }, [mergedData, selectedZone]);

  /* ================= KPI ================= */
const overview = useMemo(() => {

  let runHours = 0;
  let diesel = 0;

  const totalPlantsSet = new Set();
  const dgPlantsSet = new Set();

  finalData.forEach(r => {

    if (r.plantID) {
      totalPlantsSet.add(r.plantID);
    }

    if (Number(r.dgRunHours) > 0) {
      dgPlantsSet.add(r.plantID);
    }

    runHours += Number(r.dgRunHours) || 0;
    diesel += Number(r.dieselUsed) || 0;

  });

  return [
    { label: "Total Plants", value: totalPlantsSet.size },
    { label: "DG Used Plants", value: dgPlantsSet.size },
    { label: "Total DG Run Hours", value: runHours },
    { label: "Diesel Consumed %", value: diesel }
  ];

}, [finalData]);

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

    const map = {};

    finalData.forEach(r => {

      const plantKey = r.plantID;

      if (!map[plantKey]) {
        map[plantKey] = {
          plant: r,
          values: {}
        };
      }

      if (r.operationDate) {
        const dateKey = r.operationDate.split("T")[0];
        map[plantKey].values[dateKey] = r;
      }

    });

    return Object.values(map);

  }, [finalData]);

  /* ================= EXPORT EXCEL ================= */

  const exportExcel = async () => {

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("DG Report");

    const logoBase64 = await imageToBase64(companyLogo);

    const logoId = workbook.addImage({
      base64: logoBase64,
      extension: "png"
    });

    sheet.addImage(logoId, {
      tl: { col: 0, row: 0 },
      ext: { width: 100, height: 55 }
    });

    sheet.mergeCells("A1:H1");
    sheet.getCell("A1").value = "MVR TECHNOLOGY";

    sheet.mergeCells("A2:H2");
    sheet.getCell("A2").value = "FSTP RAJASTHAN";

    sheet.mergeCells("A3:H3");
    sheet.getCell("A3").value = "DG Diesel Consumption Report";

    const header = [
      "Plant ID",
      "Plant Name",
      "Date",
      "Units",
      "Run Hours",
      "Diesel Used",
      "Units/Hr"
    ];

    sheet.addRow([]);

    sheet.addRow(header);

    finalData.forEach(r => {

      sheet.addRow([
        r.plantID,
        r.plantName,
        formatDisplayDate(r.operationDate),
        r.units,
        r.dgRunHours,
        r.dieselUsed,
        r.unitsPerHour
      ]);

    });

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(new Blob([buffer]), "DG_Report.xlsx");

  };

  /* ================= EXPORT PDF ================= */

  const exportPDF = async () => {

    const doc = new jsPDF();

    const logo = await imageToBase64(companyLogo);

    doc.addImage(logo,"PNG",10,6,25,12);

    doc.text("MVR TECHNOLOGY",105,14,{align:"center"});
    doc.text("FSTP RAJASTHAN",105,20,{align:"center"});
    doc.text("DG Diesel Consumption Report",105,26,{align:"center"});

    const columns = [
      "Plant ID",
      "Plant Name",
      "Date",
      "Units",
      "DG Run Hrs",
      "Diesel Used",
      "Units/Hr"
    ];

    const rows = finalData.map(r=>[
      r.plantID,
      r.plantName,
      formatDisplayDate(r.operationDate),
      formatIndian(r.units),
      formatIndian(r.dgRunHours),
      formatIndian(r.dieselUsed),
      formatIndian(r.unitsPerHour)
    ]);

    autoTable(doc,{
      startY:32,
      head:[columns],
      body:rows
    });

    doc.save("DG_Report.pdf");

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

<div className="flex gap-4 items-end">

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

<div className="grid md:grid-cols-4 gap-4">

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

<td className="border p-2 text-center">{i+1}</td>
<td className="border p-2 text-center">{plant.plantID}</td>
<td className="border p-2">{plant.plantName}</td>
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