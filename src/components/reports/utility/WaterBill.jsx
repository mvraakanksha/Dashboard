import React from 'react'
import { useEffect,useState } from 'react';
import { getAllPlants } from '../../../services/plantService';
import { getWaterDetailsByPlant } from '../../../services/operationService'
import { useMemo } from "react";
import { Calendar, Filter } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import companyLogo from '../../reports/company_logo1.jpg'

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
const [billFilter, setBillFilter] = useState("ALL");
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
  // WATER TYPE FILTER
  .filter(p => {
    if (!waterTypes.length) return true;
    return waterTypes.includes(p.waterType);
  })
  // DATE FILTER
  .map(p => {
    const dateFiltered = p.waterBills.filter(r => {
      const d = new Date(r.waterFilledDate);

      if (dateRange.from && d < new Date(dateRange.from)) return false;
      if (dateRange.to && d > new Date(dateRange.to)) return false;

      return true;
    });

    return {
      ...p,
      waterBills: dateFiltered
    };
  })
  // BILL STATUS FILTER
  .filter(p => {
    if (billFilter === "ENTERED") return p.waterBills.length > 0;
    if (billFilter === "NO_RECORD") return p.waterBills.length === 0;
    return true;
  });

  const exportRows = useMemo(() => {
  const rows = [];

  finalData.forEach((p, i) => {
    if (p.waterBills.length) {
      p.waterBills.forEach((r) => {
        rows.push({
          sno: i + 1,
          plantID: p.plantID,
          plantName: p.plantName,
          kld: p.kld,
          district: p.district,
          zone: p.zones,
          waterType: p.waterType,
          date: formatDisplayDate(r.waterFilledDate),
          water: r.waterLtrs ?? 0,
          amount: r.totalWaterAmount ?? 0,
          remarks: r.waterRemark ?? "-"
        });
      });
    } else {
      rows.push({
        sno: i + 1,
        plantID: p.plantID,
        plantName: p.plantName,
        kld: p.kld,
        district: p.district,
        zone: p.zones,
        waterType: p.waterType,
        date: "-",
        water: 0,
        amount: 0,
        remarks: "No Water Bills"
      });
    }
  });

  return rows;
}, [finalData]);

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
const buildMergedPdfBody = () => {
  const body = [];

  finalData.forEach((p, i) => {
    if (p.waterBills.length) {
      p.waterBills.forEach((r, idx) => {
        body.push([
          idx === 0 ? { content: i + 1, rowSpan: p.waterBills.length } : null,
          idx === 0 ? { content: p.plantID, rowSpan: p.waterBills.length } : null,
          idx === 0 ? { content: p.plantName, rowSpan: p.waterBills.length } : null,
          idx === 0 ? { content: p.kld, rowSpan: p.waterBills.length } : null,
          idx === 0 ? { content: p.district, rowSpan: p.waterBills.length } : null,
          idx === 0 ? { content: p.zones, rowSpan: p.waterBills.length } : null,
          idx === 0 ? { content: p.waterType, rowSpan: p.waterBills.length } : null,
          formatDisplayDate(r.waterFilledDate),
          `${formatIndian(r.waterLtrs ?? 0)} L`,
          `₹ ${formatIndian(r.totalWaterAmount ?? 0)}`,
          r.waterRemark ?? "-"
        ]);
      });
    } else {
  body.push([
    i + 1,
    p.plantID,
    p.plantName,
    p.kld,
    p.district,
    p.zones,
    p.waterType,
    {
      content: "No Water Bills",
      colSpan: 4,
      styles: { halign: "center" }
    }
  ]);
}
  });

  return body;
};

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

const buildPdfBody = () => {
  const body = [];
  let sno = 1;

  finalData.forEach((p) => {
    if (p.waterBills.length) {
      p.waterBills.forEach((r, idx) => {
        body.push([
          idx === 0 ? sno : "",
          idx === 0 ? p.plantID : "",
          idx === 0 ? p.plantName : "",
          idx === 0 ? p.kld : "",
          idx === 0 ? p.district : "",
          idx === 0 ? p.zones : "",
          idx === 0 ? p.waterType : "",
          formatDisplayDate(r.waterFilledDate),
          `${formatIndian(r.waterLtrs ?? 0)} L`,
          `${formatIndian(r.totalWaterAmount ?? 0)} Rs`,
          r.waterRemark ?? "-"
        ]);
      });

      sno++;
    } else {
      body.push([
        sno++,
        p.plantID,
        p.plantName,
        p.kld,
        p.district,
        p.zones,
        p.waterType,
        "No Water Bills",
        "",
        "",
        ""
      ]);
    }
  });

  return body;
};
const downloadPdf = async () => {
  const doc = new jsPDF("landscape");
  const pageWidth = doc.internal.pageSize.getWidth();

  /* ===== LOGO ===== */
  const logo = await loadAndCompressImage(companyLogo);

  doc.addImage(
    logo.base64,
    "JPEG",
    8,
    6,
    logo.width / 10,
    logo.height / 8
  );

  /* ===== HEADER ===== */
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(200, 0, 0);
  doc.text("MVR TECHNOLOGY", pageWidth / 2, 14, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("FSTP RAJASTHAN", pageWidth / 2, 21, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("Water Bill Report", pageWidth / 2, 27, { align: "center" });


  /* ===== TOTALS ===== */
  doc.setFontSize(10);
  doc.text(`Total Plants: ${overviewTotals[0].value}`, 14, 38);
  doc.text(`Total Water: ${formatIndian(overviewTotals[1].value)} L`, 80, 38);
  doc.text(`Total Amount:  ${formatIndian(overviewTotals[2].value)} Rs`, 170, 38);

  /* ===== TABLE ===== */
autoTable(doc, {
  startY: 45,

  theme: "grid",

  styles: {
    font: "times",
    fontSize: 8,
    cellPadding: 2,
    overflow: "linebreak"
  },

  headStyles: {
    fillColor: [220, 230, 241],
    textColor: 0,
    fontStyle: "bold",
    halign: "center"
  },

  columnStyles: {
    0: { cellWidth: 12 },
    1: { cellWidth: 25 },
    2: { cellWidth: 45 },
    3: { cellWidth: 15 },
    4: { cellWidth: 30 },
    5: { cellWidth: 20 },
    6: { cellWidth: 25 },
    7: { cellWidth: 25 },
    8: { cellWidth: 20 },
    9: { cellWidth: 25 },
    10:{ cellWidth: "auto" }
  },

  head: [[
    "SNO","Plant ID","Plant Name","KLD","District","Zone","Water Type",
    "Date","Water","Amount","Remarks"
  ]],

  body: buildPdfBody()
});
  doc.save("WaterBill.pdf");
};


const downloadExcel = async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Water Bill");

  const logo = await loadAndCompressImage(companyLogo);

const imageId = wb.addImage({
  base64: logo.base64,
  extension: "jpeg"
});

ws.addImage(imageId, {
  tl: { col: 0, row: 0 },   // top-left
  ext: { width: 120, height: 60 }
});

/* ===== HEADER ===== */

ws.mergeCells("A1:K1");
ws.getCell("A1").value = "MVR TECHNOLOGY";
ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
ws.getCell("A1").font = {
  name: "Times New Roman",
  bold: true,
  size: 18,
  color: { argb: "FFCC0000" }
};

ws.mergeCells("A2:K2");
ws.getCell("A2").value = "FSTP RAJASTHAN";
ws.getCell("A2").alignment = { horizontal: "center" };
ws.getCell("A2").font = {
  name: "Times New Roman",
  bold: true,
  size: 12
};

ws.mergeCells("A3:K3");
ws.getCell("A3").value = "Water Bill Report";
ws.getCell("A3").alignment = { horizontal: "center" };
ws.getCell("A3").font = {
  name: "Times New Roman",
  size: 11,
 
};
ws.mergeCells("A4:K4");


/* Row height */
ws.getRow(1).height = 35;
ws.getRow(2).height = 22;
ws.getRow(3).height = 20;

/* ===== TOTALS ===== */

ws.mergeCells("A5:C5");
ws.getCell("A5").value = `Total Plants: ${overviewTotals[0].value}`;
ws.getCell("A5").font = { name: "Times New Roman", bold: true };

ws.mergeCells("D5:F5");
ws.getCell("D5").value = `Total Water Used: ${formatIndian(overviewTotals[1].value)} L`;
ws.getCell("D5").font = { name: "Times New Roman", bold: true };

ws.mergeCells("G5:K5");
ws.getCell("G5").value = `Total Amount: ₹ ${formatIndian(overviewTotals[2].value)}`;
ws.getCell("G5").font = { name: "Times New Roman", bold: true };


  // rowIndex = ws.rowCount + 1;

  const headers = [
    "SNO","Plant ID","Plant Name","KLD","District","Zone","Water Type",
    "Date","Water Used","Amount","Remarks"
  ];
  ws.addRow(headers);
const headerRow = ws.lastRow;

headerRow.eachCell((cell) => {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDCE6F1" }   // light blue
  };

  cell.font = {
    name: "Times New Roman",
    bold: true,
    size: 11
  };

  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true
  };
});
  finalData.forEach((p, i) => {
    const start = ws.rowCount + 1;

    if (p.waterBills.length) {
      p.waterBills.forEach((r, idx) => {
        ws.addRow([
          idx === 0 ? i + 1 : "",
          idx === 0 ? p.plantID : "",
          idx === 0 ? p.plantName : "",
          idx === 0 ? p.kld : "",
          idx === 0 ? p.district : "",
          idx === 0 ? p.zones : "",
          idx === 0 ? p.waterType : "",
          formatDisplayDate(r.waterFilledDate),
          formatIndian(r.waterLtrs),
          formatIndian(r.totalWaterAmount),
          r.waterRemark
        ]);
      });

      const end = ws.rowCount;

      if (end > start) {
        for (let col = 1; col <= 7; col++) {
          ws.mergeCells(start, col, end, col);
        }
      }
    } else {
  const rowNumber = ws.rowCount + 1;

  ws.addRow([
    i + 1,
    p.plantID,
    p.plantName,
    p.kld,
    p.district,
    p.zones,
    p.waterType,
    "No Water Bills",
    "",
    "",
    ""
  ]);

  // Merge Date → Remarks
  ws.mergeCells(rowNumber, 8, rowNumber, 11);

  ws.getCell(rowNumber, 8).alignment = {
    horizontal: "center",
    vertical: "middle"
  };

  ws.getCell(rowNumber, 8).font = {
    name: "Times New Roman",
   
  };
}
  });
/* ===== BORDERS + ALIGNMENT ===== */

ws.eachRow({ includeEmpty: true }, (row) => {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };

    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true
    };

    if (!cell.font) {
      cell.font = { name: "Times New Roman", size: 10 };
    }
  });

});
const lastRow = ws.rowCount;

for (let r = 1; r <= lastRow; r++) {
  for (let c = 1; c <= 11; c++) {
    const cell = ws.getCell(r, c);

    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  }
}
/* ===== AUTO WIDTH ===== */

ws.columns.forEach((column) => {
  let max = 12;

  column.eachCell({ includeEmpty: true }, (cell) => {
    const value = cell.value ? cell.value.toString() : "";
    max = Math.max(max, value.length);
  });

  column.width = Math.min(max + 2, 45);
});
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), "WaterBill.xlsx");
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
<div>
  <label className="text-[10px] font-bold text-slate-500 uppercase">
    Bill Status
  </label>

  <div className="flex items-center gap-2 mt-1">
    <Filter size={16} />

    <select
      value={billFilter}
      onChange={(e) => setBillFilter(e.target.value)}
      className="border p-2 rounded text-xs"
    >
      <option value="ALL">All</option>
      <option value="ENTERED">Entered Bills</option>
      <option value="NO_RECORD">No Water Bills</option>
    </select>
  </div>
</div>
<div className="ml-auto flex gap-2">
  <button
    onClick={downloadPdf}
    className="bg-indigo-600 text-white px-4 py-2 rounded"
  >
    PDF
  </button>

  <button
    onClick={downloadExcel}
    className="bg-emerald-600 text-white px-4 py-2 rounded"
  >
    Excel
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
     <th  className="border p-2 text-center">Remarks</th>
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
          <td className="border p-2 text-center">{formatIndian(r.waterLtrs ?? 0)} Ltrs</td>
          <td className="border p-2 text-center">₹ {formatIndian(r.totalWaterAmount ?? 0)}</td>
          <td className="border p-2 text-center">{r.waterRemark ?? "-"}</td>
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
