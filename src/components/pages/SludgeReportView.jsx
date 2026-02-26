import React, { useState, useEffect, useCallback  } from "react";
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
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import { Layers, Droplets, Recycle, Box } from "lucide-react";
import { getOperationsByDateRange } from "../../services/operationService";
import { getPlantById } from "../../services/plantService";

/* ---------------- UTILITIES ---------------- */
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

const formatIndianNumber = (num) =>
  new Intl.NumberFormat("en-IN").format(num);

/* ---------------- TOOLTIP ---------------- */
const SludgeTooltip = ({ active, payload, mode }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-white border shadow-md rounded p-3 text-xs w-56">
      <p className="font-bold text-blue-900">{formatDisplayDate(d.date)}</p>
      {mode === "received" && <p>Received: {formatIndianNumber(d.received)} L</p>}
      {mode === "tank" && <p>Tank Level: {formatIndianNumber(d.tankLevel)} L</p>}
      {mode === "processed" && <p>Processed: {formatIndianNumber(d.processed)} L</p>}
      {mode === "biochar" && <p>Biochar: {Number(d.biochar).toFixed(1)} Kg</p>}
    </div>
  );
};

/* ---------------- BAR LABEL ---------------- */
const TopBarLabel = ({ x, y, width, value }) => {
  if (value == null) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fill="#003f8a"
      fontSize={11}
      fontWeight={700}
    >
      {formatIndianNumber(value)}
    </text>
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

const formatDisplayDate = (dateString) => {
  if (!dateString) return "-";

  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};
/* ================= THEME ================= */
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
const KPICard = ({ label, value, theme, icon }) => (
  <div className={`group relative overflow-hidden p-6 rounded-xl border ${theme.bg} ${theme.border} shadow-sm hover:shadow-md`}>
    
    <div className={`absolute bottom-0 left-0 h-1.5 w-full ${theme.barColor} origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />

    <div className="flex flex-col gap-2">
      <div className={`p-2 w-fit rounded-lg bg-white shadow-sm ${theme.iconColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="text-xl font-black text-slate-900">
          {value}
        </p>
      </div>
    </div>
  </div>
);
/* ---------------- MAIN COMPONENT ---------------- */
export default function SludgeReportView() {
  const navigate = useNavigate();
  const { plantId } = useParams();
  const [params] = useSearchParams();
  const urlMode = params.get("mode") || "received";
const [activeMode, setActiveMode] = useState(urlMode);
const [allTankData, setAllTankData] = useState([]);

  /* -------- PLANT DETAILS -------- */
  const [plantDetails, setPlantDetails] = useState(null);

  /* -------- DATE RANGE -------- */
  const [fromDate, setFromDate] = useState(
    formatDate(subtractDays(new Date(), 10))
  );
  const [toDate, setToDate] = useState(formatDate(new Date()));
  const [daywiseData, setDaywiseData] = useState([]);

  /* ---------------- FETCH PLANT DETAILS ---------------- */
  useEffect(() => {
    const fetchPlant = async () => {
      try {
        const plant = await getPlantById(plantId);
        setPlantDetails(plant);
      } catch (err) {
        console.error("Failed to fetch plant details", err);
        setPlantDetails(null);
      }
    };

    fetchPlant();
  }, [plantId]);

  /* ---------------- FETCH DAYWISE DATA ---------------- */
const fetchDaywise = useCallback(async () => {
  try {
    const extendedFromDate = formatDate(
      subtractDays(new Date(fromDate), 30)
    );

    const result = await getOperationsByDateRange(
      extendedFromDate,
      toDate
    );

    // 1️⃣ Build map FIRST
    const map = {};
    result.forEach((item) => {
      if (String(item.plantId) === String(plantId)) {
        map[item.operation.operationDate] = item.operation;
      }
    });

    // 2️⃣ Build full tank dataset (for fallback logic)
    const fullData = getDateRange(
      extendedFromDate,
      toDate
    ).map((date) => {
      const op = map[date];
      return {
        date,
        tankLevel:
          op?.sludgeTankLevelPm ??
          op?.sludgeTankLevelAm ??
          null,
      };
    });

    // 3️⃣ Build chart dataset (only selected range)
    const finalData = getDateRange(
      fromDate,
      toDate
    ).map((date) => {
      const op = map[date];
      return {
        date,
        received: op?.sludgeReceived ?? 0,
        tankLevel:
          op?.sludgeTankLevelPm ??
          op?.sludgeTankLevelAm ??
          null,
        processed: op?.sludgeProcessed ?? 0,
        biochar: op?.biocharProduced ?? 0,
      };
    });

    // 4️⃣ Set states
    setAllTankData(fullData);
    setDaywiseData(finalData);

  } catch (err) {
    console.error("Failed to fetch daywise data", err);
    setDaywiseData([]);
  }
}, [fromDate, toDate, plantId]);

useEffect(() => {
  fetchDaywise();
}, [fetchDaywise]);

useEffect(() => {
  setActiveMode(urlMode);
}, [urlMode]);

  /* ---------------- KPI CALCULATIONS ---------------- */
  const totalValue = daywiseData.reduce((sum, d) => {
    switch (activeMode) {
      case "received":
        return sum + d.received;
      case "tank":
        return sum + d.tankLevel;
      case "processed":
        return sum + d.processed;
      case "biochar":
        return sum + d.biochar;
      default:
        return sum;
    }
  }, 0);
/* -------- TANK LEVEL (FROM / TO DATE) -------- */
/* -------- UNIVERSAL BACKWARD CARRY TANK LOGIC -------- */
const getLastAvailableTankLevel = (targetDate) => {
  if (!allTankData.length) return 0;

  const sortedData = [...allTankData].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  for (let i = sortedData.length - 1; i >= 0; i--) {
    if (
      new Date(sortedData[i].date) <= new Date(targetDate) &&
      sortedData[i].tankLevel !== null &&
      sortedData[i].tankLevel !== undefined
    ) {
      return sortedData[i].tankLevel;
    }
  }

  return 0;
};


const fromTankLevel = getLastAvailableTankLevel(fromDate);
const toTankLevel = getLastAvailableTankLevel(toDate);

  const avgValue =
    daywiseData.length > 0 ? totalValue / daywiseData.length : 0;

  const labels = {
    received: ["Total Sludge Received (L)", "Average Sludge Received (L)"],
    tank: ["Total Tank Level (L)", "Average Tank Level (L)"],
    processed: ["Total Sludge Processed (L)", "Average Sludge Processed (L)"],
    biochar: ["Total Biochar Produced (Kg)", "Average Biochar Produced (Kg)"],
  };

  const DAY_SCROLL_THRESHOLD = 40;
  const BAR_WIDTH = 40;

  const needsScroll = daywiseData.length > DAY_SCROLL_THRESHOLD;
  const chartWidth = needsScroll ? daywiseData.length * BAR_WIDTH : "100%";

  const formatIndianRounded = (num) =>
    new Intl.NumberFormat("en-IN").format(Math.round(num || 0));

  /* ---------------- UI ---------------- */
  return (
    <div className="p-6 bg-[#D9E6FF] min-h-screen">
      <h2
        className="text-2xl font-bold text-blue-900 text-center mb-4 tracking-wide"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        Sludge Report
      </h2>

      <button
        onClick={() => navigate("/sludge-report")}
        className="bg-red-600 text-white px-4 py-1 rounded-lg mb-4"
      >
        Close
      </button>

      <h2 className="text-2xl font-bold text-blue-900 mb-6">
        {labels[activeMode][0]}
        <span className="text-2xl font-bold text-blue-900 mb-6">
          -  PID: {plantDetails?.plantID ?? "-"} :{" "}
          {plantDetails?.plantName ?? "Loading..."} :{" "}
          {plantDetails?.kld ?? "-"} KLD
        </span>
      </h2>

    {/* KPI + FILTERS */}
<div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">

  {/* KPI CARDS SECTION */}
  <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg border border-blue-100 p-10">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

      {/* TOTAL */}
      <KPICard
        label={labels[activeMode][0]}
        value={formatIndianRounded(totalValue)}
        theme={theme.blue}
        icon={<Layers size={18} />}
      />

      {/* AVERAGE */}
      <KPICard
        label={labels[activeMode][1]}
        value={formatIndianRounded(avgValue)}
        theme={theme.indigo}
        icon={<Droplets size={18} />}
      />

      {/* EXTRA TANK CARDS (ONLY WHEN NOT BIOCHAR) */}
      {activeMode !== "biochar" && (
        <>
          <KPICard
            label={`Tank Level on ${formatDisplayDate(fromDate)}`}
            value={`${formatIndianRounded(fromTankLevel)} L`}
            theme={theme.amber}
            icon={<Box size={18} />}
          />

          <KPICard
            label={`Tank Level on ${formatDisplayDate(toDate)}`}
            value={`${formatIndianRounded(toTankLevel)} L`}
            theme={theme.emerald}
            icon={<Recycle size={18} />}
          />
        </>
      )}

    </div>
  </div>

  {/* DATE FILTER SECTION (UNCHANGED) */}
  <div className="lg:col-span-1 bg-white rounded-xl shadow-md p-4 flex flex-col justify-center gap-3">
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
      onClick={fetchDaywise}
      className="bg-blue-700 text-white py-2 rounded-lg font-semibold hover:bg-blue-800 transition"
    >
      GET
    </button>
  </div>

</div>

      {/* CHART (UNCHANGED) */}
      <div className="bg-white shadow-xl rounded-xl p-6 w-full">

              
{/* 🔄 MODE TOGGLE */}
<div className="flex justify-end mb-4">
  <div className="flex p-1 rounded-lg bg-slate-100 shadow-sm">
    {[
      { key: "received", label: "Received" },
      { key: "processed", label: "Processed" },
      { key: "tank", label: "Tank Level" },
      { key: "biochar", label: "Biochar" },
    ].map((item) => (
      <button
        key={item.key}
        onClick={() => setActiveMode(item.key)}
        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
          activeMode === item.key
            ? "bg-white text-emerald-600 shadow-sm"
            : "text-slate-500"
        }`}
      >
        {item.label}
      </button>
    ))}
  </div>
</div>

        <div className={needsScroll ? "overflow-x-auto" : ""}>
          <div style={{ width: chartWidth, height: 420 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={daywiseData}
                margin={{ top: 20, right: 30, left: 60, bottom: 90 }}
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
                  tickFormatter={formatIndianRounded}
                  label={{
                    value:
                      activeMode === "received"
                        ? "Sludge Received (L)"
                        : activeMode === "tank"
                        ? "Tank Level (L)"
                        : activeMode === "processed"
                        ? "Sludge Processed (L)"
                        : "Biochar Produced (Kg)",
                    angle: -90,
                    position: "insideLeft",
                    offset: -25,
                    dy: 45,
                    fontSize: 12,
                    fontWeight: "bold",
                  }}
                />
                <Tooltip content={<SludgeTooltip mode={activeMode} />} />

                {activeMode === "received" && (
                  <Bar dataKey="received" fill="#003f8a" barSize={28} label={<TopBarLabel />} />
                )}
                {activeMode === "tank" && (
                  <Bar dataKey="tankLevel" fill="#6a1b9a" barSize={28} label={<TopBarLabel />} />
                )}
                {activeMode === "processed" && (
                  <Bar dataKey="processed" fill="#0277bd" barSize={28} label={<TopBarLabel />} />
                )}
                {activeMode === "biochar" && (
                  <Bar dataKey="biochar" fill="#d84315" barSize={28} label={<TopBarLabel />} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="text-center text-sm font-bold text-gray-800 mt-2">Dates</p>
      </div>
    </div>
  );
}