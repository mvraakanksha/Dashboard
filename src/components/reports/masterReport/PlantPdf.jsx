import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import companyLogo from "../../reports/company_logo1.jpg";

/* helpers */
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

export default function PlantPdf(config) {
  const doc = new jsPDF("l", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  /* ===== LOGO ===== */
  doc.addImage(companyLogo, "JPEG", 10, 8, 28, 14);

  /* ===== HEADER ===== */
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(200, 0, 0);
  doc.text("MVR TECHNOLOGY", pageWidth / 2, 14, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("FSTP RAJASTHAN", pageWidth / 2, 20, { align: "center" });

  /* ===== COLUMN LABELS ===== */
  const plantLabels = config.selPlantFields.map((f) => {
    const field = config.plantFieldDefs?.find((x) => x.id === f);
    return field ? field.label : f;
  });

  const vehicleLabels = config.selVehicleFields.map((f) => {
    const field = config.vehicleFieldDefs?.find((x) => x.id === f);
    return field ? field.label : f;
  });

  const employeeLabels = config.selEmployeeFields.map((f) => {
    const field = config.employeeFieldDefs?.find((x) => x.id === f);
    return field ? field.label : f;
  });

  const head = [[
    "S.No",
    "Plant ID",
    "Plant Name",
    "KLD",
    ...(config.modules.plant ? plantLabels : []),
    ...(config.modules.vehicle ? vehicleLabels : []),
    ...(config.modules.employee ? employeeLabels : []),
  ]];

  /* ===== BODY ===== */
  const body = [];

  config.plants.forEach((p, index) => {
    const employees = config.modules.employee
      ? (config.employeesMap[p.plantID] || [])
      : [];

    const vehicles = config.modules.vehicle
      ? (config.vehiclesMap[p.plantID] || [])
      : [];

    const totalRows = Math.max(employees.length, vehicles.length, 1);

    const plantSideCells = [
      { content: String(index + 1), rowSpan: totalRows, styles: { valign: "middle" } },
      { content: String(p.plantID ?? "-"), rowSpan: totalRows, styles: { valign: "middle" } },
      { content: String(p.plantName ?? "-"), rowSpan: totalRows, styles: { valign: "middle" } },
      { content: String(p.kld ?? "-"), rowSpan: totalRows, styles: { valign: "middle" } },
    ];

    if (config.modules.plant) {
      config.selPlantFields.forEach((f) => {
        plantSideCells.push({
          content: formatValue(p[f]),
          rowSpan: totalRows,
          styles: { valign: "middle" },
        });
      });
    }

    for (let r = 0; r < totalRows; r++) {
      const row = [];

      if (r === 0) {
        row.push(...plantSideCells);
      }

      if (config.modules.vehicle) {
        const vehicle = vehicles[r];
        if (vehicle) {
          config.selVehicleFields.forEach((f) => {
            row.push(formatValue(vehicle[f]));
          });
        } else {
          config.selVehicleFields.forEach(() => row.push("-"));
        }
      }

      if (config.modules.employee) {
        const emp = employees[r];
        if (emp) {
          config.selEmployeeFields.forEach((f) => {
            row.push(formatValue(emp[f]));
          });
        } else {
          config.selEmployeeFields.forEach(() => row.push("-"));
        }
      }

      body.push(row);
    }
  });

  /* ===== PDF TABLE ===== */
  autoTable(doc, {
    head,
    body,
    startY: 26,
    theme: "grid",
    styles: {
      font: "times",
      fontSize: 7,
      halign: "center",
      valign: "middle",
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor:[1, 59, 136],
      textColor: 255,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
    },
    bodyStyles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      valign: "middle",
    },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.4,
  });

  doc.save("PlantReport.pdf");
}