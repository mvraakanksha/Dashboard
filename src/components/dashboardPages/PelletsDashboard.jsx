// import React, { useMemo, useState } from "react";
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

// /* ---------------- TOOLTIP ---------------- */
// const PelletsTooltip = ({ active, payload, materialType }) => {
//   if (!active || !payload?.length) return null;
//   const d = payload[0].payload;

//   return (
//     <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-3 text-xs w-64">
//       <p className="font-bold text-gray-800 border-b pb-1 mb-2">
//         {d.label} ({d.kld} KLD)
//       </p>

//       <div className="space-y-1">
//         <div className="flex justify-between">
//           <span className="text-gray-500 capitalize">{materialType} Used:</span>
//           <span className="font-bold text-blue-700">
//             {materialType === "pellets" ? d.pelletsUsed.toFixed(1) : d.polymerUsed.toFixed(1)} Kg
//           </span>
//         </div>
//         <div className="flex justify-between">
//           <span className="text-gray-500 capitalize">Current Stock:</span>
//           <span className="font-bold text-green-600">
//             {materialType === "pellets" ? d.pelletsStock.toFixed(1) : d.polymerStock.toFixed(1)} Kg
//           </span>
//         </div>
//       </div>
//     </div>
//   );
// };

// /* ---------------- TOP BAR LABEL ---------------- */
// const TopBarLabel = ({ x, y, width, value }) => {
//   if (value == null || value <= 0) return null;
//   return (
//     <text
//       x={x + width / 2}
//       y={y - 8}
//       textAnchor="middle"
//       fill="#475569"
//       fontSize={11}
//       fontWeight={700}
//       pointerEvents="none"
//     >
//       {Number(value).toFixed(1)}
//     </text>
//   );
// };

// export default function PelletsDashboard({ chartData }) {
//   const navigate = useNavigate();
//   const [materialType, setMaterialType] = useState("pellets");

//   const sortedChartData = useMemo(() => {
//     return [...(chartData || [])].sort((a, b) =>
//       materialType === "pellets"
//         ? b.pelletsUsed - a.pelletsUsed
//         : b.polymerUsed - a.polymerUsed
//     );
//   }, [chartData, materialType]);

//   if (!chartData || chartData.length === 0) {
//     return (
//       <div className="h-[300px] flex items-center justify-center text-gray-400 italic">
//         No pellets / polymer data available
//       </div>
//     );
//   }

//   const selectedKey = materialType === "pellets" ? "pelletsUsed" : "polymerUsed";
//   const chartWidth = sortedChartData.length > 12 ? sortedChartData.length * 85 : "100%";

//   return (
//     <div className="w-full">
//       <div className="flex justify-end items-center mb-4 px-2">
//         <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
//           <button
//             onClick={() => setMaterialType("pellets")}
//             className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
//               materialType === "pellets" ? "bg-red-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-200"
//             }`}
//           >
//             Pellets
//           </button>
//           <button
//             onClick={() => setMaterialType("polymer")}
//             className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
//               materialType === "polymer" ? "bg-blue-800 text-white shadow-sm" : "text-gray-500 hover:bg-gray-200"
//             }`}
//           >
//             Polymer
//           </button>
//         </div>
//       </div>

//       <div className="overflow-x-auto custom-scrollbar pb-2">
//         {/* Height set to 320 to match Biochar component */}
//         <div style={{ width: chartWidth, height: 320 }}>
//           <ResponsiveContainer width="100%" height="100%">
//             <BarChart
//               data={sortedChartData}
//               margin={{ top: 25, right: 20, left: 10, bottom: 65 }}
//               barCategoryGap={20}
//             >
//               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />

//               <XAxis
//                 dataKey="label"
//                 interval={0}
//                 tick={({ x, y, payload }) => (
//                   <text
//                     x={x}
//                     y={y + 12}
//                     textAnchor="end"
//                     fill="#64748b"
//                     fontSize={10}
//                     fontWeight={600}
//                     transform={`rotate(-40 ${x} ${y + 12})`}
//                     className="cursor-pointer hover:fill-blue-600 transition-colors"
//                     onClick={() => navigate(`/pellets-view/${sortedChartData.find(d => d.label === payload.value)?.plantId}/${payload.value}?type=${materialType}`)}
//                   >
//                     {payload.value.length > 12 ? `${payload.value.substring(0, 10)}..` : payload.value}
//                   </text>
//                 )}
//               />

//               <YAxis
//                 fontSize={10}
//                 fontWeight={600}
//                 tickFormatter={(val) => `${val}kg`}
//                 stroke="#94a3b8"
//               />

//               <Tooltip content={<PelletsTooltip materialType={materialType} />} cursor={{ fill: '#f8fafc' }} />

//               <Bar
//                 dataKey={selectedKey}
//                 fill={materialType === "pellets" ? "#ef4444" : "#1e40af"}
//                 radius={[4, 4, 0, 0]}
//                 barSize={30}
//               >
//                 <LabelList content={<TopBarLabel />} />
//               </Bar>
//             </BarChart>
//           </ResponsiveContainer>
//         </div>
//       </div>

//       <div className="flex justify-between items-center mt-2 px-2 text-[11px] text-gray-500 font-medium border-t pt-3">
//         <span>*Showing consumption by plant</span>
//         <span className="italic text-gray-400">Click name to view stock history</span>
//       </div>
//     </div>
//   );
// }