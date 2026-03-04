import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import companyLogo from "../../reports/company_logo1.jpg";

/* helpers */
const formatValue = (v) => {
  if (v === true) return "YES";
  if (v === false) return "NO";
  if (!v) return "-";

  // convert only real ISO dates like 2025-02-28
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
export default function PlantPdf(config) {

  const doc = new jsPDF("l","mm","a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  /* ===== LOGO (TOP LEFT) ===== */
  doc.addImage(companyLogo, "JPEG", 10, 8, 28, 14);

  /* ===== COMPANY HEADER ===== */
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(200, 0, 0);
  doc.text("MVR TECHNOLOGY", pageWidth / 2, 14, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("FSTP RAJASTHAN", pageWidth / 2, 20, { align: "center" });

  /* ===== TABLE HEADER ===== */
  
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

const head = [[
  "S.No",
  "Plant ID",
  "Plant Name",
  "KLD",
  "Zone",

  ...(config.modules.plant ? plantLabels : []),
  ...(config.modules.vehicle ? vehicleLabels : []),
  ...(config.modules.employee ? employeeLabels : [])
]];

  /* ===== TABLE BODY ===== */
  const body = config.plants.map((p,index)=>{

    const row = [
      index+1,
      p.plantID,
      p.plantName,
      p.kld ?? "-",
      p.zones ?? "-"
    ];

    if(config.modules.plant){
      config.selPlantFields.forEach(f=>{
        row.push(formatValue(p[f]));
      });
    }

    if(config.modules.vehicle){
      config.selVehicleFields.forEach(f=>{
        const vals=(config.vehiclesMap[p.plantID]||[])
        .map(v=>formatValue(v[f]))
        .join(", ");
        row.push(vals||"-");
      });
    }

    if(config.modules.employee){
      config.selEmployeeFields.forEach(f=>{
        const vals=(config.employeesMap[p.plantID]||[])
        .map(e=>formatValue(e[f]))
        .join(", ");
        row.push(vals||"-");
      });
    }

    return row;
  });

  /* ===== TABLE ===== */
  autoTable(doc,{
    head,
    body,
    styles:{fontSize:7},
    headStyles:{fillColor:[30,41,59]},
    startY:26   // small spacing below header
  });

  doc.save("PlantReport.pdf");
}