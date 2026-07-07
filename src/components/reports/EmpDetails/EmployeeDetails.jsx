import React, { useEffect, useMemo, useState } from "react";
import { getAllPlants } from "../../../services/plantService";
import { getEmployeesByPlant } from "../../../services/employeeService";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import companyLogo from '../../reports/company_logo.png'

const DESIGNATIONS = [
  "Supervisor",
  "Operator",
  "Driver",
  "Helper",
  "Security Guard"
];

const formatDate = (date) => {
  if (!date) return "-";

  const d = new Date(date);

  if (isNaN(d)) return date;

  return d.toLocaleDateString("en-GB"); 
  // gives DD/MM/YYYY
};

const isNewJoiner = (doj) => {
  if (!doj) return false;

  const d = new Date(doj);
  const today = new Date();

  return (
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

export default function EmployeeDetails() {
  const [plants, setPlants] = useState([]);
  const [employeesMap, setEmployeesMap] = useState({});

  const [selectedPlants, setSelectedPlants] = useState([]);
  const [zoneFilter, setZoneFilter] = useState("All");
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(false);
const [selectedDesignations, setSelectedDesignations] = useState(DESIGNATIONS);


const orderedDesignations = useMemo(() => {
  return DESIGNATIONS.filter(d => selectedDesignations.includes(d));
}, [selectedDesignations]);

  /* ================= LOAD PLANTS ================= */
  useEffect(() => {
    getAllPlants().then(res => {
      const data = Array.isArray(res) ? res : [];
      setPlants(data);
      setSelectedPlants(data.map(p => p.plantID));
    });
  }, []);

  /* ================= ZONES ================= */
const zones = useMemo(() => {
  return [...new Set(plants.map(p => p.zones).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b));
}, [plants]);

  /* ================= FILTER PLANTS ================= */
  const filteredPlants = useMemo(() => {
    return plants.filter(
      p => zoneFilter === "All" || String(p.zones) === String(zoneFilter)
    );
  }, [plants, zoneFilter]);

  /* AUTO SELECT WHEN ZONE CHANGES */
  useEffect(() => {
    if (zoneFilter === "All") {
      setSelectedPlants(plants.map(p => p.plantID));
    } else {
      setSelectedPlants(
        plants
          .filter(p => String(p.zones) === String(zoneFilter))
          .map(p => p.plantID)
      );
    }
  }, [zoneFilter, plants]);

  const togglePlant = id => {
    setSelectedPlants(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const toggleDesignation = d => {
    setSelectedDesignations(prev =>
      prev.includes(d)
        ? prev.filter(x => x !== d)
        : [...prev, d]
    );
  };

  const allSelected =
    filteredPlants.length > 0 &&
    filteredPlants.every(p => selectedPlants.includes(p.plantID));

  const matchingCount = filteredPlants.length;
  const selectedCount = selectedPlants.filter(id =>
    filteredPlants.some(p => p.plantID === id)
  ).length;

 
const backToSelection = () => {
  setShowReport(false);

  // restore plant list based on zone
  if (zoneFilter === "All") {
    setSelectedPlants(plants.map(p => p.plantID));
  } else {
    setSelectedPlants(
      plants
        .filter(p => String(p.zones) === String(zoneFilter))
        .map(p => p.plantID)
    );
  }
};

  /* LOAD EMPLOYEES AFTER GENERATE */
  useEffect(() => {
    if (!showReport || !selectedPlants.length) return;

    const load = async () => {
      setLoading(true);

      const map = {};
      for (const id of selectedPlants) {
        const list = await getEmployeesByPlant(id);
        map[id] = Array.isArray(list) ? list : [];
      }

      setEmployeesMap(map);
      setLoading(false);
    };

    load();
  }, [showReport, selectedPlants]);

  const getByDesignation = (plantId, designation) => {
    const list = employeesMap[plantId] || [];
    return list.filter(e => e.designation === designation);
  };

  const generate = () => setShowReport(true);
  const reset = () => {
    setShowReport(false);
    setSelectedDesignations([]);
  };

  
   const isMultiRole = selectedDesignations.length > 1;

   const roleCounts = useMemo(() => {
  const counts = {};

  orderedDesignations.forEach(d => {
    counts[d] = 0;
  });

  selectedPlants.forEach(id => {
    const list = employeesMap[id] || [];

    list.forEach(emp => {
      if (counts.hasOwnProperty(emp.designation)) {
        counts[emp.designation]++;
      }
    });
  });

  return counts;
}, [employeesMap, selectedPlants, selectedDesignations]);

const totalVehiclesCount = useMemo(() => {
  return plants
    .filter(
      p => zoneFilter === "All" || String(p.zones) === String(zoneFilter)
    )
    .reduce((sum, p) => sum + (p.noOfVehicle || 0), 0);
}, [plants, zoneFilter]);

const totalEmployees = useMemo(() => {
  let total = 0;

  selectedPlants.forEach(id => {
    const list = employeesMap[id] || [];
    total += list.length;
  });

  return total;
}, [employeesMap, selectedPlants]);

const reportSummary = {
  totalPlants: selectedPlants.length,
  totalEmployees,
  roleCounts
};


let serial = 1;


const buildReportRows = () => {
  const rows = [];
  let s = 1;

  selectedPlants.forEach(id => {
    const plant = plants.find(p => p.plantID === id);
    if (!plant) return;

    if (!isMultiRole) {
      orderedDesignations.forEach(d => {
        const emps = getByDesignation(id, d);

        rows.push([
          s++,
          `${plant.plantID}/${plant.kld}`,
          plant.plantName,
          emps.map(e=>e.employeeId).join(", "),
          emps.map(e=>`${e.employeeName}${isNewJoiner(e.dateOfJoining) ? " (NEW)" : ""}`).join(", "),
         emps.map(e => formatDate(e.dateOfJoining)).join(", "),
          emps.map(e=>e.mobileNo).join(", ")
        ]);
      });

      return;
    }

    orderedDesignations.forEach(d=>{
      const emps = getByDesignation(id,d);

      emps.forEach(e=>{
        rows.push([
          s++,
          `${plant.plantID}/${plant.kld}`,
          plant.plantName,
          d,
          e.employeeId,
          `${e.employeeName}${isNewJoiner(e.dateOfJoining) ? " (NEW)" : ""}`,
          formatDate(e.dateOfJoining),
          e.mobileNo
        ]);
      });
    });
  });

  return rows;
};

const compressImage = (src, maxWidth = 400) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");

      const scale = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");

      // ⭐ keep transparency
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL("image/png")); // ⭐ PNG not JPEG
    };

    img.src = src;
  });


const formatIndian = (val) => {
  if (val === null || val === undefined || val === "-") return "-";
  const num = Number(val);
  if (isNaN(num)) return val;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 1,
    maximumFractionDigits: 1,
  });
}; 

const downloadPdf = async () => {
  const doc = new jsPDF("l", "mm", "a4");

  /* ===== LOAD LOGO ===== */
const logo = await compressImage(companyLogo, 350);

doc.addImage(logo, "PNG", 14, 8, 35, 20);

  /* ===== HEADER TEXT ===== */
  doc.setFont("times", "bold");

  doc.setFontSize(18);
  doc.setTextColor(179, 24, 24);
  doc.text("MVR TECHNOLOGY", 148, 15, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`FSTP RAJASTHAN`, 148, 22, {
    align: "center",
  });

  doc.text("EMPLOYEE DETAILS", 148, 28, { align: "center" });

  /* ===== SUMMARY ===== */
  doc.setFontSize(10);

let topSummary = `Total Plants: ${selectedPlants.length} | Total Employees: ${totalEmployees}`;

if (orderedDesignations.includes("Driver")) {
  topSummary += ` | Total Vehicles: ${totalVehiclesCount}`;
}

doc.text(topSummary, 148, 36, { align: "center" });

let roleStats = orderedDesignations
  .map(d => `${d}: ${roleCounts[d] || 0}`)
  .join(" | ");

if (orderedDesignations.includes("Driver")) {
  roleStats += ` | Total Vehicles: ${totalVehiclesCount}`;
}

doc.text(roleStats, 148, 42, { align: "center" });

  /* ===== HEADERS ===== */
  const headers = ["S.No", "Plant ID / KLD", "Plant Name"];

  if (isMultiRole) {
    headers.push("Designation", "Emp Id", "Name", "DOJ", "Mobile");
  } else {
    orderedDesignations.forEach(d =>
      headers.push(`${d} ID`, `${d} Name`, "DOJ", "Mobile")
    );
  }

  /* ===== BODY ===== */
  const body = [];
  let s = 1;

  selectedPlants.forEach(id => {
    const plant = plants.find(p => p.plantID === id);
    if (!plant) return;

    if (!isMultiRole) {
      const row = [s++, `${plant.plantID}/${plant.kld}`, plant.plantName];

      orderedDesignations.forEach(d => {
        const emps = getByDesignation(id, d);

       row.push(
  emps.map(e => e.employeeId).join(", ") || "-",
  emps.map(e => `${e.employeeName}${isNewJoiner(e.dateOfJoining) ? " (NEW)" : ""}`).join(", ") || "-",
  emps.map(e => formatDate(e.dateOfJoining)).join(", ") || "-",
  emps.map(e => e.mobileNo).join(", ") || "-"
);

      });

      body.push(row);
      return;
    }

    const plantEmployees = [];

    orderedDesignations.forEach(d => {
      getByDesignation(id, d).forEach(e =>
        plantEmployees.push({ d, ...e })
      );
    });

    if (!plantEmployees.length) {
      body.push([
        "-",
        `${plant.plantID}/${plant.kld}`,
        plant.plantName,
        "No employees",
        "",
        "",
        "",
        "",
      ]);
      return;
    }

    plantEmployees.forEach((e, idx) => {
      body.push([
        s++,
        idx === 0 ? `${plant.plantID}/${plant.kld}` : "",
        idx === 0 ? plant.plantName : "",
        e.d,
        e.employeeId,
        `${e.employeeName}${isNewJoiner(e.dateOfJoining) ? " (NEW)" : ""}`,
      formatDate(e.dateOfJoining),
        e.mobileNo,
      ]);
    });
  });

  /* ===== TABLE ===== */
autoTable(doc, {
  startY: 48,
  head: [headers],
  body,
  theme: "grid",

  styles: {
    font: "times",
    fontSize: 8,
    cellPadding: 2,
  },

  /* ⭐ HEADER STYLE */
  headStyles: {
    fillColor: [221, 238, 255], // ⭐ light blue
    textColor: [0, 0, 0],       // ⭐ black text
    fontStyle: "bold",
  },

  alternateRowStyles: {
    fillColor: [248, 250, 252], // optional soft zebra
  },
});


  doc.save("EmployeeReport.pdf");
};


  let cachedLeftLogo = null;

const imageToBase64 = async (url) => {
  const res = await fetch(url);
  const blob = await res.blob();

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

const applyCellStyle = (row) => {
  row.eachCell((cell) => {
    cell.font = {
      name: "Times New Roman",
      size: 11
    };

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    };

    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };
  });
};

const downloadExcel = async () => {
  const workbook = new ExcelJS.Workbook();

  /* ===== LOAD LOGO ===== */
  if (!cachedLeftLogo) {
    cachedLeftLogo = await imageToBase64(companyLogo);
  }

  const leftLogoId = workbook.addImage({
    base64: cachedLeftLogo,
    extension: "png"
  });

  /* ===== GROUP BY ZONE ===== */
  const zoneMap = {};
  selectedPlants.forEach((pid) => {
    const plant = plants.find((p) => p.plantID === pid);
    if (!plant) return;

    if (!zoneMap[plant.zones]) zoneMap[plant.zones] = [];
    zoneMap[plant.zones].push(plant);
  });

let allSheet = null;

if (zoneFilter === "All") {
  allSheet = workbook.addWorksheet("All_Zones");
}

  /* ================= ALL ZONES SHEET ================= */
if (allSheet) {
const sheet = allSheet;

/* HEADER HEIGHT */
sheet.getRow(1).height = 30;
sheet.getRow(2).height = 22;
sheet.getRow(3).height = 20;

/* LOGO */
sheet.addImage(leftLogoId, {
  tl: { col: 0, row: 0 },
  ext: { width: 90, height: 55 }
});

const lastColLetter = "H";

/* MERGE */
sheet.mergeCells(`A1:${lastColLetter}1`);
sheet.mergeCells(`A2:${lastColLetter}2`);
sheet.mergeCells(`A3:${lastColLetter}3`);
sheet.mergeCells(`A4:${lastColLetter}4`);
sheet.mergeCells(`A5:${lastColLetter}5`);

/* HEADER STYLE */
const setHeaderStyleAll = (cellRef, size = 12) => {
  const cell = sheet.getCell(cellRef);
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.font = { name: "Times New Roman", bold: true, size };
};

/* TITLE */
sheet.getCell("A1").value = "MVR TECHNOLOGY";
sheet.getCell("A1").font = {
  name: "Times New Roman",
  bold: true,
  size: 18,
  color: { argb: "FFB31818" }
};

sheet.getCell("A2").value = "FSTP RAJASTHAN";
setHeaderStyleAll("A2");

sheet.getCell("A3").value = "EMPLOYEE DETAILS - All Zones";
setHeaderStyleAll("A3");

/* ===== SUMMARY ===== */
sheet.getCell("A4").value =
  `Total Plants: ${selectedPlants.length} | Total Employees: ${totalEmployees} | Total Vehicles: ${totalVehiclesCount}`;
setHeaderStyleAll("A4");

/* ROLE COUNTS */
let roleSummaryAll = orderedDesignations
  .map(d => `${d}: ${roleCounts[d] || 0}`)
  .join(" | ");

sheet.getCell("A5").value = roleSummaryAll;
setHeaderStyleAll("A5");

/* ===== TABLE HEADER ===== */
const headerRowIndex = 7;

const headers = ["S.No", "Plant ID / KLD", "Plant Name"];

if (isMultiRole) {
  headers.push("Designation", "Emp Id", "Name", "DOJ", "Mobile");
} else {
  orderedDesignations.forEach(d =>
    headers.push(`${d} ID`, `${d} Name`, "DOJ", "Mobile")
  );
}

const headerRow = sheet.getRow(headerRowIndex);
headerRow.values = headers;

/* STYLE HEADER */
headerRow.eachCell(cell => {
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
});

/* ===== COLUMN WIDTH ===== */
sheet.columns = [
  { width: 8 },
  { width: 18 },
  { width: 28 },
  { width: 18 },
  { width: 18 },
  { width: 25 },
  { width: 15 },
  { width: 18 }
];

/* ===== DATA ===== */
let rowIndex = headerRowIndex + 1;
let s = 1;

selectedPlants.forEach(id => {
  const plant = plants.find(p => p.plantID === id);
  if (!plant) return;

  const plantEmployees = [];

  if (isMultiRole) {
    orderedDesignations.forEach(d => {
      getByDesignation(id, d).forEach(e =>
        plantEmployees.push({ d, ...e })
      );
    });
  }

  /* SINGLE ROLE */
  if (!isMultiRole) {
    const row = sheet.getRow(rowIndex);

    const base = [s++, `${plant.plantID}/${plant.kld}`, plant.plantName];

    orderedDesignations.forEach(d => {
      const emps = getByDesignation(id, d);

      base.push(emps.map(e => e.employeeId).join(", ") || "-");

      base.push(
        emps.length
          ? {
              richText: emps.flatMap((e, i) => {
                const arr = [{ text: e.employeeName }];
                if (isNewJoiner(e.dateOfJoining)) {
                  arr.push({
                    text: " (NEW)",
                    font: {
    name: "Times New Roman",
    color: { argb: "FF16A34A" },
    bold: true
  }
                  });
                }
                if (i !== emps.length - 1) arr.push({ text: ", " });
                return arr;
              })
            }
          : "-"
      );

      base.push(
        emps.map(e => formatDate(e.dateOfJoining)).join(", ") || "-"
      );

      base.push(
        emps.map(e => e.mobileNo).join(", ") || "-"
      );
    });

    row.values = base;
    applyCellStyle(row);

    rowIndex++;
    return;
  }

  /* MULTI ROLE */
  if (!plantEmployees.length) {
    const row = sheet.addRow([
      "-",
      `${plant.plantID}/${plant.kld}`,
      plant.plantName,
      "No employees"
    ]);
    applyCellStyle(row);
    rowIndex++;
    return;
  }

  const startRow = rowIndex;

  plantEmployees.forEach((e, idx) => {
    const row = sheet.addRow([
      s++,
      idx === 0 ? `${plant.plantID}/${plant.kld}` : "",
      idx === 0 ? plant.plantName : "",
      e.d,
      e.employeeId,
      isNewJoiner(e.dateOfJoining)
        ? {
            richText: [
              { text: e.employeeName },
              { text: " (NEW)", font: { color: { argb: "FF16A34A" }, bold: true } }
            ]
          }
        : e.employeeName,
      formatDate(e.dateOfJoining),
      e.mobileNo
    ]);

    applyCellStyle(row);
    rowIndex++;
  });
sheet.getCell("A1").alignment = {
  horizontal: "center",
  vertical: "middle"
};
  const endRow = rowIndex - 1;
  sheet.mergeCells(`B${startRow}:B${endRow}`);
  sheet.mergeCells(`C${startRow}:C${endRow}`);
});
}
  /* ===== CREATE ZONE SHEETS ===== */
  for (const [zone, zonePlants] of Object.entries(zoneMap)) {
    const sheet = workbook.addWorksheet(`Zone_${zone}`);

    /* HEADER HEIGHT */
    sheet.getRow(1).height = 30;
    sheet.getRow(2).height = 22;
    sheet.getRow(3).height = 20;

    /* LOGO */
    sheet.addImage(leftLogoId, {
      tl: { col: 0, row: 0 },
      ext: { width: 90, height: 55 }
    });

const lastColLetter = "H";

/* MERGES */
sheet.mergeCells(`A1:${lastColLetter}1`);
sheet.mergeCells(`A2:${lastColLetter}2`);
sheet.mergeCells(`A3:${lastColLetter}3`);
sheet.mergeCells(`A4:${lastColLetter}4`);
sheet.mergeCells(`A5:${lastColLetter}5`);

/* COMMON STYLE FUNCTION */
const setHeaderStyle = (cellRef, size = 12) => {
  const cell = sheet.getCell(cellRef);
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.font = {
    name: "Times New Roman",
    bold: true,
    size
  };
};

/* TITLE */
sheet.getCell("A1").value = "MVR TECHNOLOGY";
sheet.getCell("A1").font = {
  name: "Times New Roman",
  bold: true,
  size: 18,
  color: { argb: "FFB31818" }
};
sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

/* SUB TITLE */
sheet.getCell("A2").value = `FSTP RAJASTHAN`;
setHeaderStyle("A2", 12);

/* REPORT TITLE */
sheet.getCell("A3").value = `EMPLOYEE DETAILS - Zone ${zone}`;

setHeaderStyle("A3", 12);


const zonePlantIds = zonePlants.map(p => p.plantID);

const zoneEmployees = zonePlantIds.reduce((sum, id) => {
  return sum + (employeesMap[id]?.length || 0);
}, 0);

const zoneVehicles = zonePlants.reduce(
  (sum, p) => sum + (p.noOfVehicle || 0),
  0
);

const zoneRoleCounts = {};

orderedDesignations.forEach(d => {
  zoneRoleCounts[d] = 0;

  zonePlantIds.forEach(id => {
    const list = employeesMap[id] || [];
    list.forEach(emp => {
      if (emp.designation === d) zoneRoleCounts[d]++;
    });
  });
});

/* SUMMARY ROW */
let excelSummary = `Total Plants: ${selectedPlants.length} | Total Employees : ${totalEmployees}`;

if (orderedDesignations.includes("Driver")) {
  excelSummary += ` | Total Vehicles: ${totalVehiclesCount}`;
}

sheet.getCell("A4").value =
`Total Plants: ${zonePlants.length} | Total Employees: ${zoneEmployees} | Total Vehicles: ${zoneVehicles}`;
setHeaderStyle("A4", 11);
/* ROLE COUNTS */
let roleSummary = orderedDesignations
  .map(d => `${d}: ${zoneRoleCounts[d] || 0}`)
  .join(" | ");

sheet.getCell("A5").value = roleSummary;
setHeaderStyle("A5", 11);


    /* ===== TABLE HEADER ===== */
    const headerRowIndex = 7;

    const headers = ["S.No", "Plant ID / KLD", "Plant Name"];

    if (isMultiRole) {
      headers.push("Designation", "Emp Id", "Name", "DOJ", "Mobile");
    } else {
      orderedDesignations.forEach((d) =>
        headers.push(`${d} ID`, `${d} Name`, "DOJ", "Mobile")
      );
    }

    const headerRow = sheet.getRow(headerRowIndex);
    headerRow.values = headers;

    /* ===== FIXED COLUMN WIDTHS (DYNAMIC) ===== */
const columnWidths = [8, 18, 28]; // S.No, Plant ID, Plant Name

if (isMultiRole) {
  columnWidths.push(18, 18, 25, 15, 18);
} else {
  orderedDesignations.forEach(() => {
    columnWidths.push(18, 25, 15, 18);
  });
}

sheet.columns = columnWidths.map(w => ({ width: w }));


/* ===== FIXED COLUMN WIDTHS ===== */
sheet.columns = [
  { width: 8 },   // S.No
  { width: 18 },  // Plant ID / KLD
  { width: 28 },  // Plant Name
  { width: 18 },  // Designation OR Role ID
  { width: 18 },  // Emp Id
  { width: 25 },  // Name
  { width: 15 },  // DOJ
  { width: 18 }   // Mobile
];

headerRow.eachCell((cell) => {
  cell.font = { name: "Times New Roman", bold: true };
  cell.alignment = { horizontal: "center", vertical: "middle" };

  cell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };
});

    /* ===== DATA (same logic as preview) ===== */
    let rowIndex = headerRowIndex + 1;
    let s = 1;

    zonePlants.forEach((plant) => {
      const plantEmployees = [];

      if (isMultiRole) {
        orderedDesignations.forEach((d) => {
          getByDesignation(plant.plantID, d).forEach((e) =>
            plantEmployees.push({ d, ...e })
          );
        });
      }

      /* SINGLE ROLE */
if (!isMultiRole) {
  const row = sheet.getRow(rowIndex);

  const base = [
    s++,
    `${plant.plantID}/${plant.kld}`,
    plant.plantName
  ];

  orderedDesignations.forEach((d) => {
    const emps = getByDesignation(plant.plantID, d);

    /* EMP IDS */
    base.push(emps.map(e => e.employeeId).join(", ") || "-");

    /* EMP NAMES (WITH GREEN NEW) */
    if (emps.length) {
      base.push({
        richText: emps.flatMap((e, i) => {
          const arr = [
            { text: e.employeeName }
          ];

          if (isNewJoiner(e.dateOfJoining)) {
            arr.push({
              text: " (NEW)",
              font: { color: { argb: "FF16A34A" }, bold: true }
            });
          }

          if (i !== emps.length - 1) {
            arr.push({ text: ", " });
          }

          return arr;
        })
      });
    } else {
      base.push("-");
    }

    /* DOJ */
    base.push(
      emps.map(e => formatDate(e.dateOfJoining)).join(", ") || "-"
    );

    /* MOBILE */
    base.push(
      emps.map(e => e.mobileNo).join(", ") || "-"
    );
  });

  row.values = base;
applyCellStyle(row);

  /* ✅ APPLY STYLE */
  row.eachCell((cell) => {
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    };

    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };
  });

  rowIndex++;
  return;
}

      /* NO EMP */
      if (!plantEmployees.length) {
  sheet.addRow([
    "-", // ⭐ S.NO as dash
    `${plant.plantID}/${plant.kld}`,
    plant.plantName,
    "No employees",
    
  ]);

  rowIndex++;
  return;
}



      /* MULTI ROLE */
      const startRow = rowIndex;

plantEmployees.forEach((e, idx) => {

  const row = sheet.addRow([
    s++,
    idx === 0 ? `${plant.plantID}/${plant.kld}` : "",
    idx === 0 ? plant.plantName : "",
    e.d,
    e.employeeId,

    /* ✅ NAME WITH GREEN (NEW) */
    isNewJoiner(e.dateOfJoining)
      ? {
          richText: [
            { text: e.employeeName },
            {
              text: " (NEW)",
              font: { color: { argb: "FF16A34A" }, bold: true }
            }
          ]
        }
      : e.employeeName,

    formatDate(e.dateOfJoining),
    e.mobileNo
  ]);
applyCellStyle(row);

  /* ✅ APPLY STYLE */
  row.eachCell((cell) => {
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    };

    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };
  });

  rowIndex++;
});

      const endRow = rowIndex - 1;

      sheet.mergeCells(`B${startRow}:B${endRow}`);
      sheet.mergeCells(`C${startRow}:C${endRow}`);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "EmployeeDetails.xlsx");
};

  return (
<div className="max-w-7xl mx-auto p-6 space-y-6 bg-slate-50 min-h-screen text-slate-800">

      {/* ================= FILTER BAR ================= */}
<div className="bg-white border rounded-xl shadow-sm p-5 flex flex-col lg:flex-row gap-6 lg:items-end flex-wrap">

  {/* ZONE */}
  <div>
  <label className="text-[10px] font-bold uppercase text-slate-500">Zone</label>

    <select
      value={zoneFilter}
      onChange={e => setZoneFilter(e.target.value)}
   className="w-full border p-2 rounded-lg text-sm mt-1 focus:ring-2 focus:ring-emerald-500 outline-none"

    >
      <option value="All">All Zones</option>
      {zones.map(z => (
        <option key={z} value={z}>Zone {z}</option>
      ))}
    </select>
  </div>

  {/* DESIGNATIONS */}
  <div className="flex-1">
    <label className="text-xs font-bold">DESIGNATIONS</label>
    <div className="flex flex-wrap gap-4 mt-2">
      {DESIGNATIONS.map(d => (
      <label key={d} className="flex items-center gap-2 text-sm cursor-pointer hover:text-emerald-600 transition">

          <input
            type="checkbox"
            checked={selectedDesignations.includes(d)}
            onChange={() => toggleDesignation(d)}
          />
          {d}
        </label>
      ))}
    </div>
  </div>

  {/* GENERATE */}
  <button
    onClick={generate}
    disabled={!selectedPlants.length}
  className="px-8 py-2 bg-blue-500 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-semibold transition shadow active:scale-95"

  >
    Generate
  </button>

</div>

{/* ================= PLANT SELECTION ================= */}
{!showReport && (
<div className="bg-white rounded-xl border shadow-sm overflow-hidden">

    <div className="px-5 py-3 border-b font-bold flex justify-between">
      <span>Total Plants ({matchingCount})</span>
      <span className="text-sm">Selected: {selectedCount}</span>
    </div>

    <div className="overflow-x-auto">
      <table className="min-w-[900px] w-full border-collapse text-sm">
<thead className="bg-slate-100 text-slate-600">

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

  <th className="border p-2 text-center w-[60px]">S.No</th>
            <th className="border p-2 text-center">Plant ID / KLD</th>
            <th className="border p-2 text-center">Plant Name</th>
          </tr>
        </thead>

        <tbody>
          {filteredPlants.map(p => (

            <tr key={p.plantID}>
              <td className="border text-center">
                <input
                  type="checkbox"
                  checked={selectedPlants.includes(p.plantID)}
                  onChange={() => togglePlant(p.plantID)}
                />
              </td>
   <td className="border text-center">{serial++}</td>
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


      {/* ================= REPORT ================= */}
      {/* ================= EMPLOYEE REPORT ================= */}
{showReport && (
 <div className="bg-white border rounded-xl shadow-lg overflow-hidden">

    {/* HEADER */}
<div className="p-3 border-b flex flex-col gap-2">

  {/* TOP ROW */}
  <div className="flex justify-between items-center">

    <span className="font-bold">Employee Details</span>

   <div className="flex gap-4 flex-wrap">

  <button
    onClick={downloadPdf}
    className="px-4 py-2 bg-red-600 hover:bg-red-700 
               text-white text-sm font-semibold 
               rounded-lg shadow transition 
               active:scale-95"
  >
    Download PDF
  </button>

  <button
    onClick={downloadExcel}
    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 
               text-white text-sm font-semibold 
               rounded-lg shadow transition 
               active:scale-95"
  >
    Download Excel
  </button>

  <button
    onClick={backToSelection}
    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 
               text-white text-sm font-semibold 
               rounded-lg shadow transition 
               active:scale-95"
  >
    ← Back
  </button>

</div>

  </div>

  {/* SUMMARY */}
{selectedDesignations.length > 0 && (
  <div className="w-full mt-2 px-4 py-3 rounded bg-slate-50
                  flex flex-wrap gap-6 text-sm font-semibold">

    <div>Total Plants: {selectedPlants.length}</div>
<div>
  Total Employees : {totalEmployees}
  {orderedDesignations.includes("Driver") && (
    <> | Total Vehicles: {totalVehiclesCount}</>
  )}
</div>
{orderedDesignations.map(d => (
  <React.Fragment key={d}>
    <div>
      {d}: {roleCounts[d] || 0}
    </div>


  </React.Fragment>
))}
  </div>
)}


</div>

    {/* NO DESIGNATION SELECTED */}
    {!selectedDesignations.length ? (
      <div className="p-6 text-sm text-slate-500">
        Select at least one designation to view employee details.
      </div>
    ) : loading ? (
      <div className="p-4">Loading...</div>
    ) : (
    <table className="min-w-[900px] w-full text-sm">

<thead className="bg-slate-100">
<tr>
    <th className="border p-2 text-center">S.No</th>
  <th className="border p-2 text-center">Plant ID / KLD</th>
  <th className="border p-2 text-center">Plant Name</th>

  {!isMultiRole ? (
    orderedDesignations.map(d => (
      <React.Fragment key={d}>
        <th className="border p-2">{d} Emp Id</th>
        <th className="border p-2">{d} Name</th>
        <th className="border p-2">{d} DOJ</th>
        <th className="border p-2">{d} Mobile </th>
      </React.Fragment>
    ))
  ) : (
    <>
      <th className="border p-2">Designation</th>
      <th className="border p-2">Emp Id</th>
      <th className="border p-2">Employee Name</th>
      <th className="border p-2">DOJ</th>
      <th className="border p-2">Mobile number</th>
    </>
  )}
</tr>
</thead>

<tbody>
{selectedPlants.map(id => {
  const plant = plants.find(p => p.plantID === id);
  if (!plant) return null;

  /* ===== SINGLE ROLE MODE ===== */
  if (!isMultiRole) {
    return (
      <tr key={id}>
        <td className="border text-center">{serial++}</td>
        <td className="border text-center">{plant.plantID}/{plant.kld}</td>
        <td className="border text-center">{plant.plantName}</td>

        {orderedDesignations.map(d => {
          const emps = getByDesignation(id, d);

          return (
            <React.Fragment key={d}>

              {/* ✅ EMP ID */}
              <td className="border text-center">
                {emps.map(e => e.employeeId).join(", ") || "-"}
              </td>

              {/* ✅ EMP NAME (FIXED NEW LOGIC) */}
              <td className="border text-center">
                {emps.length
                  ? emps.map((e, i) => (
                      <span key={e.employeeId}>
                        {e.employeeName}
                        {isNewJoiner(e.dateOfJoining) && (
                          <span className="text-green-600 font-semibold"> (NEW)</span>
                        )}
                        {i !== emps.length - 1 && ", "}
                      </span>
                    ))
                  : "-"}
              </td>

              {/* DOJ */}
              <td className="border text-center">
                {emps.map(e => formatDate(e.dateOfJoining)).join(", ") || "-"}
              </td>

              {/* MOBILE */}
              <td className="border text-center">
                {emps.map(e => e.mobileNo).join(", ") || "-"}
              </td>

            </React.Fragment>
          );
        })}
      </tr>
    );
  }

  /* ===== MULTI ROLE MODE ===== */
  const plantEmployees = [];

  orderedDesignations.forEach(d => {
    const emps = getByDesignation(id, d);
    emps.forEach(e => {
      plantEmployees.push({ designation: d, ...e });
    });
  });

  if (!plantEmployees.length) {
    return (
      <tr key={id}>
        <td className="border text-center">{serial++}</td>
        <td className="border text-center font-semibold">
          {plant.plantID}/{plant.kld}
        </td>
        <td className="border text-center">
          {plant.plantName}
        </td>
        <td className="border text-center text-slate-900" colSpan={5}>
          No employees
        </td>
      </tr>
    );
  }

  return plantEmployees.map((e, index) => (
    <tr key={`${id}-${e.employeeId}`}>

      <td className="border text-center">{serial++}</td>

      {index === 0 && (
        <>
          <td rowSpan={plantEmployees.length} className="border text-center font-semibold">
            {plant.plantID}/{plant.kld}
          </td>

          <td rowSpan={plantEmployees.length} className="border text-center">
            {plant.plantName}
          </td>
        </>
      )}

      <td className="border text-center">{e.designation}</td>
      <td className="border text-center">{e.employeeId}</td>

      {/* ✅ FIXED NAME COLUMN */}
      <td className="border text-center">
        {e.employeeName}
        {isNewJoiner(e.dateOfJoining) && (
          <span className="text-green-600 font-semibold"> (NEW)</span>
        )}
      </td>

      <td className="border text-center">
        {formatDate(e.dateOfJoining)}
      </td>

      <td className="border text-center">{e.mobileNo}</td>

    </tr>
  ));
})}
</tbody>

</table>

    )}
  </div>
)}


    </div>
  );
}