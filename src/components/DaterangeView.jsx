import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
    LabelList  
} from "recharts";
import { useNavigate } from "react-router-dom";

import { getOperationsByDateRange } from "../services/operationService";
import { getAllPlants } from "../services/plantService";

/* ================= CONFIG ================= */
const MODULES = {
  sludge: {
    title: "Sludge Performance",
    bars: [
      { key: "sludgeReceived", label: "Received", color: "#2563eb" },
      { key: "sludgeProcessed", label: "Processed", color: "#16a34a" }
    ],
    yAxis: "Sludge (L)"
  },

  biochar: {
    title: "Biochar Production",
    bars: [
      { key: "biochar", label: "Biochar Produced", color: "#7c3aed" }
    ],
    yAxis: "Biochar (Kg)"
  },

  power: {
    title: "Power & Run Hours",
    bars: [
      { key: "importPower", label: "Power Consumed", color: "#af0000" },
      { key: "solarPower", label: "Solar Generated", color: "#1b5e20" },
      { key: "runHours", label: "Run Hours", color: "#1e40af" }
    ],
    yAxis: "Power (Kwh)"
  },

  pellets: {
    title: "Pellets & Polymer Usage",
    bars: [
      { key: "pelletsUsed", label: "Pellets Used", color: "#ea580c" },
      { key: "polymerUsed", label: "Polymer Used", color: "#9333ea" }
    ],
    yAxis: "Quantity"
  }
};


const TODAY = new Date().toISOString().split("T")[0];



/* ================= BAR TOP VALUE ================= */
const BarValueLabel = ({ x, y, width, value, fill, dataKey }) => {
  if (value === null || value === undefined || value <= 0) return null;

  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fill={fill}
      fontSize={11}
      fontWeight={700}
    >
      {formatValue(value, dataKey)}
    </text>
  );
};


/* ================= NUMBER FORMATTER ================= */
const formatValue = (value, key) => {
  if (value === null || value === undefined || value <= 0) return "0";

  const oneDecimalKeys = ["biochar", "importPower", "solarPower",  "polymerUsed"];

  const num = oneDecimalKeys.includes(key)
    ? Number(value).toFixed(1)
    : Math.round(Number(value)).toString();

  return Number(num).toLocaleString("en-IN");
};

const DateRangeTooltip = ({ active, payload, label, module }) => {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0].payload;

  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-lg p-3 text-xs w-64">
      
      {/* PLANT HEADER */}
      <p className="font-bold text-blue-900">
        {label}
      </p>

      <p className="text-[11px] font-semibold text-slate-500 mb-2">
        Plant ID: {row.plantId} &nbsp;|&nbsp; {row.kld} KLD
      </p>

      {/* VALUES */}
      <div className="space-y-1">
        {payload.map(p => {
          if (!p || p.value <= 0) return null;

          const bar = MODULES[module].bars.find(b => b.key === p.dataKey);

          return (
            <div
              key={p.dataKey}
              className="flex justify-between items-center"
            >
              <span className="font-semibold text-slate-600">
                {bar?.label}
              </span>

              <span
                className="font-bold"
                style={{ color: p.fill }}
              >
                {formatValue(p.value, p.dataKey)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};



export default function DaterangeView() {
  const [module, setModule] = useState("sludge");
  const [fromDate, setFromDate] = useState(TODAY);
  const [toDate, setToDate] = useState(TODAY);
  const [zone, setZone] = useState("All");

  const [plants, setPlants] = useState([]);
  const [zones, setZones] = useState([]);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(false);
const [sortBy, setSortBy] = useState("label"); // label | plantId | metric

  /* ================= FETCH PLANTS ================= */
  useEffect(() => {
    getAllPlants().then((res) => {
      setPlants(res || []);
      const uniqueZones = [...new Set((res || []).map(p => p.zones))].sort();
      setZones(uniqueZones);
    });
  }, []);

  /* ================= FETCH OPERATIONS ================= */
  useEffect(() => {
    if (!fromDate || !toDate) return;

    setLoading(true);
    getOperationsByDateRange(fromDate, toDate, zone)
      .then(res => setOperations(res || []))
      .finally(() => setLoading(false));
  }, [fromDate, toDate, zone]);

  useEffect(() => {
  setSortBy(MODULES[module].bars[0].key);
}, [module]);

const navigate = useNavigate();

const handlePlantClick = (plant) => {
  if (!plant) return;

  /* ---------- SLUDGE ---------- */
  if (module === "sludge") {
    if (sortBy === "sludgeReceived") {
      navigate(`/sludge-report-view/${plant.plantId}?mode=received`);
      return;
    }

    if (sortBy === "sludgeProcessed") {
      navigate(`/sludge-report-view/${plant.plantId}?mode=processed`);
      return;
    }
  }

  /* ---------- BIOCHAR ---------- */
  if (module === "biochar" && sortBy === "biochar") {
    navigate(`/sludge-report-view/${plant.plantId}?mode=biochar`);
    return;
  }

  /* ---------- POWER (single route for all sorts) ---------- */
  if (module === "power") {
    navigate(
      `/power-view/${plant.plantId}/${encodeURIComponent(plant.label)}`
    );
    return;
  }

  /* ---------- PELLETS / POLYMER ---------- */
  if (module === "pellets") {
    if (sortBy === "pelletsUsed") {
      navigate(
        `/pellets-view/${plant.plantId}/${encodeURIComponent(
          plant.label
        )}?type=pellets`
      );
      return;
    }

    if (sortBy === "polymerUsed") {
      navigate(
        `/pellets-view/${plant.plantId}/${encodeURIComponent(
          plant.label
        )}?type=polymer`
      );
      return;
    }
  }
};


  /* ================= FILTER PLANTS BY ZONE ================= */
  const visiblePlants = useMemo(() => {
    if (zone === "All") return plants;
    return plants.filter(p => String(p.zones) === String(zone));
  }, [plants, zone]);

  /* ================= AGGREGATE OPERATIONS ================= */
  const aggregatedByPlant = useMemo(() => {
    const map = {};

    operations.forEach(({ plantId, operation }) => {
      if (!map[plantId]) {
        map[plantId] = {
          sludgeReceived: 0,
          sludgeProcessed: 0,
          biochar: 0,
          importPower: 0,
          solarPower: 0,
          runHours: 0,
          pelletsUsed: 0,
          polymerUsed: 0
        };
      }

      /* SLUDGE */
      map[plantId].sludgeReceived += Number(operation.sludgeReceived || 0);
      map[plantId].sludgeProcessed += Number(operation.sludgeProcessed || 0);
      map[plantId].biochar += Number(operation.biocharProduced || 0);

      /* POWER */
     const imp =
  operation.powerReadingAmImport != null &&
  operation.powerReadingPmImport != null
    ? Math.max(
        operation.powerReadingPmImport -
        operation.powerReadingAmImport,
        0
      )
    : 0;

const exp =
  operation.powerReadingAmExport != null &&
  operation.powerReadingPmExport != null
    ? Math.max(
        operation.powerReadingPmExport -
        operation.powerReadingAmExport,
        0
      )
    : 0;

map[plantId].importPower += Number(imp.toFixed(1));
map[plantId].solarPower += Number(exp.toFixed(1));

      map[plantId].runHours += Number(operation.plantRunningHrs || 0);

      /* PELLETS */
      map[plantId].pelletsUsed += Number(operation.pillets || 0);
      // polymerUsage comes in grams → convert to KG
      map[plantId].polymerUsed += Number(operation.polymerUsage || 0) / 1000;
    });

    return map;
  }, [operations]);

  /* ================= CHART DATA (ALL PLANTS) ================= */
const chartData = useMemo(() => {
  const data = visiblePlants.map(p => ({
    label: p.plantName,
    plantId: p.plantID,
    kld: p.kld,
    ...(aggregatedByPlant[p.plantID] || {})
  }));

  if (!sortBy) return data;

  return [...data].sort((a, b) => {
   if (sortBy === "plantId") {
  return Number(a.plantId) - Number(b.plantId); // ✅ ASC by Plant ID
}

    return Number(b[sortBy] || 0) - Number(a[sortBy] || 0); // ✅ DESC by metric
  });
}, [visiblePlants, aggregatedByPlant, sortBy]);

  /* ================= KPI DATA ================= */
 /* ================= kpi data ================= */
const totalPlants = visiblePlants.length;

const permanentPowerPlants = visiblePlants.filter(
  p => p.permanentPower
).length;

const moduleKpis = useMemo(() => {
  const totals = {
    sludgeReceived: 0,
    sludgeProcessed: 0,
    biochar: 0,
    importPower: 0,
    solarPower: 0,
    runHours: 0,
    pelletsUsed: 0,
    polymerUsed: 0
  };

  visiblePlants.forEach(p => {
    const v = aggregatedByPlant[p.plantID];
    if (!v) return;
    Object.keys(totals).forEach(k => {
      totals[k] += Number(v[k] || 0);
    });
  });

  if (module === "sludge") {
    return [
      { label: "SLUDGE RECEIVED (L)", value: totals.sludgeReceived },
      { label: "SLUDGE PROCESSED (L)", value: totals.sludgeProcessed }
    ];
  }

  if (module === "biochar") {
    return [
      { label: "BIOCHAR PRODUCED (Kg)", value: totals.biochar }
    ];
  }

  if (module === "power") {
    return [
      { label: "POWER CONSUMED (Kwh)", value: totals.importPower },
      { label: "SOLAR GENERATED (Kwh)", value: totals.solarPower },
      { label: "RUN HOURS", value: totals.runHours }
    ];
  }

  return [
    { label: "PELLETS USED (Kg)", value: totals.pelletsUsed },
    { label: "POLYMER USED (Kg)", value: totals.polymerUsed }
  ];
}, [aggregatedByPlant, visiblePlants, module]);



  return (
    <div className="space-y-6">

      {/* ================= FILTER ================= */}
     <div className="bg-white rounded-xl shadow p-4">
  <div className="flex flex-wrap items-end gap-x-6 gap-y-4">

    {/* DATE RANGE */}
    <div className="flex items-end gap-4">
      <DateInput label="From" value={fromDate} onChange={setFromDate} />
      <DateInput label="To" value={toDate} onChange={setToDate} min={fromDate} />
    </div>

    {/* ZONE */}
    <div className="min-w-[140px]">
      <Select
        label="Zone"
        value={zone}
        onChange={setZone}
        options={["All", ...zones.map(z => String(z))]}
      />
    </div>

    {/* MODULE TOGGLE */}
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-slate-600 tracking-wide">
        Module
      </span>

      <div className="flex p-1 rounded-lg bg-slate-100">
        {["sludge", "biochar", "power", "pellets"].map((m) => (
          <button
            key={m}
            onClick={() => setModule(m)}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              module === m
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>
    </div>

  </div>
</div>


      {/* ================= KPI CARDS ================= */}
<div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
  <KpiCard
    label="TOTAL PLANTS"
    value={totalPlants.toLocaleString("en-IN")}
  />

  <KpiCard
    label="PERMANENT POWER PLANTS"
    value={permanentPowerPlants.toLocaleString("en-IN")}
  />

  {moduleKpis.map(k => {
    // find matching dataKey for formatting
    const key =
      MODULES[module].bars.find(b => b.label === k.label)?.key;

    return (
      <KpiCard
        key={k.label}
        label={k.label}   // already normal-case from moduleKpis
        value={formatValue(k.value, key)}
      />
    );
  })}
</div>


      {/* ================= GRAPH ================= */}
    {/* ================= GRAPH ================= */}
{/* ================= GRAPH ================= */}
<div className="bg-white rounded-xl shadow-lg p-4">

  {/* HEADER + SORT */}
  <div className="flex items-center justify-between mb-3">
    <h3 className="font-bold text-blue-900">
      {MODULES[module].title}
    </h3>

    {/* SORT DROPDOWN */}
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-slate-900">
        Sort By
      </span>

      <select
        value={sortBy || ""}
        onChange={(e) => setSortBy(e.target.value)}
        className="border rounded-md px-2 py-1 text-xs font-semibold
                   bg-white text-slate-700 focus:outline-none"
      >
        {/* ✅ COMMON OPTION */}
        <option value="plantId">Plant ID</option>

        {/* MODULE-SPECIFIC OPTIONS */}
        {MODULES[module].bars.map(b => (
          <option key={b.key} value={b.key}>
            {b.label}
          </option>
        ))}
      </select>
    </div>
  </div>


  <div className="overflow-x-auto">
    <div
      style={{
    width:
      zone === "All"
        ? Math.max(chartData.length * 90, 900)
        : "100%",              // ✅ FULL WIDTH for zone
    height: 420
  }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
  data={chartData}
  margin={{ top: 30, left: 70, bottom: 80 }}
  barCategoryGap={90}   // ⬅ gap between plant groups
  barGap={13}            // ⬅ gap between bars inside group
>

          <CartesianGrid strokeDasharray="3 3" />

<XAxis
  dataKey="label"
  interval={0}
  height={zone === "All" ? 80 : 90}
  tick={({ x, y, payload }) => {
    const plant = chartData.find(
      (p) => p.label === payload.value
    );

 const isClickable =
  (module === "sludge" &&
    ["sludgeReceived", "sludgeProcessed"].includes(sortBy)) ||
  (module === "biochar" && sortBy === "biochar") ||
  module === "power" ||
  (module === "pellets" &&
    ["pelletsUsed", "polymerUsed"].includes(sortBy));

    return (
      <text
        x={x}
        y={y + 10}
        textAnchor="end"
        fill="#003f8a"
        fontSize={11}
        fontWeight={600}
        transform={`rotate(${zone === "All" ? -30 : -45} ${x} ${y + 10})`}
        style={{
          cursor: isClickable ? "pointer" : "default",
          textDecoration: isClickable ? "underline" : "none",
        }}
        onClick={() => {
          if (!plant || !isClickable) return;
          handlePlantClick(plant);
        }}
      >
        {payload.value}
      </text>
    );
  }}
/>



          <YAxis
  tickFormatter={(v) => formatValue(v, module === "sludge" ? "sludgeReceived" : module)}
  label={{
    value: MODULES[module].yAxis,
    angle: -90,
    position: "insideLeft",
    dy: 60,
    dx:-30
  }}
/>


    <Tooltip
  content={(props) => (
    <DateRangeTooltip {...props} module={module} />
  )}
/>

{MODULES[module].bars.map(b => (
  <Bar
    key={b.key}
    dataKey={b.key}
    fill={b.color}
    barSize={20}   // ⬅ reduced from 24
  >
    <LabelList
      content={(props) => (
        <BarValueLabel {...props} fill={b.color} />
      )}
    />
  </Bar>
))}

        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>

  {/* LEGEND */}
  <div className="flex flex-wrap justify-center gap-6 mt-4 font-semibold text-sm text-blue-900">
    {MODULES[module].bars.map(b => (
      <div key={b.key} className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded"
          style={{ backgroundColor: b.color }}
        />
        {b.label}
      </div>
    ))}
  </div>

  <p className="text-center text-sm font-bold mt-4">Plants</p>
</div>


      {loading && (
        <p className="text-center text-sm font-bold text-slate-500">
          Loading data...
        </p>
      )}
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */
const DateInput = ({ label, value, onChange, min }) => (
  <div>
    <label className="text-xs font-bold block">{label}</label>
    <input
      type="date"
      value={value}
      min={min}
      max={TODAY}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-2 py-1 text-sm"
    />
  </div>
);
const Select = ({ label, value, onChange, options }) => (
  <div>
    <label className="text-xs font-bold block">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-2 py-1 text-sm"
    >
      {options.map(o => (
        <option key={o} value={o}>
          {label === "Zone"
            ? o === "All"
              ? "All Zones"
              : `Zone ${o}`
            : o.charAt(0).toUpperCase() + o.slice(1)}
        </option>
      ))}
    </select>
  </div>
);



const KpiCard = ({ label, value }) => (
  <div className="bg-white rounded-xl shadow p-4 text-center">
    <p className="text-xs font-bold text-slate-500 ">{label}</p>
    <p className="text-2xl font-black text-blue-900">{value}</p>
  </div>
);
