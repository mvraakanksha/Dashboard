import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Layers, ExternalLink, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Box } from "lucide-react";
import { getAllPlants } from "../../services/plantService";
import { getOperationsByDateRange } from "../../services/operationService";

const formatIN = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Number(value));
};


/* ---------------- TOOLTIP ---------------- */
const PelletsTooltip = ({ active, payload, materialType, sortBy }) => {
  if (!active || !payload?.length) return null;

  const d = payload[0].payload;

  const isPellets = materialType === "pellets";

  const usedValue = isPellets
    ? `${formatIN(d.pelletsUsed)} Kg`
    : `${formatIN(d.polymerUsed)} grms`;

  const stockValue = isPellets
    ? d.pelletsStock !== null
      ? `${formatIN(d.pelletsStock)} Kg`
      : "-"
    : d.polymerStock !== null
    ? `${formatIN(d.polymerStock)} Kg`
    : "-";

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs w-64">
      {/* HEADER */}
      <p className="font-bold text-red-700 mb-1">
        PID: {d.plantId} – {d.label}
        <span className="text-slate-500 font-semibold">
          {" "}({d.kld} KLD)
        </span>
      </p>

      {/* USED */}
      <p
        className={`mt-2 ${
          sortBy === "used"
            ? "font-bold text-slate-900"
            : "text-slate-500"
        }`}
      >
        {isPellets ? "Pellets Used:" : "Polymer Used:"} {usedValue}
      </p>

      {/* STOCK */}
      <p
        className={`mt-1 ${
          sortBy === "stock"
            ? "font-bold text-slate-900"
            : "text-slate-900"
        }`}
      >
        {isPellets ? "Pellets Stock:" : "Polymer Stock:"} {stockValue}
      </p>
    </div>
  );
};




// ✅ returns last non-null stock by walking backwards in time
const getLastEnteredStock = (ops, stockKey) => {
  if (!Array.isArray(ops) || ops.length === 0) return null;

  // walk from last date → previous dates
  for (let i = ops.length - 1; i >= 0; i--) {
    const val = ops[i]?.operation?.[stockKey];
    if (val !== null && val !== undefined) {
      return val;
    }
  }
  return null;
};


export default function Pellets({ isDark, date, zone }) {
  const navigate = useNavigate();

  const [plants, setPlants] = useState([]);
  const [ops, setOps] = useState([]);
const [sortBy, setSortBy] = useState("stock"); // "stock" | "plantId"

  const [materialType, setMaterialType] = useState("pellets");

const theme = {
  blue: {
    bg: isDark ? "bg-blue-900/20" : "bg-blue-50",
    border: "border-blue-100",
    barColor: "bg-blue-600",
    iconColor: "text-blue-600",
  },
  indigo: {
    bg: isDark ? "bg-indigo-900/20" : "bg-indigo-50",
    border: "border-indigo-100",
    barColor: "bg-indigo-600",
    iconColor: "text-indigo-600",
  },
  emerald: {
    bg: isDark ? "bg-emerald-900/20" : "bg-emerald-50",
    border: "border-emerald-100",
    barColor: "bg-emerald-600",
    iconColor: "text-emerald-600",
  },
  amber: {
    bg: isDark ? "bg-amber-900/20" : "bg-amber-50",
    border: "border-amber-100",
    barColor: "bg-amber-600",
    iconColor: "text-amber-600",
  },
};


  /* ---------------- FETCH PLANTS ---------------- */
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


  /* ---------------- FETCH OPS ---------------- */
useEffect(() => {
  if (!date) return;

  const from = new Date(date);
  from.setDate(from.getDate() - 15); // last 15 days

  const loadOps = async () => {
    try {
      const data = await getOperationsByDateRange(
        from.toISOString().split("T")[0],
        date
      );
      setOps(data || []);
    } catch (err) {
      console.error("Failed to fetch operations", err);
      setOps([]);
    }
  };

  loadOps();
}, [date]);





const lastStockMap = useMemo(() => {
  const map = {};

  plants.forEach((p) => {
    const plantOps = ops
      .filter((o) => o.plantId === p.plantID)
      // make sure ops are sorted by date
      .sort(
        (a, b) =>
          new Date(a.operation.operationDate) -
          new Date(b.operation.operationDate)
      );

    map[p.plantID] = {
      pelletsStock: getLastEnteredStock(plantOps, "pilletsStock"),
      polymerStock: getLastEnteredStock(plantOps, "polymerStock")
    };
  });

  return map;
}, [plants, ops]);



  /* ---------------- BUILD CHART DATA ---------------- */
const chartData = useMemo(() => {
  return plants
    .filter(
      (p) => zone === "All" || String(p.zones) === String(zone)
    )
    .map((p) => {
      const op = ops.find((o) => o.plantId === p.plantID &&
    o.operation?.operationDate === date)?.operation;

      const lastStock = lastStockMap[p.plantID] || {};

      return {
        label: p.plantName,
        plantId: p.plantID,
        kld: p.kld,

        pelletsUsed: op?.pillets ?? 0,
        polymerUsed: op?.polymerUsage ?? 0,

        // ✅ LAST ENTERED (non-null) stock
        pelletsStock: lastStock.pelletsStock ?? null,
        polymerStock: lastStock.polymerStock ?? null
      };
    });
}, [plants, ops, zone, lastStockMap]);



// const hasLowPelletsStock = useMemo(() => {
//   return chartData.some(
//     p => p.pelletsStock !== null && p.pelletsStock < 50
//   );
// }, [chartData]);

// const hasLowPolymerStock = useMemo(() => {
//   return chartData.some(
//     p => p.polymerStock !== null && p.polymerStock < 5
//   );
// }, [chartData]);

// useEffect(() => {
//   localStorage.setItem(
//     "inventoryAlerts",
//     JSON.stringify({
//       pellets: hasLowPelletsStock,
//       polymer: hasLowPolymerStock
//     })
//   );
// }, [hasLowPelletsStock, hasLowPolymerStock]);

// const lowStockPlants = useMemo(() => {
//   return chartData.filter((p) =>
//     materialType === "pellets"
//       ? p.pelletsStock !== null && p.pelletsStock < 50
//       : p.polymerStock !== null && p.polymerStock < 5
//   );
// }, [chartData, materialType]);
const getStockAlert = (value, materialType) => {
  if (value === null || value === undefined) return null;

  if (value === 0) return "red";

  if (materialType === "pellets" && value <= 200) return "yellow";
  if (materialType === "polymer" && value <= 15) return "yellow";

  return null;
};


// const lowStockMap = useMemo(() => {
//   const map = {};
//   lowStockPlants.forEach((p) => {
//     map[p.label] = true;
//   });
//   return map;
// }, [lowStockPlants]);

const stockAlertMap = useMemo(() => {
  const map = {};

  chartData.forEach((p) => {
    const stock =
      materialType === "pellets"
        ? p.pelletsStock
        : p.polymerStock;

    const alert = getStockAlert(stock, materialType);

    if (alert) {
      map[p.label] = alert; // "red" | "yellow"
    }
  });

  return map;
}, [chartData, materialType]);


//-----------------sorting -------------------
const sortedChartData = useMemo(() => {
  const data = [...chartData];

  if (sortBy === "stock") {
    return data.sort((a, b) => {
      const aVal =
        materialType === "pellets"
          ? a.pelletsStock ?? 0
          : a.polymerStock ?? 0;

      const bVal =
        materialType === "pellets"
          ? b.pelletsStock ?? 0
          : b.polymerStock ?? 0;

      return bVal - aVal; // highest first
    });
  }

  if (sortBy === "used") {
    return data.sort((a, b) => {
      const aVal =
        materialType === "pellets"
          ? a.pelletsUsed ?? 0
          : a.polymerUsed ?? 0;

      const bVal =
        materialType === "pellets"
          ? b.pelletsUsed ?? 0
          : b.polymerUsed ?? 0;

      return bVal - aVal; // highest first
    });
  }

  if (sortBy === "plantId") {
    return data.sort((a, b) => Number(a.plantId) - Number(b.plantId));
  }

  return data;
}, [chartData, materialType, sortBy]);



  /* ---------------- METRICS ---------------- */
/* ---------------- METRICS ---------------- */

// USED
const totalPelletsUsed = chartData.reduce(
  (s, p) => s + p.pelletsUsed,
  0
);

const totalPolymerUsed = chartData.reduce(
  (s, p) => s + p.polymerUsed,
  0
);

// STOCK (last entered, summed)
const totalPelletsStock = chartData.reduce(
  (s, p) => s + (p.pelletsStock !== null ? p.pelletsStock : 0),
  0
);

const totalPolymerStock = chartData.reduce(
  (s, p) => s + (p.polymerStock !== null ? p.polymerStock : 0),
  0
);

// AVERAGE USED
const avgPellets =
  chartData.length > 0 ? totalPelletsUsed / chartData.length : 0;

const avgPolymer =
  chartData.length > 0 ? totalPolymerUsed / chartData.length : 0;


const selectedKey = useMemo(() => {
  if (sortBy === "used") {
    return materialType === "pellets"
      ? "pelletsUsed"
      : "polymerUsed";
  }

  // default = stock
  return materialType === "pellets"
    ? "pelletsStock"
    : "polymerStock";
}, [materialType, sortBy]);

/* ---------------- ENTRY COUNT ---------------- */
const entryCount = useMemo(() => {
  if (!sortedChartData?.length) return 0;

  return sortedChartData.filter((p) => {
    const value = p[selectedKey];

    // ignore null or zero → no visible bar
    return value !== null && value !== undefined && Number(value) > 0;
  }).length;

}, [sortedChartData, selectedKey]);

/* ---------------- ENTRY LABEL ---------------- */
const entryLabel = useMemo(() => {

  if (sortBy === "plantId") {
    return "Plants With Data";
  }

  if (sortBy === "used") {
    return materialType === "pellets"
      ? "Entries"
      : "Entries ";
  }

  return materialType === "pellets"
    ? "Entries"
    : "Entries";

}, [materialType, sortBy]);
  // const barColor =
  //   materialType === "pellets" ? "#800000" : "#003366";

    const TopBarLabel = ({ x, y, width, value }) => {
  if (value === null || value === undefined) return null;

  return (
    <text
      x={x + width / 2}
      y={y - 6}          // 👈 position ABOVE bar
      textAnchor="middle"
      fill="#003f8a"
      fontSize={11}
      fontWeight={700}
      pointerEvents="none"
    >
        {formatIN(value)}
    </text>
  );
};

const BAR_SLOT_WIDTH = 90;
const needsScroll = sortedChartData.length > 12;

const chartWidth = needsScroll
  ? sortedChartData.length * BAR_SLOT_WIDTH
  : "100%";

  /* ---------------- KPI CARD ---------------- */
const KPICard = ({ label, value, unit, theme, icon, isDark }) => (
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
        {React.cloneElement(icon, { size: 18 })}
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
      </div>
    </div>
  </div>
);


  /* ======================= UI ======================= */
  return (
    <div className="p-6 bg-[#D9E6FF] min-h-screen">
     {/* 🔝 HEADER */}
<div className="flex items-center justify-between mb-8">
  <div className="flex items-center gap-4">
    {/* ICON */}
    <div
      className={`p-3 rounded-2xl ${
        isDark
          ? "bg-blue-500/20 text-blue-400"
          : "bg-blue-600 text-white"
      }`}
    >
      <Box className="w-6 h-6" />
    </div>

    {/* TITLE */}
    <div>
      <h2
        className={`text-2xl font-black uppercase tracking-tight ${
          isDark ? "text-slate-100" : "text-blue-900"
        }`}
      >
        Pellets and Polymer Report
      </h2>
      <p className="text-xs tracking-widest font-bold text-slate-900">
        Pellets & Polymer Usage and Stock Monitoring
      </p>
    </div>
  </div>
</div>

      {/* ================= KPI + FILTER LAYOUT ================= */}
      <div className="flex flex-col lg:flex-row items-stretch gap-4 mb-6">

        {/* KPI CARDS */}
      <div className="flex-1 bg-white rounded-2xl shadow-lg border border-blue-100 p-5">

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  <KPICard
    label="Total Plants"
    value={chartData.length}
    theme={theme.blue}
    icon={<Box />}
    isDark={isDark}
  />

  <KPICard
    label={
      materialType === "pellets"
        ? "Total Pellets Used"
        : "Total Polymer Used"
    }
  value={formatIN(
  materialType === "pellets"
    ? totalPelletsUsed
    : totalPolymerUsed
)}

    unit={materialType === "pellets" ? "Kg" : "grms"}
    theme={theme.emerald}
    icon={<Box />}
    isDark={isDark}
  />

<KPICard
  label="Stock"
  value={formatIN(
    materialType === "pellets"
      ? totalPelletsStock
      : totalPolymerStock
  )}
  unit="Kg"
  theme={theme.indigo}
  icon={<Box />}
  isDark={isDark}
/>


  <KPICard
    label="Average Usage"
    value={formatIN(
      materialType === "pellets" ? avgPellets : avgPolymer
    )}
    unit={materialType === "pellets" ? "Kg" : "grms"}
    theme={theme.amber}
    icon={<Box />}
    isDark={isDark}
  />
</div>

</div>
{/* SORT BY FILTER (Power-style) */}
<div
  className={`w-72 rounded-xl p-4 flex flex-col justify-center
    ${isDark ? "bg-slate-900 border border-slate-800" : "bg-white shadow-md"}
  `}
>
  <label
    className={`text-xs font-semibold mb-1 ${
      isDark ? "text-slate-300" : "text-gray-800"
    }`}
  >
    Select Material 
  </label>

  <select
    value={materialType}
    onChange={(e) => setMaterialType(e.target.value)}
    className={`border p-2 rounded-md text-sm font-semibold outline-none
      ${
        isDark
          ? "bg-slate-800 border-slate-700 text-slate-200"
          : "bg-white border-slate-300"
      }
    `}
  >
    <option value="pellets">Pellets</option>
    <option value="polymer">Polymer</option>
  </select>


</div>


 </div>

      {/* ================= GRAPH ================= */}
    <div className="p-6 rounded-[2rem] border bg-white border-slate-100 shadow-xl">
{/* GRAPH HEADER */}
<div className="flex items-center justify-between mb-3">

  <h3 className="font-bold text-blue-900 text-lg flex items-center gap-3">
    Material Analytics

    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">
      {entryLabel}: {entryCount}
    </span>
  </h3>

</div>

  {/* 🔼 SORT CONTROL */}
<div className="flex justify-end mb-3">
  <div className="flex items-center gap-2">
    <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
      Sort by
    </span>

    <select
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value)}
      className="border rounded-md px-2 py-1 text-xs font-semibold outline-none
                 bg-white border-slate-300 text-slate-700"
    >
      <option value="stock">Stock</option>
      <option value="used">Used</option>
      <option value="plantId">Plant ID</option>
    </select>
  </div>
</div>


  {/* 📊 GRAPH */}
         
  <div className="overflow-x-auto">
    <div style={{ width: chartWidth, minWidth: "100%" }}>
      <ResponsiveContainer width="100%" height={450}>

            <BarChart
               data={sortedChartData}
              margin={{ top: 30, right: 30, left: 70, bottom: 80 }}
              barCategoryGap={30}
            >
              {/* gradient color -----------*/}
              <defs>
                {/* Pellets Gradient */}
                <linearGradient id="pelletsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff6b6b" />
                  <stop offset="100%" stopColor="#c81e1e" />
                </linearGradient>

                {/* Polymer Gradient */}
                <linearGradient id="polymerGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5da9ff" />
                  <stop offset="100%" stopColor="#1e3a8a" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                interval={0}
                height={70}
                tick={({ x, y, payload }) => {
                  const row = sortedChartData.find(
                    (d) => d.label === payload.value
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
    style={{
      cursor: "pointer",
      textDecoration: "underline",
      whiteSpace: "nowrap"
    }}
    onClick={() => {
      if (!row) return;
      navigate(
        `/pellets-view/${row.plantId}/${row.label}?type=${materialType}`
      );
    }}
  >
    {/* ⚠️ BIGGER + BLINKING ALERT ICON (LOW STOCK ONLY) */}
    {stockAlertMap[payload.value] && (
  <tspan
    fill={
      stockAlertMap[payload.value] === "red"
        ? "#dc2626"   // 🔴 red
        : "#f59e0b"   // 🟡 yellow
    }
    fontSize={16}
    fontWeight="bold"
  >
    ⚠
    <animate
      attributeName="opacity"
      values="1;0.3;1"
      dur="1s"
      repeatCount="indefinite"
    />
    {" "}
  </tspan>
)}


    {/* PLANT NAME */}
    <tspan>{payload.value}</tspan>
  </text>
);


                }}
              />

             <YAxis
  label={{
    value:
      sortBy === "used"
        ? materialType === "pellets"
          ? "PELLETS USED (KG)"
          : "POLYMER USED (GRMS)"
        : materialType === "pellets"
        ? "PELLETS STOCK (KG)"
        : "POLYMER STOCK (KG)",
    angle: -90,
    position: "insideLeft",
    dy: 80,
    fontWeight: "bold"
  }}
/>


           <Tooltip
  content={
    <PelletsTooltip
      materialType={materialType}
      sortBy={sortBy}
    />
  }
/>


              <Bar
  dataKey={selectedKey}
fill={
    materialType === "pellets"
      ? "url(#pelletsGradient)"
      : "url(#polymerGradient)"
  }
  barSize={28}
  label={<TopBarLabel />}
/>

            </BarChart>
          </ResponsiveContainer>
        </div>
   
        <p className="text-center text-sm font-bold text-gray-700 mt-3">
          Plants
        </p>
      </div>
          </div>
    </div>
    
  );
}