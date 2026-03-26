import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from "recharts";

import { Zap, Receipt } from "lucide-react";
import { getPowerBillDetailsByPlant } from "../../../services/operationService";
import { getAllPlants } from "../../../services/plantService";

const formatDisplayDate = (dateString) => {
  if (!dateString || dateString === "-" ) return "-";

  const date = new Date(dateString);

  if (isNaN(date.getTime())) return "-"; // 🔥 prevents NaN/NaN/NaN

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};



const DetailTooltip = ({ active, payload, mode }) => {

  if (!active || !payload || !payload.length) return null;

  const row = payload[0].payload;

  return (
    <div className="bg-white border border-slate-200 shadow-xl rounded-lg p-4 text-xs w-60">

      <p className="font-bold text-blue-900 mb-2 text-sm">
        {mode === "yearly" ? row.plant : row.month}
      </p>

      <div className="space-y-1">

        {/* Units */}
        <div className="flex justify-between">
          <span className="font-semibold text-slate-600">Units</span>
          <span className="font-bold text-blue-600">
            {row.units?.toLocaleString("en-IN") ?? "-"} Kwh
          </span>
        </div>

        {/* Amount for BOTH modes */}
        <div className="flex justify-between">
          <span className="font-semibold text-slate-600">
            {mode === "yearly" ? "Total Amount" : "Bill Amount"}
          </span>
          <span className="font-bold text-green-600">
            {row.amount != null
              ? `₹ ${row.amount.toLocaleString("en-IN")}`
              : "-"}
          </span>
        </div>

        {/* Bill Date only for monthly */}
        {mode === "monthly" && (
          <div className="flex justify-between">
            <span className="font-semibold text-slate-600">Bill Date</span>
            <span className="font-bold text-slate-800">
              {formatDisplayDate(row.billDate) ?? "-"}
            </span>
          </div>
        )}

      </div>

    </div>
  );
};

export default function PowerBillIndetail() {

  const CURRENT_YEAR = new Date().getFullYear();

  const [plants,setPlants] = useState([]);
  const [year,setYear] = useState(CURRENT_YEAR);
  const [mode,setMode] = useState("yearly"); // yearly | monthly
  const [selectedPlant,setSelectedPlant] = useState(null);
  const [bills,setBills] = useState([]);
  const [view,setView] = useState("graph");
const [zone,setZone] = useState("All");
  /* ================= FETCH PLANTS ================= */

  useEffect(()=>{
    const fetchPlants = async()=>{
      const res = await getAllPlants();
      setPlants(res || []);
    };
    fetchPlants();
  },[]);

const zones = useMemo(() => {

  const unique = [...new Set(plants.map(p => Number(p.zones)))].sort((a,b)=>a-b);

  return [
    { label: "All Zones", value: "All" },
    ...unique.map(z => ({
      label: `Zone ${z}`,
      value: String(z)
    }))
  ];

}, [plants]);

const filteredPlants = useMemo(() => {

  if(zone === "All") return plants;

  return plants.filter(
    p => String(p.zones) === String(zone)
  );

}, [plants,zone]);
  /* ================= FETCH BILLS ================= */

  useEffect(()=>{

    const fetchBills = async()=>{

      if(mode==="yearly"){
        const results = await Promise.all(
          filteredPlants.map(p=>getPowerBillDetailsByPlant(p.plantID))
        );

        setBills(results.flat());

      }else if(selectedPlant){

        const res = await getPowerBillDetailsByPlant(selectedPlant.plantID);
        setBills(res || []);

      }

    };

    if(plants.length) fetchBills();

  },[plants,mode,selectedPlant]);


  /* ================= MONTHLY DATA ================= */

const monthlyData = useMemo(() => {

  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ];

  const base = months.map((m,i)=>({
    month:m,
    units:null,
    amount:null,
    billDate:null,
    index:i
  }));

  if(!bills.length) return base;

  const sorted = [...bills].sort(
    (a,b)=> new Date(a.lastBillDate) - new Date(b.lastBillDate)
  );

  for(let i=1;i<sorted.length;i++){

    const prev = new Date(sorted[i-1].lastBillDate);
    const curr = new Date(sorted[i].lastBillDate);

    const consumptionYear = prev.getFullYear();

    if(consumptionYear !== year) continue;

    const monthIndex = prev.getMonth();

    base[monthIndex] = {
      month: months[monthIndex],
      units: sorted[i].totalNoOfUnits ?? 0,
      amount: sorted[i].totalBillAmount ?? 0,
      billDate: curr.toISOString().split("T")[0],
      index: monthIndex
    };

  }

  return base;

}, [bills, year]);


  /* ================= YEARLY DATA ================= */

const yearlyData = useMemo(() => {

  if (!bills.length) return [];

  const plantMap = {};

  bills.forEach(b => {
    if (!plantMap[b.plantId]) plantMap[b.plantId] = [];
    plantMap[b.plantId].push(b);
  });

  const unitResult = {};
  const amountResult = {};

  Object.keys(plantMap).forEach(pid => {

    const sorted = plantMap[pid].sort(
      (a,b)=> new Date(a.lastBillDate) - new Date(b.lastBillDate)
    );

    for(let i=1;i<sorted.length;i++){

      const prev = new Date(sorted[i-1].lastBillDate);

      if(prev.getFullYear() !== year) continue;

      if(!unitResult[pid]) unitResult[pid] = 0;
      if(!amountResult[pid]) amountResult[pid] = 0;

      unitResult[pid] += sorted[i].totalNoOfUnits || 0;
      amountResult[pid] += sorted[i].totalBillAmount || 0;
    }

  });

  return filteredPlants.map(p => ({
    plantId: p.plantID,
    plant: p.plantName,
    kld: p.kld,
    zone: p.zones,
    units: unitResult[p.plantID] || 0,
    amount: amountResult[p.plantID] || 0
  }));

}, [bills, filteredPlants, year]);


const yearlyStats = useMemo(() => {

  let totalUnits = 0;

  let totalAmount = 0;
  let plantsWithBills = 0;

  yearlyData.forEach(p => {
    if (p.units > 0) {
      totalUnits += p.units;
      plantsWithBills++;
    }
  });

const sorted = [...bills].sort(
  (a,b)=> new Date(a.lastBillDate) - new Date(b.lastBillDate)
);

for(let i=1;i<sorted.length;i++){

  const prev = new Date(sorted[i-1].lastBillDate);

  if(prev.getFullYear() !== year) continue;

  totalAmount += sorted[i].totalBillAmount || 0;
}


  const avgUnits =
    plantsWithBills > 0 ? totalUnits / plantsWithBills : 0;

  return {
    totalUnits,
    totalAmount,
    avgUnits
  };

}, [yearlyData, bills, year]);

  const graphData = mode==="yearly" ? yearlyData : monthlyData;


  /* ================= KPI ================= */

  const stats = useMemo(()=>{

    let totalUnits=0;
    let totalAmount=0;
    let months=0;

    monthlyData.forEach(r=>{
      if(r.units!==null){
        totalUnits+=r.units;
        months++;
      }
      if(r.amount!==null) totalAmount+=r.amount;
    });

    return{
      totalUnits,
      totalAmount,
      avgUnits: months ? totalUnits/months : 0
    };

  },[monthlyData]);


  /* ================= TOOLTIP ================= */

  const TooltipUI = ({active,payload})=>{
    if(!active || !payload?.length) return null;

    const row=payload[0].payload;

    return(
      <div className="bg-white shadow rounded p-3 text-xs">

        <p className="font-bold text-blue-900 mb-1">
          {mode==="yearly" ? row.plant : row.month}
        </p>

        <div className="flex justify-between">
          <span>Units</span>
          <span className="font-bold text-blue-600">
            {row.units?.toLocaleString("en-IN")}
          </span>
        </div>

        {row.amount && (
        <div className="flex justify-between">
          <span>Bill</span>
          <span className="font-bold text-green-600">
            ₹ {row.amount.toLocaleString("en-IN")}
          </span>
        </div>
        )}

      </div>
    );
  };


  /* ================= UI ================= */

  return(

  <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">

  {/* HEADER */}

  <div className="flex justify-between items-center mb-4">

    <h2 className="text-xl font-bold text-blue-900">
      {mode==="yearly"
        ? "All Plants - Yearly Power Consumption"
        : `${selectedPlant?.plantName} - Monthly Power Bill Consumption`}
    </h2>

    <div className="flex gap-3">


  {/* View Toggle */}
  <div className="flex border rounded overflow-hidden text-sm">
    <button
      onClick={() => setView("graph")}
      className={`px-3 py-1 ${
        view === "graph" ? "bg-blue-600 text-white" : "bg-white"
      }`}
    >
      Graphical View
    </button>

    <button
      onClick={() => setView("table")}
      className={`px-3 py-1 ${
        view === "table" ? "bg-blue-600 text-white" : "bg-white"
      }`}
    >
      Tabular View
    </button>
  </div>

  {/* Zone Filter */}
<select
  value={zone}
  onChange={(e) => setZone(e.target.value)}
  className="border rounded px-3 py-1 text-sm"
>
  {zones.map(z => (
    <option key={z.value} value={z.value}>
      {z.label}
    </option>
  ))}
</select>


      <select
      value={year}
      onChange={(e)=>setYear(Number(e.target.value))}
      className="border px-3 py-1 rounded text-sm"
      >
      {[CURRENT_YEAR,CURRENT_YEAR-1,CURRENT_YEAR-2].map(y=>(
        <option key={y}>{y}</option>
      ))}
      </select>

    </div>

  </div>


<div className="flex flex-row-reverse ">
  {mode==="monthly" && (
  <button
  onClick={()=>{setMode("yearly");setSelectedPlant(null)}}
  className="mb-4 px-3 py-1 bg-blue-600 text-white rounded"
  >
  ← Back to All Plants
  </button>
  )}
</div>

  {/* KPI */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">

  {mode === "yearly" ? (

    <>
      <KpiCard
        label="Total Power Units"
        value={`${yearlyStats.totalUnits.toLocaleString("en-IN")} Kwh`}
        icon={<Zap size={18} />}
        bg="#DBEAFE"
      />

      <KpiCard
        label="Avg Units per Plant"
        value={`${yearlyStats.avgUnits.toFixed(1)} Kwh`}
        icon={<Zap size={18} />}
        bg="#DCFCE7"
      />

      <KpiCard
  label="Total Amount"
  value={`₹ ${yearlyStats.totalAmount.toLocaleString("en-IN")}`}
  icon={<Receipt size={18} />}
  bg="#FEF3C7"
/>
    </>

  ) : (

    <>
      <KpiCard
        label="Total Units"
        value={`${stats.totalUnits.toLocaleString("en-IN")} kWh`}
        icon={<Zap size={18} />}
        bg="#DBEAFE"
      />

      <KpiCard
        label="Avg Units"
        value={`${stats.avgUnits.toFixed(1)} kWh`}
        icon={<Zap size={18} />}
        bg="#DCFCE7"
      />

      <KpiCard
        label="Bill Amount"
        value={`₹ ${stats.totalAmount.toLocaleString("en-IN")}`}
        icon={<Receipt size={18} />}
        bg="#FEF3C7"
      />
    </>

  )}

</div>

  {/* GRAPH */}

{view === "graph" && (
<div >

  <div className="overflow-x-auto">

    <div
      style={{
        width: Math.max(graphData.length * 90, 600),
        minWidth: "100%",
        height: 450
      }}
    >

      <BarChart
        width={Math.max(graphData.length * 90, 1600)}
        height={450}
        data={graphData}
        margin={{ top: 30, right: 30, left: 70, bottom: 80 }}
      >

        <CartesianGrid strokeDasharray="3 3" />

<XAxis
  dataKey={mode === "yearly" ? "plant" : "month"}
  interval={0}
  height={50}
  
  tick={({ x, y, payload }) => {

    if (mode === "yearly") {

      const plantObj = filteredPlants.find(
        p => p.plantName === payload.value
      );

      const hasSolar = plantObj?.solar === true;

      return (
        <text
          x={x}
          y={y + 10}
          textAnchor="end"
          fontSize={11}
          fontWeight={700}
          fill={hasSolar ? "#197039" : "#dc2626"}
          style={{ cursor: "pointer", textDecoration: "underline" }}
          transform={`rotate(-30 ${x} ${y + 10})`}
          onClick={()=>{
            setSelectedPlant(plantObj);
            setMode("monthly");
          }}
        >
          {payload.value}
        </text>
      );
    }

    return (
      <text
        x={x}
        y={y + 10}
        textAnchor="middle"
        fontSize={15}
        fontWeight={400}
      >
        {payload.value}
      </text>
    );
  }}
/>

        <YAxis
          label={{
            value: "Power Units (Kwh)",
         
            angle: -90,
            position: "insideLeft",
            dy: 90
          }}
        />

       <Tooltip content={<DetailTooltip mode={mode} />} />

        <Bar
          dataKey="units"
          fill="#2563eb"
          barSize={30}
          isAnimationActive={false}
        >
          <LabelList
            position="top"
             fill="#2563eb"
            formatter={(v)=>{
              if(v===null) return "-";
              return Math.round(v).toLocaleString("en-IN");
            }}
          />
        </Bar>

      </BarChart>

    </div>

  </div>


  {/* LEGEND */}
  
{/* Show solar status only when NOT monthly */}
{/* Show solar status only when yearly */}
{mode === "yearly" && (
  <div className="flex items-center gap-4 text-xs mt-2 justify-center">

    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded bg-green-600"></span>
      Solar Completed
    </div>

    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded bg-red-600"></span>
      Solar Not Completed
    </div>

  </div>
)}

<div className="flex flex-wrap justify-center gap-4 mt-4 font-bold text-sm">

  <div className="flex items-center gap-2">
    <span className="w-4 h-4 bg-[#2563eb] rounded" />
    Power Bill Units (Kwh)
  </div>

</div>


  <p className="text-center text-sm font-bold mt-4">
    {mode === "yearly" ? "Plants" : "Months"}
  </p>

</div>
)}

{view === "table" && (
<div className="bg-white rounded-2xl shadow-lg p-6 overflow-auto">

<table className="min-w-full text-sm border">

<thead className="bg-slate-100">

<tr>

{mode === "yearly" ? (
<>
<th className="border px-3 py-2">S.No</th>
<th className="border px-3 py-2">Plant Id</th>
<th className="border px-3 py-2">Plant Name</th>
<th className="border px-3 py-2">KLD</th>
<th className="border px-3 py-2">Zone</th>
<th className="border px-3 py-2">Total Consumed Units</th>
<th className="border px-3 py-2">Total Amount</th>
</>
) : (
<>
<th className="border px-3 py-2">Month</th>
<th className="border px-3 py-2">Bill Received Date</th>
<th className="border px-3 py-2">Consumed Units (Kwh)</th>
<th className="border px-3 py-2">Bill Amount (Rs)</th>
</>
)}

</tr>

</thead>

<tbody>

{graphData.map((row, index) => (

<tr key={index} className="text-center">

{mode === "yearly" ? (
<>

<td className="border px-3 py-2">{index + 1}</td>

<td className="border px-3 py-2">{row.plantId}</td>

<td className="border px-3 py-2">{row.plant}</td>

<td className="border px-3 py-2">{row.kld}</td>

<td className="border px-3 py-2">{row.zone}</td>

<td className="border px-3 py-2 text-blue-600">
{row.units.toLocaleString("en-IN")}
</td>

<td className="border px-3 py-2 text-green-700">
{row.amount ? `₹ ${row.amount.toLocaleString("en-IN")}` : "-"}
</td>
</>
) : (
<>

<td className="border px-3 py-2 font-semibold">
{row.month}
</td>

<td className="border px-3 py-2">
{formatDisplayDate(row.billDate) ?? "-"}
</td>

<td className="border px-3 py-2 text-blue-600">
{row.units === null ? "-" : row.units.toLocaleString("en-IN")}
</td>

<td className="border px-3 py-2 text-green-700">
{row.amount === null ? "-" : `₹ ${row.amount.toLocaleString("en-IN")}`}
</td>

</>
)}

</tr>

))}

</tbody>

</table>

</div>
)}

  </div>
  );
}



/* ================= KPI CARD ================= */

const KpiCard = ({label,value,icon,bg})=>(

<div
className="rounded-xl p-4 shadow-sm flex flex-col gap-1"
style={{backgroundColor:bg}}
>

<div className="flex items-center gap-2 text-slate-700">
{icon}
<span className="text-xs font-bold uppercase">{label}</span>
</div>

<span className="text-xl font-black text-slate-900">
{value}
</span>

</div>

);