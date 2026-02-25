import React, { useEffect, useState, useCallback, useMemo } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { saveAs } from "file-saver";
import ExcelJS from "exceljs";

// import mainLogo from '../reports/logo.png';
import mainLogo from '../reports/logo1.jpg';
// import companyLogo from '../reports/company_logo.png'
import companyLogo from '../reports/company_logo1.jpg'

import { getAllPlants } from "../../services/plantService";
import { getOperationsByDateRange } from "../../services/operationService";
/* ================= API ================= */

const formatDisplayDate = (dateString) => {
  if (!dateString) return "-";

  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

/* ================= HELPERS ================= */
const formatNumber = (v) =>
  Number(v || 0).toLocaleString("en-IN");

const monthLabel = (ym) => {
  const [y, m] = ym.split("-");
  return new Date(y, m - 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
};
const oldSludgeHeader = (month) => {
  const [y, m] = month.split("-");
  return `Old Sludge (in liters)\n  01-${m}-${y} (AM)`;
};

let cachedCompanyLogo = null;
let cachedMainLogo = null;

const imageToBase64Compressed = (image, quality = 0.5, maxWidth = 800) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;

    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL("image/jpeg", quality));
    };
  });
};
const formatMonthYear = (monthStr) => {
  if (!monthStr) return "";

  const [year, month] = monthStr.split("-");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return `${monthNames[Number(month) - 1]} ${year}`;
};
export default function MonthlyReportPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [plantMaster, setPlantMaster] = useState({});
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
const [refreshKey, setRefreshKey] = useState(0);
const [zoneFilter, setZoneFilter] = useState("All");

  /* ================= LOAD PLANTS ================= */
const [plants, setPlants] = useState([]);

useEffect(() => {
  getAllPlants().then((list) => {
    setPlants(list || []);

    const map = {};
    (list || []).forEach((p) => {
      map[p.plantID] = {
        name: p.plantName,
        district: p.district,
        kld: p.kld,
        permanentPower: p.permanentPower,
        zone: p.zones, // ✅ IMPORTANT
      };
    });

    setPlantMaster(map);
  });
}, []);

const zones = useMemo(() => {
  return [...new Set(plants.map(p => p.zones).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b));
}, [plants]);
  const formattedMonth = formatMonthYear(month);

  const loadMonth = useCallback(async () => {
  if (!Object.keys(plantMaster).length) return;

  setLoading(true);
  setRows([]);
  const [year, monthNum] = month.split("-");

  // ✅ Start = first day of month
  const startDate = `${year}-${monthNum}-01`;

  // ✅ End = first day of NEXT month (API exclusive end)
  const endDate = new Date(year, Number(monthNum), 1)
    .toISOString()
    .split("T")[0];

    // ✅ Get plant IDs based on zone
const zonePlantIds =
  zoneFilter === "All"
    ? plants.map(p => p.plantID)
    : plants
        .filter(p => String(p.zones) === String(zoneFilter))
        .map(p => p.plantID);
  const temp = {};

  try {
    const rangeData = await getOperationsByDateRange(startDate, endDate);

rangeData.forEach((r) => {
  const pid = r.plantId;
  const op = r.operation;


  
  if (!temp[pid]) {
    temp[pid] = {
      plantId: pid,
      sludgeReceived: 0,
      sludgeProcessed: 0,
      oldSludge: 0,
      remaining: 0, // month-end PM
      
    };
  }

  // ✅ Old sludge = AM of 1st day
  if (op?.operationDate === startDate) {
    temp[pid].oldSludge = Number(op?.sludgeTankLevelAm || 0);
  }

  // ✅ Month totals
  temp[pid].sludgeReceived += Number(op?.sludgeReceived || 0);
  temp[pid].sludgeProcessed += Number(op?.sludgeProcessed || 0);

  // ✅ VERY IMPORTANT: overwrite with latest PM value
   if (
  op?.sludgeTankLevelPm != null &&
  (!temp[pid].lastPmDate ||
    op.operationDate > temp[pid].lastPmDate)
) {
  temp[pid].remaining = Number(op.sludgeTankLevelPm);
  temp[pid].lastPmDate = op.operationDate;
}
});

const finalRows = Object.values(temp)
  .filter(r => zonePlantIds.includes(r.plantId)) // ✅ FILTER HERE
  .map((r) => {
    const meta = plantMaster[r.plantId] || {};
    const total = r.oldSludge + r.sludgeReceived;

    return {
      plantId: r.plantId,
      district: meta.district,
      name: meta.name,
      kld: meta.kld,
      permanentPower: meta.permanentPower,
      sludgeReceived: r.sludgeReceived,
      oldSludge: r.oldSludge,
      total,
      sludgeProcessed: r.sludgeProcessed,
      remaining: r.remaining,
    };
  });
 

setRows(finalRows);

} catch (e) {
  console.error(e);
}

setLoading(false);
}, [month, plantMaster, plants, zoneFilter]); // ✅ zone added here


useEffect(() => {
  loadMonth();
}, [loadMonth, refreshKey]);


  /* ================= TOTALS ================= */
  const totals = rows.reduce(
    (a, r) => {
      a.sludgeReceived += r.sludgeReceived;
      a.oldSludge += r.oldSludge;
      a.total += r.total;
      a.sludgeProcessed += r.sludgeProcessed;
      a.remaining += r.remaining;
      return a;
    },
    {
      sludgeReceived: 0,
      oldSludge: 0,
      total: 0,
      sludgeProcessed: 0,
      remaining: 0,
    }
  );



  const imageToBase64 = async (imageUrl) => {
  const res = await fetch(imageUrl);
  const blob = await res.blob();

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

  /* ================= PDF ================= */
const downloadPdf = async () => {
  const doc = new jsPDF({
  orientation: "landscape",
  unit: "mm",
  format: "a4",
  compress: true,   // 🔥 CRITICAL
});

  const pageWidth = doc.internal.pageSize.getWidth();
const tableWidth = 192; // ✅ sum of all column widths
const tableX = (pageWidth - tableWidth) / 2;

  /* =====================================================
     LOGOS
  ===================================================== */
if (!cachedCompanyLogo) {
  cachedCompanyLogo = await imageToBase64Compressed(companyLogo, 0.5, 600);
}

doc.addImage(
  cachedCompanyLogo,
  "JPEG",
  tableX,   // ✅ EXACT table start
  6,        // Y position (keep as is)
  22,
  14
);

  /* =====================================================
     HEADER TEXT (UNCHANGED)
  ===================================================== */
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(179, 24, 24);
  doc.text("MVR TECHNOLOGY", pageWidth / 2, 10, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("times", "normal");
  doc.setTextColor(0);
  doc.text(
    "#207, Gowra Fountainhead, Madhapur, Hitech City, Hyderabad-500081",
    pageWidth / 2,
    14,
    { align: "center" }
  );
  doc.text(
    "email: mvrhydoffice@mvrtech.org",
    pageWidth / 2,
    17,
    { align: "center" }
  );

  doc.setFont("times", "bold");
  doc.text("FSTP RAJASTHAN", pageWidth / 2, 21, { align: "center" });

doc.setFillColor(95, 143, 228);
doc.rect(tableX, 23, tableWidth, 5, "F");

doc.setFont("times", "bold");
doc.setFontSize(9);
doc.setTextColor(255, 255, 255);
doc.text(
  `Monthly Report ( ${monthLabel(month)} )`,
  tableX + tableWidth / 2,
  26.2,
  { align: "center" }
);


  /* =====================================================
     TABLE
  ===================================================== */
  autoTable(doc, {
  startY: 27.8,
  theme: "grid",

  pageBreak: "avoid",
  rowPageBreak: "avoid",

  tableWidth: tableWidth,
  margin: { left: tableX },

styles: {
  font: "times",
  fontSize: 4.6,          // 🔽 critical
  cellPadding: 0.25,      // 🔽 critical
  textColor: [0, 0, 0],
  halign: "center",
  valign: "middle",
  lineWidth: 0.15,
  overflow: "linebreak",
},


headStyles: {
  fillColor: [211, 234, 200], // light green
  textColor: [0, 0, 0],   // ✅ RED
  fontStyle: "bold",
  fontSize: 5.4,
},

//   didParseCell: function (data) {
//   if (data.section === "body") {
//     data.cell.styles.fillColor = [211, 234, 200]; // #D3EAC8
//   }
// },
didParseCell: function (data) {
  // Only body cells
  if (data.section === "body") {
    const rowIndex = data.row.index;   // row number
    const colIndex = data.column.index; // column number

    // Site Name column index = 4 (0-based)
    if (colIndex === 4) {
      const rowData = rows[rowIndex];

      if (rowData?.permanentPower === false) {
        data.cell.styles.fillColor = [229, 231, 235]; // grey
        data.cell.styles.textColor = [0, 0, 0]; // dark black text
      }
    }
  }
},

columnStyles: {
  0: { cellWidth: 8 },   // S.No
  1: { cellWidth: 12 },  // Plant ID
  2: { cellWidth: 20 },  // District
  3: { cellWidth: 10 },  // KLD
  4: { cellWidth: 32 },  // Site Name
  5: { cellWidth: 22 },
  6: { cellWidth: 22 },
  7: { cellWidth: 22 },
  8: { cellWidth: 22 },
  9: { cellWidth: 22 },
},


  bodyStyles: {
    textColor: [0, 0, 0],
  },

footStyles: {
  fillColor: [95, 143, 228],
   textColor: [255, 255, 255], 
  fontStyle: "bold",
  fontSize: 6,
  minCellHeight: 5,   // ✅ increases footer row height
},

  head: [[
    "SI NO",
    "Plant ID",
    "District",
    "KLD",
    "Site Name",
    "Sludge Received \n (in litres)",
    oldSludgeHeader (month),
    "Total Sludge\n (in liters)",
    "Sludge Processed \n (in liters)",
    "Remaining Sludge \n (in liters)",
  ]],

  body: rows.map((r, i) => [
    i + 1,
    r.plantId,
    r.district,
    r.kld,
    r.name,
    formatNumber(r.sludgeReceived),
    formatNumber(r.oldSludge),
    formatNumber(r.total),
    formatNumber(r.sludgeProcessed),
    formatNumber(r.remaining),
  ]),

  foot: [[
    "TOTAL", "", "", "", "",
    formatNumber(totals.sludgeReceived),
    formatNumber(totals.oldSludge),
    formatNumber(totals.total),
    formatNumber(totals.sludgeProcessed),
    formatNumber(totals.remaining),
  ]],


});


  doc.save(`Monthly Report_${formattedMonth}.pdf`);
};


const INDIAN_NUMBER_FORMAT = "#,##,##0";


const downloadExcel = async () => {
  if (!rows.length) return;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Monthly Report");

  const generatedAt = new Date().toLocaleString("en-IN");

  /* =====================================================
     LOGOS
  ===================================================== */
  const leftLogoBase64 = await imageToBase64(companyLogo);
  const centerLogoBase64 = await imageToBase64(mainLogo);

  const leftLogoId = workbook.addImage({
    base64: leftLogoBase64,
    extension: "png",
  });

  const centerLogoId = workbook.addImage({
    base64: centerLogoBase64,
    extension: "png",
  });

  sheet.addImage(leftLogoId, {
    tl: { col: 0, row: 0 },
    ext: { width: 90, height: 55 },
  });

  sheet.addImage(centerLogoId, {
    tl: { col: 3.5, row: 0 },
    ext: { width: 220, height: 65 },
  });

 

  while (sheet.rowCount < 4) {
  sheet.addRow([]);
}

sheet.mergeCells("A6:J6");

const reportCell = sheet.getCell("A6");
reportCell.value = `Monthly Report ( ${monthLabel(month)} )`;

// FILL FIRST
reportCell.fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF5F8FE4" },
};

// FONT AFTER
reportCell.font = {
  bold: true,
  size: 12,
  color: { argb: "FFFFFFFF" },
};

reportCell.alignment = {
  horizontal: "center",
  vertical: "middle",
};


sheet.getRow(6).height = 26;


sheet.getCell("A6").font = { bold: true };
sheet.getCell("A6").alignment = {
  horizontal: "center",
  vertical: "middle",
};
sheet.getCell("A6").fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFBFD7FF" },
};

  /* =====================================================
     TABLE HEADER
  ===================================================== */
  const headers = [
    "S.No",
    "Plant ID",
    "District",
    "KLD",
    "Site Name",
    "Sludge Received (L)",
    oldSludgeHeader(month),
    "Total Sludge (L)",
    "Sludge Processed (L)",
    "Remaining Sludge (L)",
  ];

  const headerRow = sheet.addRow(headers);

headerRow.eachCell(cell => {
  cell.font = {
    bold: true,
    size: 11,
  };

  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD3EAC8" }, // same light green as PDF
  };

  cell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
  };
});


  /* =====================================================
     DATA ROWS
  ===================================================== */
rows.forEach((r, i) => {
  const row = sheet.addRow([
    i + 1,
    r.plantId,
    r.district,
    r.kld,
    r.name,
    r.sludgeReceived,
    r.oldSludge,
    r.total,
    r.sludgeProcessed,
    r.remaining,
  ]);

  row.eachCell((cell, colNumber) => {
    cell.alignment = {
      horizontal: colNumber <= 5 ? "center" : "right",
      vertical: "middle",
    };

    cell.font = { size: 10 };

    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };

    // ✅ APPLY INDIAN NUMBER FORMAT (columns 6–10)
    if (colNumber >= 6) {
      cell.numFmt = "#,##,##0";
    }

    // Grey site name if permanent power false
    if (colNumber === 5 && r.permanentPower === false) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE5E7EB" },
      };
    }
  });
});


  /* =====================================================
     TOTAL ROW
  ===================================================== */
const totalRow = sheet.addRow([
  "TOTAL",
  "",
  "",
  "",
  "",
  totals.sludgeReceived,
  totals.oldSludge,
  totals.total,
  totals.sludgeProcessed,
  totals.remaining,
]);

totalRow.eachCell((cell, colNumber) => {
  cell.font = {
    bold: true,
    size: 11,
    color: { argb: "FFFFFFFF" },
  };

  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF5F8FE4" },
  };

  cell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
  };

  // ✅ Indian commas in totals also
  if (colNumber >= 6) {
    cell.numFmt = "#,##,##0";
  }
});


  sheet.mergeCells(
    totalRow.number,
    1,
    totalRow.number,
    5
  );

  /* =====================================================
     COLUMN WIDTHS + FREEZE
  ===================================================== */
sheet.columns = [
  { width: 6 },
  { width: 10 },
  { width: 16 },
  { width: 8 },
  { width: 30 },
  { width: 18 },
  { width: 16 },
  { width: 18 },
  { width: 20 },
  { width: 20 },
];


  sheet.views = [{ state: "frozen", ySplit: headerRow.number }];

  /* =====================================================
     DOWNLOAD
  ===================================================== */
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer]),
    `Monthly_Report_${month}.xlsx`
  );
};

const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  /* ================= UI ================= */
return (
  <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen">
    
    {/* REPORT CONTAINER */}
    <div className="bg-white p-3 sm:p-4 min-h-screen font-serif">

      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-4">
        
        <div className="flex items-center gap-4">
          <img
            className="w-24 sm:w-28"
            src="https://mvr-attendance.web.app/MVR_Company_Logo%20copy.png"
            alt="MVR"
          />
        </div>

        <div className="text-center flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl text-[#b31818] font-extrabold">
            MVR TECHNOLOGY
          </h1>

          <div className="text-[10px] sm:text-xs">
            <div>#207, Gowra Fountainhead, Madhapur, Hyderabad</div>
            <div className="font-semibold">
              email: mvrhydoffice@mvrtech.org
            </div>
            <div className="font-bold">FSTP RAJASTHAN</div>
          </div>
        </div>
      </div>

      {/* ===== CONTROLS ===== */}
      <div className="flex flex-wrap gap-3 mb-4">
<select
  value={zoneFilter}
  onChange={(e) => setZoneFilter(e.target.value)}
  className="border p-2 text-sm"
>
  <option value="All">All Zones</option>
  {zones.map(z => (
    <option key={z} value={z}>Zone {z}</option>
  ))}
</select>
        <input
          type="month"
          value={month}
          max={currentMonth}
          onChange={(e) => setMonth(e.target.value)}
          className="border p-2 text-sm"
        />

        <button
          onClick={() => setRefreshKey(prev => prev + 1)}
          className="bg-red-700 text-white px-4 py-2 rounded text-sm"
        >
          Load Data
        </button>

        <button
          onClick={downloadPdf}
          className="bg-blue-700 text-white px-4 py-2 rounded text-sm"
        >
          Download PDF
        </button>

        <button
          onClick={downloadExcel}
          className="bg-green-700 text-white px-4 py-2 rounded text-sm"
        >
          Download Excel
        </button>
      </div>
         <div className="overflow-x-auto">
    <table
          className="w-full border-collapse text-xs min-w-[900px]"
          style={{ border: "1.5px solid #000" }}
        >
        <thead style={{ background: "#D3EAC8", fontWeight: "bold" }}>
    <tr>
      {[
        "S.No",
        "Plant ID",
        "District",
        "KLD",
        "Site Name",
        "Sludge Received (L)",
        oldSludgeHeader(month),
        "Total Sludge (L)",
        "Sludge Processed (L)",
        "Remaining Sludge (L)",
      ].map((h) => (
        <th
          key={h}
          style={{
            border: "1px solid #000",
            padding: "4px",
            textAlign: "center",
          }}
        >
          {h}
        </th>
      ))}
    </tr>
  </thead>

  <tbody>
    {rows.map((r, i) => (
      <tr key={i}>
        {[
          i + 1,
          r.plantId,
          r.district,
          r.kld,
          r.name,
          formatNumber(r.sludgeReceived),
          formatNumber(r.oldSludge),
          formatNumber(r.total),
          formatNumber(r.sludgeProcessed),
          formatNumber(r.remaining),
        ].map((val, idx) => (
          <td
            key={idx}
            style={{
              border: "1px solid #000",
              padding: "3px",
              textAlign: "center",
              // ✅ ONLY SITE NAME CELL
             backgroundColor:
             idx === 4 && r.permanentPower === false
             ? "#E5E7EB" // grey
             : "transparent",

            color:
           idx === 4 && r.permanentPower === false
           ? "#000000"
          : "#000",
            }}
          >
            {val}
          </td>
        ))}
      </tr>
    ))}
  </tbody>

  <tfoot>
    <tr style={{ fontWeight: "bold" }}>
      <td
        colSpan="5"
        style={{
          border: "1px solid #000",
          background: "#FFE066",
          textAlign: "center",
          padding: "4px",
        }}
      >
        Total
      </td>

      <td style={{ border: "1px solid #000", background: "#E3EFFB", textAlign: "center" }}>
        {formatNumber(totals.sludgeReceived)}
      </td>
      <td style={{ border: "1px solid #000", background: "#E3EFFB", textAlign: "center" }}>
        {formatNumber(totals.oldSludge)}
      </td>
      <td style={{ border: "1px solid #000", background: "#E3EFFB", textAlign: "center" }}>
        {formatNumber(totals.total)}
      </td>
      <td style={{ border: "1px solid #000", background: "#E3EFFB", textAlign: "center" }}>
        {formatNumber(totals.sludgeProcessed)}
      </td>
      <td style={{ border: "1px solid #000", background: "#E3EFFB", textAlign: "center" }}>
        {formatNumber(totals.remaining)}
      </td>
    </tr>
  </tfoot>
</table>
    </div>

      {loading && <p className="mt-4">Loading...</p>}
     </div>
    </div>

  );
}