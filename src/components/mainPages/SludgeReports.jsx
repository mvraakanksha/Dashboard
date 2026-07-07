import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import WaveCircle from "./WaveCircle";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
// import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { 
  Droplets, 
  Recycle, 
  Layers, 
  Zap, 
  Box, 
  Thermometer ,
   Activity
} from "lucide-react";
import { getAllPlants } from "../../services/plantService";
import { getOperationsByDate } from "../../services/operationService";
import companyLogo from '../reports/company_logo1.jpg'
/* ================= UTILS ================= */
const formatIndianNumber = (num) => {
  if (num === 0) return "0";
  if (!num) return "0";
  return num.toLocaleString("en-IN");
};


/* ================= SUB-COMPONENTS ================= */
const KPICard = ({ label, value, theme, icon }) => (
  <div className={`group relative overflow-hidden p-4 rounded-xl border ${theme.bg} ${theme.border} shadow-sm hover:shadow-md`}>
    <div className={`absolute bottom-0 left-0 h-1.5 w-full ${theme.barColor} origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />
    
    <div className="flex flex-col gap-2">
      <div className={`p-2 w-fit rounded-lg bg-white shadow-sm ${theme.iconColor}`}>
        {React.cloneElement(icon, { size: 18 })}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-900">
          {label}
        </p>
        <p className="text-xl font-black text-slate-900">
          {value}
        </p>
      </div>
    </div>
  </div>
);


const TopBarLabel = ({ x, y, width, value }) => (
  <text x={x + width / 2} y={y - 8} textAnchor="middle" fill="#003f8a" fontSize={11} fontWeight={700}>
    {formatIndianNumber(value)}
  </text>
);

// ⭐ Tooltip
const CustomTooltip = ({ active, payload, label, mode }) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;

    return (
        <div className="bg-white border border-gray-300 shadow-md p-2 text-xs">
          
            <p className="font-bold text-blue-800"><span className="font-semibold">PID: {data.plantID}</span> : {label} : {data.kld} KLD</p>
         

            {mode === "received" ? (
                <>
                    <p>Received: {formatIndianNumber(data.received)} L</p>
                    <p>Tank Level: {formatIndianNumber(data.tankLevel)} L</p>
                </>
            ) : (
                <>
                    <p>Processed: {formatIndianNumber(data.processed)} L</p>
                    {/* ⭐ 1 DECIMAL FOR BIOCHAR */}
                    <p>Biochar: {parseFloat(data.biochar).toFixed(1)} Kg</p>
                </>
            )}
        </div>
    );
};

/* ================= MAIN COMPONENT ================= */

export default function SludgeReports({
  date,
  zone,
  setZones,
  selectedPlants = [],
}) {
  
  const navigate = useNavigate();

  const [plants, setPlants] = useState([]);
  const [operationsMap, setOperationsMap] = useState(new Map());

  const [receivedMode, setReceivedMode] = useState("received");
  const [processedMode, setProcessedMode] = useState("processed");

  // ⭐ Sort states
const [receivedSort, setReceivedSort] = useState("desc"); 
const [processedSort, setProcessedSort] = useState("desc");
  // ⭐ Routing helper to sludge report view
const handlePlantClick = (plant, mode) => {
navigate(
  `/sludge-report-view/${plant.plantID}?mode=${mode}`,
  {
    state: {
      plantID: plant.plantID,
      plantName: plant.plantName,
      kld: plant.kld
    }
  }
);
};

  // Colors Configuration
const theme = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    barColor: "bg-blue-600",
    iconColor: "text-blue-600",
  },
  indigo: {
    bg: "bg-indigo-50",
    border: "border-indigo-100",
    barColor: "bg-indigo-600",
    iconColor: "text-indigo-600",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    barColor: "bg-emerald-600",
    iconColor: "text-emerald-600",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-100",
    barColor: "bg-amber-600",
    iconColor: "text-amber-600",
  },
};


  // fetch plants ----------
useEffect(() => {
  getAllPlants()
    .then(data => {
      setPlants(data);

      const derivedZones = [...new Set(
        data.map(p => p.zones).filter(Boolean)
      )].sort((a, b) => a - b);

      setZones(derivedZones);
    })
    .catch(console.error);
}, [setZones]);

const zonePlants = useMemo(() => {
  let filtered =
    zone === "All"
      ? plants
      : plants.filter(
          (p) => Number(p.zones) === Number(zone)
        );

  // FILTER BY SELECTED PLANTS
  if (selectedPlants.length > 0) {
    filtered = filtered.filter((p) =>
      selectedPlants.includes(p.plantID)
    );
  }

  return filtered;
}, [plants, zone, selectedPlants]);
  // fetch operations -----------
  useEffect(() => {
  if (!date) return;

  const fetchOperations = async () => {
    try {
      const res = await getOperationsByDate(date);

      const map = new Map();
      res.forEach(item => {
        if (item.plantId && item.operation) {
          map.set(item.plantId, item.operation);
        }
      });

      setOperationsMap(map);
    } catch (err) {
      console.error("Failed to fetch operations", err);
      setOperationsMap(new Map());
    }
  };

  fetchOperations();

  const id = setInterval(fetchOperations, 5000);
  return () => clearInterval(id);
}, [date]);


//KPI caluculation -----------

const totalReceived = zonePlants.reduce((sum, p) => {
  const o = operationsMap.get(p.plantID) || {};
  return sum + (o.sludgeReceived || 0);
}, 0);
const totalProcessed = zonePlants.reduce((sum, p) => {
  const o = operationsMap.get(p.plantID) || {};
  return sum + (o.sludgeProcessed || 0);
}, 0);

const totalTank = zonePlants.reduce((sum, p) => {
  const o = operationsMap.get(p.plantID) || {};
  return sum + (o.sludgeTankLevelPm ?? o.sludgeTankLevelAm ?? 0);
}, 0);

const totalBiochar = zonePlants.reduce((sum, p) => {
  const o = operationsMap.get(p.plantID) || {};
  return sum + (o.biocharProduced || 0);
}, 0);

  // Calculations
  const totalPlants = zonePlants.length;
  const permanentPowerCount = zonePlants.filter(p => p.permanentPower).length;

const chartData = useMemo(() => {
  return zonePlants.map(p => {
    const o = operationsMap.get(p.plantID) || {};
    return {
      name: p.plantName,
      plantID: p.plantID,
         kld: p.kld,    
      received: o.sludgeReceived || 0,
      processed: o.sludgeProcessed || 0,
      tankLevel: o.sludgeTankLevelPm ?? o.sludgeTankLevelAm ?? 0,
      biochar: o.biocharProduced || 0,
    };
  });
}, [zonePlants, operationsMap]);


 const receivedSorted = useMemo(() => {
  const sorted = [...chartData];

  if (receivedSort === "plantId") {
    return sorted.sort((a, b) => a.plantID - b.plantID);
  }

  const key = receivedMode === "received" ? "received" : "tankLevel";

  return sorted.sort((a, b) =>
    receivedSort === "asc"
      ? a[key] - b[key]
      : b[key] - a[key]
  );
}, [chartData, receivedMode, receivedSort]);
const processedSorted = useMemo(() => {
  const sorted = [...chartData];

  if (processedSort === "plantId") {
    return sorted.sort((a, b) => a.plantID - b.plantID);
  }

  const key = processedMode === "processed" ? "processed" : "biochar";

  return sorted.sort((a, b) =>
    processedSort === "asc"
      ? a[key] - b[key]
      : b[key] - a[key]
  );
}, [chartData, processedMode, processedSort]);

  // const processedSorted = useMemo(() => [...chartData].sort((a, b) => processedMode === "processed" ? b.processed - a.processed : b.biochar - a.biochar), [chartData, processedMode]);

const avgReceived =
  totalPlants > 0
    ? (receivedMode === "received" ? totalReceived : totalTank) / totalPlants
    : 0;

const avgProcessed =
   permanentPowerCount > 0
    ? totalProcessed / permanentPowerCount
    : 0;

  const chartWidth = Math.max(zonePlants.length * 80, 1000);

  /* ---------------- ENTRY COUNTS ---------------- */

// entries for Received / Tank graph
const receivedEntryCount = useMemo(() => {
  const key = receivedMode === "received" ? "received" : "tankLevel";

  return chartData.filter(d => Number(d[key]) > 0).length;
}, [chartData, receivedMode]);

// entries for Processed / Biochar graph
const processedEntryCount = useMemo(() => {
  const key = processedMode === "processed" ? "processed" : "biochar";

  return chartData.filter(d => Number(d[key]) > 0).length;
}, [chartData, processedMode]);

const addCompanyHeader = (doc, reportTitle) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  /* ===== LOGO ===== */
  doc.addImage(companyLogo, "JPEG", 8, 6, 25, 15);

  /* ===== COMPANY NAME ===== */
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(200, 0, 0);
  doc.text("MVR TECHNOLOGY", pageWidth / 2, 14, { align: "center" });

  /* ===== SUBTITLE ===== */
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("FSTP RAJASTHAN", pageWidth / 2, 21, { align: "center" });

  /* ===== REPORT TITLE ===== */
  doc.setFontSize(12);
  doc.setFont("times", "bold");
  doc.text(reportTitle, pageWidth / 2, 27, { align: "center" });
};

const downloadReceivedPDF = () => {
  const doc = new jsPDF();

  let selectedKey;
  let selectedLabel;
  let reportTitle;

  if (receivedMode === "received") {
    selectedKey = "received";
    selectedLabel = "Sludge Received (L)";
    reportTitle = "Sludge Received Report";
  } else {
    selectedKey = "tankLevel";
    selectedLabel = "Tank Level (L)";
    reportTitle = "Sludge Tanklevel Report";
  }

  addCompanyHeader(doc, reportTitle);

  const tableData = receivedSorted.map((item, index) => [
    index + 1,
    item.plantID,
    item.name,
    item.kld,
    item[selectedKey],
  ]);

  autoTable(doc, {
    startY: 35, // 👈 IMPORTANT (below header)
    head: [["S.No", "Plant ID", "Plant Name", "KLD", selectedLabel]],
    body: tableData,
  });

  doc.save(`${reportTitle}.pdf`);
};

const downloadProcessedPDF = () => {
  const doc = new jsPDF();

  let selectedKey;
  let selectedLabel;
  let reportTitle;

  if (processedMode === "processed") {
    selectedKey = "processed";
    selectedLabel = "Sludge Processed (L)";
    reportTitle = "Sludge Processed Report";
  } else {
    selectedKey = "biochar";
    selectedLabel = "Biochar Produced (Kg)";
    reportTitle = "Sludge Biochar Report";
  }

  addCompanyHeader(doc, reportTitle);

  const tableData = processedSorted.map((item, index) => [
    index + 1,
    item.plantID,
    item.name,
    item.kld,
    item[selectedKey],
  ]);

  autoTable(doc, {
    startY: 35,
    head: [["S.No", "Plant ID", "Plant Name", "KLD", selectedLabel]],
    body: tableData,
  });

  doc.save(`${reportTitle}.pdf`);
};
const downloadExcel = async (type) => {
  let data = [];
  let selectedKey;
  let selectedLabel;
  let fileName;
  let reportTitle;

  if (type === "received") {
    if (receivedMode === "received") {
      selectedKey = "received";
      selectedLabel = "Sludge Received (L)";
      reportTitle = "Sludge Received Report";
      fileName = "Sludge_Received_Report.xlsx";
    } else {
      selectedKey = "tankLevel";
      selectedLabel = "Tank Level (L)";
      reportTitle = "Sludge Tanklevel Report";
      fileName = "Sludge_Tanklevel_Report.xlsx";
    }
    data = receivedSorted;
  }

  if (type === "processed") {
    if (processedMode === "processed") {
      selectedKey = "processed";
      selectedLabel = "Sludge Processed (L)";
      reportTitle = "Sludge Processed Report";
      fileName = "Sludge_Processed_Report.xlsx";
    } else {
      selectedKey = "biochar";
      selectedLabel = "Biochar Produced (Kg)";
      reportTitle = "Sludge Biochar Report";
      fileName = "Sludge_Biochar_Report.xlsx";
    }
    data = processedSorted;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");

  /* ===== LOGO ===== */
  const imageId = workbook.addImage({
    base64: await fetch(companyLogo)
      .then(res => res.blob())
      .then(blob => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      })),
    extension: "jpeg",
  });

  sheet.addImage(imageId, {
    tl: { col: 0, row: 0 },
    ext: { width: 120, height: 60 },
  });

  /* ===== COMPANY NAME ===== */
  sheet.mergeCells("A1:E1");
  const companyCell = sheet.getCell("A1");
  companyCell.value = "MVR TECHNOLOGY";
  companyCell.font = {  name: "Times New Roman",size: 16, bold: true, color: { argb: "FF0000" } };
  companyCell.alignment = { vertical: "middle", horizontal: "center" };

  /* ===== SUBTITLE ===== */
  sheet.mergeCells("A2:E2");
  const subCell = sheet.getCell("A2");
  subCell.value = "FSTP RAJASTHAN";
  subCell.font = {  name: "Times New Roman",size: 12, bold: true };
  subCell.alignment = { horizontal: "center" };

  /* ===== REPORT TITLE ===== */
  sheet.mergeCells("A3:E3");
  const titleCell = sheet.getCell("A3");
  titleCell.value = reportTitle;
  titleCell.font = { name: "Times New Roman",size: 12, bold: true };
  titleCell.alignment = { horizontal: "center" };

  /* ===== TABLE HEADERS ===== */
  const headers = ["S.No", "Plant ID", "Plant Name", "KLD", selectedLabel];
  const headerRow = sheet.addRow(headers);

  headerRow.eachCell((cell) => {
    cell.font = { name: "Times New Roman",bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });

  /* ===== TABLE DATA ===== */
  data.forEach((item, index) => {
    const row = sheet.addRow([
      index + 1,
      item.plantID,
      item.name,
      item.kld,
      item[selectedKey],
    ]);

    row.eachCell((cell) => {
      cell.font = {
    name: "Times New Roman"
  };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  /* ===== COLUMN WIDTH ===== */
  sheet.columns = [
    { width: 8 },
    { width: 12 },
    { width: 25 },
    { width: 10 },
    { width: 20 },
  ];

  /* ===== DOWNLOAD ===== */
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
};

  // UI ----------------
 return (
  <div className="min-h-screen p-6 bg-gradient-to-br from-[#CFE2FF] via-[#BBD8FE] to-[#013B88]">

    {/* 🔝 HEADER */}
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        {/* ICON */}
        <div className="p-3 rounded-2xl bg-blue-600 text-white">
          <Activity className="w-6 h-6" />
        </div>

        {/* TITLE */}
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-blue-900">
            Sludge Reports
          </h2>
          <p className="text-xs tracking-widest font-bold text-slate-900">
            End-to-End Sludge & Tank Monitoring
          </p>
        </div>
      </div>
    </div>

    {/* 📍 TOP KPI CARDS */}
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 mb-10">
      <KPICard label="Total Plants" value={totalPlants} theme={theme.blue} icon={<Layers />} />
      <KPICard label="Permanent Power" value={permanentPowerCount} theme={theme.indigo} icon={<Zap />} />
      <KPICard label="Total Received (L)" value={formatIndianNumber(totalReceived)} theme={theme.emerald} icon={<Droplets />} />
      <KPICard label="Total Processed (L)" value={formatIndianNumber(totalProcessed)} theme={theme.emerald} icon={<Recycle />} />
      <KPICard label="Tank Level (L)" value={formatIndianNumber(totalTank)} theme={theme.amber} icon={<Box />} />
      <KPICard label="Biochar Produced (Kg)" value={totalBiochar.toFixed(1)} theme={theme.amber} icon={<Thermometer />} />
    </div>

    {/* 📍 RECEIVED SLUDGE SECTION */}
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3 p-4 rounded-xl shadow-md bg-white">
        <div className="flex justify-between items-center mb-3">
  <div className="flex items-center gap-3">
  <h3 className="text-blue-800 font-semibold uppercase text-xs tracking-wider">
    {receivedMode === "received"
      ? "Received Sludge Analytics"
      : "Tank Level Monitoring"}
  </h3>

  <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">
    Entries: {receivedEntryCount}
  </span>
</div>

  <div className="flex items-center gap-3">
    {/* MODE TOGGLE  #bdb3b3 */}
    <div className="flex p-1 rounded-lg bg-slate-100 text-white">
      <button
        onClick={() => setReceivedMode("received")}
        className={`px-4 py-1.5 text-xs font-bold rounded-md ${
          receivedMode === "received"
            ? "bg-white text-emerald-600 shadow-sm"
            : "text-slate-500"
        }`}
      >
        Received
      </button>

      <button
        onClick={() => setReceivedMode("tankLevel")}
        className={`px-4 py-1.5 text-xs font-bold rounded-md ${
          receivedMode === "tankLevel"
            ? "bg-white text-emerald-600 shadow-sm"
            : "text-slate-500"
        }`}
      >
        Tank Level
      </button>
    </div>

    {/* SORT BY */}
   <div className="flex items-center gap-3">
  <select
    value={receivedSort}
    onChange={(e) => setReceivedSort(e.target.value)}
    className="border rounded-md px-2 py-1 text-xs font-bold bg-white text-slate-700"
  >
    <option value="desc">Descending ↓</option>
    <option value="asc">Ascending ↑</option>
    <option value="plantId">Plant ID</option>
  </select>

  <button
    onClick={() => downloadReceivedPDF()}
    className="bg-blue-600 text-white px-3 py-1 text-xs font-bold rounded-md hover:bg-blue-700"
  >
    PDF
  </button>

  <button
 onClick={() => downloadExcel("received")}
  className="bg-green-600 text-white px-3 py-1 text-xs font-bold rounded-md hover:bg-green-700"
>
  Excel
</button>
</div>
  </div>
</div>


        <div className="overflow-x-auto w-full">
          <div style={{ width: chartWidth }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={receivedSorted}
                margin={{ top: 30, right: 30, left: 60, bottom: 60 }}
                barCategoryGap={50}
              >
                <XAxis
                  dataKey="name"
                  interval={0}
                  height={60}
                  tick={({ x, y, payload }) => {
                    const plant = receivedSorted.find(
                      (p) => p.name === payload.value
                    );

                    return (
                      <text
                        x={x}
                        y={y + 10}
                        textAnchor="end"
                        fill="#003f8a"
                        fontSize={11}
                        fontWeight={600}
                        transform={`rotate(-45 ${x} ${y + 10})`}
                        style={{ cursor: "pointer", textDecoration: "underline" }}
                        onClick={() => {
                          if (!plant) return;
                          handlePlantClick(
                            plant,
                            receivedMode === "received" ? "received" : "tank"
                          );
                        }}
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                />

                <YAxis
                  tickFormatter={formatIndianNumber}
                  label={{
                    value:
                      receivedMode === "received"
                        ? "Sludge Received (L)"
                        : "Tank Level (L)",
                    angle: -90,
                    position: "insideLeft",
                    offset: -15,
                    dy: 35,
                    fill: "#333",
                    fontSize: 12,
                    fontWeight: "bold",
                  }}
                />

                <Tooltip content={<CustomTooltip mode="received" />} />

                <Bar
                  dataKey={receivedMode}
                  fill="#003f8a"
                  barSize={30}
                  isAnimationActive={false}
                  label={<TopBarLabel />}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <p className="text-center text-sm font-bold text-[#333] mb-4">
          Plants
        </p>
      </div>

      <div className="rounded-xl shadow-md p-4 flex items-center justify-center bg-white">
        <div className="scale-90">
          <WaveCircle
            title={
              receivedMode === "received"
                ? "Average Sludge Received (Liters)"
                : "Average Tank Level (Liters)"
            }
            value={formatIndianNumber(Math.round(avgReceived))}
            size={180}
          />
        </div>
      </div>
    </div>

    {/* 📍 PROCESSED SLUDGE SECTION */}
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-6">
      <div className="lg:col-span-3 p-4 rounded-xl shadow-md bg-white">
<div className="flex justify-between items-center mb-3">
  <div className="flex items-center gap-3">
  <h3 className="text-blue-800 font-semibold uppercase text-xs tracking-wider">
    {processedMode === "processed"
      ? "Sludge Processed Volume"
      : "Biochar Production Yield"}
  </h3>

  <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">
    Entries: {processedEntryCount}
  </span>
</div>

  <div className="flex items-center gap-3">
    {/* MODE TOGGLE */}
    <div className="flex p-1 rounded-lg bg-slate-100">
      <button
        onClick={() => setProcessedMode("processed")}
        className={`px-4 py-1.5 text-xs font-bold rounded-md ${
          processedMode === "processed"
            ? "bg-white text-emerald-600 shadow-sm"
            : "text-slate-500"
        }`}
      >
        Processed
      </button>

      <button
        onClick={() => setProcessedMode("biochar")}
        className={`px-4 py-1.5 text-xs font-bold rounded-md ${
          processedMode === "biochar"
            ? "bg-white text-emerald-600 shadow-sm"
            : "text-slate-500"
        }`}
      >
        Biochar
      </button>
    </div>

    {/* SORT BY */}
    <div className="flex items-center gap-3">
  <select
    value={processedSort}
    onChange={(e) => setProcessedSort(e.target.value)}
    className="border rounded-md px-2 py-1 text-xs font-bold bg-white text-slate-700"
  >
    <option value="desc">Descending ↓</option>
    <option value="asc">Ascending ↑</option>
    <option value="plantId">Plant ID</option>
  </select>

  <button
    onClick={() => downloadProcessedPDF()}
    className="bg-blue-600 text-white px-3 py-1 text-xs font-bold rounded-md hover:bg-blue-700"
  >
    PDF
  </button>
<button
  onClick={() => downloadExcel("processed")}
  className="bg-green-600 text-white px-3 py-1 text-xs font-bold rounded-md hover:bg-green-700"
>
   Excel
</button>

</div>
  </div>
</div>


        <div className="overflow-x-auto w-full">
          <div style={{ width: chartWidth }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={processedSorted}
                margin={{ top: 30, right: 30, left: 90, bottom: 90 }}
                barCategoryGap={50}
              >
                <XAxis
                  dataKey="name"
                  interval={0}
                  height={60}
                  tick={({ x, y, payload }) => {
                    const plant = processedSorted.find(
                      (p) => p.name === payload.value
                    );

                    return (
                      <text
                        x={x}
                        y={y + 10}
                        textAnchor="end"
                        fill="#003f8a"
                        fontSize={11}
                        fontWeight={600}
                        transform={`rotate(-45 ${x} ${y + 10})`}
                        style={{ cursor: "pointer", textDecoration: "underline" }}
                        onClick={() => {
                          if (!plant) return;
                          handlePlantClick(
                            plant,
                            processedMode === "processed"
                              ? "processed"
                              : "biochar"
                          );
                        }}
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                />

                <YAxis
                  tickFormatter={(val) =>
                    processedMode === "processed"
                      ? formatIndianNumber(val)
                      : val.toFixed(1)
                  }
                  label={{
                    value:
                      processedMode === "processed"
                        ? "Sludge Processed (L)"
                        : "Biochar Produced (Kg)",
                    angle: -90,
                    position: "insideLeft",
                    offset: -15,
                    dy: 55,
                    fill: "#333",
                    fontSize: 12,
                    fontWeight: "bold",
                  }}
                />

                <Tooltip content={<CustomTooltip mode="processed" />} />

                <Bar
                  dataKey={processedMode}
                  fill="#003f8a"
                  barSize={30}
                  isAnimationActive={false}
                  label={<TopBarLabel />}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <p className="text-center text-sm font-bold text-[#333] mt-4">
          Plants
        </p>
      </div>

      <div className="rounded-xl shadow-md p-4 flex items-center justify-center bg-white">
        <div className="scale-90">
          <WaveCircle
              title="Average Sludge Processed (Liters)"
              value={formatIndianNumber(Math.round(avgProcessed))}
            size={180}
          />
        </div>
      </div>
    </div>
  </div>
);

}