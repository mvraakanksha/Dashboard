import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid
} from "recharts";
import { Box } from "lucide-react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getAllPlants } from "../../services/plantService";
import { getOperationsByDateRange } from "../../services/operationService";

const formatIN = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Number(value));
};

// ---------------- UTIL FUNCTIONS ----------------
const formatDate = (d) => d.toISOString().split("T")[0];

const subtractDays = (d, days) => {
  const x = new Date(d);
  x.setDate(x.getDate() - days);
  return x;
};

const getDateRange = (from, to) => {
  const arr = [];
  let d = new Date(from);
  const e = new Date(to);
  while (d <= e) {
    arr.push(formatDate(d));
    d.setDate(d.getDate() + 1);
  }
  return arr;
};


const formatDisplayDate = (dateString) => {
  if (!dateString) return "-";

  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};


// ---------------- TOOLTIP ----------------
const DaywiseTooltip = ({ active, payload, materialType }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-white border shadow-md rounded p-3 text-xs w-52">
      <p className="font-bold text-blue-900">{formatDisplayDate(d.date)}</p>

      {materialType === "pellets" ? (
        <>
          <p>Pellets Usage: {d.usage} Kg</p>
          <p>Pellets Stock: {d.stock} Kg</p>
        </>
      ) : (
        <>
          <p>Polymer Usage: {d.usage} grms</p>
          <p>Polymer Stock: {d.stock} Kg</p>
        </>
      )}
    </div>
  );
};
const DateTick = ({ x, y, payload }) => {
  if (!payload?.value) return null;

  return (
    <text
      x={x}
      y={y + 10}
      textAnchor="end"
      fill="#003f8a"
      fontSize={11}
      fontWeight={600}
      transform={`rotate(-45 ${x} ${y + 10})`}
    >
      {formatDisplayDate(payload.value)}
    </text>
  );
};
/* ---------------- THEME ---------------- */
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

/* ---------------- KPI CARD ---------------- */
const KPICard = ({ label, value, theme }) => (
  <div
    className={`group relative overflow-hidden p-6 min-h-[180px] rounded-xl border ${theme.bg} ${theme.border} shadow-sm hover:shadow-md flex flex-col justify-center`}
  >
    <div
      className={`absolute bottom-0 left-0 h-1.5 w-full ${theme.barColor} origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}
    />

    <div className="flex flex-col gap-3">
      <div
        className={`p-2 w-fit rounded-lg bg-white shadow-sm ${theme.iconColor}`}
      >
        <Box size={18} />
      </div>

      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="text-2xl font-black text-slate-900 mt-1">
          {value}
        </p>
      </div>
    </div>
  </div>
);
// ---------------- MAIN COMPONENT ----------------
export default function PelletsPage() {
  const navigate = useNavigate();
  const { plantId, plantName } = useParams();
const [materialType, setMaterialType] = useState("pellets");

  const [fromDate, setFromDate] = useState(
    formatDate(subtractDays(new Date(), 10))
  );
  const [toDate, setToDate] = useState(formatDate(new Date()));
  const [daywiseData, setDaywiseData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [plantInfo, setPlantInfo] = useState(null);

  // ---------------- FETCH PLANT INFO ----------------
useEffect(() => {
  const loadPlant = async () => {
    try {
      const list = await getAllPlants();
      const found = list.find(
        (p) => String(p.plantID) === String(plantId)
      );
      setPlantInfo(found || null);
    } catch (err) {
      console.error("Failed to fetch plant info", err);
      setPlantInfo(null);
    }
  };

  loadPlant();
}, [plantId]);


  // ---------------- FETCH DAYWISE DATA ----------------
const fetchDaywise = async (from, to) => {
  setLoading(true);

  try {
    const result = await getOperationsByDateRange(from, to);

    const opsMap = {};
    result.forEach((item) => {
      if (String(item.plantId) === String(plantId)) {
        opsMap[item.operation.operationDate] = item.operation;
      }
    });

    const orderedDates = getDateRange(from, to);

    const processed = orderedDates.map((date) => {
      const op = opsMap[date];

      return {
        date,
        usage:
          materialType === "pellets"
            ? op?.pillets ?? 0 
            : op?.polymerUsage ?? 0,   // grams (as-is)

       stock:
          materialType === "pellets"
            ? op?.pilletsStock ?? null
            : op?.polymerStock ?? null // already Kg
      };
    });

    setDaywiseData(processed);
  } catch (err) {
    console.error("Failed to fetch daywise data", err);
    setDaywiseData([]);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchDaywise(fromDate, toDate);
}, [materialType]);

  /* ---------------- TOP BAR LABEL ---------------- */
const TopBarLabel = ({ x, y, width, value }) => {
  if (value === null || value === undefined) return null;

  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fill="#003f8a"
      fontSize={11}
      fontWeight={700}
      pointerEvents="none"
    >
      {Number(value).toFixed(1)}
    </text>
  );
};

/* ---------------- KPI CALCULATIONS ---------------- */
const totalUsage = daywiseData.reduce((s, d) => s + d.usage, 0);
const totalStock =
  daywiseData.length > 0
    ? [...daywiseData]
        .reverse()
        .find((d) => d.stock !== null && d.stock !== undefined)?.stock ?? 0
    : 0;


const selectedDays =
  fromDate && toDate
    ? Math.floor(
        (new Date(toDate) - new Date(fromDate)) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 1;

const avgUsage =
  selectedDays > 0 ? totalUsage / selectedDays : 0;

/* ---------------- SCROLL LOGIC ---------------- */
const DAY_SCROLL_THRESHOLD = 40; // show scrollbar after 40 days
const BAR_WIDTH = 40;           // px per day

const needsScroll = daywiseData.length > DAY_SCROLL_THRESHOLD;

const chartWidth = needsScroll
  ? daywiseData.length * BAR_WIDTH
  : "100%";


  return (
 
  <div className="p-6 bg-[#D9E6FF] min-h-screen">
 <h2
  className="text-2xl font-bold text-blue-900 text-center mb-4 tracking-wide"
  style={{ fontFamily: '"Times New Roman", Times, serif' }}
>
  Pellets, Polymer Usage & Stock Status
</h2>

    {/* CLOSE */}
    <button
      onClick={() => navigate("/pellets")}
      className="bg-red-600 text-white px-4 py-1 rounded mb-4"
    >
      Close
    </button>

    {/* TITLE */}
    <h2 className="text-2xl font-bold text-blue-900 mb-6">
      {materialType === "pellets"
        ? `Pellets Usage – ${plantName}`
        : `Polymer Usage – ${plantName}`}
      {plantInfo && (
        <span className="text-gray-700 text-lg font-semibold">
          {" "} (PID: {plantInfo.plantID} – KLD: {plantInfo.kld})
        </span>
      )}
    </h2>

   {/* KPI + FILTERS */}
<div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">

  {/* KPI CARDS */}
  <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg border border-blue-100 p-6">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

      <KPICard
        label={
          materialType === "pellets"
            ? "Total Pellets Used (Kg)"
            : "Total Polymer Used (grms)"
        }
        value={formatIN(totalUsage.toFixed(1))}
        theme={theme.blue}
      />

      <KPICard
        label={
          materialType === "pellets"
            ? "Total Pellets Stock (Kg)"
            : "Total Polymer Stock (Kg)"
        }
        value={formatIN(totalStock.toFixed(1))}
        theme={theme.indigo}
      />

      <KPICard
        label={
          materialType === "pellets"
            ? "Average Pellets Used (Kg)"
            : "Average Polymer Used (Kg)"
        }
        value={formatIN(avgUsage.toFixed(1))}
        theme={theme.emerald}
      />

    </div>
  </div>

  {/* FILTERS */}
  <div className="lg:col-span-1 bg-white rounded-xl shadow-md p-4 flex flex-col gap-3 justify-center">
    <div>
      <label className="text-xs font-semibold text-gray-700">From</label>
      <input
        type="date"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
        className="border p-2 rounded-md w-full"
      />
    </div>

    <div>
      <label className="text-xs font-semibold text-gray-700">To</label>
      <input
        type="date"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
        className="border p-2 rounded-md w-full"
      />
    </div>

    <button
      onClick={() => fetchDaywise(fromDate, toDate)}
      className="bg-blue-700 text-white py-2 rounded-lg font-semibold hover:bg-blue-800 transition"
    >
      GET
    </button>
  </div>

</div>

    {/* BAR GRAPH */}
    <div className="bg-white rounded-xl shadow-xl p-6 w-full">

<div className="flex justify-end mb-4">
  <button
    onClick={() => setMaterialType("pellets")}
    className={`px-4 py-1.5 text-xs font-bold rounded-md transition
      ${materialType === "pellets"
        ? "bg-blue-700 text-white shadow"
        : "text-slate-600 hover:bg-white"}
    `}
  >
    Pellets
  </button>

  <button
    onClick={() => setMaterialType("polymer")}
    className={`px-4 py-1.5 text-xs font-bold rounded-md transition
      ${materialType === "polymer"
        ? "bg-blue-700 text-white shadow"
        : "text-slate-600 hover:bg-white"}
    `}
  >
    Polymer
  </button>

</div>

     <div className={needsScroll ? "overflow-x-auto" : ""}>
  <div
    style={{
      width: chartWidth,
      height: 420,
    }}
  >
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={daywiseData}
        margin={{ top: 40, right: 30, left: 70, bottom: 90 }}
        barCategoryGap={20}
      >
        <CartesianGrid strokeDasharray="3 3" />

     <XAxis
  dataKey="date"
  interval={0}
  height={80}
  tick={<DateTick />}
/>

        <YAxis
          label={{
            value:
              materialType === "pellets"
                ? "Pellets (Kg)"
                : "Polymer (grms)",
            angle: -90,
            position: "insideLeft",
            dy: 50,
            fontWeight: "bold",
          }}
        />

        <Tooltip content={<DaywiseTooltip materialType={materialType} />} />

        <Bar
          dataKey="usage"
          fill="#FF6B6B"
          barSize={28}
          name="Usage"
          label={<TopBarLabel />}
        />

        <Bar
          dataKey="stock"
          fill="#5DA9FF"
          barSize={28}
          name="Stock"
          label={<TopBarLabel />}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>


      {/* LEGEND */}
      <div className="flex items-center justify-center gap-6 mt-4 text-[13px] font-semibold text-[#003f8a]">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#FF6B6B] rounded-sm" />
          Usage
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#5DA9FF] rounded-sm" />
          Stock
        </span>
      </div>

      <p className="text-center text-lg font-bold text-gray-700 mt-3">
        Dates
      </p>
    </div>

  </div>

  );
}


