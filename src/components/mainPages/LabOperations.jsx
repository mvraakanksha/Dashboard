import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Activity,
  Droplets,
  Thermometer,
  FlaskConical,
  Waves,
} from "lucide-react";
// import { FlaskConical } from "lucide-react";
import { getAllPlants } from "../../services/plantService";
import { getLabOperationsByDate } from "../../services/operationService";


const KPICard = ({ label, value, unit, theme, icon }) => (
  <div
    className={`group relative overflow-hidden p-4 rounded-xl border
      transition-all duration-300 shadow-sm hover:shadow-md
      ${theme.bg} ${theme.border}`}
  >
    <div
      className={`absolute bottom-0 left-0 h-1.5 w-full ${theme.barColor}
        origin-left scale-x-0 group-hover:scale-x-100
        transition-transform duration-500 ease-out`}
    />

    <div className="flex flex-col gap-3">
      <div className={`p-2 w-fit rounded-lg bg-white ${theme.iconColor} shadow-sm`}>
        {React.cloneElement(icon, { size: 18 })}
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-900">
          {label}
        </p>
        <p className="text-xl font-black text-slate-900">
          {value}
          {unit && <span className="text-sm ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  </div>
);



/* ---------------- BAR LABEL ---------------- */
const TopBarLabel = ({ x, y, width, value }) => {
  if (!value || value === 0) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fill="#003f8a"
      fontSize={11}
      fontWeight={700}
    >
      {Number(value).toFixed(1)}
    </text>
  );
};
const ClickableTick = ({ x, y, payload, plantMap, onPlantClick }) => {
  const label = payload.value;
  const plant = plantMap[label];

  return (
    <text
      x={x}
      y={y + 10}
      transform={`rotate(-45 ${x} ${y + 10})`}
      textAnchor="end"
      fill="#003f8a"
      fontSize={11}
      fontWeight={600}
      style={{
        cursor: "pointer",
        textDecoration: "underline"
      }}
      onClick={() => plant && onPlantClick(plant)}
    >
      {label}
    </text>
  );
};

/* ---------------- TOOLTIP ---------------- */
const LabTooltip = ({ active, payload, type }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  const fmt = (v) => Number(v || 0).toFixed(1);

  return (
    <div className="bg-white border rounded shadow-md p-2 text-xs">
      <p className="font-bold text-blue-900">
        {d.plantId} – {d.label} ({d.kld} KLD)
      </p>

      {type === "flow" && (
        <>
          <p>Flow AM: <span className="font-semibold">{fmt(d.flowAm)} mg/L</span></p>
          <p>Flow PM: <span className="font-semibold">{fmt(d.flowPm)} mg/L</span></p>
          <p className="mt-1 font-semibold text-green-700">
            Cumulative Flow: {fmt(d.cumulativeFlow)} L
          </p>
        </>
      )}

      {type === "cod_bod" && (
        <>
          <p>COD: {fmt(d.cod)} mg/L</p>
          <p>BOD: {fmt(d.bod)} mg/L</p>
        </>
      )}

      {type === "tn_tss" && (
        <>
          <p>TN: {fmt(d.tn)} mg/L</p>
          <p>TSS: {fmt(d.tss)} mg/L</p>
        </>
      )}

      {type === "temp_ph" && (
        <>
          <p>Temperature: {fmt(d.temperature)} °C</p>
          <p>pH: {fmt(d.ph)}</p>
        </>
      )}
    </div>
  );
};
const yAxisLabelMap = {
  cod_bod: "COD / BOD (mg/L)",
  tn_tss: "TN / TSS (mg/L)",
  temp_ph: "Temperature (°C) / pH",
};

/* ================================================= */
export default function LabOperations({ date, zone, selectedPlants = [],}) {
  const navigate = useNavigate();
  const [plants, setPlants] = useState([]);
  const [labOps, setLabOps] = useState([]);
const [sortBy, setSortBy] = useState("flow"); 
const [labSortBy, setLabSortBy] = useState("metric"); 
// metric | plantId

  const [secondGraph, setSecondGraph] = useState("cod_bod");
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


  /* ---------------- FETCH ---------------- */
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

  const loadLabOps = async () => {
    try {
      const data = await getLabOperationsByDate(date);
      setLabOps(data || []);
    } catch (err) {
      console.error("Failed to fetch lab operations", err);
      setLabOps([]);
    }
  };

  loadLabOps();
}, [date]);

  const zones = [...new Set(plants.map(p => p.zones))];

  /* ---------------- FILTER ---------------- */
const filteredPlants = useMemo(() => {
  return plants.filter((p) => {
    const zoneMatch =
      zone === "All" ||
      String(p.zones) === String(zone);

    const plantMatch =
      selectedPlants.length === 0 ||
      selectedPlants.includes(p.plantID);

    return zoneMatch && plantMatch;
  });
}, [plants, zone, selectedPlants]);

const totalPlants = filteredPlants.length;

  /* ---------------- DATA ---------------- */
  const chartData = useMemo(() => {
    return filteredPlants.map(p => {
      const rec = labOps.find(l => l.plantId === p.plantID);
      const lab = rec?.labOperation || {};
      return {
        label: p.plantName,
        plantId: p.plantID,
         kld: p.kld || "-", 
        cod: lab.cod || 0,
        bod: lab.bod || 0,
        tn: lab.tn || 0,
        tss: lab.tss || 0,
        ph: lab.ph || 0,
        temperature: lab.temperature || 0,
        cumulativeFlow: lab.cumulativeFlow || 0,
        flowAm: lab.flowMeterReadingAm || 0,
        flowPm: lab.flowMeterReadingPm || 0,
      };
    });
  }, [filteredPlants, labOps]);

  /* ---------------- KPI AVG ---------------- */
  const avg = (k) => {
  const valid = chartData.filter(
    d => d[k] !== null && d[k] !== undefined && d[k] !== 0 && !isNaN(d[k])
  );

  if (!valid.length) return "0.00";

  const sum = valid.reduce((s, d) => s + Number(d[k]), 0);
  return (sum / valid.length).toFixed(1);
};

/* ---------------- KPI SUM ---------------- */
const sum = (k) => {
  const valid = chartData.filter(
    d => d[k] !== null && d[k] !== undefined && !isNaN(d[k])
  );

  if (!valid.length) return "0.0";

  const total = valid.reduce((s, d) => s + Number(d[k] || 0), 0);
  return total.toFixed(1);
};

  const needsScroll = chartData.length > 12;
  const chartWidth = needsScroll ? chartData.length * 90 : "100%";
  const plantMap = {};
chartData.forEach(p => (plantMap[p.label] = p));
const openPlantDetail = (plant, mode) => {
  navigate(
    `/lab-operations/${plant.plantId}/${encodeURIComponent(
      plant.label
    )}?mode=${mode}`
  );
};

const sortedChartData = useMemo(() => {
  const arr = [...chartData];

  if (sortBy === "plantId") {
    return arr.sort((a, b) => Number(a.plantId) - Number(b.plantId));
  }

  // default → cumulative flow desc
  return arr.sort(
    (a, b) => Number(b.cumulativeFlow || 0) - Number(a.cumulativeFlow || 0)
  );
}, [chartData, sortBy]);

const currentMetricKey = useMemo(() => {
  if (secondGraph === "cod_bod") return "cod";      // default first bar
  if (secondGraph === "tn_tss") return "tn";
  if (secondGraph === "temp_ph") return "temperature";
  return "cod";
}, [secondGraph]);
const sortedLabChartData = useMemo(() => {
  const arr = [...chartData];

  if (labSortBy === "plantId") {
    return arr.sort((a, b) => Number(a.plantId) - Number(b.plantId));
  }

  return arr.sort(
    (a, b) =>
      Number(b[currentMetricKey] || 0) -
      Number(a[currentMetricKey] || 0)
  );
}, [chartData, labSortBy, currentMetricKey]);

const sortLabelMap = {
  cod_bod: "COD & BOD",
  tn_tss: "TN & TSS",
  temp_ph: "Temp & pH"
};

const dynamicSortLabel = sortLabelMap[secondGraph] || "Metric";

/* ---------------- ENTRY COUNTS ---------------- */

// count plants that actually have flow bars
const flowEntryCount = useMemo(() => {
  return chartData.filter(d => Number(d.cumulativeFlow) > 0).length;
}, [chartData]);

// count plants that have lab bars depending on selected graph
const labEntryCount = useMemo(() => {

  if (secondGraph === "cod_bod") {
    return chartData.filter(
      d => Number(d.cod) > 0 || Number(d.bod) > 0
    ).length;
  }

  if (secondGraph === "tn_tss") {
    return chartData.filter(
      d => Number(d.tn) > 0 || Number(d.tss) > 0
    ).length;
  }

  if (secondGraph === "temp_ph") {
    return chartData.filter(
      d => Number(d.temperature) > 0 || Number(d.ph) > 0
    ).length;
  }

  return 0;

}, [chartData, secondGraph]);

  /* ================================================= */
  return (
  <div className="min-h-screen bg-gradient-to-br from-[#CFE2FF] to-[#013B88] p-6">

    {/* 🔝 HEADER */}
    <div className="flex items-center gap-4 mb-8">
      <div className="p-3 rounded-2xl bg-blue-600 text-white">
        <FlaskConical className="w-6 h-6" />
      </div>
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-blue-900">
          Lab Reports
        </h2>
        <p className="text-xs tracking-widest font-bold text-slate-900">
          Laboratory Parameters & Flow Monitoring
        </p>
      </div>
    </div>

    {/* KPI CARDS */}
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
     <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-6">
      <KPICard
  label="Total Plants"
  value={totalPlants}
  theme={theme.amber}
  icon={<Activity />}
/>
        <KPICard label="Avg COD" value={avg("cod")} unit="mg/L" theme={theme.blue} icon={<FlaskConical />} />
        <KPICard label="Avg BOD" value={avg("bod")} unit="mg/L" theme={theme.indigo} icon={<FlaskConical />} />
        <KPICard label="Avg TN" value={avg("tn")} unit="mg/L" theme={theme.emerald} icon={<Activity />} />
        <KPICard label="Avg TSS" value={avg("tss")} unit="mg/L" theme={theme.emerald} icon={<Waves />} />
        <KPICard label="Avg pH" value={avg("ph")} theme={theme.amber} icon={<Thermometer />} />
        <KPICard label="Avg Temp" value={avg("temperature")} unit="°C" theme={theme.amber} icon={<Thermometer />} />
        
        <KPICard
  label="Total Flow"
  value={sum("cumulativeFlow")}
  unit="L"
  theme={theme.indigo}
  icon={<Droplets />}
/>
<KPICard
  label="Avg Flow"
  value={avg("cumulativeFlow")}
  unit="L"
  theme={theme.blue}
  icon={<Droplets />}
/>
      </div>
    </div>

    {/* FLOW GRAPH */}
    <div className="bg-white rounded-xl shadow-lg p-3 mb-6">
   <div className="flex items-center justify-between mb-3">

  <div className="flex items-center gap-3">
    <h3 className="font-bold text-blue-900 text-lg">
      Cumulative Flow (L)
    </h3>

    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">
      Entries: {flowEntryCount}
    </span>
  </div>

  {/* SORT */}
  <div className="flex items-center gap-2">
    <span className="text-xs font-bold text-slate-700">
      Sort By
    </span>

    <select
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value)}
      className="border rounded-md px-2 py-1 text-xs font-semibold bg-white shadow-sm"
    >
      <option value="flow">Cumulative Flow</option>
      <option value="plantId">Plant ID</option>
    </select>
  </div>

</div>

      <div className="overflow-x-auto">
        <div style={{ width: chartWidth, height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedChartData} margin={{ top: 20, right: 20, left: 40, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="label"
                interval={0}
                height={70}
                tick={(props) => (
                  <ClickableTick
                    {...props}
                    plantMap={plantMap}
                    onPlantClick={(p) => openPlantDetail(p, "flow")}
                  />
                )}
              />

              <YAxis
                allowDecimals={false}
                label={{
                  value: "Cumulative Flow (L)",
                  angle: -90,
                  position: "insideLeft",
                  dy: 70,
                  style: {
                    fill: "#1E3A8A",
                    fontSize: 14,
                    fontWeight: 600,
                  },
                }}
              />

              <Tooltip content={(p) => <LabTooltip {...p} type="flow" />} />

              <Bar
  dataKey="cumulativeFlow"
  fill="#2563EB"
  barSize={30}
  label={<TopBarLabel />}
/>

            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-center text-sm font-semibold text-gray-700 mt-4">
        Plants
      </p>
    </div>

    {/* SECOND GRAPH */}
    <div className="bg-white rounded-xl shadow-lg p-4">
  <div className="flex items-center justify-between mb-2">

  {/* LEFT TITLE */}
  <div className="flex items-center gap-3">
  <h3 className="font-bold text-blue-900">
    Lab Parameters
  </h3>

  <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">
    Entries: {labEntryCount}
  </span>
</div>

  {/* RIGHT SIDE */}
  <div className="flex items-center gap-4">

    {/* SORT */}
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-slate-700">
        Sort
      </span>

<select
  value={labSortBy}
  onChange={(e) => setLabSortBy(e.target.value)}
  className="border rounded-md px-2 py-1 text-xs font-semibold bg-white shadow-sm"
>
  <option value="metric">{dynamicSortLabel}</option>
  <option value="plantId">Plant ID</option>
</select>
    </div>

    {/* GRAPH MODE BUTTONS */}
    <div className="flex p-1 rounded-lg bg-slate-100">
      <button
        onClick={() => setSecondGraph("cod_bod")}
        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
          secondGraph === "cod_bod"
            ? "bg-white text-emerald-600 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        COD & BOD
      </button>

      <button
        onClick={() => setSecondGraph("tn_tss")}
        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
          secondGraph === "tn_tss"
            ? "bg-white text-emerald-600 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        TN & TSS
      </button>

      <button
        onClick={() => setSecondGraph("temp_ph")}
        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
          secondGraph === "temp_ph"
            ? "bg-white text-emerald-600 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Temp & pH
      </button>
    </div>

  </div>
</div>

      <div className="overflow-x-auto">
        <div style={{ width: chartWidth, height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
           <BarChart data={sortedLabChartData} margin={{ top: 20, right: 20, left: 40, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />

              

              <XAxis
                dataKey="label"
                interval={0}
                height={70}
                tick={(props) => (
                  <ClickableTick
                    {...props}
                    plantMap={plantMap}
                    onPlantClick={(p) => openPlantDetail(p, secondGraph)}
                  />
                )}
              />

              <YAxis
                allowDecimals={false}
                label={{
                  value: yAxisLabelMap[secondGraph],
                  angle: -90,
                  position: "insideLeft",
                  dy: 70,
                  style: {
                    fill: "#1E3A8A",
                    fontSize: 14,
                    fontWeight: 600,
                  },
                }}
              />

              <Tooltip content={(p) => <LabTooltip {...p} type={secondGraph} />} />

              {secondGraph === "cod_bod" && (
                <>
                  <Bar dataKey="cod" fill="#6AA6FF" barSize={24} label={<TopBarLabel />} />
                  <Bar dataKey="bod" fill="#0047B3" barSize={24} label={<TopBarLabel />} />
                </>
              )}

              {secondGraph === "tn_tss" && (
                <>
                  <Bar dataKey="tn" fill="#885cafff" barSize={24} label={<TopBarLabel />} />
                  <Bar dataKey="tss" fill="#1a9cb3ff" barSize={24} label={<TopBarLabel />} />
                </>
              )}

              {secondGraph === "temp_ph" && (
                <>
                  <Bar dataKey="temperature" fill="#FF9800" barSize={24} label={<TopBarLabel />} />
                  <Bar dataKey="ph" fill="#9C27B0" barSize={24} label={<TopBarLabel />} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
{/* LEGEND */}
<div className="flex items-center justify-center gap-6 mt-4 text-[13px] font-semibold text-[#003f8a]">

  {secondGraph === "cod_bod" && (
    <>
      <span className="flex items-center gap-2">
        <span className="w-3 h-3 bg-[#6AA6FF] rounded-sm" />
        COD
      </span>

      <span className="flex items-center gap-2">
        <span className="w-3 h-3 bg-[#0047B3] rounded-sm" />
        BOD
      </span>
    </>
  )}

  {secondGraph === "tn_tss" && (
    <>
      <span className="flex items-center gap-2">
        <span className="w-3 h-3 bg-[#885cafff] rounded-sm" />
        TN
      </span>

      <span className="flex items-center gap-2">
        <span className="w-3 h-3 bg-[#1a9cb3ff] rounded-sm" />
        TSS
      </span>
    </>
  )}

  {secondGraph === "temp_ph" && (
    <>
      <span className="flex items-center gap-2">
        <span className="w-3 h-3 bg-[#FF9800] rounded-sm" />
        Temperature
      </span>

      <span className="flex items-center gap-2">
        <span className="w-3 h-3 bg-[#9C27B0] rounded-sm" />
        pH
      </span>
    </>
  )}

</div>

      <p className="text-center text-sm font-bold text-[#333] mt-4">
        Plants
      </p>
    </div>
  </div>
);
}