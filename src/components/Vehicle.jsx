import React, { useState, useEffect, useMemo } from "react";
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
  Truck,
  Navigation,
  Milestone,
  Activity,
  Fuel
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { getAllPlants } from "../services/plantService";
import { getVehicleOperationsByDate } from "../services/vehicleService";


/* ---------------- CLICKABLE X-TICK ---------------- */
const ClickableTick = ({ x, y, payload, plantMap, navigate }) => {
  const label = payload?.value;
  const plant = plantMap[label];

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
        cursor: plant ? "pointer" : "default",
        whiteSpace: "nowrap",
        textDecoration: "underline",
      }}
      onClick={() => {
        if (plant) {
          navigate(`/vehicle-view/${plant.plantId}/${plant.label}`);
        }
      }}
    >
      {label}
    </text>
  );
};

/* ---------------- TOOLTIP ---------------- */
const CombinedTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  const distance = (am, pm) =>
    pm != null && am != null
      ? Number(Math.max(pm - am, 0).toFixed(1))
      : 0;

  return (
    <div className="bg-white border rounded shadow-md p-2 text-xs w-64">
      <p className="font-bold text-blue-900">
        PID: {d.plantId} - {d.label} - {d.kld} KLD
      </p>

      {d.v1 && (
        <div className="mt-2">
          <p className="font-semibold text-blue-400">
            Vehicle 1 – {d.v1.vehicleNumber}
          </p>
          <p>Distance: {distance(d.v1.am, d.v1.pm)} Km</p>
          <p>Fuel: {d.v1.fuel ?? "-"}</p>
          <p>No. of Trips: {d.v1.trips ?? 0}</p>          {/* ✅ */}
          <p>Sludge Collected: {d.v1.sludge ?? 0} L</p>     {/* ✅ */}
        </div>
      )}

      {d.v2 && (
        <div className="mt-3">
          <p className="font-semibold text-blue-800">
            Vehicle 2 – {d.v2.vehicleNumber}
          </p>
          <p>Distance: {distance(d.v2.am, d.v2.pm)} Km</p>
          <p>Fuel: {d.v2.fuel ?? "-"}</p>
          <p>No. of Trips: {d.v2.trips ?? 0}</p>          {/* ✅ */}
          <p>Sludge Collected: {d.v2.sludge ?? 0} L</p>     {/* ✅ */}
        </div>
      )}
    </div>
  );
};

/* ---------------- BAR TOP LABEL ---------------- */
const TopBarLabel = React.memo(({ x, y, width, value }) => {
  if (!value || value === 0) return null;
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
      {Math.round(value)}
    </text>
  );
});

/* ================================================= */
/* VEHICLE COMPONENT */
/* ================================================= */
export default function Vehicle({ date, zone })
 {
  const navigate = useNavigate();

  const [plants, setPlants] = useState([]);
  const [vehicleOps, setVehicleOps] = useState([]);

  const [vehicleSortMode, setVehicleSortMode] = useState("distance");

//   const kpiTheme = {
//   blue: {
//     bg: isDark ? "bg-blue-900/20" : "bg-blue-50",
//     border: "border-blue-100",
//   },
//   emerald: {
//     bg: isDark ? "bg-emerald-900/20" : "bg-emerald-50",
//     border: "border-emerald-100",
//   },
//   indigo: {
//     bg: isDark ? "bg-indigo-900/20" : "bg-indigo-50",
//     border: "border-indigo-100",
//   },
//   rose: {
//     bg: isDark ? "bg-rose-900/20" : "bg-rose-50",
//     border: "border-rose-100",
//   },
//   amber: {
//     bg: isDark ? "bg-amber-900/20" : "bg-amber-50",
//     border: "border-amber-100",
//   },
// };


  /* ---------------- FETCH PLANTS ---------------- */
useEffect(() => {
  const loadPlants = async () => {
    try {
      const data = await getAllPlants();
      setPlants(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load plants", e);
      setPlants([]);
    }
  };

  loadPlants();
}, []);

  /* ---------------- FETCH VEHICLE OPS ---------------- */
useEffect(() => {
  if (!date) return;

  const loadVehicleOps = async () => {
    try {
      const data = await getVehicleOperationsByDate(date);
      setVehicleOps(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load vehicle operations", e);
      setVehicleOps([]);
    }
  };

  loadVehicleOps();
}, [date]);

  /* ---------------- ZONE FILTERED DATA ---------------- */
const filteredPlants = useMemo(() => {
  return plants.filter(
    (p) => zone === "All" || String(p.zones) === String(zone)
  );
}, [plants, zone]);


  const filteredVehicleOps = useMemo(() => {
    const plantIds = new Set(filteredPlants.map((p) => p.plantID));
    return vehicleOps.filter((v) => plantIds.has(v.plantId));
  }, [vehicleOps, filteredPlants]);

  /* ---------------- BUILD CHART DATA ---------------- */
  const chartData = useMemo(() => {
    return filteredPlants.map((p) => {
      const records = filteredVehicleOps.filter(
        (v) => v.plantId === p.plantID
      );

      const sorted = [...records].sort(
        (a, b) => a.vehicle.vehicleID - b.vehicle.vehicleID
      );

      const getVehicle = (v) =>
        v
          ? {
              vehicleNumber: v.vehicle?.vehicleNumber,
              am: v.vehicleOp?.vehicleReadingAm,
              pm: v.vehicleOp?.vehicleReadingPm,
              fuel: v.vehicleOp?.vehicleFuelLevel,
              trips: v.vehicleOp?.noOfTrips,          // ✅ added
        sludge: v.vehicleOp?.sludgeCollect,     // ✅ added
            }
          : null;

      const v1 = getVehicle(sorted[0]);
      const v2 = getVehicle(sorted[1]);

      const distance = (v) =>
        v?.pm != null && v?.am != null ? Math.max(v.pm - v.am, 0) : 0;

      return {
        label: p.plantName,
        plantId: p.plantID,
        kld: p.kld,
        v1,
        v2,
        bar1: distance(v1),
        bar2: distance(v2),
      };
    });
  }, [filteredPlants, filteredVehicleOps]);

  /* ---------------- METRICS ---------------- */
  const totalDistance = chartData.reduce(
    (sum, p) => sum + p.bar1 + p.bar2,
    0
  );

  const totalVehicles = filteredPlants.reduce(
    (sum, p) => sum + (p.noOfVehicle || 0),
    0
  );

  const movedVehicles = useMemo(() => {
    const set = new Set();
    filteredVehicleOps.forEach((v) => {
      const am = v.vehicleOp?.vehicleReadingAm;
      const pm = v.vehicleOp?.vehicleReadingPm;
      if (am != null && pm != null && pm - am > 0) {
        set.add(v.vehicle?.vehicleID);
      }
    });
    return set.size;
  }, [filteredVehicleOps]);

  const totalTrips = useMemo(() => {
    return filteredVehicleOps.reduce(
      (sum, v) => sum + (v.vehicleOp?.noOfTrips || 0),
      0
    );
  }, [filteredVehicleOps]);

  const avgDistance =
    movedVehicles > 0 ? (totalDistance / movedVehicles).toFixed(1) : "0.0";

  /* ---------------- PLANT MAP ---------------- */
  const plantMap = {};
  chartData.forEach((p) => (plantMap[p.label] = p));

  /* ---------------- SCROLL LOGIC ---------------- */
  const BAR_SLOT_WIDTH = 90;
  const DAY_SCROLL_THRESHOLD = 14;

  const needsScroll = chartData.length > DAY_SCROLL_THRESHOLD;

  const vehicleChartWidth = needsScroll
    ? chartData.length * BAR_SLOT_WIDTH
    : "100%";

  /* ---------------- SORTING ---------------- */
  const sortedChartData = useMemo(() => {
    const data = [...chartData];

    switch (vehicleSortMode) {
      case "v1":
        return data.sort((a, b) => b.bar1 - a.bar1);
      case "v2":
        return data.sort((a, b) => b.bar2 - a.bar2);
      case "distance":
        return data.sort(
          (a, b) => b.bar1 + b.bar2 - (a.bar1 + a.bar2)
        );
      case "id":
      default:
        return data.sort((a, b) => a.plantId - b.plantId);
    }
  }, [chartData, vehicleSortMode]);

  /* ---------------- UI ---------------- */
  return (
  <div className="min-h-screen p-6 bg-gradient-to-br from-[#CFE2FF] via-[#BBD8FE] to-[#013B88]">

    {/* 🔝 HEADER */}
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-blue-600 text-white">
          <Truck className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-blue-900">
            Vehicle Report
          </h2>
          <p className="text-xs tracking-widest font-bold text-slate-900">
            Vehicle Movement & Distance Coverage Monitoring
          </p>
        </div>
      </div>
    </div>

    {/* KPI + FILTERS */}
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">

      {/* KPI CARDS */}
      <div className="lg:col-span-3 rounded-2xl p-6 bg-white shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Total Vehicles", value: totalVehicles, icon: <Truck size={18} />, bg: "#DBEAFE", bar: "#2563EB" },
            { label: "Moved Vehicles", value: movedVehicles, icon: <Navigation size={18} />, bg: "#D1FAE5", bar: "#059669" },
            { label: "No. of Trips", value: totalTrips, icon: <Milestone size={18} />, bg: "#E0E7FF", bar: "#4F46E5" },
            { label: "Total Distance", value: Math.round(totalDistance), icon: <Activity size={18} />, bg: "#FFE4E6", bar: "#E11D48" },
            { label: "Avg Distance", value: Math.round(avgDistance), icon: <Activity  size={18} />, bg: "#FEF3C7", bar: "#D97706" },
          ].map((card, i) => (
            <div
              key={i}
              className="group relative rounded-xl p-4 shadow-sm hover:shadow-md transition"
              style={{ backgroundColor: card.bg }}
            >
              <div
                className="absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0
                           group-hover:scale-x-100 transition-transform duration-500"
                style={{ backgroundColor: card.bar }}
              />

              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-white text-slate-700">
                {card.icon}
              </div>

              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {card.label}
              </p>

              <p className="text-xl font-black mt-1 text-slate-900">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* SORT FILTER */}
      <div className="rounded-xl p-4 flex flex-col justify-center bg-white shadow-md">
        <label className="text-xs font-semibold text-gray-700 mb-1">
          Sort By
        </label>
        <select
          value={vehicleSortMode}
          onChange={(e) => setVehicleSortMode(e.target.value)}
          className="border p-2 rounded-md text-sm font-semibold outline-none bg-white border-slate-300"
        >
          <option value="distance">Total Distance</option>
          <option value="v1">Vehicle 1 Distance</option>
          <option value="v2">Vehicle 2 Distance</option>
          <option value="id">Plant Id</option>
        </select>
      </div>
    </div>

    {/* ===================== CHART ===================== */}
    <div className="rounded-2xl p-6 bg-white shadow-lg">

      <div className={needsScroll ? "overflow-x-auto" : ""}>
        <div style={{ width: vehicleChartWidth, height: 520 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedChartData}
              margin={{ top: 50, right: 30, left: 80, bottom: 100 }}
              barCategoryGap={30}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                interval={0}
                height={90}
                tick={(props) => (
                  <ClickableTick
                    {...props}
                    plantMap={plantMap}
                    navigate={navigate}
                  />
                )}
              />
              <YAxis
                label={{
                  value: "Distance Covered (Km)",
                  angle: -90,
                  position: "insideLeft",
                  offset: -20,
                  dy: 50,
                  fontWeight: "bold",
                }}
              />
              <Tooltip content={<CombinedTooltip />} />
              <Bar dataKey="bar1" fill="#6AA6FF" barSize={28} label={<TopBarLabel />} />
              <Bar dataKey="bar2" fill="#0047B3" barSize={28} label={<TopBarLabel />} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LEGEND */}
      <div className="flex items-center justify-center gap-6 mt-4 text-[13px] font-semibold text-[#003f8a]">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#6AA6FF] rounded-sm" />
          Vehicle 1
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#0047B3] rounded-sm" />
          Vehicle 2
        </span>
      </div>

      {/* X AXIS LABEL */}
      <p className="text-center text-lg font-bold mt-3 text-gray-700">
        Plants
      </p>
    </div>
  </div>
);
}