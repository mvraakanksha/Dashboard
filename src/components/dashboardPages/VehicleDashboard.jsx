// import React, { useMemo } from "react";
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
//   CartesianGrid
// } from "recharts";
// import { useNavigate } from "react-router-dom";

// /* ---------------- FORMAT ---------------- */
// const formatIndianNumber = (num) => {
//   if (num == null) return "0";
//   const x = Math.round(num).toString();
//   const lastThree = x.slice(-3);
//   const other = x.slice(0, -3);
//   return other
//     ? other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
//     : lastThree;
// };

// /* ---------------- BAR LABEL ---------------- */
// const TopBarLabel = ({ x, y, width, value }) => {
//   if (!value || value <= 0) return null;

//   return (
//     <text
//       x={x + width / 2}
//       y={y - 6}
//       textAnchor="middle"
//       fill="#003f8a"
//       fontSize={11}
//       fontWeight={700}
//       pointerEvents="none"
//     >
//       {formatIndianNumber(value)}
//     </text>
//   );
// };

// /* ---------------- TOOLTIP ---------------- */
// const VehicleTooltip = ({ active, payload }) => {
//   if (!active || !payload?.length) return null;

//   const d = payload[0].payload;

//   const distance = (am, pm) =>
//     am != null && pm != null ? Math.max(pm - am, 0).toFixed(1) : "0.0";

//   return (
//     <div className="bg-white border rounded shadow-md p-2 text-xs w-64">
//       <p className="font-bold text-blue-900">
//         {d.plantId} - {d.label} ({d.kld} KLD)
//       </p>

//       {d.v1 && (
//         <p className="mt-2 text-blue-400">
//           Vehicle 1 – {d.v1.vehicleNumber} : {distance(d.v1.am, d.v1.pm)} Km
//         </p>
//       )}

//       {d.v2 && (
//         <p className="text-blue-800">
//           Vehicle 2 – {d.v2.vehicleNumber} : {distance(d.v2.am, d.v2.pm)} Km
//         </p>
//       )}
//     </div>
//   );
// };

// /* ---------------- X TICK ---------------- */
// const ClickableTick = ({ x, y, payload, plantMap, navigate }) => {
//   const plant = plantMap[payload.value];

//   return (
//     <text
//       x={x}
//       y={y + 10}
//       textAnchor="end"
//       fill="#003f8a"
//       fontSize={11}
//       fontWeight={600}
//       transform={`rotate(-30 ${x} ${y + 10})`}
//       style={{
//         cursor: plant ? "pointer" : "default",
//         whiteSpace: "nowrap",
//         textDecoration: "underline"
//       }}
//       onClick={() => {
//         if (plant) {
//           navigate(`/vehicle-view/${plant.plantId}/${plant.label}`);
//         }
//       }}
//     >
//       {payload.value}
//     </text>
//   );
// };

// /* ================================================= */
// /* VEHICLE DASHBOARD */
// /* ================================================= */
// export default function VehicleDashboard({ chartData = [] }) {
//   const navigate = useNavigate();

//   /* ✅ hooks ALWAYS first */
//   const plantMap = useMemo(() => {
//     const map = {};
//     chartData.forEach((p) => (map[p.label] = p));
//     return map;
//   }, [chartData]);

//   /* ✅ SORT BY GREATEST DISTANCE (bar1 OR bar2) */
//   const sortedData = useMemo(() => {
//     return [...chartData].sort(
//       (a, b) =>
//         Math.max(b.bar1 || 0, b.bar2 || 0) -
//         Math.max(a.bar1 || 0, a.bar2 || 0)
//     );
//   }, [chartData]);

//   const BAR_SLOT_WIDTH = 90;
//   const chartWidth =
//     sortedData.length > 12
//       ? sortedData.length * BAR_SLOT_WIDTH
//       : "100%";

//   /* ✅ conditional render AFTER hooks */
//   if (sortedData.length === 0) {
//     return (
//       <div className="bg-white rounded-2xl shadow p-6 text-center text-gray-500">
//         No vehicle data available
//       </div>
//     );
//   }

//   return (
//     <div >
      
//       <div className="overflow-x-auto">
//         <div style={{ width: chartWidth, height: 350 }}>
//           <ResponsiveContainer width="100%" height="100%">
//             <BarChart
//               data={sortedData}
//               margin={{ top: 40, right: 30, left: 80, bottom: 90 }}
//               barCategoryGap={30}
//             >
//               <CartesianGrid strokeDasharray="3 3" />

//               <XAxis
//                 dataKey="label"
//                 interval={0}
//                 height={70}
//                 tick={(props) => (
//                   <ClickableTick
//                     {...props}
//                     plantMap={plantMap}
//                     navigate={navigate}
//                   />
//                 )}
//               />

//               <YAxis
//                 tickFormatter={formatIndianNumber}
//                 label={{
//                   value: "Distance Covered (Km)",
//                   angle: -90,
//                   position: "insideLeft",
//                   dy: 80,
//                   fontWeight: "bold"
//                 }}
//               />

//               <Tooltip content={<VehicleTooltip />} />

//               <Bar dataKey="bar1" fill="#6AA6FF" barSize={28} label={<TopBarLabel />} />
//               <Bar dataKey="bar2" fill="#0047B3" barSize={28} label={<TopBarLabel />} />
//             </BarChart>
//           </ResponsiveContainer>
//         </div>
//       </div>

//       <p className="flex justify-center gap-6 mt-4 text-sm font-semibold text-[#003f8a]">
//         <span className="flex items-center gap-2">
//           <span className="w-3 h-3 bg-[#6AA6FF] rounded-sm" />
//           Vehicle 1
//         </span>
//         <span className="flex items-center gap-2">
//           <span className="w-3 h-3 bg-[#0047B3] rounded-sm" />
//           Vehicle 2
//         </span>
//       </p>

//       <p className="text-center text-sm font-bold text-[#333] mt-3">
//         Plants
//       </p>
//     </div>
//   );
// }


import React, { useState, useEffect } from "react";
import { Truck, Activity, Route, Zap } from "lucide-react";
import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";


export default function VehicleDashboard({ kpis, isDark }) {
  const [animateCounter, setAnimateCounter] = useState(false);

  useEffect(() => {
    setAnimateCounter(true);
  }, []);

  const Counter = ({ value, duration = 2 }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (!animateCounter) return;

      let start = 0;
      const roundedValue = Math.round(value || 0);
      const increment = roundedValue / (duration * 60);

      const timer = setInterval(() => {
        start += increment;
        if (start >= roundedValue) {
          setCount(roundedValue);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 1000 / 60);

      return () => clearInterval(timer);
    }, [animateCounter, value, duration]);

    return <span>{count}</span>;
  };

  const KPIData = [
    {
      title: "Total Vehicles",
      value: kpis.totalVehicles,
      icon: Truck,
      bgGradient: "from-indigo-50/60 to-blue-50/40",
      borderColor: "border-indigo-200/40",
      barColor: "from-indigo-400 to-indigo-600",
      iconBg: "bg-indigo-500/20 group-hover/card:bg-indigo-600 border-indigo-200/30",
      iconColor: "text-indigo-600 group-hover/card:text-white",
      textColor: "text-indigo-700",
      delay: "0.5s",
      duration: 2
    },
    {
      title: "Moved Vehicles",
      value: kpis.movedVehicles,
      icon: Activity,
      bgGradient: "from-emerald-50/60 to-teal-50/40",
      borderColor: "border-emerald-200/40",
      barColor: "from-emerald-400 to-emerald-600",
      iconBg: "bg-emerald-500/20 group-hover/card:bg-emerald-600 border-emerald-200/30",
      iconColor: "text-emerald-600 group-hover/card:text-white",
      textColor: "text-emerald-700",
      delay: "0.6s",
      duration: 2
    },
    {
      title: "Avg Distance",
      value: Math.round(kpis.avgDistance || 0), // ✅ ROUNDED
      icon: Zap,
      unit: "km",
      bgGradient: "from-amber-50/60 to-orange-50/40",
      borderColor: "border-amber-200/40",
      barColor: "from-amber-400 to-amber-600",
      iconBg: "bg-amber-500/20 group-hover/card:bg-amber-600 border-amber-200/30",
      iconColor: "text-amber-600 group-hover/card:text-white",
      textColor: "text-amber-700",
      delay: "0.7s",
      duration: 2
    },
    {
      title: "Total Trips",
      value: kpis.totalTrips,
      icon: Route,
      bgGradient: "from-rose-50/60 to-pink-50/40",
      borderColor: "border-rose-200/40",
      barColor: "from-rose-400 to-rose-600",
      iconBg: "bg-rose-500/20 group-hover/card:bg-rose-600 border-rose-200/30",
      iconColor: "text-rose-600 group-hover/card:text-white",
      textColor: "text-rose-700",
      delay: "0.8s",
      duration: 2
    }
  ];
const navigate = useNavigate();
  return (
  <div className="relative h-full overflow-hidden">
  {/* Animated background blobs */}
  <div
    className={`absolute top-4 left-4 w-32 h-32 rounded-full blur-3xl animate-pulse
      ${isDark ? "bg-blue-500/10" : "bg-blue-200/30"}
    `}
  />
  <div
    className={`absolute bottom-4 right-4 w-32 h-32 rounded-full blur-3xl animate-pulse
      ${isDark ? "bg-purple-500/10" : "bg-purple-200/30"}
    `}
    style={{ animationDelay: "1.5s" }}
  />

  <div className="relative z-10 w-full">
    <div
      className={`
        rounded-[1.75rem] p-5 border shadow-lg transition-all duration-500
        ${isDark
          ? "bg-slate-900/70 border-slate-700 backdrop-blur-xl"
          : "bg-white/80 border-white/60 backdrop-blur-xl"}
      `}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center shadow
              ${isDark
                ? "bg-blue-500/20 text-blue-400"
                : "bg-gradient-to-br from-indigo-600 to-blue-600 text-white"}
            `}
          >
            <Truck className="w-3.5 h-3.5" />
          </div>
          <h1
            className={`text-base font-black uppercase tracking-tight
              ${isDark ? "text-slate-100" : "text-slate-800"}
            `}
          >
            Vehicle Movement & distance covered
          </h1>
        </div>

        {/* External Link */}
        <button
          onClick={() => navigate("/vehicle")}
          className={`
            p-2 rounded-xl transition-all duration-300
            hover:scale-105 active:scale-95
            ${isDark
              ? "bg-slate-800/60 text-slate-400 hover:text-blue-400"
              : "bg-slate-100 text-slate-500 hover:text-blue-600"}
          `}
          title="View Vehicle Report"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* TOTAL DISTANCE */}
      <div
        className={`
          mb-5 p-4 rounded-xl border transition-all duration-500
          overflow-hidden relative group/main
          ${isDark
            ? "bg-slate-800/50 border-slate-700 hover:border-blue-500/60"
            : "bg-gradient-to-br from-blue-100/40 to-indigo-100/40 border-blue-200/50 hover:border-blue-400"}
        `}
      >
        <div className="absolute bottom-0 left-0 h-[3px] w-full bg-gradient-to-r from-blue-500 to-indigo-600 scale-x-0 group-hover/main:scale-x-100 transition-transform duration-500 origin-left" />

        <div className="text-center">
          <p
            className={`text-[9px] font-black tracking-[0.2em] uppercase mb-1.5
              ${isDark ? "text-slate-400" : "text-blue-600/70"}
            `}
          >
            Total Distance
          </p>
          <div className="flex items-end justify-center gap-2">
            <span
              className={`text-4xl font-black bg-clip-text text-transparent
                ${isDark
                  ? "bg-gradient-to-r from-blue-400 to-indigo-400"
                  : "bg-gradient-to-r from-indigo-600 to-blue-600"}
              `}
            >
              <Counter value={Math.round(kpis.totalDistance || 0)} duration={2} />
            </span>
            <span className="text-xs font-black text-slate-400 mb-1">KM</span>
          </div>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-2 gap-3">
        {KPIData.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`
                p-3 rounded-xl border transition-all duration-300
                overflow-hidden relative group/card hover:scale-[1.02]
                ${isDark
                  ? "bg-slate-800/50 border-slate-700"
                  : `bg-gradient-to-br ${card.bgGradient} ${card.borderColor}`}
              `}
            >
              <div
                className={`absolute bottom-0 left-0 h-[3px] scale-x-0
                  group-hover/card:scale-x-100 transition-transform duration-500
                  origin-left bg-gradient-to-r ${card.barColor}`}
                style={{ width: "100%" }}
              />

              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center
                    ${isDark ? "bg-slate-700/60" : card.iconBg}
                  `}
                >
                  <Icon className={`w-3.5 h-3.5 ${card.iconColor}`} />
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {card.title}
                </p>
              </div>

              <p
                className={`text-xl font-black
                  ${isDark ? "text-slate-100" : card.textColor}
                `}
              >
                <Counter value={card.value} duration={card.duration} />
                {card.unit && (
                  <span className="text-xs font-bold ml-1 opacity-60">
                    {card.unit}
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  </div>
</div>


  );
}
