import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import {
  EXCLUDE_FROM_SIDE_TOTALS,
  sumMetricOverall,
  sumVehicleMetricOverall,
  sumMetricForDate,
  sumVehicleMetricForDate
} from "./ReportTotals";

import companyLogo from "../company_logo.png";
import mainLogo from "../logo.png";

/* ================= HELPERS ================= */

let cachedLeftLogo = null;
let cachedCenterLogo = null;

const border = {
  top: { style: "thin" },
  bottom: { style: "thin" },
  left: { style: "thin" },
  right: { style: "thin" }
};

/* ================= TOTAL RULES (EXACT PREVIEW MATCH) ================= */

const formatDisplayDate = (dateString) => {
  if (!dateString) return "-";

  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`; // ✅ dd/mm/yyyy
};


const normalizeVehicleNo = (v) =>
  String(v || "").trim().toUpperCase();

const getTopVehiclesForPlantExcel = (plantRow, dates) => {
  const usage = {};

  dates.forEach(d => {
    plantRow.values?.[d]?.vehicleRows?.forEach(v => {
      const key = normalizeVehicleNo(v.vehicleNo);
      usage[key] = (usage[key] || 0) + (Number(v.distance) || 0);
    });
  });

  return Object.entries(usage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([v]) => v);
};
const getVehiclesForPlant = (r, dates) => {
  const vehiclesSet = new Set();

  dates.forEach(d => {
    const rows = r.values?.[d]?.vehicleRows || [];
    rows.forEach(v => {
      if (v.vehicleNo) {
        vehiclesSet.add(normalizeVehicleNo(v.vehicleNo));
      }
    });
  });

  const vehicles = Array.from(vehiclesSet);

  return [vehicles[0] || null, vehicles[1] || null];
};


const sumVehicleMetricBySlotExcel = (plantRow, dates, metric, vehicleNo) => {
  if (!vehicleNo) return 0;

  let total = 0;

  dates.forEach(d => {
    plantRow.values?.[d]?.vehicleRows?.forEach(v => {
      if (normalizeVehicleNo(v.vehicleNo) === normalizeVehicleNo(vehicleNo)) {
        total += Number(v[metric]) || 0;
      }
    });
  });

  return total;
};

const sumSinglePlantVehicleMetricExcel = (plantRow, dates, metric) => {
  let total = 0;

  dates.forEach(d => {
    plantRow.values?.[d]?.vehicleRows?.forEach(v => {
      total += Number(v[metric]) || 0;
    });
  });

  return total;
};


const sumVehicleMetricAllPlantsExcel = (rows, dates, metric, vehicleNo) => {
  if (!vehicleNo) return 0;

  let total = 0;

  rows.forEach(r => {
    total += sumVehicleMetricBySlotExcel(r, dates, metric, vehicleNo);
  });

  return total;
};


const applyCellStyle = (cell, bold = false, fill = null) => {
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border = border;
  if (bold) cell.font = { bold: true };
  if (fill) cell.fill = fill;
};

const formatIndian = (val) => {
  if (val === null || val === undefined || val === "-") return "-";
  const num = Number(val);
  if (isNaN(num)) return val;
  return num; 
};
// MULTI PLANT — SIDE TOTALS
const shouldExcludeExcelMultiSideTotal = (m) => {
  if (m.module === "lab") return true;
  if (m.metric === "tankLevel") return true;
  if (m.metric.toLowerCase().includes("stock")) return true;
  if (m.module === "vehicle" && m.metric === "odometer") return true;
  return false;
};

// MULTI PLANT — BOTTOM TOTALS
const shouldExcludeExcelMultiBottomTotal = (m) => {
    if (m.module === "lab" && m.metric !== "cumulativeFlow") return true;
  if (m.module === "vehicle" && m.metric === "odometer") return true;
  return false;
};

// SINGLE PLANT — BOTTOM TOTALS
const shouldExcludeExcelSingleBottomTotal = (m) => {
  // ❌ Exclude lab metrics EXCEPT cumulativeFlow
  if (m.module === "lab" && m.metric !== "cumulativeFlow") return true;

  if (m.metric === "tankLevel") return true;
  if (m.metric.toLowerCase().includes("stock")) return true;
  if (m.module === "vehicle" && m.metric === "odometer") return true;

  return false;
};

const imageToBase64 = async (imageUrl) => {
  const res = await fetch(imageUrl);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

const shouldIncludeSideTotal = (m) => {
 if (m.module === "lab" && m.metric !== "cumulativeFlow") return false;

  if (m.metric === "tankLevel") return false;
  if (m.metric.toLowerCase().includes("stock")) return false;
  if (m.module === "vehicle" && m.metric === "odometer") return false;
  return true;
};
const safeDate = (d) => formatDisplayDate(d).replaceAll("/", "-");

/* ================= MAIN EXPORT ================= */
const safeMerge = (sheet, r1, c1, r2, c2) => {
  const merges = Object.values(sheet._merges || {});

  const isOverlapping = merges.some(m => {
    return !(
      r2 < m.top ||
      r1 > m.bottom ||
      c2 < m.left ||
      c1 > m.right
    );
  });

  if (!isOverlapping) {
    sheet.mergeCells(r1, c1, r2, c2);
  }
};
const setCellNumericValue = (cell, val, isBold = false) => {
  applyCellStyle(cell, isBold);
  const num = Number(val);
  if (val === "-" || val === null || isNaN(num)) {
    cell.value = val ?? "-";
    return;
  }
  const rounded = Math.round(num * 100) / 100;
  cell.value = rounded;
  cell.numFmt = Number.isInteger(rounded) ? '#,##,##0' : '#,##,##0.00';
};
export default async function CustomizedExcel(previewData, dateRange) {
  if (!previewData) return;

  const { dates, metrics, rows } = previewData;

  const isSinglePlant = rows.length === 1;
  const singlePlantRow = isSinglePlant ? rows[0] : null;

  const nonVehicleMetrics = metrics.filter(m => m.module !== "vehicle");
const vehicleMetrics = metrics.filter(m => m.module === "vehicle");

const isVehicleEnabled = vehicleMetrics.length > 0;

  const showVehicleOdometer = metrics.some(
    m => m.module === "vehicle" && m.metric === "odometer"
  );
  const showVehicleDistance = metrics.some(
    m => m.module === "vehicle" && m.metric === "distance"
  );
  const showVehicleTrips = metrics.some(
    m => m.module === "vehicle" && m.metric === "trips"
  );


  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Operational Report");

  /* ================= LOGOS ================= */

  if (!cachedLeftLogo) cachedLeftLogo = await imageToBase64(companyLogo);
  if (!cachedCenterLogo) cachedCenterLogo = await imageToBase64(mainLogo);

  const leftLogoId = workbook.addImage({ base64: cachedLeftLogo, extension: "png" });
  const centerLogoId = workbook.addImage({ base64: cachedCenterLogo, extension: "png" });

  sheet.addImage(leftLogoId, { tl: { col: 0, row: 0 }, ext: { width: 90, height: 55 } });
  sheet.addImage(centerLogoId, { tl: { col: 4, row: 0 }, ext: { width: 200, height: 65 } });

sheet.getCell("H3").value =
  `Period: ${formatDisplayDate(dateRange.from)} to ${formatDisplayDate(dateRange.to)}`;

  sheet.mergeCells("H3:K3");

  sheet.getCell("H4").value = `Generated: ${new Date().toLocaleString()}`;
  sheet.mergeCells("H4:K4");

  while (sheet.rowCount < 4) sheet.addRow([]);
  
const vehicleCache = new Map();

rows.forEach(r => {
  const vehicles = [];

  for (const d of dates) {
    const vRows = r.values?.[d]?.vehicleRows || [];

    vRows.forEach(v => {
      const vn = normalizeVehicleNo(v.vehicleNo);
      if (vn && !vehicles.includes(vn)) {
        vehicles.push(vn);
      }
    });

    if (vehicles.length >= 2) break; // ✅ stop early
  }

  vehicleCache.set(r.plant.plantID, {
    v1: vehicles[0] || null,
    v2: vehicles[1] || null
  });
});


  let finalTotalRow = null;

const excelSideTotalMetrics = metrics
  .filter(m => shouldIncludeSideTotal(m))
  .filter(m => {
    if (m.module === "vehicle") return isVehicleEnabled;
    return true;
  });
  
  /* =====================================================
        SINGLE PLANT
     ===================================================== */
  if (isSinglePlant) {
    const header = [
      "S.No",
      "Plant ID",
      "Plant Name",
      "KLD",
      "Date",
      ...nonVehicleMetrics.map(m => m.label),
      ...(isVehicleEnabled ? ["Vehicle No"] : []),
      ...(showVehicleOdometer ? ["Odometer AM", "Odometer PM"] : []),
      ...(showVehicleDistance ? ["Distance"] : []),
      ...(showVehicleTrips ? ["Trips"] : [])
    ];

    const headerRow = sheet.addRow(header);
    headerRow.eachCell(c =>
      applyCellStyle(c, true, {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFB7DEE8" }
      })
    );

    const plantStartRow = sheet.rowCount + 1;

    dates.forEach(date => {
      const vehicles = singlePlantRow.values?.[date]?.vehicleRows || [{}];
      const dateStartRow = sheet.rowCount + 1;

      vehicles.forEach((v, vIdx) => {
        const row = [];

        if (sheet.rowCount === plantStartRow - 1) {
          row.push(
            1,
            singlePlantRow.plant.plantID,
            singlePlantRow.plant.plantName,
            singlePlantRow.plant.kld
          );
        } else {
          row.push("", "", "", "");
        }

        if (vIdx === 0) {
          row.push(formatDisplayDate(date));
          nonVehicleMetrics.forEach(m =>
            row.push(formatIndian(singlePlantRow.values?.[date]?.[m.metric]))
          );
        } else {
          row.push("");
          nonVehicleMetrics.forEach(() => row.push(""));
        }

        if (isVehicleEnabled) row.push(v.vehicleNo || "-");
        if (showVehicleOdometer) row.push(v.am ?? "-", v.pm ?? "-");
        if (showVehicleDistance) row.push(formatIndian(v.distance));
        if (showVehicleTrips) row.push(formatIndian(v.trips));

        const excelRow = sheet.addRow(row);
        excelRow.eachCell(c => applyCellStyle(c));
      });

      const dateEndRow = sheet.rowCount;
      let col = 5;

      sheet.mergeCells(dateStartRow, col, dateEndRow, col);
      col++;

      nonVehicleMetrics.forEach(() => {
        sheet.mergeCells(dateStartRow, col, dateEndRow, col);
        col++;
      });
    });

    const plantEndRow = sheet.rowCount;
    [1, 2, 3, 4].forEach(col =>
      sheet.mergeCells(plantStartRow, col, plantEndRow, col)
    );

    /* ===== SINGLE PLANT TOTAL ===== */

    finalTotalRow = ["TOTAL", "", "", "", ""];

    nonVehicleMetrics.forEach(m => {
      const value = shouldExcludeExcelSingleBottomTotal(m)
        ? "-"
        : sumMetricOverall([singlePlantRow], dates, m.metric);

      finalTotalRow.push(
        typeof value === "number" ? formatIndian(value) : "-"
      );
    });

    if (isVehicleEnabled) finalTotalRow.push("-");
    if (showVehicleOdometer) finalTotalRow.push("-", "-");

if (showVehicleDistance)
  finalTotalRow.push(
    formatIndian(
      sumSinglePlantVehicleMetricExcel(
        singlePlantRow,
        dates,
        "distance"
      )
    )
  );

if (showVehicleTrips)
  finalTotalRow.push(
    formatIndian(
      sumSinglePlantVehicleMetricExcel(
        singlePlantRow,
        dates,
        "trips"
      )
    )
  );

  }

  /* =====================================================
        MULTI PLANT
     ===================================================== */
/* ================= OPTIMIZED MULTI PLANT SECTION ================= */
else {
  const staticHeaders = ["S.No", "Plant ID", "Plant Name", "KLD"];
  const headerRow1 = [...staticHeaders];
  const headerRow2 = staticHeaders.map(() => "");

  // 1. Pre-calculate column spans to avoid repetitive math
  const colsPerDate = nonVehicleMetrics.length + (isVehicleEnabled ? 1 : 0) + 
                     (showVehicleOdometer ? 2 : 0) + (showVehicleDistance ? 1 : 0) + 
                     (showVehicleTrips ? 1 : 0);

  dates.forEach(date => {
    headerRow1.push(formatDisplayDate(date), ...Array(colsPerDate - 1).fill(""));
    nonVehicleMetrics.forEach(m => headerRow2.push(m.label));
    if (isVehicleEnabled) headerRow2.push("Vehicle No");
    if (showVehicleOdometer) headerRow2.push("Odometer AM", "Odometer PM");
    if (showVehicleDistance) headerRow2.push("Distance");
    if (showVehicleTrips) headerRow2.push("Trips");
  });

  excelSideTotalMetrics.forEach(m => {
    if (m.module === "vehicle") {
      headerRow1.push(`${m.label} By V1`, `${m.label} By V2`, `${m.label} Total`);
      headerRow2.push("", "", "");
    } else {
      headerRow1.push(`${m.label} Total`);
      headerRow2.push("");
    }
  });

  const row5 = sheet.addRow(headerRow1);
  const row6 = sheet.addRow(headerRow2);

  // 2. Optimized Styling: Style entire row once
  [row5, row6].forEach(r => {
    r.eachCell(c => applyCellStyle(c, true, { type: "pattern", pattern: "solid", fgColor: { argb: "FFB7DEE8" } }));
  });

  // 3. Merging Logic (Batch merges)
  let sideTotalStartCol = staticHeaders.length + (dates.length * colsPerDate) + 1;
  const sideTotalColStart = sideTotalStartCol;

  staticHeaders.forEach((_, i) => safeMerge(sheet, row5.number, i + 1, row6.number, i + 1));

  let colCursor = staticHeaders.length + 1;
  dates.forEach(() => {
    safeMerge(sheet, row5.number, colCursor, row5.number, colCursor + colsPerDate - 1);
    colCursor += colsPerDate;
  });

  excelSideTotalMetrics.forEach(m => {
    const span = m.module === "vehicle" ? 3 : 1;
    for (let i = 0; i < span; i++) {
      safeMerge(sheet, row5.number, sideTotalStartCol + i, row6.number, sideTotalStartCol + i);
    }
    sideTotalStartCol += span;
  });

  // 4. Optimized Row Generation
  rows.forEach((r, i) => {
    const plantID = r.plant.plantID;
    const { v1: pV1, v2: pV2 } = vehicleCache.get(plantID) || {};
    const maxVehicleRows = isVehicleEnabled ? Math.max(...dates.map(d => r.values?.[d]?.vehicleRows?.length || 1), 2) : 1;
    const startRow = sheet.rowCount + 1;
    r.__excelSideTotals = [];

    // Pre-calculate side totals for this plant once to avoid O(n^2)
    const plantSideTotals = excelSideTotalMetrics.map(m => {
      if (m.module === "vehicle") {
        const v1Val = sumVehicleMetricBySlotExcel(r, dates, m.metric, pV1);
        const v2Val = sumVehicleMetricBySlotExcel(r, dates, m.metric, pV2);
        return { metric: m.metric, v1: v1Val, v2: v2Val, total: v1Val + v2Val, isVehicle: true };
      }
      const val = sumMetricOverall([r], dates, m.metric);
      return { metric: m.metric, total: val, isVehicle: false };
    });
    r.__excelSideTotals = plantSideTotals;

    for (let vIdx = 0; vIdx < Math.min(maxVehicleRows, 2); vIdx++) {
      const rowData = [
        vIdx === 0 ? i + 1 : "",
        vIdx === 0 ? plantID : "",
        vIdx === 0 ? r.plant.plantName : "",
        vIdx === 0 ? r.plant.kld : ""
      ];

      dates.forEach(date => {
        const vehicles = r.values?.[date]?.vehicleRows || [];
        const targetVN = vIdx === 0 ? pV1 : pV2;
        const vehicle = vehicles.find(x => normalizeVehicleNo(x.vehicleNo) === normalizeVehicleNo(targetVN)) || {};

        if (vIdx === 0) {
          nonVehicleMetrics.forEach(m => rowData.push(formatIndian(r.values?.[date]?.[m.metric])));
        } else {
          nonVehicleMetrics.forEach(() => rowData.push(""));
        }

        if (isVehicleEnabled) {
          rowData.push(vehicle.vehicleNo || "-");
          if (showVehicleOdometer) rowData.push(vehicle.am ?? "-", vehicle.pm ?? "-");
          if (showVehicleDistance) rowData.push(vehicle.distance ?? 0);
          if (showVehicleTrips) rowData.push(vehicle.trips ?? 0);
        }
      });

      // Side Totals Columns
      if (vIdx === 0) {
        plantSideTotals.forEach(st => {
          if (st.isVehicle) rowData.push(st.v1, st.v2, st.total);
          else rowData.push(st.total);
        });
      } else {
        plantSideTotals.forEach(st => st.isVehicle ? rowData.push("", "", "") : rowData.push(""));
      }

      const excelRow = sheet.addRow(rowData);
      excelRow.eachCell(cell => {
        applyCellStyle(cell);
        if (typeof cell.value === 'number') {
          cell.numFmt = Number.isInteger(cell.value) ? '#,##,##0' : '#,##,##0.00';
        }
      });
    }

    const endRow = sheet.rowCount;
    // Batch Merging for the plant block
    [1, 2, 3, 4].forEach(c => safeMerge(sheet, startRow, c, endRow, c));
    let sideCol = sideTotalColStart;
    plantSideTotals.forEach(st => {
      const span = st.isVehicle ? 3 : 1;
      for (let i = 0; i < span; i++) safeMerge(sheet, startRow, sideCol + i, endRow, sideCol + i);
      sideCol += span;
    });
  });
/* =====================================================
      BOTTOM TOTAL CALCULATION (AFTER ALL ROWS)
===================================================== */

// 1. Initialize the footer with static labels
finalTotalRow = ["TOTAL", "", "", ""];

// 2. Add totals for every Date column
dates.forEach(date => {
  // Non-Vehicle Metrics
  nonVehicleMetrics.forEach(m => {
    const value = shouldExcludeExcelMultiBottomTotal(m)
      ? "-"
      : sumMetricForDate(rows, date, m.metric);
    finalTotalRow.push(value);
  });

  // Vehicle Placeholders / Totals
  if (isVehicleEnabled) finalTotalRow.push("-"); // Vehicle No Column
  
  if (showVehicleOdometer) {
    finalTotalRow.push("-", "-"); // AM and PM columns usually don't sum
  }

  if (showVehicleDistance) {
    finalTotalRow.push(sumVehicleMetricForDate(rows, date, "distance") || 0);
  }

  if (showVehicleTrips) {
    finalTotalRow.push(sumVehicleMetricForDate(rows, date, "trips") || 0);
  }
});

// 3. Add totals for the "Side Total" columns (Far Right)
excelSideTotalMetrics.forEach(m => {
  if (m.module === "vehicle") {
    let grandV1 = 0;
    let grandV2 = 0;

    rows.forEach(r => {
      const st = r.__excelSideTotals?.find(x => x.metric === m.metric);
      if (st) {
        // Swap logic applied here if required by your preview
        grandV1 += Number(st.v2 || 0); 
        grandV2 += Number(st.v1 || 0);
      }
    });

    finalTotalRow.push(
      grandV1, 
      grandV2, 
      grandV1 + grandV2
    );
  } else {
    let grandTotal = 0;
    // Exclude specific lab metrics from bottom total if needed
    const isExcluded = m.module === "lab" && m.metric !== "cumulativeFlow";

    if (isExcluded) {
      finalTotalRow.push("-");
    } else {
      rows.forEach(r => {
        const st = r.__excelSideTotals?.find(x => x.metric === m.metric);
        grandTotal += Number(st?.total || 0);
      });
      finalTotalRow.push(grandTotal);
    }
  }
});

/* =====================================================
      APPEND TOTAL ROW TO SHEET
===================================================== */
if (finalTotalRow) {
  const totalExcelRow = sheet.addRow(finalTotalRow);
  
  totalExcelRow.eachCell((cell) => {
    // Apply styling: Bold, Borders, and Number Formatting
    applyCellStyle(cell, true); 
    
    const val = Number(cell.value);
    if (!isNaN(val) && cell.value !== "" && cell.value !== null) {
      const rounded = Math.round(val * 100) / 100;
      cell.value = rounded;
      cell.numFmt = Number.isInteger(rounded) ? '#,##,##0' : '#,##,##0.00';
    } else if (cell.value === 0) {
      cell.value = 0;
      cell.numFmt = '#,##,##0';
    } else {
      cell.value = cell.value || "-";
    }
  });
}
  /* ================= ADD TOTAL ROW ================= */
}
  sheet.columns.forEach((c, i) => (c.width = i < 4 ? 14 : 12));

  const buffer = await workbook.xlsx.writeBuffer();
saveAs(
  new Blob([buffer]),
  `Operational_Report_${safeDate(dateRange.from)}_to_${safeDate(dateRange.to)}.xlsx`
);

}
