
// import React, { useEffect, useState } from "react";
// import { getAllPlants } from '../../../services/plantService';
// import { getLatestPowerBill, getLatestWaterBill } from '../../../services/operationService'
// import { getLatestVehicleFuel, getVehiclesByPlant } from "../../../services/vehicleService";
// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";
// import UtilityDetailModal from "../UtilityDetailModal";

// const formatDisplayDate = (dateString) => {
//   if (!dateString || dateString === "-" ) return "-";

//   const date = new Date(dateString);

//   if (isNaN(date.getTime())) return "-"; // 🔥 prevents NaN/NaN/NaN

//   const day = String(date.getDate()).padStart(2, "0");
//   const month = String(date.getMonth() + 1).padStart(2, "0");
//   const year = date.getFullYear();

//   return `${day}/${month}/${year}`;
// };

// // ✅ Convert Bill Date → Previous Month Key (YYYY-MM)
// const getBillMonthKey = (dateString) => {
//   if (!dateString || dateString === "-") return null;

//   const date = new Date(dateString);
//   if (isNaN(date.getTime())) return null;

//   // 🔥 subtract 1 month (important logic)
//   date.setMonth(date.getMonth() - 1);

//   const year = date.getFullYear();
//   const month = String(date.getMonth() + 1).padStart(2, "0");

//   return `${year}-${month}`;
// };


// const Utility = () => {
//   const [module, setModule] = useState("power"); // power | water | vehicle
//   const [rows, setRows] = useState([]);
//   const [loading, setLoading] = useState(true);
// const [detail, setDetail] = useState(null);
// const [selectedZone, setSelectedZone] = useState("");
// const [selectedStatus, setSelectedStatus] = useState("");
// const [plantsData, setPlantsData] = useState([]);
// // ✅ Month Selector State (Default: Current Month)
// const [selectedMonth, setSelectedMonth] = useState(() => {
//   const today = new Date();
//   return today.toISOString().slice(0, 7); // YYYY-MM
// });

// // ===== UNIQUE ZONES FROM EXISTING DATA =====
// // const zoneOptions = [...new Set(rows.map(r => r.zone).filter(Boolean))];
// // ===== UNIQUE ZONES FROM ALL PLANTS =====
// const zoneOptions = [
//   ...new Set(plantsData.map(p => p.zones).filter(z => z !== null))
// ];



// const openDetail = (payload) => {
//   setDetail(payload);
// };

// const closeDetail = () => {
//   setDetail(null);
// };

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       const today = new Date().toISOString().slice(0, 10);

//       try {
//        const plants = await getAllPlants();
// setPlantsData(plants);   // ✅ store original plants

//         let result = [];

//         /* ================= POWER / WATER ================= */
//         if (module === "power" || module === "water") {
//           result = await Promise.all(
//             plants.map(async (p) => {
//               let data = null;

//               try {
//                 data =
//                   module === "power"
//                     ? await getLatestPowerBill(p.plantID, today)
//                     : await getLatestWaterBill(p.plantID, today);
//               } catch {
//                 data = null;
//               }

//               return {
//                 plantID: p.plantID,
//                 plantName: p.plantName,
//               zone: p.zones ?? "-",



//                 kld: p.kld,

//                 powerBill: data?.powerBill ?? false,
//                 lastBillDate: data?.lastBillDate ?? "-",
//                 totalNoOfUnits: data?.totalNoOfUnits ?? "-",
//                 totalBillAmount: data?.totalBillAmount ?? "-",

//                 waterUsed: data?.waterUsed ?? false,
//                 waterFilledDate: data?.waterFilledDate ?? "-",
//                 waterLtrs: data?.waterLtrs ?? "-",
//                 totalWaterAmount: data?.totalWaterAmount ?? "-"
//               };
//             })
//           );
//         }

//         /* ================= VEHICLE FUEL ================= */
// /* ================= VEHICLE FUEL (OPTIMIZED) ================= */
// if (module === "vehicle") {
//   const vehiclePromises = await Promise.all(
//     plants.map(async (p) => {
//       let vehicles = [];
//       try {
//         vehicles = await getVehiclesByPlant(p.plantID);
//       } catch {
//         vehicles = [];
//       }

//       return Promise.all(
//         vehicles.map(async (v) => {
//           let fuel = null;
//           try {
//             fuel = await getLatestVehicleFuel(v.vehicleID, today);
//           } catch {
//             fuel = null;
//           }

//           return {
//             plantID: p.plantID,
//             plantName: p.plantName,
//            zone: p.zones ?? "-",



//             vehicleID: v.vehicleID,
//             vehicleNumber: v.vehicleNumber,
//             vehicleModel: v.vehicleModelName,

//             lastFuelFilled: fuel?.lastFuelFilled ?? false,
//             lastFuelFilledDate: fuel?.lastFuelFilledDate ?? "-",
//             filledLiters: fuel?.filledLiters ?? "-",
//             currentOdometerReading:
//               fuel?.currentOdometerReading ?? "-"
//           };
//         })
//       );
//     })
//   );

//   // 🔥 flatten results
//   result = vehiclePromises.flat();
// }

//         setRows(result);
//       } catch (err) {
//         console.error("Utility fetch error", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [module]);

// const donwloadPdf = () => {
//   const doc = new jsPDF({
//     orientation: "landscape",
//     unit: "mm",
//     format: "a4"
//   });

//   doc.setFontSize(14);
//   doc.text(
//     `Utility Report – ${module.toUpperCase()}`,
//     14,
//     12
//   );

//   let head = [];
//   let body = [];

//   if (module === "power") {
//     head = [[
//       "S.No", "Plant ID", "Plant Name", "Zone", "KLD",
//       "Bill", "Last Bill Date", "Units", "Amount (₹)"
//     ]];

//     body = filteredRows.map((r, i) => ([
//       i + 1,
//       r.plantID,
//       r.plantName,
//       r.zone,
//       r.kld,
//       r.powerBill ? "YES" : "NO",
//       formatDisplayDate(r.lastBillDate),
//       r.totalNoOfUnits,
//       r.totalBillAmount
//     ]));
//   }

//   if (module === "water") {
//     head = [[
//       "S.No", "Plant ID", "Plant Name", "Zone", "KLD",
//       "Water Used", "Filled Date", "Liters", "Amount (₹)"
//     ]];

//     body = filteredRows.map((r, i) => ([
//       i + 1,
//       r.plantID,
//       r.plantName,
//       r.zone,
//       r.kld,
//       r.waterUsed ? "YES" : "NO",
//       formatDisplayDate(r.waterFilledDate),
//       r.waterLtrs,
//       r.totalWaterAmount
//     ]));
//   }

//   if (module === "vehicle") {
//     head = [[
//       "S.No", "Plant ID", "Plant",
//       "Vehicle No", "Model",
//       "Last Fuel Filled", "Filled Date",
//       "Liters", "Odometer"
//     ]];

//     body = filteredRows.map((r, i) => ([
//       i + 1,
//       r.plantID,
//       r.plantName,
//       r.vehicleNumber,
//       r.vehicleModel,
//       r.lastFuelFilled ? "YES" : "NO",
//       formatDisplayDate(r.lastFuelFilledDate),
//       r.filledLiters,
//       r.currentOdometerReading
//     ]));
//   }

//   autoTable(doc, {
//     head,
//     body,
//     startY: 18,
//     styles: {
//       fontSize: 8,
//       halign: "center"
//     },
//     headStyles: {
//       fillColor: [37, 99, 235],
//       textColor: 255,
//       fontStyle: "bold"
//     }
//   });

//   doc.save(`Utility_${module}.pdf`);
// };
// useEffect(() => {
//   setSelectedZone("");
//   setSelectedStatus("");
// }, [module]);


// const filteredRows = rows.filter((r) => {

//   // ===== POWER =====
//   if (module === "power") {

//     const billMonth = getBillMonthKey(r.lastBillDate);
//     const hasSelectedMonthBill =
//       billMonth === selectedMonth && r.powerBill;

//     // YES → Only selected month bills
//     if (selectedStatus === "yes") {
//       return hasSelectedMonthBill;
//     }

//     // Default → Show ALL plants
//     return true;
//   }

//   // ===== WATER =====
//   if (module === "water") {
//     if (selectedStatus === "yes" && !r.waterUsed)
//       return false;
//   }

//   // ===== VEHICLE =====
//   if (module === "vehicle") {
//     if (selectedStatus === "yes" && !r.lastFuelFilled)
//       return false;
//   }

//   // Zone filter
//   if (selectedZone && Number(r.zone) !== Number(selectedZone)) {
//     return false;
//   }

//   return true;
// });




// // ================= KPI CALCULATIONS =================

// // 1️⃣ Total Plants (Always full count)
// const totalPlants = rows.length;

// // 2️⃣ Bills Entered (Month Wise - Power)
// const totalBillsEntered = rows.filter((r) => {
//   if (module !== "power") return false;

//   const billMonth = getBillMonthKey(r.lastBillDate);
//   return billMonth === selectedMonth && r.powerBill;
// }).length;

// // 3️⃣ Total Units (Month Wise - Power)
// const totalConsumption = rows.reduce((total, r) => {
//   if (module !== "power") return total;

//   const billMonth = getBillMonthKey(r.lastBillDate);
//   if (billMonth === selectedMonth)
//     return total + (Number(r.totalNoOfUnits) || 0);

//   return total;
// }, 0);

// // 4️⃣ Total Amount (Month Wise - Power)
// const totalAmountPaid = rows.reduce((total, r) => {
//   if (module !== "power") return total;

//   const billMonth = getBillMonthKey(r.lastBillDate);
//   if (billMonth === selectedMonth && r.powerBill)
//     return total + (Number(r.totalBillAmount) || 0);

//   return total;
// }, 0);






// return (
//   <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
//     <div className="max-w-7xl mx-auto space-y-8">

//       {/* ================= HEADER ================= */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
//         <div>
//           <h1 className="text-3xl font-black text-slate-900">
//             Utility Resource
//           </h1>
//           <p className="text-slate-500 font-medium">
//             Monitor Power, Water & Fuel Consumption 
//           </p>
//         </div>

//         <div className="flex items-center gap-4">
//       <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
//               {['power', 'water', 'vehicle'].map((id) => (
//                 <button
//                   key={id}
//                   onClick={() => setModule(id)}
//                   className={`px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize ${
//                     module === id ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
//                   }`}
//                 >
//                   {id}
//                 </button>
//               ))}
//             </div>
//         {/* ✅ Month Selector */}
// <div className="flex flex-col">
//   <label className="text-xs font-semibold text-slate-500">
//     Select Month
//   </label>
//   <input
//     type="month"
//     value={selectedMonth}
//     onChange={(e) => setSelectedMonth(e.target.value)}
//     className="border rounded-lg px-3 py-2 text-sm"
//   />
// </div>

//         </div>
        
//       </div>

//       {/* ================= SECTION TITLE ================= */}
//       <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
//         <h2 className="text-xl font-black text-slate-800">
//           {module === "power" && "⚡ Power Consumption Details"}
//           {module === "water" && "💧 Water Consumption Details"}
//           {module === "vehicle" && "🚛 Vehicle Fuel Usage Details"}
//         </h2>
//       </div>

// {/* ================= KPI CARDS ================= */}
// {/* ================= KPI CARDS ================= */}
// <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

//   {/* TOTAL PLANTS */}
//   <div className="bg-white p-6 rounded-2xl shadow border text-center">
//     <p className="text-sm font-semibold text-slate-500">
//       🏭 Total Plants
//     </p>
//     <h3 className="text-3xl font-black text-slate-800">
//       {totalPlants}
//     </h3>
//   </div>

//  {/* 2️⃣ Bills Entered Plants */}
// <div className="bg-white p-6 rounded-2xl shadow border text-center">
//   <p className="text-sm font-semibold text-slate-500">
//     {module === "vehicle" ? "⛽ Fuel Entered" : "💳 Bills Entered"}
//   </p>
//   <h3 className="text-3xl font-black text-green-600">
//     {totalBillsEntered}
//   </h3>
// </div>


//   {/* TOTAL CONSUMPTION / LITERS */}
//   <div className="bg-white p-6 rounded-2xl shadow border text-center">
//     <p className="text-sm font-semibold text-slate-500">
//       {module === "power" && "⚡ Total Units Used"}
//       {module === "water" && "💧 Total Water Used"}
//       {module === "vehicle" && "⛽ Total Liters"}
//     </p>

//     <h3 className="text-3xl font-black text-slate-800">
//       {totalConsumption.toLocaleString("en-IN")}
//     </h3>
//   </div>

//   {/* TOTAL AMOUNT PAID (ONLY POWER/WATER) */}
//   {module !== "vehicle" && (
//     <div className="bg-white p-6 rounded-2xl shadow border text-center">
//       <p className="text-sm font-semibold text-slate-500">
//         💰 Total Amount Paid
//       </p>
//       <h3 className="text-3xl font-black text-slate-800">
//         ₹ {totalAmountPaid.toLocaleString("en-IN")}
//       </h3>
//     </div>
//   )}

// </div>


//       {/* ================= TABLE ================= */}
//       {loading ? (
//         <div className="bg-white p-10 rounded-2xl shadow text-center text-slate-500 font-semibold">
//           Loading utility details…
//         </div>
//       ) : (
// <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">

//   {/* ===== TABLE HEADER BAR ===== */}
// <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 border-b bg-slate-50">

//   {/* LEFT SIDE */}
//   <div className="flex flex-wrap items-center gap-3">

//     <div className="flex flex-col">
//       <label className="text-xs font-semibold text-slate-500">Filter by Zone</label>
//       <select
//         className="border rounded-lg px-3 py-2 text-sm"
//         value={selectedZone}
//         onChange={(e) => setSelectedZone(e.target.value)}
//       >
//         <option value="">All Zones</option>
//         {zoneOptions.map((zone, index) => (
//           <option key={index} value={zone}>
//             {zone}
//           </option>
//         ))}
//       </select>
//     </div>

//     <div className="flex flex-col">
//       <label className="text-xs font-semibold text-slate-500">Filter by Status</label>
//       <select
//         className="border rounded-lg px-3 py-2 text-sm"
//         value={selectedStatus}
//         onChange={(e) => setSelectedStatus(e.target.value)}
//       >
//         <option value="">All</option>
//         <option value="yes">YES Only</option>
//         {/* <option value="no">NO Only</option> */}
//       </select>
//     </div>

//   </div>

//   {/* RIGHT SIDE */}
//   <div className="flex items-center gap-3">
//     <p className="text-xs text-slate-500">
//       Showing {filteredRows.length} of {rows.length}
//     </p>

//     <button
//       onClick={donwloadPdf}
//       className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-blue-700"
//     >
//       Download PDF
//     </button>
//   </div>

// </div>


//           <div className="overflow-x-auto">
            
//             <table className="w-full min-w-[1000px] text-sm border-collapse">
//               <thead className="bg-slate-100 text-xs uppercase font-black text-slate-500">
//                 <tr>
//                   <th className="px-4 py-3 text-center">S.No</th>

//                   {module !== "vehicle" && (
//                     <>
//                       <th className="px-4 py-3">Plant ID</th>
//                       <th className="px-4 py-3">Plant Name</th>
//                       <th className="px-4 py-3 text-center">Zone</th>
//                       <th className="px-4 py-3 text-center">KLD</th>
//                     </>
//                   )}

//                   {module === "power" && (
//                     <>
//                       <th className="px-4 py-3 text-center">Bill Received</th>
//                       <th className="px-4 py-3 text-center">Last Bill Date</th>
//                       <th className="px-4 py-3 text-center">Consumed Units(Kwh)</th>
//                       <th className="px-4 py-3 text-center">Amount (₹)</th>
//                       <th className="px-4 py-3 text-center">Details</th>
//                     </>
//                   )}

//                   {module === "water" && (
//                     <>
//                       <th className="px-4 py-3 text-center">Water Used</th>
//                       <th className="px-4 py-3 text-center">Last Received Date</th>
//                       <th className="px-4 py-3 text-center">Liters</th>
//                       <th className="px-4 py-3 text-center">Amount (₹)</th>
//                       <th className="px-4 py-3 text-center">Details</th>
//                     </>
//                   )}

//                   {module === "vehicle" && (
//                     <>
//                       <th className="px-4 py-3">Plant ID</th>
//                       <th className="px-4 py-3">Plant</th>
//                       <th className="px-4 py-3">Vehicle No</th>
//                       <th className="px-4 py-3">Model</th>
//                       <th className="px-4 py-3 text-center">Fuel Filled</th>
//                       <th className="px-4 py-3 text-center">Last Filled Date</th>
//                       <th className="px-4 py-3 text-center">Liters</th>
//                       <th className="px-4 py-3 text-center">Odometer</th>
//                       <th className="px-4 py-3 text-center">Details</th>
//                     </>
//                   )}
//                 </tr>
//               </thead>

//               <tbody className="divide-y divide-slate-100">
//                 {filteredRows.map((r, i) => (
//                   <tr key={i} className="hover:bg-slate-50 transition">
//                     <td className="px-4 py-3 text-center font-semibold">
//                       {i + 1}
//                     </td>

//                     {module === "power" && (
//                       <>
//                       {(() => {
//   const billMonth = getBillMonthKey(r.lastBillDate);
//   const hasSelectedMonthBill =
//     billMonth === selectedMonth && r.powerBill;

//   return (
//     <>

//                         <td className="px-4 py-3">{r.plantID}</td>
//                         <td className="px-4 py-3 font-semibold">{r.plantName}</td>
//                         <td className="px-4 py-3 text-center">{r.zone}</td>
//                         <td className="px-4 py-3 text-center">{r.kld}</td>

//                    <td className="px-4 py-3 text-center">
//   {hasSelectedMonthBill ? (
//     <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold">
//       YES
//     </span>
//   ) : (
//     <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-xs font-bold">
//       NO
//     </span>
//   )}
// </td>

// <td className="px-4 py-3 text-center">
//   {hasSelectedMonthBill
//     ? formatDisplayDate(r.lastBillDate)
//     : "-"}
// </td>




// <td className="px-4 py-3 text-center">
//   {hasSelectedMonthBill
//     ? r.totalNoOfUnits
//     : "-"}
// </td>


//                        <td className="px-4 py-3 text-center">
//   {hasSelectedMonthBill && typeof r.totalBillAmount === "number"
//     ? `₹ ${r.totalBillAmount.toLocaleString("en-IN")}`
//     : "-"}
// </td>


//                         <td className="px-4 py-3 text-center">
//                           <button
//                             onClick={() =>
//                               openDetail({
//                                 module,
//                                 plantId: r.plantID,
//                                 plantName: r.plantName
//                               })
//                             }
//                             className="text-blue-600 font-bold hover:underline"
//                           >
//                             View
//                           </button>
//                         </td>
//                      </>
//   );
// })()}
//   </>
// )}

// {module === "water" && (
//   <>
//     <td className="px-4 py-3">{r.plantID}</td>
//     <td className="px-4 py-3 font-semibold">{r.plantName}</td>
//     <td className="px-4 py-3 text-center">{r.zone}</td>
//     <td className="px-4 py-3 text-center">{r.kld}</td>

//     <td className="px-4 py-3 text-center">
//       <span className={`px-3 py-1 rounded-full text-xs font-bold ${
//         r.waterUsed
//           ? "bg-emerald-100 text-emerald-600"
//           : "bg-rose-100 text-rose-600"
//       }`}>
//         {r.waterUsed ? "YES" : "NO"}
//       </span>
//     </td>

//     <td className="px-4 py-3 text-center">
//       {formatDisplayDate(r.waterFilledDate)}
//     </td>

//     <td className="px-4 py-3 text-center">{r.waterLtrs}</td>

//     <td className="px-4 py-3 text-center">
//       {typeof r.totalWaterAmount === "number"
//         ? `₹ ${r.totalWaterAmount.toLocaleString("en-IN")}`
//         : "-"}
//     </td>

//     <td className="px-4 py-3 text-center">
//       <button
//         onClick={() =>
//           openDetail({
//             module,
//             plantId: r.plantID,
//             plantName: r.plantName
//           })
//         }
//         className="text-blue-600 font-bold hover:underline"
//       >
//         View
//       </button>
//     </td>
//   </>
// )}

// {module === "vehicle" && (
//   <>
//     <td className="px-4 py-3">{r.plantID}</td>
//     <td className="px-4 py-3 font-semibold">{r.plantName}</td>
//     <td className="px-4 py-3 text-center">{r.vehicleNumber}</td>
//     <td className="px-4 py-3">{r.vehicleModel}</td>

//     <td className="px-4 py-3 text-center">
//       <span className={`px-3 py-1 rounded-full text-xs font-bold ${
//         r.lastFuelFilled
//           ? "bg-emerald-100 text-emerald-600"
//           : "bg-rose-100 text-rose-600"
//       }`}>
//         {r.lastFuelFilled ? "YES" : "NO"}
//       </span>
//     </td>

//     <td className="px-4 py-3 text-center">
//       {formatDisplayDate(r.lastFuelFilledDate)}
//     </td>

//     <td className="px-4 py-3 text-center">{r.filledLiters}</td>

//     <td className="px-4 py-3 text-center">
//       {r.currentOdometerReading}
//     </td>

//     <td className="px-4 py-3 text-center">
//       <button
//         onClick={() =>
//           openDetail({
//             module: "vehicle",
//             vehicleId: r.vehicleID,
//             plantName: r.plantName
//           })
//         }
//         className="text-blue-600 font-bold hover:underline"
//       >
//         View
//       </button>
//     </td>
//   </>
// )}


//                     {/* WATER + VEHICLE sections remain SAME as your logic */}
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}

//       {detail && (
//         <UtilityDetailModal
//           detail={detail}
//           onClose={closeDetail}
//         />
//       )}
//     </div>
//   </div>
// );

// };

// export default Utility;




import React, { useState } from "react";
import WaterBill from "./WaterBill";
import VehicleFuel from "./VehicleFuel";
import DgReport from "./DGReport";

const Utility = () => {

const [activeTab, setActiveTab] = useState("water");

return ( <div className="p-4">


  {/* Toggle Buttons */}
  <div className="flex gap-3 mb-4">

    <button
      onClick={() => setActiveTab("water")}
      className={`px-4 py-2 rounded font-semibold ${
        activeTab === "water"
          ? "bg-indigo-600 text-white"
          : "bg-gray-200"
      }`}
    >
      Water Bill
    </button>

    <button
      onClick={() => setActiveTab("fuel")}
      className={`px-4 py-2 rounded font-semibold ${
        activeTab === "fuel"
          ? "bg-indigo-600 text-white"
          : "bg-gray-200"
      }`}
    >
      Vehicle Fuel
    </button>

<button
      onClick={() => setActiveTab("dg")}
      className={`px-4 py-2 rounded font-semibold ${
        activeTab === "dg"
          ? "bg-indigo-600 text-white"
          : "bg-gray-200"
      }`}
    >
      DG Report
    </button>

  </div>

  {/* Conditional Rendering */}
  {activeTab === "water" && <WaterBill />}
  {activeTab === "fuel" && <VehicleFuel />}
{activeTab === "dg" && <DgReport />}
</div>

);
};

export default Utility;

