import React, { useEffect, useState } from "react";
import {
  getPowerBillDetailsByPlant,
  getWaterDetailsByPlant,
} from "../../services/operationService";
import { getVehicleFuelDetails } from "../../services/vehicleService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";



const formatDisplayDate = (dateString) => {
  if (!dateString || dateString === "-" ) return "-";

  const date = new Date(dateString);

  if (isNaN(date.getTime())) return "-"; // 🔥 prevents NaN/NaN/NaN

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};


const UtilityDetailModal = ({ detail, onClose }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH DETAILS ================= */
  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        let data = [];

        if (detail.module === "power") {
          data = await getPowerBillDetailsByPlant(detail.plantId);
        }

        if (detail.module === "water") {
          data = await getWaterDetailsByPlant(detail.plantId);
        }

        if (detail.module === "vehicle") {
          data = await getVehicleFuelDetails(detail.vehicleId);
        }

        // API may return object or array → normalize
        setRows(Array.isArray(data) ? data : data ? [data] : []);
      } catch (err) {
        console.error("Utility detail fetch error", err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [detail]);

  /* ================= PDF DOWNLOAD ================= */
  const downloadPdf = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    doc.setFontSize(14);
    doc.text(
      `${detail.plantName} – ${detail.module.toUpperCase()} DETAILS`,
      14,
      14
    );

    let head = [];
    let body = [];

    if (detail.module === "power") {
      head = [[
        "Bill Date", "Units", "Amount (₹)", "Power Bill"
      ]];

      body = rows.map(r => ([
        formatDisplayDate(r.lastBillDate),
        r.totalNoOfUnits,
        r.totalBillAmount,
        r.powerBill ? "YES" : "NO"
      ]));
    }

    if (detail.module === "water") {
      head = [[
        "Filled Date", "Liters", "Amount (₹)", "Water Used"
      ]];

      body = rows.map(r => ([
        formatDisplayDate(r.waterFilledDate),
        r.waterLtrs,
        r.totalWaterAmount,
        r.waterUsed ? "YES" : "NO"
      ]));
    }

    if (detail.module === "vehicle") {
      head = [[
        "Fuel Filled", "Filled Date", "Liters", "Odometer"
      ]];

      body = rows.map(r => ([
        r.lastFuelFilled ? "YES" : "NO",
        formatDisplayDate(r.lastFuelFilledDate),
        r.filledLiters,
        r.currentOdometerReading
      ]));
    }

    autoTable(doc, {
      startY: 22,
      head,
      body,
      styles: { fontSize: 9, halign: "center" },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: "bold"
      }
    });

    doc.save(
      `${detail.plantName}_${detail.module}_details.pdf`
    );
  };

  /* ================= UI ================= */
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-[95%] max-w-5xl rounded-xl shadow-lg p-5 relative">

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-0 right-4 text-red-600 text-2xl font-bold"
        >
          ✕
        </button>

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-bold text-blue-900">
              {detail.plantName}
            </h2>
            <p className="text-sm font-semibold text-slate-600">
              {detail.module.toUpperCase()} DETAILS
            </p>
          </div>

          <button
            onClick={downloadPdf}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-blue-700"
          >
            Download PDF
          </button>
        </div>

        {/* CONTENT */}
        {loading ? (
          <p className="text-center font-semibold text-slate-500">
            Loading details…
          </p>
        ) : rows.length === 0 ? (
          <p className="text-center font-semibold text-slate-500">
            No data available
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  {detail.module === "power" && (
                    <>
                      <th className="border p-2">Bill Date</th>
                      <th className="border p-2">Units</th>
                      <th className="border p-2">Amount (₹)</th>
                      <th className="border p-2">Bill</th>
                    </>
                  )}

                  {detail.module === "water" && (
                    <>
                      <th className="border p-2">Filled Date</th>
                      <th className="border p-2">Liters</th>
                      <th className="border p-2">Amount (₹)</th>
                      <th className="border p-2">Water Used</th>
                    </>
                  )}

                  {detail.module === "vehicle" && (
                    <>
                      <th className="border p-2">Fuel Filled</th>
                      <th className="border p-2">Filled Date</th>
                      <th className="border p-2">Liters</th>
                      <th className="border p-2">Odometer</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    {detail.module === "power" && (
                      <>
                        <td className="border p-2 text-center">{formatDisplayDate(r.lastBillDate)}</td>
                        <td className="border p-2 text-center">{r.totalNoOfUnits}</td>
                        <td className="border p-2 text-center">₹ {r.totalBillAmount}</td>
                        <td className="border p-2 text-center">{r.powerBill ? "YES" : "NO"}</td>
                      </>
                    )}

                    {detail.module === "water" && (
                      <>
                        <td className="border p-2 text-center">{formatDisplayDate(r.waterFilledDate)}</td>
                        <td className="border p-2 text-center">{r.waterLtrs}</td>
                        <td className="border p-2 text-center">₹ {r.totalWaterAmount}</td>
                        <td className="border p-2 text-center">{r.waterUsed ? "YES" : "NO"}</td>
                      </>
                    )}

                    {detail.module === "vehicle" && (
                      <>
                        <td className="border p-2 text-center">{r.lastFuelFilled ? "YES" : "NO"}</td>
                        <td className="border p-2 text-center">{formatDisplayDate(r.lastFuelFilledDate)}</td>
                        <td className="border p-2 text-center">{r.filledLiters}</td>
                        <td className="border p-2 text-center">{r.currentOdometerReading}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UtilityDetailModal;