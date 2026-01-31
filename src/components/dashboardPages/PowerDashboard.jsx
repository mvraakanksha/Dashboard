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

// /* ================= INDIAN FORMAT ================= */
// const formatIndianNumber = (num) => {
//   if (num == null) return "0";
//   const x = Math.round(num).toString();
//   const lastThree = x.slice(-3);
//   const other = x.slice(0, -3);
//   return other
//     ? other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
//     : lastThree;
// };

// /* ================= BAR VALUE ================= */
// const BarValueLabel = ({ x, y, width, value, fill }) => {
//   if (!value || value <= 0) return null;

//   return (
//     <text
//       x={x + width / 2}
//       y={y - 6}
//       textAnchor="middle"
//       fill={fill}
//       fontSize={11}
//       fontWeight={700}
//       pointerEvents="none"
//     >
//       {value.toFixed(2)}
//     </text>
//   );
// };

// /* ================= CLICKABLE TICK ================= */
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
//       transform={`rotate(-45 ${x} ${y + 10})`}
//       style={{
//         cursor: plant ? "pointer" : "default",
//         whiteSpace: "nowrap",
//         textDecoration: "underline"
//       }}
//       onClick={() => {
//         if (plant) {
//           navigate(`/power-view/${plant.plantId}/${plant.label}`);
//         }
//       }}
//     >
//       {payload.value}
//     </text>
//   );
// };

// /* ================= TOOLTIP ================= */
// const PowerTooltip = ({ active, payload }) => {
//   if (!active || !payload?.length) return null;

//   const row = payload[0].payload;
//   const imp = payload.find(p => p.dataKey === "importPower");
//   const exp = payload.find(p => p.dataKey === "exportPower");
//   const run = payload.find(p => p.dataKey === "runHours");

//   return (
//     <div className="bg-white border shadow-md rounded p-3 text-xs w-64">
//       <p className="font-bold text-blue-900">{row.label}</p>

//       {imp?.value > 0 && (
//         <p className="text-red-700 font-semibold">
//           Power Consumption: {imp.value.toFixed(2)} Kwh
//         </p>
//       )}

//       {exp?.value > 0 && (
//         <p className="text-green-700 font-semibold">
//           Solar Generated: {exp.value.toFixed(2)} Kwh
//         </p>
//       )}

//       {run?.value > 0 && (
//         <p className="text-blue-700 font-semibold">
//           Run Hours: {run.value.toFixed(2)} Hrs
//         </p>
//       )}
//     </div>
//   );
// };

// /* ================================================= */
// /* POWER DASHBOARD */
// /* ================================================= */
// export default function PowerDashboard({ chartData }) {
//   const navigate = useNavigate();

//   // ✅ hooks always run
//   const plantMap = useMemo(() => {
//     const map = {};
//     (chartData || []).forEach(p => (map[p.label] = p));
//     return map;
//   }, [chartData]);

//  const sortedChartData = useMemo(() => {
//     return [...chartData].sort(
//       (a, b) =>
//         Math.max(
//           b.importPower || 0,
//           b.exportPower || 0,
//           b.runHours || 0
//         ) -
//         Math.max(
//           a.importPower || 0,
//           a.exportPower || 0,
//           a.runHours || 0
//         )
//     );
//   }, [chartData]);

//   const chartWidth =
//     sortedChartData.length > 12
//       ? sortedChartData.length * 90
//       : "100%";

//   if (!sortedChartData.length) {
//     return (
//       <div className="bg-white rounded-2xl shadow p-6 text-center text-gray-500">
//         No power data available
//       </div>
//     );
//   }

//   return (
//     <div >
      
//       <div className="overflow-x-auto">
//         <div style={{ width: chartWidth, height: 320 }}>
//           <ResponsiveContainer width="100%" height="100%">
//             <BarChart
//               data={sortedChartData}
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
//                   value: "Power (Kwh) / Run Hrs",
//                   angle: -90,
//                   position: "insideLeft",
//                   dy: 80,
//                   fontWeight: "bold"
//                 }}
//               />

//               <Tooltip content={<PowerTooltip />} />

//               <Bar dataKey="importPower" fill="#af0000" barSize={22}>
//                 <LabelList
//                   content={(p) => (
//                     <BarValueLabel {...p} fill="#af0000" />
//                   )}
//                 />
//               </Bar>

//               <Bar dataKey="exportPower" fill="#018f20" barSize={22}>
//                 <LabelList
//                   content={(p) => (
//                     <BarValueLabel {...p} fill="#018f20" />
//                   )}
//                 />
//               </Bar>

//               <Bar dataKey="runHours" fill="#1E40AF" barSize={22}>
//                 <LabelList
//                   content={(p) => (
//                     <BarValueLabel {...p} fill="#1E40AF" />
//                   )}
//                 />
//               </Bar>
//             </BarChart>
//           </ResponsiveContainer>
//         </div>
//       </div>

//       {/* LEGEND */}
//       <p className="flex justify-center gap-6 mt-4 text-sm font-semibold text-[#003f8a]">
//         <span className="flex items-center gap-2">
//           <span className="w-3 h-3 bg-[#af0000] rounded-sm" />
//           Power Consumption
//         </span>
//         <span className="flex items-center gap-2">
//           <span className="w-3 h-3 bg-[#018f20] rounded-sm" />
//           Solar Generation
//         </span>
//         <span className="flex items-center gap-2">
//           <span className="w-3 h-3 bg-[#1E40AF] rounded-sm" />
//           Run Hours
//         </span>
//       </p>

//       <p className="text-center text-sm font-bold text-[#333] mt-3">
//         Plants
//       </p>
//     </div>
//   );
// }
