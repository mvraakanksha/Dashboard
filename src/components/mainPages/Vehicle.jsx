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
  Fuel,
  Layers
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { getAllPlants } from "../../services/plantService";
import { getVehicleOperationsByDate, getVehiclesByPlant} from "../../services/vehicleService";
import { getOperationsByDate,getOperationsByDateRange} from "../../services/operationService";
import { getEmployeesByPlant } from "../../services/employeeService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import companyLogo from '../reports/company_logo1.jpg'
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
      {alert && (
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

  const distance = (am, pm) =>
    pm != null && am != null
      ? Number(Math.max(pm - am, 0).toFixed(1))
      : 0;

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
          <p>Distance: {distance(d.v1.am, d.v1.pm)} Km</p>
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
          <p>Distance: {distance(d.v2.am, d.v2.pm)} Km</p>
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

const EXPIRY_DAYS = 30;

const checkInsuranceStatus = (expiryDate, selectedDate) => {
  if (!expiryDate || !selectedDate) return null;

  const exp = new Date(expiryDate);
  const sel = new Date(selectedDate);

  // ⭐ remove time
  exp.setHours(0,0,0,0);
  sel.setHours(0,0,0,0);

  const diffDays = Math.floor((exp - sel) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "soon";
  return "valid";
};


const getInsuranceAlert = (expiryDate, selectedDate) => {
  if (!expiryDate || !selectedDate) return null;

  const exp = new Date(expiryDate);
  const sel = new Date(selectedDate);

  const diffDays = Math.ceil((exp - sel) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "red";       // expired
  if (diffDays <= 30) return "yellow";  // expiring soon

  return null;
};



/* ================================================= */
/* VEHICLE COMPONENT */
/* ================================================= */
export default function Vehicle({ date, zone })
 {
  const navigate = useNavigate();

  const [plants, setPlants] = useState([]);
  const [vehicleOps, setVehicleOps] = useState([]);
const [vehiclesMap, setVehiclesMap] = useState({});
  const [vehicleSortMode, setVehicleSortMode] = useState("distance");
const [operationsData, setOperationsData] = useState([]);
const [employeesMap, setEmployeesMap] = useState({});
const [pdfFilter, setPdfFilter] = useState("all"); // "all", "expired", "soon", "both"


  /* ---------------- FETCH PLANTS ---------------- */
useEffect(() => {
  const loadPlants = async () => {
    try {
      const data = await getAllPlants();
      setPlants(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load plants", e);
      setPlants([]);
    }
  };

  loadPlants();
}, []);

  /* ---------------- FETCH VEHICLE OPS ---------------- */
useEffect(() => {
  if (!date) return;

  const loadVehicleOps = async () => {
    try {
      const data = await getVehicleOperationsByDate(date);
      setVehicleOps(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load vehicle operations", e);
      setVehicleOps([]);
    }
  };

  loadVehicleOps();
}, [date]);


useEffect(() => {
  if (!date) return;

  const loadOperations = async () => {
    try {
      const data = await getOperationsByDate(date); // or date-range version
      setOperationsData(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load operations", e);
      setOperationsData([]);
    }
  };

  loadOperations();
}, [date]);

  /* ---------------- ZONE FILTERED DATA ---------------- */
const filteredPlants = useMemo(() => {
  return plants.filter(
    (p) => zone === "All" || String(p.zones) === String(zone)
  );
}, [plants, zone]);

useEffect(() => {
  if (!filteredPlants.length) return;

  const loadEmployees = async () => {
    const map = {};

    for (const plant of filteredPlants) {
      const list = await getEmployeesByPlant(plant.plantID);
      map[plant.plantID] = Array.isArray(list) ? list : [];
    }

    setEmployeesMap(map);
  };

  loadEmployees();
}, [filteredPlants]);

useEffect(() => {
  if (!filteredPlants.length) return;

  const loadVehicles = async () => {
    const map = {};

    for (const plant of filteredPlants) {
      try {
        const list = await getVehiclesByPlant(plant.plantID);
        map[plant.plantID] = Array.isArray(list) ? list : [];
      } catch (e) {
        map[plant.plantID] = [];
      }
    }

    setVehiclesMap(map);
  };

  loadVehicles();
}, [filteredPlants]);

const totalPlants = filteredPlants.length;

  const filteredVehicleOps = useMemo(() => {
    const plantIds = new Set(filteredPlants.map((p) => p.plantID));
    return vehicleOps.filter((v) => plantIds.has(v.plantId));
  }, [vehicleOps, filteredPlants]);

  const filteredOperationsData = useMemo(() => {
  const plantIds = new Set(filteredPlants.map((p) => p.plantID));

  return operationsData.filter((op) =>
    plantIds.has(op.plantId)
  );
}, [operationsData, filteredPlants]);

  /* ---------------- Insurance---------------- */

const expiringVehicles = useMemo(() => {
  return filteredVehicleOps
    .map(v => {
      const expiry = v.vehicle?.insuranceExpiryDate;

      const status = checkInsuranceStatus(expiry, date);

      if (status === "expired" || status === "soon") {
        return {
          vehicleNumber: v.vehicle?.vehicleNumber,
          plantId: v.plantId,
          expiry,
          status
        };
      }

      return null;
    })
    .filter(Boolean);
}, [filteredVehicleOps, date]);


const expiredCount = useMemo(
  () => expiringVehicles.filter(v => v.status === "expired").length,
  [expiringVehicles]
);

const expiringSoonCount = useMemo(
  () => expiringVehicles.filter(v => v.status === "soon").length,
  [expiringVehicles]
);

const insuranceAlertMap = useMemo(() => {
  const map = {};

  Object.entries(vehiclesMap).forEach(([plantId, vehicles]) => {
    const plant = plants.find(p => p.plantID === Number(plantId));
    if (!plant) return;

    vehicles.forEach(v => {
      const expiry = v.insuranceExpiryDate;
      const alert = getInsuranceAlert(expiry, date);

      if (!alert) return;

      if (!map[plant.plantName]) map[plant.plantName] = [];

      map[plant.plantName].push({
        type: alert,
        vehicleNumber: v.vehicleNumber,
        expiry
      });
    });
  });

  return map;
}, [vehiclesMap, plants, date]);

  /* ---------------- BUILD CHART DATA ---------------- */
  const chartData = useMemo(() => {
    return filteredPlants.map((p) => {
      const records = filteredVehicleOps.filter(
        (v) => v.plantId === p.plantID
      );

      const sorted = [...records].sort(
        (a, b) => a.vehicle.vehicleID - b.vehicle.vehicleID
      );

      const getVehicle = (v) =>
        v
          ? {
              vehicleNumber: v.vehicle?.vehicleNumber,
              am: v.vehicleOp?.vehicleReadingAm,
              pm: v.vehicleOp?.vehicleReadingPm,
              fuel: v.vehicleOp?.vehicleFuelLevel,
              trips: v.vehicleOp?.noOfTrips,          
              sludge: v.vehicleOp?.sludgeCollect,  
              remark: v.vehicleOp?.vehicleRemark,
        
            }
          : null;

      const v1 = getVehicle(sorted[0]);
      const v2 = getVehicle(sorted[1]);

      const distance = (v) =>
        v?.pm != null && v?.am != null ? Math.max(v.pm - v.am, 0) : 0;

      return {
        label: p.plantName,
        plantId: p.plantID,
        kld: p.kld,
        v1,
        v2,
        bar1: distance(v1),
        bar2: distance(v2),
      };
    });
  }, [filteredPlants, filteredVehicleOps]);

  /* ---------------- METRICS ---------------- */
  const totalDistance = chartData.reduce(
    (sum, p) => sum + p.bar1 + p.bar2,
    0
  );


  const totalVehicles = filteredPlants.reduce(
    (sum, p) => sum + (p.noOfVehicle || 0),
    0
  );

  const totalDrivers = useMemo(() => {
  let total = 0;

  Object.values(employeesMap).forEach(list => {
    list.forEach(emp => {
      if (emp.designation === "Driver") {
        total++;
      }
    });
  });

  return total;
}, [employeesMap]);
  const movedVehicles = useMemo(() => {
    const set = new Set();
    filteredVehicleOps.forEach((v) => {
      const am = v.vehicleOp?.vehicleReadingAm;
      const pm = v.vehicleOp?.vehicleReadingPm;
      if (am != null && pm != null && pm - am > 0) {
        set.add(v.vehicle?.vehicleID);
      }
    });
    return set.size;
  }, [filteredVehicleOps]);

  const totalTrips = useMemo(() => {
    return filteredVehicleOps.reduce(
      (sum, v) => sum + (v.vehicleOp?.noOfTrips || 0),
      0
    );
  }, [filteredVehicleOps]);

  const totalOwnSludge = useMemo(() => {
  return filteredVehicleOps.reduce(
    (sum, v) => sum + (v.vehicleOp?.sludgeCollect || 0),
    0
  );
}, [filteredVehicleOps]);


const totalPrivateTrips = useMemo(() => {
  return filteredOperationsData.reduce((sum, op) => {
    return sum + (op.operation?.noOfTripsPrivateVehicle || 0);
  }, 0);
}, [filteredOperationsData]);


const totalPrivateSludge = useMemo(() => {
  return filteredOperationsData.reduce((sum, op) => {
    return sum + (op.operation?.sludgeCollectPrivateVehicle || 0);
  }, 0);
}, [filteredOperationsData]);



  const avgDistance =
    movedVehicles > 0 ? (totalDistance / movedVehicles).toFixed(1) : "0.0";

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

  /* ---------------- SORTING ---------------- */
  const sortedChartData = useMemo(() => {
    const data = [...chartData];

    switch (vehicleSortMode) {
      case "v1":
        return data.sort((a, b) => b.bar1 - a.bar1);
      case "v2":
        return data.sort((a, b) => b.bar2 - a.bar2);
      case "distance":
        return data.sort(
          (a, b) => b.bar1 + b.bar2 - (a.bar1 + a.bar2)
        );
      case "id":
      default:
        return data.sort((a, b) => a.plantId - b.plantId);
    }
  }, [chartData, vehicleSortMode]);


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
  const getPlant = id =>
    plants.find(p => Number(p.plantID) === Number(id));

  /* ===== BUILD MASTER LIST ===== */
  const allVehicles = [];


let expiredCount = 0;
let soonCount = 0;
let goodCount = 0;

Object.entries(vehiclesMap).forEach(([plantId, vehicles]) => {
  vehicles.forEach(v => {
    const raw = v.insuranceExpiryDate
      ? checkInsuranceStatus(v.insuranceExpiryDate, date)
      : null;


    const status =
      !raw
        ? "-"
        : raw === "valid"
        ? "Good"
        : raw === "expired"
        ? "Expired"
        : "Expiring Soon";

    if (status === "Expired") expiredCount++;
    if (status === "Expiring Soon") soonCount++;
    if (status === "Good") goodCount++;

    allVehicles.push({
      plantId: Number(plantId),
      vehicleNumber: v.vehicleNumber,
      expiry: v.insuranceExpiryDate
        ? new Date(v.insuranceExpiryDate).toLocaleDateString("en-IN")
        : "-",
      status
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
/* ===== TOTALS ===== */

/* ===== TOTALS ===== */

const totalVehicles = allVehicles.length;

/* ===== TOTALS (ALIGNED WITH TABLE WIDTH) ===== */

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

    vehicles.forEach((v, i) => {
      body.push([
        i === 0 ? plant?.plantID ?? plantId : "",
        i === 0 ? plant?.plantName ?? "-" : "",
        i === 0 ? plant?.zones ?? "-" : "",
        v.vehicleNumber,
        v.expiry,
        v.status
      ]);
    });
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

  Object.entries(vehiclesMap).forEach(([plantId, vehicles]) => {
    vehicles.forEach(v => {
      const raw = v.insuranceExpiryDate
        ? checkInsuranceStatus(v.insuranceExpiryDate, date)
        : null;

      allVehicles.push({
        plantId: Number(plantId),
        vehicleNumber: v.vehicleNumber,
        expiry: v.insuranceExpiryDate,
        status:
          !raw
            ? "-"
            : raw === "valid"
            ? "Good"
            : raw === "expired"
            ? "Expired"
            : "Expiring Soon"
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

  const totalPlants = filteredPlants.length;
  const totalVehicles = allVehicles.length;
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

  const getPlant = id =>
    plants.find(p => Number(p.plantID) === Number(id));

  /* ===== GROUP + MERGE ===== */

  const group = {};
  list.forEach(v => {
    if (!group[v.plantId]) group[v.plantId] = [];
    group[v.plantId].push(v);
  });

  Object.entries(group).forEach(([plantId, vehicles]) => {
    const plant = getPlant(plantId);
    const startRow = ws.lastRow.number + 1;

    vehicles.forEach(v => {
      ws.addRow([
        plant?.plantID ?? plantId,
        plant?.plantName ?? "-",
        plant?.zones ?? "-",
        vehicles.length,
        v.vehicleNumber,
        v.expiry ? new Date(v.expiry).toLocaleDateString("en-IN") : "-",
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

  ws.columns.forEach(col => (col.width = 20));

  /* ===== STYLE ENTIRE SHEET ===== */

// ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
//   row.eachCell({ includeEmpty: true }, (cell) => {

//    ws.eachRow(row => {
//   row.height = 22;
// });

//     // Font - Times New Roman for all
//     cell.font = {
//       name: "Times New Roman",
//       size: 11,
//       bold: rowNumber === 1 || rowNumber === 2 || rowNumber === 5 || rowNumber === 6 // keep headers bold
//     };

//     // Alignment - Center + Middle
//     cell.alignment = {
//       horizontal: "center",
//       vertical: "middle",
//       wrapText: true
//     };

//     // Borders
//     cell.border = {
//       top: { style: "thin" },
//       left: { style: "thin" },
//       bottom: { style: "thin" },
//       right: { style: "thin" }
//     };
//   });
// });
const tableEndRow = ws.lastRow.number;

/* ===== STYLE TABLE ONLY ===== */

for (let i = tableStartRow; i <= tableEndRow; i++) {
  const row = ws.getRow(i);

  row.eachCell({ includeEmpty: true }, (cell) => {

    // Font
    cell.font = {
      name: "Times New Roman",
      size: 11,
      bold: i === tableStartRow // only table header bold
    };

    // Alignment
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    };

    // ✅ Apply borders to BOTH header + data rows
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  });

  row.height = 22;
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

{/* {expiringVehicles.length > 0 && (
  <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-300 shadow">
    <p className="font-bold text-red-700 mb-2">
      ⚠ Vehicle Insurance Alert
    </p>

    {expiringVehicles.map((v, i) => (
      <p key={i} className="text-sm text-red-800">
        {v.vehicleNumber} — expires on {v.expiry}
        {v.status === "expired" ? " (Expired)" : " (Expiring soon)"}
      </p>
    ))}
  </div>
)} */}

    {/* ================= KPI CARDS ================= */}
    <div className="rounded-2xl p-6 bg-white shadow-lg mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">

        {[
          {label: "Total Plants",value: totalPlants,icon: <Layers size={18} />,bg: "#eedbbf",bar: "#995c00"},
          { label: "Total Vehicles", value: totalVehicles, subValue: `Total Drivers : ${totalDrivers}`, icon: <Truck size={18} />, bg: "#DBEAFE", bar: "#2563EB" },
          { label: "Moved Vehicles", value: movedVehicles, icon: <Navigation size={18} />, bg: "#D1FAE5", bar: "#059669" },
          { label: "Own Vehicle Trips", value: totalTrips, subValue: `Sludge collected : ${totalOwnSludge.toLocaleString()} L`, icon: <Milestone size={18} />, bg: "#E0E7FF", bar: "#4F46E5" },
          { label: "Total Distance", value: Math.round(totalDistance), icon: <Activity size={18} />, bg: "#FFE4E6", bar: "#E11D48" },
          { label: "Avg Distance", value: Math.round(avgDistance), icon: <Activity size={18} />, bg: "#FEF3C7", bar: "#D97706" },
          { label: "Private Vehicle Trips", value: totalPrivateTrips, subValue: `Sludge collected : ${totalPrivateSludge.toLocaleString()} L`, icon: <Milestone size={18} />, bg: "#EDE9FE", bar: "#7C3AED" }

        ].map((card, i) => (
          <div
            key={i}
            className="group relative rounded-xl p-4 shadow-sm hover:shadow-md transition"
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
        <h3 className="font-bold text-blue-900 text-lg">
          Vehicle Movement
        </h3>

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
            <option value="v1">Vehicle 1 Distance</option>
            <option value="v2">Vehicle 2 Distance</option>
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
