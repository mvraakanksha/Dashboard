import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Filter, Factory, Download } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import companyLogo from '../../reports/company_logo.png';
import logo from '../../reports/logo.png';

/* ================= API ================= */
import { getAllPlants } from "../../../services/plantService";
import { getOperationsByDate } from "../../../services/operationService";
import { getVehiclesByPlant, getVehicleOperationsByDate } from "../../../services/vehicleService";
import { getEmployeeOperationsByDate } from "../../../services/employeeService";
import { getLabOperationsByDate } from "../../../services/operationService";

/* ================= CALCULATIONS ================= */
import {
  calcPowerMetrics
} from "../customized/reportCalculations";

/* ================= HELPERS ================= */
const todayStr = new Date().toISOString().split("T")[0];

const formatIN = (val) =>
  val != null && !isNaN(val) ? Number(val).toLocaleString("en-IN") : "";

export default function Individual() {
  const [plants, setPlants] = useState([]);
  const [zoneFilter, setZoneFilter] = useState("All");
  const [date, setDate] = useState(todayStr);
  const [selectedPlants, setSelectedPlants] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [attendanceOps, setAttendanceOps] = useState([]);
const [showZonesTable, setShowZonesTable] = useState(false);
const [zoneSummaryFilter, setZoneSummaryFilter] = useState("All");
 /* ================= RESET ================= */
  const resetPage = () => {
    setZoneFilter("All");
    setDate(todayStr);
    setSelectedPlants([]);
    setRows([]);
    setShowPreview(false);
    setAttendanceOps([]);
  };

  useEffect(() => {
    resetPage();
  }, []);




  /* ================= LOAD PLANTS ================= */
  useEffect(() => {
    getAllPlants().then(res => setPlants(Array.isArray(res) ? res : []));
  }, []);

  /* ================= RESET REPORT WHEN SELECTION CHANGES ================= */
useEffect(() => {
  setRows([]);
  setShowPreview(false);
}, [selectedPlants]);


  /* ================= ZONES ================= */
  const zones = useMemo(() => {
  return [...new Set(plants.map(p => p.zones).filter(Boolean))]
    .sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return String(a).localeCompare(String(b));
    });
}, [plants]);

/* ================= AUTO SELECT PLANTS ================= */
useEffect(() => {
  if (!plants.length) return; // 🔒 wait till plants load

  if (zoneFilter === "All") {
    setSelectedPlants(plants.map(p => p.plantID));
  } else {
    setSelectedPlants(
      plants
        .filter(p => String(p.zones) === String(zoneFilter))
        .map(p => p.plantID)
    );
  }
}, [plants, zoneFilter]);

  /* ================= FILTER PLANTS ================= */
/* ================= FILTER PLANTS ================= */
const filteredPlants = useMemo(() => {
  return plants.filter(
    p => zoneFilter === "All" || String(p.zones) === String(zoneFilter)
  );
}, [plants, zoneFilter]);

/* ================= AUTO SELECT PLANTS BY ZONE ================= */

/* ================= SELECT ALL CHECK ================= */
const allSelected =
  filteredPlants.length > 0 &&
  selectedPlants.length === filteredPlants.length;


  /* ================= SELECT PLANT ================= */
  const togglePlant = (id) => {
    setSelectedPlants(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  /* ================= HELPERS ================= */
const solarExport = (am, pm) => {
  if (am == null || pm == null) return "-";
  return Math.max(pm - am, 0);
};

const formatNumber = (v) => {
  if (v == null || v === "-") return "-";

  const num = Number(v);
  if (Number.isInteger(num)) return num;

  return Math.round(num * 100) / 100;
};

/* ================= ATTENDANCE CALC ================= */

const calculateAttendanceSummary = (
  selectedPlantIds,
  attendanceOps,
  plants
) => {
  let presentUnits = 0;
  let totalEmployees = 0;

  selectedPlantIds.forEach(plantId => {
    const plant = plants.find(p => p.plantID === plantId);
    const plantAttendance = attendanceOps.filter(
      o => String(o.plantId) === String(plantId)
    );

    const employeeCount =
      plant?.noOfEmployees ??
      new Set(plantAttendance.map(o => o.employeeId)).size;

    totalEmployees += employeeCount;

    const empMap = {};

    plantAttendance.forEach(op => {
      if (!empMap[op.employeeId]) empMap[op.employeeId] = [];
      empMap[op.employeeId].push(op.plantOp);
    });

    Object.values(empMap).forEach(records => {
      const am = records.some(r => r.attendanceAm === true);
      const pm = records.some(r => r.attendancePm === true);

      if (am && pm) presentUnits += 1;
      else if (am || pm) presentUnits += 0.5;
    });
  });

  return {
    present: presentUnits,
    absent: Math.max(totalEmployees - presentUnits, 0)
  };
};

 /* ================= PREVIEW ATTENDANCE (STEP-3 FIX) ================= */
  const { present, absent } = calculateAttendanceSummary(
    selectedPlants,
    attendanceOps,
    plants
  );



  /* ================= GENERATE REPORT ================= */
const generateReport = async () => {
  if (!date || !selectedPlants.length) return;

  setLoading(true);
  setShowPreview(false);

  const vehicleAll = await getVehicleOperationsByDate(date);
  const opsAll = await getOperationsByDate(date); // ✅ fetch once
  const labOpsAll = await getLabOperationsByDate(date);


const attendanceAll = await getEmployeeOperationsByDate(date);
setAttendanceOps(attendanceAll);

// 👇 fetch vehicle masters only for today
const todayVehicleMap = {};

if (date === todayStr) {
  for (const plantId of selectedPlants) {
    const list = await getVehiclesByPlant(plantId);
    todayVehicleMap[plantId] = Array.isArray(list) ? list : [];
  }
}


  const data = selectedPlants.map((plantId) => {
    const plant = plants.find(p => p.plantID === plantId);

    // ✅ pick THIS plant’s operation
    const op =
      opsAll.find(o => o.plantId === plantId)?.operation || {};

    let plantVehicles = [];

if (date === todayStr) {
  // ✅ today → use vehicle master data
  plantVehicles = todayVehicleMap[plantId] || [];
} else {
  // ✅ past dates → use vehicle operation API
  plantVehicles =
    vehicleAll?.filter(v => v.plantId === plantId) || [];
}

    
    const labOp = labOpsAll.find(l => String(l.plantId) === String(plantId))
    ?.labOperation || {};


  const powerMetrics = calcPowerMetrics(op) || {};

return {
  plant: {
    ...plant,
    // ✅ TODAY & PAST → ALWAYS from getAllPlants
  sanctionLoad:
    date === todayStr
      ? plant.sanctionLoad ?? "-"
      : plant.sanctionLoad ?? "-",

  multiplicationFactor: plant.multiplicationFactor ?? 1
  },

  operation: {
    tankLevel:
      op.sludgeTankLevelPm ??
      op.sludgeTankLevelAm ??
      "-",

    received: op.sludgeReceived ?? 0,
    processed: op.sludgeProcessed ?? 0,

    polymer: op.polymerUsage ?? 0,
    pellets: op.pillets ?? 0,
    filterfeedTreatedWater: labOp.cumulativeFlow ?? "-",

    biochar: op.biocharProduced ?? 0,
    runningHours: op.plantRunningHrs ?? 0,

    // ✅ CONSUMPTION FROM API
    powerConsumed: op.powerConsumed ?? null,

    dgReadingAm: op.dgReadingAm ?? null,
    dgReadingPm: op.dgReadingPm ?? null,
    dgDiesalPercentageAm: op.dgDiesalPercentageAm ?? null,
    dgDiesalPercentagePm: op.dgDiesalPercentagePm ?? null,

    powerReadingAmExport: op.powerReadingAmExport ?? null,
    powerReadingPmExport: op.powerReadingPmExport ?? null,
    remarks: "-"
  },

  // ✅ KEEP POWER OBJECT (YOU REMOVED THIS BEFORE)
  power: {
    mfConsumption: powerMetrics.mfConsumption ?? "-",
    mfExport: powerMetrics.mfExport ?? "-"
  },

  vehicle: {
       vehicles: (() => {

          // ===== TODAY =====
          if (date === todayStr) {
            const masterVehicles =
              todayVehicleMap[plantId] || [];

            const opVehicles =
              vehicleAll?.filter(v => v.plantId === plantId) || [];

            return masterVehicles.map((mv, index) => {
              const ov = opVehicles[index] || {};

              return {
                // ✅ Vehicle number → master API
                vehicleNumber: mv.vehicleNumber ?? "-",

                // ✅ Readings → operation API
                vehicleReadingAm:
                  ov.vehicleOp?.vehicleReadingAm ?? null,

                vehicleReadingPm:
                  ov.vehicleOp?.vehicleReadingPm ?? null,

                vehicleFuelLevel:
                  ov.vehicleOp?.vehicleFuelLevel ?? null,

                noOfTrips:
                  ov.vehicleOp?.noOfTrips ?? 0,

                remarks: ov.vehicleOp?.vehicleRemark ?? "-"

              };
            });
          }

          // ===== PAST DATE =====
          return (
            vehicleAll?.filter(v => v.plantId === plantId) || []
          ).map(v => ({
            vehicleNumber:
              v.vehicle?.vehicleNumber ??
              v.vehicleNumber ??
              "-",

            vehicleReadingAm:
              v.vehicleOp?.vehicleReadingAm ?? null,

            vehicleReadingPm:
              v.vehicleOp?.vehicleReadingPm ?? null,

            vehicleFuelLevel:
              v.vehicleOp?.vehicleFuelLevel ?? null,

            noOfTrips:
              v.vehicleOp?.noOfTrips ?? 0,

             remarks: v.vehicleOp?.vehicleRemark ?? "-"
          }));
        })()
      }
    };
  });

  setRows(data);
  setShowPreview(true);
  setLoading(false);
};

const formatDateDDMMYYYY = (dateStr) => {
  if (!dateStr) return "-";
  const [yyyy, mm, dd] = dateStr.split("-");
  return `${dd}-${mm}-${yyyy}`;
};



  /* ================= EXCEL DOWNLOAD ================= */
const downloadExcel = async () => {

  // ✅ Ask only when Excel is clicked
  const inchargeName = prompt("Enter Incharge Name:");
  if (inchargeName === null) return;

  const mobileNumber = prompt("Enter Mobile Number:");
  if (mobileNumber === null) return;

  const attendanceAll = attendanceOps.length
    ? attendanceOps
    : await getEmployeeOperationsByDate(date);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Individual Report");


  const totalVehicles = rows.reduce(
  (sum, r) => sum + (r.vehicle?.vehicles?.length || 0),
  0
);

  
   /* ================= HEADER LOGOS ================= */
  const companyLogoBase64 = await imageToBase64(companyLogo);
  const logoBase64 = await imageToBase64(logo);

  const companyLogoId = wb.addImage({
  base64: companyLogoBase64,
  extension: "png",
});

const logoId = wb.addImage({
  base64: logoBase64,
  extension: "png",
});

// LEFT LOGO
// calculate exact height of row1 + row2
const headerHeight = ws.getRow(1).height + ws.getRow(2).height;

ws.addImage(companyLogoId, {
  tl: { col: 0, row: 0 },
  ext: { width: 80, height: headerHeight }
});

/* ================= HEADER TEXT BESIDE LOGO ================= */
ws.getRow(1).height = 32;
ws.getRow(2).height = 26;

// MAIN TITLE
ws.getCell("B1").value = "MVR TECHNOLOGY";
ws.getCell("B1").font = {
  name: "Times New Roman",
  bold: true,
  size: 26,
  color: { argb: "FFB31818" }
};
ws.getCell("B1").alignment = {
  vertical: "middle",
  horizontal: "left"
};

// SUB TITLE
/* ================= SUB TITLE (RICH TEXT) ================= */

ws.getCell("B2").value = {
  richText: [
    {
      text: "FSTP ",
      font: {
        name: "Times New Roman",
        bold: true,
        size: 18,
        color: { argb: "FF00B0F0" } // sky blue
      }
    },
    {
      text:
        `RAJASTHAN - Plant Operation Report        |       ` +
        `Zone : ${zoneFilter}           |              ` +
        `Total Plants : ${selectedPlants.length}        |        ` + 
        `Date : ${formatDateDDMMYYYY(date)}
`,
      font: {
        name: "Times New Roman",
        bold: true,
        size: 18,
        color: { argb: "FFB31818" } // red
      }
    }
  ]
};


ws.getCell("B2").alignment = {
  horizontal: "left",
  vertical: "top",
  wrapText: false
};

// ✅ MERGE TILL BIOCHAR COLUMN
ws.mergeCells("B2:J2");
 ws.addRow([]);
// merge across for long text


  const border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };

const styleRow = (row, bold = false) => {
  row.eachCell(cell => {
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };

    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true
    };

    cell.font = {
      name: "Times New Roman",
      bold: bold,        // ✅ ONLY headers & titles bold
      size: 12
    };
  });
};

const centerTitle = (ws, title, colCount) => {
  const row = ws.addRow([title]);

  row.isHeader = true;
  row.isTitle = true;   // 🔥 NEW FLAG

  const endCol = String.fromCharCode(64 + colCount);
  ws.mergeCells(`A${row.number}:${endCol}${row.number}`);

  const cell = row.getCell(1);

  cell.alignment = {
    horizontal: "center",
    vertical: "middle"
  };

  cell.font = {
    name: "Times New Roman",
    bold: true,
    size: 14,
    color: { argb: "FFB31818" } // 🔴 RED
  };

  row.height = 24;
};

  

const {
  present: excelPresent,
  absent: excelAbsent
} = calculateAttendanceSummary(
  selectedPlants,
  attendanceAll,
  plants
);



  /* ================= HEADER INFO ================= */


  /* =====================================================
     1️⃣ PLANT OPERATION REPORT
  ===================================================== */
  // 🔹 INCHARGE / MOBILE / STAFF INFO (IN PLACE OF PLANT OPERATION TITLE)
const porInfoRow = ws.addRow([
  `Incharge Name : ${inchargeName}`,
  "",
  `Mobile Number : ${mobileNumber}`,
  "",
  `Staff Present : ${formatNumber(present)}`,
  "",
  `Staff Absent : ${formatNumber(absent)}`
]);

// ✅ Merge columns
ws.mergeCells(`A${porInfoRow.number}:B${porInfoRow.number}`);
ws.mergeCells(`C${porInfoRow.number}:D${porInfoRow.number}`);
ws.mergeCells(`E${porInfoRow.number}:F${porInfoRow.number}`);
ws.mergeCells(`G${porInfoRow.number}:H${porInfoRow.number}`);

// ✅ Style each cell
porInfoRow.eachCell(cell => {
  cell.font = {
    name: "Times New Roman",
    bold: true,
    size: 14,
    color: { argb: "FFB31818" } // 🔴 RED
  };

  cell.alignment = {
    horizontal: "left",
    vertical: "middle"
  };

  cell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };
});

// Optional: row height for better look
ws.getRow(porInfoRow.number).height = 22;


  let porHeader = ws.addRow([
    "Plant ID / KLD",
    "Plant Name",
    "Tank Level",
    "Received",
    "Processed",
    "Polymer (g)",
    "Pellets (Kg)",
     "Filterfeed Treated water(L)",
    "Running Hours",
    "Biochar (Kg)"
    
  ]);
  styleRow(porHeader, true);
porHeader.isHeader = true;  

  rows.forEach(r => {
    let row1 = ws.addRow([
      `${r.plant.plantID} / ${r.plant.kld}`,
      r.plant.plantName,
      formatIN(r.operation.tankLevel),
      formatIN(r.operation.received),
      formatIN(r.operation.processed),
      formatIN(r.operation.polymer),
      formatIN(r.operation.pellets),
      formatIN(r.operation.filterfeedTreatedWater),
      formatIN(r.operation.runningHours),
      formatIN(r.operation.biochar)
        
    ]);
    styleRow(row1);
  });

  ws.addRow([]);

  /* =====================================================
     2️⃣ POWER & SOLAR REPORT
  ===================================================== */
  centerTitle(ws, "POWER & SOLAR REPORT", 7);


let psHeader = ws.addRow([
  "Plant ID / KLD",
  "Plant Name",
  "Load (Kw)",
  "Consumption (Kwh)",
  "MF * Kwh Units",
  "Export Power (Kwh)",
  "MF * Kwh Units"
]);
psHeader.isHeader = true;
styleRow(psHeader, true);


rows.forEach(r => {
  const mf = r.plant.multiplicationFactor || 1;

  const mfConsumption = formatNumber(r.operation.powerConsumed);
  const mfExport = formatNumber(
    solarExport(
      r.operation.powerReadingAmExport,
      r.operation.powerReadingPmExport
    )
  );

  const consumptionKwh =
    mfConsumption !== "-" ? formatNumber(mfConsumption / mf) : "-";

  const exportKwh =
    mfExport !== "-" ? formatNumber(mfExport / mf) : "-";

  let row1 = ws.addRow([
    `${r.plant.plantID} / ${r.plant.kld}`,
    r.plant.plantName,

    r.plant.sanctionLoad ?? "-",   // ✅ Load (kW)

    consumptionKwh,                // ✅ Consumption (kWh)
    mfConsumption,                 // MF * kWh Units

    exportKwh,                     // ✅ Export Power (kWh)
    mfExport                       // MF * kWh Units
  ]);

  styleRow(row1);
});



  ws.addRow([]);

  /* =====================================================
     3️⃣ VEHICLE & DG REPORT (MATCHES PREVIEW)
  ===================================================== */
 centerTitle(
  ws,
  `VEHICLE & DG REPORT   (Total Vehicles : ${totalVehicles})`,
  12
);



  const h1 = ws.addRow([
    "Plant ID / KLD",
    "Plant Name",
    "DG READINGS",
    "Mrng (A)",
    "Evng (B)",
    "Day Running",
    "Vehicle Running Kms",
    "",
    formatDateDDMMYYYY(date),
    "",
    "",
    "Remarks"
  ]);

  const h2 = ws.addRow([
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "Mrng (A) Kms",
    "Evng (B) Kms",
    "Day Running Kms / Trips",
    ""
  ]);

  ws.mergeCells(`A${h1.number}:A${h2.number}`);
  ws.mergeCells(`B${h1.number}:B${h2.number}`);
  ws.mergeCells(`C${h1.number}:C${h2.number}`);
  ws.mergeCells(`D${h1.number}:D${h2.number}`);
  ws.mergeCells(`E${h1.number}:E${h2.number}`);
  ws.mergeCells(`F${h1.number}:F${h2.number}`);
  ws.mergeCells(`G${h1.number}:H${h1.number}`);
  ws.mergeCells(`I${h1.number}:K${h1.number}`);
  ws.mergeCells(`L${h1.number}:L${h2.number}`);

  
h1.isHeader = true;   // ✅ ADD
h2.isHeader = true;   // ✅ ADD

styleRow(h1, true);
styleRow(h2, true);


  rows.forEach(r => {
  const op = r.operation || {};
  const vehicles = r.vehicle?.vehicles || [];
  const v1 = vehicles[0] || {};
  const v2 = vehicles[1] || {};

  const startRow = ws.rowCount + 1;

  /* ================= ROW 1 ================= */
 ws.addRow([
  `${r.plant.plantID}/${r.plant.kld}`, // A
  r.plant.plantName,                   // B
  "Reading",                           // C
  show(op.dgReadingAm),                // D
  show(op.dgReadingPm),                // E
  kmDiff(op.dgReadingAm, op.dgReadingPm), // F
  v1.vehicleNumber || "-",             // G
  "Reading",                           // H
  show(v1.vehicleReadingAm),           // I
  show(v1.vehicleReadingPm),           // J
  dayRunningDisplay(
    v1.vehicleReadingAm,
    v1.vehicleReadingPm,
    v1.noOfTrips
  ),                                   // K
v1.remarks || "-"
                             // ✅ L (ONLY HERE)
]);


  /* ================= ROW 2 ================= */
  ws.addRow([
    "", "", "", "", "", "",
    "", "Fuel Level (0–6)",
    show(v1.vehicleFuelLevel),
    show(v1.vehicleFuelLevel),
    "",
    ""
  ]);

  /* ================= ROW 3 ================= */
  ws.addRow([
    "", "",
    "Fuel %",
    show(op.dgDiesalPercentageAm),
    show(op.dgDiesalPercentagePm),
    diffReverse(
      op.dgDiesalPercentageAm,
      op.dgDiesalPercentagePm
    ),
    v2.vehicleNumber || "-",
    "Reading",
    show(v2.vehicleReadingAm),
    show(v2.vehicleReadingPm),
    dayRunningDisplay(
      v2.vehicleReadingAm,
      v2.vehicleReadingPm,
      v2.noOfTrips
    ),
   v2.remarks || "-"

  ]);

  /* ================= ROW 4 ================= */
  ws.addRow([
    "", "", "", "", "", "",
    "", "Fuel Level (0–6)",
    show(v2.vehicleFuelLevel),
    show(v2.vehicleFuelLevel),
    "",
    ""
  ]);

  /* ================= MERGES (MATCH UI) ================= */

  ws.mergeCells(`A${startRow}:A${startRow + 3}`);
  ws.mergeCells(`B${startRow}:B${startRow + 3}`);

  // DG Readings block
  ws.mergeCells(`C${startRow}:C${startRow + 1}`);
  ws.mergeCells(`D${startRow}:D${startRow + 1}`);
  ws.mergeCells(`E${startRow}:E${startRow + 1}`);
  ws.mergeCells(`F${startRow}:F${startRow + 1}`);

  ws.mergeCells(`C${startRow + 2}:C${startRow + 3}`);
  ws.mergeCells(`D${startRow + 2}:D${startRow + 3}`);
  ws.mergeCells(`E${startRow + 2}:E${startRow + 3}`);
  ws.mergeCells(`F${startRow + 2}:F${startRow + 3}`);

  // Vehicle numbers
  ws.mergeCells(`G${startRow}:G${startRow + 1}`);
  ws.mergeCells(`G${startRow + 2}:G${startRow + 3}`);

  // Day Running / Trips
  ws.mergeCells(`K${startRow}:K${startRow + 1}`);
  ws.mergeCells(`K${startRow + 2}:K${startRow + 3}`);
  
// ✅ Vehicle 1 remark merge (row1 + row2)
ws.mergeCells(`L${startRow}:L${startRow + 1}`);

// ✅ Vehicle 2 remark merge (row3 + row4)
ws.mergeCells(`L${startRow + 2}:L${startRow + 3}`);

  // Remarks
 // ✅ Remarks merged across all 4 rows
// ws.mergeCells(`L${startRow}:L${startRow + 3}`);

});

  /* =====================================================
     STYLING & DOWNLOAD
  ===================================================== */
  ws.columns.forEach(col => (col.width = 22));

  const LOGO_END_ROW = 4;

ws.eachRow((row, rowNumber) => {
  if (rowNumber <= LOGO_END_ROW) return;

  // 🔴 TITLES → already styled, DO NOTHING
  if (row.isTitle) return;

  // 🟦 HEADERS → bold
  if (row.isHeader) {
    styleRow(row, true);
  } 
  // ⚪ DATA ROWS → normal
  else {
    styleRow(row, false);
  }
});



  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer]),
    `Zone-${zoneFilter}_${inchargeName}_${formatDateDDMMYYYY(date)}_Report.xlsx`
  );
};




const show = (v) => (v ?? "-");

const diff = (a, b) =>
  a != null && b != null ? Math.max(b - a, 0) : "-";

const diffReverse = (a, b) =>
  a != null && b != null ? Math.max(a - b, 0) : "-";

// const show = (v) => (v ?? "-");

const kmDiff = (am, pm) =>
  am != null && pm != null ? Math.max(pm - am, 0) : "-";

const kmPerTrip = (am, pm, trips) => {
  if (am == null || pm == null || !trips) return 0;
  return ((pm - am) / trips).toFixed(1);
};

const dayRunningPerTrip = (am, pm, trips) => {
  if (am == null || pm == null || !trips || trips <= 0) return "-";
  return ((pm - am) / trips).toFixed(2);
};

const dayRunningDisplay = (am, pm, trips) => {
  if (am == null || pm == null || trips == null) return "-";
  return `${(pm - am).toFixed(2)}/${trips}`;
};


const matchingCount = filteredPlants.length;   // based on zone
const selectedCount = selectedPlants.length;   // based on selection
const sortedZonePlants = useMemo(() => {
  if (!plants.length) return [];

  let filtered =
    zoneSummaryFilter === "All"
      ? plants
      : plants.filter(p => String(p.zones) === String(zoneSummaryFilter));

  return [...filtered].sort((a, b) => {
    const za = Number(a.zones);
    const zb = Number(b.zones);

    if (za === 1 && zb !== 1) return -1;
    if (zb === 1 && za !== 1) return 1;

    return za - zb;
  });
}, [plants, zoneSummaryFilter]);

const downloadZoneSummaryExcel = async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Zone Summary");

  // HEADER
  const header = ws.addRow([
    "S.No",
    "Zone",
    "Plant ID",
    "Plant KLD",
    "Plant Name",
    
  ]);

  header.eachCell(cell => {
    cell.font = { bold: true };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };
  });

  let serial = 1;
  let currentRowNumber = 2; // because header is row 1

  const zoneGroups = {};

  sortedZonePlants.forEach(p => {
    const zone = p.zones || "Unknown";
    if (!zoneGroups[zone]) zoneGroups[zone] = [];
    zoneGroups[zone].push(p);
  });

  Object.keys(zoneGroups)
    .sort((a, b) => Number(a) - Number(b))
    .forEach(zone => {

      const plantsInZone = zoneGroups[zone];
      const startRow = currentRowNumber;

      plantsInZone.forEach(p => {
        const row = ws.addRow([
  serial++,
  `Zone-${zone}`,
  p.plantID,
  p.kld,
  p.plantName
]);

        row.eachCell(cell => {
          cell.alignment = {
            vertical: "middle",
            horizontal: "center"
          };
          cell.border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" }
          };
        });

        currentRowNumber++;
      });

      const endRow = currentRowNumber - 1;

      // ✅ Merge Zone column (Column 5 = E)
      if (plantsInZone.length > 1) {
        ws.mergeCells(`B${startRow}:B${endRow}`);
      }
    });

  // Column width
  ws.columns.forEach(col => (col.width = 20));

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer]),
    `Zone_Summary_${zoneSummaryFilter}.xlsx`
  );
};
  /* ================= UI ================= */
  return (
   <div className="max-w-7xl mx-auto p-6 space-y-6 bg-slate-50 min-h-screen overflow-x-hidden">

      {/* FILTER BAR */}
      {/* FILTER BAR */}
<div className="
  bg-white rounded-xl border p-4
  flex flex-col gap-4
  lg:flex-row lg:flex-nowrap lg:items-end
">

  {/* DATE */}
  <div className="w-full lg:w-auto">
    <label className="text-xs font-bold">DATE</label>
    <div className="flex items-center gap-2 mt-1">
      <Calendar size={16} className="shrink-0" />
      <input
        type="date"
        value={date}
        max={todayStr}
        onChange={(e) => setDate(e.target.value)}
        className="border p-2 rounded text-xs w-full lg:w-auto"
      />
    </div>
  </div>

  {/* ZONE */}
  <div className="w-full lg:w-auto">
    <label className="text-xs font-bold">ZONE</label>
    <div className="flex items-center gap-2 mt-1">
      <Filter size={16} className="shrink-0" />
      <select
        value={zoneFilter}
        onChange={(e) => setZoneFilter(e.target.value)}
        className="border p-2 rounded text-xs w-full lg:w-[160px]"
      >
        <option value="All">All Zones</option>
        {zones.map(z => (
          <option key={z} value={z}>Zone {z}</option>
        ))}
      </select>
    </div>
  </div>

  {/* GENERATE */}
  <button
    onClick={generateReport}
    className="
      px-6 py-2 bg-emerald-600 text-white rounded
      w-full lg:w-auto text-sm font-semibold
      lg:mt-[18px]
    "
  >
    {loading ? "Generating..." : "Generate"}
  </button>
<button
  onClick={() => setShowZonesTable(prev => !prev)}
  className="px-6 py-2 bg-blue-600 text-white rounded
             w-full lg:w-auto text-sm font-semibold"
>
  {showZonesTable ? "Hide Zones" : "View Zones"}
</button>
  {/* EXCEL + RESET */}
  {showPreview && (
    <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto lg:mt-[18px]">

      <button
        onClick={downloadExcel}
        className="px-6 py-2 bg-emerald-600 text-white rounded flex gap-2
                   w-full lg:w-auto"
      >
        <Download size={16} /> Excel
      </button>

      <button
        onClick={resetPage}
        className="px-6 py-2 bg-slate-400 text-white rounded
                   w-full lg:w-auto"
      >
        Reset
      </button>

    </div>
  )}

</div>
{showZonesTable && (
  <div className="bg-white rounded-xl border overflow-hidden mt-6">

    {/* HEADER */}
    <div className="px-5 py-3 border-b font-bold flex justify-between items-center">

      <div className="flex items-center gap-4">

        <span>Zones Summary</span>

        {/* ZONE FILTER */}
        <select
          value={zoneSummaryFilter}
          onChange={(e) => setZoneSummaryFilter(e.target.value)}
          className="border p-1 rounded text-xs"
        >
          <option value="All">All Zones</option>
          {zones.map(z => (
            <option key={z} value={z}>
              Zone {z}
            </option>
          ))}
        </select>

      </div>

      {/* DOWNLOAD BUTTON */}
      <button
        onClick={downloadZoneSummaryExcel}
        className="px-4 py-1 bg-emerald-600 text-white rounded text-xs flex items-center gap-1"
      >
        <Download size={14} /> Excel
      </button>

    </div>

    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm bg-white">
        <thead className="bg-slate-100">
          <tr>
            <th className="border p-2 text-center">S.No</th>
            <th className="border p-2 text-center">Zone</th>
            <th className="border p-2 text-center">Plant ID</th>
            <th className="border p-2 text-center">Plant KLD</th>
            <th className="border p-2 text-center">Plant Name</th>
          </tr>
        </thead>

        <tbody>
          {(() => {
            let serial = 1;
            const zoneGroups = {};

            sortedZonePlants.forEach(p => {
              const zone = p.zones || "Unknown";
              if (!zoneGroups[zone]) zoneGroups[zone] = [];
              zoneGroups[zone].push(p);
            });

            return Object.keys(zoneGroups)
              .sort((a, b) => Number(a) - Number(b))
              .map(zone =>
                zoneGroups[zone].map((plant, index) => (
                  <tr key={plant.plantID}>
  <td className="border text-center">
    {serial++}
  </td>

  {index === 0 && (
    <td
      rowSpan={zoneGroups[zone].length}
      className="border text-center font-semibold"
    >
      Zone-{zone}
    </td>
  )}

  <td className="border text-center">
    {plant.plantID}
  </td>

  <td className="border text-center">
    {plant.kld}
  </td>

  <td className="border text-center">
    {plant.plantName}
  </td>
</tr>
                ))
              );
          })()}
        </tbody>
      </table>
    </div>
  </div>
)}


      {/* PLANT SELECTION */}
{/* PLANT SELECTION (ONLY BEFORE GENERATE) */}
{!showPreview && (
  <div className="bg-white rounded-xl border overflow-hidden mt-6">

    {/* ===== HEADER ===== */}
    <div className="px-5 py-3 border-b font-bold flex justify-between items-center">
      <span>
        Plants ({matchingCount})
      </span>

      <span className="text-sm text-slate-800">
        Selected: {selectedCount}
      </span>
    </div>

    {/* ===== TABLE ===== */}
    <div className="overflow-x-auto">
      <table className="min-w-[1200px] w-full border-collapse text-sm bg-white">

        <thead className="bg-slate-100">
          <tr>
            <th className="border p-2 text-center w-[60px]">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => {
                  if (allSelected) {
                    setSelectedPlants([]);
                  } else {
                    setSelectedPlants(filteredPlants.map(p => p.plantID));
                  }
                }}
              />
            </th>
            <th className="border p-2 text-center">
              Plant ID / KLD
            </th>
            <th className="border p-2 text-center">
              Plant Name
            </th>
          </tr>
        </thead>

        <tbody>
          {filteredPlants.map(p => (
            <tr key={p.plantID}>
              <td className="border text-center h-9">
                <input
                  type="checkbox"
                  checked={selectedPlants.includes(p.plantID)}
                  onChange={() => togglePlant(p.plantID)}
                />
              </td>
              <td className="border text-center font-semibold">
                {p.plantID} / {p.kld}
              </td>
              <td className="border text-center">
                {p.plantName}
              </td>
            </tr>
          ))}
        </tbody>

      </table>
    </div>
  </div>
)}



     {/* ======= ATTENDANCE PREVIEW (MATCHES EXCEL) ======= */}
      {showPreview && (
       <div className="bg-white border rounded p-3
                flex flex-col sm:flex-row gap-3 sm:gap-6
                font-semibold text-sm sm:text-base">

          <div>Staff Present : {present}</div>
          <div>Staff Absent : {absent}</div>
        </div>
      )}



      {/* ================= PREVIEW TABLES ================= */}
      {showPreview && (
        <>
          {/* PLANT OPERATION */}
        <h3 className="font-bold text-lg">Plant Operation Report</h3>

<div className="w-full overflow-x-auto">
  <div className="min-w-[1200px]">
    <PreviewTable
            headers={[
              "Plant ID / KLD",
              "Plant Name",
              "Tank Level",
              "Received",
              "Processed",
              "Polymer (g)",
              "Pellets (Kg)",
              "Filterfeed Treated water(L)",
              "Running Hours",
              "Biochar (Kg)"
            ]}
            rows={rows.map(r => [
              `${r.plant.plantID} / ${r.plant.kld}`,
              r.plant.plantName,
              formatIN(r.operation.tankLevel),
              formatIN(r.operation.received),
              formatIN(r.operation.processed),
              formatIN(r.operation.polymer),
              formatIN(r.operation.pellets),
              formatIN(r.operation.filterfeedTreatedWater),
              formatIN(r.operation.runningHours),
              formatIN(r.operation.biochar)
            ])}
          />
  </div>
</div>

          <h3 className="font-bold text-lg mt-6">Power and Solar Report</h3>

<div className="w-full overflow-x-auto">
  <table className="min-w-[1200px] border-collapse text-sm bg-white">

  <thead className="bg-slate-100">
    <tr>
      <th className="border">Plant ID / KLD</th>
      <th className="border">Town</th>
      <th className="border">Load (Kw)</th>
      <th className="border">Consumption (Kwh)</th>
      <th className="border">M F * Kwh Units</th>
      <th className="border">Export Power (Kwh)</th>
      <th className="border">M F * Kwh Units</th>
    </tr>
  </thead>
  <tbody>
    {rows.map(r => (
      <tr key={r.plant.plantID}>
  <td className="border text-center">
    {r.plant.plantID} / {r.plant.kld}
  </td>

  <td className="border text-center">{r.plant.plantName}</td>

  {/* Load (Kw) */}
  <td className="border text-center">
    {r.plant.sanctionLoad ?? "-"}
  </td>

  {/* Consumption (Kwh) */}
  <td className="border text-center">
    {r.operation.powerConsumed != null
      ? formatNumber(
          r.operation.powerConsumed /
            (r.plant.multiplicationFactor || 1)
        )
      : "-"}
  </td>

  {/* MF * Kwh Units */}
  <td className="border text-center">
    {formatNumber(r.operation.powerConsumed)}
  </td>

  {/* Export Power (Kwh) */}
  <td className="border text-center">
    {r.operation.powerReadingAmExport != null &&
    r.operation.powerReadingPmExport != null
      ? formatNumber(
          solarExport(
            r.operation.powerReadingAmExport,
            r.operation.powerReadingPmExport
          ) /
            (r.plant.multiplicationFactor || 1)
        )
      : "-"}
  </td>

  {/* MF * Kwh Units */}
  <td className="border text-center">
    {formatNumber(
      solarExport(
        r.operation.powerReadingAmExport,
        r.operation.powerReadingPmExport
      )
    )}
  </td>
</tr>

    ))}
  </tbody>
</table>
</div>
<h3 className="font-bold text-base sm:text-lg mt-6">

  Vehicles and DG Report
</h3>

<div className="w-full overflow-x-auto">
  <table className="min-w-[1200px] border-collapse text-sm bg-white">

 <thead className="bg-slate-100">
  {/* HEADER ROW 1 */}
  <tr>
    <th rowSpan={2} className="border">Plant ID / KLD</th>
    <th rowSpan={2} className="border">Plant Name</th>
    <th rowSpan={2} className="border">DG READINGS</th>
    <th rowSpan={2} className="border">Mrng (A)</th>
    <th rowSpan={2} className="border">Evng (B)</th>
    <th rowSpan={2} className="border">Day Running</th>

    <th rowSpan={2} colSpan={2} className="border">VEHICLE RUNNING KMS</th>

    {/* DATE GROUP */}
    <th colSpan={3} className="border text-center">
      {date}
    </th>

    <th rowSpan={2} className="border">Remarks</th>
  </tr>

  {/* HEADER ROW 2 */}
  <tr>
    <th className="border">Mrng (A) Kms</th>
    <th className="border">Evng (B) Kms</th>
    {/* ✅ ROWSPAN = 2 */}
    <th rowSpan={2} className="border">
      Day Running Kms / No of Trips
    </th>
  </tr>
</thead>



<tbody>
  {rows.map((row) => {
    const op = row.operation || {};
    const vehicles = row.vehicle?.vehicles || [];

    const v1 = vehicles[0] || {};
    const v2 = vehicles[1] || {};

    return (
      <React.Fragment key={row.plant.plantID}>

        {/* ================= ROW 1 : DG READING + VEHICLE 1 READING ================= */}
  <tr>
  {/* Plant ID */}
  <td rowSpan={4} className="border text-center font-semibold">
    {row.plant.plantID}/{row.plant.kld}
  </td>

  {/* Plant Name */}
  <td rowSpan={4} className="border text-center">
    {row.plant.plantName}
  </td>

  {/* DG Reading */}
  <td rowSpan={2} className="border text-center">Reading</td>
  <td rowSpan={2} className="border text-center">{show(op.dgReadingAm)}</td>
  <td rowSpan={2} className="border text-center">{show(op.dgReadingPm)}</td>
<td rowSpan={2} className="border text-center">
  {kmDiff(op.dgReadingAm, op.dgReadingPm) != null
    ? Number(kmDiff(op.dgReadingAm, op.dgReadingPm)).toFixed(1)
    : "0.0"}
</td>

  {/* Vehicle 1 */}
  <td rowSpan={2} className="border text-center">
    {v1.vehicleNumber || "-"}
  </td>

  <td className="border text-center">Reading</td>
  <td className="border text-center">{show(v1.vehicleReadingAm)}</td>
  <td className="border text-center">{show(v1.vehicleReadingPm)}</td>

  <td rowSpan={2} className="border text-center">
    {dayRunningDisplay(
      v1.vehicleReadingAm,
      v1.vehicleReadingPm,
      v1.noOfTrips
    )}
  </td>

  {/* ✅ MERGED REMARKS */}
<td rowSpan={2} className="border text-center font-medium">
  {v1.remarks || "-"}
</td>


</tr>


        {/* ================= ROW 2 : VEHICLE 1 FUEL ================= */}
        <tr>
          <td className="border text-center">Fuel level (0–6)</td>
          <td className="border text-center">{show(v1.vehicleFuelLevel)}</td>
          <td className="border text-center">{show(v1.vehicleFuelLevel)}</td>
        </tr>

        {/* ================= ROW 3 : DG FUEL + VEHICLE 2 READING ================= */}
        <tr>
          <td rowSpan={2} className="border text-center">Fuel level %</td>
          <td rowSpan={2} className="border text-center">
            {show(op.dgDiesalPercentageAm)}
          </td>
          <td rowSpan={2} className="border text-center">
            {show(op.dgDiesalPercentagePm)}
          </td>
       <td rowSpan={2} className="border text-center">
  {diffReverse(op.dgDiesalPercentageAm, op.dgDiesalPercentagePm) != null
    ? Number(diffReverse(op.dgDiesalPercentageAm, op.dgDiesalPercentagePm)).toFixed(1)
    : "0.0"}
</td>

          {/* Vehicle 2 */}
          <td rowSpan={2} className="border text-center">
            {v2.vehicleNumber || "-"}
          </td>

          <td className="border text-center">Reading</td>
          <td className="border text-center">{show(v2.vehicleReadingAm)}</td>
          <td className="border text-center">{show(v2.vehicleReadingPm)}</td>

          {/* ✅ FIXED FORMULA */}
         <td rowSpan={2} className="border text-center">
  {dayRunningDisplay(
    v2.vehicleReadingAm,
    v2.vehicleReadingPm,
    v2.noOfTrips
  )}
</td>

<td rowSpan={2} className="border text-center font-medium">
  {v2.remarks || "-"}
</td>


        </tr>

        {/* ================= ROW 4 : VEHICLE 2 FUEL ================= */}
        <tr>
          <td className="border text-center">Fuel level (0–6)</td>
          <td className="border text-center">{show(v2.vehicleFuelLevel)}</td>
          <td className="border text-center">{show(v2.vehicleFuelLevel)}</td>
        </tr>

      </React.Fragment>
    );
  })}
</tbody>





</table>

</div>
        </>
      )}
    </div>
  );
}

/* ================= REUSABLE PREVIEW TABLE ================= */
function PreviewTable({ headers, rows }) {
  return (
   <table className="min-w-full text-sm bg-white border-collapse">

      <thead className="bg-slate-100">
        <tr>
          {headers.map(h => (
            <th key={h} className="border border-slate-300 p-1 sm:p-2
           text-xs sm:text-sm"
>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className="border border-slate-300 p-2 text-center">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const imageToBase64 = async (image) => {
  const res = await fetch(image);
  const blob = await res.blob();

  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};