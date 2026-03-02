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
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2
  });
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

export default async function CustomizedExcel(previewData, dateRange) {
  if (!previewData) return;

  const { dates, metrics, rows } = previewData;

  const isSinglePlant = rows.length === 1;
  const singlePlantRow = isSinglePlant ? rows[0] : null;

  const nonVehicleMetrics = metrics.filter(m => m.module !== "vehicle");
  const isVehicleEnabled = metrics.some(m => m.module === "vehicle");

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
  


  let finalTotalRow = null;

  const excelSideTotalMetrics = metrics.filter(shouldIncludeSideTotal);

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
  else {
    const staticHeaders = ["S.No", "Plant ID", "Plant Name", "KLD"];
    const headerRow1 = [...staticHeaders];
    const headerRow2 = staticHeaders.map(() => "");

    dates.forEach(date => {
      const colsForDate =
        nonVehicleMetrics.length +
        (isVehicleEnabled ? 1 : 0) +
        (showVehicleOdometer ? 2 : 0) +
        (showVehicleDistance ? 1 : 0) +
        (showVehicleTrips ? 1 : 0);

 headerRow1.push(formatDisplayDate(date), ...Array(colsForDate - 1).fill(""));

      nonVehicleMetrics.forEach(m => headerRow2.push(m.label));

      if (isVehicleEnabled) headerRow2.push("Vehicle No");
      if (showVehicleOdometer) headerRow2.push("Odometer AM", "Odometer PM");
      if (showVehicleDistance) headerRow2.push("Distance");
      if (showVehicleTrips) headerRow2.push("Trips");
    });

  excelSideTotalMetrics.forEach(m => {
  if (m.module === "vehicle") {
    headerRow1.push(
      `${m.label} By V1`,
      `${m.label} By V2`,
      `${m.label} Total`
    );
    headerRow2.push("", "", "");
  } else {
    headerRow1.push(`${m.label} Total`);
    headerRow2.push("");
  }
});


    const row5 = sheet.addRow(headerRow1);
    const row6 = sheet.addRow(headerRow2);
    
    // 🔽 MERGE SIDE TOTAL HEADERS VERTICALLY
// 🔽 MERGE SIDE TOTAL HEADERS VERTICALLY
let sideTotalStartCol =
  staticHeaders.length +
  dates.length *
    (nonVehicleMetrics.length +
      (isVehicleEnabled ? 1 : 0) +
      (showVehicleOdometer ? 2 : 0) +
      (showVehicleDistance ? 1 : 0) +
      (showVehicleTrips ? 1 : 0)) +
  1;

excelSideTotalMetrics.forEach(m => {
  if (m.module === "vehicle") {
    // 🚗 Vehicle → 3 columns (V1, V2, Total)
    sheet.mergeCells(row5.number, sideTotalStartCol, row6.number, sideTotalStartCol);
    sheet.mergeCells(row5.number, sideTotalStartCol + 1, row6.number, sideTotalStartCol + 1);
    sheet.mergeCells(row5.number, sideTotalStartCol + 2, row6.number, sideTotalStartCol + 2);
    sideTotalStartCol += 3;
  } else {
    // 🧮 Non-vehicle → 1 column
    sheet.mergeCells(row5.number, sideTotalStartCol, row6.number, sideTotalStartCol);
    sideTotalStartCol += 1;
  }
});


    [row5, row6].forEach(r =>
      r.eachCell(c =>
        applyCellStyle(c, true, {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFB7DEE8" }
        })
      )
    );

    // staticHeaders.forEach((_, i) =>
    //   sheet.mergeCells(row5.number, i + 1, row6.number, i + 1)
    // );
staticHeaders.forEach((_, i) => {
  const col = i + 1;
  const address = `${row5.number}:${col}-${row6.number}:${col}`;

  // ✅ Merge ONLY if not already merged
  const isMerged = Object.values(sheet._merges || {}).some(
    m =>
      m.top === row5.number &&
      m.bottom === row6.number &&
      m.left === col &&
      m.right === col
  );

  if (!isMerged) {
    sheet.mergeCells(row5.number, col, row6.number, col);
  }
});

    let colCursor = staticHeaders.length + 1;
    const colsPerDate =
      nonVehicleMetrics.length +
      (isVehicleEnabled ? 1 : 0) +
      (showVehicleOdometer ? 2 : 0) +
      (showVehicleDistance ? 1 : 0) +
      (showVehicleTrips ? 1 : 0);

    dates.forEach(() => {
      sheet.mergeCells(
        row5.number,
        colCursor,
        row5.number,
        colCursor + colsPerDate - 1
      );
      colCursor += colsPerDate;
    });

    rows.forEach((r, i) => {
      const rowData = [
        i + 1,
        r.plant.plantID,
        r.plant.plantName,
        r.plant.kld
      ];
r.__excelSideTotals = [];

      dates.forEach(date => {
        nonVehicleMetrics.forEach(m =>
          rowData.push(formatIndian(r.values?.[date]?.[m.metric]))
        );

        if (isVehicleEnabled) rowData.push("-");
        if (showVehicleOdometer) rowData.push("-", "-");
        if (showVehicleDistance)
          rowData.push(
            formatIndian(sumVehicleMetricForDate([r], date, "distance"))
          );
        if (showVehicleTrips)
          rowData.push(
            formatIndian(sumVehicleMetricForDate([r], date, "trips"))
          );
      });

excelSideTotalMetrics.forEach(m => {
  if (m.module === "vehicle") {
    const [pV1, pV2] = getTopVehiclesForPlantExcel(r, dates);

    const v1Val = sumVehicleMetricBySlotExcel(r, dates, m.metric, pV1);
    const v2Val = sumVehicleMetricBySlotExcel(r, dates, m.metric, pV2);

    rowData.push(
      formatIndian(v1Val),
      formatIndian(v2Val),
      formatIndian(v1Val + v2Val)
    );

    // 👇 STORE RAW NUMBERS
r.__excelSideTotals.push({
  metric: m.metric,
  v1: v1Val,
  v2: v2Val,
  total: v1Val + v2Val
});

  } else {
    const val = sumMetricOverall([r], dates, m.metric);
    rowData.push(formatIndian(val));

r.__excelSideTotals.push({
  metric: m.metric,
  total: val
});

  }
});
// console.log(rows.map(r => r.__excelSideTotals));


      const excelRow = sheet.addRow(rowData);
      excelRow.eachCell(c => applyCellStyle(c));
    });

    finalTotalRow = ["TOTAL", "", "", ""];

    dates.forEach(date => {
      nonVehicleMetrics.forEach(m => {
        const value = shouldExcludeExcelMultiBottomTotal(m)
          ? "-"
          : sumMetricForDate(rows, date, m.metric);

        finalTotalRow.push(
          typeof value === "number" ? formatIndian(value) : "-"
        );
      });

      if (isVehicleEnabled) finalTotalRow.push("-");
      if (showVehicleOdometer) finalTotalRow.push("-", "-");

      if (showVehicleDistance)
        finalTotalRow.push(
          formatIndian(sumVehicleMetricForDate(rows, date, "distance"))
        );

      if (showVehicleTrips)
        finalTotalRow.push(
          formatIndian(sumVehicleMetricForDate(rows, date, "trips"))
        );
    });



//     const [v1, v2] = (() => {
//   const usage = {};
//   rows.forEach(r => {
//     dates.forEach(d => {
//       r.values?.[d]?.vehicleRows?.forEach(v => {
//         const key = normalizeVehicleNo(v.vehicleNo);
//         usage[key] = (usage[key] || 0) + (Number(v.distance) || 0);
//       });
//     });
//   });
//   return Object.entries(usage)
//     .sort((a, b) => b[1] - a[1])
//     .slice(0, 2)
//     .map(([v]) => v);
// })();


    // ✅ ADD SIDE TOTALS AT BOTTOM (MATCH PREVIEW)
// ✅ SIDE TOTALS AT BOTTOM — SUM OF ROW VALUES (MATCH UI)
// ✅ SIDE TOTALS AT BOTTOM — EXACT HEADER MATCH
// ✅ SIDE TOTALS AT BOTTOM — EXACT PREVIEW MATCH
// ✅ EXCEL FOOTER — EXACT PREVIEW MATCH (ROW-BASED)
excelSideTotalMetrics.forEach(m => {

  // 🚗 VEHICLE
  if (m.module === "vehicle") {
    let v1 = 0;
    let v2 = 0;

    rows.forEach(r => {
      const t = r.__excelSideTotals?.find(x => x.metric === m.metric);
      if (!t) return;

      v1 += t.v1 || 0;
      v2 += t.v2 || 0;
    });

    finalTotalRow.push(
      formatIndian(v1),
      formatIndian(v2),
      formatIndian(v1 + v2)
    );
    return;
  }

  // 🧮 NON-VEHICLE
// 🧮 NON-VEHICLE (MULTI PLANT BOTTOM TOTAL)
if (m.module === "lab" && m.metric !== "cumulativeFlow") {
  finalTotalRow.push("-");
  return;
}

let total = 0;
rows.forEach(r => {
  const t = r.__excelSideTotals?.find(x => x.metric === m.metric);
  if (!t) return;
  total += t.total || 0;
});

finalTotalRow.push(formatIndian(total));

});

  }

  /* ================= ADD TOTAL ROW ================= */

  if (finalTotalRow) {
    const totalExcelRow = sheet.addRow(finalTotalRow);
    totalExcelRow.eachCell(c => applyCellStyle(c, true));
  }

  sheet.columns.forEach((c, i) => (c.width = i < 4 ? 14 : 12));

  const buffer = await workbook.xlsx.writeBuffer();
saveAs(
  new Blob([buffer]),
  `Operational_Report_${safeDate(dateRange.from)}_to_${safeDate(dateRange.to)}.xlsx`
);

}
