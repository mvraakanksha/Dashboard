import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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

export default function PlantExcel(config){

const rows = config.plants.map((p,index)=>{

const row={
SNo:index+1,
PlantID:p.plantID,
PlantName:p.plantName,
KLD:p.kld ?? "-",
Zone:p.zones ?? "-"
};

/* plant */
if(config.modules.plant){
config.selPlantFields.forEach(f=>{
row[f]=formatValue(p[f]);
});
}

/* vehicle */
if(config.modules.vehicle){
config.selVehicleFields.forEach(f=>{
row[f]=(config.vehiclesMap[p.plantID]||[])
.map(v=>formatValue(v[f]))
.join(", ");
});
}

/* employee */
if(config.modules.employee){
config.selEmployeeFields.forEach(f=>{
row[f]=(config.employeesMap[p.plantID]||[])
.map(e=>formatValue(e[f]))
.join(", ");
});
}

return row;
});

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb,ws,"PlantReport");

const buf = XLSX.write(wb,{bookType:"xlsx",type:"array"});
saveAs(new Blob([buf]),"PlantReport.xlsx");
}