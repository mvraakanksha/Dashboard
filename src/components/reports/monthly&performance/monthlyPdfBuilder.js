import autoTable from "jspdf-autotable";
import { getAllPlants } from "../../../services/plantService";
import { getOperationsByDateRange } from "../../../services/operationService";

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

const toYMD = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
};

const getMonthDates = (monthStr) => {
  const [year, month] = monthStr.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();

  return {
    startDate: `${year}-${String(month).padStart(2, "0")}-01`,
    endDate: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    lastDay,
  };
};

/* ⭐ walk forward from month start — AM first, then PM (matches page logic) */
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
    const key = toYMD(cursor);
    const day = map[key];
    if (day) {
      if (day.am != null) return day.am;
      if (day.pm != null) return day.pm;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return 0;
};

/* ⭐ walk backward from month end — PM first, then AM (matches page logic) */
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
    const key = toYMD(cursor);
    const day = map[key];
    if (day) {
      if (day.pm != null) return day.pm;
      if (day.am != null) return day.am;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return 0;
};

/* ================= BUILDER ================= */
export const addMonthlyReportToPdf = async ({
  doc,
  month,
  logos,
  zoneFilter = "All",
  phaseFilter = "All",
}) => {
  /* ================= LOAD PLANTS ================= */
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

  /* ================= DATE RANGE (⭐ this was never being set before) ================= */
  const { startDate, endDate } = getMonthDates(month);

  const [y, m] = month.split("-").map(Number);
  const monthEnd = new Date(y, m, 0);

  /* ================= LOAD OPERATIONS ================= */
  const rangeData = await getOperationsByDateRange(startDate, endDate);

  const temp = {};
  rangeData.forEach((r) => {
    const pid = r.plantId;
    const op = r.operation;

    if (!temp[pid]) {
      temp[pid] = {
        plantId: pid,
        ops: [],
        sludgeReceived: 0,
        sludgeProcessed: 0,
      };
    }

    temp[pid].ops.push({ ...op, _date: op._date });
    temp[pid].sludgeReceived += Number(op?.sludgeReceived || 0);
    temp[pid].sludgeProcessed += Number(op?.sludgeProcessed || 0);
  });

  /* ================= BUILD ROWS ================= */
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
  const zoneMatch =
    zoneFilter === "All" ||
    String(r.zone) === String(zoneFilter);

  const phaseMatch =
    phaseFilter === "All" ||
    String(r.phase) === String(phaseFilter);

  return zoneMatch && phaseMatch;
});
  const visibleRows = finalRows.filter((r) => {
    if (!r.mnitDate) return false;
    return new Date(r.mnitDate) <= monthEnd;
  });

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

  /* ================= PDF LAYOUT (LOCKED) ================= */
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = 192;
  const tableX = (pageWidth - tableWidth) / 2;

  doc.addImage(logos.company, "JPEG", tableX, 6, 22, 14);

  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(179, 24, 24);
  doc.text("MVR TECHNOLOGY", pageWidth / 2, 10, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.text(
    "#207, Gowra Fountainhead, Madhapur, Hitech City, Hyderabad-500081",
    pageWidth / 2,
    14,
    { align: "center" }
  );
  doc.text("email: mvrhydoffice@mvrtech.org", pageWidth / 2, 17, { align: "center" });

  doc.setFont("times", "bold");
  doc.text("FSTP RAJASTHAN", pageWidth / 2, 21, { align: "center" });

  doc.setFillColor(95, 143, 228);
  doc.rect(tableX, 23, tableWidth, 5, "F");

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `Monthly Report ( ${monthLabel(month)} )`,
    tableX + tableWidth / 2,
    26.2,
    { align: "center" }
  );

  /* ================= TABLE ================= */
 /* ================= TABLE (uniform row height on every page) ================= */
  const ROWS_PER_PAGE = 50;
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

  // ⭐ Use page 1's startY (27.8) — tightest case (least available space,
  //    due to logo/header block) — so 50 rows always fit everywhere.
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
};