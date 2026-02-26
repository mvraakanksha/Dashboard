import React from 'react'
import { useEffect,useState } from 'react';
import { getAllPlants } from '../../../services/plantService';
import { getWaterDetailsByPlant } from '../../../services/operationService'
import { useMemo } from "react";
import { Calendar, Filter } from "lucide-react";

const formatDisplayDate = (dateString) => {
  if (!dateString || dateString === "-" ) return "-";

  const date = new Date(dateString);

  if (isNaN(date.getTime())) return "-"; // 🔥 prevents NaN/NaN/NaN

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};
const formatIndian = (val) => {
  if (val === null || val === undefined || val === "-") return "-";
  const num = Number(val);
  if (isNaN(num)) return val;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 1,
    maximumFractionDigits: 1,
  });
};

const WaterBill = () => {
const [plants, setPlants] = useState([]);
const [waterBill, setWaterBill] = useState([]);
const [selectedZone, setSelectedZone] = useState("ALL");
const [dateRange, setDateRange] = useState({ from: "", to: "" });
const [dateError, setDateError] = useState("");
const [waterTypes, setWaterTypes] = useState([]);

  /* ===== FETCH PLANTS ===== */
  useEffect(() => {
    getAllPlants()
      .then(setPlants)
      .catch(console.error);
  }, []);

useEffect(() => {
  if (!plants.length) return;

  const fetchWater = async () => {
    try {
      const results = await Promise.all(
        plants.map(async (p) => {
          const water = await getWaterDetailsByPlant(p.plantID);
          return { ...p, waterBills: water || [] };
        })
      );

      setWaterBill(results);
    } catch (e) {
      console.error(e);
    }
  };

  fetchWater();
}, [plants]);

const zones = useMemo(() => {
  const clean = plants
    .map(p => p.zones)
    .filter(z => z !== null && z !== undefined && z !== "");

  return [
    "ALL",
    ...[...new Set(clean)].sort((a, b) => {
      const numA = parseInt(String(a).replace(/\D/g, "")) || 0;
      const numB = parseInt(String(b).replace(/\D/g, "")) || 0;
      return numA - numB;
    })
  ];
}, [plants]);

const filteredWaterBill =
  selectedZone === "ALL"
    ? waterBill
    : waterBill.filter(
        p =>
          String(p.zones).toLowerCase().trim() ===
          selectedZone.toLowerCase().trim()
      );

const finalData = filteredWaterBill
  // ✅ WATER TYPE FILTER AT PLANT LEVEL
  .filter(p => {
    if (!waterTypes.length) return true;
    return waterTypes.includes(p.waterType);
  })
  // ✅ DATE FILTER AT BILL LEVEL
  .map(p => ({
    ...p,
    waterBills: p.waterBills.filter(r => {
      const d = new Date(r.waterFilledDate);
      if (dateRange.from && d < new Date(dateRange.from)) return false;
      if (dateRange.to && d > new Date(dateRange.to)) return false;
      return true;
    })
  }));

  const overviewTotals = useMemo(() => {
  let totalPlants = finalData.length;
  let totalWater = 0;
  let totalAmount = 0;

  finalData.forEach(p => {
    p.waterBills.forEach(r => {
      totalWater += Number(r.waterLtrs) || 0;
      totalAmount += Number(r.totalWaterAmount) || 0;
    });
  });

  return [
    { label: "Plants", value: totalPlants },
    { label: "Water (Ltrs)", value: totalWater },
    { label: "Amount Paid", value: totalAmount }
  ];
}, [finalData]);

const waterTypeCounts = useMemo(() => {
  const counts = {
    "Normal Water": 0,
    "Salt Water": 0,
    "No Borewell": 0
  };

  filteredWaterBill.forEach(p => {
    const hasBills = p.waterBills?.length;

    if (hasBills && counts[p.waterType] !== undefined) {
      counts[p.waterType] += 1;
    }
  });

  return counts;
}, [filteredWaterBill]);

const toggleWaterType = (type) => {
  setWaterTypes(prev =>
    prev.includes(type)
      ? prev.filter(t => t !== type)
      : [...prev, type]
  );
};

  return (
    <div className="p-6 space-y-4">
  
<div className="bg-white rounded-xl border p-4 flex flex-wrap items-end gap-10">

  {/* FROM DATE */}
  <div>
    <label className="text-[10px] font-bold text-slate-500 uppercase">From</label>
    <div className="flex items-center gap-2 mt-1">
      <Calendar size={16} />
      <input
        type="date"
        value={dateRange.from}
        max={new Date().toISOString().split("T")[0]}
        onChange={(e) => {
          const value = e.target.value;
          setDateRange(prev => {
            const newRange = { from: value, to: prev.to };
            if (newRange.to && newRange.to < newRange.from) {
              setDateError("To date cannot be earlier than From date");
            } else setDateError("");
            return newRange;
          });
        }}
        className={`border p-2 rounded text-xs ${dateError ? "border-red-500" : ""}`}
      />
    </div>
  </div>

  {/* TO DATE */}
  <div>
    <label className="text-[10px] font-bold text-slate-500 uppercase">To</label>
    <div className="flex items-center gap-2 mt-1">
      <Calendar size={16} />
      <input
        type="date"
        value={dateRange.to}
        max={new Date().toISOString().split("T")[0]}
        onChange={(e) => {
          const value = e.target.value;
          setDateRange(prev => {
            const newRange = { from: prev.from, to: value };
            if (newRange.to < newRange.from) {
              setDateError("To date cannot be earlier than From date");
            } else setDateError("");
            return newRange;
          });
        }}
        className={`border p-2 rounded text-xs ${dateError ? "border-red-500" : ""}`}
      />
    </div>
  </div>

  {/* ZONE FILTER */}
  <div>
    <label className="text-[10px] font-bold text-slate-500 uppercase">Zone</label>
    <div className="flex items-center gap-2 mt-1">
      <Filter size={16} />
      <select
        value={selectedZone}
        onChange={(e) => setSelectedZone(e.target.value)}
        className="border p-2 rounded text-xs"
      >
        {zones.map(z => (
          <option key={z} value={z}>
            {z === "ALL" ? "All Zones" : z}
          </option>
        ))}
      </select>
    </div>
  </div>

<div>
    <label className="text-[10px] font-bold text-slate-500 uppercase">Water Type</label>
      <div className="flex items-center gap-2 mt-1">
  
       <div className="flex items-center gap-2">
            <input
  type="checkbox"
  checked={waterTypes.includes("Normal Water")}
  onChange={() => toggleWaterType("Normal Water")}
  className="h-4 w-4"
/>
            <label htmlFor="normalWater" className="text-sm font-semibold">
              Normal Water
            </label>
          </div>
            <div className="flex items-center gap-2">
           <input
  type="checkbox"
  checked={waterTypes.includes("Salt Water")}
  onChange={() => toggleWaterType("Salt Water")}
  className="h-4 w-4"
/>
            <label htmlFor="saltWater" className="text-sm font-semibold">
             Salt Water
            </label>
          </div>
            <div className="flex items-center gap-2">
          <input
  type="checkbox"
  checked={waterTypes.includes("No Borewell")}
  onChange={() => toggleWaterType("No Borewell")}
  className="h-4 w-4"
/>
            <label htmlFor="noBorewell" className="text-sm font-semibold">
             No Borewell
            </label>
          </div>


      
    </div>

     </div>
  {dateError && (
    <p className="text-red-600 text-xs font-semibold">{dateError}</p>
  )}

  {/* DOWNLOAD */}
  <div className="ml-auto">
    <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-semibold">
      Download
    </button>
  </div>

</div>



      <div className="overflow-x-auto border rounded-lg">
        {/* Totals Label */}
<div className="m-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">

  {overviewTotals.map(t => (
    <div
      key={t.label}
      className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm"
    >
      <p className="text-[11px] text-slate-900 font-semibold">
        Total {t.label}
      </p>

      <p className="text-xl font-bold text-indigo-700">
        {t.label === "Amount Paid" ? "₹ " : ""}
        {formatIndian(t.value)}
      </p>
    </div>
  ))}

</div>

        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-100 text-xs font-bold sticky h-10 top-0 z-10">
          <tr>
    <th  className="border p-2 text-center">S.NO</th>
    <th  className="border p-2 text-center">Plant ID</th>
    <th  className="border p-2 text-center" >Plant Name</th>
    <th  className="border p-2 text-center" >KLD</th>
    <th  className="border p-2 text-center">District</th>
    <th  className="border p-2 text-center">Zone</th>
      <th  className="border p-2 text-center">Water Type</th>
    <th  className="border p-2 text-center" >Date</th>
    <th  className="border p-2 text-center" >Water Used (L)</th>
    <th  className="border p-2 text-center">Amount</th>
    
  </tr>
          </thead>

<tbody>
  {finalData.map((p, i) =>
    p.waterBills.length ? (
      p.waterBills.map((r, idx) => (
        <tr key={`${p.plantID}-${idx}`}>
          {/* MERGED plant columns */}
          {idx === 0 && (
            <>
              <td rowSpan={p.waterBills.length} className="border p-2 text-center">
                {i + 1}
              </td>

              <td rowSpan={p.waterBills.length} className="border p-2 text-center">
                {p.plantID}
              </td>

              <td rowSpan={p.waterBills.length} className="border p-2 text-center font-semibold">
                {p.plantName}
              </td>

              <td rowSpan={p.waterBills.length} className="border p-2 text-center">
                {p.kld}
              </td>

              <td rowSpan={p.waterBills.length} className="border p-2 text-center">
                {p.district}
              </td>

              <td rowSpan={p.waterBills.length} className="border p-2 text-center">
                {p.zones}
              </td>
                <td rowSpan={p.waterBills.length} className="border p-2 text-center">
                {p.waterType}
              </td>
            </>
          )}

          {/* WATER BILL ROWS */}
          <td className="border p-2 text-center">{formatDisplayDate(r.waterFilledDate)}</td>
          <td className="border p-2 text-center">{r.waterLtrs ?? 0} Ltrs</td>
          <td className="border p-2 text-center">₹ {r.totalWaterAmount ?? 0}</td>
         
        </tr>
      ))
    ) : (
      <tr key={p.plantID}>
        <td className="border p-2 text-center">{i + 1}</td>
        <td className="border p-2 text-center">{p.plantID}</td>
        <td className="border p-2 text-center">{p.plantName}</td>
        <td className="border p-2 text-center">{p.kld}</td>
        <td className="border p-2 text-center">{p.district}</td>
        <td className="border p-2 text-center">{p.zones}</td>
         <td className="border p-2 text-center">{p.waterType}</td>
        <td className="border p-2 text-center" colSpan={4}>
          No Water Bills
        </td>
      </tr>
    )
  )}
</tbody>

        </table>
      </div>
    </div>
  );

}

export default WaterBill
