import React, { useState, useEffect, useMemo } from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import {
  Truck,
  Navigation,
  Milestone,
  Activity,
  Layers,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  getVehicleGraphDashboard,
} from "../../services/vehicleService";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import companyLogo from "../reports/company_logo1.jpg";

/* ---------------- CLICKABLE X-TICK ---------------- */
const ClickableTick = ({
  x,
  y,
  payload,
  plantMap,
  navigate,
  insuranceAlertMap
}) => {
  const label = payload?.value;
  const plant = plantMap[label];
const alerts = insuranceAlertMap?.[label];
const firstAlert = alerts?.[0];

  return (
    <text
      x={x}
      y={y + 10}
      textAnchor="end"
      fill="#003f8a"
      fontSize={11}
      fontWeight={600}
      transform={`rotate(-45 ${x} ${y + 10})`}
      style={{ cursor: plant ? "pointer" : "default" }}
      onClick={() => {
        if (plant) {
          navigate(`/vehicle-view/${plant.plantId}/${plant.label}`);
        }
      }}
    >
      {/* hover tooltip */}
    {firstAlert && (
       <title>
{alerts
  ?.map(a =>
    `${a.vehicleNumber} — expires on ${new Date(a.expiry).toLocaleDateString("en-IN")} ${a.type === "red" ? "(Expired)" : "(Expiring soon)"}`
  )
  .join("\n")}
</title>
      )}

      {/* icon */}
 {firstAlert && (
  <tspan
    fill={firstAlert.type === "red" ? "#dc2626" : "#f59e0b"}
    fontSize={16}
    fontWeight="bold"
  >
    ⚠
  </tspan>
)}

      <tspan>{label}</tspan>
    </text>
  );
};

/* ---------------- TOOLTIP ---------------- */
const CombinedTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const d = payload[0].payload;

  return (
    <div className="bg-white border rounded shadow-md p-2 text-xs w-64">
      <p className="font-bold text-blue-900">
        PID: {d.plantId} - {d.label} - {d.kld} KLD
      </p>

      {d.v1 && (
        <div className="mt-2">
          <p className="font-semibold text-blue-400">
            Vehicle 1 – {d.v1.vehicleNumber}
          </p>

          <p>Distance: {d.v1.distance ?? 0} Km</p>
          <p>Fuel: {d.v1.fuel ?? "-"}</p>
          <p>No. of Trips: {d.v1.trips ?? 0}</p>
          <p>Sludge Collected: {d.v1.sludge ?? 0} L</p>
          <p>Remark: {d.v1.remark ?? "-"}</p>
        </div>
      )}

      {d.v2 && (
        <div className="mt-3">
          <p className="font-semibold text-blue-800">
            Vehicle 2 – {d.v2.vehicleNumber}
          </p>

          <p>Distance: {d.v2.distance ?? 0} Km</p>
          <p>Fuel: {d.v2.fuel ?? "-"}</p>
          <p>No. of Trips: {d.v2.trips ?? 0}</p>
          <p>Sludge Collected: {d.v2.sludge ?? 0} L</p>
          <p>Remark: {d.v2.remark ?? "-"}</p>
        </div>
      )}
    </div>
  );
};

/* ---------------- BAR TOP LABEL ---------------- */
const TopBarLabel = React.memo(({ x, y, width, value }) => {
  if (!value || value === 0) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fill="#003f8a"
      fontSize={11}
      fontWeight={700}
      pointerEvents="none"
    >
      {Math.round(value)}
    </text>
  );
});

/* ================================================= */
/* VEHICLE COMPONENT */
/* ================================================= */
export default function Vehicle({
  date,
  zone,
  apiZone,
  selectedPlants = [],
}) {
  const navigate = useNavigate();

const [vehicleDashboard, setVehicleDashboard] = useState(null);
const [vehicleSortMode, setVehicleSortMode] = useState("distance");
const [pdfFilter, setPdfFilter] = useState("all");

const selectedPlantIdsKey = useMemo(() => {
  if (!Array.isArray(selectedPlants) || selectedPlants.length === 0) {
    return "";
  }

  return selectedPlants
    .map(Number)
    .filter((id) => Number.isFinite(id))
    .sort((a, b) => a - b)
    .join(",");
}, [selectedPlants]);

useEffect(() => {
  if (!date) return;

  const loadVehicleDashboard = async () => {
    try {
      const data = await getVehicleGraphDashboard({
  operationDate: date,
  zone: apiZone ?? zone,
  plantIds: selectedPlants,
  expiryFilter: "ALL",
  sortBy:
    vehicleSortMode === "id"
      ? "PLANT_ID"
      : "TOTAL_DISTANCE",
  sortDirection:
    vehicleSortMode === "id"
      ? "ASC"
      : "DESC",
});

      setVehicleDashboard(data || null);
    } catch (error) {
      console.error(
        "Failed to load vehicle dashboard:",
        error
      );
      setVehicleDashboard(null);
    }
  };

  loadVehicleDashboard();
}, [
  date,
  apiZone,
  zone,
  selectedPlants,
  vehicleSortMode,
]);

const summary = vehicleDashboard?.summary || {};

const totalPlants = summary.totalPlants ?? 0;

const totalVehicles = summary.totalVehicles ?? 0;

const totalDrivers = summary.totalDrivers ?? 0;

const movedVehicles = summary.movedVehicles ?? 0;

const totalTrips = summary.ownVehicleTrips ?? 0;

const totalOwnSludge = summary.ownSludgeCollected ?? 0;

const totalDistance = summary.totalDistance ?? 0;

const avgDistance = summary.avgDistance ?? 0;

const totalPrivateTrips = summary.privateVehicleTrips ?? 0;

const totalPrivateSludge = summary.privateSludgeCollected ?? 0;


// const filteredOperationsData = useMemo(() => {
//   const plantIds = new Set(filteredPlants.map((p) => p.plantID));

//   return operationsData.filter((op) =>
//     plantIds.has(op.plantId)
//   );
// }, [operationsData, filteredPlants]);

/* ---------------- INSURANCE ALERT MAP ---------------- */
const insuranceAlertMap = useMemo(() => {
  const map = {};

  (vehicleDashboard?.plants || []).forEach((plant) => {
    const alerts = (plant.vehicles || [])
      .filter(
        (vehicle) =>
          vehicle.expiredStatus === true ||
          vehicle.expirySoonStatus === true
      )
      .map((vehicle) => ({
        vehicleNumber: vehicle.vehicleNumber,
        expiry: vehicle.insuranceExpiryDate,
        type: vehicle.expiredStatus === true ? "red" : "yellow",
      }));

    if (alerts.length > 0) {
      map[plant.plantName] = alerts;
    }
  });

  return map;
}, [vehicleDashboard]);

/* ---------------- BUILD CHART DATA ---------------- */
const chartData = useMemo(() => {
  return (vehicleDashboard?.plants || []).map((plant) => {
    const v1 = plant.vehicles?.[0];
    const v2 = plant.vehicles?.[1];

    return {
      label: plant.plantName,
      plantId: plant.plantId,
      kld: plant.kld,

      v1: v1
        ? {
            vehicleNumber: v1.vehicleNumber,
            distance: v1.distance ?? 0,
            fuel: v1.fuel ?? 0,
            trips: v1.noOfTrips ?? 0,
            sludge: v1.sludgeCollected ?? 0,
            remark: v1.remark ?? "-",
            insuranceExpiryDate: v1.insuranceExpiryDate,
            expiredStatus: v1.expiredStatus,
            expirySoonStatus: v1.expirySoonStatus,
          }
        : null,

      v2: v2
        ? {
            vehicleNumber: v2.vehicleNumber,
            distance: v2.distance ?? 0,
            fuel: v2.fuel ?? 0,
            trips: v2.noOfTrips ?? 0,
            sludge: v2.sludgeCollected ?? 0,
            remark: v2.remark ?? "-",
            insuranceExpiryDate: v2.insuranceExpiryDate,
            expiredStatus: v2.expiredStatus,
            expirySoonStatus: v2.expirySoonStatus,
          }
        : null,

      bar1: v1?.distance ?? 0,
      bar2: v2?.distance ?? 0,
    };
  });
}, [vehicleDashboard]);

/* ---------------- METRICS ---------------- */
// const summary = vehicleDashboard?.summary || {};

// const totalPlants = summary.totalPlants ?? 0;
// const totalVehicles = summary.totalVehicles ?? 0;
// const totalDrivers = summary.totalDrivers ?? 0;
// const movedVehicles = summary.movedVehicles ?? 0;
// const totalTrips = summary.ownVehicleTrips ?? 0;
// const totalOwnSludge = summary.ownSludgeCollected ?? 0;
// const totalDistance = summary.totalDistance ?? 0;
// const avgDistance = summary.avgDistance ?? 0;
// const totalPrivateTrips = summary.privateVehicleTrips ?? 0;
// const totalPrivateSludge = summary.privateSludgeCollected ?? 0;

  /* ---------------- PLANT MAP ---------------- */
  const plantMap = {};
  chartData.forEach((p) => (plantMap[p.label] = p));

  /* ---------------- SCROLL LOGIC ---------------- */
  const BAR_SLOT_WIDTH = 90;
  const DAY_SCROLL_THRESHOLD = 14;

  const needsScroll = chartData.length > DAY_SCROLL_THRESHOLD;

  const vehicleChartWidth = needsScroll
    ? chartData.length * BAR_SLOT_WIDTH
    : "100%";

const sortedChartData = chartData;

/* ---------------- ENTRY COUNT ---------------- */
const entryCount = useMemo(() => {
  if (!sortedChartData?.length) return 0;

  return vehicleSortMode === "id"
    ? sortedChartData.filter((p) => p.bar1 > 0 || p.bar2 > 0).length
    : sortedChartData.filter((p) => p.bar1 + p.bar2 > 0).length;
}, [sortedChartData, vehicleSortMode]);

    const loadAndCompressImage = (
      src,
      { targetWidth = 240, targetHeight = 120, quality = 0.7 } = {}
    ) =>
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;

        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          resolve({
            base64: canvas.toDataURL("image/jpeg", quality),
            width: targetWidth,
            height: targetHeight
          });
        };
      });


const downloadInsurancePdf = async () => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const logo = await loadAndCompressImage(companyLogo);

  /* ===== LOGO ===== */
  doc.addImage(
    logo.base64,
    "JPEG",
    8,
    6,
    logo.width / 10,
    logo.height / 8
  );

  /* ===== HEADER ===== */
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(200, 0, 0);
  doc.text("MVR TECHNOLOGY", pageWidth / 2, 14, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("FSTP RAJASTHAN", pageWidth / 2, 21, { align: "center" });

let reportTitle = "Vehicle Insurance Report";

if (pdfFilter === "expired") {
  reportTitle = "Vehicle Insurance Expired Report";
}

if (pdfFilter === "soon") {
  reportTitle = "Vehicle Insurance Expiring Soon Report";
}

if (pdfFilter === "both") {
  reportTitle = "Vehicle Insurance Expired and Expiring Soon Report";
}

doc.setFont("times", "bold");
doc.setFontSize(12);
doc.setTextColor(0);
doc.text(reportTitle, pageWidth / 2, 27, { align: "center" });
const getPlant = (id) =>
  (vehicleDashboard?.plants || []).find(
    (p) => Number(p.plantId) === Number(id)
  );
  /* ===== BUILD MASTER LIST ===== */
  const allVehicles = [];

let expiredCount = 0;
let soonCount = 0;
let goodCount = 0;

(vehicleDashboard?.plants || []).forEach((plant) => {
  (plant.vehicles || []).forEach((v) => {
    const status = v.expiredStatus
      ? "Expired"
      : v.expirySoonStatus
      ? "Expiring Soon"
      : "Good";

    if (status === "Expired") {
      expiredCount++;
    }

    if (status === "Expiring Soon") {
      soonCount++;
    }

    if (status === "Good") {
      goodCount++;
    }

    allVehicles.push({
      plantId: Number(plant.plantId),
      plantName: plant.plantName,
      zone: plant.zone ?? "-",
      vehicleNumber: v.vehicleNumber,
      expiry: v.insuranceExpiryDate
        ? new Date(v.insuranceExpiryDate).toLocaleDateString("en-IN")
        : "-",
      status,
    });
  });
});
  /* ===== FILTER ===== */
let list = allVehicles;

if (pdfFilter === "expired")
  list = allVehicles.filter(v => v.status === "Expired");

if (pdfFilter === "soon")
  list = allVehicles.filter(v => v.status === "Expiring Soon");

if (pdfFilter === "both")
  list = allVehicles.filter(
    v => v.status === "Expired" || v.status === "Expiring Soon"
  );


// const pageWidth = doc.internal.pageSize.getWidth();
const tableLeft = 14; // default autoTable margin
const tableRight = pageWidth - 14;
const tableWidth = tableRight - tableLeft;

doc.setFontSize(10);
doc.setFont("times", "normal");
doc.setTextColor(0, 0, 0); // Pure black
// Build dynamic items array
let items = [
  `Total Plants: ${totalPlants}`,
  `Total Vehicles: ${allVehicles.length}`
];

if (pdfFilter === "all") {
  items.push(
    `Good: ${goodCount}`,
    `Expired: ${expiredCount}`,
    `Soon: ${soonCount}`
  );
}

if (pdfFilter === "expired") {
  items.push(`Expired: ${expiredCount}`);
}

if (pdfFilter === "soon") {
  items.push(`Expiring Soon: ${soonCount}`);
}

if (pdfFilter === "both") {
  items.push(
    `Expired: ${expiredCount}`,
    `Soon: ${soonCount}`
  );
}

// Dynamic spacing
const sectionWidth = tableWidth / items.length;

items.forEach((text, index) => {
  const xPosition = tableLeft + (sectionWidth * index) + (sectionWidth / 2);
  doc.text(text, xPosition, 38, { align: "center" });
});

// Print everything in one line
// doc.text(summaryText, 14, 38);

  /* ===== GROUP BY PLANT ===== */
  const group = {};
  list.forEach(v => {
    if (!group[v.plantId]) group[v.plantId] = [];
    group[v.plantId].push(v);
  });

  /* ===== TABLE BODY (PLANT MERGE STYLE) ===== */
  const body = [];
doc.setDrawColor(0, 0, 0);
doc.setLineWidth(0.5); 

Object.entries(group).forEach(([plantId, vehicles]) => {
  const plant = getPlant(plantId);
 
  const totalRows = Math.max(vehicles.length, 1);
 
  for (let r = 0; r < totalRows; r++) {
    const row = [];
 
   if (r === 0) {
  row.push(
    {
      content: String(plant?.plantId ?? plantId),
      rowSpan: totalRows,
      styles: { valign: "middle" }
    },
    {
      content: String(plant?.plantName ?? "-"),
      rowSpan: totalRows,
      styles: { valign: "middle" }
    },
    {
      content: String(plant?.zone ?? "-"),
      rowSpan: totalRows,
      styles: { valign: "middle" }
    }
  );
}
    const vehicle = vehicles[r];
 
    row.push(
      vehicle?.vehicleNumber ?? "-",
      vehicle?.expiry ?? "-",
      vehicle?.status ?? "-"
    );
 
    body.push(row);
  }
});
 
  /* ===== TABLE ===== */
autoTable(doc, {
  startY: 50,
 
  theme: "grid",
 
  styles: {
    font: "times",
    fontSize: 8,
    cellPadding: 2,
    halign: "center",
    valign: "middle",
    lineColor: [0, 0, 0],   // 🔥 BLACK borders
    lineWidth: 0.5          // Slightly thicker
  },
 
  headStyles: {
    fillColor: [220, 230, 241],
    textColor: [0, 0, 0],   // 🔥 BLACK header text
    fontStyle: "bold",
    halign: "center",
    valign: "middle",
    lineColor: [0, 0, 0],   // 🔥 BLACK header borders
    lineWidth: 0.5
  },
 
  bodyStyles: {
    lineColor: [0, 0, 0],   // 🔥 BLACK body borders
    lineWidth: 0.2
  },
 
  head: [[
    "Plant ID",
    "Plant Name",
    "Zone",
    "Vehicle No",
    "Expiry",
    "Status"
  ]],
 
  body,
 
  didParseCell: (data) => {
    if (data.section === "body") {
      const val = data.row.raw[5];
 
      if (val === "Expired") {
        data.cell.styles.textColor = [220, 38, 38];
      }
 
      if (val === "Expiring Soon") {
        data.cell.styles.textColor = [180, 100, 0];
      }
 
      if (val === "Good") {
        data.cell.styles.textColor = [5, 150, 105];
      }
    }
  }
});

let fileName = "Vehicle_Insurance_Report.pdf";

if (pdfFilter === "expired") {
  fileName = "Vehicle_Insurance_Expired_Report.pdf";
}

if (pdfFilter === "soon") {
  fileName = "Vehicle_Insurance_Expiring_Soon_Report.pdf";
}

if (pdfFilter === "both") {
  fileName = "Vehicle_Insurance_Expired_and_Expiring_Soon_Report.pdf";
}

doc.save(fileName);
};

const downloadInsuranceExcel = async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Insurance Report");

  const logo = await loadAndCompressImage(companyLogo);

  /* ===== LOGO ===== */
  const imageId = wb.addImage({
    base64: logo.base64,
    extension: "jpeg"
  });

  ws.addImage(imageId, {
    tl: { col: 0, row: 0 },
    ext: { width: 120, height: 60 }
  });

  /* ===== HEADER ===== */

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "MVR TECHNOLOGY";
  ws.getCell("A1").alignment = { horizontal: "center" };

// MVR TECHNOLOGY (Red + Bold)
ws.getCell("A1").font = {
  name: "Times New Roman",
  size: 18,
  bold: true,
  color: { argb: "FFFF0000" } // Red
};

ws.getCell("A1").alignment = {
  horizontal: "center",
  vertical: "middle"
};


  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = "FSTP RAJASTHAN";

// FSTP RAJASTHAN (Black + Bold)
ws.getCell("A2").font = {
  name: "Times New Roman",
  size: 13,
  bold: true,
  color: { argb: "FF000000" } // Black
};

ws.getCell("A2").alignment = {
  horizontal: "center",
  vertical: "middle"
};


  ws.mergeCells("A3:G3");
let reportTitle = "Vehicle Insurance Report";

if (pdfFilter === "expired") {
  reportTitle = "Vehicle Insurance Expired Report";
}

if (pdfFilter === "soon") {
  reportTitle = "Vehicle Insurance Expiring Soon Report";
}

if (pdfFilter === "both") {
  reportTitle = "Vehicle Insurance Expired and Expiring Soon Report";
}

ws.getCell("A3").value = reportTitle;
// Vehicle Insurance Report (Black + Bold)
ws.getCell("A3").font = {
  name: "Times New Roman",
  size: 12,
  bold: true,
  color: { argb: "FF000000" } // Black
};

ws.getCell("A3").alignment = {
  horizontal: "center",
  vertical: "middle"
};
  ws.mergeCells("A4:G4");
/* ===== BUILD MASTER LIST ===== */

const allVehicles = [];

(vehicleDashboard?.plants || []).forEach((plant) => {
  (plant.vehicles || []).forEach((v) => {
    const status = v.expiredStatus
      ? "Expired"
      : v.expirySoonStatus
      ? "Expiring Soon"
      : "Good";

    allVehicles.push({
      plantId: Number(plant.plantId),
      plantName: plant.plantName,
      zone: plant.zone ?? "-",
      vehicleNumber: v.vehicleNumber,
      expiry: v.insuranceExpiryDate,
      status,
    });
  });
});
  /* ===== FILTER ===== */
  let list = allVehicles;

  if (pdfFilter === "expired")
    list = allVehicles.filter(v => v.status === "Expired");

  if (pdfFilter === "soon")
    list = allVehicles.filter(v => v.status === "Expiring Soon");

  if (pdfFilter === "both")
    list = allVehicles.filter(
      v => v.status === "Expired" || v.status === "Expiring Soon"
    );

  /* ===== TOTALS ===== */

  // const totalPlants = filteredPlants.length;
  // const totalVehicles = allVehicles.length;
  const goodCount = allVehicles.filter(v => v.status === "Good").length;
  const expiredCount = allVehicles.filter(v => v.status === "Expired").length;
  const soonCount = allVehicles.filter(v => v.status === "Expiring Soon").length;

  ws.mergeCells("A5:B5");
  ws.getCell("A5").value = `Total Plants: ${totalPlants}`;
  ws.getCell("A5").font = { bold: true };

  ws.mergeCells("C5:D5");
  ws.getCell("C5").value = `Total Vehicles: ${totalVehicles}`;
  ws.getCell("C5").font = { bold: true };

  ws.mergeCells("E5:G5");
let countText = "";

if (pdfFilter === "all") {
  countText = `Good: ${goodCount}   Expired: ${expiredCount}   Soon: ${soonCount}`;
}

if (pdfFilter === "expired") {
  countText = `Expired: ${expiredCount}`;
}

if (pdfFilter === "soon") {
  countText = `Expiring Soon: ${soonCount}`;
}

if (pdfFilter === "both") {
  countText = `Expired: ${expiredCount}   Soon: ${soonCount}`;
}

ws.getCell("E5").value = countText;

    ws.getCell("E5").font = { bold: true };

  ws.addRow([]);

  /* ===== TABLE HEADER ===== */

  const headers = [
    "Plant ID",
    "Plant Name",
    "Zone",
    "Vehicle Count",
    "Vehicle Number",
    "Expiry",
    "Status"
  ];

 ws.addRow(headers);

const tableStartRow = ws.lastRow.number; // header row number

ws.lastRow.eachCell(cell => {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9D9D9" }  // light grey
  };
  cell.font = {
    name: "Times New Roman",
    bold: true
  };
  cell.alignment = {
    horizontal: "center",
    vertical: "middle"
  };
});

const getPlant = (id) =>
  (vehicleDashboard?.plants || []).find(
    (p) => Number(p.plantId) === Number(id)
  );
  /* ===== GROUP + MERGE ===== */

  const group = {};
  list.forEach(v => {
    if (!group[v.plantId]) group[v.plantId] = [];
    group[v.plantId].push(v);
  });

  Object.entries(group).forEach(([plantId, vehicles]) => {
    const plant = getPlant(plantId);
    const startRow = ws.lastRow.number + 1;

  vehicles.forEach((v) => {
  ws.addRow([
    plant?.plantId ?? plantId,
    plant?.plantName ?? "-",
    plant?.zone ?? "-",
    vehicles.length,
    v.vehicleNumber,
    v.expiry
      ? new Date(v.expiry).toLocaleDateString("en-IN")
      : "-",
    v.status
  ]);
});
    const endRow = ws.lastRow.number;

    if (vehicles.length > 1) {
      ws.mergeCells(`A${startRow}:A${endRow}`);
      ws.mergeCells(`B${startRow}:B${endRow}`);
      ws.mergeCells(`C${startRow}:C${endRow}`);
      ws.mergeCells(`D${startRow}:D${endRow}`);
    }
  });
ws.columns = [
  { width: 14 }, // Plant ID
  { width: 24 }, // Plant Name
  { width: 14 }, // Zone
  { width: 16 }, // Vehicle Count
  { width: 20 }, // Vehicle Number
  { width: 16 }, // Expiry
  { width: 20 }, // Status
];

const tableEndRow = ws.lastRow.number;

/* =========================================================
   STYLE ENTIRE SHEET
========================================================= */

ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
  row.height = 22;

  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = {
      name: "Times New Roman",
      size: 11,
      bold:
        rowNumber === 1 ||
        rowNumber === 2 ||
        rowNumber === 3 ||
        rowNumber === 5 ||
        rowNumber === tableStartRow,
      color: { argb: "FF000000" },
    };

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  });
});

/* =========================================================
   HEADER STYLING
========================================================= */

// MVR TECHNOLOGY
ws.getCell("A1").font = {
  name: "Times New Roman",
  size: 18,
  bold: true,
  color: { argb: "FFFF0000" },
};

ws.getCell("A1").alignment = {
  horizontal: "center",
  vertical: "middle",
};

ws.getRow(1).height = 28;

// FSTP RAJASTHAN
ws.getCell("A2").font = {
  name: "Times New Roman",
  size: 13,
  bold: true,
  color: { argb: "FF000000" },
};

ws.getCell("A2").alignment = {
  horizontal: "center",
  vertical: "middle",
};

ws.getRow(2).height = 24;

// REPORT TITLE
ws.getCell("A3").font = {
  name: "Times New Roman",
  size: 12,
  bold: true,
  color: { argb: "FF000000" },
};

ws.getCell("A3").alignment = {
  horizontal: "center",
  vertical: "middle",
};

ws.getRow(3).height = 22;

/* =========================================================
   SUMMARY ROW
========================================================= */

["A5", "C5", "E5"].forEach((cellRef) => {
  ws.getCell(cellRef).font = {
    name: "Times New Roman",
    size: 11,
    bold: true,
    color: { argb: "FF000000" },
  };

  ws.getCell(cellRef).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
});

ws.getRow(5).height = 24;

/* =========================================================
   TABLE HEADER
========================================================= */

ws.getRow(tableStartRow).eachCell({ includeEmpty: true }, (cell) => {
  cell.font = {
    name: "Times New Roman",
    size: 11,
    bold: true,
    color: { argb: "FF000000" },
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9D9D9" },
  };

  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };

  cell.border = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };
});

ws.getRow(tableStartRow).height = 28;

/* =========================================================
   TABLE BODY
========================================================= */

for (let i = tableStartRow + 1; i <= tableEndRow; i++) {
  const row = ws.getRow(i);

  row.height = 22;

  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = {
      name: "Times New Roman",
      size: 11,
      bold: false,
      color: { argb: "FF000000" },
    };

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };

    /* Status column */
    if (colNumber === 7) {
      const status = cell.value;

      if (status === "Expired") {
        cell.font = {
          name: "Times New Roman",
          size: 11,
          bold: true,
          color: { argb: "FFDC2626" },
        };
      }

      if (status === "Expiring Soon") {
        cell.font = {
          name: "Times New Roman",
          size: 11,
          bold: true,
          color: { argb: "FFB45309" },
        };
      }

      if (status === "Good") {
        cell.font = {
          name: "Times New Roman",
          size: 11,
          bold: true,
          color: { argb: "FF059669" },
        };
      }
    }
  });
}
ws.getCell("A1").font = {
  name: "Times New Roman",
  size: 18,
  bold: true,
  color: { argb: "FFFF0000" }
};
  const buffer = await wb.xlsx.writeBuffer();
 let fileName = "Vehicle_Insurance_Report.xlsx";

if (pdfFilter === "expired") {
  fileName = "Vehicle_Insurance_Expired_Report.xlsx";
}

if (pdfFilter === "soon") {
  fileName = "Vehicle_Insurance_Expiring_Soon_Report.xlsx";
}

if (pdfFilter === "both") {
  fileName = "Vehicle_Insurance_Expired_and_Expiring_Soon_Report.xlsx";
}

saveAs(new Blob([buffer]), fileName);

};
 /* ---------------- UI ---------------- */
return (
  <div className="min-h-screen p-6 bg-gradient-to-br from-[#CFE2FF] via-[#BBD8FE] to-[#013B88]">

    {/* 🔝 HEADER */}
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-blue-600 text-white">
          <Truck className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-blue-900">
            Vehicle Report
          </h2>
          <p className="text-xs tracking-widest font-bold text-slate-900">
            Vehicle Movement & Distance Coverage Monitoring
          </p>
        </div>
      </div>
    </div>


    {/* ================= KPI CARDS ================= */}
    <div className="rounded-2xl p-6 bg-white shadow-lg mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">

        {[
          {label: "Total Plants",value: totalPlants,icon: <Layers size={18} />,bg: "#eedbbf",bar: "#995c00"},
          { label: "Total Vehicles", value: totalVehicles, subValue: `Total Drivers : ${totalDrivers}`, icon: <Truck size={18} />, bg: "#DBEAFE", bar: "#2563EB" },
          { label: "Moved Vehicles", value: movedVehicles, icon: <Navigation size={18} />, bg: "#D1FAE5", bar: "#059669" },
          { label: "Own Vehicle Trips", value: totalTrips, subValue: `Sludge collected : ${totalOwnSludge.toLocaleString()} L`, icon: <Milestone size={18} />, bg: "#E0E7FF", bar: "#4F46E5" },
          { label: "Total Distance(Km)", value: Math.round(totalDistance), icon: <Activity size={18} />, bg: "#FFE4E6", bar: "#E11D48" },
          { label: "Avg Distance(Km)", value: Math.round(avgDistance), icon: <Activity size={18} />, bg: "#FEF3C7", bar: "#D97706" },
          { label: "Private Vehicle Trips", value: totalPrivateTrips, subValue: `Sludge collected : ${totalPrivateSludge.toLocaleString()} L`, icon: <Milestone size={18} />, bg: "#EDE9FE", bar: "#7C3AED" }

        ].map((card, i) => (
          <div
            key={i}
            className="group relative overflow-hidden  rounded-xl p-4 shadow-sm hover:shadow-md transition"
            style={{ backgroundColor: card.bg }}
          >
            <div
              className="absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0
                         group-hover:scale-x-100 transition-transform duration-500"
              style={{ backgroundColor: card.bar }}
            />

            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-white text-slate-700">
              {card.icon}
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">
              {card.label}
            </p>

            <p className="text-xl font-black mt-1 text-slate-900">
              {card.value}
            </p>

            {card.subValue && (
              <p className="text-xs font-semibold mt-1 text-slate-800">
                {card.subValue}
              </p>
            )}
          </div>
        ))}

      </div>
    </div>

    {/* ===================== CHART ===================== */}
    <div className="rounded-2xl p-6 bg-white shadow-lg">

      {/* 🔹 TITLE + SORT (Top Right like Attendance) */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
  <h3 className="font-bold text-blue-900 text-lg">
    Vehicle Movement
  </h3>

  <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">
    Entries: {entryCount}
  </span>
</div>

<div className="flex items-end gap-3 mb-4">
  <div className="flex flex-col">
    <label className="text-[12px] font-bold text-slate-500  mb-1">Insurance Expiry Report Type</label>
    <select
      value={pdfFilter}
      onChange={(e) => setPdfFilter(e.target.value)}
      className="border rounded-md px-2 py-1.5 text-xs font-semibold bg-white border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
    >
     <option value="all">Show All Vehicles (Complete List)</option>
  <option value="expired">Show Only Expired</option>
  <option value="soon">Show Only Expiring Soon</option>
  <option value="both">Show Both (Expired + Soon)</option>
</select>
  </div>

  <button
    onClick={downloadInsurancePdf}
    className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 text-xs font-bold rounded-md transition duration-200 shadow-sm flex items-center gap-2"
  >
    PDF
  </button>
    <button
    onClick={downloadInsuranceExcel}
    className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 text-xs font-bold rounded-md transition duration-200 shadow-sm flex items-center gap-2"
  >
    EXcel
  </button>
</div>

        <div className="flex-col justify-end">
          <span className="text-xs font-semibold text-slate-500">
            Sort by
          </span>
       <select
          value={vehicleSortMode}
          onChange={(e) => setVehicleSortMode(e.target.value)}
          className="border rounded-md px-3 py-1 text-xs font-semibold
                    bg-white border-slate-300 outline-none"
        >
          <option value="distance">Total Distance</option>
          <option value="id">Plant ID</option>
        </select>
        </div>

      </div>

      <div className={needsScroll ? "overflow-x-auto" : ""}>
        <div style={{ width: vehicleChartWidth, height: 520 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedChartData}
              margin={{ top: 50, right: 30, left: 80, bottom: 100 }}
              barCategoryGap={30}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
  dataKey="label"
  interval={0}
  height={90}
  tick={(props) => (
    <ClickableTick
      {...props}
      plantMap={plantMap}
      navigate={navigate}
      insuranceAlertMap={insuranceAlertMap}   // ⭐ add
    />
  )}
/>

              <YAxis
                label={{
                  value: "Distance Covered (Km)",
                  angle: -90,
                  position: "insideLeft",
                  offset: -20,
                  dy: 50,
                  fontWeight: "bold",
                }}
              />

              <Tooltip content={<CombinedTooltip />} />

              <Bar
                dataKey="bar1"
                fill="#6AA6FF"
                barSize={28}
                label={<TopBarLabel />}
              />

              <Bar
                dataKey="bar2"
                fill="#0047B3"
                barSize={28}
                label={<TopBarLabel />}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LEGEND */}
      <div className="flex items-center justify-center gap-6 mt-4 text-[13px] font-semibold text-[#003f8a]">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#6AA6FF] rounded-sm" />
          Vehicle 1
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#0047B3] rounded-sm" />
          Vehicle 2
        </span>
      </div>

      {/* X AXIS LABEL */}
      <p className="text-center text-lg font-bold mt-3 text-gray-700">
        Plants
      </p>

    </div>
  </div>
);
}
