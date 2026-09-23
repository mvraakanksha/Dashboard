import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { useNavigate } from "react-router-dom";
import {
  Droplets,
  Recycle,
  Layers,
  Zap,
  Box,
  Thermometer,
  Activity
} from "lucide-react";
// import { getAllPlants } from "../../services/plantService";
import { getSludgeChartData } from "../../services/operationService";
import companyLogo from '../reports/company_logo1.jpg'

const POLL_INTERVAL_MS = 5000;

/* ================= UTILS ================= */
const formatIndianNumber = (num) => {
  if (num === 0) return "0";
  if (!num) return "0";
  return num.toLocaleString("en-IN");
};

// UI mode -> backend sort field. Kept as a module-level const so it's never re-created.
const SORT_FIELD_MAP = {
  received: "SLUDGE_RECEIVED",
  tankLevel: "SLUDGE_TANK_LEVEL",
  processed: "SLUDGE_PROCESSED",
  biochar: "BIOCHAR_PRODUCED",
};

const resolveSort = (mode, sortChoice) => {
  if (sortChoice === "plantId") {
    return { sortField: "PLANT_ID", sortOrder: "ASC" };
  }
  return {
    sortField: SORT_FIELD_MAP[mode],
    sortOrder: sortChoice === "asc" ? "ASC" : "DESC",
  };
};

// API row -> shape the rest of the component (charts / PDF / Excel) already expects.
const mapApiRow = (o) => ({
  name: o.plantName,
  plantName: o.plantName,
  plantID: o.plantId,
  kld: o.kld,
  received: o.sludgeReceived ?? 0,
  processed: o.sludgeProcessed ?? 0,
  tankLevel: o.sludgeTankLevel ?? 0,
  biochar: o.biocharProduced ?? 0,
});

/* ================= SUB-COMPONENTS ================= */
const KPICard = React.memo(function KPICard({ label, value, theme, icon }) {
  return (
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
});

const TopBarLabel = React.memo(function TopBarLabel({ x, y, width, value }) {
  return (
    <text x={x + width / 2} y={y - 8} textAnchor="middle" fill="#003f8a" fontSize={11} fontWeight={700}>
      {formatIndianNumber(value)}
    </text>
  );
});

// ⭐ Tooltip
const CustomTooltip = React.memo(function CustomTooltip({ active, payload, label, mode }) {
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
          <p>Biochar: {parseFloat(data.biochar).toFixed(1)} Kg</p>
        </>
      )}
    </div>
  );
});

// Colors Configuration — module-level, never re-created per render
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

/* ================= MAIN COMPONENT ================= */

export default function SludgeReports({
  date,
  zone,
  setZones,
  selectedPlants = [],
  plants = [],
}) {
  const navigate = useNavigate();

  // Only used now for zones + permanentPower (fields the sludge-chart API doesn't return)
 
  const [receivedRows, setReceivedRows] = useState([]);
  const [processedRows, setProcessedRows] = useState([]);

  const [receivedMode, setReceivedMode] = useState("received");
  const [processedMode, setProcessedMode] = useState("processed");

  const [receivedSort, setReceivedSort] = useState("desc");
  const [processedSort, setProcessedSort] = useState("desc");

  const handlePlantClick = useCallback((plant, mode) => {
    if (!plant) return;
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
  }, [navigate]);

  // ---- fetch plant list once (zones + permanentPower only) ----
  // useEffect(() => {
  //   getAllPlants()
  //     .then(data => {
  //       setPlants(data);

  //       const derivedZones = [...new Set(
  //         data.map(p => p.zones).filter(Boolean)
  //       )].sort((a, b) => a - b);

  //       setZones(derivedZones);
  //     })
  //     .catch(console.error);
  // }, [setZones]);

  const permanentPowerCount = useMemo(() => {
    let filtered =
      zone === "All"
        ? plants
        : plants.filter((p) => Number(p.zones) === Number(zone));

    if (selectedPlants.length > 0) {
      filtered = filtered.filter((p) => selectedPlants.includes(p.plantID));
    }

    return filtered.filter((p) => p.permanentPower).length;
  }, [plants, zone, selectedPlants]);

  // Stable key so the fetch effects don't re-fire on every parent re-render
  // just because `selectedPlants` is a new array reference with the same ids.
  const plantIdsKey = useMemo(() => selectedPlants.join(","), [selectedPlants]);

  const { sortField: receivedSortField, sortOrder: receivedSortOrder } = useMemo(
    () => resolveSort(receivedMode, receivedSort),
    [receivedMode, receivedSort]
  );
  const { sortField: processedSortField, sortOrder: processedSortOrder } = useMemo(
    () => resolveSort(processedMode, processedSort),
    [processedMode, processedSort]
  );

  const fetchReceived = useCallback(async () => {
    if (!date) return;
    try {
      const data = await getSludgeChartData({
        date,
        zone,
        plantIds: plantIdsKey ? plantIdsKey.split(",").map(Number) : undefined,
        sortField: receivedSortField,
        sortOrder: receivedSortOrder,
      });
      setReceivedRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch received sludge chart data", err);
      setReceivedRows([]);
    }
  }, [date, zone, plantIdsKey, receivedSortField, receivedSortOrder]);

  const fetchProcessed = useCallback(async () => {
    if (!date) return;
    try {
      const data = await getSludgeChartData({
        date,
        zone,
        plantIds: plantIdsKey ? plantIdsKey.split(",").map(Number) : undefined,
        sortField: processedSortField,
        sortOrder: processedSortOrder,
      });
      setProcessedRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch processed sludge chart data", err);
      setProcessedRows([]);
    }
  }, [date, zone, plantIdsKey, processedSortField, processedSortOrder]);

  // One interval drives both live-polling fetches; effect re-runs (and
  // fetches immediately) whenever date/zone/plants/sort/mode change.
  useEffect(() => {
    fetchReceived();
    fetchProcessed();

    const id = setInterval(() => {
      fetchReceived();
      fetchProcessed();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [fetchReceived, fetchProcessed]);

  // Rows already arrive sorted by the backend — just reshape field names.
  const receivedSorted = useMemo(() => receivedRows.map(mapApiRow), [receivedRows]);
  const processedSorted = useMemo(() => processedRows.map(mapApiRow), [processedRows]);

  //KPI calculation — totals come straight from the (unsorted-relevance) API rows,
  // each row already carries all four metrics regardless of which sort was applied.
  const totals = useMemo(() => {
    const source = receivedRows.length ? receivedRows : processedRows;
    return source.reduce(
      (acc, o) => {
        acc.received += o.sludgeReceived || 0;
        acc.processed += o.sludgeProcessed || 0;
        acc.tank += o.sludgeTankLevel || 0;
        acc.biochar += o.biocharProduced || 0;
        return acc;
      },
      { received: 0, processed: 0, tank: 0, biochar: 0 }
    );
  }, [receivedRows, processedRows]);

  const totalPlants = receivedRows.length || processedRows.length;

  const avgReceived =
    totalPlants > 0
      ? (receivedMode === "received" ? totals.received : totals.tank) / totalPlants
      : 0;

  const avgProcessed =
    permanentPowerCount > 0
      ? totals.processed / permanentPowerCount
      : 0;

  const chartWidth = Math.max(receivedSorted.length * 80, 1000);

  /* ---------------- ENTRY COUNTS ---------------- */
  const receivedEntryCount = useMemo(() => {
    const key = receivedMode === "received" ? "received" : "tankLevel";
    return receivedSorted.filter(d => Number(d[key]) > 0).length;
  }, [receivedSorted, receivedMode]);

  const processedEntryCount = useMemo(() => {
    const key = processedMode === "processed" ? "processed" : "biochar";
    return processedSorted.filter(d => Number(d[key]) > 0).length;
  }, [processedSorted, processedMode]);

  const addCompanyHeader = (doc, reportTitle) => {
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.addImage(companyLogo, "JPEG", 8, 6, 25, 15);

    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(200, 0, 0);
    doc.text("MVR TECHNOLOGY", pageWidth / 2, 14, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("FSTP RAJASTHAN", pageWidth / 2, 21, { align: "center" });

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
      startY: 35,
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

    sheet.mergeCells("A1:E1");
    const companyCell = sheet.getCell("A1");
    companyCell.value = "MVR TECHNOLOGY";
    companyCell.font = { name: "Times New Roman", size: 16, bold: true, color: { argb: "FF0000" } };
    companyCell.alignment = { vertical: "middle", horizontal: "center" };

    sheet.mergeCells("A2:E2");
    const subCell = sheet.getCell("A2");
    subCell.value = "FSTP RAJASTHAN";
    subCell.font = { name: "Times New Roman", size: 12, bold: true };
    subCell.alignment = { horizontal: "center" };

    sheet.mergeCells("A3:E3");
    const titleCell = sheet.getCell("A3");
    titleCell.value = reportTitle;
    titleCell.font = { name: "Times New Roman", size: 12, bold: true };
    titleCell.alignment = { horizontal: "center" };

    const headers = ["S.No", "Plant ID", "Plant Name", "KLD", selectedLabel];
    const headerRow = sheet.addRow(headers);

    headerRow.eachCell((cell) => {
      cell.font = { name: "Times New Roman", bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

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

    sheet.columns = [
      { width: 8 },
      { width: 12 },
      { width: 25 },
      { width: 10 },
      { width: 20 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);
  };

  // UI ----------------
  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-[#CFE2FF] via-[#BBD8FE] to-[#013B88]">

      {/* 🔝 HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-blue-600 text-white">
            <Activity className="w-6 h-6" />
          </div>

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
        <KPICard label="Total Received (L)" value={formatIndianNumber(totals.received)} theme={theme.emerald} icon={<Droplets />} />
        <KPICard label="Total Processed (L)" value={formatIndianNumber(totals.processed)} theme={theme.emerald} icon={<Recycle />} />
        <KPICard label="Tank Level (L)" value={formatIndianNumber(totals.tank)} theme={theme.amber} icon={<Box />} />
        <KPICard label="Biochar Produced (Kg)" value={totals.biochar.toFixed(1)} theme={theme.amber} icon={<Thermometer />} />
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
              {/* MODE TOGGLE */}
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

                  <Tooltip content={<CustomTooltip mode="received" />} isAnimationActive={false} />

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

                  <Tooltip content={<CustomTooltip mode="processed" />} isAnimationActive={false} />

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
