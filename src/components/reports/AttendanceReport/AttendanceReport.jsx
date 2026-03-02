import React, { useEffect, useMemo, useState } from "react";
import { Calendar } from "lucide-react";

import { getAllPlants } from "../../../services/plantService";
import {
  getEmployeesByPlant,
  getEmployeeOperationsByDateRange
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
const [employeeMap, setEmployeeMap] = useState({});
  const [selectedPlants, setSelectedPlants] = useState([]);
const [fromDate, setFromDate] = useState(today);
const [toDate, setToDate] = useState(today);
const [dateError, setDateError] = useState("");
const [reportGenerated, setReportGenerated] = useState(false);



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

  /* ================= FILTER PLANTS BY ZONE ================= */
  const filteredPlants = useMemo(() => {
    if (zoneFilter === "All") return plants;

    return plants.filter(
      p => String(p.zones) === String(zoneFilter)
    );
  }, [plants, zoneFilter]);

  const matchingCount = filteredPlants.length;

  /* ================= AUTO-SELECT (SELECT MODE ONLY) ================= */
useEffect(() => {
  if (!plants.length) return;

  const ids =
    zoneFilter === "All"
      ? plants.map(p => p.plantID)
      : plants
          .filter(p => String(p.zones) === String(zoneFilter))
          .map(p => p.plantID);

  setSelectedPlants(ids);
}, [plants, zoneFilter]);


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

  // ✅ Fetch operations ONCE
  const allOperations = await getEmployeeOperationsByDateRange(
    fromDate,
    toDate
  );

  for (const plantId of selectedPlants) {
    // Employees per plant
    const employees = await getEmployeesByPlant(plantId);
    empMap[plantId] = employees || [];

    attMap[plantId] = {};

    // Init employees
    employees.forEach(emp => {
      attMap[plantId][emp.employeeId] = {};
    });

    // Filter operations per plant
    allOperations
      .filter(op => op.plantId === plantId)
      .forEach(op => {
        const date = op.plantOp.operationDate;
        const value = getAttendanceValue(op.plantOp);

        if (!attMap[plantId][op.employeeId]) {
          attMap[plantId][op.employeeId] = {};
        }

        attMap[plantId][op.employeeId][date] = value;
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

const getTotalDays = (plantId, empId) => {
  const records = attendanceMap?.[plantId]?.[empId] || {};
  return Object.values(records).reduce((sum, v) => sum + v, 0);
};

const displayValue = (v) => {
  return v === null || v === undefined || v === "" ? "-" : v;
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

  const lastColIndex = 4 + dateColumns.length + 1; // TOTAL WORKING DAYS
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
    for (const plant of zonePlants) {
      /* ===== PLANT SEPARATOR ===== */
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

      /* ===== EMPLOYEES ===== */
      const employees = employeeMap[plant.plantID] || [];
      let sl = 1;

      employees.forEach(emp => {
        const rowData = [
          sl++,
          emp.employeeName,
          emp.designation,
          emp.dateOfJoining
            ? formatDDMMYYYY(emp.dateOfJoining)
            : "-"
        ];

        dateColumns.forEach(date => {
          const v =
            attendanceMap?.[plant.plantID]?.[emp.employeeId]?.[date];
          rowData.push(v ?? "");
        });

        rowData.push(getTotalDays(plant.plantID, emp.employeeId));

        const row = sheet.addRow(rowData);

row.eachCell((cell, colNumber) => {
  cell.font = { name: "Times New Roman" };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };

  const dateColStart = 5;
  const dateIndex = colNumber - dateColStart;

  if (dateColumns[dateIndex] && isSunday(dateColumns[dateIndex])) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDDEEFF" } // Sunday body
    };
  }

  if (cell.value === 0) {
    cell.font = { bold: true, color: { argb: "FF9C0006" } };
  } else if (cell.value === 0.5) {
    cell.font = { bold: true, color: { argb: "FF9C6500" } };
  }
});


        row.getCell(lastColIndex).font = {
          name: "Times New Roman",
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

                      <th className="border p-2 text-center">TOTAL</th>
                    </tr>
                  </thead>

                  <tbody>
                    {employees.map(emp => (
                      <tr
                        key={emp.employeeId}
                        className="hover:bg-slate-50"
                      >
                        <td className="border p-2 text-center">
                          {emp.employeeId}
                        </td>
                        <td className="border p-2 font-semibold">
                          {emp.employeeName}
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
                          const value =
                            attendanceMap?.[plantId]?.[emp.employeeId]?.[date];

                          return (
                            <td
                              key={date}
                              className="border p-2 text-center font-bold"
                            >
                              {displayValue(value)}
                            </td>
                          );
                        })}

                        <td className="border p-2 text-center font-bold text-green-600">
                          {getTotalDays(plantId, emp.employeeId)}
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