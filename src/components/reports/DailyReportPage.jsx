import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// import companyLogo from '../reports/company_logo.png';
import companyLogo from '../reports/company_logo1.jpg';

// import logo from '../reports/logo.png';
import logo from '../reports/logo1.jpg';

// Constants (replace with your actual API endpoints or environment variables)
import { getAllPlants } from '../../services/plantService'
import { getOperationsByDate } from "../../services/operationService";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// Helper function to format numbers for display (same logic as original JS)
const formatNumberNice = (v) => {
    if (v === null || v === undefined || v === '') return '-';
    const n = Number(v);
    if (isNaN(n)) return v;
    const rounded = Math.round(n * 100) / 100;
    return rounded.toLocaleString('en-IN', {
        minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
        maximumFractionDigits: 2
    });
};

// Helper function to convert to number (same logic as original JS)
const toNumber = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(String(v).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
};

// Helper function to format date for display (DD/MM/YYYY)
const isoDateToDisplay = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return dd + '/' + mm + '/' + yyyy;
};


// Helper function to get the first non-null/non-empty value (same logic as original JS)
const getBest = (...args) => {
    for (const v of args) {
        if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return null;
};

// Helper function to extract field from operation object (same logic as original JS)
const getOpField = (op, ...keys) => {
    for (const k of keys) {
        if (op[k] !== undefined && op[k] !== null) return op[k];
    }
    return null;
};
let cachedCompanyLogo = null;
let cachedMainLogo = null;
const formatDateDDMMYYYY = (dateStr) => {
  if (!dateStr) return "";

  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`;
};

// Main Component
const DailyReportPage = () => {
    const [reportDate, setReportDate] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportData, setReportData] = useState([]);
    const [fetchedAt, setFetchedAt] = useState('—');
    const [plantMaster, setPlantMaster] = useState({});
    const [notice, setNotice] = useState('');
    const [isLoading, setIsLoading] = useState(false);
const [zoneFilter, setZoneFilter] = useState("All");
const [plants, setPlants] = useState([]);
const formattedDate = formatDateDDMMYYYY(selectedDate);
    // --- Data Processing Logic ---
    const extractRow = useCallback((item) => {
        const op = item.operation || item;
        const plantId = getBest(item.plantId, item.plantID, item.plant_id, op.plantId, op.plantID);
        const meta = (plantId !== undefined && plantId !== null) ? plantMaster[String(plantId)] : null;

        const district = getBest(meta?.district, getOpField(op, 'district', 'District', 'stateCode'), '-');
        const plantName = getBest(meta?.name, getOpField(op, 'plantName', 'plant', 'PlantName', 'name'), plantId) || (plantId || '-');
        const kld = getBest(meta?.kld, getOpField(op, 'kld', 'KLD'), '-');

        const beforeSTL = getOpField(op, 'sludgeTankLevelAm', 'sludgeTankLevelAM', 'sludge_tank_level_am');
        const sludgeReceived = getOpField(op, 'sludgeReceived', 'sludge_received');
        const sludgeProcessed = getOpField(op, 'sludgeProcessed', 'sludge_processed');
        const afterSTL = getOpField(op, 'sludgeTankLevelPm', 'sludgeTankLevelPM', 'sludge_tank_level_pm');

        const plantRunHrs = getOpField(op, 'plantRunningHrs', 'plant_run_hrs', 'plantRunHrs');
        const biocharProduced = getOpField(op, 'biocharProduced', 'biochar_quantity');
        const power = (op.powerConsumed !== undefined && op.powerConsumed !== null) ? op.powerConsumed : getOpField(op, 'powerKwh', 'power');
        const dgHours = getOpField(op, 'dgRunHours', 'dg_run_hours', 'dgRunHrs', 'dg_runhrs');
        const remarks = getOpField(op, 'remarks', 'Remarks', 'note');

        return {
            plantId: plantId,
            district: district,
            plantName: plantName,
            kld: kld,
            beforeSTL: beforeSTL,
            sludgeReceived: sludgeReceived,
            sludgeProcessed: sludgeProcessed,
            afterSTL: afterSTL,
            plantRunHrs: plantRunHrs,
            biocharProduced: biocharProduced,
            power: power,
            dgHours: dgHours,
            remarks: remarks
        };
    }, [plantMaster]);


    const operationsByPlantId = React.useMemo(() => {
  const map = {};
  reportData.forEach(item => {
    const op = item.operation || item;
    const plantId = getBest(
      item.plantId,
      item.plantID,
      item.plant_id,
      op.plantId,
      op.plantID
    );
    if (plantId != null) {
      map[String(plantId)] = item;
    }
  });
  return map;
}, [reportData]);

const processedData = Object.entries(plantMaster)
  .filter(([plantId, meta]) =>
    zoneFilter === "All" ||
    String(meta.zone) === String(zoneFilter)
  )
  .map(([plantId, meta]) => {
    const operationItem = operationsByPlantId[plantId];

    if (operationItem) {
      const r = extractRow(operationItem);
      r.numericPlantId = Number(plantId);
      return r;
    }

    return {
      plantId,
      numericPlantId: Number(plantId),
      district: meta.district || "-",
      plantName: meta.name || "-",
      kld: meta.kld || "-",
      beforeSTL: null,
      sludgeReceived: null,
      sludgeProcessed: null,
      afterSTL: null,
      plantRunHrs: null,
      biocharProduced: null,
      power: null,
      dgHours: null,
      remarks: null,
    };
  })
  .sort((a, b) => a.numericPlantId - b.numericPlantId);



    // Calculate Totals
    const totals = processedData.reduce((acc, r) => {
        acc.totalBefore += toNumber(r.beforeSTL);
        acc.totalReceived += toNumber(r.sludgeReceived);
        acc.totalProcessed += toNumber(r.sludgeProcessed);
        acc.totalAfter += toNumber(r.afterSTL);
        acc.totalRunHrs += toNumber(r.plantRunHrs);
        acc.totalBiochar += toNumber(r.biocharProduced);
        return acc;
    }, {
        totalBefore: 0,
        totalReceived: 0,
        totalProcessed: 0,
        totalAfter: 0,
        totalRunHrs: 0,
        totalBiochar: 0,
    });


    
    // --- Fetching Logic ---

    // 1. Fetch Plant Master Data on mount
useEffect(() => {
  const fetchPlantMaster = async () => {
    try {
      const list = await getAllPlants();
      if (!Array.isArray(list)) return;

      setPlants(list); // ✅ store full list for zones

      const newPlantMap = {};

      list.forEach(item => {
        const permanent =
          item.permanentPower !== undefined
            ? item.permanentPower
            : item.permanent_power !== undefined
            ? item.permanent_power
            : null;

        if (permanent !== true) return;

        const id = getBest(
          item.plantID,
          item.plantId,
          item.id,
          item.plant_id
        );

        if (id == null) return;

        newPlantMap[String(id)] = {
          name: String(getBest(item.plantName, item.name) || ""),
          district: String(getBest(item.district) || ""),
          kld: String(getBest(item.kld) || ""),
          zone: item.zones // ✅ IMPORTANT
        };
      });

      setPlantMaster(newPlantMap);

    } catch (err) {
      console.warn("Plant master fetch failed:", err);
      setNotice("Warning: could not fetch plant master.");
      setTimeout(() => setNotice(""), 4000);
    }
  };

  fetchPlantMaster();
}, []);

const zones = useMemo(() => {
  return [...new Set(plants.map(p => p.zones).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b));
}, [plants]);

// 2. Fetch Report Data (SERVICE LAYER BASED)
const fetchReport = useCallback(async () => {
  if (!selectedDate) {
    setNotice("Please select a report date.");
    setTimeout(() => setNotice(""), 4000);
    return;
  }

  setIsLoading(true);
  setNotice("Loading data...");
  setReportData([]);
  setReportDate("—");
  setFetchedAt("—");

  try {
    // ✅ service call instead of fetch(API_BASE...)
    let data = await getOperationsByDate(selectedDate);

    // Normalize to array (same logic preserved)
    if (!Array.isArray(data)) {
      data =
        data &&
        (data.operation ||
          data.plantId ||
          data.plantID ||
          typeof data === "object")
          ? [data]
          : [];
    }

    setReportData(data);
    setReportDate(isoDateToDisplay(selectedDate));

    setFetchedAt(
      new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    );

    setNotice(data.length > 0 ? "" : "No data available for the selected date.");
  } catch (err) {
    console.error("Report fetch failed:", err);
    setNotice("Error loading report data.");
  } finally {
    setIsLoading(false);
  }
}, [selectedDate]);

useEffect(() => {
  if (Object.keys(plantMaster).length > 0) {
    fetchReport();
  }
}, [plantMaster, fetchReport]);


    // --- Download Handlers ---
const getExportRows = () => {
  return processedData.map((r, i) => ({
    sid: `${i + 1}/${r.plantId}`,
    district: r.district || '-',
    plantName: r.plantName || '-',
    kld: r.kld || '-',
    beforeSTL: formatNumberNice(r.beforeSTL),
    received: formatNumberNice(r.sludgeReceived),
    processed: formatNumberNice(r.sludgeProcessed),
    afterSTL: formatNumberNice(r.afterSTL),
    runHrs: r.plantRunHrs || '0',
    biochar: formatNumberNice(r.biocharProduced),
    power: formatNumberNice(r.power),
    dg: formatNumberNice(r.dgHours),
    remarks: r.remarks || '-'
  }));
};



const downloadExcel = async () => {
  if (!processedData.length) return alert("No data");

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Daily Report");


  /* =====================================================
     HEADER (LOGOS + TEXT)
  ===================================================== */
  const companyLogoBase64 = await imageToBase64(companyLogo);
  const logoBase64 = await imageToBase64(logo);

  const companyLogoId = workbook.addImage({
    base64: companyLogoBase64,
    extension: "png",
  });

  const logoId = workbook.addImage({
    base64: logoBase64,
    extension: "png",
  });

  sheet.addImage(companyLogoId, {
    tl: { col: 0, row: 0 },
    ext: { width: 90, height: 55 },
  });

  sheet.addImage(logoId, {
    tl: { col: 4, row: 0 },
    ext: { width: 180, height: 60 },
  });

  // sheet.mergeCells("H1:K2");
  // // sheet.getCell("H1").value = "DAILY PLANT OPERATIONS REPORT";
  // sheet.getCell("H1").font = { bold: true, size: 12, color: { argb: "FF000000" } };
  // sheet.getCell("H1").alignment = { horizontal: "right", vertical: "middle" };

  sheet.mergeCells("H3:K3");

  sheet.getCell("H3").alignment = { horizontal: "right" };

 while (sheet.rowCount < 4) {
  sheet.addRow([]);
}


/* =====================================================
   REPORT TITLE (BELOW LOGO, ABOVE TABLE)
===================================================== */

// Ensure rows exist
while (sheet.rowCount < 6) {
  sheet.addRow([]);
}

// Merge A6 → L6 (S.No to Remarks = 12 columns)
sheet.mergeCells("A6:L6");

const titleCell = sheet.getCell("A6");
titleCell.value = `FSTP Daily Operation Report - ${reportDate}`;

titleCell.font = {
  name: "Times New Roman",
  bold: true,
  size: 14,
  color: { argb: "FF000000" },
};
;

titleCell.alignment = {
  horizontal: "center",
  vertical: "middle",
};

// Optional background (remove if not needed)
titleCell.fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFFFFF" }, // light blue
};

sheet.getRow(6).height = 28;


  /* =====================================================
     TABLE HEADER (MATCH HTML / PDF)
  ===================================================== */
const headerRow = sheet.addRow([
  "S.No",
  "ID / KLD",
  "District",
  "Plant name",
  "Opening\nSTL (L)",
  "Sludge\nReceived (L)",
  "Sludge\nProcessed (L)",
  "Closing\nSTL (L)",
  "Plant run\nhrs",
  "Biochar\nquantity (kgs)",
  "Power\n(Kwh)",
  "Remarks",
]);


  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FF000000" } };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFFFF" }, // white
    };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });


  
  /* =====================================================
     DATA ROWS
  ===================================================== */
  processedData.forEach((r, i) => {
    const row = sheet.addRow([
      i + 1,
      `${r.plantId || r.numericPlantId || "-"}${r.kld ? " / " + r.kld : ""}`,
      r.district || "-",
      r.plantName || "-",
      toNumber(r.beforeSTL),
      toNumber(r.sludgeReceived),
      toNumber(r.sludgeProcessed),
      toNumber(r.afterSTL),
      toNumber(r.plantRunHrs),
      toNumber(r.biocharProduced),
      toNumber(r.power),
      r.remarks || "-",
    ]);

    row.eachCell(cell => {
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };

      if (typeof cell.value === "number") {
        cell.numFmt = "#,##,##0";
      }
    });
  });

  /* =====================================================
     TOTAL ROW (WHITE + BOLD)
  ===================================================== */
  const totalRow = sheet.addRow([
    "TOTAL", "", "", "",
    totals.totalBefore,
    totals.totalReceived,
    totals.totalProcessed,
    totals.totalAfter,
    totals.totalRunHrs,
    totals.totalBiochar,
    "-",
    "-",
  ]);

  totalRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FF000000" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFFFF" },
    };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });

  sheet.mergeCells(
    totalRow.number,
    1,
    totalRow.number,
    4
  );

  /* =====================================================
     COLUMN WIDTH + FREEZE HEADER
  ===================================================== */
  sheet.columns = [
    { width: 6 },
    { width: 12 },
    { width: 14 },
    { width: 18 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 16 },
    { width: 12 },
    { width: 20 },
  ];

  sheet.views = [{ state: "frozen", ySplit: headerRow.number }];

  /* =====================================================
     DOWNLOAD
  ===================================================== */
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Daily_Report_${selectedDate}.xlsx`);
};


const imageToBase64 = async (image) => {
  const res = await fetch(image);
  const blob = await res.blob();

  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

const imageToBase64Compressed = (image, quality = 0.6, maxWidth = 800) => {
  return new Promise(async (resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;

    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 🔥 JPEG compression
      const base64 = canvas.toDataURL("image/jpeg", quality);
      resolve(base64);
    };
  });
};

// const drawFirstPageHeader = (
//   doc,
//   companyLogoBase64,
//   logoBase64,
//   reportDate,
//   fetchedAt
// ) => {
//   const pageWidth = doc.internal.pageSize.getWidth();

//   /* ===== LEFT: COMPANY LOGO ===== */
// doc.addImage(companyLogoBase64, "JPEG", 15, 6, 20, 15);


//   /* ===== CENTER: MAIN LOGO ===== */
//   const centerLogoWidth = 90;
//   const centerLogoHeight = 26;

//   doc.addImage(
//     logoBase64,
//      "JPEG",
//     pageWidth / 2 - centerLogoWidth / 2,
//     6,
//     centerLogoWidth,
//     centerLogoHeight
//   );

//   /* ===== RIGHT: TEXT ===== */
//   doc.setFont("times", "bold");
//   doc.setFontSize(11);
//   doc.setTextColor(0);
//   doc.text(
//     "DAILY PLANT OPERATIONS REPORT",
//     pageWidth - 10,
//     14,
//     { align: "right" }
//   );

//   doc.setFont("times", "normal");
//   doc.setFontSize(8);
//   doc.text(`Report Date: ${reportDate}`, pageWidth - 10, 19, { align: "right" });
//   doc.text(`Generated: ${fetchedAt}`, pageWidth - 10, 24, { align: "right" });

//   /* ===== SEPARATOR ===== */
//   doc.setLineWidth(0.4);
//   doc.line(10, 32, pageWidth - 10, 32);
// };

const downloadPdf = async () => {
  if (!processedData.length) return alert("No data");

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true, // ✅ IMPORTANT
  });

  /* =====================================================
     CONSTANTS (DEFINE FIRST!)
  ===================================================== */
  const SIDE_MARGIN = 42;
  const pageWidth = doc.internal.pageSize.getWidth();

  const tableStartX = SIDE_MARGIN;
  const tableEndX = pageWidth - SIDE_MARGIN;
  const tableCenterX = (tableStartX + tableEndX) / 2;

  /* =====================================================
     LOAD LOGOS (CACHED)
  ===================================================== */
  if (!cachedCompanyLogo) {
    cachedCompanyLogo = await imageToBase64Compressed(companyLogo, 0.5, 600);
  }
  if (!cachedMainLogo) {
    cachedMainLogo = await imageToBase64Compressed(logo, 0.5, 800);
  }

  const companyLogoBase64 = cachedCompanyLogo;
  const logoBase64 = cachedMainLogo;

  /* =====================================================
     HEADER – LOGOS + TEXT (ALIGNED TO TABLE)
  ===================================================== */

  // Company logo → table start
  doc.addImage(
    companyLogoBase64,
    "JPEG",
    tableStartX,
    6,
    14,
    10
  );

  // Title
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(179, 24, 24);
  doc.text("MVR TECHNOLOGY", tableCenterX, 10, { align: "center" });

  // Address
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.text(
    "#207, Gowra Fountainhead, Madhapur, Hitech City, Hyderabad-500081",
    tableCenterX,
    14,
    { align: "center" }
  );

  // Email
  doc.text(
    "email: mvrhydoffice@mvrtech.org",
    tableCenterX,
    17,
    { align: "center" }
  );

  // Subtitle
  doc.setFont("times", "bold");
  doc.text("FSTP RAJASTHAN", tableCenterX, 21, { align: "center" });

    doc.text(`FSTP Daily Operation Report -  ${reportDate}`, tableCenterX, 24, { align: "center" });
  
    // Report Date → table end
  // doc.setFont("times", "normal");
  // doc.setFontSize(8);
  // doc.text(
  //   `Report Date: ${reportDate}`,
  //   tableEndX,
  //   14,
  //   { align: "right" }
  // );

  /* =====================================================
     TABLE
  ===================================================== */
  autoTable(doc, {
      startY: 26,
  theme: "grid",

  margin: {
    left: SIDE_MARGIN,
    right: SIDE_MARGIN,
    top: 8,
    bottom: 8,
  },

  tableWidth: "auto",

  styles: {
    font: "times",
    fontSize: 5,
    cellPadding: 0.25,
    halign: "center",
    valign: "middle",

    lineWidth: 0.2,          // 🔥 THICK INNER GRID
    lineColor: [0, 0, 0],    // solid black
    textColor: [0, 0, 0],
  },

  headStyles: {
    fontStyle: "bold",
    lineWidth: 0.2,          // 🔥 EXTRA THICK HEADER
    fillColor: [255, 255, 255],
    textColor: [0, 0, 0],
  },

  bodyStyles: {
    lineWidth: 0.2,          // 🔥 BODY GRID
  },

  footStyles: {
    fontStyle: "bold",
    lineWidth: 0.2,          // 🔥 EXTRA THICK FOOTER
    fillColor: [255, 255, 255],
    textColor: [0, 0, 0],
  },

columnStyles: {
  11: {
    halign: "center",   // ✅ center text horizontally
    valign: "middle",  // ✅ center vertically
  },
},

    head: [[
      "S.No",
      "ID / KLD",
      "District",
      "Plant name",
      "Opening\nSTL (L)",
      "Sludge\nReceived (L)",
      "Sludge\nProcessed (L)",
      "Closing\nSTL (L)",
      "Plant run\nhrs",
      "Biochar\nquantity (kgs)",
      "Power\n(Kwh)",
      "Remarks",
    ]],

    body: processedData.map((r, i) => [
      i + 1,
      `${r.plantId || r.numericPlantId || "-"}${r.kld ? " / " + r.kld : ""}`,
      r.district || "-",
      r.plantName || "-",
      formatNumberNice(r.beforeSTL),
      formatNumberNice(r.sludgeReceived),
      formatNumberNice(r.sludgeProcessed),
      formatNumberNice(r.afterSTL),
      r.plantRunHrs ?? "-",
      formatNumberNice(r.biocharProduced),
      formatNumberNice(r.power),
      r.remarks || "-",
    ]),

    foot: [[
      "TOTAL", "", "", "",
      formatNumberNice(totals.totalBefore),
      formatNumberNice(totals.totalReceived),
      formatNumberNice(totals.totalProcessed),
      formatNumberNice(totals.totalAfter),
      formatNumberNice(totals.totalRunHrs),
      formatNumberNice(totals.totalBiochar),
      "-",
      "-",
    ]],
  });

  /* =====================================================
     SAVE
  ===================================================== */
  doc.save(`FSTP Daily Operating Report-${formattedDate}.pdf`);
};




    const tableHeader = (
      <thead>
            <tr>
                <th className="px-1 py-1 text-[12px] font-semibold text-center border border-black border-b-2">S.No</th>
               <th className="px-1 py-1 text-[12px] font-semibold text-center border border-black border-b-2">

  ID / KLD
</th>

                <th className="px-1 py-1 text-[12px] font-semibold text-center border border-black border-b-2">
District</th>
                 <th className="px-1 py-1 text-[12px] font-semibold text-center border border-black border-b-2">
Plant name</th>
               
                <th className="px-1 py-1 text-[12px] font-semibold text-center border border-black border-b-2">
Opening<br /> STL(L)</th>
                <th className="px-1 py-1 text-[12px] font-semibold text-center border border-black border-b-2">
Sludge<br />Received (L)</th>
                <th className="px-1 py-1 text-[12px] font-semibold text-center border border-black border-b-2">
Sludge<br />Processsed (L)</th>
                 <th className="px-1 py-1 text-[12px] font-semibold text-center border border-black border-b-2">
Closing<br /> STL (L)</th>
               <th className="px-1 py-1 text-[12px] font-semibold text-center border border-black border-b-2">
Plant run<br />hrs</th>
                <th className="px-1 py-1 text-[12px] font-semibold text-center border border-black border-b-2">
Biochar<br />quantity (kgs)</th>
               <th className="px-1 py-1 text-[12px] font-semibold text-center border border-black border-b-2">
Power<br />(Kwh)</th>
               
                
                {/* MODIFIED CELL: The Remarks header now includes the title and dates */}
                <th className="px-1 py-1 text-[12px] font-semibold text-center align-middle border border-black border-b-2">
                   
                     Remarks
                </th>
            </tr>
           
        </thead>
    );

    const tableBody = processedData.length > 0 ? (
     <tbody>
            {processedData.map((r, i) => (
                <tr key={r.plantId + '-' + i}>
                  <td className="px-2 py-[5px] text-[12px] text-center border border-black text-gray-900">
{i + 1}</td>
                   <td className="px-1 py-1 text-[12px] text-center border border-black whitespace-nowrap">
  {(r.plantId || r.numericPlantId || "-")}
  {r.kld ? ` / ${r.kld}` : ""}
</td>

                   <td className="px-1 py-1 text-[12px] text-center border border-black whitespace-nowrap">{r.district || '-'}</td>
                    <td className="px-1 py-1 text-[12px] text-center border border-black whitespace-nowrap" title={r.plantName || '-'}>{r.plantName || '-'}</td>
                   
                    <td className="px-1 py-1 text-[12px] text-center border border-black whitespace-nowrap">{r.beforeSTL !== undefined && r.beforeSTL !== null ? formatNumberNice(r.beforeSTL) : '-'}</td>
                    <td className="px-1 py-1 text-[12px] text-center border border-black whitespace-nowrap">{r.sludgeReceived !== undefined && r.sludgeReceived !== null ? formatNumberNice(r.sludgeReceived) : '-'}</td>
                    <td className="px-1 py-1 text-[12px] text-center border border-black whitespace-nowrap">{r.sludgeProcessed !== undefined && r.sludgeProcessed !== null ? formatNumberNice(r.sludgeProcessed) : '-'}</td>
                    <td className="px-1 py-1 text-[12px] text-center border border-black whitespace-nowrap">{r.afterSTL !== undefined && r.afterSTL !== null ? formatNumberNice(r.afterSTL) : '-'}</td>
                    <td className="px-1 py-1 text-[12px] text-center border border-black whitespace-nowrap">{r.plantRunHrs !== undefined && r.plantRunHrs !== null ? r.plantRunHrs : '-'}</td>
                    <td className="px-1 py-1 text-[12px] text-center border border-black whitespace-nowrap">{r.biocharProduced !== undefined && r.biocharProduced !== null ? formatNumberNice(r.biocharProduced) : '-'}</td>
                    <td className="px-1 py-1 text-[12px] text-center border border-black whitespace-nowrap">{r.power !== undefined && r.power !== null ? formatNumberNice(r.power) : '-'}</td>
          
                    <td className="px-1 py-1 text-[12px] text-center border border-black whitespace-nowrap">{r.remarks || '-'}</td>
                </tr>
            ))}
        </tbody>
    ) : (
        <tbody>
            <tr><td colSpan="12" className="py-7 text-gray-500 text-center text-sm border border-black">No data loaded — choose a date and click Load</td></tr>
        </tbody>
    );

    const tableFooter = processedData.length > 0 && (
       <tfoot>
            <tr>
                <td colSpan="4" className="px-2 py-[6px] text-[14px] font-bold text-center border border-black">TOTAL</td>
                <td className="px-2 py-[6px] text-[13px] font-bold text-center border border-black">{formatNumberNice(totals.totalBefore)}</td>
                <td className="px-2 py-[6px] text-[13px] font-bold text-center border border-black">{formatNumberNice(totals.totalReceived)}</td>
                <td className="px-2 py-[6px] text-[13px] font-bold text-center border border-black">{formatNumberNice(totals.totalProcessed)}</td>
                <td className="px-2 py-[6px] text-[13px] font-bold text-center border border-black">{formatNumberNice(totals.totalAfter)}</td>
                <td className="px-2 py-[6px] text-[13px] font-bold text-center border border-black">{formatNumberNice(totals.totalRunHrs)}</td>
                <td className="px-2 py-[6px] text-[13px] font-bold text-center border border-black">{formatNumberNice(totals.totalBiochar)}</td>
                <td className="px-2 py-[6px] text-[13px] font-bold text-center border border-black">-</td>
                <td className="px-2 py-[6px] text-[13px] font-bold text-center border border-black">-</td>
              
            </tr>
        </tfoot>
    );


    return (
<div
  id="reportRoot"
  style={{ fontFamily: '"Times New Roman", Times, serif' }}
  className="bg-white print:flex print:items-center print:justify-center print:h-[100vh]"
>


            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-2">

                    {/* Left Block */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 text-center sm:text-left">

                        <img
                            id="logoImg"
                            className="w-20 sm:w-28 h-auto"
                            src="https://mvr-attendance.web.app/MVR_Company_Logo%20copy.png"
                            alt="MVR Logo"
                        />
                        <div className="text-center flex-1">
                            <h1 className="text-xl sm:text-3xl text-[#b31818] font-extrabold m-0">MVR TECHNOLOGY</h1>
                            <div className="text-xs mt-1">
                                <div>#207, Gowra Fountainhead, Madhapur, Hitech City, Hyderabad-500081</div>
                                <div className="font-semibold text-xs text-gray-900 mt-1">email: mvrhydoffice@mvrtech.org</div>
                                <div className="text-sm font-bold">FSTP RAJASTHAN</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Block */}
                    <div className="text-right text-sm">
                        {/* <div className="font-bold">DAILY PLANT OPERATIONS REPORT</div> */}
                        <div className="mt-2">
                            <div>
                                <span className="text-xs text-gray-500">Report Date:</span> <strong id="reportDate">{reportDate}</strong>
                            </div>
                            {/* <div className="mt-1">
                                <span className="text-xs text-gray-500">Generated:</span> <span id="fetchedAt">{fetchedAt}</span>
                            </div> */}
                        </div>
                    </div>
                </div>

                {/* Card and Controls */}
                <div className="bg-white p-3 shadow">
                   <div className="flex flex-wrap gap-2 mb-2 print:hidden no-print">
                        <select
  value={zoneFilter}
  onChange={(e) => setZoneFilter(e.target.value)}
  className="p-2 border border-gray-300 rounded-md"
>
  <option value="All">All Zones</option>
  {zones.map(z => (
    <option key={z} value={z}>
      Zone {z}
    </option>
  ))}
</select>
                        <input
                            id="dateInput"
                            type="date"
                            max={new Date().toISOString().split("T")[0]}  
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b31818]"
                        />
                        <button
                            id="loadBtn"
                            className="bg-[#b31818] text-white px-3 py-2 rounded-md cursor-pointer hover:bg-red-700 disabled:opacity-50"
                            onClick={fetchReport}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Loading...' : 'Load'}
                        </button>
                        <button
                            id="excelBtn"
                            className="bg-[#b31818] text-white px-3 py-2 rounded-md cursor-pointer hover:bg-red-700 disabled:opacity-50"
                            onClick={downloadExcel}
                            disabled={isLoading || processedData.length === 0}
                        >
                            Download Excel
                        </button>
                        <button
                            id="downloadPdfBtn"
                            className="bg-[#b31818] text-white px-3 py-2 rounded-md cursor-pointer hover:bg-red-700 disabled:opacity-50"
                            onClick={downloadPdf}
                            disabled={isLoading || processedData.length === 0}
                        >
                            Download PDF
                        </button>

                    </div>

                    {notice && (
                        <div id="notice" className="text-red-700 mb-2 text-sm">
                            {notice}
                        </div>
                    )}

                    {/* Table */}
 <div
  id="tableWrap"
  className="w-full overflow-x-auto print:overflow-visible print:w-[100%] print:max-h-none"
>


   <table
  id="opsTable"
className="min-w-[1200px] border-collapse table-fixed bg-white border-[1.5px] border-black text-[12px] leading-[1.35]"
>

                        {/* Adjusted widths based on visual inspection for A4 landscape fit */}
                        <colgroup>
                          <col style={{ width: "4%" }} />
                          <col style={{ width: "8%" }} />
                          <col style={{ width: "10%" }} />
                          <col style={{ width: "6.5%" }} />
                          <col style={{ width: "7%" }} />
                          <col style={{ width: "7%" }} />
                          <col style={{ width: "7%" }} />
                          <col style={{ width: "7%" }} />
                          <col style={{ width: "4%" }} />
                          <col style={{ width: "6.5%" }} />
                          <col style={{ width: "6%" }} />
                          <col style={{ width: "25.5%" }} />
                        </colgroup>

                            {tableHeader}
                            {tableBody}
                            {tableFooter}
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyReportPage;