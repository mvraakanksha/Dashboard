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
      <p className="font-bold text-blue-900">{d.date}</p>
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

/* ---------------- MAIN COMPONENT ---------------- */
export default function SludgeReportView() {
  const navigate = useNavigate();
  const { plantId } = useParams();
  const [params] = useSearchParams();
  const mode = params.get("mode") || "received";

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
    const result = await getOperationsByDateRange(fromDate, toDate);

    const map = {};
    result.forEach((item) => {
      if (String(item.plantId) === String(plantId)) {
        map[item.operation.operationDate] = item.operation;
      }
    });

    const finalData = getDateRange(fromDate, toDate).map((date) => {
      const op = map[date];
      return {
        date,
        received: op?.sludgeReceived ?? 0,
        tankLevel: op?.sludgeTankLevelPm ?? op?.sludgeTankLevelAm ?? 0,
        processed: op?.sludgeProcessed ?? 0,
        biochar: op?.biocharProduced ?? 0,
      };
    });

    setDaywiseData(finalData);
  } catch (err) {
    console.error("Failed to fetch daywise data", err);
    setDaywiseData([]);
  }
}, [fromDate, toDate, plantId]);

useEffect(() => {
  fetchDaywise();
}, [fetchDaywise]);

  /* ---------------- KPI CALCULATIONS ---------------- */
  const totalValue = daywiseData.reduce((sum, d) => {
    switch (mode) {
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
        {labels[mode][0]}
        <span className="text-2xl font-bold text-blue-900 mb-6">
          -  PID: {plantDetails?.plantID ?? "-"} :{" "}
          {plantDetails?.plantName ?? "Loading..."} :{" "}
          {plantDetails?.kld ?? "-"} KLD
        </span>
      </h2>

      {/* KPI + FILTERS (UNCHANGED) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg border border-blue-100 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="bg-[#013B88] text-white rounded-xl px-6 py-8 text-center shadow-md min-h-[170px] flex flex-col justify-center"
              >
                <p className="text-sm font-medium">{labels[mode][i]}</p>
                <h2 className="text-xl font-extrabold text-green-400 mt-3">
                  {formatIndianRounded(i === 0 ? totalValue : avgValue)}
                </h2>
              </div>
            ))}
          </div>
        </div>

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
            className="bg-blue-700 text-white py-2 rounded-lg font-semibold"
          >
            GET
          </button>
        </div>
      </div>

      {/* CHART (UNCHANGED) */}
      <div className="bg-white shadow-xl rounded-xl p-6 w-full">
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
                  angle={-45}
                  height={80}
                  textAnchor="end"
                  tick={{ fontSize: 11, fill: "#003f8a", fontWeight: 600 }}
                />
                <YAxis
                  tickFormatter={formatIndianRounded}
                  label={{
                    value:
                      mode === "received"
                        ? "Sludge Received (L)"
                        : mode === "tank"
                        ? "Tank Level (L)"
                        : mode === "processed"
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
                <Tooltip content={<SludgeTooltip mode={mode} />} />

                {mode === "received" && (
                  <Bar dataKey="received" fill="#003f8a" barSize={28} label={<TopBarLabel />} />
                )}
                {mode === "tank" && (
                  <Bar dataKey="tankLevel" fill="#6a1b9a" barSize={28} label={<TopBarLabel />} />
                )}
                {mode === "processed" && (
                  <Bar dataKey="processed" fill="#0277bd" barSize={28} label={<TopBarLabel />} />
                )}
                {mode === "biochar" && (
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
