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

// /* ---------------- TOOLTIP ---------------- */
// const BiocharTooltip = ({ active, payload }) => {
//   if (!active || !payload?.length) return null;
//   const d = payload[0].payload;

//   return (
//     <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-3 text-xs w-60">
//       <p className="font-bold text-teal-800 border-b pb-1 mb-2">
//         {d.label} ({d.kld} KLD)
//       </p>
//       <div className="flex justify-between items-center">
//         <span className="text-gray-600">Biochar Produced:</span>
//         <span className="font-bold text-teal-600 text-sm">
//           {Number(d.biochar).toFixed(1)} Kg
//         </span>
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
//       fill="#0F766E"
//       fontSize={12}
//       fontWeight={800}
//       pointerEvents="none"
//     >
//       {Number(value).toFixed(1)}
//     </text>
//   );
// };

// /* ================================================= */
// /* BIOCHAR DASHBOARD */
// /* ================================================= */
// export default function BiocharDashboard({ chartData }) {
//   const navigate = useNavigate();

//   const sortedData = useMemo(() => {
//     return [...(chartData || [])].sort((a, b) => b.biochar - a.biochar);
//   }, [chartData]);

//   if (!chartData || chartData.length === 0) {
//     return (
//       <div className="h-[300px] flex items-center justify-center text-gray-400 italic">
//         No biochar data available
//       </div>
//     );
//   }

//   // ✅ INCREASED HEIGHT TO FILL SPACE
//   // width remains scrollable if plants > 12
//   const containerWidth = sortedData.length > 12 ? sortedData.length * 80 : "100%";

//   return (
//     <div className="w-full">
//       <div className="overflow-x-auto custom-scrollbar pb-2">
//         {/* ✅ Height increased to 320 to look better in the vertical stack */}
//         <div style={{ width: containerWidth, height: 320 }}>
//           <ResponsiveContainer width="100%" height="100%">
//             <BarChart
//               data={sortedData}
//               margin={{ top: 30, right: 20, left: 10, bottom: 60 }}
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
//                     fill="#475569"
//                     fontSize={10}
//                     fontWeight={600}
//                     transform={`rotate(-35 ${x} ${y + 12})`}
//                     className="cursor-pointer hover:fill-teal-600 transition-colors"
//                     onClick={() => navigate(`/biochar-view/${sortedData.find(d => d.label === payload.value)?.plantId}/${payload.value}`)}
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

//               <Tooltip content={<BiocharTooltip />} cursor={{ fill: '#f0fdfa' }} />

//               <Bar
//                 dataKey="biochar"
//                 fill="#0D9488"
//                 radius={[4, 4, 0, 0]}
//                 barSize={32}
//                 isAnimationActive={true}
//               >
//                 <LabelList content={<TopBarLabel />} />
//               </Bar>
//             </BarChart>
//           </ResponsiveContainer>
//         </div>
//       </div>

//       <div className="flex justify-between items-center mt-2 px-2 text-[11px] text-gray-500 font-medium border-t pt-3">
//         <span>*Sorted by production volume</span>
//         <span className="text-teal-600 italic">Scroll horizontally if needed</span>
//       </div>
//     </div>
//   );
// }