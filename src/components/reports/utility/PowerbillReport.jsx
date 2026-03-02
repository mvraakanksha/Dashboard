import React, { useEffect, useState } from "react";
import { getAllPlants } from "../../../services/plantService";
import axios from "axios";
import { getLatestPowerBill } from '../../../services/operationService';

const PowerBillReport = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const selectedDate = "2026-01-31"; // 🔁 later make dynamic

useEffect(() => {
  const fetchData = async () => {
    try {
      const plants = await getAllPlants();

      const result = await Promise.all(
        plants.map(async (p) => {
          let powerData = null;

          try {
            const res = await getLatestPowerBill(
              p.plantID,
              selectedDate
            );
            powerData = res; // ✅ FIXED
          } catch (err) {
            powerData = null; // no bill
          }

          return {
            plantID: p.plantID,
            plantName: p.plantName,
            zone: p.zones,
            kld: p.kld,

            powerBill: powerData?.powerBill ?? false,
            lastBillDate: powerData?.lastBillDate ?? "-",
            totalNoOfUnits: powerData?.totalNoOfUnits ?? "-",
            totalBillAmount: powerData?.totalBillAmount ?? "-"
          };
        })
      );

      setRows(result);
    } catch (err) {
      console.error("Error fetching power bill report", err);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [selectedDate]);


  if (loading) {
    return (
      <p className="text-sm font-semibold text-slate-600">
        Loading power bill report…
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border text-sm">
        <thead className="bg-slate-100 font-bold text-[11px] uppercase">
          <tr>
            <th className="border p-2">S.No</th>
            <th className="border p-2">Plant ID</th>
            <th className="border p-2">Plant Name</th>
            <th className="border p-2">Zone</th>
            <th className="border p-2">KLD</th>
            <th className="border p-2">Power Bill</th>
           <th className="border p-2">Last Available Bill Date</th>

            <th className="border p-2">Units</th>
            <th className="border p-2">Amount (₹)</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => (
            <tr key={r.plantID} className="hover:bg-slate-50">
              <td className="border p-2 text-center">{i + 1}</td>
              <td className="border p-2 text-center">{r.plantID}</td>
              <td className="border p-2">{r.plantName}</td>
              <td className="border p-2 text-center">{r.zone}</td>
              <td className="border p-2 text-center">{r.kld}</td>

             <td className="border p-2 text-center font-bold">
  {r.powerBill ? (
    <span className="text-green-700">YES</span>
  ) : (
    <span className="text-red-600">NO</span>
  )}
</td>


              <td className="border p-2 text-center">
                {r.lastBillDate}
              </td>

              <td className="border p-2 text-center">
                {typeof r.totalNoOfUnits === "number"
                  ? r.totalNoOfUnits
                  : "-"}
              </td>

              <td className="border p-2 text-center">
                {typeof r.totalBillAmount === "number"
                  ? `₹ ${r.totalBillAmount.toLocaleString("en-IN")}`
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PowerBillReport;
