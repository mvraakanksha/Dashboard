// import React, { useMemo } from "react";
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
//   CartesianGrid,
//   LabelList
// } from "recharts";
// import { useNavigate } from "react-router-dom";

// /* --------- AM/PM MARK --------- */
// const mark = (v) => (v === true ? "✔" : v === false ? "✘" : "-");

// /* --------- TOOLTIP --------- */
// const AttendanceTooltip = ({ active, payload }) => {
//   if (!active || !payload?.length) return null;
//   const plant = payload[0].payload;

//   return (
//     <div className="bg-white text-xs border border-gray-200 p-3 rounded-lg shadow-xl w-64">
//       <p className="font-bold text-blue-900 border-b pb-1 mb-2">{plant.label}</p>
//       <div className="space-y-1">
//         {plant.employees.map((e) => {
//           const op = plant.attendance.find((x) => x.employeeId === e.employeeId);
//           return (
//             <div key={e.employeeId} className="flex justify-between">
//               <span className="text-gray-600">{e.designation}:</span>
//               <span className="font-mono font-bold text-blue-700">
//                 AM {mark(op?.plantOp?.attendanceAm)} | PM {mark(op?.plantOp?.attendancePm)}
//               </span>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// /* --------- BAR LABEL --------- */
// const BarLabel = ({ x, y, width, value, index, data }) => {
//   const row = data[index];
//   if (!row) return null;

//   return (
//     <text
//       x={x + width + 8}
//       y={y + 16} 
//       fill="#013B88"
//       fontSize={12}
//       fontWeight={700}
//     >
//       {row.presentUnits}/{row.totalEmployees}
//     </text>
//   );
// };

// export default function AttendanceDashboard({ chartData }) {
//   const navigate = useNavigate();

//   const plantMap = useMemo(() => {
//     const map = {};
//     (chartData || []).forEach((p) => (map[p.label] = p));
//     return map;
//   }, [chartData]);

//   if (!chartData || chartData.length === 0) {
//     return (
//       <div className="h-[600px] flex items-center justify-center text-gray-400 italic bg-white rounded-2xl shadow">
//         No attendance data available
//       </div>
//     );
//   }

//   /**
//    * ✅ ADJUSTED HEIGHTS
//    * 1. maxHeight: Set to 720px to match the combined height of two right-hand cards.
//    * 2. chartHeight: Increased multiplier to 50 for more spacing between plant bars.
//    */
//   const chartHeight = Math.max(chartData.length * 50, 680);

//   return (
//     <div>
   

//       {/* ✅ INCREASED MAX-HEIGHT CONTAINER */}
//       <div 
//         className="overflow-y-auto pr-2 custom-scrollbar flex-grow" 
//         style={{ maxHeight: "720px" }}
//       >
//         <div style={{ height: chartHeight }}>
//           <ResponsiveContainer width="100%" height="100%">
//             <BarChart
//               layout="vertical"
//               data={chartData}
//               margin={{ top: 10, right: 60, left: 10, bottom: 5 }}
//             >
//               <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
              
//               <XAxis type="number" hide domain={[0, 'dataMax + 1']} />

//               <YAxis
//                 type="category"
//                 dataKey="label"
//                 width={110}
//                 tick={({ x, y, payload }) => (
//                   <text
//                     x={x}
//                     y={y}
//                     dy={4}
//                     textAnchor="end"
//                     fill="#475569"
//                     fontSize={11}
//                     fontWeight={600}
//                     className="cursor-pointer hover:fill-blue-600 transition-colors"
//                     onClick={() => {
//                       const plant = plantMap[payload.value];
//                       if (plant) {
//                         navigate(`/attendance-view/${plant.plantId}/${encodeURIComponent(plant.label)}`);
//                       }
//                     }}
//                   >
//                     {payload.value.length > 15 ? `${payload.value.substring(0, 13)}..` : payload.value}
//                   </text>
//                 )}
//               />

//               <Tooltip content={<AttendanceTooltip />} cursor={{ fill: '#f8fafc' }} />

//               <Bar
//                 dataKey="presentUnits"
//                 fill="#3b82f6"
//                 radius={[0, 4, 4, 0]}
//                 barSize={24}
//               >
//                 <LabelList
//                   content={(props) => <BarLabel {...props} data={chartData} />}
//                 />
//               </Bar>
//             </BarChart>
//           </ResponsiveContainer>
//         </div>
//       </div>
      
//       <div className="flex justify-between items-center mt-6 px-2 text-[11px] text-gray-500 font-medium border-t pt-3">
//         <span>Units: Count of Present Employees</span>
//         <span className="text-blue-600 italic font-semibold">Click plant name for details</span>
//       </div>
//     </div>
//   );
// }

import {
  ChevronRight, Droplets, Recycle, BarChart3, Users,
  Zap, Sun, Activity, Truck, Route, Gauge, ArrowUpRight,
  AlertTriangle, Layers, Moon
} from "lucide-react";
import { ExternalLink} from "lucide-react";
import { useNavigate } from "react-router-dom";
 import { useEffect, useState } from "react";

const AttendanceDashboard = ({ attendancePercent, present, absent, total, isDark, cardClass }) => {
 
const Counter = ({ value, duration = 1.5, decimals = 1 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const finalValue = Number(value) || 0; // ✅ keep decimal
    const increment = finalValue / (duration * 60);

    const timer = setInterval(() => {
      start += increment;

      if (start >= finalValue) {
        setCount(finalValue);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <span>
      {Number.isInteger(count) ? count : count.toFixed(decimals)}
    </span>
  );
};

  const getStatus = (percent) => {
    if (percent >= 80) return { label: "Excellent", color: "emerald" };
    if (percent >= 40) return { label: "Average", color: "amber" };
    return { label: "Critical", color: "rose" };
  };
const navigate = useNavigate();

  const status = getStatus(attendancePercent);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (attendancePercent / 100) * circumference;

  const strokeColor = 
    status.color === "emerald" 
      ? "stroke-emerald-500" 
      : status.color === "amber" 
      ? "stroke-amber-500" 
      : "stroke-rose-500";

  return (
    <div>
  {/* HEADER */}
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-4">
      <div
        className={`p-3 rounded-2xl ${
          isDark
            ? "bg-indigo-500/10 text-indigo-400"
            : "bg-indigo-50 text-indigo-600"
        }`}
      >
        <Users className="w-6 h-6" />
      </div>

      <h4
        className={`font-black uppercase tracking-tight ${
          isDark ? "text-slate-100" : "text-slate-800"
        }`}
      >
        Attendance
      </h4>
    </div>

    {/* 🔗 External link */}
    <button
      onClick={() => navigate("/attendance")}
      title="View Attendance Report"
      className={`
        p-2 rounded-xl transition-all duration-300
        hover:scale-105 active:scale-95
        ${isDark
          ? "bg-slate-800/60 text-slate-400 hover:text-indigo-400"
          : "bg-slate-100 text-slate-500 hover:text-indigo-600"}
      `}
    >
      <ExternalLink className="w-5 h-5" />
    </button>
  </div>

  {/* GAUGE */}
  <div className="flex items-center justify-center gap-8 my-6">
    <div className="relative flex items-center justify-center">
      <svg className="w-24 h-24 -rotate-90">
        {/* Track */}
        <circle
          cx="48"
          cy="48"
          r="40"
          strokeWidth="8"
          fill="transparent"
          className={isDark ? "stroke-slate-800" : "stroke-slate-200"}
        />

        {/* Progress */}
        <circle
          cx="48"
          cy="48"
          r="40"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-700 ease-out ${strokeColor}`}
        />
      </svg>

      {/* CENTER TEXT */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`text-2xl font-black tracking-tighter ${
            isDark ? "text-white" : "text-slate-900"
          }`}
        >
   <Counter value={attendancePercent} duration={2} />%

        </span>
      </div>
    </div>

    <div>
      <p
        className={`text-sm font-black ${
          status.color === "emerald"
            ? "text-emerald-500"
            : status.color === "amber"
            ? "text-amber-500"
            : "text-rose-500"
        }`}
      >
        {status.label}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
        Staff Presence
      </p>
    </div>
  </div>

  {/* FOOTER STATS */}
 <div
  className={`grid grid-cols-3 gap-4 p-4 rounded-2xl ${
    isDark ? "bg-slate-800/40" : "bg-slate-50"
  }`}
>
  <div className="text-center">
    <p className="text-[10px] uppercase text-slate-400 font-bold">Present</p>
    <p className="text-lg font-black text-emerald-500">
      <Counter value={present} />
    </p>
  </div>

  <div
    className={`text-center border-x ${
      isDark ? "border-slate-700" : "border-slate-200"
    }`}
  >
    <p className="text-[10px] uppercase text-slate-400 font-bold">Absent</p>
    <p className="text-lg font-black text-rose-500">
      <Counter value={absent} />
    </p>
  </div>

  <div className="text-center">
    <p className="text-[10px] uppercase text-slate-400 font-bold">Total</p>
    <p
      className={`text-lg font-black ${
        isDark ? "text-slate-200" : "text-slate-800"
      }`}
    >
      <Counter value={total} />
    </p>
  </div>
</div>

</div>

  );
};



export default AttendanceDashboard
