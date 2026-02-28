import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import companyLogo from "../../reports/company_logo1.jpg";

/* FIXED FORMATTER */
const formatValue = (v) => {
  if (v === true) return "YES";
  if (v === false) return "NO";
  if (!v) return "-";

  if (typeof v === "string") {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}/;
    if (isoDateRegex.test(v)) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-GB");
      }
    }
  }

  return v;
};

export default async function PlantExcel(config) {

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("PlantReport");

  /* ===== ADD LOGO ===== */
  const response = await fetch(companyLogo);
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();

  const imageId = workbook.addImage({
    buffer,
    extension: "jpeg",
  });

  worksheet.addImage(imageId, {
    tl: { col: 0, row: 0 },
    ext: { width: 120, height: 60 },
  });

  /* ===== COLUMN LIST ===== */
  const columns = [
    "S.No",
    "Plant ID",
    "Plant Name",
    "KLD",
    "Zone",
    ...(config.modules.plant ? config.selPlantFields : []),
    ...(config.modules.vehicle ? config.selVehicleFields : []),
    ...(config.modules.employee ? config.selEmployeeFields : []),
  ];

  const totalColumns = columns.length;

/* ===== HEADER ROWS ===== */

// Set row heights (important when logo exists)
worksheet.getRow(1).height = 25;
worksheet.getRow(2).height = 20;
worksheet.getRow(3).height = 20;

/* Row 1 */
worksheet.mergeCells(1, 1, 1, totalColumns);
const header1 = worksheet.getCell("A1");
header1.value = "MVR TECHNOLOGY";
header1.alignment = { horizontal: "center", vertical: "middle" };
header1.font = {
  name: "Times New Roman",
  size: 18,
  bold: true,
  color: { argb: "FFFF0000" } // Red
};

/* Row 2 */
worksheet.mergeCells(2, 1, 2, totalColumns);
const header2 = worksheet.getCell("A2");
header2.value = "FSTP RAJASTHAN";
header2.alignment = { horizontal: "center", vertical: "middle" };
header2.font = {
  name: "Times New Roman",
  size: 13,
  bold: true,
  color: { argb: "FF000000" } // Black
};

/* Row 3 */
worksheet.mergeCells(3, 1, 3, totalColumns);
const header3 = worksheet.getCell("A3");
header3.value = "Plant Report";
header3.alignment = { horizontal: "center", vertical: "middle" };
header3.font = {
  name: "Times New Roman",
  size: 13,
  bold: true,
  color: { argb: "FF000000" }
};

// /* Add empty spacing row */
worksheet.addRow([]);

  /* ===== TABLE HEADER ===== */
  const tableHeaderRow = worksheet.addRow(columns);

  tableHeaderRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  /* ===== TABLE BODY ===== */
  config.plants.forEach((p, index) => {
    const rowData = [
      index + 1,
      p.plantID,
      p.plantName,
      p.kld ?? "-",
      p.zones ?? "-",
    ];

    if (config.modules.plant) {
      config.selPlantFields.forEach((f) => {
        rowData.push(formatValue(p[f]));
      });
    }

    if (config.modules.vehicle) {
      config.selVehicleFields.forEach((f) => {
        const vals = (config.vehiclesMap[p.plantID] || [])
          .map((v) => formatValue(v[f]))
          .join(", ");
        rowData.push(vals || "-");
      });
    }

    if (config.modules.employee) {
      config.selEmployeeFields.forEach((f) => {
        const vals = (config.employeesMap[p.plantID] || [])
          .map((e) => formatValue(e[f]))
          .join(", ");
        rowData.push(vals || "-");
      });
    }

    const row = worksheet.addRow(rowData);

    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  /* ===== AUTO COLUMN WIDTH ===== */
  worksheet.columns.forEach((column) => {
    column.width = 18;
  });

  const bufferFile = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([bufferFile]), "PlantReport.xlsx");
}