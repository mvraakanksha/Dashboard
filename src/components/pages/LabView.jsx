import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getLabOperationsByDateRange } from "../../services/operationService";

import {
  Activity,
  Droplets,
  Thermometer,
  FlaskConical,
  Waves,
} from "lucide-react";

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
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
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

/* ================= DATE HELPERS ================= */
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

const displayDate = (d) => {
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2, "0")}-${String(
    x.getMonth() + 1
  ).padStart(2, "0")}-${x.getFullYear()}`;
};

/* ================= BAR TOP LABEL ================= */
const TopBarLabel = ({ x, y, width, value, mode }) => {
  if (value === null || value === undefined || value === 0) return null;

  const display =
    mode === "temp_ph"
      ? Number(value).toFixed(1)
      : Number(value).toFixed(0);

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
      {display}
    </text>
  );
};

/* ================= TOOLTIP ================= */
const DaywiseTooltip = ({ active, payload, mode }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-white border shadow-md rounded p-3 text-xs">
      <p className="font-bold text-blue-900">{displayDate(d.date)}</p>

      {mode === "flow" && <p>Cumulative Flow: <b>{d.cumulativeFlow}</b> L</p>}

      {mode === "cod_bod" && (
        <>
          <p>COD: <b>{d.cod}</b></p>
          <p>BOD: <b>{d.bod}</b></p>
        </>
      )}

      {mode === "tn_tss" && (
        <>
          <p>TN: <b>{d.tn}</b></p>
          <p>TSS: <b>{d.tss}</b></p>
        </>
      )}

      {mode === "temp_ph" && (
        <>
          <p>Temperature: <b>{d.temperature} °C</b></p>
          <p>pH: <b>{d.ph}</b></p>
        </>
      )}
    </div>
  );
};

/* ================= KPI ================= */
const KPI = ({ label, value }) => (
  <div className="bg-[#013B88] text-white rounded-xl px-6 py-8 text-center shadow-md">
    <p className="text-sm font-medium">{label}</p>
    <h2 className="text-xl font-extrabold text-green-400 mt-2">{value}</h2>
  </div>
);

const getYAxisConfig = (mode) => {
  switch (mode) {
    case "flow":
      return { label: "Cumulative Flow (L)" };
    case "cod_bod":
      return { label: "COD / BOD (mg/L)" };
    case "tn_tss":
      return { label: "TN / TSS (mg/L)" };
    case "temp_ph":
      return { label: "Temperature (°C) / pH" };
    default:
      return { label: "" };
  }
};

/* ================= PAGE ================= */
export default function LabView() {
  const { plantId, plantName } = useParams();
  const navigate = useNavigate();
  const { search } = useLocation();
  const mode = new URLSearchParams(search).get("mode") || "cod_bod";

  const [fromDate, setFromDate] = useState(
    formatDate(subtractDays(new Date(), 10))
  );
  const [toDate, setToDate] = useState(formatDate(new Date()));
  const [daywiseData, setDaywiseData] = useState([]);

const fetchDaywise = async () => {
  try {
    const result = await getLabOperationsByDateRange(fromDate, toDate);

    const map = {};
    result.forEach((r) => {
      if (String(r.plantId) !== String(plantId)) return;
      const d = r.labOperation?.operationDate;
      if (!d) return;

      map[d] = {
        cod: r.labOperation.cod ?? 0,
        bod: r.labOperation.bod ?? 0,
        tn: r.labOperation.tn ?? 0,
        tss: r.labOperation.tss ?? 0,
        ph: r.labOperation.ph ?? 0,
        temperature: r.labOperation.temperature ?? 0,
        cumulativeFlow: r.labOperation.cumulativeFlow ?? 0,
      };
    });

    const orderedDates = getDateRange(fromDate, toDate);
    setDaywiseData(
      orderedDates.map((date) => ({
        date,
        ...map[date],
      }))
    );
  } catch (err) {
    console.error("Failed to fetch lab daywise data", err);
    setDaywiseData([]);
  }
};

useEffect(() => {
  fetchDaywise();
}, [fromDate, toDate, mode]);

  const avg = (k) =>
    daywiseData.length
      ? (
          daywiseData.reduce((s, d) => s + (d[k] || 0), 0) /
          daywiseData.length
        ).toFixed(2)
      : "0.00";

  const DAY_SCROLL_THRESHOLD = 40;
  const BAR_WIDTH = 40;
  const needsScroll = daywiseData.length > DAY_SCROLL_THRESHOLD;
  const chartWidth = needsScroll
    ? daywiseData.length * BAR_WIDTH
    : "100%";

  const yAxisConfig = getYAxisConfig(mode);


  const sum = (k) =>
  daywiseData.length
    ? daywiseData.reduce((s, d) => s + (d[k] || 0), 0).toFixed(2)
    : "0.00";

  return (
    <div className="p-6 bg-[#D9E6FF] min-h-screen">

      <button
        onClick={() => navigate("/lab")}
        className="bg-red-600 text-white px-4 py-1 rounded mb-4"
      >
        Close
      </button>

      <h2 className="text-2xl font-bold text-blue-900 mb-6">
        {decodeURIComponent(plantName)} — Day Wise Trend
      </h2>

      {/* KPI */}
{/* ================= ALL KPIs ================= */}
{/* ================= ALL KPIs ================= */}
<div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-6">

    {/* TOTAL FLOW */}
    <KPICard
      label="Total Flow"
      value={sum("cumulativeFlow")}
      unit="L"
      theme={theme.indigo}
      icon={<Droplets />}
    />

    {/* AVG FLOW */}
    <KPICard
      label="Avg Flow"
      value={avg("cumulativeFlow")}
      unit="L"
      theme={theme.blue}
      icon={<Droplets />}
    />

    {/* COD */}
    <KPICard
      label="Avg COD"
      value={avg("cod")}
      unit="mg/L"
      theme={theme.blue}
      icon={<FlaskConical />}
    />

    {/* BOD */}
    <KPICard
      label="Avg BOD"
      value={avg("bod")}
      unit="mg/L"
      theme={theme.indigo}
      icon={<FlaskConical />}
    />

    {/* TN */}
    <KPICard
      label="Avg TN"
      value={avg("tn")}
      unit="mg/L"
      theme={theme.emerald}
      icon={<Activity />}
    />

    {/* TSS */}
    <KPICard
      label="Avg TSS"
      value={avg("tss")}
      unit="mg/L"
      theme={theme.emerald}
      icon={<Waves />}
    />

    {/* TEMPERATURE */}
    <KPICard
      label="Avg Temp"
      value={avg("temperature")}
      unit="°C"
      theme={theme.amber}
      icon={<Thermometer />}
    />

    {/* pH */}
    <KPICard
      label="Avg pH"
      value={avg("ph")}
      theme={theme.amber}
      icon={<Thermometer />}
    />

  </div>
</div>




      {/* FILTER */}
      <div className="bg-white rounded-xl shadow p-4 flex gap-4 mb-6">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button onClick={fetchDaywise} className="bg-blue-700 text-white px-6 rounded">
          GET
        </button>
      </div>

      {/* CHART */}
      <div className="bg-white rounded-xl shadow-xl p-6">
        <div className={needsScroll ? "overflow-x-auto" : ""}>
          <div style={{ width: chartWidth, height: 420 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={daywiseData}
                margin={{ top: 40, right: 30, left: 70, bottom: 90 }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="date"
                  interval={0}
                  angle={-45}
                  height={80}
                  textAnchor="end"
                  tickFormatter={displayDate}
                  tick={{ fontSize: 11, fill: "#003f8a", fontWeight: 600 }}
                />

                <YAxis
                  label={{
                    value: yAxisConfig.label,
                    angle: -90,
                    position: "insideLeft",
                    dy: 70,
                    style: { fill: "#1E3A8A", fontSize: 14, fontWeight: 600 },
                  }}
                />

                <Tooltip content={<DaywiseTooltip mode={mode} />} />

                {mode === "flow" && (
                  <Bar
                    dataKey="cumulativeFlow"
                    fill="#2E7D32"
                    barSize={28}
                    label={<TopBarLabel mode={mode} />}
                  />
                )}

                {mode === "cod_bod" && (
                  <>
                    <Bar dataKey="cod" fill="#6AA6FF" barSize={28} label={<TopBarLabel mode={mode} />} />
                    <Bar dataKey="bod" fill="#0047B3" barSize={28} label={<TopBarLabel mode={mode} />} />
                  </>
                )}

                {mode === "tn_tss" && (
                  <>
                    <Bar dataKey="tn" fill="#885caf" barSize={28} label={<TopBarLabel mode={mode} />} />
                    <Bar dataKey="tss" fill="#1a9cb3" barSize={28} label={<TopBarLabel mode={mode} />} />
                  </>
                )}

                {mode === "temp_ph" && (
                  <>
                    <Bar dataKey="temperature" fill="#FF9800" barSize={28} label={<TopBarLabel mode={mode} />} />
                    <Bar dataKey="ph" fill="#9C27B0" barSize={28} label={<TopBarLabel mode={mode} />} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <p className="text-center text-lg font-bold text-gray-700 mt-3">
          Dates
        </p>
      </div>
    </div>
  );
}

