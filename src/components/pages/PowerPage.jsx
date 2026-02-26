import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
  ResponsiveContainer
} from "recharts";
import { Zap } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { getPlantById } from "../../services/plantService";
import { getOperationsByDateRange } from "../../services/operationService";

/* ---------------- UTILS ---------------- */
const formatDate = (d) => d.toISOString().split("T")[0];
const subtractDays = (d, days) => {
  const x = new Date(d);
  x.setDate(x.getDate() - days);
  return x;
};
const rd = (v) => Number(v || 0).toFixed(2);

/* ---------------- BAR LABELS ---------------- */
const ImportLabel = ({ x, y, width, value }) =>
  value > 0 ? (
    <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="#af0000" fontSize={11} fontWeight={700}>
      {rd(value)}
    </text>
  ) : null;

const ExportLabel = ({ x, y, width, value }) =>
  value > 0 ? (
    <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="#1B5E20" fontSize={11} fontWeight={700}>
      {rd(value)}
    </text>
  ) : null;

const RunHourLabel = ({ x, y, width, value }) =>
  value > 0 ? (
    <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="#1E40AF" fontSize={11} fontWeight={700}>
      {rd(value)}
    </text>
  ) : null;

const formatDisplayDate = (dateString) => {
  if (!dateString) return "-";

  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
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


/* ---------------- TOOLTIP ---------------- */
const PowerTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-white border shadow-md rounded p-3 text-xs w-64">
      <p className="font-bold text-blue-900">{formatDisplayDate(d.date)}</p>
      <p className="mt-2 text-red-700">Power Consumption: {rd(d.importPower)} Kwh</p>
      {d.exportPower > 0 && (
        <p className="mt-1 text-green-700">Solar Power Generated: {rd(d.exportPower)} Kwh</p>
      )}
      {d.runHours > 0 && (
        <p className="mt-1 text-blue-700">Plant Run Hours: {rd(d.runHours)} Hrs</p>
      )}
    </div>
  );
};
/* ---------------- THEME ---------------- */
const theme = {
  blue: { bg: "bg-blue-50", border: "border-blue-100", barColor: "bg-blue-600", iconColor: "text-blue-600" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-100", barColor: "bg-emerald-600", iconColor: "text-emerald-600" },
  rose: { bg: "bg-rose-50", border: "border-rose-100", barColor: "bg-rose-600", iconColor: "text-rose-600" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-100", barColor: "bg-indigo-600", iconColor: "text-indigo-600" },
};
/* ---------------- KPI CARD ---------------- */
const KPICard = ({ label, value, theme, children }) => (
  <div className={`group relative overflow-hidden p-6 min-h-[180px] rounded-xl border ${theme.bg} ${theme.border} shadow-sm hover:shadow-md flex flex-col justify-between`}>

    <div className={`absolute bottom-0 left-0 h-1.5 w-full ${theme.barColor} origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />

    <div>
      <div className={`p-2 w-fit rounded-lg bg-white shadow-sm ${theme.iconColor}`}>
        <Zap size={18} />
      </div>

      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mt-3">
        {label}
      </p>

      <p className="text-2xl font-black text-slate-900 mt-1">
        {value}
      </p>
    </div>

    {children && (
      <div className="text-sm font-semibold text-slate-600 mt-3">
        {children}
      </div>
    )}
  </div>
);

/* ================= PAGE ================= */
export default function PowerPage() {
  const navigate = useNavigate();
  const { plantId } = useParams();

  const [plant, setPlant] = useState(null);
  const [fromDate, setFromDate] = useState(formatDate(subtractDays(new Date(), 10)));
  const [toDate, setToDate] = useState(formatDate(new Date()));
  const [data, setData] = useState([]);
  const [anySolarExists, setAnySolarExists] = useState(false);

  /* ---------- FETCH PLANT BY ID ---------- */
  useEffect(() => {
    const loadPlant = async () => {
      try {
        const p = await getPlantById(plantId);
        setPlant(p || null);
      } catch (err) {
        console.error("Failed to fetch plant", err);
      }
    };
    loadPlant();
  }, [plantId]);

  /* ---------- FETCH RANGE ---------- */
  const fetchRange = async () => {
    try {
      const res = await getOperationsByDateRange(fromDate, toDate);

      const map = {};
      res.forEach((item) => {
        if (String(item.plantId) === String(plantId)) {
          map[item.operation.operationDate] = item.operation;
        }
      });

      const arr = [];
      let d = new Date(fromDate);
      const end = new Date(toDate);

      while (d <= end) {
        const date = formatDate(d);
        const op = map[date];

        const importPower =
          op?.powerReadingPmImport != null && op?.powerReadingAmImport != null
            ? Math.max(op.powerReadingPmImport - op.powerReadingAmImport, 0)
            : 0;

        const exportPower =
          op?.powerReadingPmExport != null && op?.powerReadingAmExport != null
            ? Math.max(op.powerReadingPmExport - op.powerReadingAmExport, 0)
            : 0;

        const runHours = op?.plantRunningHrs ?? 0;

        arr.push({ date, importPower, exportPower, runHours });
        d.setDate(d.getDate() + 1);
      }

      setData(arr);
      setAnySolarExists(arr.some((d) => d.exportPower > 0));
    } catch (err) {
      console.error("Failed to fetch power range", err);
      setData([]);
    }
  };

  useEffect(() => {
    fetchRange();
  }, [plantId]);

  /* ---------- KPI CALCS ---------- */
  const totalImport = data.reduce((s, d) => s + d.importPower, 0);
  const totalExport = data.reduce((s, d) => s + d.exportPower, 0);
  const avgImport = data.length ? totalImport / data.length : 0;
  const avgExport = data.length ? totalExport / data.length : 0;
  const totalRunHours = data.reduce((s, d) => s + d.runHours, 0);
  const avgRunHours = data.length ? totalRunHours / data.length : 0;

  /* ---------- GRAPH WIDTH ---------- */
  const BAR_WIDTH = 80;
  const MIN_CHART_WIDTH = 1100;
  const computedWidth = Math.max(data.length * BAR_WIDTH, MIN_CHART_WIDTH);
  const enableScroll = data.length * BAR_WIDTH > MIN_CHART_WIDTH;
  /* ================= RENDER ================= */
  return (

    <div className="p-6 bg-[#D9E6FF] min-h-screen">
        <div className="text-center mb-6">
        <h2  className="text-2xl font-bold text-blue-900 text-center mb-4 tracking-wide"
  style={{ fontFamily: '"Times New Roman", Times, serif' }}>Power Consumption and Solar Generation Overview</h2>
      </div>
      <button onClick={() => navigate("/power")} className="bg-red-600 text-white px-4 py-1 rounded mb-4">
        Close
      </button>

         <h2 className="text-2xl font-bold text-blue-900 mb-6">
        Power Trend – {plant?.plantName ?? "Loading..."} (PID: {plantId} – {plant?.kld ?? "-"} KLD)
      </h2>

    {/* KPI + DATE RANGE */}
<div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">

  {/* KPI CARDS */}
  <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg border border-blue-100 p-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

      <KPICard
        label="Total Power Consumption (Kwh)"
        value={rd(totalImport)}
        theme={theme.blue}
      />

      <KPICard
        label="Total Solar Power Generated (Kwh)"
        value={rd(totalExport)}
        theme={theme.emerald}
      />

      <KPICard
        label="Average Power Consumption (Kwh)"
        value={rd(avgImport)}
        theme={theme.rose}
      />

      <KPICard
        label="Average Solar Power Generated (Kwh)"
        value={rd(avgExport)}
        theme={theme.emerald}
      />

      <KPICard
        label="Total Plant Run Hours"
        value={rd(totalRunHours)}
        theme={theme.blue}
      >
        Average: {avgRunHours.toFixed(2)} Hrs
      </KPICard>

    </div>
  </div>

  {/* DATE FILTER */}
  <div className="bg-white rounded-xl shadow-md p-4 space-y-3">
    <label className="text-xs font-semibold">From</label>
    <input
      type="date"
      value={fromDate}
      onChange={(e) => setFromDate(e.target.value)}
      className="border p-2 rounded w-full"
    />

    <label className="text-xs font-semibold">To</label>
    <input
      type="date"
      value={toDate}
      onChange={(e) => setToDate(e.target.value)}
      className="border p-2 rounded w-full"
    />

    <button
      onClick={fetchRange}
      className="bg-violet-600 text-white py-2 rounded font-semibold w-full hover:bg-violet-700 transition"
    >
      GET
    </button>
  </div>

</div>

      {/* GRAPH */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className={enableScroll ? "overflow-x-auto" : ""}>
          <div style={{ width: enableScroll ? computedWidth : "100%", height: 420 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 30, right: 30, left: 60, bottom: 80 }} barCategoryGap={20}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
  dataKey="date"
  interval={0}
  height={80}
  tick={<DateTick />}
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

                <Bar dataKey="importPower" fill="#af0000" barSize={18}>
                  <LabelList content={<ImportLabel />} />
                </Bar>

                {anySolarExists && (
                  <Bar dataKey="exportPower" fill="#1B5E20" barSize={18}>
                    <LabelList content={<ExportLabel />} />
                  </Bar>
                )}

                {/* ✅ RUN HOURS BAR */}
                <Bar dataKey="runHours" fill="#1E40AF" barSize={18}>
                  <LabelList content={<RunHourLabel />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LEGEND */}
        <div className="flex justify-center gap-6 mt-4 font-bold text-sm">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#1B5E20] rounded" />
            Solar Power Generated (Kwh)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#af0000] rounded" />
            Power Consumption (Kwh)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#1E40AF] rounded" />
            Plant Run Hours
          </div>
        </div>

        <p className="text-center text-sm font-bold mt-4">Dates</p>
      </div>
    </div>
  );
}
