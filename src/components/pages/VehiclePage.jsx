import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,

  CartesianGrid
} from "recharts";
import {
  Truck,
  Navigation,
  Milestone,
  Activity,
  Fuel,
  Layers,
  Rose
} from "lucide-react";

import { useParams, useNavigate } from "react-router-dom";
import { getVehicleOperationsByDateRange } from "../../services/vehicleService";
import { getAllPlants } from "../../services/plantService";
import { getOperationsByDateRange } from "../../services/operationService";
/* ---------------- UTILITIES ---------------- */
const formatDate = (d) => new Date(d).toISOString().split("T")[0];

const subtractDays = (d, days) => {
  const x = new Date(d);
  x.setDate(x.getDate() - days);
  return x;
};

const formatDateDisplay = (iso) => {
  const dt = new Date(iso);
  return `${String(dt.getDate()).padStart(2, "0")}-${String(
    dt.getMonth() + 1
  ).padStart(2, "0")}-${dt.getFullYear()}`;
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

const formatIndianRounded = (num) =>
  new Intl.NumberFormat("en-IN").format(Math.round(num));

/* ---------------- TOOLTIP ---------------- */
const DaywiseTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  const formatOneDecimal = (val) =>
    val != null ? Number(val).toFixed(1) : "0.0";

  return (
    <div className="bg-white border rounded shadow-md p-3 text-xs w-72">
      <p className="font-bold text-blue-900">
        {formatDateDisplay(d.date)}
      </p>

      {d.v1 && (
        <>
          <p className="mt-1 font-semibold text-blue-400">
            Vehicle 1 – {d.v1.vehicleNumber}
          </p>
          <p>Distance: {formatOneDecimal(d.v1.distance)} Km</p>
          <p>Fuel: {d.v1.fuel ?? "-"}</p>
          <p>No. of Trips: {d.v1.trips ?? 0}</p>          {/* ✅ */}
          <p>Sludge Collected: {d.v1.sludge ?? 0} L</p>     {/* ✅ */}
        </>
      )}

      {d.v2 && (
        <>
          <p className="mt-2 font-semibold text-blue-900">
            Vehicle 2 – {d.v2.vehicleNumber}
          </p>
          <p>Distance: {formatOneDecimal(d.v2.distance)} Km</p>
          <p>Fuel: {d.v2.fuel ?? "-"}</p>
          <p>No. of Trips: {d.v2.trips ?? 0}</p>          {/* ✅ */}
          <p>Sludge Collected: {d.v2.sludge ?? 0} L</p>     {/* ✅ */}
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
      {formatDateDisplay(payload.value)}
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
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-100",
    barColor: "bg-rose-600",
    iconColor: "text-rose-600",
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
  violet: {
  bg: "bg-violet-50",
  border: "border-violet-100",
  barColor: "bg-violet-600",
  iconColor: "text-violet-600",
}
};

/* ---------------- KPI CARD ---------------- */
const KPICard = ({ label, value, theme, icon, children }) => (
  <div className={`group relative overflow-hidden p-6 min-h-[190px] rounded-xl border ${theme.bg} ${theme.border} shadow-sm hover:shadow-md flex flex-col justify-between`}>

    <div className={`absolute bottom-0 left-0 h-1.5 w-full ${theme.barColor} origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />

    <div>
      <div className={`p-2 w-fit rounded-lg bg-white shadow-sm ${theme.iconColor}`}>
        {icon}
      </div>

      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mt-3">
        {label}
      </p>

      <p className="text-2xl font-black text-slate-900 mt-1">
        {value}
      </p>
    </div>

    {children && (
      <div className="mt-4 text-sm font-semibold text-slate-600">
        {children}
      </div>
    )}
  </div>
);
/* ================= VEHICLE PAGE ================= */
export default function VehiclePage() {
  const navigate = useNavigate();
  const { plantId, plantName } = useParams();

  const [kld, setKld] = useState(null);
  const [fromDate, setFromDate] = useState(
    formatDate(subtractDays(new Date(), 10))
  );
  const [toDate, setToDate] = useState(formatDate(new Date()));
  const [daywiseData, setDaywiseData] = useState([]);
const [operationsData, setOperationsData] = useState([]);

  /* ---------------- FETCH PLANT DETAILS ---------------- */
useEffect(() => {
  const loadPlant = async () => {
    try {
      const plants = await getAllPlants();
      const p = plants.find(
        (pl) => String(pl.plantID) === String(plantId)
      );
      if (p) setKld(p.kld);
    } catch (e) {
      console.error("Failed to load plant details", e);
    }
  };

  loadPlant();
}, [plantId]);

  /* ---------------- FETCH DAYWISE DATA ---------------- */
const fetchDaywise = async () => {
  try {
    const [vehicleArr, operationsArr] = await Promise.all([
      getVehicleOperationsByDateRange(fromDate, toDate),
      getOperationsByDateRange(fromDate, toDate),
    ]);

    /* ---------------- PRIVATE VEHICLE FILTER ---------------- */
    const filteredOperations = operationsArr.filter(
      (op) => String(op.plantId) === String(plantId)
    );

    setOperationsData(filteredOperations);

    /* ---------------- VEHICLE DATA ---------------- */
    const map = {};

    vehicleArr.forEach((item) => {
      const date = item.vehicleOp?.operationDate;
      if (!date || String(item.plantId) !== String(plantId)) return;

      if (!map[date]) map[date] = [];

      const am = item.vehicleOp.vehicleReadingAm;
      const pm = item.vehicleOp.vehicleReadingPm;

      map[date].push({
        vehicleNumber: item.vehicle.vehicleNumber,
        distance:
          pm != null && am != null ? Math.max(pm - am, 0) : 0,
        fuel: item.vehicleOp.vehicleFuelLevel,
        trips: item.vehicleOp?.noOfTrips,
        sludge: item.vehicleOp?.sludgeCollect,
      });
    });

    const processed = getDateRange(fromDate, toDate).map((date) => {
      const v = map[date] || [];
      return {
        date,
        v1: v[0] || null,
        v2: v[1] || null,
        bar1: v[0]?.distance ?? 0,
        bar2: v[1]?.distance ?? 0,
      };
    });

    setDaywiseData(processed);
  } catch (e) {
    console.error("Failed to fetch daywise vehicle data", e);
    setDaywiseData([]);
  }
};


useEffect(() => {
  fetchDaywise();
}, [fromDate, toDate, plantId]);

  /* ---------------- KPI CALCULATIONS ---------------- */
  const totalDistance = daywiseData.reduce(
    (sum, d) => sum + (d.bar1 || 0) + (d.bar2 || 0),
    0
  );
const vehicle1Distance = daywiseData.reduce(
  (sum, d) => sum + (d.bar1 || 0),
  0
);

const vehicle2Distance = daywiseData.reduce(
  (sum, d) => sum + (d.bar2 || 0),
  0
);

  const getSelectedDaysCount = (from, to) => {
  const start = new Date(from);
  const end = new Date(to);

  // milliseconds difference + 1 day (inclusive)
  const diff =
    Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

  return diff > 0 ? diff : 0;
};


const selectedDaysCount = getSelectedDaysCount(fromDate, toDate);

const avgDistance =
  selectedDaysCount > 0
    ? Math.floor((totalDistance / selectedDaysCount) + 0.5)
    : 0;


const formatIndianRounded = (num) =>
  new Intl.NumberFormat("en-IN").format(Math.round(num));


  const daysCount = daywiseData.length || 1;


const avgVehicle1Distance = Math.round(vehicle1Distance / daysCount);
const avgVehicle2Distance = Math.round(vehicle2Distance / daysCount);

const totalSludge = daywiseData.reduce(
  (sum, d) => sum + (d.v1?.sludge || 0) + (d.v2?.sludge || 0),
  0
);

const vehicle1Sludge = daywiseData.reduce(
  (sum, d) => sum + (d.v1?.sludge || 0),
  0
);

const vehicle2Sludge = daywiseData.reduce(
  (sum, d) => sum + (d.v2?.sludge || 0),
  0
);

const { totalPrivateTrips, totalPrivateSludge } = useMemo(() => {
  return operationsData.reduce(
    (acc, op) => {
      acc.totalPrivateTrips +=
        op.operation?.noOfTripsPrivateVehicle || 0;

      acc.totalPrivateSludge +=
        op.operation?.sludgeCollectPrivateVehicle || 0;

      return acc;
    },
    { totalPrivateTrips: 0, totalPrivateSludge: 0 }
  );
}, [operationsData]);

  /* ---------------- SCROLL LOGIC ---------------- */
const DAY_SCROLL_THRESHOLD = 40;   // show scrollbar after 40 days
const BAR_WIDTH = 40;             // px per day

const needsScroll = daywiseData.length > DAY_SCROLL_THRESHOLD;

const chartWidth = needsScroll
  ? daywiseData.length * BAR_WIDTH
  : "100%";

    const totalVehicles = useMemo(() => {
  const vehicleSet = new Set();

  daywiseData.forEach((d) => {
    if (d.v1?.vehicleNumber) vehicleSet.add(d.v1.vehicleNumber);
    if (d.v2?.vehicleNumber) vehicleSet.add(d.v2.vehicleNumber);
  });

  return vehicleSet.size;
}, [daywiseData]);
const TopBarLabel = React.memo(({ x, y, width, value }) => {
  if (value === null || value === undefined || value === 0) return null;

  return (
    <text
      x={x + width / 2}
      y={y - 6}                // 👆 above the bar
      textAnchor="middle"
      fill="#003f8a"
      fontSize={11}
      fontWeight={700}
      pointerEvents="none"
    >
      {Math.round(value)}      {/* distance in Km */}
    </text>
  );
});

/* ---------- VEHICLE NUMBERS FOR STATIC LEGEND ---------- */
const { vehicle1Number, vehicle2Number } = useMemo(() => {
  for (let i = daywiseData.length - 1; i >= 0; i--) {
    if (daywiseData[i].v1 || daywiseData[i].v2) {
      return {
        vehicle1Number: daywiseData[i].v1?.vehicleNumber ?? "-",
        vehicle2Number: daywiseData[i].v2?.vehicleNumber ?? "-"
      };
    }
  }
  return { vehicle1Number: "-", vehicle2Number: "-" };
}, [daywiseData]);

/* ---------- TRIPS CALCULATION ---------- */
const vehicle1Trips = daywiseData.reduce(
  (sum, d) => sum + (d.v1?.trips || 0),
  0
);

const vehicle2Trips = daywiseData.reduce(
  (sum, d) => sum + (d.v2?.trips || 0),
  0
);



  /* ---------------- UI ---------------- */
  return (
    <div className="p-6 bg-[#D9E6FF] min-h-screen">
      <h2  className="text-2xl font-bold text-blue-900 text-center mb-4 tracking-wide"
  style={{ fontFamily: '"Times New Roman", Times, serif' }}>
         Vehicle Movement and Distance Covered Status
       </h2>
      <button
        onClick={() => navigate("/vehicle")}
        className="bg-red-600 text-white px-4 py-1 rounded mb-4"
      >
        Close
      </button>

      <h2 className="text-2xl font-bold text-blue-900 mb-6">
        Vehicle Usage – {decodeURIComponent(plantName)}
        <span className="text-gray-700 text-lg font-semibold">
          {" "} (PID: {plantId} – KLD: {kld ?? "..."})
        </span>
      </h2>

{/* KPI + FILTERS */}
<div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">

  {/* KPI CARDS */}
  <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg border border-blue-100 p-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

      {/* TOTAL VEHICLES */}
      <KPICard
        label="Total Vehicles"
        value={formatIndianRounded(totalVehicles)}
        theme={theme.blue}
        icon={<Truck size={18} />}
      />

      {/* TOTAL DISTANCE */}
      <KPICard
        label="Total Distance Covered (Km)"
        value={formatIndianRounded(totalDistance)}
        theme={theme.rose}
        icon={<Navigation size={18} />}
      >
        <div>
          Vehicle 1: {formatIndianRounded(vehicle1Distance)} Km (Trips: {vehicle1Trips})
        </div>
        <div>
          Vehicle 2: {formatIndianRounded(vehicle2Distance)} Km (Trips: {vehicle2Trips})
        </div>
      </KPICard>

      {/* AVERAGE DISTANCE */}
      <KPICard
        label="Average Distance (Km)"
        value={formatIndianRounded(avgDistance)}
        theme={theme.emerald}
        icon={<Activity size={18} />}
      >
        <div>Vehicle 1: {formatIndianRounded(avgVehicle1Distance)} Km</div>
        <div>Vehicle 2: {formatIndianRounded(avgVehicle2Distance)} Km</div>
      </KPICard>

      {/* TOTAL SLUDGE */}
      <KPICard
        label="Total Sludge Collected (L)"
        value={formatIndianRounded(totalSludge)}
        theme={theme.amber}
        icon={<Layers size={18} />}
      >
        <div>Vehicle 1: {formatIndianRounded(vehicle1Sludge)} L</div>
        <div>Vehicle 2: {formatIndianRounded(vehicle2Sludge)} L</div>
      </KPICard>

      {/* PRIVATE VEHICLE */}
      <KPICard
        label="Private Vehicle Trips"
        value={formatIndianRounded(totalPrivateTrips)}
        theme={theme.violet}
        icon={<Milestone size={18} />}
      >
        Sludge: {formatIndianRounded(totalPrivateSludge)} L
      </KPICard>

    </div>
  </div>

  {/* DATE FILTERS */}
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


      {/* BAR GRAPH */}
      <div className="bg-white rounded-xl shadow-xl p-6 w-full">

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
          margin={{ top: 50, right: 30, left: 70, bottom: 90 }}
          barCategoryGap={20}
        >
          <CartesianGrid strokeDasharray="3 3" />


          

          {/* X-AXIS (SHOW ALL DATES) */}
          <XAxis
  dataKey="date"
  interval={0}
  height={80}
  tick={<DateTick />}
/>

          {/* Y-AXIS */}
          <YAxis
            label={{
              value: "Distance Covered (Km)",
              angle: -90,
              position: "insideLeft",
              dy: 80,
              fontWeight: "bold",
            }}
          />

          <Tooltip content={<DaywiseTooltip />} />

          <Bar
            dataKey="bar1"
            fill="#6AA6FF"
            barSize={28}
            label={<TopBarLabel />}
            name="Vehicle 1"
          />
          <Bar
            dataKey="bar2"
            fill="#0047B3"
            barSize={28}
            label={<TopBarLabel />}
            name="Vehicle 2"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>

  {/* STATIC X LABEL */}
  <div className="flex items-center justify-center gap-6 mt-4 text-[13px] font-semibold ">
        <span className="flex items-center gap-2 text-blue-400">
          <span className="w-3 h-3 bg-[#6AA6FF] rounded-sm" />
           Vehicle 1 – {vehicle1Number}
        </span>
        <span className="flex items-center gap-2 text-blue-900">
          <span className="w-3 h-3 bg-[#0047B3] rounded-sm" />
           Vehicle 2 – {vehicle2Number}
        </span>
      </div>

      {/* X-AXIS LABEL */}
      <p className="text-center text-lg font-bold text-gray-700 mt-3">
        Dates
      </p>
</div>

    </div>
  );
}