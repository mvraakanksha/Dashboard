import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/* ================= HELPERS ================= */
let cachedLeftLogo = null;
let cachedCenterLogo = null;
import {
  EXCLUDE_FROM_TOTALS,
  EXCLUDE_FROM_SIDE_TOTALS,
  sumMetricOverall,
  sumVehicleMetricOverall,
  sumMetricForDate,
  sumVehicleMetricForDate
} from "./ReportTotals";

import companyLogo from "../reports/company_logo.png";
import mainLogo from "../reports/logo.png";

const formatIndian = (val) => {
  if (val == null || val === "-") return "-";
  const num = Number(val);
  if (isNaN(num)) return val;
  return Math.round(num).toLocaleString("en-IN");
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


const NO_GRAND_TOTAL_METRICS = new Set([
  "tankLevel", "pelletsStock", "polymerStock",
  "cod", "bod", "tss", "temp", "tn", "ph",
  "odometer", "vehicleNo", "am", "pm"
]);

/* ================= MAIN EXPORT ================= */

const drawPdfHeader = async (doc, dateRange) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const generatedAt = new Date().toLocaleString();

  if (!cachedLeftLogo) {
    cachedLeftLogo = await imageToBase64(companyLogo);
  }
  if (!cachedCenterLogo) {
    cachedCenterLogo = await imageToBase64(mainLogo);
  }

  // LEFT LOGO
  doc.addImage(cachedLeftLogo, "PNG", 10, 6, 20, 13);

  // CENTER LOGO
doc.addImage(cachedCenterLogo, "PNG", pageWidth / 2 - 35, 6, 70, 15);

  // RIGHT TEXT
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PLANT OPERATIONS REPORT", pageWidth - 10, 12, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Period: ${formatDisplayDate(dateRange.from)} to ${formatDisplayDate(dateRange.to)}`,
    pageWidth - 10,
    17,
    { align: "right" }
  );
  doc.text(
    `Generated: ${generatedAt}`,
    pageWidth - 10,
    21,
    { align: "right" }
  );

  // LINE
  doc.setDrawColor(180);
  doc.setLineWidth(0.4);
  doc.line(10, 25, pageWidth - 10, 25);
};

/* ================= STYLES ================= */

const HEADER_STYLE = {
  fillColor: [30, 58, 138],
  textColor: 255,
  fontStyle: "bold",
  halign: "center"
};

const formatDisplayDate = (dateString) => {
  if (!dateString) return "-";

  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};


const CustomizedPdf = async (previewData, dateRange) => {
  if (!previewData) return;

  const { dates, metrics, rows } = previewData;

  const nonVehicleMetrics = metrics.filter(m => m.module !== "vehicle");

  const showVehicleOdometer = metrics.some(
    m => m.module === "vehicle" && m.metric === "odometer"
  );
  const showVehicleDistance = metrics.some(
    m => m.module === "vehicle" && m.metric === "distance"
  );
  const showVehicleTrips = metrics.some(
    m => m.module === "vehicle" && m.metric === "trips"
  );


  
const isVehicleEnabled = metrics.some(m => m.module === "vehicle");
const sideTotalMetrics = metrics.filter(
  m =>
    !EXCLUDE_FROM_SIDE_TOTALS.has(m.metric) &&
    (m.module !== "vehicle" || isVehicleEnabled)
);



 const doc = new jsPDF({
  orientation: "landscape",
  unit: "mm",
  format: "a4",
  compress: true   // 🔥 enables internal compression
});

  const pageWidth = doc.internal.pageSize.getWidth();


  /* ================= HEADER ROWS ================= */

const colsPerDate =
  nonVehicleMetrics.length +
  (isVehicleEnabled ? 1 : 0) +
  (showVehicleOdometer ? 2 : 0) +
  (showVehicleDistance ? 1 : 0) +
  (showVehicleTrips ? 1 : 0);

  const topHeader = [
    { content: "Plant Details", colSpan: 4, styles: HEADER_STYLE },
    ...dates.map(d => ({
      content: formatDisplayDate(d),
      colSpan: colsPerDate,
      styles: HEADER_STYLE
    })),
...sideTotalMetrics.map(m => ({
  content: `${m.label} Total`,
  styles: HEADER_STYLE
}))

  ];

  const bottomHeader = [
    "S.No",
    "Plant ID",
    "Plant Name",
    "KLD",
    ...dates.flatMap(() => [
      ...nonVehicleMetrics.map(m => m.label),
...(isVehicleEnabled ? ["Vehicle No"] : []),

      ...(showVehicleOdometer ? ["Odometer AM", "Odometer PM"] : []),
      ...(showVehicleDistance ? ["Distance"] : []),
      ...(showVehicleTrips ? ["Trips"] : [])
    ]),
    ...sideTotalMetrics.map(m => `${m.label} Total`)
  ];

  /* ================= BODY ================= */

  const body = [];

  rows.forEach((r, i) => {
    const maxVehicleRows = Math.max(
      ...dates.map(d => r.values?.[d]?.vehicleRows?.length || 1)
    );

    for (let rowIdx = 0; rowIdx < maxVehicleRows; rowIdx++) {
      const row = [];

      if (rowIdx === 0) {
        row.push(i + 1, r.plant.plantID, r.plant.plantName, r.plant.kld);
      } else {
        row.push("", "", "", "");
      }

      dates.forEach(date => {
  const vehicle = r.values?.[date]?.vehicleRows?.[rowIdx];

  if (rowIdx === 0) {
    nonVehicleMetrics.forEach(m =>
      row.push(formatIndian(r.values?.[date]?.[m.metric]))
    );
  } else {
    nonVehicleMetrics.forEach(() => row.push(""));
  }

  // ✅ Vehicle No ONLY if selected
  if (isVehicleEnabled) {
    row.push(vehicle?.vehicleNo || "-");
  }

  // ✅ Odometer
  if (showVehicleOdometer) {
    row.push(
      typeof vehicle?.am === "number" ? vehicle.am : "-"
    );
    row.push(
      typeof vehicle?.pm === "number" ? vehicle.pm : "-"
    );
  }

  // ✅ Distance
  if (showVehicleDistance) {
    row.push(formatIndian(vehicle?.distance));
  }

  // ✅ Trips
  if (showVehicleTrips) {
    row.push(formatIndian(vehicle?.trips));
  }
});


    if (rowIdx === 0) {
  sideTotalMetrics.forEach(m => {
    const value =
      m.module === "vehicle"
        ? sumVehicleMetricOverall([r], dates, m.metric)
        : dates.reduce((sum, d) => {
            const v = r.values?.[d]?.[m.metric];
            return typeof v === "number" ? sum + v : sum;
          }, 0);

    row.push(formatIndian(value));

  });
}
 else {
        sideTotalMetrics.forEach(() => row.push(""));
      }

      body.push(row);
    }
  });

  /* ================= BOTTOM TOTAL ================= */

  const totalRow = ["TOTAL", "", "", ""];

  dates.forEach(date => {
    nonVehicleMetrics.forEach(m =>
      totalRow.push(
        NO_GRAND_TOTAL_METRICS.has(m.metric)
          ? "-"
          : formatIndian(
              rows.reduce(
                (s, r) => s + (Number(r.values?.[date]?.[m.metric]) || 0),
                0
              )
            )
      )
    );

 if (isVehicleEnabled) {
  totalRow.push("-");
}


    if (showVehicleOdometer) totalRow.push("-", "-");

    if (showVehicleDistance) {
      totalRow.push(
        formatIndian(
          rows.reduce((s, r) => {
            const vr = r.values?.[date]?.vehicleRows || [];
            return s + vr.reduce((x, v) => x + (Number(v?.distance) || 0), 0);
          }, 0)
        )
      );
    }

    if (showVehicleTrips) {
      totalRow.push(
        formatIndian(
          rows.reduce((s, r) => {
            const vr = r.values?.[date]?.vehicleRows || [];
            return s + vr.reduce((x, v) => x + (Number(v?.trips) || 0), 0);
          }, 0)
        )
      );
    }
  });

sideTotalMetrics.forEach(m => {
  const total =
    m.module === "vehicle"
      ? sumVehicleMetricOverall(rows, dates, m.metric)
      : sumMetricOverall(rows, dates, m.metric);

  totalRow.push(formatIndian(total));
});


  body.push(totalRow);

  /* ================= RENDER ================= */
await drawPdfHeader(doc, dateRange);

autoTable(doc, {
  startY: 30,
  head: [topHeader, bottomHeader],
  body,

  theme: "grid", // ✅ borders ON + optimized

  tableWidth: pageWidth - 16,
  margin: { left: 8, right: 8 },

  styles: {
    font: "helvetica",       // ✅ light font
    fontSize: 4.5,           // ⬇ reduced (huge impact)
    cellPadding: 0.25,       // ⬇ reduced padding
    halign: "center",
    valign: "middle",
    lineWidth: 0.15          // ⬇ thinner borders
  },

  headStyles: {
    fillColor: [30, 58, 138],
    textColor: 255,
    fontStyle: "bold",
    lineWidth: 0.2
  },

  bodyStyles: {
    textColor: [0, 0, 0]
  },

  didParseCell(data) {
    // ✅ Bold only TOTAL row
    if (data.section === "body" && data.row.index === body.length - 1) {
      data.cell.styles.fontStyle = "bold";
    }
  },

  pageBreak: "auto",
  rowPageBreak: "avoid"
});



  doc.save(`Operational_Report_${formatDisplayDate(dateRange.from)}_to_${formatDisplayDate(dateRange.to)}.pdf`);
}


export default CustomizedPdf;