import React, { useEffect, useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getAllPlants } from "../../../services/plantService";
import { getOperationsByDateRange } from "../../../services/operationService";
import companyLogo from "../company_logo1.jpg";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
// import companyLogo from '../reports/company_logo1.jpg'



export default function StockReport() {
  
 const [plants, setPlants] = useState([]); 
   const [zone, setZone] = useState("All");
//   const [selectedPlant, setSelectedPlant] = useState("All");
const [selectedPlants, setSelectedPlants] = useState([]);

const todayStr = new Date().toISOString().split("T")[0];
const [date, setDate] = useState(todayStr);
const [ops, setOps] = useState([]);
const [reportGenerated, setReportGenerated] = useState(false);

const [filters, setFilters] = useState({
    pellets: false,
    pelletsStock: false,
    pelletsNoStock: false,
    pelletsLowStock: false,
    polymer: false,
    polymerStock: false,
    polymerNoStock: false,
    polymerLowStock: false
  });

  /* ---------------- FETCH PLANTS ---------------- */
  useEffect(() => {
    const loadPlants = async () => {
      const data = await getAllPlants();
      setPlants(data || []);
    };
    loadPlants();
  }, []);


  /* ---------------- FETCH OPERATIONS ---------------- */
  useEffect(() => {
    if (!date) return;

    const from = new Date(date);
    from.setDate(from.getDate() - 15);

    const loadOps = async () => {
      const data = await getOperationsByDateRange(
        from.toISOString().split("T")[0],
        date
      );
      setOps(data || []);
    };

    loadOps();
  }, [date]);

  /* ---------------- FILTER PLANTS BY ZONE + PLANT ---------------- */


const getStockBySelectedDate = (ops, stockKey, selectedDate) => {
  if (!Array.isArray(ops) || ops.length === 0) return null;

  const selectedTime = new Date(selectedDate).setHours(0,0,0,0);

  // sort by date
  const sorted = [...ops].sort(
    (a, b) =>
      new Date(a.operation?.operationDate) -
      new Date(b.operation?.operationDate)
  );

  let previousStock = null;

  for (let i = 0; i < sorted.length; i++) {
    const opDate = new Date(sorted[i]?.operation?.operationDate);
    if (isNaN(opDate)) continue;

    const opTime = opDate.setHours(0,0,0,0);
    const val = sorted[i]?.operation?.[stockKey];

    if (opTime > selectedTime) break;

    // if selected day has value → return immediately
    if (opTime === selectedTime && val !== null && val !== undefined) {
      return val;
    }

    if (val !== null && val !== undefined) {
      previousStock = val;
    }
  }

  return previousStock;
};

  /* ---------------- BUILD STOCK DATA ---------------- */
const stockData = useMemo(() => {
  return plants
    .filter(p => selectedPlants.includes(p.plantID))
    .sort((a, b) => Number(a.plantID) - Number(b.plantID))
    .map(p => {
      const plantOps = ops.filter(o => o.plantId === p.plantID);

      return {
        plantId: p.plantID,
        plantName: p.plantName,
        zone: p.zones,
        pelletsStock: getStockBySelectedDate(plantOps, "pilletsStock", date),
  polymerStock: getStockBySelectedDate(plantOps, "polymerStock", date)

      };
    });
}, [plants, ops, selectedPlants, date]);

useEffect(() => {
  if (!reportGenerated) return;

  const ids = stockData.map(p => p.plantId);

  setSelectedPlants(prev =>
    JSON.stringify(prev) === JSON.stringify(ids) ? prev : ids
  );

}, [reportGenerated]);

/* ---------------- FILTERED PLANTS ---------------- */
const filteredPlants = useMemo(() => {
  if (zone === "All") return plants;

  return plants.filter(
    p => String(p.zones) === String(zone)
  );
}, [plants, zone]);

useEffect(() => {
  if (!plants.length) return;

  const ids =
    zone === "All"
      ? plants.map(p => p.plantID)
      : plants
          .filter(p => String(p.zones) === String(zone))
          .map(p => p.plantID);

  setSelectedPlants(ids);

}, [plants, zone]);

/* ---------------- SELECT ALL CHECK ---------------- */
const allSelected =
  filteredPlants.length > 0 &&
  selectedPlants.length === filteredPlants.length;

  /* ---------------- APPLY STOCK FILTER ---------------- */
const finalFilteredData = useMemo(() => {

  // If no sub-filter selected → show empty table
  const anySubFilterSelected =
    filters.pelletsStock ||
    filters.pelletsNoStock ||
    filters.pelletsLowStock ||
    filters.polymerStock ||
    filters.polymerNoStock ||
    filters.polymerLowStock;

  if (!anySubFilterSelected) return [];

  return stockData
    .filter(row => selectedPlants.includes(row.plantId))
    .filter(row => {

      let match = false;

      // ===== PELLETS =====
      if (filters.pelletsStock && row.pelletsStock !== null)
        match = true;

      if (filters.pelletsNoStock && row.pelletsStock === 0)
        match = true;

      if (
        filters.pelletsLowStock &&
        row.pelletsStock > 0 &&
        row.pelletsStock <= 200
      )
        match = true;

      // ===== POLYMER =====
      if (filters.polymerStock && row.polymerStock !== null)
        match = true;

      if (filters.polymerNoStock && row.polymerStock === 0)
        match = true;

      if (
        filters.polymerLowStock &&
        row.polymerStock > 0 &&
        row.polymerStock <= 10
      )
        match = true;

      return match;
    });

}, [stockData, filters, selectedPlants]);
  /* ---------------- DOWNLOAD CSV ---------------- */

const downloadReport = async () => {
  if (!finalFilteredData.length) {
    alert("No data found for selected filters");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Stock Report");

  let totalColumns = 4;
  if (filters.pellets) totalColumns++;
  if (filters.polymer) totalColumns++;

  /* ================= ADD LOGO ================= */

  const response = await fetch(companyLogo);
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();

  const imageId = workbook.addImage({
    buffer: buffer,
    extension: "jpeg",
  });

  worksheet.addImage(imageId, {
    tl: { col: 0, row: 0 },
    ext: { width: 120, height: 60 },
  });

  /* ================= HEADER TEXT ================= */

  // Company Name
  worksheet.mergeCells(1, 1, 1, totalColumns);
  const header1 = worksheet.getCell("A1");
  header1.value = "MVR TECHNOLOGY";
  header1.font = {
    name: "Times New Roman",
    size: 18,
    bold: true,
    color: { argb: "FFFF0000" },
  };
  header1.alignment = { horizontal: "center", vertical: "middle" };

  // Subtitle
  worksheet.mergeCells(2, 1, 2, totalColumns);
  const header2 = worksheet.getCell("A2");
  header2.value = "FSTP RAJASTHAN";
  header2.font = {
    name: "Times New Roman",
    size: 12,
    bold: true,
  };
  header2.alignment = { horizontal: "center" };

  // Report Title
  worksheet.mergeCells(3, 1, 3, totalColumns);
  const header3 = worksheet.getCell("A3");
  header3.value = "Pellets & Polymer Stock Details Report";
  header3.font = {
    name: "Times New Roman",
    size: 11,
  };
  header3.alignment = { horizontal: "center" };

  worksheet.addRow([]);

  /* ================= TABLE HEADER ================= */

  const columns = [
    "S.No",
    "Plant ID",
    "Plant Name",
    "Zone",
  ];

  if (filters.pellets) columns.push("Pellets Stock (Kg)");
  if (filters.polymer) columns.push("Polymer Stock (Kg)");

  const headerRow = worksheet.addRow(columns);

  headerRow.eachCell((cell) => {
    cell.font = {
      name: "Times New Roman",
      bold: true,
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9D9D9" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  /* ================= TABLE BODY ================= */

  finalFilteredData.forEach((row, index) => {
    const rowData = [
      index + 1,
      row.plantId,
      row.plantName,
      row.zone,
    ];

    if (filters.pellets)
      rowData.push(row.pelletsStock ?? "-");

    if (filters.polymer)
      rowData.push(row.polymerStock ?? "-");

    const dataRow = worksheet.addRow(rowData);

    dataRow.eachCell((cell, colNumber) => {
      cell.font = { name: "Times New Roman" };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      // ===== COLOR LOGIC =====
      if (filters.pellets && colNumber === columns.indexOf("Pellets Stock (Kg)") + 1) {
        const val = row.pelletsStock;
        if (val === 0)
          cell.font = { name: "Times New Roman", bold: true, color: { argb: "FFFF0000" } };
        else if (val > 0 && val <= 200)
          cell.font = { name: "Times New Roman", bold: true, color: { argb: "FFFFC000" } };
        else
          cell.font = { name: "Times New Roman", bold: true, color: { argb: "FF008000" } };
      }

      if (filters.polymer && colNumber === columns.indexOf("Polymer Stock (Kg)") + 1) {
        const val = row.polymerStock;
        if (val === 0)
          cell.font = { name: "Times New Roman", bold: true, color: { argb: "FFFF0000" } };
        else if (val > 0 && val <= 10)
          cell.font = { name: "Times New Roman", bold: true, color: { argb: "FFFFC000" } };
        else
          cell.font = { name: "Times New Roman", bold: true, color: { argb: "FF008000" } };
      }
    });
  });

  /* ================= AUTO WIDTH ================= */

  worksheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const length = cell.value ? cell.value.toString().length : 10;
      if (length > maxLength) maxLength = length;
    });
    column.width = maxLength + 2;
  });

  const bufferFile = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([bufferFile]), `Stock_Report_${date}.xlsx`);
};
const downloadPDF = async () => {
  if (!finalFilteredData.length) {
    alert("No data found for selected filters");
    return;
  }

  const doc = new jsPDF("portrait", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  /* ===== LOAD & COMPRESS LOGO ===== */
  const loadAndCompressImage = (
    src,
    { targetWidth = 240, targetHeight = 120, quality = 0.7 } = {}
  ) =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        resolve({
          base64: canvas.toDataURL("image/jpeg", quality),
          width: targetWidth,
          height: targetHeight
        });
      };
    });

  const logo = await loadAndCompressImage(companyLogo);

  /* ===== ADD LOGO ===== */
  doc.addImage(
    logo.base64,
    "JPEG",
    8,
    6,
    logo.width / 10,
    logo.height / 8
  );

  /* ===== COMPANY NAME ===== */
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(200, 0, 0);
  doc.text("MVR TECHNOLOGY", pageWidth / 2, 14, { align: "center" });

  /* ===== SUB TITLE ===== */
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("FSTP RAJASTHAN", pageWidth / 2, 21, { align: "center" });

  /* ===== REPORT TITLE ===== */
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(70);
  doc.text(
    "Pellets & Polymer Stock Details Report",
    pageWidth / 2,
    27,
    { align: "center" }
  );

  /* ===== LINE ===== */
  doc.setDrawColor(180);
  doc.line(6, 31, pageWidth - 6, 31);

  /* ===== TABLE COLUMNS ===== */
  const columns = [
    "S.No",
    "Plant ID",
    "Plant Name",
    "Zone"
  ];

  if (filters.pellets) {
    columns.push("Pellets Stock (Kg)");
  }

  if (filters.polymer) {
    columns.push("Polymer Stock (Kg)");
  }

  /* ===== TABLE ROWS ===== */
  const rows = finalFilteredData.map((row, index) => {
    const rowData = [
      index + 1,
      row.plantId,
      row.plantName,
      row.zone
    ];

    if (filters.pellets) {
      rowData.push(row.pelletsStock ?? "-");
    }

    if (filters.polymer) {
      rowData.push(row.polymerStock ?? "-");
    }

    return rowData;
  });

  autoTable(doc, {
    startY: 35,
    margin: { left: 10, right: 10 },
    pageBreak: "auto",
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: "linebreak",
      halign: "center",
      valign: "middle"
    },
    headStyles: {
      fillColor: [200, 200, 200],
      textColor: 20,
      fontStyle: "bold"
    },
    head: [columns],
    body: rows
  });

  doc.save(`Stock_Report_${date}.pdf`);
};

  /* ---------------- PLANT TOGGLE ---------------- */
const togglePlant = (plantId) => {
  setSelectedPlants(prev =>
    prev.includes(plantId)
      ? prev.filter(id => id !== plantId)
      : [...prev, plantId]
  );
};

const resetFilters = () => {
  setFilters({
    pellets: false,
    pelletsStock: false,
    pelletsNoStock: false,
    pelletsLowStock: false,
    polymer: false,
    polymerStock: false,
    polymerNoStock: false,
    polymerLowStock: false
  });

  setReportGenerated(false);
};
  /* ---------------- UI ---------------- */
 return (
  <div className="max-w-7xl mx-auto p-4">

    {/* ================= FILTER BAR ================= */}
    <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-6 items-end">

      {/* DATE */}
      <div>
        <label className="text-[10px] font-bold uppercase">Date</label>
        <div className="flex items-center gap-2 mt-1">
          <Calendar size={16} />
          <input
            type="date"
            value={date}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
            className="border p-2 rounded text-xs"
          />
        </div>
      </div>

      {/* ZONE FILTER */}
      <div>
        <label className="text-[10px] font-bold uppercase">Zone</label>
        <select
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          className="border p-2 rounded text-xs mt-1"
        >
          <option value="All">All Zones</option>
          {[...new Set(plants.map(p => p.zones))]
            .filter(z => z !== null && z !== undefined)
            .sort((a, b) => Number(a) - Number(b))
            .map(z => (
              <option key={z} value={String(z)}>
                Zone {z}
              </option>
          ))}
        </select>
      </div>

     <div className="flex items-center gap-3">

    {/* ================= generate and download report buttons ================= */}
  <button
    disabled={
      (!filters.pellets && !filters.polymer) ||
      selectedPlants.length === 0
    }
    onClick={() => setReportGenerated(true)}
    className={`px-4 py-2 rounded text-sm text-white ${
      filters.pellets || filters.polymer
        ? "bg-blue-600"
        : "bg-gray-400 cursor-not-allowed"
    }`}
  >
    Generate Report
  </button>

  {reportGenerated && (
  <>
    <button
      onClick={downloadReport}
      className="px-4 py-2 bg-green-600 text-white rounded text-sm"
    >
      Download Excel
    </button>

    <button
      onClick={downloadPDF}
      className="px-4 py-2 bg-red-600 text-white rounded text-sm"
    >
      Download PDF
    </button>
    <div className="flex justify-end mt-1">
  <button
    onClick={resetFilters}
    className="px-4 py-2 bg-gray-500 text-white rounded text-sm"
  >
    Reset
  </button>
</div>
  </>
)}

</div>

    </div>


 {/* ================= STOCK FILTER SECTION ================= */}
  <div className="bg-white rounded-xl border p-6 mt-6">

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

      {/* PELLETS */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <input
            type="checkbox"
            checked={filters.pellets}
            onChange={(e) =>
              setFilters({ ...filters, pellets: e.target.checked })
            }
          />
          <h3 className="font-bold text-sm uppercase">
            Pellets
          </h3>
        </div>

        {filters.pellets && (
          <div className="ml-6 space-y-2 text-sm">
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={filters.pelletsStock}
                onChange={(e) =>
                  setFilters({ ...filters, pelletsStock: e.target.checked })
                }
              />
              Current Stock
            </label>

            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={filters.pelletsNoStock}
                onChange={(e) =>
                  setFilters({ ...filters, pelletsNoStock: e.target.checked })
                }
              />
              No Stock (0 Kg)
            </label>

            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={filters.pelletsLowStock}
                onChange={(e) =>
                  setFilters({ ...filters, pelletsLowStock: e.target.checked })
                }
              />
              Low Stock (≤ 200 Kg)
            </label>
          </div>
        )}
      </div>

      {/* POLYMER */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <input
            type="checkbox"
            checked={filters.polymer}
            onChange={(e) =>
              setFilters({ ...filters, polymer: e.target.checked })
            }
          />
          <h3 className="font-bold text-sm uppercase">
            Polymer
          </h3>
        </div>

       

        {filters.polymer && (
          <div className="ml-6 space-y-2 text-sm">
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={filters.polymerStock}
                onChange={(e) =>
                  setFilters({ ...filters, polymerStock: e.target.checked })
                }
              />
              Current Stock
            </label>

            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={filters.polymerNoStock}
                onChange={(e) =>
                  setFilters({ ...filters, polymerNoStock: e.target.checked })
                }
              />
              No Stock (0 Kg)
            </label>

            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={filters.polymerLowStock}
                onChange={(e) =>
                  setFilters({ ...filters, polymerLowStock: e.target.checked })
                }
              />
              Low Stock (≤ 10 Kg)
            </label>
          </div>
        )}
      </div>

    </div>

    

  </div>


{!reportGenerated && (
  <div className="bg-white rounded-xl border overflow-hidden mt-6">

    <div className="px-5 py-3 border-b font-bold flex justify-between">
      <span>Plants ({filteredPlants.length})</span>
      <span>Selected: {selectedPlants.length}</span>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">

        <thead className="bg-slate-100">
          <tr>
           <th className="border p-2 text-center w-[90px]">
  <div className="flex items-center justify-center gap-2">
    <input
      type="checkbox"
      checked={allSelected}
      onChange={() => {
        if (allSelected) {
          setSelectedPlants([]);
        } else {
          setSelectedPlants(
            filteredPlants.map(p => p.plantID)
          );
        }
      }}
    />
    <span>S.No</span>
  </div>
</th>
            
            <th className="border p-2 text-center">Plant ID</th>
            <th className="border p-2 text-center">Plant Name</th>
            <th className="border p-2 text-center">Zone</th>
          </tr>
        </thead>

        <tbody>
          {filteredPlants
            .sort((a, b) => Number(a.plantID) - Number(b.plantID))
            .map((p, i) => (
              <tr key={p.plantID}>
                <td className="border text-center h-9">
               <div className="flex items-center justify-center gap-2">
                 <input
             type="checkbox"
             checked={selectedPlants.includes(p.plantID)}
             onChange={() => togglePlant(p.plantID)}
               />
           <span>{i + 1}</span>
          </div>
</td>
                <td className="border text-center font-semibold">
                  {p.plantID}
                </td>
                <td className="border text-center">
                  {p.plantName}
                </td>
                <td className="border text-center">
                  {p.zones}
                </td>
              </tr>
          ))}
        </tbody>

      </table>
    </div>
  </div>
)}
    {/* ================= PREVIEW TABLE ================= */}
    {reportGenerated && (
      <div className="bg-white rounded-xl border overflow-hidden mt-6">

        <div className="px-5 py-3 border-b font-bold flex justify-between items-center">
  <span>Stock Report ({finalFilteredData.length})</span>

  <button
  onClick={() => {
    setReportGenerated(false);
    setSelectedPlants(
      filteredPlants.map(p => p.plantID)
    );
  }}
  className="px-3 py-1 text-xs bg-gray-200 rounded"
>
  Back to All Plants
</button>
</div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">

            <thead className="bg-slate-100 text-[11px] uppercase font-bold">
              <tr>
                <th className="border p-2 text-center w-[60px]">S.No</th>
                <th className="border p-2 text-center">Plant ID</th>
                <th className="border p-2">Plant Name</th>
                <th className="border p-2 text-center">Zone</th>
                {filters.pellets && (
  <th className="border p-2 text-center">
    Pellets Stock (Kg)
  </th>
)}

{filters.polymer && (
  <th className="border p-2 text-center">
    Polymer Stock (Kg)
  </th>
)}
              </tr>
            </thead>

            <tbody>
  {finalFilteredData.map((row, i) => {

    const pelletsColor =
      row.pelletsStock === 0
        ? "text-red-600"
        : row.pelletsStock !== null && row.pelletsStock <= 200
        ? "text-yellow-600"
        : "text-green-600";

    const polymerColor =
      row.polymerStock === 0
        ? "text-red-600"
        : row.polymerStock !== null && row.polymerStock <= 10
        ? "text-yellow-600"
        : "text-green-600";

    return (
      <tr key={row.plantId} className="hover:bg-slate-50">
        <td className="border text-center">
  {i + 1}
</td>
        <td className="border p-2 text-center">{row.plantId}</td>
        <td className="border p-2 font-semibold">
          {row.plantName}
        </td>
        <td className="border p-2 text-center">{row.zone}</td>

        {filters.pellets && (
  <td className={`border p-2 text-center font-bold ${pelletsColor}`}>
    {row.pelletsStock ?? "-"}
  </td>
)}

{filters.polymer && (
  <td className={`border p-2 text-center font-bold ${polymerColor}`}>
    {row.polymerStock ?? "-"}
  </td>
)}
      </tr>
    );
  })}
</tbody>

          </table>
        </div>
      </div>
    )}

  </div>
);
}