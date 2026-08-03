import React, { useEffect, useState, useCallback } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { saveAs } from "file-saver";
import ExcelJS from "exceljs";

// import mainLogo from '../reports/logo.png';
import mainLogo from '../../reports/logo1.jpg';
// import comonthlympanyLogo from '../reports/company_logo.png'
import companyLogo from '../../reports/company_logo1.jpg'

import { getAllPlants } from "../../../services/plantService";
import { getOperationsByDateRange } from "../../../services/operationService";
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

const toYMD = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const da = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${da}`;
};

const getMonthEnd = (monthStr) => {
  const [y, m] = monthStr.split("-");
  return new Date(y, m, 0);
};

export default function MonthlyReportPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [plantMaster, setPlantMaster] = useState({});
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
const [refreshKey, setRefreshKey] = useState(0);
const [plants, setPlants] = useState([]);
const [zoneFilter, setZoneFilter] = useState("All");
const [phaseFilter, setPhaseFilter] = useState("All");

  /* ================= LOAD PLANTS ================= */
useEffect(() => {
getAllPlants().then((list) => {
  setPlants(list || []);

  const map = {};
  (list || []).forEach((p) => {
map[p.plantID] = {
  name: p.plantName,
  district: p.district,
  kld: p.kld,
  permanentPowerDate: p.permanentPowerDateOfCompletion,
  mnitDate: p.mnitDateOfCompletion,
  zone: p.zones,
  phase: p.plantPhase,
};
  });

  setPlantMaster(map);
});
}, []);
const getMonthDates = (monthStr) => {
  const [year, month] = monthStr.split("-").map(Number);

  const lastDay = new Date(year, month, 0).getDate();

  return {
    startDate: `${year}-${String(month).padStart(2, "0")}-01`,
    endDate: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    lastDay,
  };
};

  const formattedMonth = formatMonthYear(month);

  const loadMonth = useCallback(async () => {
  if (!Object.keys(plantMaster).length) return;

  setLoading(true);
  setRows([]);
const { startDate, endDate, lastDay } = getMonthDates(month);

console.log("Selected Month:", month);
console.log("Start Date:", startDate);
console.log("End Date:", endDate);
console.log("Last Day:", lastDay);

  const temp = {};

  try {
    const rangeData = await getOperationsByDateRange(startDate, endDate);

rangeData.forEach((r) => {
  const pid = r.plantId;
  const op = r.operation;

if (!temp[pid]) {
  temp[pid] = {
    plantId: pid,
    ops: [],                 // ⭐ STORE ALL OPS
    sludgeReceived: 0,
    sludgeProcessed: 0,
  };
}

temp[pid].ops.push({
  ...op,
  _date: op._date
});

temp[pid].sludgeReceived += Number(op?.sludgeReceived || 0);
temp[pid].sludgeProcessed += Number(op?.sludgeProcessed || 0);


  // ✅ VERY IMPORTANT: overwrite with latest PM value
//    if (
//   op?.sludgeTankLevelPm != null &&
//   (!temp[pid].lastPmDate ||
//     op.operationDate > temp[pid].lastPmDate)
// ) {
//   temp[pid].remaining = Number(op.sludgeTankLevelPm);
//   temp[pid].lastPmDate = op.operationDate;
// }
});

const getPreviousMonth = (monthStr) => {
  const [year, month] = monthStr.split("-").map(Number);

  const date = new Date(year, month - 2); // go 1 month back

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
};

const previousMonth = getPreviousMonth(month);

const prevStart = `${previousMonth}-01`;
const prevEndDateObj = new Date(previousMonth.split("-")[0], previousMonth.split("-")[1], 0);
const prevEnd = toYMD(new Date(prevEndDateObj.getFullYear(), prevEndDateObj.getMonth(), prevEndDateObj.getDate() + 1));

let previousMonthData = {};

try {
  const prevRangeData = await getOperationsByDateRange(prevStart, prevEnd);

  const tempPrev = {};

  prevRangeData.forEach((r) => {
    const pid = r.plantId;
    const op = r.operation;

    if (!tempPrev[pid]) {
      tempPrev[pid] = {
        ops: [],
      };
    }

    tempPrev[pid].ops.push(op);
  });

Object.keys(plantMaster).forEach((pid) => {
  const ops = tempPrev[pid]?.ops || [];

  previousMonthData[pid] = getClosingSludge(
    ops,
    prevStart,
    prevEnd
  );
});

} catch (e) {
  console.error("Previous month load error", e);
}

const getOpeningSludge = (ops, startDate, endDate) => {
  if (!ops?.length) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Build date map (same like closing)
  const map = {};

  ops.forEach(op => {
    if (!op.operationDate) return;

    const d = toYMD(op.operationDate);
    const time = new Date(d);

    if (time < start || time >= end) return;

    if (!map[d]) {
      map[d] = { am: null, pm: null };
    }

    if (op.sludgeTankLevelAm != null) {
      map[d].am = Number(op.sludgeTankLevelAm);
    }

    if (op.sludgeTankLevelPm != null) {
      map[d].pm = Number(op.sludgeTankLevelPm);
    }
  });

  // 🔥 Walk forward from month start
  let cursor = new Date(start);

  while (cursor < end) {
    const key = toYMD(cursor);
    const day = map[key];

    if (day) {
      if (day.am != null) return day.am;   // 1️⃣ AM first
      if (day.pm != null) return day.pm;   // 2️⃣ then PM
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return 0;
};

const getClosingSludge = (ops, startDate, endDate) => {
  if (!ops?.length) return 0;

const start = new Date(startDate);

// selected month's actual last day
const monthEnd = new Date(endDate);

  // ⭐ Build date map
  const map = {};

  ops.forEach(op => {
    if (!op.operationDate) return;

    const d = toYMD(op.operationDate);

    const time = new Date(d);
 if (time < start || time > monthEnd) return;
    if (!map[d]) {
      map[d] = { am: null, pm: null };
    }

    if (op.sludgeTankLevelAm != null) {
      map[d].am = Number(op.sludgeTankLevelAm);
    }

    if (op.sludgeTankLevelPm != null) {
      map[d].pm = Number(op.sludgeTankLevelPm);
    }
  });

  // ⭐ walk backward from month end
  let cursor = new Date(monthEnd);

  while (cursor >= start) {
    const key = toYMD(cursor); // ⭐ NO ISO STRING

    const day = map[key];

    if (day) {
      if (day.pm != null) return day.pm; // PM first
      if (day.am != null) return day.am; // then AM
    }

    cursor.setDate(cursor.getDate() - 1);
  }

  return 0;
};

const finalRows = Object.entries(plantMaster)
  .map(([pid, meta]) => {
    const op = temp[pid] || {
      sludgeReceived: 0,
      sludgeProcessed: 0,
      ops: [],
    };

const oldSludge = getOpeningSludge(op.ops || [], startDate, endDate);

    const remaining = getClosingSludge(op.ops || [], startDate, endDate);
    const total = oldSludge + op.sludgeReceived;

   return {
  plantId: Number(pid),
  district: meta.district,
  name: meta.name,
  kld: meta.kld,
  zone: meta.zone,
  phase: meta.phase,
  permanentPowerDate: meta.permanentPowerDate,
  mnitDate: meta.mnitDate,
  sludgeReceived: op.sludgeReceived,
  sludgeProcessed: op.sludgeProcessed,
  oldSludge,
  total,
  remaining,
};
  })
.filter((r) => {
  const zoneMatch =
    zoneFilter === "All" ||
    String(r.zone) === String(zoneFilter);

  const phaseMatch =
    phaseFilter === "All" ||
    String(r.phase) === String(phaseFilter);

  return zoneMatch && phaseMatch;
});

  const [y, m] = month.split("-");
const monthEnd = new Date(y, m, 0);

const visibleRows = finalRows.filter(r => {
  if (!r.mnitDate) return false; // not activated

  return new Date(r.mnitDate) <= monthEnd;
});


const withStatus = visibleRows.map(r => {
  const completion = r.permanentPowerDate;

  const noPower =
    !completion ||
    new Date(completion) > monthEnd;

  return {
    ...r,
    noPower
  };
});

setRows(withStatus);

  } catch (e) {
    console.error(e);
  }

  setLoading(false);
}, [month, plantMaster, zoneFilter, phaseFilter]);

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
/* ================= TABLE (uniform row height on every page) ================= */
  const ROWS_PER_PAGE = 40;
  const BOTTOM_MARGIN = 10;
  const HEAD_HEIGHT = 9;
  const SAFETY_BUFFER = 2;

  const headDef = [[
    "SI NO",
    "Plant ID",
    "District",
    "KLD",
    "Site Name",
    "Sludge Received \n (in litres)",
    oldSludgeHeader(month),
    "Total Sludge\n (in liters)",
    "Sludge Processed \n (in liters)",
    "Remaining Sludge \n (in liters)",
  ]];

  const bodyRows = rows.map((r, i) => [
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
  ]);

  const footDef = [[
    "TOTAL", "", "", "", "",
    formatNumber(totals.sludgeReceived),
    formatNumber(totals.oldSludge),
    formatNumber(totals.total),
    formatNumber(totals.sludgeProcessed),
    formatNumber(totals.remaining),
  ]];

  const chunks = [];
  for (let i = 0; i < bodyRows.length; i += ROWS_PER_PAGE) {
    chunks.push(bodyRows.slice(i, i + ROWS_PER_PAGE));
  }
  if (chunks.length === 0) chunks.push([]);

  const pageHeight = doc.internal.pageSize.getHeight();

  // ⭐ Compute ONE fixed row height based on a full 50-row page,
  //    using the continuation-page startY (10) since that's the
  //    tightest case (least available space).
  const referenceStartY = 27.8;
  const referenceFootHeight = 6;
  const referenceAvailableHeight =
    pageHeight - referenceStartY - BOTTOM_MARGIN - referenceFootHeight - HEAD_HEIGHT - SAFETY_BUFFER;
  const UNIFORM_ROW_HEIGHT = referenceAvailableHeight / ROWS_PER_PAGE;

  chunks.forEach((chunkRows, chunkIndex) => {
    const isFirstChunk = chunkIndex === 0;
    const isLastChunk = chunkIndex === chunks.length - 1;
    const startY = isFirstChunk ? 27.8 : 10;

    if (!isFirstChunk) {
      doc.addPage();
    }

    autoTable(doc, {
      startY,
      theme: "grid",
      pageBreak: "auto",
      rowPageBreak: "avoid",
      tableWidth,
      margin: { left: tableX },

      styles: {
        font: "times",
        fontSize: 4.6,
        cellPadding: 0.25,
        textColor: [0, 0, 0],
        halign: "center",
        valign: "middle",
        lineWidth: 0.15,
        overflow: "linebreak",
        minCellHeight: UNIFORM_ROW_HEIGHT, // ⭐ same fixed height, every page
      },

      headStyles: {
        fillColor: [211, 234, 200],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 5.4,
      },

      didParseCell(data) {
        if (data.section === "body" && data.column.index === 4) {
          const globalIndex = chunkIndex * ROWS_PER_PAGE + data.row.index;
          const rowData = rows[globalIndex];
          if (rowData?.noPower) {
            data.cell.styles.fillColor = [229, 231, 235];
            data.cell.styles.textColor = [0, 0, 0];
          }
        }
      },

      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 12 },
        2: { cellWidth: 20 },
        3: { cellWidth: 10 },
        4: { cellWidth: 32 },
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
        minCellHeight: 5,
      },

      head: headDef,
      body: chunkRows,
      foot: isLastChunk ? footDef : undefined,
    });
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
   if (colNumber === 5 && r.noPower) {
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
  {[...new Set(plants.map(p => p.zones).filter(Boolean))]
    .sort((a,b)=>Number(a)-Number(b))
    .map(z => (
      <option key={z} value={z}>Zone {z}</option>
    ))}
</select>
<select
  value={phaseFilter}
  onChange={(e) => setPhaseFilter(e.target.value)}
  className="border p-2 text-sm"
>
  <option value="All">All Phases</option>

  {[...new Set(plants.map((p) => p.plantPhase).filter((v) => v != null))]
    .sort((a, b) => Number(a) - Number(b))
    .map((phase) => (
      <option key={phase} value={phase}>
        Phase {phase}
      </option>
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
            idx === 4 && r.noPower
             ? "#E5E7EB" // grey
             : "transparent",

            color:
          idx === 4 && r.noPower
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