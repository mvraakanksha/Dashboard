import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
    LabelList
} from "recharts";

import { Zap, Receipt, AlertTriangle, TrendingUp } from "lucide-react";

import { getOperationsByDateRange, getPowerBillDetailsByPlant } from "../../../services/operationService";
import { getAllPlants } from "../../../services/plantService";
import PowerIndetail from "./PowerBillIndetail";


const formatDisplayDate = (dateString) => {
  if (!dateString || dateString === "-" ) return "-";

  const date = new Date(dateString);

  if (isNaN(date.getTime())) return "-"; // 🔥 prevents NaN/NaN/NaN

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};


const TODAY = new Date().toISOString().slice(0, 7);

const BarValueLabel = ({ x, y, width, value, fill }) => {

  if (value === null || value === undefined) return null;

  return (
    <text
      x={x + width / 2}
      y={value === 0 ? y - 5 : y - 6}  // show 0 inside bar area
      textAnchor="middle"
      fill={fill}
      fontSize={11}
      fontWeight={700}
    >
      {Math.round(value).toLocaleString("en-IN")}
    </text>
  );
};

const PowerTooltip = ({ active, payload }) => {

  if (!active || !payload || !payload.length) return null;

  const row = payload[0].payload;

  const power = Number(row.totalPower || 0);
  const solar = Number(row.totalSolar || 0);
  const net = Number(row.netUnits || 0);
  const bill = Number(row.billUnits || 0);

  return (
    <div className="bg-white border border-slate-200 shadow-xl rounded-lg p-4 text-xs w-64">

<p className="font-bold text-blue-900 mb-2 text-sm">
  {row.plantID ?? "-"} - {row.plant ?? "-"} - {row.kld ?? "-"} KLD
</p>
      <div className="space-y-1">

        <div className="flex justify-between">
          <span className="font-semibold text-slate-600">
            Total Power Consumed
          </span>
          <span className="font-bold text-red-600">
            {power.toLocaleString("en-IN")} Kwh
          </span>
        </div>

        <div className="flex justify-between">
          <span className="font-semibold text-slate-600">
            Solar Generated
          </span>
          <span className="font-bold text-green-600">
            {solar.toLocaleString("en-IN")} Kwh
          </span>
        </div>

        <div className="flex justify-between">
          <span className="font-semibold text-slate-600">
            Net Consumption
          </span>
          <span className="font-bold text-red-700">
            {net.toLocaleString("en-IN")} Kwh
          </span>
        </div>

        {row.billDate && (
          <div className="flex justify-between">
            <span className="font-semibold text-slate-600">
              Bill Date
            </span>
            <span className="font-bold text-slate-800">
              {formatDisplayDate(row.billDate)}
            </span>
          </div>
        )}


        <div className="flex justify-between">
          <span className="font-semibold text-slate-600">
            Bill Units
          </span>
          <span className="font-bold text-blue-600">
            {bill.toLocaleString("en-IN")} Kwh
          </span>
        </div>


      </div>
    </div>
  );
};

export default function PowerBill() {

  const [month, setMonth] = useState(TODAY);
  const [plants, setPlants] = useState([]);
  const [operations, setOperations] = useState([]);
  const [powerBills, setPowerBills] = useState({});
const [selectedPlant, setSelectedPlant] = useState(null);
const [zone, setZone] = useState("All");
const [view, setView] = useState("graph"); // graph | table

  /* ================= MONTH RANGE ================= */

  const getMonthRange = (month) => {

    const start = new Date(month + "-01");

    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);

    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0]
    };
  };

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

  if (zone === "All") return plants;

  return plants.filter(
    p => String(p.zones) === String(zone)
  );

}, [plants, zone]);

  /* ================= FETCH PLANTS ================= */

  useEffect(() => {

    const fetchPlants = async () => {

      try {

        const res = await getAllPlants();

        setPlants(res || []);

      } catch (err) {

        console.error(err);

      }

    };

    fetchPlants();

  }, []);

  /* ================= FETCH OPERATIONS ================= */

  useEffect(() => {

    const fetchOperations = async () => {

      const { start, end } = getMonthRange(month);

      try {

        const res = await getOperationsByDateRange(start, end);

        setOperations(res || []);

      } catch (err) {

        console.error(err);

      }

    };

    fetchOperations();

  }, [month]);

  /* ================= FETCH POWER BILLS ================= */

useEffect(() => {
  if (!plants.length) return;

  const fetchBills = async () => {

    const map = {};

    const selected = new Date(month + "-01");

    /* next month start */
    const start = new Date(selected);
    start.setMonth(start.getMonth() + 1);
    start.setDate(1);

    /* next month 15 */
    const end = new Date(selected);
    end.setMonth(end.getMonth() + 1);
    end.setDate(15);

    await Promise.all(
      plants.map(async (p) => {

        try {

          const res = await getPowerBillDetailsByPlant(p.plantID);

          if (!res?.length) return;

          const bill = res.find((b) => {

            const d = new Date(b.lastBillDate);

            return d >= start && d <= end;

          });

          if (bill) {
            map[p.plantID] = bill;
          }

        } catch {}

      })
    );

    setPowerBills(map);

  };

  fetchBills();

}, [plants, month]);
  /* ================= AGGREGATE POWER ================= */

const aggregated = useMemo(() => {

  const map = {};

  operations.forEach(({ plantId, operation }) => {

    if (!map[plantId]) {
      map[plantId] = {
        inputPower: 0,
          exportPower: 0
      };
    }

    const imp =
      operation.powerReadingAmImport != null &&
      operation.powerReadingPmImport != null
        ? Math.max(
            operation.powerReadingPmImport -
            operation.powerReadingAmImport,
            0
          )
        : 0;

    map[plantId].inputPower += Number(imp.toFixed(1));

         const exp =
      operation.powerReadingAmExport != null &&
      operation.powerReadingPmExport != null
        ? Math.max(
            operation.powerReadingPmExport -
            operation.powerReadingAmExport,
            0
          )
        : 0;

    map[plantId].exportPower += Number(exp.toFixed(1));


  });

  
  return map;

}, [operations]);
  /* ================= GRAPH DATA ================= */

const chartData = useMemo(() => {

  return filteredPlants.map(p => {

    const agg = aggregated[p.plantID] || {};
    const bill = powerBills[p.plantID] || {};

const input = Number(agg.inputPower || 0);
const solar = Number(agg.exportPower || 0);

const netConsumption = Math.max(input - solar, 0);

return {
  
  plant: p.plantName,
  plantID : p.plantID,
  kld: p.kld,

  netUnits: Number(netConsumption.toFixed(1)),
  billUnits: Number((bill.totalNoOfUnits || 0).toFixed(1)),

  totalPower: Number(input.toFixed(1)),
  totalSolar: Number(solar.toFixed(1)),

  billDate: bill?.lastBillDate || "-"
};
  });

}, [filteredPlants, aggregated, powerBills]);



const tableData = useMemo(() => {

  return filteredPlants.map(p => {

    const agg = aggregated[p.plantID] || {};
    const bill = powerBills[p.plantID] || {};

    const input = Number(agg.inputPower || 0);
    const solar = Number(agg.exportPower || 0);
    const net = Math.max(input - solar, 0);

    return {
      plantId: p.plantID,
      plantName: p.plantName,
      kld: p.kld,
      zone: p.zones,
      input,
      solar,
      net,
      billUnits: bill.totalNoOfUnits ?? "-",
      billAmount: bill.totalBillAmount ?? "-",
      billDate: bill.lastBillDate ?? "-"
    };

  });

}, [filteredPlants, aggregated, powerBills]);

  /* ================= KPI CALCULATIONS ================= */

const stats = useMemo(() => {

  let netPower = 0;
  let billUnits = 0;
  let billAmount = 0;

  filteredPlants.forEach(p => {

    const agg = aggregated[p.plantID] || {};
    const bill = powerBills[p.plantID] || {};

    const input = Number(agg.inputPower || 0);
    const solar = Number(agg.exportPower || 0);

    const net = Math.max(input - solar, 0);

    netPower += net;
    billUnits += bill.totalNoOfUnits || 0;
    billAmount += bill.totalBillAmount || 0;

  });

  return {

    netPower,
    billUnits,
    difference: billUnits - netPower,
    billAmount

  };

}, [filteredPlants, aggregated, powerBills]);

  /* ================= UI ================= */

  return (

    <div className="space-y-6">


      {/* HEADER */}

<div className="flex justify-between items-center">

<h2 className="text-xl font-bold text-blue-900">
  Monthly Power Consumption vs Power Bill {zone !== "All" && ` - Zone ${zone}`}
</h2>

<div className="flex items-center gap-3">

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

  {/* Month Selector */}
  <input
    type="month"
    value={month}
    onChange={(e) => setMonth(e.target.value)}
    className="border rounded px-3 py-1 text-sm"
  />

</div>
</div>

      {/* KPI CARDS */}

<div className="grid grid-cols-1 md:grid-cols-4 gap-4">

  <KpiCard
    label="Net Power Consumption"
    value={`${stats.netPower.toFixed(1)} Kwh`}
    icon={<Zap size={18} />}
    bg="#DBEAFE"
  />

  <KpiCard
    label="Bill Power Units"
    value={`${stats.billUnits.toFixed(1)} Kwh`}
    icon={<Zap size={18} />}
    bg="#DCFCE7"
  />

  <KpiCard
    label="Difference"
    value={`${stats.difference.toFixed(1)} Kwh`}
    icon={<AlertTriangle size={18} />}
    bg="#FEE2E2"
  />

  <KpiCard
    label="Total Bill Amount"
    value={`₹ ${stats.billAmount.toLocaleString("en-IN")}`}
    icon={<Receipt size={18} />}
    bg="#FEF3C7"
  />

</div>

      {/* GRAPH */}

{view === "graph" && (
<div className="bg-white rounded-2xl shadow-lg p-6">
  <div className="overflow-x-auto">
    <div
      style={{
        width: Math.max(chartData.length * 90, 600),
        minWidth: "100%",
        height: 450
      }}
    >
      <BarChart
       width={Math.max(chartData.length * 90, 600)}
        height={450}
        data={chartData}
        margin={{ top: 30, right: 30, left: 70, bottom: 80 }}
      >
        <CartesianGrid strokeDasharray="3 3" />

<XAxis
  dataKey="plant"
  interval={0}
  height={70}
  tick={({ x, y, payload }) => {

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

        <Tooltip content={<PowerTooltip />} />

        {/* INPUT POWER */}

          <Bar dataKey="netUnits" fill="#af0000" barSize={22}>
            <LabelList content={(p) => <BarValueLabel {...p} fill="#af0000" />} />
          </Bar>

          <Bar dataKey="billUnits" fill="#2563eb" barSize={22}>
            <LabelList content={(p) => <BarValueLabel {...p} fill="#2563eb" />} />
          </Bar>

      </BarChart>
    </div>
  </div>

  {/* LEGEND */}

<div className="flex flex-wrap justify-center gap-4 mt-4 font-bold text-sm">

  <div className="flex items-center gap-2">
    <span className="w-4 h-4 bg-[#af0000] rounded" />
    Net Power Consumption (Import − Export) Kwh
  </div>

  <div className="flex items-center gap-2">
    <span className="w-4 h-4 bg-[#2563eb] rounded" />
    Bill Power Units (Kwh)
  </div>

</div>

  <p className="text-center text-sm font-bold mt-4">
    Plants
  </p>
</div>
)}


{view === "table" && (
<div className="bg-white rounded-2xl shadow-lg p-6 overflow-auto">

<table className="min-w-full text-sm border">

<thead className="bg-slate-100">
<tr>

<th className="border px-3 py-2">S.NO</th>
<th className="border px-3 py-2">Plant ID</th>
<th className="border px-3 py-2">Plant Name</th>
<th className="border px-3 py-2">KLD</th>
<th className="border px-3 py-2">Zone</th>
<th className="border px-3 py-2">Consumed Power</th>
<th className="border px-3 py-2">Solar Generated</th>
<th className="border px-3 py-2">Net Consumption</th>
<th className="border px-3 py-2">Bill Units</th>
<th className="border px-3 py-2">Bill Amount</th>
<th className="border px-3 py-2">Bill Date</th>

</tr>
</thead>

<tbody>

{tableData.map((row, index) => (

<tr key={row.plantId} className="text-center">

<td className="border px-3 py-2">{index + 1}</td>

<td className="border px-3 py-2">{row.plantId}</td>
<td className="border px-3 py-2">{row.plantName}</td>
<td className="border px-3 py-2">{row.kld}</td>
<td className="border px-3 py-2">{row.zone}</td>
<td className="border px-3 py-2">
{row.input.toLocaleString("en-IN")}
</td>

<td className="border px-3 py-2">
{row.solar.toLocaleString("en-IN")}
</td>

<td className="border px-3 py-2 font-semibold text-red-600">
{row.net.toLocaleString("en-IN")}
</td>

<td className="border px-3 py-2 text-blue-600">
{row.billUnits}
</td>

<td className="border px-3 py-2 text-green-700">
{row.billAmount === "-" ? "-" : `₹ ${row.billAmount}`}
</td>

<td className="border px-3 py-2">
{formatDisplayDate(row.billDate)}
</td>

</tr>

))}

</tbody>
</table>

</div>
)}

<div className="mt-6">

{selectedPlant && (
  <button
    onClick={() => setSelectedPlant(null)}
    className="mb-3 px-3 py-1 bg-blue-600 text-white rounded"
  >
    ← Back to All Plants
  </button>
)}

<PowerIndetail />

</div>

    </div>


  );

}

/* ================= KPI CARD ================= */

const KpiCard = ({ label, value, icon, bg }) => (

  <div
    className="rounded-xl p-4 shadow-sm flex flex-col gap-1"
    style={{ backgroundColor: bg }}
  >

    <div className="flex items-center gap-2 text-slate-700">

      {icon}

      <span className="text-xs font-bold uppercase">
        {label}
      </span>

    </div>

    <span className="text-xl font-black text-slate-900">
      {value}
    </span>

  </div>

);