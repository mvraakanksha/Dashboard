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
import { useParams, useNavigate } from "react-router-dom";
import { getVehicleOperationsByDateRange } from "../../services/vehicleService";
import { getAllPlants } from "../../services/plantService";

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
    const arr = await getVehicleOperationsByDateRange(fromDate, toDate);

    const map = {};

    arr.forEach((item) => {
      const date = item.vehicleOp?.operationDate;
      if (!date || String(item.plantId) !== String(plantId)) return;

      if (!map[date]) map[date] = [];

      const am = item.vehicleOp.vehicleReadingAm;
      const pm = item.vehicleOp.vehicleReadingPm;

      map[date].push({
        vehicleNumber: item.vehicle.vehicleNumber,
        distance: pm != null && am != null ? Math.max(pm - am, 0) : 0,
        fuel: item.vehicleOp.vehicleFuelLevel,
        trips: item.vehicleOp?.noOfTrips,        // ✅ added
        sludge: item.vehicleOp?.sludgeCollect,   // ✅ added
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
    <div className="grid grid-cols-4 gap-4">

      {/* TOTAL VEHICLES */}
      <div className="bg-[#013B88] text-white rounded-xl px-6 py-8 text-center shadow-md min-h-[170px] flex flex-col justify-center">
        <p className="text-sm font-medium">Total Vehicles</p>
        <h2 className="text-xl font-extrabold text-green-400 mt-3">
          {formatIndianRounded(totalVehicles)}
        </h2>
      </div>

      {/* TOTAL DISTANCE */}
 <div className="bg-[#013B88] text-white rounded-xl px-6 py-8 text-center shadow-md min-h-[170px] flex flex-col justify-center">
  <p className="text-sm font-medium">
    Total Distance Covered (Km)
  </p>

  <h2 className="text-xl font-extrabold text-green-400 mt-3">
    {formatIndianRounded(totalDistance)}
  </h2>

  {/* 👇 Vehicle-wise breakdown */}
  <div className="mt-4 space-y-1 text-sm font-semibold text-blue-100">
    <span className="block">
  Vehicle 1 :{" "}
  <span className="font-extrabold text-green-400">
    {formatIndianRounded(vehicle1Distance)} Km
  </span>
  <span className="text-white text-xs ml-1">
    (Trips:{" "}
    <span className="font-extrabold text-green-400">
      {vehicle1Trips}
    </span>
    )
  </span>
</span>

<span className="block">
  Vehicle 2 :{" "}
  <span className="font-extrabold text-green-400">
    {formatIndianRounded(vehicle2Distance)} Km
  </span>
  <span className="text-white text-xs ml-1">
    (Trips:{" "}
    <span className="font-extrabold text-green-400">
      {vehicle2Trips}
    </span>
    )
  </span>
</span>

  </div>
</div>


      {/* AVERAGE DISTANCE */}
  <div className="bg-[#013B88] text-white rounded-xl px-6 py-8 text-center shadow-md min-h-[170px] flex flex-col justify-center">
  <p className="text-sm font-medium">
    Average Distance Covered (Km)
  </p>

  <h2 className="text-xl font-extrabold text-green-400 mt-3">
    {formatIndianRounded(avgDistance)}
  </h2>

  {/* 👇 Vehicle-wise average breakdown */}
  <div className="mt-4 space-y-1 text-sm font-semibold text-blue-100">
    <span className="block">
      Vehicle 1 :{" "}
      <span className="text-10m font-extrabold text-green-400 mt-3">
        {formatIndianRounded(avgVehicle1Distance)} Km
      </span>
    </span>

    <span className="block">
      Vehicle 2 :{" "}
      <span className="text-10m font-extrabold text-green-400 mt-3">
        {formatIndianRounded(avgVehicle2Distance)} Km
      </span>
    </span>
  </div>
</div>
{/* TOTAL SLUDGE COLLECTED */}
<div className="bg-[#013B88] text-white rounded-xl px-6 py-8 text-center shadow-md min-h-[170px] flex flex-col justify-center">
  <p className="text-sm font-medium">
    Total Sludge Collected (L)
  </p>

  <h2 className="text-xl font-extrabold text-green-400 mt-3">
    {formatIndianRounded(totalSludge)}
  </h2>

  {/* 👇 Vehicle-wise breakdown */}
  <div className="mt-4 space-y-1 text-sm font-semibold text-blue-100">
    <span className="block">
      Vehicle 1 :{" "}
      <span className="font-extrabold text-green-400">
        {formatIndianRounded(vehicle1Sludge)} L
      </span>
    </span>

    <span className="block">
      Vehicle 2 :{" "}
      <span className="font-extrabold text-green-400">
        {formatIndianRounded(vehicle2Sludge)} L
      </span>
    </span>
  </div>
</div>


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
      className="bg-blue-700 text-white py-2 rounded-lg font-semibold"
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
            interval={0}                 // ✅ SHOW EVERY DATE
            tickFormatter={formatDateDisplay}
            angle={-45}
            height={80}
            textAnchor="end"
            tick={{
              fontSize: 11,
              fill: "#003f8a",
              fontWeight: 600,
            }}
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