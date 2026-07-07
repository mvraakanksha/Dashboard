import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  CartesianGrid
} from "recharts";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { getAllPlants } from '../../services/plantService'
import { getOperationsByDate } from '../../services/operationService'



/* ================= BAR TOP VALUE ================= */
const BarValueLabel = ({ x, y, width, value, fill }) => {
  if (!value || value <= 0) return null;

  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fill={fill}
      fontSize={11}
      fontWeight={700}
    >
      {value.toFixed(2)}
    </text>
  );
};

/* ================= CLICKABLE X-AXIS TICK ================= */
const ClickableTick = ({ x, y, payload, plantMap, onPlantClick }) => {
  const label = payload?.value;
  const plant = plantMap[label];

  return (
    <text
      x={x}
      y={y + 10}
      textAnchor="end"
      fill="#003f8a"
      fontSize={11}
      fontWeight={600}
      transform={`rotate(-45 ${x} ${y + 10})`}
      style={{
        cursor: "pointer",
        whiteSpace: "nowrap",
        textDecoration: "underline"
      }}
      onClick={() => plant && onPlantClick(plant)}
    >
      {label}
    </text>
  );
};
const formatDDMMYYYY = (dateStr) => {
  if (!dateStr) return "";

  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};

/* ================= TOOLTIP ================= */
const PowerTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0].payload;
  const importItem = payload.find(p => p.dataKey === "importPower");
  const exportItem = payload.find(p => p.dataKey === "exportPower");
  const runItem = payload.find(p => p.dataKey === "runHours");

// import | export | run | id

  return (
    <div className="bg-white border shadow-md rounded p-3 text-xs w-64">
      <p className="font-bold text-blue-900">PID: {row.plantId} - {row.label} - {row.kld} KLD</p>
      {row.powerCompletedOn && (
  <p className="text-[11px] font-semibold text-slate-700 mt-1">
     Power completed On : {formatDDMMYYYY(row.powerCompletedOn)}
  </p> 
)}
{row.solarCompletedOn && (
  <p className="text-[11px] font-semibold text-slate-700">
    Solar completed On : {formatDDMMYYYY(row.solarCompletedOn)}
  </p>
)}

      {importItem && importItem.value > 0 && (
        <div className="mt-2">
          <p className="font-semibold text-red-700">
            Power Consumption : {importItem.value.toFixed(2)} Kwh
          </p>
       <p>
  AM: {row.amImp != null ? Number(row.amImp).toFixed(2) : "-"}
</p>
<p>
  PM: {row.pmImp != null ? Number(row.pmImp).toFixed(2) : "-"}
</p>
        </div>
      )}

      {exportItem && exportItem.value > 0 && (
        <div className="mt-2">
          <p className="font-semibold text-green-700">
            Solar Power Generated : {exportItem.value.toFixed(2)} Kwh
          </p>
         <p>
  AM: {row.amExp != null ? Number(row.amExp).toFixed(2) : "-"}
</p>
<p>
  PM: {row.pmExp != null ? Number(row.pmExp).toFixed(2) : "-"}
</p>
        </div>
      )}

      {runItem && runItem.value > 0 && (
        <div className="mt-2">
          <p className="font-semibold text-blue-700">
            Plant Run Hours : {runItem.value.toFixed(2)} Hrs
          </p>
        </div>
      )}
    </div>
  );
};

/* ================= PAGE ================= */
export default function Power({ date, zone }) {
 
  const navigate = useNavigate();

  const [plants, setPlants] = useState([]);
  const [operations, setOperations] = useState([]);

const [sortBy, setSortBy] = useState(); 

useEffect(() => {
  const loadPlants = async () => {
    try {
      const data = await getAllPlants();
      setPlants(data || []);
    } catch (err) {
      console.error("Failed to fetch plants", err);
      setPlants([]);
    }
  };

  loadPlants();
}, []);


useEffect(() => {
  if (!date) return;

  const loadOperations = async () => {
    try {
      const data = await getOperationsByDate(date);
      setOperations(data || []);
    } catch (err) {
      console.error("Failed to fetch operations", err);
      setOperations([]);
    }
  };

  loadOperations();
}, [date]);


const theme = {
  blue: { bg: "bg-blue-50", border: "border-blue-100", barColor: "bg-blue-600", iconColor: "text-blue-600" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-100", barColor: "bg-emerald-600", iconColor: "text-emerald-600" },
  rose: { bg: "bg-rose-50", border: "border-rose-100", barColor: "bg-rose-600", iconColor: "text-rose-600" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-100", barColor: "bg-indigo-600", iconColor: "text-indigo-600" },
};

  // const zones = [...new Set(plants.map(p => p.zones))].sort((a, b) => a - b);

  /* 🔽 SORTED BY POWER CONSUMPTION (DESCENDING) */
const rawChartData = useMemo(() => {
  return plants
   .filter(p => zone === "All" || String(p.zones) === String(zone))
    .map(p => {
      const op = operations.find(o => o.plantId === p.plantID)?.operation;

      const importPower =
        op?.powerReadingAmImport != null && op?.powerReadingPmImport != null
          ? Math.max(op.powerReadingPmImport - op.powerReadingAmImport, 0)
          : 0;

      const exportPower =
        op?.powerReadingAmExport != null && op?.powerReadingPmExport != null
          ? Math.max(op.powerReadingPmExport - op.powerReadingAmExport, 0)
          : 0;

      const runHours = op?.plantRunningHrs ?? 0;

      return {
        label: p.plantName,
        plantId: p.plantID,
        kld:p.kld,
         powerCompletedOn: p.permanentPowerDateOfCompletion, 
         solarCompletedOn: p.solarDateOfCompletion,
        importPower: +importPower.toFixed(2),
        exportPower: +exportPower.toFixed(2),
        runHours: +runHours.toFixed(2),
        amImp: op?.powerReadingAmImport,
        pmImp: op?.powerReadingPmImport,
        amExp: op?.powerReadingAmExport,
        pmExp: op?.powerReadingPmExport
      };
    });
}, [plants, operations, zone]);
const chartData = useMemo(() => {
  const data = [...rawChartData];

  switch (sortBy) {
    case "export":
      return data.sort((a, b) => b.exportPower - a.exportPower);

    case "run":
      return data.sort((a, b) => b.runHours - a.runHours);

    case "id":
      return data.sort((a, b) => a.plantId - b.plantId);

    case "import":
    default:
      return data.sort((a, b) => b.importPower - a.importPower);
  }
}, [rawChartData, sortBy]);

  const plantMap = {};
  chartData.forEach(p => (plantMap[p.label] = p));

  const openPlantView = (plant) => {
    navigate(`/power-view/${plant.plantId}/${plant.label}`);
  };

  const totalImport = chartData.reduce((s, p) => s + p.importPower, 0);
  const totalExport = chartData.reduce((s, p) => s + p.exportPower, 0);
  const avgImport = chartData.length ? totalImport / chartData.length : 0;
  const avgExport = chartData.length ? totalExport / chartData.length : 0;
  const totalRunHours = chartData.reduce((s, p) => s + p.runHours, 0);
  const avgRunHours = chartData.length ? totalRunHours / chartData.length : 0;
  /* ---------------- ENTRY COUNT ---------------- */

const entryCount = useMemo(() => {
  if (!chartData?.length) return 0;

  switch (sortBy) {
    case "export":
      return chartData.filter(d => d.exportPower > 0).length;

    case "run":
      return chartData.filter(d => d.runHours > 0).length;

    case "id":
      return chartData.filter(
        d => d.importPower > 0 || d.exportPower > 0 || d.runHours > 0
      ).length;

    case "import":
    default:
      return chartData.filter(d => d.importPower > 0).length;
  }
}, [chartData, sortBy]);
  const KPICard = ({ label, value, unit, theme, icon, isDark, subLabel }) => (
  <div
    className={`group relative overflow-hidden p-4 rounded-xl border
      transition-all duration-300 shadow-sm hover:shadow-md
      ${theme.bg} ${theme.border}`}
  >
    {/* Animated bottom bar */}
    <div
      className={`absolute bottom-0 left-0 h-1.5 w-full ${theme.barColor}
        origin-left scale-x-0 group-hover:scale-x-100
        transition-transform duration-500 ease-out`}
    />

    <div className="flex flex-col gap-3">
      <div
        className={`p-2 w-fit rounded-lg bg-white/60 backdrop-blur-sm
          ${theme.iconColor} shadow-sm`}
      >
        {icon}
      </div>

      <div>
        <p
          className={`text-[10px] font-black uppercase tracking-wider ${
            isDark ? "text-slate-400" : "text-slate-900"
          }`}
        >
          {label}
        </p>

        <p
          className={`text-xl font-black ${
            isDark ? "text-white" : "text-slate-900"
          }`}
        >
          {value}
          {unit && <span className="text-sm ml-1">{unit}</span>}
        </p>

        {subLabel && (
          <p className="text-xs mt-1 text-slate-700 font-semibold">
            {subLabel}
          </p>
        )}
      </div>
    </div>
  </div>
);


  return (
  <div className="p-6 bg-[#D9E6FF] min-h-screen">

    {/* 🔝 HEADER */}
    <div className="flex items-center gap-4 mb-8">
      <div className="p-3 rounded-2xl bg-blue-600 text-white">
        <Zap className="w-6 h-6" />
      </div>
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-blue-900">
          Power Report
        </h2>
        <p className="text-xs tracking-widest font-bold text-slate-900">
          Power Consumption & Solar Generation Monitoring
        </p>
      </div>
    </div>

    {/* KPI + FILTER ROW */}
    <div className="flex flex-col lg:flex-row gap-4 mb-6">

      {/* KPI CARDS */}
      <div className="flex-1 bg-white rounded-2xl p-6 shadow">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">

          <KPICard label="Total Power Consumption" value={totalImport.toFixed(2)} unit="Kwh" theme={theme.rose} icon={<Zap size={18} />} />
          <KPICard label="Total Solar Power Generated" value={totalExport.toFixed(2)} unit="Kwh" theme={theme.emerald} icon={<Zap size={18} />} />
          <KPICard label="Avg Power Consumption" value={avgImport.toFixed(2)} unit="Kwh" theme={theme.blue} icon={<Zap size={18} />} />
          <KPICard label="Avg Solar Power Generated" value={avgExport.toFixed(2)} unit="Kwh" theme={theme.emerald} icon={<Zap size={18} />} />
          <KPICard label="Total Plant Run Hours" value={totalRunHours.toFixed(2)} unit="Hrs" subLabel={`Avg : ${avgRunHours.toFixed(2)}`} theme={theme.indigo} icon={<Zap size={18} />} />

        </div>
      </div>

      {/* FILTER */}
      <div className="w-full lg:w-72 bg-white rounded-xl p-4 shadow-md flex flex-col justify-center">
        <label className="text-xs font-semibold mb-1 text-gray-700">
          Sort By
        </label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border p-2 rounded-md text-sm font-semibold bg-white border-slate-300"
        >
          <option value="import">Power Consumption</option>
          <option value="export">Solar Power Generated</option>
          <option value="run">Plant Run Hours</option>
          <option value="id">Plant ID</option>
        </select>
      </div>
    </div>

    {/* GRAPH */}
   {/* GRAPH */}
<div className="bg-white rounded-2xl shadow-lg p-6">

  <div className="flex items-center gap-3 mb-3">
    <h3 className="font-bold text-blue-900 text-lg">
      Power Analytics
    </h3>

    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">
      Entries: {entryCount}
    </span>
  </div>
      <div className="overflow-x-auto">
        <div style={{ width: chartData.length * 90, minWidth: "100%", height: 450 }}>
          <BarChart
            width={chartData.length * 90}
            height={450}
            data={chartData}
            margin={{ top: 30, right: 30, left: 70, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              interval={0}
              height={70}
              tick={(props) => (
                <ClickableTick
                  {...props}
                  plantMap={plantMap}
                  onPlantClick={openPlantView}
                />
              )}
            />
            <YAxis
              label={{
                value: "Power (Kwh) / Run Hours",
                angle: -90,
                position: "insideLeft",
                dy: 80
              }}
            />
            <Tooltip content={<PowerTooltip />} />

            <Bar dataKey="importPower" fill="#af0000" barSize={22}>
              <LabelList content={(p) => <BarValueLabel {...p} fill="#af0000" />} />
            </Bar>

            <Bar dataKey="exportPower" fill="#018f20" barSize={22}>
              <LabelList content={(p) => <BarValueLabel {...p} fill="#018f20" />} />
            </Bar>

            <Bar dataKey="runHours" fill="#1e40af" barSize={22}>
              <LabelList content={(p) => <BarValueLabel {...p} fill="#1e40af" />} />
            </Bar>
          </BarChart>
        </div>
      </div>

      {/* LEGEND */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 font-bold text-sm">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-[#018f20] rounded" /> Solar Power Generated
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-[#af0000] rounded" /> Power Consumption
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-[#1E40AF] rounded" /> Plant Run Hours
        </div>
      </div>

      <p className="text-center text-sm font-bold mt-4">Plants</p>
    </div>
  </div>
);

}