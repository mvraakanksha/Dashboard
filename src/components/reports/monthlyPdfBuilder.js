import autoTable from "jspdf-autotable";
import { getAllPlants } from "../../services/plantService";
import { getOperationsByDateRange } from "../../services/operationService";

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
  return `Old Sludge (in liters)\n  ${y}-${m}-01(AM)`;
};

/* ================= BUILDER ================= */
export const addMonthlyReportToPdf = async ({
  doc,
  month,
  logos, // { company: base64 }
}) => {
  /* ================= LOAD PLANTS ================= */
  const plantList = await getAllPlants();
  const plantMaster = {};

  (plantList || []).forEach((p) => {
    plantMaster[p.plantID] = {
  name: p.plantName,
  district: p.district,
  kld: p.kld,
  permanentPowerDate: p.permanentPowerDateOfCompletion, // styling
  mnitDate: p.mnitDateOfCompletion,                     // ⭐ visibility
};
  });

  /* ================= LOAD OPERATIONS ================= */
  const [year, monthNum] = month.split("-");
  const startDate = `${year}-${monthNum}-01`;
  const endDate = new Date(year, Number(monthNum), 1)
    .toISOString()
    .split("T")[0];

const [y, m] = month.split("-");
const monthEnd = new Date(y, m, 0);

  const ops = await getOperationsByDateRange(startDate, endDate);

  const temp = {};

  ops.forEach(({ plantId, operation }) => {
    if (!temp[plantId]) {
      temp[plantId] = {
        plantId,
        sludgeReceived: 0,
        sludgeProcessed: 0,
        oldSludge: 0,
        remaining: 0,
         lastDate: null,   // ✅ ADD THIS
      };
    }

    // Old sludge = AM of 1st day
    if (operation.operationDate === startDate) {
      temp[plantId].oldSludge =
        Number(operation.sludgeTankLevelAm || 0);
    }

    temp[plantId].sludgeReceived +=
      Number(operation.sludgeReceived || 0);

    temp[plantId].sludgeProcessed +=
      Number(operation.sludgeProcessed || 0);

  if (
  operation.sludgeTankLevelPm != null &&
  (
    !temp[plantId].lastDate ||
    operation.operationDate > temp[plantId].lastDate
  )
) {
  temp[plantId].remaining =
    Number(operation.sludgeTankLevelPm);
  temp[plantId].lastDate = operation.operationDate;
}

  });

const rawRows = Object.entries(plantMaster).map(([pid, meta]) => {
  const op = temp[pid] || {
    sludgeReceived: 0,
    sludgeProcessed: 0,
    oldSludge: 0,
    remaining: 0,
  };

  const total = op.oldSludge + op.sludgeReceived;

  return {
    plantId: Number(pid),
    district: meta.district,
    name: meta.name,
    kld: meta.kld,
    permanentPowerDate: meta.permanentPowerDate,
    mnitDate: meta.mnitDate,
    sludgeReceived: op.sludgeReceived,
    oldSludge: op.oldSludge,
    total,
    sludgeProcessed: op.sludgeProcessed,
    remaining: op.remaining,
  };
});

const visibleRows = rawRows.filter(r => {
  if (!r.mnitDate) return false;

  return new Date(r.mnitDate).getTime() <= monthEnd.getTime();
});

const rows = visibleRows.map(r => {
  const completion = r.permanentPowerDate;

  const noPower =
    !completion ||
    new Date(completion) > monthEnd;

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
    {
      sludgeReceived: 0,
      oldSludge: 0,
      total: 0,
      sludgeProcessed: 0,
      remaining: 0,
    }
  );

  /* ================= PDF LAYOUT (LOCKED) ================= */
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = 192;
  const tableX = (pageWidth - tableWidth) / 2;

  /* ===== LOGO ===== */
  doc.addImage(
    logos.company,
    "JPEG",
    tableX,
    6,
    22,
    14
  );

  /* ===== HEADER TEXT ===== */
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
  doc.text(
    "email: mvrhydoffice@mvrtech.org",
    pageWidth / 2,
    17,
    { align: "center" }
  );

  doc.setFont("times", "bold");
  doc.text("FSTP RAJASTHAN", pageWidth / 2, 21, { align: "center" });

  /* ===== MONTH BAR ===== */
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
  autoTable(doc, {
    startY: 27.8,
    theme: "grid",
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
    },

    headStyles: {
      fillColor: [211, 234, 200],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 5.4,
    },

    didParseCell(data) {
      if (data.section === "body" && data.column.index === 4) {
        const rowData = rows[data.row.index];
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

    footStyles: {
      fillColor: [95, 143, 228],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6,
      minCellHeight: 5,
    },

    head: [[
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
};
