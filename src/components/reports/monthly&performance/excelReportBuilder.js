import { getAllPlants } from "../../../services/plantService";
import { getOperationsByDateRange } from "../../../services/operationService";

/* ================= COLORS (matched to your PDF constants) ================= */
const HEADER_BG = "FF00245A";       // Performance.jsx HEADER_BG [0,36,90]
const ROW_ODD_BG = "FFD7E7FF";      // Performance.jsx ROW_ODD_BG [215,231,255]
const ROW_EVEN_BG = "FFEEEEEE";     // Performance.jsx ROW_EVEN_BG [238,238,238]
const TITLE_RED = "FFB31818";       // doc.setTextColor(179,24,24)
const BANNER_BLUE = "FF5F8FE4";     // monthlyPdfBuilder banner/footer fill [95,143,228]
const MONTHLY_HEAD_GREEN = "FFD3EAC8"; // monthlyPdfBuilder headStyles fillColor [211,234,200]
const NO_POWER_GREY = "FFE5E7EB";   // monthlyPdfBuilder didParseCell noPower fill [229,231,235]
const TITLE_BLUE = "FF1E40AF";      // doc.setTextColor(30,64,175) — top10 section titles

const THIN_BORDER = {
  top: { style: "thin", color: { argb: "FFBFBFBF" } },
  left: { style: "thin", color: { argb: "FFBFBFBF" } },
  bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
  right: { style: "thin", color: { argb: "FFBFBFBF" } },
};

// Every cell in every sheet uses this font family
const FONT_FAMILY = "Times New Roman";

// Indian digit grouping (e.g. 1,63,000 / 20,43,500) — Excel's custom number-format
// engine applies grouping based on comma position in the mask, so this string
// produces lakh/crore-style grouping instead of the western 3-digit grouping.
const INDIAN_NUM_FMT = "#,##,##0";

const formatNumber = (v) => Number(v || 0);

const monthLabel = (ym) => {
  const [y, m] = ym.split("-");
  return new Date(y, m - 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
};

const oldSludgeHeader = (month) => {
  const [y, m] = month.split("-");
  return `Old Sludge (in liters)\n01-${m}-${y} (AM)`;
};

const toYMD = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getMonthDates = (monthStr) => {
  const [year, month] = monthStr.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    startDate: `${year}-${String(month).padStart(2, "0")}-01`,
    endDate: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
};

const getOpeningSludge = (ops, startDate, endDate) => {
  if (!ops?.length) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const map = {};
  ops.forEach((op) => {
    if (!op.operationDate) return;
    const d = toYMD(op.operationDate);
    const time = new Date(d);
    if (time < start || time >= end) return;
    if (!map[d]) map[d] = { am: null, pm: null };
    if (op.sludgeTankLevelAm != null) map[d].am = Number(op.sludgeTankLevelAm);
    if (op.sludgeTankLevelPm != null) map[d].pm = Number(op.sludgeTankLevelPm);
  });
  let cursor = new Date(start);
  while (cursor < end) {
    const day = map[toYMD(cursor)];
    if (day) {
      if (day.am != null) return day.am;
      if (day.pm != null) return day.pm;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return 0;
};

const getClosingSludge = (ops, startDate, endDate) => {
  if (!ops?.length) return 0;
  const start = new Date(startDate);
  const monthEnd = new Date(endDate);
  const map = {};
  ops.forEach((op) => {
    if (!op.operationDate) return;
    const d = toYMD(op.operationDate);
    const time = new Date(d);
    if (time < start || time > monthEnd) return;
    if (!map[d]) map[d] = { am: null, pm: null };
    if (op.sludgeTankLevelAm != null) map[d].am = Number(op.sludgeTankLevelAm);
    if (op.sludgeTankLevelPm != null) map[d].pm = Number(op.sludgeTankLevelPm);
  });
  let cursor = new Date(monthEnd);
  while (cursor >= start) {
    const day = map[toYMD(cursor)];
    if (day) {
      if (day.pm != null) return day.pm;
      if (day.am != null) return day.am;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return 0;
};

/* ================= SHARED STYLING HELPERS ================= */
const styleHeaderRow = (row, bg = HEADER_BG) => {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
    cell.font = { name: FONT_FAMILY, bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = THIN_BORDER;
  });
};

const styleBodyRow = (row, bg) => {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = THIN_BORDER;
    cell.font = { name: FONT_FAMILY, size: 10 };
  });
};

// Applies Indian comma grouping to a set of column numbers (1-indexed) in a row
const applyIndianNumberFormat = (row, colNumbers) => {
  colNumbers.forEach((c) => {
    row.getCell(c).numFmt = INDIAN_NUM_FMT;
  });
};

/**
 * Adds the MVR Technology letterhead block to the top of a sheet.
 * Returns the next free row index (1-indexed) to continue writing from.
 */
const addCompanyHeader = (sheet, workbook, { logoBase64, mergeCols, zoneLabel, dateRangeLabel }) => {
  for (let r = 1; r <= 4; r++) sheet.mergeCells(r, 1, r, mergeCols);

  const title = sheet.getCell(1, 1);
  title.value = "MVR TECHNOLOGY";
  title.font = { name: FONT_FAMILY, size: 18, bold: true, color: { argb: TITLE_RED } };
  title.alignment = { horizontal: "center" };
  sheet.getRow(1).height = 24;

  const addr = sheet.getCell(2, 1);
  addr.value = "#207, Gowra Fountainhead, Madhapur, Hitech City, Hyderabad-500081";
  addr.font = { name: FONT_FAMILY, size: 9 };
  addr.alignment = { horizontal: "center" };

  const email = sheet.getCell(3, 1);
  email.value = "email: mvrhydoffice@mvrtech.org";
  email.font = { name: FONT_FAMILY, size: 9 };
  email.alignment = { horizontal: "center" };

  const fstp = sheet.getCell(4, 1);
  fstp.value = `FSTP RAJASTHAN${zoneLabel && zoneLabel !== "All" ? ` - ZONE ${zoneLabel}` : ""}`;
  fstp.font = { name: FONT_FAMILY, bold: true, size: 12 };
  fstp.alignment = { horizontal: "center" };

  let nextRow = 5;
  if (dateRangeLabel) {
    sheet.mergeCells(5, 1, 5, mergeCols);
    const dateCell = sheet.getCell(5, 1);
    dateCell.value = dateRangeLabel;
    dateCell.font = { name: FONT_FAMILY, size: 9, color: { argb: "FF666666" } };
    dateCell.alignment = { horizontal: "center" };
    nextRow = 6;
  }

  if (logoBase64) {
    try {
      const imageId = workbook.addImage({ base64: logoBase64.split(",")[1], extension: "jpeg" });
      sheet.addImage(imageId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 70, height: 38 } });
    } catch (e) {
      // logo is optional — don't fail the export if it can't be embedded
    }
  }

  return nextRow + 1; // blank row gap
};

/* ================= MONTHLY REPORT DATA (same as monthlyPdfBuilder.js) ================= */
export const buildMonthlyReportRows = async ({ month, zoneFilter = "All", phaseFilter = "All" }) => {
  const plantList = await getAllPlants();
  const plantMaster = {};
  (plantList || []).forEach((p) => {
    plantMaster[p.plantID] = {
      name: p.plantName,
      district: p.district,
      kld: p.kld,
      permanentPowerDate: p.permanentPowerDateOfCompletion,
      mnitDate: p.mnitDateOfCompletion,
      zone: p.zones,
      phase: p.plantPhase,
    };
  });

  const { startDate, endDate } = getMonthDates(month);
  const [y, m] = month.split("-").map(Number);
  const monthEnd = new Date(y, m, 0);

  const rangeData = await getOperationsByDateRange(startDate, endDate);
  const temp = {};
  rangeData.forEach((r) => {
    const pid = r.plantId;
    const op = r.operation;
    if (!temp[pid]) temp[pid] = { plantId: pid, ops: [], sludgeReceived: 0, sludgeProcessed: 0 };
    temp[pid].ops.push({ ...op, _date: op._date });
    temp[pid].sludgeReceived += Number(op?.sludgeReceived || 0);
    temp[pid].sludgeProcessed += Number(op?.sludgeProcessed || 0);
  });

  const finalRows = Object.entries(plantMaster)
    .map(([pid, meta]) => {
      const op = temp[pid] || { sludgeReceived: 0, sludgeProcessed: 0, ops: [] };
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
      const zoneMatch = zoneFilter === "All" || String(r.zone) === String(zoneFilter);
      const phaseMatch = phaseFilter === "All" || String(r.phase) === String(phaseFilter);
      return zoneMatch && phaseMatch;
    });

  const visibleRows = finalRows.filter((r) => r.mnitDate && new Date(r.mnitDate) <= monthEnd);

  const rows = visibleRows.map((r) => {
    const completion = r.permanentPowerDate;
    const noPower = !completion || new Date(completion) > monthEnd;
    return { ...r, noPower };
  });

  const totals = rows.reduce(
    (a, r) => {
      a.sludgeReceived += r.sludgeReceived;
      a.oldSludge += r.oldSludge;
      a.total += r.total;
      a.sludgeProcessed += r.sludgeProcessed;
      a.remaining += r.remaining;
      return a;
    },
    { sludgeReceived: 0, oldSludge: 0, total: 0, sludgeProcessed: 0, remaining: 0 }
  );

  return { rows, totals };
};

/* ================= SHEET 1: MONTHLY REPORT ================= */
export const addMonthlyReportSheet = async (workbook, { month, zoneFilter = "All", phaseFilter = "All", logoBase64 }) => {
  const { rows, totals } = await buildMonthlyReportRows({ month, zoneFilter, phaseFilter });
  const sheet = workbook.addWorksheet("Monthly Report", { views: [{ state: "frozen", ySplit: 0 }] });

  const COLS = 10;
  sheet.columns = [
    { width: 6 }, { width: 10 }, { width: 16 }, { width: 7 }, { width: 26 },
    { width: 16 }, { width: 18 }, { width: 15 }, { width: 17 }, { width: 17 },
  ];

  let row = addCompanyHeader(sheet, workbook, { logoBase64, mergeCols: COLS, zoneLabel: null });

  // Blue banner title (mirrors doc.setFillColor(95,143,228) rect + white text)
  sheet.mergeCells(row, 1, row, COLS);
  const banner = sheet.getCell(row, 1);
  banner.value = `Monthly Report ( ${monthLabel(month)} )`;
  banner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BANNER_BLUE } };
  banner.font = { name: FONT_FAMILY, bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  banner.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(row).height = 20;
  row += 1;

  const headerLabels = [
    "SI NO", "Plant ID", "District", "KLD", "Site Name",
    "Sludge Received\n(in litres)", oldSludgeHeader(month),
    "Total Sludge\n(in litres)", "Sludge Processed\n(in litres)", "Remaining Sludge\n(in litres)",
  ];
  const headerRow = sheet.addRow(headerLabels);
  styleHeaderRow(headerRow, MONTHLY_HEAD_GREEN);
  headerRow.eachCell((cell) => { cell.font = { ...cell.font, color: { argb: "FF000000" } }; });
  headerRow.height = 28;

  // Sludge value columns that get Indian comma grouping
  const NUMERIC_COLS = [6, 7, 8, 9, 10];

  rows.forEach((r, i) => {
    const bg = i % 2 === 0 ? ROW_EVEN_BG : ROW_ODD_BG;
    const dataRow = sheet.addRow([
      i + 1, r.plantId, r.district, r.kld, r.name,
      formatNumber(r.sludgeReceived), formatNumber(r.oldSludge),
      formatNumber(r.total), formatNumber(r.sludgeProcessed), formatNumber(r.remaining),
    ]);
    styleBodyRow(dataRow, bg);
    applyIndianNumberFormat(dataRow, NUMERIC_COLS);
    // Match PDF's didParseCell: only the Site Name cell greys out when noPower
    if (r.noPower) {
      const siteCell = dataRow.getCell(5);
      siteCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NO_POWER_GREY } };
    }
  });

  const totalRow = sheet.addRow([
    "TOTAL", "", "", "", "",
    formatNumber(totals.sludgeReceived), formatNumber(totals.oldSludge),
    formatNumber(totals.total), formatNumber(totals.sludgeProcessed), formatNumber(totals.remaining),
  ]);
  sheet.mergeCells(totalRow.number, 1, totalRow.number, 5);
  totalRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BANNER_BLUE } };
    cell.font = { name: FONT_FAMILY, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = THIN_BORDER;
  });
  applyIndianNumberFormat(totalRow, NUMERIC_COLS);

  return sheet;
};

/* ================= SHEET 2: TOP 10 (table + chart image, received & processed) ================= */
export const addTop10Sheet = (workbook, {
  receivedData, processedData, receivedImage, processedImage,
  fromDate, toDate, zone, logoBase64,
}) => {
  const sheet = workbook.addWorksheet("Top 10 Plants");
  const TABLE_COLS = 6; // S.No, Plant ID, District, KLD, Plant Name, Value
  const IMAGE_COL = 8;  // leave a gap column (col 7) before the chart image

  sheet.columns = [
    { width: 6 }, { width: 10 }, { width: 16 }, { width: 7 }, { width: 26 }, { width: 16 },
    { width: 3 }, { width: 3 },
  ];

  const dateRangeLabel = fromDate && toDate
    ? `${new Date(fromDate).toLocaleDateString("en-GB")} - ${new Date(toDate).toLocaleDateString("en-GB")}`
    : null;

  let row = addCompanyHeader(sheet, workbook, {
    logoBase64, mergeCols: TABLE_COLS, zoneLabel: zone, dateRangeLabel,
  });

  const addBlock = (title, data, valueLabel, image, startRow) => {
    sheet.getCell(startRow, 1).value = title;
    sheet.getCell(startRow, 1).font = { name: FONT_FAMILY, bold: true, color: { argb: TITLE_BLUE }, size: 12 };

    sheet.getCell(startRow, IMAGE_COL).value = `${title} - Graphical View`;
    sheet.getCell(startRow, IMAGE_COL).font = { name: FONT_FAMILY, bold: true, color: { argb: TITLE_BLUE }, size: 12 };

    const headerRow = sheet.getRow(startRow + 1);
    headerRow.getCell(1).value = "S.No";
    headerRow.getCell(2).value = "Plant ID";
    headerRow.getCell(3).value = "District";
    headerRow.getCell(4).value = "KLD";
    headerRow.getCell(5).value = "Plant Name";
    headerRow.getCell(6).value = valueLabel;
    styleHeaderRow({ eachCell: (fn) => { for (let c = 1; c <= 6; c++) fn(headerRow.getCell(c)); } });

    data.forEach((r, i) => {
      const bg = i % 2 === 0 ? ROW_EVEN_BG : ROW_ODD_BG;
      const dataRow = sheet.getRow(startRow + 2 + i);
      dataRow.getCell(1).value = i + 1;
      dataRow.getCell(2).value = r.plantId;
      dataRow.getCell(3).value = r.district;
      dataRow.getCell(4).value = r.kld;
      dataRow.getCell(5).value = r.label;
      dataRow.getCell(6).value = r.value;
      styleBodyRow({ eachCell: (fn) => { for (let c = 1; c <= 6; c++) fn(dataRow.getCell(c)); } }, bg);
      dataRow.getCell(6).numFmt = INDIAN_NUM_FMT;
    });

    if (image) {
      try {
        const imageId = workbook.addImage({ base64: image.split(",")[1], extension: "jpeg" });
        sheet.addImage(imageId, {
          tl: { col: IMAGE_COL - 1, row: startRow },
          ext: { width: 480, height: 260 },
        });
      } catch (e) {
        // chart image is optional — table data still exports fine without it
      }
    }

    // received/processed blocks each take ~13 rows (title+header+10 rows); image needs ~14 rows of vertical space
    return startRow + Math.max(data.length + 3, 15);
  };

  row = addBlock("Top 10 Plants – Sludge Received (L)", receivedData, "Received (L)", receivedImage, row);
  row += 1;
  addBlock("Top 10 Plants – Sludge Processed (L)", processedData, "Processed (L)", processedImage, row);

  return sheet;
};

/* ================= SHEET 3: ZERO SLUDGE RECEIVED ================= */
export const addZeroSheet = (workbook, { zeroSludgePlants, fromDate, toDate, zone, logoBase64 }) => {
  const sheet = workbook.addWorksheet("Zero Sludge");
  const COLS = 5;
  sheet.columns = [{ width: 6 }, { width: 10 }, { width: 16 }, { width: 7 }, { width: 30 }];

  let row = addCompanyHeader(sheet, workbook, { logoBase64, mergeCols: COLS, zoneLabel: zone });

  const dateRangeLabel = `${new Date(fromDate).toLocaleDateString("en-GB")} - ${new Date(toDate).toLocaleDateString("en-GB")}`;
  sheet.getCell(row, 1).value = "Zero Sludge Received Plants";
  sheet.getCell(row, 1).font = { name: FONT_FAMILY, bold: true, color: { argb: TITLE_BLUE }, size: 13 };
//   sheet.mergeCells(row, 3, row, COLS);
const dateCell = sheet.getCell(row, COLS);
dateCell.value = dateRangeLabel;
dateCell.font = {
  name: FONT_FAMILY,
  size: 9,
  color: { argb: "FF666666" },
};
dateCell.alignment = {
  horizontal: "right",
};

row += 2;
  const headerRow = sheet.getRow(row);
  ["S.No", "Plant ID", "District", "KLD", "Plant Name"].forEach((h, i) => { headerRow.getCell(i + 1).value = h; });
  styleHeaderRow(headerRow);
  row += 1;

  zeroSludgePlants.forEach((r, i) => {
    const bg = i % 2 === 0 ? ROW_EVEN_BG : ROW_ODD_BG;
    const dataRow = sheet.getRow(row + i);
    dataRow.getCell(1).value = i + 1;
    dataRow.getCell(2).value = r.plantId;
    dataRow.getCell(3).value = r.district || "-";
    dataRow.getCell(4).value = r.kld;
    dataRow.getCell(5).value = r.label;
    styleBodyRow(dataRow, bg);
  });

  return sheet;
};