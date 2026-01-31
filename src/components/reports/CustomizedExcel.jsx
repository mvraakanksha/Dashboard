import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import {
  EXCLUDE_FROM_SIDE_TOTALS,
  sumMetricOverall,
  sumVehicleMetricOverall,
  sumMetricForDate,
  sumVehicleMetricForDate
} from "./ReportTotals";

import companyLogo from "../reports/company_logo.png";
import mainLogo from "../reports/logo.png";

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
  if (m.module === "lab") return true;
  if (m.module === "vehicle" && m.metric === "odometer") return true;
  return false;
};

// SINGLE PLANT — BOTTOM TOTALS
const shouldExcludeExcelSingleBottomTotal = (m) => {
  if (m.module === "lab") return true;
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

  const sideTotalMetrics = metrics.filter(
    m => !EXCLUDE_FROM_SIDE_TOTALS.has(m.metric)
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

  sheet.getCell("H3").value = `Period: ${dateRange.from} to ${dateRange.to}`;
  sheet.mergeCells("H3:K3");

  sheet.getCell("H4").value = `Generated: ${new Date().toLocaleString()}`;
  sheet.mergeCells("H4:K4");

  while (sheet.rowCount < 4) sheet.addRow([]);

  let finalTotalRow = null;

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
          row.push(date);
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
          sumVehicleMetricOverall([singlePlantRow], dates, "distance")
        )
      );

    if (showVehicleTrips)
      finalTotalRow.push(
        formatIndian(
          sumVehicleMetricOverall([singlePlantRow], dates, "trips")
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

      headerRow1.push(date, ...Array(colsForDate - 1).fill(""));
      nonVehicleMetrics.forEach(m => headerRow2.push(m.label));

      if (isVehicleEnabled) headerRow2.push("Vehicle No");
      if (showVehicleOdometer) headerRow2.push("Odometer AM", "Odometer PM");
      if (showVehicleDistance) headerRow2.push("Distance");
      if (showVehicleTrips) headerRow2.push("Trips");
    });

    sideTotalMetrics
      .filter(m => !shouldExcludeExcelMultiSideTotal(m))
      .forEach(m => {
        headerRow1.push(`${m.label} Total`);
        headerRow2.push("");
      });

    const row5 = sheet.addRow(headerRow1);
    const row6 = sheet.addRow(headerRow2);
    
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

sideTotalMetrics
  .filter(m => !shouldExcludeExcelMultiSideTotal(m))
  .forEach(() => {
    sheet.mergeCells(row5.number, sideTotalStartCol, row6.number, sideTotalStartCol);
    sideTotalStartCol++;
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

    staticHeaders.forEach((_, i) =>
      sheet.mergeCells(row5.number, i + 1, row6.number, i + 1)
    );

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

      sideTotalMetrics
        .filter(m => !shouldExcludeExcelMultiSideTotal(m))
        .forEach(m => {
          const value =
            m.module === "vehicle"
              ? sumVehicleMetricOverall([r], dates, m.metric)
              : sumMetricOverall([r], dates, m.metric);

          rowData.push(formatIndian(value));
        });

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
    // ✅ ADD SIDE TOTALS AT BOTTOM (MATCH PREVIEW)
sideTotalMetrics
  .filter(m => !shouldExcludeExcelMultiSideTotal(m))
  .forEach(m => {
    const value =
      m.module === "vehicle"
        ? sumVehicleMetricOverall(rows, dates, m.metric)
        : sumMetricOverall(rows, dates, m.metric);

    finalTotalRow.push(
      typeof value === "number" ? formatIndian(value) : "-"
    );
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
    `Operational_Report_${dateRange.from}_to_${dateRange.to}.xlsx`
  );
}
