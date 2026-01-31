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

/* ---------------- TOOLTIP ---------------- */
const PowerTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-white border shadow-md rounded p-3 text-xs w-64">
      <p className="font-bold text-blue-900">{d.date}</p>
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
      <div className="flex items-stretch gap-4 mb-6">
        <div className="flex-1 bg-white rounded-2xl shadow p-4 grid grid-cols-5 gap-4">
          {[
            ["Total Power Consumption (Kwh)", rd(totalImport)],
            ["Total Solar Power Generated (Kwh)", rd(totalExport)],
            ["Average Power Consumption (Kwh)", rd(avgImport)],
            ["Average Solar Power Generated (Kwh)", rd(avgExport)]
          ].map(([label, value], i) => (
            <div key={i} className="bg-[#013B88] rounded-xl flex flex-col justify-center items-center text-white py-3">
              <p className="text-sm text-center">{label}</p>
              <p className="text-2xl font-extrabold text-green-400 mt-1">{value}</p>
            </div>
          ))}

          {/* ✅ RUN HOURS KPI */}
          <div className="bg-[#013B88] rounded-xl flex flex-col justify-center items-center text-white py-3">
            <p className="text-sm text-center">Total Plant Run Hours</p>
            <p className="text-2xl font-extrabold text-green-400 mt-1">
              {rd(totalRunHours)}
            </p>
            <p className="text-xs mt-1 text-white">
  Average Plant Run Hours :
  <span className="text-green-400 font-semibold ml-1">
    {avgRunHours.toFixed(2)}
  </span>
</p>

          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <label className="text-xs font-semibold">From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border p-2 rounded w-full" />
          <label className="text-xs font-semibold">To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border p-2 rounded w-full" />
          <button onClick={fetchRange} className="bg-indigo-600 text-white py-2 rounded font-semibold w-full">
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
                <XAxis dataKey="date" interval={0} angle={-45} height={80} textAnchor="end" />
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
