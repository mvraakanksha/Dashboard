import autoTable from "jspdf-autotable";
import { getAllPlants } from "../../services/plantService";
import { getOperationsByDateRange } from "../../services/operationService";

const format = v => Number(v || 0).toLocaleString("en-IN");

export async function generateMonthlyPdf(doc, month) {
  const [year, monthNum] = month.split("-");
  const startDate = `${year}-${monthNum}-01`;
  const endDate = new Date(year, Number(monthNum), 1)
    .toISOString()
    .split("T")[0];

  /* ================= LOAD DATA ================= */
  const plants = await getAllPlants();
  const ops = await getOperationsByDateRange(startDate, endDate);

  const plantMap = {};
  plants.forEach(p => {
    plantMap[p.plantID] = p;
  });

  const temp = {};
  ops.forEach(({ plantId, operation }) => {
    if (!temp[plantId]) {
      temp[plantId] = {
        sludgeReceived: 0,
        sludgeProcessed: 0,
        oldSludge: 0,
        remaining: 0
      };
    }

    if (operation.operationDate === startDate) {
      temp[plantId].oldSludge = Number(operation.sludgeTankLevelAm || 0);
    }

    temp[plantId].sludgeReceived += Number(operation.sludgeReceived || 0);
    temp[plantId].sludgeProcessed += Number(operation.sludgeProcessed || 0);

    if (operation.sludgeTankLevelPm != null) {
      temp[plantId].remaining = Number(operation.sludgeTankLevelPm);
    }
  });

  const rows = Object.entries(temp).map(([pid, r]) => {
    const p = plantMap[pid] || {};
    const total = r.oldSludge + r.sludgeReceived;

    return {
      plantId: pid,
      district: p.district,
      kld: p.kld,
      name: p.plantName,
      sludgeReceived: r.sludgeReceived,
      oldSludge: r.oldSludge,
      total,
      sludgeProcessed: r.sludgeProcessed,
      remaining: r.remaining
    };
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

  /* ================= DRAW PDF ================= */
  doc.setFont("Times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(179, 24, 24);
  doc.text("MVR TECHNOLOGY", doc.internal.pageSize.getWidth() / 2, 12, {
    align: "center"
  });

  autoTable(doc, {
    startY: 20,
    theme: "grid",
    head: [[
      "S.No", "Plant ID", "District", "KLD", "Site Name",
      "Received", "Old", "Total", "Processed", "Remaining"
    ]],
    body: rows.map((r, i) => [
      i + 1,
      r.plantId,
      r.district,
      r.kld,
      r.name,
      format(r.sludgeReceived),
      format(r.oldSludge),
      format(r.total),
      format(r.sludgeProcessed),
      format(r.remaining)
    ]),
    foot: [[
      "TOTAL", "", "", "", "",
      format(totals.sludgeReceived),
      format(totals.oldSludge),
      format(totals.total),
      format(totals.sludgeProcessed),
      format(totals.remaining)
    ]]
  });
}
