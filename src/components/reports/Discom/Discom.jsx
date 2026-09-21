import { useEffect, useState, useMemo } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getAllPlants } from "../../../services/plantService";
import companyLogo from '../company_logo1.jpg';
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
export default function Discom() {
  const [plants, setPlants] = useState([]);

const [selectedDiscom, setSelectedDiscom] = useState([]);
const [selectedHeadquarter, setSelectedHeadquarter] = useState([]);
const [showDiscom, setShowDiscom] = useState(true);   // default visible
const [showHeadquarter, setShowHeadquarter] = useState(false);
const [selectedZone, setSelectedZone] = useState("all");
const [selectedPhase, setSelectedPhase] = useState("All");
  const [showPermanentPower, setShowPermanentPower] = useState(false); // ✅ ADDED
const DISCOM_OPTIONS = ["Jaipur", "Jodhpur", "Ajmer"];
const useGroupedDiscom = selectedDiscom.length > 0;
  /* ===== FETCH PLANTS ===== */
  useEffect(() => {
    getAllPlants()
      .then(setPlants)
      .catch(console.error);
  }, []);

  /* ===== UNIQUE DISCOM LIST ===== */
  const discomList = useMemo(() => {
    const unique = [...new Set(plants.map(p => p.discomName).filter(Boolean))];
    return unique.sort();
  }, [plants]);

  const headquarterList = useMemo(() => {
  const unique = [...new Set(plants.map(p => p.headquarterName).filter(Boolean))];
  return unique.sort();
}, [plants]);

const toggleDiscom = (d) => {
  setSelectedDiscom(prev =>
    prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
  );
};

const toggleHQ = (hq) => {
  setSelectedHeadquarter(prev =>
    prev.includes(hq) ? prev.filter(x => x !== hq) : [...prev, hq]
  );
};
  /* ===== UNIQUE ZONE LIST ===== */
  const zoneList = useMemo(() => {
    const unique = [...new Set(plants.map(p => p.zones).filter(Boolean))];
    return unique.sort((a, b) => a - b);
  }, [plants]);

  /* ===== UNIQUE PHASE LIST ===== */
  const phaseList = useMemo(() => {

  const unique = [
    ...new Set(
      plants
        .map((p) => p.plantPhase)
        .filter((p) => p !== null && p !== undefined)
    ),
  ];

  return unique.sort((a, b) => Number(a) - Number(b));

}, [plants]);
  /* ===== FILTER LOGIC ===== */
const filteredPlants = useMemo(() => {

  return plants.filter((p) => {

    const discomMatch =
      selectedDiscom.length === 0 ||
      selectedDiscom.includes(p.discomName);

    const hqMatch =
      selectedHeadquarter.length === 0 ||
      selectedHeadquarter.includes(p.headquarterName);

    const zoneMatch =
      selectedZone === "all" ||
      String(p.zones) === String(selectedZone);

    const phaseMatch =
      selectedPhase === "All" ||
      String(p.plantPhase) === String(selectedPhase);

    return (
      discomMatch &&
      hqMatch &&
      zoneMatch &&
      phaseMatch
    );

  });

}, [
  plants,
  selectedDiscom,
  selectedHeadquarter,
  selectedZone,
  selectedPhase
]);

const matchingPlants = filteredPlants.length;

const groupedPlants = useMemo(() => {
  const groups = {};

  filteredPlants.forEach((p) => {
    const key = p.discomName || "Unknown";

    if (!groups[key]) groups[key] = [];

    groups[key].push(p);
  });

  return groups;
}, [filteredPlants]);

  const formatDate = (dateString) => {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (isNaN(date)) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};


  /* ===== DOWNLOAD PDF ===== */
  const downloadTablePdf = async () => {
    const doc = new jsPDF("portrait", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

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

    const logo = await loadAndCompressImage(companyLogo);

    doc.addImage(
      logo.base64,
      "JPEG",
      8,
      6,
      logo.width / 10,
      logo.height / 8
    );

    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(200, 0, 0);
    doc.text("MVR TECHNOLOGY", pageWidth / 2, 14, { align: "center" });

    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("FSTP RAJASTHAN", pageWidth / 2, 21, { align: "center" });

 /* ===== REPORT TITLE ===== */

doc.setFont("times", "normal");
doc.setFontSize(11);
doc.setTextColor(70);

doc.text(
  "Discom Details Report",
  pageWidth / 2,
  27,
  { align: "center" }
);

/* ===== FILTERS ===== */

doc.setFont("times", "bold");
doc.setFontSize(10);
doc.setTextColor(40);

doc.text(
  `Zone : ${selectedZone}  |  Phase : ${selectedPhase}`,
  pageWidth / 2,
  33,
  { align: "center" }
);

/* ===== DIVIDER ===== */

doc.setDrawColor(180);
doc.line(6, 37, pageWidth - 6, 37);

    /* ===== DYNAMIC TABLE HEAD ===== */
    const tableHead = [
      "S.No",
      "Plant ID",
      "Plant Name",
      "KLD",
      "District",
      "Zone",
     
    ];
if (showHeadquarter) tableHead.push("Headquarter");

    if (showDiscom) tableHead.push("Discom");

    if (showPermanentPower) {
    tableHead.push("Permanent Power\nCompletion Date");
    }

    /* ===== DYNAMIC TABLE BODY ===== */
const tableBody = [];

if (!useGroupedDiscom) {

  filteredPlants.forEach((p, i) => {

    const row = [
      i + 1,
      p.plantID || "-",
      p.plantName || "-",
      p.kld || "-",
      p.district || "-",
      p.zones || "-"
    ];

    if (showHeadquarter) row.push(p.headquarterName || "-");

    if (showDiscom) row.push(p.discomName || "-");

    if (showPermanentPower)
      row.push(formatDate(p.permanentPowerDateOfCompletion));

    tableBody.push(row);

  });

} else {

  Object.entries(groupedPlants).forEach(([discom, plants]) => {

    plants.forEach((p, index) => {

      const row = [
        tableBody.length + 1,
        p.plantID || "-",
        p.plantName || "-",
        p.kld || "-",
        p.district || "-",
        p.zones || "-"
      ];

      if (showHeadquarter) row.push(p.headquarterName || "-");

      if (showDiscom) {
        if (index === 0) {
          row.push({
            content: discom,
            rowSpan: plants.length,
            styles: { halign: "center", valign: "middle", fontStyle: "bold" }
          });
        } else {
          row.push("");
        }
      }

      if (showPermanentPower)
        row.push(formatDate(p.permanentPowerDateOfCompletion));

      tableBody.push(row);

    });

  });

}

    autoTable(doc, {
      startY: 41,
      margin: { left: 10, right: 10 },
      pageBreak: "auto",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: "linebreak",
        halign: "center",
        valign: "middle"
      },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: 20,
        fontStyle: "bold"
      },
      head: [tableHead],
      body: tableBody
    });

    doc.save("Discom_Report.pdf");
  };

const imageToBase64 = async (imagePath) => {
  const response = await fetch(imagePath);
  const blob = await response.blob();

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

const downloadTableExcel = async () => {

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("Discom Report");

/* =====================================================
LOGO
===================================================== */

const logoBase64 = await imageToBase64(companyLogo);

const logoId = workbook.addImage({
  base64: logoBase64,
  extension: "png",
});

sheet.addImage(logoId, {
  tl: { col: 0, row: 0 },
  ext: { width: 100, height: 55 },
});

/* =====================================================
COMPANY HEADER
===================================================== */

sheet.mergeCells("A1:G1");
const companyCell = sheet.getCell("A1");
companyCell.value = "MVR TECHNOLOGY";
companyCell.font = {
  name: "Times New Roman",
  size: 22,
  bold: true,
  color: { argb: "FFC80000" }
};
companyCell.alignment = { horizontal: "center", vertical: "middle" };

sheet.mergeCells("A2:G2");
const subCell = sheet.getCell("A2");
subCell.value = "FSTP RAJASTHAN";
subCell.font = {
  name: "Times New Roman",
  size: 12,
  bold: true
};
subCell.alignment = { horizontal: "center", vertical: "middle" };

sheet.mergeCells("A3:G3");
const titleCell = sheet.getCell("A3");
titleCell.value = "Discom Details Report";
sheet.mergeCells("A4:G4");

const filterCell = sheet.getCell("A4");

filterCell.value =
  `Zone : ${selectedZone}    |    Phase : ${selectedPhase}`;

filterCell.font = {
  name: "Times New Roman",
  bold: true,
  size: 11
};

filterCell.alignment = {
  horizontal: "center",
  vertical: "middle"
};
titleCell.font = {
  name: "Times New Roman",
  size: 11,
  bold: true
};
titleCell.alignment = { horizontal: "center", vertical: "middle" };

/* =====================================================
TABLE HEADER
===================================================== */

const startRow = 6;

const headers = [
  "S.No",
  "Plant ID",
  "Plant Name",
  "KLD",
  "District",
  "Zone"
];

if (showHeadquarter) headers.push("Headquarter");
if (showDiscom) headers.push("Discom");
if (showPermanentPower) headers.push("Permanent Power Completion Date");

const headerRow = sheet.getRow(startRow);

headers.forEach((h, i) => {

  const cell = headerRow.getCell(i + 1);

  cell.value = h;

  cell.font = {
    name: "Times New Roman",
    bold: true,
    size: 11
  };

  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD3EAC8" }
  };

  cell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };

});

/* =====================================================
DATA ROWS
===================================================== */

let serial = 1;

if (!useGroupedDiscom) {

  filteredPlants.forEach((p) => {

    const row = [
      serial++,
      p.plantID || "-",
      p.plantName || "-",
      p.kld || "-",
      p.district || "-",
      p.zones || "-"
    ];

    if (showHeadquarter) row.push(p.headquarterName || "-");
    if (showDiscom) row.push(p.discomName || "-");
    if (showPermanentPower)
      row.push(formatDate(p.permanentPowerDateOfCompletion));

    sheet.addRow(row);

  });

}

/* ===== GROUPED DISCOM ===== */

else {

  Object.entries(groupedPlants).forEach(([discom, plants]) => {

    const startPlantRow = sheet.rowCount + 1;

    plants.forEach((p, index) => {

      const row = [
        serial++,
        p.plantID || "-",
        p.plantName || "-",
        p.kld || "-",
        p.district || "-",
        p.zones || "-"
      ];

      if (showHeadquarter) row.push(p.headquarterName || "-");

      if (showDiscom) row.push(index === 0 ? discom : "");

      if (showPermanentPower)
        row.push(formatDate(p.permanentPowerDateOfCompletion));

      sheet.addRow(row);

    });

    const endPlantRow = sheet.rowCount;

    if (showDiscom && plants.length > 1) {

      const discomColumn = headers.indexOf("Discom") + 1;

      sheet.mergeCells(
        startPlantRow,
        discomColumn,
        endPlantRow,
        discomColumn
      );

    }

  });

}

/* =====================================================
BORDERS + ALIGNMENT
===================================================== */

sheet.eachRow((row, rowNumber) => {

  row.eachCell((cell) => {

    if (rowNumber > 3) {
      cell.font = {
        name: "Times New Roman",
        size: 10
      };
    }

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

});

/* =====================================================
COLUMN WIDTH
===================================================== */

sheet.columns.forEach(col => col.width = 20);

sheet.views = [{ state: "frozen", ySplit: startRow }];

/* =====================================================
DOWNLOAD
===================================================== */

const buffer = await workbook.xlsx.writeBuffer();

saveAs(
  new Blob([buffer]),
  "Discom_Report.xlsx"
);

};

  return (
    <div className="p-6 space-y-4">

      {/* FILTER SECTION */}
     <div className="flex flex-wrap items-center justify-between gap-4">

        <div className="flex flex-wrap items-center gap-4">

      {/* HEADQUARTER */}
       <div className="flex items-center gap-2">
       <input
         type="checkbox"
          id="headquarter"
           checked={showHeadquarter}
           onChange={(e) => setShowHeadquarter(e.target.checked)}
           className="h-4 w-4"
        />
       <label htmlFor="headquarter" className="text-sm font-semibold">
         Headquarter
         </label>
      </div>


  {/* DISCOM */}
    <div className="flex items-center gap-2">
       <input
        type="checkbox"
        id="discom"
        checked={showDiscom}
        onChange={(e) => setShowDiscom(e.target.checked)}
        className="h-4 w-4"
       />
     <label htmlFor="discom" className="text-sm font-semibold">
       Discom
     </label>
    </div>
     {showDiscom && (
     <div className="flex items-center gap-4 ml-4">
       {DISCOM_OPTIONS.map((d) => (
        <label key={d} className="flex items-center gap-1 text-sm">
        <input
          type="checkbox"
          checked={selectedDiscom.includes(d)}
          onChange={() => toggleDiscom(d)}
        />
        {d}
        </label>
       ))}
      </div>
     )}

          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold">Zone:</label>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm bg-gray-50"
            >
              <option value="all">All</option>
              {zoneList.map((z) => (
                <option key={z} value={z}>Zone {z}</option>
              ))}
            </select>
          </div>

<div className="flex items-center gap-2">
  <label className="text-sm font-semibold">
    Phase:
  </label>

  <select
    value={selectedPhase}
    onChange={(e) => setSelectedPhase(e.target.value)}
    className="border rounded-md px-3 py-1.5 text-sm bg-gray-50"
  >
    <option value="All">
      All Phases
    </option>

    {phaseList.map((phase) => (
      <option
        key={phase}
        value={String(phase)}
      >
        Phase {phase}
      </option>
    ))}
  </select>
</div>


          {/* ✅ PERMANENT POWER CHECKBOX ADDED */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="permanentPower"
              checked={showPermanentPower}
              onChange={(e) => setShowPermanentPower(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="permanentPower" className="text-sm font-semibold">
              Permanent Power Completion Dates
            </label>
          </div>

         <div className="text-sm text-gray-600 font-medium">
  Matching Plants:
  <span className="ml-2 font-bold text-blue-700">
    {matchingPlants}
  </span>
</div>

        </div>
 <div className="ml-auto flex gap-2">
        <button
          onClick={downloadTablePdf}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-semibold"
        
        >
          Download Pdf
        </button>
        <button
        onClick={downloadTableExcel}
        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold"
        >
         Download Excel
        </button>
      </div>
</div>
      {/* TABLE */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-100 text-xs font-bold sticky top-0 z-10">
            <tr>
              <th className="border p-2">S.NO</th>
              <th className="border p-2">Plant ID</th>
              <th className="border p-2">Plant Name</th>
              <th className="border p-2 text-center">KLD</th>
              <th className="border p-2">District</th>
              <th className="border p-2">Zone</th>
              {showHeadquarter && (
            <th className="border p-2 text-center">Headquarter</th>
            )}
            {showDiscom && (
            <th className="border p-2 text-center">Discom</th>
              )}

              {showPermanentPower && (
                <th className="border p-2 text-center">
                  Permanent Power Completion Date
                </th>
              )}
            </tr>
          </thead>

<tbody>

{/* ===== NORMAL TABLE (NO GROUPING) ===== */}
{!useGroupedDiscom &&
  filteredPlants.map((p, i) => (
    <tr key={p.plantID || i} className="even:bg-gray-50 hover:bg-gray-100">
      <td className="border p-2 text-center">{i + 1}</td>
      <td className="border p-2 text-center font-mono">{p.plantID}</td>
      <td className="border p-2 text-center font-semibold">{p.plantName}</td>
      <td className="border p-2 text-center">{p.kld}</td>
      <td className="border p-2 text-center">{p.district}</td>
      <td className="border p-2 text-center">{p.zones}</td>

      {showHeadquarter && (
        <td className="border p-2 text-center">{p.headquarterName || "-"}</td>
      )}

      {showDiscom && (
        <td className="border p-2 text-center font-semibold">
          {p.discomName || "-"}
        </td>
      )}

      {showPermanentPower && (
        <td className="border p-2 text-center">
          {formatDate(p.permanentPowerDateOfCompletion)}
        </td>
      )}
    </tr>
  ))}

{/* ===== GROUPED TABLE ===== */}
{useGroupedDiscom &&
  Object.entries(groupedPlants).map(([discom, plants]) =>
    plants.map((p, index) => (
      <tr key={p.plantID}>
        <td className="border p-2 text-center">{index + 1}</td>
        <td className="border p-2 text-center font-mono">{p.plantID}</td>
        <td className="border p-2 text-center font-semibold">{p.plantName}</td>
        <td className="border p-2 text-center">{p.kld}</td>
        <td className="border p-2 text-center">{p.district}</td>
        <td className="border p-2 text-center">{p.zones}</td>

        {showHeadquarter && (
          <td className="border p-2 text-center">{p.headquarterName || "-"}</td>
        )}

        {showDiscom && index === 0 && (
          <td
            rowSpan={plants.length}
            className="border p-2 text-center font-bold align-middle"
          >
            {discom}
          </td>
        )}

        {showPermanentPower && (
          <td className="border p-2 text-center">
            {formatDate(p.permanentPowerDateOfCompletion)}
          </td>
        )}
      </tr>
    ))
  )}

</tbody>
        </table>
      </div>
    </div>
  );
}
