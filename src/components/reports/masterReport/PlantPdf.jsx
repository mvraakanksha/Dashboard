import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* helpers */
const formatValue = v=>{
if(v===true) return "YES";
if(v===false) return "NO";
if(!v) return "-";

if(typeof v==="string" && v.includes("-")){
try{
return new Date(v).toLocaleDateString("en-GB");
}catch{}
}
return v;
};



export default function PlantPdf(config){

const doc = new jsPDF("l","mm","a4");

/* ===== HEADER ===== */
const head = [
[
"S.No",
"Plant ID",
"Plant Name",
"KLD",
"Zone",

...(config.modules.plant ? config.selPlantFields : []),
...(config.modules.vehicle ? config.selVehicleFields : []),
...(config.modules.employee ? config.selEmployeeFields : [])
]
];

/* ===== BODY ===== */
const body = config.plants.map((p,index)=>{

const row = [
index+1,
p.plantID,
p.plantName,
p.kld ?? "-",
p.zones ?? "-"
];

/* plant */
if(config.modules.plant){
config.selPlantFields.forEach(f=>{
row.push(formatValue(p[f]));
});
}

/* vehicle */
if(config.modules.vehicle){
config.selVehicleFields.forEach(f=>{
const vals=(config.vehiclesMap[p.plantID]||[])
.map(v=>formatValue(v[f]))
.join(", ");
row.push(vals||"-");
});
}

/* employee */
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
startY:20
});

doc.save("PlantReport.pdf");
}