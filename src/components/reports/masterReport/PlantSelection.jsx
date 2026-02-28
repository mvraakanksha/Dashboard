import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Truck, Users, CheckSquare, Square, Filter, Factory } from "lucide-react";
import { getAllPlants } from "../../../services/plantService";
import { getVehiclesByPlant } from "../../../services/vehicleService";
import { getEmployeesByPlant } from "../../../services/employeeService";
import PlantPdf from "./PlantPdf";
import PlantExcel from "./PlantExcel";

const PLANT_GROUPS = [
{
id:"plant",
title:"Plant Info",
fields:[
{ id:"stateCode", label:"State" },
{ id:"district", label:"District" },
{ id:"waterType", label:"Water Type" },
{ id:"headquarterName", label:"Headquarter" },
{ id:"wardNo", label:"Ward No" },
{ id:"pinCode", label:"PinCode" },
{ id:"mnit", label:"MNIT Status" },
{ id:"mnitDateOfCompletion", label:"MNIT Completed" },
{ id:"noOfVehicle", label:"No Of Vehicles" },
{ id:"noOfEmployees", label:"No Of Employees" }

]
},

{
id:"power",
title:"Power Info",
fields:[
{ id:"discomName", label:"DISCOM" },
{ id:"permanentPower", label:"Permanent Power" },

{ id:"permanentPowerDateOfCompletion", label:"Power Completed" },
{ id:"ppMeterSerialNo", label:"Power Meter Serial No" },
{ id:"category", label:"Meter Category" },
{ id:"sanctionLoad", label:"Sanction Load" },
{ id:"multiplicationFactor", label:"MF" }
]
},

{
id:"solar",
title:"Solar Info",
fields:[
{ id:"solar", label:"Solar Status" },
{ id:"solarDateOfCompletion", label:"Solar Completed" },

{ id:"solarMultiplicationFactor", label:"Solar MF" },
{ id:"solarMeterSerialNo", label:"Solar Meter Serial No" },
{ id:"solarPlantCapacity", label:"Solar Capacity" },
{ id:"isSolarFencingDone", label:"Solar Fencing Status" },
{ id:"solarFencingDoneDate", label:"Solar Fencing Date" }
]
},

{
id:"internet",
title:"Internet",
fields:[
{ id:"internet", label:"Internet Status" },
{ id:"internetDateOfCompletion", label:"Internet Completed" },
{ id:"tabs", label:"Tabs Available" },
{ id:"tabsReceivedDate", label:"Tabs Received Date" },
{ id:"ipPhoneDate", label:"Ip Phone Received Date" },
{ id:"cameraConfigurationDate", label:"Camera Configuration Date" },
]
},

{
id:"infra",
title:"Infra & Compliance",
fields:[
{ id:"codAndBodSenserDate", label:"COD/BOD Sensor Date" },
{ id:"isGuardRoomPrepared", label:"GuardRoom Status" },
{ id:"guardRoomPreparedDate", label:"GuardRoom Prepared Date" },

{ id:"isSludgeScreenInstall", label:"Sludge Screen Install" },

{ id:"constructionStartedDate", label:"Construction Start Date" },

{ id:"civilWorkCompletedDate", label:"Civil Work Completed Date" },

{ id:"machinaryAssembleDate", label:"Machinery Assembled Date" },
{ id:"ctoCertified", label:"CTO Status" },
{ id:"ctoIssuedDate", label:"CTO Issued Date" },
{ id:"cteCertified", label:"CTE Status" },
{ id:"cteIssuedDate", label:"CTE Issued Date" }

]
},


];



const VEHICLE_FIELDS = [
  { id:"vehicleModelName", label:"Model Name" },
  { id:"vehicleNumber", label:"Vehicle Number" },
  { id:"vehicleChassisNo", label:"Chassis No" },

  { id:"dateOfRegistration", label:"Registration Date" },
  { id:"insuranceDate", label:"Insurance Date" },
  { id:"insuranceExpiryDate", label:"Insurance Expiry" },

  { id:"gpsStatus", label:"GPS Status" },
  { id:"gpsInstallationDate", label:"GPS Installed Date" },

  { id:"vehicleEngineNumber", label:"Engine Number" },

  { id:"vehicleBatteryMake", label:"Battery Make" },
  { id:"vehicleBatteryNumber", label:"Battery Number" },
  { id:"vehicleBatteryPurchaseDate", label:"Battery Purchase" },
  { id:"vehicleBatteryExpiryDate", label:"Battery Expiry" }
];

const DESIGNATIONS = [
"Supervisor",
"Operator",
"Driver",
"Helper",
"Security Guard"
];

const EMPLOYEE_FIELDS = [
{ id:"employeeId", label:"Employee ID" },
{ id:"employeeName", label:"Name" },
{ id:"mobileNo", label:"Mobile" },
{ id:"alternateMobNo", label:"Alternate Mobile" },
{ id:"address", label:"Address" },
{ id:"dateOfBirth", label:"DOB" },
{id:"designation", label:"Designation"},
{ id:"dateOfJoining", label:"Joining Date" },
{ id:"licenceType", label:"Licence Type", driverOnly:true },
{ id:"licenceNumber", label:"Licence Number", driverOnly:true },
{ id:"licenceIssueDate", label:"Licence Issued Date", driverOnly:true },
{ id:"licenceExpiryDate", label:"Licence Expiry", driverOnly:true }
];

/* FIELD SELECTOR */
const FieldSelector = ({ title, icon: Icon, fields, selected, onToggle }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
    <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
      <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Icon size={20}/></div>
      <h3 className="font-bold text-slate-800 text-sm uppercase">{title}</h3>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {fields.map(f=>(
        <button key={f.id}
          onClick={()=>onToggle(f.id)}
          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition
          ${selected.includes(f.id)
            ?"bg-blue-600 text-white border-blue-600 shadow-sm"
            :"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
          {f.label}
          {selected.includes(f.id)?<CheckSquare size={14}/>:<Square size={14} className="opacity-40"/>}
        </button>
      ))}
    </div>
  </div>
);


export default function PlantSelection({onGenerate,config}){

const [plants,setPlants]=useState([]);
const [selectedPlants,setSelectedPlants]=useState([]);
const [zoneFilter,setZoneFilter]=useState("All");

const [modules,setModules]=useState({plant:true,vehicle:false,employee:false});
const [enabledGroups,setEnabledGroups] = useState({plant:true});
const [selPlantFields,setSelPlantFields]=useState(["stateCode","district"]);
const [selVehicleFields,setSelVehicleFields]=useState(["vehicleNumber"]);
const [selEmployeeFields,setSelEmployeeFields]=useState(["employeeName"]);
const [selectedRoles,setSelectedRoles] = useState([]);
const [vehiclesMap,setVehiclesMap]=useState({});
const [employeesMap,setEmployeesMap]=useState({});



useEffect(()=>{
getAllPlants().then(res=>{
const data=Array.isArray(res)?res:[];
setPlants(data);
setSelectedPlants(data.map(p=>p.plantID));
});
},[]);

const zones = useMemo(()=>{
  return [...new Set(plants.map(p=>p.zones).filter(Boolean))]
    .sort((a,b)=>Number(a)-Number(b));
},[plants]);

const toggle=(list,setList,id)=>setList(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

/* ===== VISIBLE PLANTS (zone filtered) ===== */
const visiblePlants = useMemo(()=>{
return plants.filter(
p => zoneFilter === "All" || String(p.zones) === zoneFilter
);
},[plants,zoneFilter]);

/* ===== SELECT ALL LOGIC ===== */
const allSelected =
visiblePlants.length > 0 &&
visiblePlants.every(p => selectedPlants.includes(p.plantID));

const toggleAll = () => {
if(allSelected){
setSelectedPlants(prev =>
prev.filter(id => !visiblePlants.some(p => p.plantID === id))
);
}else{
setSelectedPlants(prev => [
...new Set([...prev, ...visiblePlants.map(p=>p.plantID)])
]);
}
};

/* FETCH VEHICLES */
useEffect(()=>{
if(!modules.vehicle) return;
(async()=>{
const map={};
for(const id of selectedPlants) map[id]=await getVehiclesByPlant(id);
setVehiclesMap(map);
})();
},[modules.vehicle,selectedPlants]);

/* FETCH EMP */
useEffect(()=>{
if(!modules.employee) return;
(async()=>{
const map={};
for(const id of selectedPlants) map[id]=await getEmployeesByPlant(id);
setEmployeesMap(map);
})();
},[modules.employee,selectedPlants]);

const toggleGroup = (id)=>{
setEnabledGroups(prev=>{
const next = !prev[id];

if(!next){
const group = PLANT_GROUPS.find(g=>g.id===id);
setSelPlantFields(p=>p.filter(f=>!group.fields.some(x=>x.id===f)));
}

return {...prev,[id]:next};
});
};
const formatDate = (v) => {
  if (!v) return "-";

  try {
    const d = new Date(v);

    if (isNaN(d)) return v;

    const day = String(d.getDate()).padStart(2,"0");
    const month = String(d.getMonth()+1).padStart(2,"0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return v;
  }
};

const ALL_PLANT_FIELDS = PLANT_GROUPS.flatMap(g=>g.fields);

const formatValue = (v) => {
  if (v === true) return "YES";
  if (v === false) return "NO";

  // detect any date string (plant, vehicle, employee)
  if (typeof v === "string" && v.includes("-")) {
    return formatDate(v);
  }

  return v ?? "-";
};


const generate = () => {
  const filteredPlants = plants
    .filter(p => selectedPlants.includes(p.plantID))
    .filter(p => zoneFilter === "All" || String(p.zones) === zoneFilter);

  onGenerate({
    plants: filteredPlants,
    modules,
    selPlantFields,
    selVehicleFields,
    selEmployeeFields,
    selectedRoles,
    vehiclesMap,
    employeesMap
  });
};



return(
<div className={`max-w-7xl mx-auto p-6 md:p-10 bg-slate-50/50 min-h-screen }`}>
{/* HEADER */}
<div className="flex justify-between items-center">
<div>
<h1 className="text-4xl font-black text-slate-900">Plant Master Report</h1>

</div>

<button onClick={generate}
className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg">
<Download size={18}/>Generate Report
</button>
</div>

{/* MODULE SELECT */}
<div className="flex gap-3">
{[
{id:"plant",label:"Plant Data",icon:Factory},
{id:"vehicle",label:"Vehicle",icon:Truck},
{id:"employee",label:"Employee",icon:Users}
].map(m=>(
<button key={m.id}
onClick={()=>setModules(p=>({...p,[m.id]:!p[m.id]}))}
className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold border-2
${modules[m.id]?"bg-white border-indigo-600 text-indigo-600":"bg-slate-100 text-slate-400"}`}>
<m.icon size={18}/>{m.label}
</button>
))}
</div>

{/* FIELD SELECT */}
<div className="mt-5 grid lg:grid-cols-3 gap-6">

{/* PLANT CARD */}
{modules.plant && (
<div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">

<h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
<FileText size={18}/> Plant Details
</h3>

{/* GROUPS INSIDE */}
<div className="space-y-4">

{PLANT_GROUPS.map(group=>{

const open = enabledGroups[group.id];

return(
<div key={group.id} className="border border-slate-400 rounded-xl p-3">

{/* GROUP HEADER */}
<label className="flex items-center gap-2 font-semibold cursor-pointer">

<input
type="checkbox"
checked={!!open}
onChange={()=>toggleGroup(group.id)}
className="w-4 h-4"
/>

<span className="text-xs uppercase text-slate-600">
{group.title}
</span>

</label>

{/* FIELDS — only when enabled */}
{open && (
<div className="grid grid-cols-2 gap-2 mt-3">

{group.fields.map(f=>(
<button
key={f.id}
onClick={()=>toggle(selPlantFields,setSelPlantFields,f.id)}
className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border
${selPlantFields.includes(f.id)
?"bg-blue-600 text-white border-blue-600"
:"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
>
{f.label}

{selPlantFields.includes(f.id)
?<CheckSquare size={14}/>
:<Square size={14} className="opacity-40"/>}

</button>
))}

</div>
)}

</div>
);
})}

</div>
</div>
)}

{/* VEHICLE */}
{modules.vehicle &&
<FieldSelector
title="Vehicle"
icon={Truck}
fields={VEHICLE_FIELDS}
selected={selVehicleFields}
onToggle={id=>toggle(selVehicleFields,setSelVehicleFields,id)}
/>}

{/* EMPLOYEE */}
{modules.employee && (
<div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">

<h3 className="font-bold text-slate-800 mb-3">Designation Based</h3>

{/* ROLE CHECKBOXES */}
<div className="grid grid-cols-2 gap-2 mb-4">
{DESIGNATIONS.map(role=>(
<label key={role} className="flex items-center gap-2 text-sm">
<input
type="checkbox"
checked={selectedRoles.includes(role)}
onChange={()=>setSelectedRoles(p=>
p.includes(role)
? p.filter(x=>x!==role)
: [...p,role]
)}
className="w-4 h-4"
/>
{role}
</label>
))}
</div>

<FieldSelector
title="Employee Fields"
icon={Users}
fields={EMPLOYEE_FIELDS}
selected={selEmployeeFields}
onToggle={id=>toggle(selEmployeeFields,setSelEmployeeFields,id)}
/>

</div>
)}

</div>

{/* TABLE AREA */}
<div className="mt-5 bg-white rounded-3xl border shadow-xl overflow-hidden">

{/* FILTER BAR */}
<div className="p-6 border-b bg-slate-50 flex justify-between items-center">

  {/* LEFT TITLE */}
  <div className="flex items-center gap-2">
    <Filter size={18}/>
    {config ? "Generated Report • Live Preview" : "Filter Plants"}
  </div>

  {/* RIGHT ACTION */}
  {!config ? (
    <select
      value={zoneFilter}
      onChange={e=>setZoneFilter(e.target.value)}
      className="border px-4 py-2 rounded-xl"
    >
      <option value="All">All Zones</option>
      {zones.map(z=>(
        <option key={z} value={z}>Zone {z}</option>
      ))}
    </select>
  ) : (
<div className="flex items-center gap-3">

  {/* PDF */}
  <button
    onClick={()=>PlantPdf(config)}
    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md transition active:scale-95"
  >
    PDF
  </button>

  {/* EXCEL */}
  <button
    onClick={()=>PlantExcel(config)}
    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md transition active:scale-95"
  >
    Excel
  </button>

  {/* BACK */}
  <button
    onClick={()=>onGenerate(null)}
    className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold shadow-sm transition"
  >
    ← Back to Selection
  </button>

</div>
  )}

</div>

<div className="overflow-x-auto">

{/* ===== SELECTION TABLE ===== */}
{!config && (
<table className="w-full text-sm table-fixed border-collapse text-left">

<thead className="sticky top-0 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b">
<tr>

<th className="px-4 py-3 w-12 text-center">
<input
type="checkbox"
checked={allSelected}
onChange={toggleAll}
className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-900 cursor-pointer"
/>
</th>

<th className="px-4 py-3 w-16 text-center">S.No</th>

<th className="px-4 py-3 w-24 whitespace-nowrap">Plant ID</th>

<th className="px-4 py-3 min-w-[220px]">Plant Name</th>

<th className="px-4 py-3 w-20 text-center">KLD</th>

<th className="px-4 py-3 w-20 text-center">Zone</th>

</tr>
</thead>

<tbody className="divide-y divide-slate-100">
{visiblePlants.map((p,index)=>(
<tr key={p.plantID} className="hover:bg-blue-50/50 transition-colors group">

<td className="px-4 py-3 text-center">
<input
type="checkbox"
checked={selectedPlants.includes(p.plantID)}
onChange={()=>toggle(selectedPlants,setSelectedPlants,p.plantID)}
className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-900 cursor-pointer"
/>
</td>

<td className="px-4 py-3 text-center font-medium">
{index+1}
</td>

<td className="px-4 py-3 font-mono text-xs">
{p.plantID}
</td>

<td className="px-4 py-3 font-bold text-slate-700 group-hover:text-blue-700">
{p.plantName}
</td>

<td className="px-4 py-3 text-center">
{p.kld ?? "-"}
</td>

<td className="px-4 py-3 text-center">
{p.zones ?? "-"}
</td>

</tr>
))}
</tbody>
</table>
)}

{/* ===== GENERATED TABLE ===== */}
{/* ===== GENERATED TABLE ===== */}
{config && (
  <table className="w-full text-sm border-collapse text-left">
    <thead className="bg-slate-900 text-white sticky top-0 z-20">
      {/* Category Row (Optional but helpful for visual grouping) */}
      <tr className="text-[10px] uppercase tracking-widest bg-slate-950 divide-x divide-slate-800">
        <th colSpan={5} className="px-4 py-2 text-center text-slate-200">Basic Information</th>
        {config.modules.plant && <th colSpan={config.selPlantFields.length} className="px-4 py-2 text-center text-blue-400">Plant Metadata</th>}
        {config.modules.vehicle && <th colSpan={config.selVehicleFields.length} className="px-4 py-2 text-center text-indigo-400">Vehicle</th>}
        {config.modules.employee && <th colSpan={config.selEmployeeFields.length} className="px-4 py-2 text-center text-emerald-400">Employee</th>}
      </tr>
      
      {/* Field Row */}
      <tr className="divide-x divide-slate-700 border-t border-slate-800">
        <th className="px-3 py-4 text-center w-auto whitespace-nowrap">S.No</th>
        <th className="px-3 py-4 w-auto text-center  whitespace-nowrap">Plant ID</th>
        <th className="px-4 py-4 w-auto text-center ">Plant Name</th>
        <th className="px-3 py-4 text-center w-auto text-center ">KLD</th>
        <th className="px-3 py-4 text-center w-auto text-center ">Zone</th>

        {/* DYNAMIC PLANT */}
        {config.modules.plant && config.selPlantFields.map(f => (
          <th key={f} className="px-4 py-4 whitespace-nowrap font-semibold">
           {ALL_PLANT_FIELDS.find(x => x.id === f)?.label}
          </th>
        ))}

        {/* VEHICLE */}
        {config.modules.vehicle && config.selVehicleFields.map(f => (
          <th key={f} className="px-4 py-4 text-center  whitespace-nowrap font-semibold">
            {VEHICLE_FIELDS.find(x => x.id === f)?.label || f}
          </th>
        ))}

        {/* EMPLOYEE */}
        {config.modules.employee && config.selEmployeeFields.map(f => (
          <th key={f} className="px-4 py-4 text-center  whitespace-nowrap font-semibold">
            {EMPLOYEE_FIELDS.find(x => x.id === f)?.label || f}
          </th>
        ))}
      </tr>
    </thead>

    <tbody className="divide-y divide-slate-200">
      {config.plants.map((p, index) => (
        <tr key={p.plantID} className="hover:bg-slate-50 transition-colors divide-x divide-slate-100">
          {/* BASE DATA */}
          <td className="px-3 py-3 text-center text-slate-500 font-medium">{index + 1}</td>
          <td className="px-3 py-3 font-mono text-center  text-xs text-slate-600">{p.plantID}</td>
          <td className="px-4 py-3 font-bold text-center  text-slate-800">{p.plantName}</td>
          <td className="px-3 py-3 text-center text-center  font-semibold text-blue-600">{p.kld ?? "-"}</td>
          <td className="px-3 py-3 text-center text-center  italic text-slate-500">{p.zones ?? "-"}</td>

          {/* PLANT FIELDS */}
          {config.modules.plant && config.selPlantFields.map(f => (
            <td key={f} className="px-4 py-3 text-slate-600 whitespace-nowrap">
              {formatValue(p[f])}
            </td>
          ))}

          {/* VEHICLE - Rendered as clean tags/list */}
          {config.modules.vehicle && config.selVehicleFields.map(f => (
            <td key={f} className="px-4 py-3 min-w-[150px]">
              <div className="flex flex-col gap-1">
                {(config.vehiclesMap[p.plantID] || []).length > 0 ? (
                  (config.vehiclesMap[p.plantID] || []).map((v, i) => (
                    <span key={i} className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 w-fit">
                      {formatValue(v[f])}
                    </span>
                  ))
                ) : <span className="text-slate-300">-</span>}
              </div>
            </td>
          ))}

          {/* EMPLOYEE - Rendered with a small indicator */}
          {config.modules.employee && config.selEmployeeFields.map(f => (
            <td key={f} className="px-4 py-3 min-w-[150px]">
              <div className="flex flex-col gap-1">
                {(config.employeesMap[p.plantID] || []).length > 0 ? (
                 (config.employeesMap[p.plantID] || [])
                  .filter(e => config.selectedRoles?.length
                    ? config.selectedRoles.includes(e.designation)
                    : true
                  )
                  .map((e,i)=>(
                    <span key={i} className="text-xs text-slate-700 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-emerald-500" /> {formatValue(e[f])}
                    </span>
                  ))
                ) : <span className="text-slate-300">-</span>}
              </div>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
)}

</div>
</div>

</div>
);
}

