import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import companyLogo from "../../reports/company_logo1.jpg";

const formatValue = (v) => {
  if (v === true) return "YES";
  if (v === false) return "NO";
  if (!v) return "-";

  if (typeof v === "string") {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}/;
    if (isoDateRegex.test(v)) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toLocaleDateString("en-GB");
    }
  }

  return v;
};
let cachedLeftLogo = null;

const imageToBase64 = async (imageUrl) => {
  const res = await fetch(imageUrl);
  const blob = await res.blob();

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

export default async function PlantExcel(config) {

  const workbook = new ExcelJS.Workbook();



  const baseColumns = ["S.No", "Plant ID", "Plant Name", "KLD", "Zone"];

  /* ===== FIELD LABELS ===== */

  const plantLabels = config.selPlantFields.map(f => {
    const field = config.plantFieldDefs?.find(x => x.id === f);
    return field ? field.label : f;
  });

  const vehicleLabels = config.selVehicleFields.map(f => {
    const field = config.vehicleFieldDefs?.find(x => x.id === f);
    return field ? field.label : f;
  });

  const employeeLabels = config.selEmployeeFields.map(f => {
    const field = config.employeeFieldDefs?.find(x => x.id === f);
    return field ? field.label : f;
  });

  const createSheetHeader = async (sheet, title) => {

  if (!cachedLeftLogo) {
    cachedLeftLogo = await imageToBase64(companyLogo);
  }

  const logoId = workbook.addImage({
    base64: cachedLeftLogo,
    extension: "png"
  });

  sheet.addImage(logoId, {
    tl: { col: 0, row: 0 },
    ext: { width: 90, height: 55 }
  });



/* MAIN TITLE */
sheet.getCell("A1").value = "MVR TECHNOLOGY";
sheet.getCell("A1").font = {
  name: "Times New Roman",
  bold: true,
  size: 18,
  color: { argb: "FFB31818" }
};
sheet.getCell("A1").alignment = {
  horizontal: "center",
  vertical: "middle"
};

/* SUB TITLE */
sheet.getCell("A2").value = "FSTP RAJASTHAN";
sheet.getCell("A2").font = {
  name: "Times New Roman",
  bold: true,
  size: 12
};
sheet.getCell("A2").alignment = {
  horizontal: "center",
  vertical: "middle"
};

/* SHEET TITLE */
sheet.getCell("A3").value = title;
sheet.getCell("A3").font = {
  name: "Times New Roman",
  bold: true,
  size: 12
};
sheet.getCell("A3").alignment = {
  horizontal: "center",
  vertical: "middle"
};

sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
sheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };
sheet.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

};

  /* =====================================================
     PLANT SHEET
  ===================================================== */

if (config.modules.plant) {

  const plantSheet = workbook.addWorksheet("Plant");

  await createSheetHeader(plantSheet,"Plant Details");

  const plantLabels = config.selPlantFields.map(f=>{
    const field = config.plantFieldDefs.find(x=>x.id===f);
    return field ? field.label : f;
  });

  const columns = [...baseColumns,...plantLabels];

  plantSheet.addRow([]);
  plantSheet.addRow(columns);

  
  config.plants.forEach((p,i)=>{

    const row = [
      i+1,
      p.plantID,
      p.plantName,
      p.kld ?? "-",
      p.zones ?? "-"
    ];

    config.selPlantFields.forEach(f=>{
      row.push(formatValue(p[f]));
    });

    plantSheet.addRow(row);

  });

}

  /* =====================================================
     VEHICLE SHEET
  ===================================================== */
if (config.modules.vehicle) {

  const vehicleSheet = workbook.addWorksheet("Vehicle");

  await createSheetHeader(vehicleSheet,"Vehicle Details");

  const vehicleLabels = config.selVehicleFields.map(f=>{
    const field = config.vehicleFieldDefs.find(x=>x.id===f);
    return field ? field.label : f;
  });

  vehicleSheet.addRow([]);
  vehicleSheet.addRow([...baseColumns,...vehicleLabels]);

  let rowNo = 1;

let rowPtr = 6; // because header rows used
let serial = 1;

config.plants.forEach(p => {

  const vehicles = config.vehiclesMap[p.plantID] || [];

  if (!vehicles.length) return;

  const startRow = rowPtr;

  vehicles.forEach(v => {

const row = [
  serial++,   // increments per vehicle
  p.plantID,
  p.plantName,
  p.kld ?? "-",
  p.zones ?? "-"
];
    config.selVehicleFields.forEach(f=>{
      row.push(formatValue(v[f]));
    });

    vehicleSheet.addRow(row);
    rowPtr++;

  });

  const endRow = rowPtr - 1;

  if (endRow > startRow) {

vehicleSheet.mergeCells(`B${startRow}:B${endRow}`);
vehicleSheet.mergeCells(`C${startRow}:C${endRow}`);
vehicleSheet.mergeCells(`D${startRow}:D${endRow}`);
vehicleSheet.mergeCells(`E${startRow}:E${endRow}`);
  }

});
}

  /* =====================================================
     EMPLOYEE SHEET
  ===================================================== */

if (config.modules.employee) {

  const employeeSheet = workbook.addWorksheet("Employee");

  await createSheetHeader(employeeSheet,"Employee Details");

  const employeeLabels = config.selEmployeeFields.map(f=>{
    const field = config.employeeFieldDefs.find(x=>x.id===f);
    return field ? field.label : f;
  });

  employeeSheet.addRow([]);
  employeeSheet.addRow([...baseColumns,...employeeLabels]);

  let rowNo = 1;

let rowPtr = 6;
let serial = 1;

config.plants.forEach(p => {

  const employees = config.employeesMap[p.plantID] || [];

  if (!employees.length) return;

  const startRow = rowPtr;

  employees.forEach(e => {

    const row = [
      serial++,
      p.plantID,
      p.plantName,
      p.kld ?? "-",
      p.zones ?? "-"
    ];

    config.selEmployeeFields.forEach(f=>{
      row.push(formatValue(e[f]));
    });

    employeeSheet.addRow(row);
    rowPtr++;

  });

  const endRow = rowPtr - 1;

  if (endRow > startRow) {

    employeeSheet.mergeCells(`B${startRow}:B${endRow}`);
    employeeSheet.mergeCells(`C${startRow}:C${endRow}`);
    employeeSheet.mergeCells(`D${startRow}:D${endRow}`);
    employeeSheet.mergeCells(`E${startRow}:E${endRow}`);

  }

});

}

workbook.worksheets.forEach(sheet => {

  const headerRow = sheet.getRow(5);
  const totalCols = headerRow.cellCount;

  if (totalCols > 0) {

    const lastColLetter = sheet.getColumn(totalCols).letter;

    sheet.mergeCells(`A1:${lastColLetter}1`);
    sheet.mergeCells(`A2:${lastColLetter}2`);
    sheet.mergeCells(`A3:${lastColLetter}3`);

  }

});

workbook.worksheets.forEach(sheet => {

  sheet.eachRow((row, rowNumber) => {

    row.eachCell(cell => {

      /* KEEP EXISTING FONT STYLE */
      cell.font = {
        ...cell.font,
        name: "Times New Roman",
        bold: rowNumber === 5 ? true : cell.font?.bold
      };

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

      /* HEADER STYLE */
      if (rowNumber === 5) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD9EAF7" }
        };
      }

    });

  });

  /* AUTO COLUMN WIDTH */
  sheet.columns.forEach(column => {

    let maxLength = 10;

    column.eachCell({ includeEmpty: true }, cell => {
      const value = cell.value ? cell.value.toString() : "";
      maxLength = Math.max(maxLength, value.length);
    });

    column.width = maxLength + 2;

  });

});

  /* =====================================================
     AUTO COLUMN WIDTH
  ===================================================== */



const buffer = await workbook.xlsx.writeBuffer();

saveAs(
  new Blob([buffer],{
    type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  }),
  "PlantReport.xlsx"
);
}