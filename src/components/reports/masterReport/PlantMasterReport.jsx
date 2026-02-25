import { useState } from "react";
import PlantSelection from "./PlantSelection";

export default function PlantMasterReport(){

const [config,setConfig]=useState(null);

return(
<div className="max-w-[95%] mx-auto py-8 bg-slate-50 min-h-screen">
  <PlantSelection
    config={config}
    onGenerate={setConfig}
  />
</div>
);
}