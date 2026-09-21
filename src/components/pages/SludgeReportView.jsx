import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { getPlantOperationsReport } from "../../services/operationService";

/* ---------------- CONSTANTS ---------------- */
const MIN_DATE = "2025-11-01";
const DAY_SCROLL_THRESHOLD = 40;
const BAR_WIDTH = 40;

/* ---------------- UTILITIES (pure, hoisted — no re-creation per render) ---------------- */
const formatDate = (d) => d.toISOString().split("T")[0];

const subtractDays = (d, days) => {
  const x = new Date(d);
  x.setDate(x.getDate() - days);
  return x;
};

const indianFormatter = new Intl.NumberFormat("en-IN");
const formatIndianNumber = (num) =>
  num === null || num === undefined ? "-" : indianFormatter.format(num);
const formatIndianRounded = (num) =>
  num === null || num === undefined ? "-" : indianFormatter.format(Math.round(num));

const formatDisplayDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

/* ---------------- TOOLTIP ---------------- */
const SludgeTooltip = React.memo(function SludgeTooltip({ active, payload, mode }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-white border shadow-md rounded p-3 text-xs w-56">
      <p className="font-bold text-blue-900">{formatDisplayDate(d.date)}</p>
      {mode === "received" && <p>Received: {formatIndianNumber(d.received)} L</p>}
      {mode === "tank" && <p>Tank Level: {formatIndianNumber(d.tankLevel)} L</p>}
      {mode === "processed" && <p>Processed: {formatIndianNumber(d.processed)} L</p>}
      {mode === "biochar" && (
        <p>Biochar: {d.biochar === null || d.biochar === undefined ? "-" : Number(d.biochar).toFixed(1)} Kg</p>
      )}
    </div>
  );
});

/* ---------------- BAR LABEL ---------------- */
const TopBarLabel = React.memo(function TopBarLabel({ x, y, width, value }) {
  if (value === null || value === undefined) return null;
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
});

const DateTick = React.memo(function DateTick({ x, y, payload }) {
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
});

/* ================= THEME (module-level, never re-created) ================= */
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

const MODES = [
  { key: "received", label: "Received" },
  { key: "processed", label: "Processed" },
  { key: "tank", label: "Tank Level" },
  { key: "biochar", label: "Biochar" },
];
const KPICard = React.memo(function KPICard({
  label,
  value,
  subValue,
  theme,
  icon,
}) {
  return (
    <div
      className={`group relative overflow-hidden p-6 rounded-xl border ${theme.bg} ${theme.border} shadow-sm hover:shadow-md`}
    >
      <div
        className={`absolute bottom-0 left-0 h-1.5 w-full ${theme.barColor} origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}
      />

      <div className="flex flex-col gap-2">
        <div
          className={`p-2 w-fit rounded-lg bg-white shadow-sm ${theme.iconColor}`}
        >
          {icon}
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-900">
            {label}
          </p>

          <p className="text-xl font-black text-slate-900">
            {value}
          </p>

          {subValue && (
            <p className="mt-2 text-xs font-medium text-slate-600">
              {subValue}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});
/* ---------------- MAIN COMPONENT ---------------- */
export default function SludgeReportView() {
  const navigate = useNavigate();
  const { plantId } = useParams();
  const [params] = useSearchParams();
  const urlMode = params.get("mode") || "received";

  const [activeMode, setActiveMode] = useState(urlMode);
  const [daywiseData, setDaywiseData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [plantDetails, setPlantDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  /* -------- DATE RANGE (draft inputs vs. last-fetched range) -------- */
  const [fromDate, setFromDate] = useState(
    formatDate(subtractDays(new Date(), 10))
  );
  const [toDate, setToDate] = useState(formatDate(new Date()));
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Ref tracks the range actually fetched, so an in-flight/stale response
  // can never overwrite state for a range the user has since changed.
  const requestIdRef = useRef(0);

  /* ---------------- FETCH REPORT (only fires on demand) ---------------- */
  const fetchDaywise = useCallback(async () => {
    if (!plantId || !fromDate || !toDate) return;

    const thisRequestId = ++requestIdRef.current;
    setLoading(true);

    try {
      const data = await getPlantOperationsReport(plantId, fromDate, toDate);

      // Ignore results from a superseded request (user clicked GET again
      // before the previous call resolved).
      if (thisRequestId !== requestIdRef.current) return;

      setPlantDetails(data?.plant ?? null);
      setSummary(data?.summary ?? null);

      const mapped = (data?.operations ?? []).map((op) => ({
        date: op.operationDate,
        received: op.sludgeReceived ?? null,
        tankLevel: op.sludgeTankLevelPm ?? op.sludgeTankLevelAm ?? null,
        processed: op.sludgeProcessed ?? null,
        biochar: op.biocharProduced ?? null,
        totalNoOfTrips: op.totalNoOfTrips ?? null,
        noOfTripsPrivateVehicle: op.noOfTripsPrivateVehicle ?? null,
      }));

      setDaywiseData(mapped);
    } catch (err) {
      console.error("Failed to fetch daywise data", err);
      if (thisRequestId !== requestIdRef.current) return;
      setDaywiseData([]);
      setSummary(null);
      setPlantDetails(null);
    } finally {
      if (thisRequestId === requestIdRef.current) setLoading(false);
    }
  }, [fromDate, toDate, plantId]);

  // Fetch once on mount / plant change only — NOT on every date edit.
  useEffect(() => {
    fetchDaywise();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantId]);

  useEffect(() => {
    setActiveMode(urlMode);
  }, [urlMode]);

  const handleFromDateChange = useCallback((e) => {
    const val = e.target.value;
    setFromDate(val < MIN_DATE ? MIN_DATE : val);
  }, []);

  const handleToDateChange = useCallback((e) => {
    setToDate(e.target.value);
  }, []);

  const handleModeChange = useCallback((key) => {
    setActiveMode(key);
  }, []);

  const handleClose = useCallback(() => {
    navigate("/sludge-report");
  }, [navigate]);

  /* ---------------- KPI VALUES (memoized — recompute only when inputs change) ---------------- */


  const totalValue = useMemo(() => {
    switch (activeMode) {
      case "received":
        return summary?.totalSludgeReceived ?? null;
      case "processed":
        return summary?.totalSludgeProcessed ?? null;
      case "biochar":
        return summary?.totalBiocharProduced ?? null;
      default:
        return null;
    }
  }, [activeMode, summary]);

  const avgValue = useMemo(() => {
    switch (activeMode) {
      case "received":
        return summary?.averageSludgeReceived ?? null;
      case "processed":
        return summary?.averageSludgeProcessed ?? null;
      case "biochar":
        return summary?.averageBiocharProduced ?? null;
     
      default:
        return null;
    }
  }, [activeMode, summary, daywiseData.length]);

  /* -------- TANK LEVEL (opening/closing straight from API) -------- */
  const fromTankLevel = summary?.openingTankLevel ?? null;
  const toTankLevel = summary?.closingTankLevel ?? null;
  const fromTankDate = summary?.openingTankLevelDate ?? fromDate;
  const toTankDate = summary?.closingTankLevelDate ?? toDate;

  /* -------- TRIPS (straight from API) -------- */
  const ownVehicleTrips = summary?.totalNoOfTripsOwnVehicle ?? null;
  const privateVehicleTrips = summary?.noOfTripsPrivateVehicle ?? null;
  const totalTrips = useMemo(() => {
    if (ownVehicleTrips === null && privateVehicleTrips === null) return null;
    return (ownVehicleTrips ?? 0) + (privateVehicleTrips ?? 0);
  }, [ownVehicleTrips, privateVehicleTrips]);

  const needsScroll = daywiseData.length > DAY_SCROLL_THRESHOLD;
  const chartWidth = useMemo(
    () => (needsScroll ? daywiseData.length * BAR_WIDTH : "100%"),
    [needsScroll, daywiseData.length]
  );

  const yAxisLabel = useMemo(() => {
    switch (activeMode) {
      case "received":
        return "Sludge Received (L)";
      case "tank":
        return "Tank Level (L)";
      case "processed":
        return "Sludge Processed (L)";
      default:
        return "Biochar Produced (Kg)";
    }
  }, [activeMode]);

  const tooltipContent = useMemo(
    () => <SludgeTooltip mode={activeMode} />,
    [activeMode]
  );

 

  const openingTankCard = {
  label: `Tank Level on ${formatDisplayDate(fromTankDate)}`,
  value: `${formatIndianRounded(fromTankLevel)} L`,
  theme: theme.amber,
  icon: <Box size={18} />,
};

const receivedCard = {
  label: "Sludge Received (L)",
  value: formatIndianRounded(summary?.totalSludgeReceived),
  subValue: `Average : ${formatIndianRounded(summary?.averageSludgeReceived)} L`,
  theme: theme.blue,
  icon: <Layers size={18} />,
};

const vehicleTripsCard = {
  label: "Vehicle Trips Count",
  value: `Own Vehicle Trips : ${formatIndianRounded(ownVehicleTrips)}`,
  subValue: `Private Vehicle Trips : ${formatIndianRounded(privateVehicleTrips)}`,
  theme: theme.indigo,
  icon: <Droplets size={18} />,
};

const totalProcessedCard = {
  label: "Total Sludge Processed (L)",
  value: formatIndianRounded(summary?.totalSludgeProcessed),
  theme: theme.blue,
  icon: <Layers size={18} />,
};

const averageProcessedCard = {
  label: "Average Sludge Processed (L)",
  value: formatIndianRounded(summary?.averageSludgeProcessed),
  theme: theme.indigo,
  icon: <Droplets size={18} />,
};

const processedCard = {
  label: "Sludge Processed (L)",
  value: formatIndianRounded(summary?.totalSludgeProcessed),
  subValue: `Average : ${formatIndianRounded(summary?.averageSludgeProcessed)} L`,
  theme: theme.indigo,
  icon: <Droplets size={18} />,
};

const closingTankCard = {
  label: `Tank Level on ${formatDisplayDate(toTankDate)}`,
  value: `${formatIndianRounded(toTankLevel)} L`,
  theme: theme.emerald,
  icon: <Recycle size={18} />,
};

const totalBiocharCard = {
  label: "Total Biochar Produced (Kg)",
  value: formatIndianRounded(summary?.totalBiocharProduced),
  theme: theme.blue,
  icon: <Layers size={18} />,
};

const averageBiocharCard = {
  label: "Average Biochar Produced (Kg)",
  value: formatIndianRounded(summary?.averageBiocharProduced),
  theme: theme.indigo,
  icon: <Droplets size={18} />,
};
// const cards = (() => {
//   switch (activeMode) {
//     case "received":
//       return [
//         openingTankCard,
//         receivedCard,
//         vehicleTripsCard,
//         closingTankCard,
//       ];

//     case "processed":
//       return [
//         openingTankCard,
//         totalProcessedCard,
//         averageProcessedCard,
//         closingTankCard,
//       ];

//     case "tank":
//       return [
//         openingTankCard,
//         receivedCard,
//         processedCard,
//         closingTankCard,
//       ];

//     case "biochar":
//       return [
//         totalBiocharCard,
//         averageBiocharCard,
//       ];

//     default:
//       return [
//         openingTankCard,
//         receivedCard,
//         vehicleTripsCard,
//         closingTankCard,
//       ];
//   }
// })();

const LABELS = {
  received: ["Total Sludge Received (L)", "Average Sludge Received (L)"],
 
  processed: ["Total Sludge Processed (L)", "Average Sludge Processed (L)"],
  biochar: ["Total Biochar Produced (Kg)", "Average Biochar Produced (Kg)"],
};

 const currentLabels = LABELS[activeMode];

let cards = [];

switch (activeMode) {
  case "received":
    cards = [
      openingTankCard,
      receivedCard,
      vehicleTripsCard,
      closingTankCard,
    ];
    break;

  case "processed":
    cards = [
      openingTankCard,
      totalProcessedCard,
      averageProcessedCard,
      closingTankCard,
    ];
    break;

  case "tank":
    cards = [
      openingTankCard,
      receivedCard,
      processedCard,
      closingTankCard,
    ];
    break;

  case "biochar":
    cards = [
      totalBiocharCard,
      averageBiocharCard,
    ];
    break;

  default:
    cards = [
      openingTankCard,
      receivedCard,
      vehicleTripsCard,
      closingTankCard,
    ];
}


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
        onClick={handleClose}
        className="bg-red-600 text-white px-4 py-1 rounded-lg mb-4"
      >
        Close
      </button>

    <h2 className="text-2xl font-bold text-blue-900 mb-6">
     {MODES.find((m) => m.key === activeMode)?.label}
        <span className="text-2xl font-bold text-blue-900 mb-6">
          -  PID: {plantDetails?.plantId ?? "-"} :{" "}
          {plantDetails?.plantName ?? (loading ? "Loading..." : "-")} :{" "}
          {plantDetails?.kld ?? "-"} KLD
        </span>
      </h2>

      {/* KPI + FILTERS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">

        {/* KPI CARDS SECTION */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg border border-blue-100 p-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {cards.map((card, index) => (
    <KPICard
      key={index}
      label={card.label}
      value={card.value}
      subValue={card.subValue}
      theme={card.theme}
      icon={card.icon}
    />
  ))}
</div>
        </div>

        {/* DATE FILTER SECTION */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-md p-4 flex flex-col justify-center gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-700">From</label>
            <input
              type="date"
              min={MIN_DATE}
              max={today}
              value={fromDate}
              onChange={handleFromDateChange}
              className="border p-2 rounded-md w-full"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">To</label>
            <input
              type="date"
              min={MIN_DATE}
              max={today}
              value={toDate}
              onChange={handleToDateChange}
              className="border p-2 rounded-md w-full"
            />
          </div>

          <button
            onClick={fetchDaywise}
            disabled={loading}
            className="bg-blue-700 text-white py-2 rounded-lg font-semibold hover:bg-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "GET"}
          </button>
        </div>

      </div>

      {/* CHART */}
      <div className="bg-white shadow-xl rounded-xl p-6 w-full">

        {/* 🔄 MODE TOGGLE */}
        <div className="flex justify-end mb-4">
          <div className="flex p-1 rounded-lg bg-slate-100 shadow-sm">
            {MODES.map((item) => (
              <button
                key={item.key}
                onClick={() => handleModeChange(item.key)}
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
                    value: yAxisLabel,
                    angle: -90,
                    position: "insideLeft",
                    offset: -25,
                    dy: 45,
                    fontSize: 12,
                    fontWeight: "bold",
                  }}
                />
                <Tooltip content={tooltipContent} isAnimationActive={false} />

                {activeMode === "received" && (
                  <Bar
                    dataKey="received"
                    fill="#003f8a"
                    barSize={28}
                    label={<TopBarLabel />}
                    isAnimationActive={false}
                  />
                )}
                {activeMode === "tank" && (
                  <Bar
                    dataKey="tankLevel"
                    fill="#6a1b9a"
                    barSize={28}
                    label={<TopBarLabel />}
                    isAnimationActive={false}
                  />
                )}
                {activeMode === "processed" && (
                  <Bar
                    dataKey="processed"
                    fill="#0277bd"
                    barSize={28}
                    label={<TopBarLabel />}
                    isAnimationActive={false}
                  />
                )}
                {activeMode === "biochar" && (
                  <Bar
                    dataKey="biochar"
                    fill="#d84315"
                    barSize={28}
                    label={<TopBarLabel />}
                    isAnimationActive={false}
                  />
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
