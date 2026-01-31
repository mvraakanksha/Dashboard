import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Filter, Factory, Download } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import companyLogo from '../reports/company_logo.png';
import logo from '../reports/logo.png';

/* ================= API ================= */
import { getAllPlants } from "../../services/plantService";
import { getOperationsByDate } from "../../services/operationService";
import { getVehiclesByPlant, getVehicleOperationsByDate } from "../../services/vehicleService";
import { getEmployeeOperationsByDate } from "../../services/employeeService";
import { getLabOperationsByDate } from "../../services/operationService";

/* ================= CALCULATIONS ================= */
import {
  calcPowerMetrics
} from "./reportCalculations";

/* ================= HELPERS ================= */
const todayStr = new Date().toISOString().split("T")[0];

export default function Individual() {
  const [plants, setPlants] = useState([]);
  const [zoneFilter, setZoneFilter] = useState("All");
  const [date, setDate] = useState(todayStr);
  const [selectedPlants, setSelectedPlants] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [attendanceOps, setAttendanceOps] = useState([]);


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


  /* ================= FILTER PLANTS ================= */
  const filteredPlants = useMemo(() => {
    return plants.filter(
      p => zoneFilter === "All" || String(p.zones) === String(zoneFilter)
    );
  }, [plants, zoneFilter]);

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
    powerReadingPmExport: op.powerReadingPmExport ?? null
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

                remarks:
                  ov.vehicleOp?.remarks ?? "-"
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

            remarks:
              v.vehicleOp?.remarks ?? "-"
          }));
        })()
      }
    };
  });

  setRows(data);
  setShowPreview(true);
  setLoading(false);
};


  /* ================= EXCEL DOWNLOAD ================= */
  const downloadExcel = async () => {
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
ws.addImage(companyLogoId, {
  tl: { col: 0, row: 0 },
  ext: { width: 90, height: 55 },
});

// CENTER LOGO
ws.addImage(logoId, {
  tl: { col: 4, row: 0 },
  ext: { width: 180, height: 60 },
});

// SPACE BELOW LOGOS
for (let i = 0; i < 5; i++) ws.addRow([]);

// 🔹 TITLE BELOW LOGO (NO BORDERS)
const titleRow = ws.addRow(["PLANT OPERATION REPORT"]);
ws.mergeCells(`A${titleRow.number}:H${titleRow.number}`);
titleRow.getCell(1).alignment = {
  horizontal: "center",
  vertical: "middle"
};
titleRow.font = { bold: true };

// 🔹 EMPTY ROW BELOW TITLE (NO BORDERS)
ws.addRow([]);



  const border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };

const styleRow = (row, bold = false) => {
    row.eachCell(cell => {
      cell.border = border;
      cell.alignment = { vertical: "middle", horizontal: "center" };
      if (bold) cell.font = { bold: true };
    });
  };



const centerTitle = (ws, title, colCount) => {
  const row = ws.addRow([title]);
  const endCol = String.fromCharCode(64 + colCount); // A=1, B=2...
  ws.mergeCells(`A${row.number}:${endCol}${row.number}`);
  row.getCell(1).alignment = {
    horizontal: "center",
    vertical: "middle"
  };
  styleRow(row, true);
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



// 🔹 ROW 1 : REPORT TITLE + ZONE + PLANTS + DATE
// const headerRow1 = ws.addRow([
//   "PLANT OPERATION REPORT",
//   "",
//   `Zone : ${zoneFilter}`,
//   "",
//   `Total Plants : ${selectedPlants.length}`,
//   "",
//   `Date : ${date}`
// ]);

// ws.mergeCells("A1:B1"); // Title
// ws.mergeCells("C1:D1"); // Zone
// ws.mergeCells("E1:F1"); // Total Plants
// ws.mergeCells("G1:H1"); // Date

// styleRow(headerRow1, true);

// // 🔹 ROW 2 : INCHARGE + MOBILE + STAFF PRESENT / ABSENT
// const headerRow2 = ws.addRow([
//   "Incharge Name : ",
//   "",
//   "Mobile Number : ",
//   "",
//   `Staff Present : ${formatNumber(present)}`,
//   "",
//   `Staff Absent : ${formatNumber(absent)}`
// ]);

// ws.mergeCells("A2:B2"); // Incharge
// ws.mergeCells("C2:D2"); // Mobile
// ws.mergeCells("E2:F2"); // Present
// ws.mergeCells("G2:H2"); // Absent

// styleRow(headerRow2, true);

// // SPACE BEFORE TABLES
// ws.addRow([]);



  /* =====================================================
     1️⃣ PLANT OPERATION REPORT
  ===================================================== */
  // 🔹 INCHARGE / MOBILE / STAFF INFO (IN PLACE OF PLANT OPERATION TITLE)
const porInfoRow = ws.addRow([
  "Incharge Name : ",
  "",
  "Mobile Number : ",
  "",
  `Staff Present : ${formatNumber(present)}`,
  "",
  `Staff Absent : ${formatNumber(absent)}`
]);

ws.mergeCells(`A${porInfoRow.number}:B${porInfoRow.number}`);
ws.mergeCells(`C${porInfoRow.number}:D${porInfoRow.number}`);
ws.mergeCells(`E${porInfoRow.number}:F${porInfoRow.number}`);
ws.mergeCells(`G${porInfoRow.number}:H${porInfoRow.number}`);

styleRow(porInfoRow, true);


  

  let porHeader = ws.addRow([
    "Plant ID / KLD",
    "Town",
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

  rows.forEach(r => {
    let row1 = ws.addRow([
      `${r.plant.plantID} / ${r.plant.kld}`,
      r.plant.plantName,
      r.operation.tankLevel,
      r.operation.received,
      r.operation.processed,
      r.operation.polymer,
      r.operation.pellets,
        formatNumber(r.operation.filterfeedTreatedWater),
       r.operation.runningHours,
      r.operation.biochar
    
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
    "Town",
    "Load (Kw)",
    "Consumption (Kwh)",
    "MF * Kwh Units",
    "Export Power (Kwh)",
    "MF * Kwh Units"
  ]);
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
    "Town",
    "DG READINGS",
    "Mrng (A)",
    "Evng (B)",
    "Day Running",
    "Vehicle Running Kms",
    "",
    date,
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
    v1.remarks || "-"                    // L
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

  // Plant ID / Town
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

  // Remarks
  ws.mergeCells(`L${startRow}:L${startRow + 1}`);
  ws.mergeCells(`L${startRow + 2}:L${startRow + 3}`);
});

  /* =====================================================
     STYLING & DOWNLOAD
  ===================================================== */
  ws.columns.forEach(col => (col.width = 22));

  const LOGO_END_ROW = 4;

ws.eachRow((row, rowNumber) => {
  // ❌ Skip borders only for logo rows
  if (rowNumber > LOGO_END_ROW) {
    styleRow(row);
  }
});


  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer]),
    `Individual_Report_${date}.xlsx`
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


      {/* PLANT SELECTION */}
{/* PLANT SELECTION (ONLY BEFORE GENERATE) */}
{!showPreview && (
  <div className="bg-white rounded-xl border">
    <div className="px-4 py-2 font-bold flex gap-2">
      <Factory size={18} /> Select Plants
    </div>

<div className="overflow-x-auto">
  <table className="min-w-[1200px] w-full border-collapse text-sm bg-white">

      <thead className="bg-slate-100">
        <tr>
          <th className="border p-1 sm:p-2 text-xs sm:text-sm text-center"
>Select</th>
          <th className="border p-1 sm:p-2 text-xs sm:text-sm text-center"
>Plant ID / KLD</th>
          <th className="border p-1 sm:p-2 text-xs sm:text-sm text-center"
>Town</th>
        </tr>
      </thead>
      <tbody>
        {filteredPlants.map(p => (
          <tr key={p.plantID}>
            <td className="border border-slate-300 text-center">
              <input
                type="checkbox"
                checked={selectedPlants.includes(p.plantID)}
                onChange={() => togglePlant(p.plantID)}
              />
            </td>
            <td className="border border-slate-300 text-center font-semibold">
              {p.plantID} / {p.kld}
            </td>
            <td className="border border-slate-300 text-center">
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
              "Town",
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
              r.operation.tankLevel,
              r.operation.received,
              r.operation.processed,
              r.operation.polymer,
              r.operation.pellets,
                formatNumber(r.operation.filterfeedTreatedWater),
              r.operation.runningHours,
              r.operation.biochar
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
    <th rowSpan={2} className="border">TOWN</th>
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
          <td rowSpan={4} className="border text-center font-semibold">
            {row.plant.plantID}/{row.plant.kld}
          </td>
          <td rowSpan={4} className="border text-center">
            {row.plant.plantName}
          </td>

          {/* DG Reading */}
          <td rowSpan={2} className="border text-center">Reading</td>
          <td rowSpan={2} className="border text-center">{show(op.dgReadingAm)}</td>
          <td rowSpan={2} className="border text-center">{show(op.dgReadingPm)}</td>
          <td rowSpan={2} className="border text-center">
            {kmDiff(op.dgReadingAm, op.dgReadingPm)}
          </td>

          {/* Vehicle 1 */}
          <td rowSpan={2} className="border text-center">
            {v1.vehicleNumber || "-"}
          </td>

          <td className="border text-center">Reading</td>
          <td className="border text-center">{show(v1.vehicleReadingAm)}</td>
          <td className="border text-center">{show(v1.vehicleReadingPm)}</td>

          {/* ✅ FIXED FORMULA */}
          <td rowSpan={2} className="border text-center">
  {dayRunningDisplay(
    v1.vehicleReadingAm,
    v1.vehicleReadingPm,
    v1.noOfTrips
  )}
</td>


          <td rowSpan={2} className="border text-center">
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
            {diffReverse(op.dgDiesalPercentageAm, op.dgDiesalPercentagePm)}
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


          <td rowSpan={2} className="border text-center">
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