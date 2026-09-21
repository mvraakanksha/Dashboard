import React, { useEffect, useMemo, useState } from "react";
import { Calendar } from "lucide-react";

import { getAllPlants } from "../../../services/plantService";
import {
  getEmployeesByPlant,
  getEmployeeOperationsByDateRange,
  getEmployeeOperationsByDateRangeFull,
  getDeletedEmployeesByPlantAndDate
} from "../../../services/employeeService";
import * as XLSX from "xlsx-js-style";

import ExcelJS from "exceljs";

import companyLogo from '../../reports/company_logo.png'



import { saveAs } from "file-saver";

// const formatDDMMYYYY = (dateStr) => {
//   if (!dateStr) return "";
//   const d = new Date(dateStr);
//   const dd = String(d.getDate()).padStart(2, "0");
//   const mm = String(d.getMonth() + 1).padStart(2, "0");
//   const yyyy = d.getFullYear();
//   return `${dd}/${mm}/${yyyy}`;
// };

const formatDDMMYYYY = (dateStr) => {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatMonthYear = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

const isFullMonth = (from, to) => {
  const start = new Date(from);
  const end = new Date(to);

  const firstDay =
    start.getDate() === 1;

  const lastDay =
    new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();

  return (
    firstDay &&
    end.getDate() === lastDay &&
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  );
};

const getAttendanceTitle = (from, to) => {
  if (from === to) {
    return `Daily Attendance Report ( ${formatDDMMYYYY(from)} )`;
  }

  if (isFullMonth(from, to)) {
    return `Attendance Report ( ${formatMonthYear(from)} )`;
  }

  return `Attendance Report ( ${formatDDMMYYYY(from)} to ${formatDDMMYYYY(to)} )`;
};


let cachedLeftLogo = null;
let cachedCenterLogo = null;

const imageToBase64 = async (imageUrl) => {
  const res = await fetch(imageUrl);
  const blob = await res.blob();

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};


const AttendanceReport = () => {


  const today = new Date().toISOString().split("T")[0];
  /* ================= STATE ================= */
  const [plants, setPlants] = useState([]);
  const [zoneFilter, setZoneFilter] = useState("All");
  const [phaseFilter, setPhaseFilter] = useState("All");
const [employeeMap, setEmployeeMap] = useState({});
  const [selectedPlants, setSelectedPlants] = useState([]);
const [fromDate, setFromDate] = useState(today);
const [toDate, setToDate] = useState(today);
const [dateError, setDateError] = useState("");
const [reportGenerated, setReportGenerated] = useState(false);
const [filterType, setFilterType] = useState("ALL"); 


  // attendanceMap = { plantId: { employeeId: { date: true/false }}}
  const [attendanceMap, setAttendanceMap] = useState({});

  /* ================= LOAD PLANTS ================= */
  useEffect(() => {
    getAllPlants().then(setPlants);
  }, []);

  /* ================= ZONES (from API: zones) ================= */
  const zones = useMemo(() => {
    if (!Array.isArray(plants)) return [];
    return Array.from(
      new Set(
        plants
          .map(p => p.zones)
          .filter(z => z !== null && z !== undefined)
      )
    ).sort((a, b) => Number(a) - Number(b));
  }, [plants]);

  /* =================Phases================= */

const phases = useMemo(() => {
  if (!Array.isArray(plants)) return [];

  return Array.from(
    new Set(
      plants
        .map((p) => p.plantPhase)
        .filter((p) => p !== null && p !== undefined)
    )
  ).sort((a, b) => Number(a) - Number(b));
}, [plants]);

  /* ================= FILTER PLANTS BY ZONE ================= */
const filteredPlants = useMemo(() => {
  return plants.filter((p) => {

    const zoneMatch =
      zoneFilter === "All" ||
      String(p.zones) === String(zoneFilter);

    const phaseMatch =
      phaseFilter === "All" ||
      String(p.plantPhase) === String(phaseFilter);

    return zoneMatch && phaseMatch;

  });
}, [plants, zoneFilter, phaseFilter]);

  const matchingCount = filteredPlants.length;

  /* ================= AUTO-SELECT (SELECT MODE ONLY) ================= */
useEffect(() => {
  if (!plants.length) return;

 const ids = plants
  .filter((p) => {

    const zoneMatch =
      zoneFilter === "All" ||
      String(p.zones) === String(zoneFilter);

    const phaseMatch =
      phaseFilter === "All" ||
      String(p.plantPhase) === String(phaseFilter);

    return zoneMatch && phaseMatch;

  })
  .map((p) => p.plantID);

  setSelectedPlants(ids);
}, [plants, zoneFilter, phaseFilter]);


  /* ================= PLANT SELECTION ================= */
  const togglePlant = (plantId) => {
    setSelectedPlants(prev =>
      prev.includes(plantId)
        ? prev.filter(id => id !== plantId)
        : [...prev, plantId]
    );
  };

  // select-only mode → always select all visible plants
const toggleAllPlants = () => {
  const visibleIds = filteredPlants.map(p => p.plantID);

  const allSelected =
    visibleIds.length > 0 &&
    visibleIds.every(id => selectedPlants.includes(id));

  if (allSelected) {
    // ❌ unselect all visible plants
    setSelectedPlants(prev =>
      prev.filter(id => !visibleIds.includes(id))
    );
  } else {
    // ✅ select all visible plants
    setSelectedPlants(prev =>
      Array.from(new Set([...prev, ...visibleIds]))
    );
  }
};

  const getAttendanceValue = (plantOp) => {
  const am = plantOp.attendanceAm;
  const pm = plantOp.attendancePm;

  if (am && pm) return 1;        // Full day
  if (!am && !pm) return 0;      // Absent
  return 0.5;                    // Half day
};

const getDateRange = (start, end) => {
  const dates = [];
  let current = new Date(start);

  while (current <= new Date(end)) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const dateColumns = useMemo(() => {
  if (!fromDate || !toDate) return [];
  return getDateRange(fromDate, toDate);
}, [fromDate, toDate]);


  /* ================= LOAD REPORT ================= */
const loadReport = async () => {
  if (!fromDate || !toDate || selectedPlants.length === 0) {
    alert("Select dates and at least one plant");
    return;
  }

  if (new Date(toDate) < new Date(fromDate)) {
    setDateError("To date cannot be earlier than From date");
    return;
  }

  setDateError("");

  const empMap = {};
  const attMap = {};

  /* ================= ACTIVE OPERATIONS ================= */
  const activeOperations = await getEmployeeOperationsByDateRange(
    fromDate,
    toDate
  );

  /* ================= HISTORY OPERATIONS ================= */
  const historyOperations = await getEmployeeOperationsByDateRangeFull(
    fromDate,
    toDate
  );
console.log("History Operations", historyOperations);
  for (const plantId of selectedPlants) {

    /* ================= 1. ACTIVE EMPLOYEES ================= */
    const employees = await getEmployeesByPlant(plantId);

const activeEmployees = (employees || [])
  .filter(emp => {
    // ✅ Exclude future joiners
    return emp.dateOfJoining <= toDate;
  })
  .map(emp => {
    let tag = "";

    if (
      emp.dateOfJoining >= fromDate &&
      emp.dateOfJoining <= toDate
    ) {
      tag = "NEW";
    }

    return {
      ...emp,
      tag,
      uniqueKey: `${emp.employeeId}_${emp.dateOfJoining}`
    };
  });

    /* ================= INIT ================= */
    empMap[plantId] = [...activeEmployees];
    attMap[plantId] = {};

   activeEmployees.forEach(emp => {
  attMap[plantId][emp.uniqueKey] = {}; 
});

    /* ================= ACTIVE ATTENDANCE ================= */
activeOperations
  .filter(op => op.plantId === plantId)
  .forEach(op => {
    const date = op.plantOp.operationDate;
    const value = getAttendanceValue(op.plantOp);

    // 🔥 FIX: find correct employee
  const emp = activeEmployees.find(
  e => e.employeeId === op.employeeId
);

if (!emp) return;

// ✅ Ignore if employee has exit date and op is after it
if (emp.dateOfLeaving && op.plantOp.operationDate > emp.dateOfLeaving) {
  return;
}

    if (!emp) return;

    const key = emp.uniqueKey;

    if (!attMap[plantId][key]) {
      attMap[plantId][key] = {};
    }

    attMap[plantId][key][date] = {
  value: value,
  remark: op.plantOp.attendanceRemark || null
};

  });
  

    /* ================= 2. EXIT EMPLOYEES ================= */
// 🔥 Extract employees from history operations
const exitEmpMap = {};

historyOperations
  .filter(op => op.plantId === plantId)
  .forEach(op => {
    const key = `${op.employeeId}_${op.dateOfJoining}`;

    exitEmpMap[key] = {
      employeeId: op.employeeId,
      employeeName: op.employeeName,
      designation: op.designation,
      dateOfJoining: op.dateOfJoining,
      dateOfLeaving: op.dateOfLeaving,
      tag: "EXIT",
      uniqueKey: key
    };
  });

const exitEmployees = Object.values(exitEmpMap).filter(emp => {
  if (!emp.dateOfLeaving) return true;

  // ✅ If FULL RANGE → include only if overlap exists
  return emp.dateOfLeaving >= fromDate;
});

// const exitEmployees = (deletedEmployees || [])
//   .filter(emp => {
//     const exit = emp.dateOfLeaving;

//     // ✅ Include if employee was active during range
//     return exit && exit >= fromDate;
//   })
//   .map(emp => ({
//     ...emp,
//     tag: "EXIT"
//   }));


    /* ================= ADD EXIT EMPLOYEES ================= */
    exitEmployees.forEach(emp => {
      // avoid duplicates
      if (!attMap[plantId][emp.uniqueKey]) {
  empMap[plantId].push(emp);
  attMap[plantId][emp.uniqueKey] = {};
}
    });

    /* ================= EXIT ATTENDANCE ================= */
 historyOperations
  .filter(op => op.plantId === plantId)
  .forEach(op => {
    const key = `${op.employeeId}_${op.dateOfJoining}`;

    if (!attMap[plantId][key]) return;

    const exitDate = op.dateOfLeaving;

(op.operations || []).forEach(operation => {
  const date = operation.operationDate;

  // ✅ IGNORE AFTER EXIT DATE
  if (exitDate && date > exitDate) return;

  const value = getAttendanceValue(operation);

  attMap[plantId][key][date] = {
    value: value,
    remark: operation.attendanceRemark || null // if available
  };
});

  });
  }

  setEmployeeMap(empMap);
  setAttendanceMap(attMap);
  setReportGenerated(true);
};


const loadEmployees = async () => {
  if (selectedPlants.length === 0) {
    alert("No plants selected");
    return;
  }

  const map = {};

  for (const plantId of selectedPlants) {
    const employees = await getEmployeesByPlant(plantId);
    map[plantId] = employees || [];
  }

  setEmployeeMap(map);
  console.log("Employee Map:", map);
};



const getCellValue = (plantId, empId, date) => {
  return attendanceMap?.[plantId]?.[empId]?.[date] ?? "";
};

const getTotalDays = (plantId, empKey) => {
  const records = attendanceMap?.[plantId]?.[empKey] || {};

  return Object.values(records).reduce((sum, v) => {
   const value = Number(v?.value ?? 0); // ensure 0.5 stays 0.5
    return sum + value;
  }, 0);
};

const displayValue = (v) => {
  return v === null || v === undefined || v === "" ? "-" : v;
};

const getFilteredEmployees = (plantId, employees) => {
  if (fromDate === toDate) {
  return employees.filter(emp => {
    
    if (emp.dateOfLeaving && emp.dateOfLeaving < fromDate) {
      return false; // ❌ remove exited before selected day
    }

    if (filterType === "ALL") return true;

    const status = getEmployeeStatus(plantId, emp);
    return status === filterType;
  });
}

return employees;

  if (filterType === "ALL") return employees;

  return employees.filter(emp => {
    const status = getEmployeeStatus(plantId, emp);
    return status === filterType;
  });
};

const downloadExcel = async () => {
  const workbook = new ExcelJS.Workbook();


  const isSunday = (dateStr) => {
  const d = new Date(dateStr);
  return d.getDay() === 0; // Sunday
};


  /* ===== LOAD & CACHE LOGO ===== */
  if (!cachedLeftLogo) {
    cachedLeftLogo = await imageToBase64(companyLogo);
  }

  const  leftLogoId = workbook.addImage({
    base64: cachedLeftLogo,
    extension: "png"
  });

  /* ===== GROUP PLANTS BY ZONE ===== */
  const zoneMap = {};
  selectedPlants.forEach(pid => {
    const plant = plants.find(p => p.plantID === pid);
    if (!plant) return;

    if (!zoneMap[plant.zones]) zoneMap[plant.zones] = [];
    zoneMap[plant.zones].push(plant);
  });



  /* ===== CREATE ZONE SHEETS ===== */
  for (const [zone, zonePlants] of Object.entries(zoneMap)) {
    const sheet = workbook.addWorksheet(`Zone_${zone}`);

const lastColIndex =
  4 + dateColumns.length + (fromDate === toDate ? 1 : 0) + 1;
  // TOTAL WORKING DAYS
const lastColLetter = sheet.getColumn(lastColIndex).letter;

    sheet.getRow(1).height = 30;
    sheet.getRow(2).height = 22;
    sheet.getRow(3).height = 20;

    /* ===== LOGO ===== */
    sheet.addImage(leftLogoId, {
      tl: { col: 0, row: 0 },
      ext: { width: 90, height: 55 }
    });

/* ===== HEADER TEXT (FULL WIDTH) ===== */
sheet.mergeCells(`A1:${lastColLetter}1`);
sheet.mergeCells(`A2:${lastColLetter}2`);
sheet.mergeCells(`A3:${lastColLetter}3`);

["A1", "A2", "A3"].forEach(ref => {
  sheet.getCell(ref).alignment = {
    horizontal: "center",
    vertical: "middle"
  };
  sheet.getCell(ref).font = {
    name: "Times New Roman",
    bold: true
  };
});


/* MAIN TITLE */
sheet.getCell("A1").value = "MVR TECHNOLOGY";
sheet.getCell("A1").font = {
  name: "Times New Roman",
  bold: true,
  size: 18,
  color: { argb: "FFB31818" }
};

/* SUB TITLE */
sheet.getCell("A2").value = `FSTP RAJASTHAN - ZONE ${zone}`;
sheet.getCell("A2").font = {
  name: "Times New Roman",
  bold: true,
  size: 12
};

/* PERIOD */
sheet.getCell("A3").value =
  getAttendanceTitle(fromDate, toDate);

sheet.getCell("A3").font = {
  name: "Times New Roman",
  bold: true,
  size: 11
};


    /* ===== TABLE HEADER ===== */
    const headerRowIndex = 6;
    const headerRow = sheet.getRow(headerRowIndex);

headerRow.values = [
  "Sl No",
  "NAME",
  "DESIGNATION",
  "DOJ (DD/MM/YYYY)",
  ...dateColumns.map(d => Number(d.split("-")[2])),

  ...(fromDate === toDate ? ["REMARK"] : []), // ✅ ADD HERE

  "TOTAL WORKING DAYS"
];

headerRow.eachCell((cell, colNumber) => {
  cell.font = {
    name: "Times New Roman",
    bold: true
  };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };

  const dateColStart = 5; // first date column
  const dateIndex = colNumber - dateColStart;

  if (dateColumns[dateIndex] && isSunday(dateColumns[dateIndex])) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
     fgColor: { argb: "FFDDEEFF" } // 🟡 light yellow for Sunday
    };
  } else {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE7E6E6" }
    };
  }
});

    let rowPtr = headerRowIndex + 1;
    // const lastColIndex = 4 + dateColumns.length + 1;

    /* ===== PLANT + EMPLOYEE DATA ===== */
    /* ===== PLANT + EMPLOYEE DATA ===== */
for (const plant of zonePlants) {

  const allEmployees = employeeMap[plant.plantID] || [];

  const employees = getFilteredEmployees(
    plant.plantID,
    allEmployees
  );

  // ✅ STEP 1: SKIP PLANT FIRST
  if (employees.length === 0) continue;

  // ✅ STEP 2: CREATE HEADER ONLY IF DATA EXISTS
  const endColLetter =
    sheet.getColumn(lastColIndex).letter;

  sheet.mergeCells(`A${rowPtr}:${endColLetter}${rowPtr}`);
  const plantRow = sheet.getRow(rowPtr);

  plantRow.getCell(1).value =
    `ID-${plant.plantID}-${plant.plantName.toUpperCase()}`;

  plantRow.font = {
    name: "Times New Roman",
    bold: true,
    color: { argb: "FF9C0006" }
  };

  plantRow.alignment = {
    horizontal: "center",
    vertical: "middle"
  };

  plantRow.eachCell({ includeEmpty: true }, cell => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF2CC" }
    };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };
  });

  rowPtr++;

  // ✅ STEP 3: EMPLOYEE LOOP
  let sl = 1;

  employees.forEach(emp => {
    const nameWithTag =
      emp.tag === "NEW"
  ? `${emp.employeeName} (NEW - ${
      emp.dateOfJoining
        ? formatDDMMYYYY(emp.dateOfJoining)
        : "-"
    })`
        : emp.tag === "EXIT"
        ? `${emp.employeeName} (EXIT - ${
            emp.dateOfLeaving
              ? formatDDMMYYYY(emp.dateOfLeaving)
              : "-"
          })`
        : emp.employeeName;

    const rowData = [
      sl++,
      nameWithTag,
      emp.designation,
      emp.dateOfJoining
        ? formatDDMMYYYY(emp.dateOfJoining)
        : "-"
    ];

 dateColumns.forEach(date => {
  const record =
    attendanceMap?.[plant.plantID]?.[emp.uniqueKey]?.[date];

  rowData.push(record?.value ?? "");
});

// if (fromDate === toDate) {
//   const record =
//     attendanceMap?.[plant.plantID]?.[emp.uniqueKey]?.[fromDate];

//   rowData.push(record?.remark || "-");
// }

 if (fromDate === toDate) {
  const record =
    attendanceMap?.[plant.plantID]?.[emp.uniqueKey]?.[fromDate];

  rowData.push(record?.remark || "-");
}

rowData.push(getTotalDays(plant.plantID, emp.uniqueKey));


    const row = sheet.addRow(rowData);

/* ✅ APPLY STYLING BACK */
row.eachCell((cell, colNumber) => {
  cell.font = { name: "Times New Roman" };

  cell.alignment = {
    horizontal: "center",
    vertical: "middle"
  };

  cell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };

  const dateColStart = 5;
  const dateIndex = colNumber - dateColStart;

  // Sunday highlight
  if (dateColumns[dateIndex] && isSunday(dateColumns[dateIndex])) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDDEEFF" }
    };
  }

  // Absent (0) → Red
  if (cell.value === 0) {
    cell.font = {
      bold: true,
      color: { argb: "FF9C0006" }
    };
  }

  // Half day (0.5) → Orange
  else if (cell.value === 0.5) {
    cell.font = {
      bold: true,
      color: { argb: "FF9C6500" }
    };
  }
});

/* ✅ NAME COLOR TAGGING */
const nameCell = row.getCell(2);

if (emp.tag === "NEW") {
  nameCell.font = { color: { argb: "FF006100" }, bold: true };
}

if (emp.tag === "EXIT") {
  nameCell.font = { color: { argb: "FF9C0006" }, bold: true };
}

/* ✅ TOTAL COLUMN STYLE */
row.getCell(lastColIndex).font = {
  bold: true,
  color: { argb: "FF006100" }
};

rowPtr++;
  });
}

    sheet.columns = [
      { width: 6 },
      { width: 24 },
      { width: 28 },
      { width: 18 },
      ...dateColumns.map(() => ({ width: 4 })),
      { width: 20 }
    ];

    sheet.views = [{ state: "frozen", ySplit: headerRowIndex }];
  }

  const buffer = await workbook.xlsx.writeBuffer();
const fileTitle = getAttendanceTitle(fromDate, toDate)
  .replace(/[()]/g, "")
  .replace(/\s+/g, "_");

saveAs(
  new Blob([buffer], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }),
  `${fileTitle}.xlsx`
);

};

const getEmployeeStatus = (plantId, emp) => {
  const selectedDateISO = new Date(fromDate)
    .toISOString()
    .split("T")[0];

const record =
  attendanceMap?.[plantId]?.[emp.uniqueKey]?.[selectedDateISO];

const value = record?.value;
  // ✅ Treat undefined/null as ABSENT
  if (value === undefined || value === null) return "ABSENT";

  // ✅ Present if any work done
  if (value > 0) return "PRESENT";

  return "ABSENT";
};

const globalCounts = useMemo(() => {
  if (fromDate !== toDate) return null;

  let total = 0;
  let present = 0;
  let absent = 0;

  Object.entries(employeeMap).forEach(([plantId, employees]) => {
    employees.forEach(emp => {
      total++;

      const selectedDateISO = new Date(fromDate)
        .toISOString()
        .split("T")[0];

 const record =
  attendanceMap?.[plantId]?.[emp.uniqueKey]?.[selectedDateISO];

const v = Number(record?.value ?? 0);

      present += v;
      absent += (1 - v);
    });
  });

  return {
    total,
    present: Number(present.toFixed(1)),
    absent: Number(absent.toFixed(1))
  };
}, [employeeMap, attendanceMap, fromDate, toDate]);
  /* ================= UI ================= */
return (
  <div className="max-w-7xl mx-auto p-4">

    {/* ===== FILTER BAR ===== */}
    <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-6 items-end">

      {/* FROM */}
      <div>
        <label className="text-[10px] font-bold uppercase">From</label>
        <div className="flex items-center gap-2 mt-1">
          <Calendar size={16} />
          <input
            type="date"
            value={fromDate}
            max={new Date().toISOString().split("T")[0]}
            onChange={e => setFromDate(e.target.value)}
            className="border p-2 rounded text-xs"
          />
        </div>
      </div>

      {/* TO */}
      <div>
        <label className="text-[10px] font-bold uppercase">To</label>
        <div className="flex items-center gap-2 mt-1">
          <Calendar size={16} />
          <input
            type="date"
            value={toDate}
            max={new Date().toISOString().split("T")[0]}
            onChange={e => setToDate(e.target.value)}
            className={`border p-2 rounded text-xs ${
              dateError ? "border-red-500" : ""
            }`}
          />
        </div>
      </div>

      {/* ZONE */}
      <div>
        <label className="text-[10px] font-bold uppercase">Zone</label>
        <select
          value={zoneFilter}
          onChange={e => setZoneFilter(e.target.value)}
          className="border p-2 rounded text-xs mt-1"
        >
          <option value="All">All Zones</option>
          {zones.map(z => (
            <option key={z} value={String(z)}>
              Zone {z}
            </option>
          ))}
        </select>
      </div>
<div>
  <label className="text-[10px] font-bold uppercase">
    Phase
  </label>

  <select
    value={phaseFilter}
    onChange={(e) => setPhaseFilter(e.target.value)}
    className="border p-2 rounded text-xs mt-1"
  >
    <option value="All">
      All Phases
    </option>

    {phases.map((phase) => (
      <option
        key={phase}
        value={String(phase)}
      >
        Phase {phase}
      </option>
    ))}
  </select>
</div>
      {/* GENERATE */}
<button
  disabled={!plants.length || selectedPlants.length === 0}
  onClick={loadReport}
  className={`px-4 py-2 rounded text-sm text-white ${
    plants.length && selectedPlants.length
      ? "bg-blue-600"
      : "bg-gray-400 cursor-not-allowed"
  }`}
>
  Generate Report
</button>

{fromDate === toDate && (
  <div className="flex gap-4 mt-4 text-xs font-bold">

    <label>
      <input
        type="radio"
        checked={filterType === "ALL"}
        onChange={() => setFilterType("ALL")}
      />
      <span className="ml-1">All</span>
    </label>

    <label>
      <input
        type="radio"
        checked={filterType === "PRESENT"}
        onChange={() => setFilterType("PRESENT")}
      />
      <span className="ml-1 text-green-600">Present</span>
    </label>

    <label>
      <input
        type="radio"
        checked={filterType === "ABSENT"}
        onChange={() => setFilterType("ABSENT")}
      />
      <span className="ml-1 text-red-600">Absent</span>
    </label>

  </div>
)}
{/* <div className="flex flex-col justify-end">
  <label className="text-[10px] font-bold uppercase">
    Filtered Plants
  </label>

  <div className="mt-1 px-4 py-2 rounded bg-blue-50 border border-blue-200 text-blue-700 text-sm font-bold">
    {matchingCount} Plants
  </div>
</div> */}
    </div>

    {dateError && (
      <p className="text-red-600 text-xs mt-2 font-semibold">
        {dateError}
      </p>
    )}

    {/* ===== GLOBAL ACTION BAR ===== */}
    {reportGenerated && (
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => {
            setReportGenerated(false);
            setEmployeeMap({});
            setAttendanceMap({});
          }}
          className="px-4 py-2 border rounded text-sm"
        >
          Close
        </button>

        <button
          onClick={downloadExcel}
          className="px-4 py-2 bg-green-600 text-white rounded text-sm"
        >
          Download Excel
        </button>
      </div>
    )}

{fromDate === toDate && globalCounts && (
  <div className="bg-white border rounded-xl p-4 mt-6 flex gap-8 text-sm font-bold">

    <span>
      Total: {globalCounts.total}
    </span>

    <span className="text-green-600">
      Present: {globalCounts.present}
    </span>

    <span className="text-red-600">
      Absent: {globalCounts.absent}
    </span>

  </div>
)}

    {/* ===== ATTENDANCE OUTPUT (PLANT-WISE) ===== */}
    {reportGenerated && Object.keys(employeeMap).length > 0 && (
      <div className="mt-10 space-y-10">

        {Object.entries(employeeMap).map(([plantId, employees]) => {
          const plant = plants.find(
            p => p.plantID === Number(plantId)
          );




          return (
            <div
              key={plantId}
              className="bg-white border rounded-xl overflow-hidden"
            >

              {/* PLANT HEADER */}
              <div className="px-5 py-3 border-b font-bold bg-slate-50">
                Plant ID: {plant?.plantID} — {plant?.plantName}
              </div>

              {/* ATTENDANCE TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">

                  <thead className="bg-slate-100 font-bold">
                    <tr>
                    <th className="border p-2">S.No</th>
                      <th className="border p-2">Emp ID</th>
                      <th className="border p-2">Employee Name</th>
                      <th className="border p-2">Designation</th>
                      <th className="border p-2">DOJ</th>

                      {dateColumns.map(d => (
                        <th
                          key={d}
                          className="border p-2 text-center"
                        >
                          {d.split("-")[2]}
                        </th>
                      ))}
{fromDate === toDate && (
  <th className="border p-2 text-center">Remark</th>
)}
                      <th className="border p-2 text-center">TOTAL</th>
                    </tr>
                  </thead>

                  <tbody>
     {getFilteredEmployees(plantId, employees).map((emp, index) => (
                      <tr
                        key={emp.uniqueKey}
                        className="hover:bg-slate-50"
                      >
                        {/* ✅ S.NO */}
  <td className="border p-2 text-center">
    {index + 1}
  </td>
                       <td className="border p-2 text-center">
  {emp.employeeId}
</td>
                      <td className="border p-2 font-semibold">
  {emp.employeeName}

{emp.tag === "NEW" && (
  <span className="ml-1 text-green-600 text-[10px] font-bold">
    (NEW - {emp.dateOfJoining ? formatDDMMYYYY(emp.dateOfJoining) : "—"})
  </span>
)}

  {emp.tag === "EXIT" && (
    <span className="ml-1 text-red-600 text-[10px] font-bold">
      (EXIT - {emp.dateOfLeaving ? formatDDMMYYYY(emp.dateOfLeaving) : "—"})
    </span>
  )}
</td>
                        <td className="border p-2">
                          {emp.designation}
                        </td>
                        <td className="border p-2 text-center">
                          {emp.dateOfJoining
                          ? formatDDMMYYYY(emp.dateOfJoining)
                          : "-"}

                        </td>

                        {dateColumns.map(date => {
const record =
  attendanceMap?.[plantId]?.[emp.uniqueKey]?.[date];

const value = record?.value;


                          return (
                            <td
                              key={date}
                              className="border p-2 text-center font-bold"
                            >
                              {displayValue(value)}
                            </td>
                          );
                        })}
{fromDate === toDate && (
  <td className="border p-2 text-center font-bold text-blue-600">
    {(() => {
      const record =
        attendanceMap?.[plantId]?.[emp.uniqueKey]?.[fromDate];

      return record?.remark ? record.remark : "-";
    })()}
  </td>
)}
                        <td className="border p-2 text-center font-bold text-green-600">
                          {getTotalDays(plantId, emp.uniqueKey)}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>
            </div>
          );
        })}
      </div>
    )}

    {/* ===== MATCHING PLANTS TABLE (BEFORE REPORT) ===== */}
    {!reportGenerated && (
      <div className="bg-white rounded-xl border overflow-hidden mt-6">
        <div className="px-5 py-3 border-b font-bold">
          Plants ({matchingCount})
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-100 text-[11px] uppercase font-bold">
              <tr>
                <th className="border p-2 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredPlants.length > 0 &&
                      selectedPlants.length === filteredPlants.length
                    }
                    onChange={toggleAllPlants}
                  />
                </th>
                <th className="border p-2 text-center">S.No</th>
                <th className="border p-2 text-center">Plant ID</th>
                <th className="border p-2">Plant Name</th>
                <th className="border p-2">District</th>
                <th className="border p-2">KLD</th>
              </tr>
            </thead>

            <tbody>
              {filteredPlants.map((p, i) => (
                <tr
                  key={p.plantID}
                  className={`hover:bg-slate-50 ${
                    selectedPlants.includes(p.plantID)
                      ? "bg-indigo-50/40"
                      : ""
                  }`}
                >
                  <td className="border p-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedPlants.includes(p.plantID)}
                      onChange={() => togglePlant(p.plantID)}
                    />
                  </td>
                  <td className="border p-2 text-center">{i + 1}</td>
                  <td className="border p-2 text-center">{p.plantID}</td>
                  <td className="border p-2 text-center font-semibold">
                    {p.plantName}
                  </td>
                  <td className="border text-center p-2">{p.district}</td>
                  <td className="border text-center p-2">{p.kld}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

  </div>
);

};

export default AttendanceReport;