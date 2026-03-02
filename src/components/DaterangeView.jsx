import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
    LabelList  
} from "recharts";
import {
  Truck,
  Layers,
  Zap,
  Droplets,
  Recycle,
  Box,
  Navigation,
  Milestone,
  Activity,
  Fuel
} from "lucide-react";
import companyLogo1  from './reports/company_logo1.jpg'
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'
import { useNavigate } from "react-router-dom";
import machineryImg from '../../src/assets/machinery.jpeg'
import machineryImgwithoutmotor from '../assets/machinery without motor.jpeg';

import { X } from "lucide-react";


import { getOperationsByDateRange } from "../services/operationService";
import { getAllPlants } from "../services/plantService";
import { getLabOperationsByDateRange } from "../services/operationService";
import { getVehiclesByPlant } from "../services/vehicleService";
import { getVehicleOperationsByDateRange } from "../services/vehicleService";



/* ================= CONFIG ================= */
const MODULES = {
  sludge: {
    title: "Sludge Performance",
    bars: [
      { key: "sludgeReceived", label: "Received", color: "#2563eb" },
      { key: "sludgeProcessed", label: "Processed", color: "#16a34a" }
    ],
    yAxis: "Sludge (L)"
  },

  biochar: {
    title: "Biochar Production",
    bars: [
      { key: "biochar", label: "Biochar Produced", color: "#7c3aed" }
    ],
    yAxis: "Biochar (Kg)"
  },

  power: {
    title: "Power & Run Hours",
    bars: [
      { key: "importPower", label: "Power Consumed", color: "#af0000" },
      { key: "solarPower", label: "Solar Generated", color: "#1b5e20" },
      { key: "runHours", label: "Run Hours", color: "#1e40af" }
    ],
    yAxis: "Power (Kwh)"
  },

  pellets: {
    title: "Pellets & Polymer Usage",
    bars: [
      { key: "pelletsUsed", label: "Pellets Used", color: "#ea580c" },
      { key: "polymerUsed", label: "Polymer Used", color: "#9333ea" }
    ],
    yAxis: "Quantity"
  },
  cumulative: {
    title: "Cumulative Flow",
    bars: [
      { key: "cumulativeFlow", label: "Cumulative Flow", color: "#2563EB" }
    ],
    yAxis: "Flow (L)"
  },
  vehicle: {
  title: "Vehicle Movement",
  bars: [
    { key: "totalDistance", label: "Total Distance (Km)", color: "#2563EB" }
  ],
  yAxis: "Distance (Km)"
}


};


const TODAY = new Date().toISOString().split("T")[0];



/* ================= BAR TOP VALUE ================= */
const BarValueLabel = ({ x, y, width, value, fill, dataKey }) => {
  if (value === null || value === undefined || value <= 0) return null;

  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fill={fill}
      fontSize={11}
      fontWeight={700}
    >
      {formatValue(value, dataKey)}
    </text>
  );
};


/* ================= NUMBER FORMATTER ================= */
const formatValue = (value, key) => {
  if (value === null || value === undefined || value <= 0) return "0";

  const oneDecimalKeys = ["biochar", "importPower", "solarPower",  "polymerUsed", "totalDistance"];

  const num = oneDecimalKeys.includes(key)
    ? Number(value).toFixed(1)
    : Math.round(Number(value)).toString();

  return Number(num).toLocaleString("en-IN");
};

const DateRangeTooltip = ({ active, payload, label, module }) => {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload?.[0]?.payload;
if (!row) return null;


  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-lg p-3 text-xs w-64">
      
      {/* PLANT HEADER */}
      <p className="font-bold text-blue-900">
        {label}
      </p>

      <p className="text-[11px] font-semibold text-slate-500 mb-2">
        Plant ID: {row.plantId} &nbsp;|&nbsp; {row.kld} KLD
      </p>

      {/* VALUES */}
      <div className="space-y-1">
        {payload.map(p => {
          if (!p || p.value <= 0) return null;

          const bar = MODULES[module].bars.find(b => b.key === p.dataKey);

          return (
            <div
              key={p.dataKey}
              className="flex justify-between items-center"
            >
              <span className="font-semibold text-slate-600">
                {bar?.label}
              </span>

              <span
                className="font-bold"
                style={{ color: p.fill }}
              >
                {formatValue(p.value, p.dataKey)}
              </span>
            </div>
          );
        })}
      </div>
      {/* 🚗 TOTAL TRIPS (VEHICLE MODULE ONLY) */}
{module === "vehicle" && typeof row.totalTrips === "number" && (
  <div className="flex justify-between items-center mt-1">
    <span className="font-semibold text-slate-600">
      Total Trips
    </span>
    <span className="font-bold text-slate-800">
      {row.totalTrips}
    </span>
  </div>
)}

      {/* 🚗 VEHICLE-WISE BREAKUP */}
{module === "vehicle" && row.vehicleDetails && (
  <div className="mt-2 border-t pt-2 space-y-2">

    <p className="text-[11px] font-bold text-slate-500">
      Vehicle wise Data
    </p>

    {Object.entries(row.vehicleDetails).map(
      ([vehicleId, v]) => (
        <div key={vehicleId} className="pl-2 text-[11px]">
          <p className="font-semibold text-slate-700">
            {vehicleId}
          </p>

          <div className="flex justify-between text-slate-600">
            <span>Distance</span>
            <span className="font-bold">
              {formatValue(v.distance, "totalDistance")} Km
            </span>
          </div>

          <div className="flex justify-between text-slate-600">
            <span>Trips</span>
            <span className="font-bold">
              {v.trips}
            </span>
          </div>
        </div>
      )
    )}
  </div>
)}

    </div>
  );
};



export default function DaterangeView() {
  const [module, setModule] = useState("sludge");
  const [fromDate, setFromDate] = useState(TODAY);
  const [toDate, setToDate] = useState(TODAY);
  const [zone, setZone] = useState("All");
const [previewImage, setPreviewImage] = useState(null);

  const [plants, setPlants] = useState([]);
  const [zones, setZones] = useState([]);
  const [operations, setOperations] = useState([]);
  const [labOperations, setLabOperations] = useState([]);
const [vehicleOps, setVehicleOps] = useState([]);
const [vehiclesByPlant, setVehiclesByPlant] = useState({});

  const [loading, setLoading] = useState(false);
const [sortBy, setSortBy] = useState("label"); // label | plantId | metric
const [showMachinery, setShowMachinery] = useState(false);

const [machineryType, setMachineryType] = useState("with"); 
// with | without

  /* ================= FETCH PLANTS ================= */
  useEffect(() => {
    getAllPlants().then((res) => {
      setPlants(res || []);
      const uniqueZones = [...new Set((res || []).map(p => p.zones))].sort();
      setZones(uniqueZones);
    });
  }, []);

  /* ================= FETCH OPERATIONS ================= */
 /* ================= FETCH OPERATIONS (NON-VEHICLE MODULES) ================= */
useEffect(() => {
  if (!fromDate || !toDate) return;

  if (["sludge", "biochar", "power", "pellets", "vehicle"].includes(module)) {
    setLoading(true);
    getOperationsByDateRange(fromDate, toDate, zone)
      .then(res => setOperations(res || []))
      .finally(() => setLoading(false));
  }
}, [fromDate, toDate, zone, module]);



useEffect(() => {
  if (module === "vehicle") {
    setSortBy("totalDistance");
  } else {
    setSortBy(MODULES[module].bars[0].key);
  }
}, [module]);

/* ================= FETCH LAB DATA (CUMULATIVE ONLY) ================= */
useEffect(() => {
  if (!fromDate || !toDate) return;

  if (module === "cumulative") {
    getLabOperationsByDateRange(fromDate, toDate)
      .then(res => setLabOperations(res || []))
      .catch(() => setLabOperations([]));
  }
}, [fromDate, toDate, module]);


/* ================= FETCH VEHICLE DATA (VEHICLE ONLY) ================= */
useEffect(() => {
  if (!fromDate || !toDate) return;

  if (module === "vehicle") {
    setLoading(true);

    getVehicleOperationsByDateRange(fromDate, toDate, zone) // ✅ pass zone
      .then(res => setVehicleOps(res || []))
      .finally(() => setLoading(false));
  }
}, [fromDate, toDate, zone, module]);

/* ================= FETCH VEHICLE MASTER (VEHICLE NUMBER) ================= */
/* ================= FETCH VEHICLE MASTER (VEHICLE NUMBER) ================= */
useEffect(() => {
  if (module !== "vehicle") return;
  if (!plants.length) return;

  const fetchVehicles = async () => {
    const map = {};

    await Promise.all(
      plants.map(async (p) => {
        try {
          const res = await getVehiclesByPlant(p.plantID);
          (res || []).forEach(v => {
            map[v.vehicleID] = v.vehicleNumber;
          });
        } catch (err) {
          // ignore error per plant
        }
      })
    );

    setVehiclesByPlant(map);
  };

  fetchVehicles();
}, [module, plants]);



const navigate = useNavigate();
/* ================= CLEAR UNUSED DATA ON MODULE CHANGE ================= */
useEffect(() => {
  if (module !== "cumulative") setLabOperations([]);
}, [module]);


const handlePlantClick = (plant) => {
  if (!plant) return;

  /* ---------- SLUDGE ---------- */
  if (module === "sludge") {
    if (sortBy === "sludgeReceived") {
      navigate(`/sludge-report-view/${plant.plantId}?mode=received`);
      return;
    }

    if (sortBy === "sludgeProcessed") {
      navigate(`/sludge-report-view/${plant.plantId}?mode=processed`);
      return;
    }
  }

  /* ---------- BIOCHAR ---------- */
  if (module === "biochar" && sortBy === "biochar") {
    navigate(`/sludge-report-view/${plant.plantId}?mode=biochar`);
    return;
  }

  /* ---------- POWER (single route for all sorts) ---------- */
  if (module === "power") {
    navigate(
      `/power-view/${plant.plantId}/${encodeURIComponent(plant.label)}`
    );
    return;
  }

  /* ---------- PELLETS / POLYMER ---------- */
  if (module === "pellets") {
    if (sortBy === "pelletsUsed") {
      navigate(
        `/pellets-view/${plant.plantId}/${encodeURIComponent(
          plant.label
        )}?type=pellets`
      );
      return;
    }

    if (sortBy === "polymerUsed") {
      navigate(
        `/pellets-view/${plant.plantId}/${encodeURIComponent(
          plant.label
        )}?type=polymer`
      );
      return;
    }
  }
  /* ---------- ✅ CUMULATIVE FLOW ---------- */
  if (module === "cumulative") {
    navigate(
      `/lab-operations/${plant.plantId}/${encodeURIComponent(
        plant.label
      )}?mode=flow`
    );
  }
  /* ---------- 🚗 VEHICLE ---------- */
if (module === "vehicle") {
  navigate(
    `/vehicle-view/${plant.plantId}/${encodeURIComponent(plant.label)}`
  );
}

};

const selectedMachineryImage =
  machineryType === "with"
    ? machineryImg
    : machineryImgwithoutmotor;

const handleDownloadMachineryImage = () => {
  const link = document.createElement("a");
 link.href = selectedMachineryImage;
  link.download = "machinery.png";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};



  /* ================= FILTER PLANTS BY ZONE ================= */
  const visiblePlants = useMemo(() => {
    if (zone === "All") return plants;
    return plants.filter(p => String(p.zones) === String(zone));
  }, [plants, zone]);

  /* ================= AGGREGATE OPERATIONS ================= */
  const aggregatedByPlant = useMemo(() => {
    const map = {};

    operations.forEach(({ plantId, operation }) => {
      if (!map[plantId]) {
        map[plantId] = {
          sludgeReceived: 0,
          sludgeProcessed: 0,
          biochar: 0,
          importPower: 0,
          solarPower: 0,
          runHours: 0,
          pelletsUsed: 0,
          polymerUsed: 0,
          cumulativeFlow: 0
        };
      }

      /* SLUDGE */
      map[plantId].sludgeReceived += Number(operation.sludgeReceived || 0);
      map[plantId].sludgeProcessed += Number(operation.sludgeProcessed || 0);
      map[plantId].biochar += Number(operation.biocharProduced || 0);

      /* POWER */
     const imp =
  operation.powerReadingAmImport != null &&
  operation.powerReadingPmImport != null
    ? Math.max(
        operation.powerReadingPmImport -
        operation.powerReadingAmImport,
        0
      )
    : 0;

const exp =
  operation.powerReadingAmExport != null &&
  operation.powerReadingPmExport != null
    ? Math.max(
        operation.powerReadingPmExport -
        operation.powerReadingAmExport,
        0
      )
    : 0;

map[plantId].importPower += Number(imp.toFixed(1));
map[plantId].solarPower += Number(exp.toFixed(1));

      map[plantId].runHours += Number(operation.plantRunningHrs || 0);

      /* PELLETS */
      map[plantId].pelletsUsed += Number(operation.pillets || 0);
      // polymerUsage comes in grams → convert to KG
      map[plantId].polymerUsed += Number(operation.polymerUsage || 0) / 1000;
    });
/* ✅ LAB CUMULATIVE FLOW */
/* ✅ LAB CUMULATIVE FLOW */
const daySet = new Set();

labOperations.forEach(({ plantId, labOperation }) => {
  if (!labOperation?.operationDate) return;

  daySet.add(labOperation.operationDate);

  if (!map[plantId]) {
    map[plantId] = {
      sludgeReceived: 0,
      sludgeProcessed: 0,
      biochar: 0,
      importPower: 0,
      solarPower: 0,
      runHours: 0,
      pelletsUsed: 0,
      polymerUsed: 0,
      cumulativeFlow: 0
    };
  }

  map[plantId].cumulativeFlow += Number(
    labOperation.cumulativeFlow || 0
  );
});

map.__dayCount = daySet.size || 1;


    return map;
  }, [operations, labOperations]);

  const vehicleAggregatedByPlant = useMemo(() => {
  const map = {};

  vehicleOps.forEach(v => {
    const plantId = v.plantId;
    const vehicleId = vehiclesByPlant[v.vehicle?.vehicleID] || v.vehicle?.vehicleID || "Unknown";

    const am = v.vehicleOp?.vehicleReadingAm;
    const pm = v.vehicleOp?.vehicleReadingPm;
    const trips = Number(v.vehicleOp?.noOfTrips || 0);

    if (!map[plantId]) {
      map[plantId] = {
        totalDistance: 0,
       totalTrips: 0,
        vehicles: {}   // 👈 per vehicle breakup
      };
    }

    if (!map[plantId].vehicles[vehicleId]) {
      map[plantId].vehicles[vehicleId] = {
        distance: 0,
        trips: 0
      };
    }

    if (am != null && pm != null && pm > am) {
      const dist = pm - am;
      map[plantId].vehicles[vehicleId].distance += dist;
      map[plantId].totalDistance += dist;
    }

    map[plantId].vehicles[vehicleId].trips += trips;
    map[plantId].totalTrips += trips;
  });
  return map;
}, [vehicleOps]);

const ownVehicleSludgeTotal = useMemo(() => {
  let total = 0;

  const visiblePlantIds = new Set(
    visiblePlants.map(p => p.plantID)
  );

  vehicleOps.forEach(v => {
    if (!visiblePlantIds.has(v.plantId)) return;

    total += Number(v.vehicleOp?.sludgeCollect || 0);
  });

  return total;
}, [vehicleOps, visiblePlants]);


const privateVehicleTotals = useMemo(() => {
  let totalPrivateTrips = 0;
  let totalPrivateSludge = 0;

  const visiblePlantIds = new Set(
    visiblePlants.map(p => p.plantID)
  );

  operations.forEach(({ plantId, operation }) => {
    if (!visiblePlantIds.has(plantId)) return;

    totalPrivateTrips += Number(
      operation?.noOfTripsPrivateVehicle || 0
    );

    totalPrivateSludge += Number(
      operation?.sludgeCollectPrivateVehicle || 0
    );
  });

  return { totalPrivateTrips, totalPrivateSludge };
}, [operations, visiblePlants]);


const isVehicleReady =
  module !== "vehicle" || vehicleOps.length > 0;

  /* ================= CHART DATA (ALL PLANTS) ================= */
const chartData = useMemo(() => {
  if (module === "vehicle" && !isVehicleReady) return [];

  const data = visiblePlants.map(p => ({
    label: p.plantName,
    plantId: p.plantID,
    kld: p.kld,
    ...(aggregatedByPlant[p.plantID] || {}),
    ...(module === "vehicle"
  ? {
      totalDistance:
        vehicleAggregatedByPlant[p.plantID]?.totalDistance ?? 0,
      vehicleDetails:
        vehicleAggregatedByPlant[p.plantID]?.vehicles ?? {},
      totalTrips:
        vehicleAggregatedByPlant[p.plantID]?.totalTrips ?? 0
    }
  : {})

  }));

  return [...data].sort((a, b) => {
    if (sortBy === "plantId") {
      return Number(a.plantId) - Number(b.plantId);
    }

    if (module === "vehicle") {
      return (b.totalDistance || 0) - (a.totalDistance || 0);
    }


    return Number(b[sortBy] || 0) - Number(a[sortBy] || 0);
  });
}, [
  visiblePlants,
  aggregatedByPlant,
  vehicleAggregatedByPlant,
  sortBy,
  module,
  isVehicleReady
]);



  /* ================= KPI DATA ================= */
 /* ================= kpi data ================= */
const totalPlants = visiblePlants.length;

const permanentPowerPlants = visiblePlants.filter(
  p => p.permanentPower
).length;

const moduleKpis = useMemo(() => {
  const totals = {
    sludgeReceived: 0,
    sludgeProcessed: 0,
    biochar: 0,
    importPower: 0,
    solarPower: 0,
    runHours: 0,
    pelletsUsed: 0,
    polymerUsed: 0,
    cumulativeFlow: 0,
  };

  visiblePlants.forEach(p => {
    const v = aggregatedByPlant[p.plantID];
    if (!v) return;
    Object.keys(totals).forEach(k => {
      totals[k] += Number(v[k] || 0);
    });
  });

  if (module === "sludge") {
    return [
      { label: "SLUDGE RECEIVED (L)", value: totals.sludgeReceived },
      { label: "SLUDGE PROCESSED (L)", value: totals.sludgeProcessed }
    ];
  }

  if (module === "biochar") {
    return [
      { label: "BIOCHAR PRODUCED (Kg)", value: totals.biochar }
    ];
  }

  if (module === "power") {
    return [
      { label: "POWER CONSUMED (Kwh)", value: totals.importPower },
      { label: "SOLAR GENERATED (Kwh)", value: totals.solarPower },
      { label: "RUN HOURS", value: totals.runHours }
    ];
  }
if (module === "cumulative") {
 const days = aggregatedByPlant.__dayCount || 1;


  return [
    {
      label: "TOTAL CUMULATIVE FLOW (L)",
      value: totals.cumulativeFlow
    }
    // {
    //   label: "AVG CUMULATIVE FLOW (L)",
    //   value: totals.cumulativeFlow / days
    // }
  ];
}

 if (module === "vehicle") {
  let totalVehicles = 0;
  let totalTrips = 0;
  let totalDistance = 0;

  visiblePlants.forEach(p => {
    totalVehicles += p.noOfVehicle || 0;

    const v = vehicleAggregatedByPlant[p.plantID];
    if (!v) return;

    totalTrips += v.totalTrips;
    totalDistance += v.totalDistance;
  });

  return [
    { label: "TOTAL VEHICLES", value: totalVehicles },

    {
      label: "OWN VEHICLE TRIPS",
      value: totalTrips,
      subValue: `Sludge collected : ${ownVehicleSludgeTotal.toLocaleString("en-IN")} L`
    },

    {
      label: "TOTAL DISTANCE (Km)",
      value: Math.round(totalDistance)
    },

    {
      label: "PRIVATE VEHICLE TRIPS",
      value: privateVehicleTotals.totalPrivateTrips,
      subValue: `Sludge collected : ${privateVehicleTotals.totalPrivateSludge.toLocaleString("en-IN")} L`
    }
  ];
}



  return [
    { label: "PELLETS USED (Kg)", value: totals.pelletsUsed },
    { label: "POLYMER USED (Kg)", value: totals.polymerUsed }
  ];



}, [aggregatedByPlant, vehicleAggregatedByPlant, visiblePlants, module]);


const isLoading = loading;


const handleDownloadMotorsPdf = async () => {
  const doc = new jsPDF("portrait", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  /* ===== LOAD LOGO ===== */
  const img = new Image();
  img.src = companyLogo1;

  await new Promise((resolve) => {
    img.onload = resolve;
  });

  doc.addImage(img, "JPEG", 10, 8, 25, 15);

  /* ===== HEADER ===== */

  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(200, 0, 0);
  doc.text("MVR TECHNOLOGY", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("FSTP RAJASTHAN", pageWidth / 2, 20, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text("Motors List", pageWidth / 2, 25, { align: "center" });

  doc.setDrawColor(220);
  doc.line(10, 28, pageWidth - 10, 28);

  /* ===== TABLE ===== */

  const tableColumn = ["Motor No", "Motor Name", "Make"];

  const tableRows = motors.map(m => [
    m.motorNumber,
    m.motorName,
    m.make
  ]);

  autoTable(doc, {
    startY: 32,
    head: [tableColumn],
    body: tableRows,
    styles: {
      fontSize: 9,
      halign: "left"   // ✅ left align all data
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      halign: "left"   // ✅ header also left aligned
    }
  });

  doc.save("Motors_List.pdf");
};





const motors = [
  { motorNumber: 1, motorName: "Submersible Sludge Motor", make: "Kirloskar" },
  { motorNumber: 2, motorName: "Submersible Treated Water Motor", make: "Kirloskar" },
  { motorNumber: 3, motorName: "Submersible Under Sump Motor", make: "Kirloskar" },
  { motorNumber: 4, motorName: "Filter Feed Pump Motor", make: "Kirloskar" },
  { motorNumber: 5, motorName: "Polymer Mixer Motor with Gear Box", make: "TGPL" },
  { motorNumber: 6, motorName: "Dewatering Mixer Motor with Gear Box", make: "TGPL" },
  { motorNumber: 7, motorName: "Dewatering Screwpress Motor with Gear Box-1", make: "TGPL" },
  { motorNumber: 8, motorName: "Dewatering Screwpress Motor with Gear Box-2 (35KLD)", make: "TGPL" },
  { motorNumber: 9, motorName: "Dewatering to Dryer Screw Conveyor Motor with Gear Box", make: "TGPL" },
  { motorNumber: 10, motorName: "Dryer Motor with Double Gear Box", make: "TGPL" },
  { motorNumber: 11, motorName: "Dryer to Pyrolyzer Screw Conveyor Motor with Gear Box", make: "TGPL" },
  { motorNumber: 12, motorName: "Ducting Motor - 1", make: "TGPL" },
  { motorNumber: 13, motorName: "Ducting Motor - 2", make: "TGPL" },
  { motorNumber: 14, motorName: "Pyrolyzer Motor 1", make: "TGPL" },
  { motorNumber: 15, motorName: "Pyrolyzer Motor 2", make: "TGPL" },
  { motorNumber: 16, motorName: "SRS Motor - 1", make: "TGPL" },
  { motorNumber: 17, motorName: "SRS Motor - 2", make: "TGPL" },
  { motorNumber: 18, motorName: "Pyrolyzer Blower Fan", make: "Everest" },
  { motorNumber: 19, motorName: "Air Blower Motor with Accessories", make: "Everest" },
  { motorNumber: 20, motorName: "Water Pressure Motor", make: "Lubi" },
  { motorNumber: 21, motorName: "Non Submersible Heat Water Pump", make: "Wilo" },
  { motorNumber: 22, motorName: "Chemical Dosing Pump / Electronic Metering Pump", make: "Fluidose" },
  { motorNumber: 23, motorName: "Polymer Dosing Motor", make: "CG Power" },
  { motorNumber: 24, motorName: "Pyrolyzer Chimney Motor", make: "Lubi" }
];




  return (
    <div className="space-y-6">

      {/* ================= FILTER ================= */}
     <div className="bg-white rounded-xl shadow p-4">
  <div className="flex flex-wrap items-end gap-x-6 gap-y-4">

    {/* DATE RANGE */}
    <div className="flex items-end gap-4">
      <DateInput label="From" value={fromDate} onChange={setFromDate} />
      <DateInput label="To" value={toDate} onChange={setToDate} min={fromDate} />
    </div>

    {/* ZONE */}
    <div className="min-w-[140px]">
      <Select
        label="Zone"
        value={zone}
        onChange={setZone}
        options={["All", ...zones.map(z => String(z))]}
      />
    </div>

    {/* MODULE TOGGLE */}
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-slate-600 tracking-wide">
        Module
      </span>

      <div className="flex p-1 rounded-lg bg-slate-100">
        {["sludge", "biochar", "power", "pellets", "cumulative", "vehicle"].map((m) => (
          <button
            key={m}
            onClick={() => setModule(m)}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              module === m
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {m === "cumulative"
      ? "Cumulative Flow"
      : m === "vehicle"
      ? "Vehicles"
      : m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>
    </div>
   
    {/* VIEW MACHINERY BUTTON */}
<div className="flex items-end">
  <button
    onClick={() => setShowMachinery((prev) => !prev)}
    className="px-4 py-2 text-xs font-bold rounded-md
               bg-blue-600 text-white hover:bg-blue-700 transition"
  >
    {showMachinery ? "Hide Machinery" : "View Machinery"}
  </button>
</div>


  </div>
</div>


      {/* ================= KPI CARDS ================= */}
{/* ================= KPI CARDS ================= */}
<div className="rounded-2xl p-6 bg-white shadow-lg mb-6">

  {/* Dynamic Grid Based On Module */}
  <div
    className={`grid gap-4 ${
      module === "vehicle"
        ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
        : module === "power"
        ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
        : module === "biochar" || module === "cumulative"
        ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 justify-center"
        : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
    }`}
  >

    {/* TOTAL PLANTS */}
    <VehicleKpiCard
      label="Total Plants"
      value={totalPlants.toLocaleString("en-IN")}
      icon={<Layers size={18} />}
      bg="#DBEAFE"
      bar="#2563EB"
    />

    {/* PERMANENT POWER */}
    <VehicleKpiCard
      label="Permanent Power Plants"
      value={permanentPowerPlants.toLocaleString("en-IN")}
      icon={<Zap size={18} />}
      bg="#D1FAE5"
      bar="#059669"
    />

{moduleKpis.map((k, i) => {
  const key =
    MODULES[module].bars.find(b => b.label === k.label)?.key;

  /* ================= ICON LOGIC ================= */
  let dynamicIcon = <Layers size={18} />;

  // Sludge
  if (
    k.label.includes("SLUDGE RECEIVED") ||
    k.label.includes("CUMULATIVE FLOW")
  ) {
    dynamicIcon = <Droplets size={18} />;
  }

  if (k.label.includes("SLUDGE PROCESSED")) {
    dynamicIcon = <Recycle size={18} />;
  }

  // Biochar / Pellets / Polymer
  if (
    k.label.includes("BIOCHAR") ||
    k.label.includes("PELLETS") ||
    k.label.includes("POLYMER")
  ) {
    dynamicIcon = <Box size={18} />;
  }

  // Power
  if (
    k.label.includes("POWER CONSUMED") ||
    k.label.includes("SOLAR GENERATED") ||
    k.label.includes("RUN HOURS")
  ) {
    dynamicIcon = <Zap size={18} />;
  }

  // Vehicle
  if (k.label.includes("OWN VEHICLE")) {
    dynamicIcon = <Truck size={18} />;
  }

  if (k.label.includes("PRIVATE VEHICLE")) {
    dynamicIcon = <Truck size={18} />;
  }

  if (k.label.includes("DISTANCE")) {
    dynamicIcon = <Navigation size={18} />;
  }

  if (k.label.includes("VEHICLES")) {
    dynamicIcon = <Layers size={18} />;
  }

  /* ================= COLOR THEMES ================= */
  const kpiThemes = [
    { bg: "#DBEAFE", bar: "#2563EB" },
    { bg: "#D1FAE5", bar: "#059669" },
    { bg: "#E0E7FF", bar: "#4F46E5" },
    { bg: "#FFE4E6", bar: "#E11D48" },
    { bg: "#FEF3C7", bar: "#D97706" },
    { bg: "#EDE9FE", bar: "#7C3AED" },
  ];

  const theme = kpiThemes[i % kpiThemes.length];

  return (
    <VehicleKpiCard
      key={k.label}
      label={k.label}
      value={formatValue(k.value, key)}
      icon={dynamicIcon}
      bg={theme.bg}
      bar={theme.bar}
      subValue={k.subValue}
    />
  );
})}


  </div>
</div>






{showMachinery && (
<div className="bg-white rounded-xl shadow p-4 space-y-4">

<div className="flex items-center justify-between">
  <h3 className="font-bold text-blue-900">
    Machinery Layout
  </h3>

<div className="flex gap-2">
  <button
    onClick={() => setMachineryType("with")}
    className={`px-3 py-1 text-sm font-semibold rounded-md transition
      ${
        machineryType === "with"
          ? "bg-blue-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
  >
    With Motors
  </button>

  <button
    onClick={() => setMachineryType("without")}
    className={`px-3 py-1 text-sm font-semibold rounded-md transition
      ${
        machineryType === "without"
          ? "bg-blue-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
  >
    Without Motors
  </button>
</div>
</div>

  {/* Image + Table Side by Side */}
<div
  className={`flex gap-6 ${
    machineryType === "with"
      ? "flex-col md:flex-row items-start"
      : "flex-col items-center"
  }`}
>
    {/* Image Section - 70% */}
<div
  className={`flex justify-center w-full ${
    machineryType === "with" ? "md:w-[60%]" : ""
  }`}
>
  <img
    src={selectedMachineryImage}
    alt="Machinery"
    onClick={() => setPreviewImage(selectedMachineryImage)}
    className="w-full max-h-[500px] max-w-[1000px] object-contain cursor-pointer transition-all duration-300 hover:scale-[1.01]"
  />
</div>

    {/* Table Section - 30% */}
   
{/* Table Section - 30% */}
<div className="w-full md:w-[50%]">
    {machineryType === "with" && (
  <div className="border border-gray-300  overflow-hidden">
    
    {/* Scrollable Wrapper */}
   
    <div className="max-h-[400px] overflow-y-auto">

      <table className="w-full text-sm border-collapse">
        
 <thead className="bg-blue-100 text-blue-900 sticky top-0 z-10">
  <tr>
    <th className="border px-4 py-2 text-center">Motor No</th>
    <th className="border px-4 py-2 text-left">Motor Name</th>
    <th className="border px-4 py-2 text-left">Make</th>
  </tr>
</thead>

<tbody>
  {motors.map((motor) => (
    <tr key={motor.motorNumber} className="hover:bg-gray-50 text-center">
      <td className="border px-4 py-2">{motor.motorNumber}</td>
      <td className="border px-4 py-2 text-left">{motor.motorName}</td>
      <td className="border px-4 py-2 text-left">{motor.make}</td>
    </tr>
  ))}
</tbody>


      </table>
    </div>

  </div>
      )}
</div>


  </div>

  {/* Download Button */}
<div className="flex justify-center gap-220 mt-4">

  {/* IMAGE DOWNLOAD — always */}
  <button
    onClick={handleDownloadMachineryImage}
    className="px-4 py-2 text-sm font-bold rounded-md
               bg-emerald-600 text-white hover:bg-emerald-700 transition"
  >
    Download Image
  </button>

  {/* PDF ONLY WHEN WITH MOTORS */}
  {machineryType === "with" && (
    <button
      onClick={handleDownloadMotorsPdf}
      className="px-4 py-2 text-sm font-bold rounded-md
                 bg-blue-600 text-white hover:bg-blue-700 transition"
    >
      Download PDF
    </button>
  )}
</div>

</div>


)}


      {/* ================= GRAPH ================= */}
    {/* ================= GRAPH ================= */}
{/* ================= GRAPH ================= */}
<div className="bg-white rounded-xl shadow-lg p-4">

  {/* HEADER + SORT */}
  <div className="flex items-center justify-between mb-3">
    <h3 className="font-bold text-blue-900">
      {MODULES[module].title}
    </h3>

    {/* SORT DROPDOWN */}
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-slate-900">
        Sort By
      </span>

      <select
        value={sortBy || ""}
        onChange={(e) => setSortBy(e.target.value)}
        className="border rounded-md px-2 py-1 text-xs font-semibold
                   bg-white text-slate-700 focus:outline-none"
      >
        {/* ✅ COMMON OPTION */}
        <option value="plantId">Plant ID</option>

        {/* MODULE-SPECIFIC OPTIONS */}
        {MODULES[module].bars.map(b => (
          <option key={b.key} value={b.key}>
            {b.label}
          </option>
        ))}
      </select>
    </div>
  </div>


  <div className="overflow-x-auto">
    <div
      style={{
    width:
      zone === "All"
        ? Math.max(chartData.length * 90, 900)
        : "100%",              // ✅ FULL WIDTH for zone
    height: 420
  }}
    >
      <ResponsiveContainer width="100%" height="100%">
   <BarChart
  data={chartData}
  margin={{ top: 30, left: 70, bottom: 80 }}
  barCategoryGap={90}   // ⬅ gap between plant groups
  barGap={13}            // ⬅ gap between bars inside group
>

          <CartesianGrid strokeDasharray="3 3" />

<XAxis
  dataKey="label"
  interval={0}
  height={zone === "All" ? 80 : 90}
  tick={({ x, y, payload }) => {
    const plant = chartData.find(
      (p) => p.label === payload.value
    );

 const isClickable =
  (module === "sludge" &&
    ["sludgeReceived", "sludgeProcessed"].includes(sortBy)) ||
  (module === "biochar" && sortBy === "biochar") ||
  module === "power" ||
  (module === "pellets" &&
    ["pelletsUsed", "polymerUsed"].includes(sortBy))||
    module === "cumulative"||
     module === "vehicle";

    return (
      <text
        x={x}
        y={y + 10}
        textAnchor="end"
        fill="#003f8a"
        fontSize={11}
        fontWeight={600}
        transform={`rotate(${zone === "All" ? -30 : -45} ${x} ${y + 10})`}
        style={{
          cursor: isClickable ? "pointer" : "default",
          textDecoration: isClickable ? "underline" : "none",
        }}
        onClick={() => {
          if (!plant || !isClickable) return;
          handlePlantClick(plant);
        }}
      >
        {payload.value}
      </text>
    );
  }}
/>



          <YAxis
  tickFormatter={(v) => formatValue(v, sortBy)}

  label={{
    value: MODULES[module].yAxis,
    angle: -90,
    position: "insideLeft",
    dy: 60,
    dx:-30
  }}
/>


    <Tooltip
  content={(props) => (
    <DateRangeTooltip {...props} module={module} />
  )}
/>

{MODULES[module].bars.map(b => (
  <Bar
    key={b.key}
    dataKey={b.key}
    fill={b.color}
    barSize={20}   // ⬅ reduced from 24
  >
    <LabelList
      content={(props) => (
        <BarValueLabel {...props} fill={b.color} />
      )}
    />
  </Bar>
))}

        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>

  {/* LEGEND */}
  <div className="flex flex-wrap justify-center gap-6 mt-4 font-semibold text-sm text-blue-900">
    {MODULES[module].bars.map(b => (
      <div key={b.key} className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded"
          style={{ backgroundColor: b.color }}
        />
        {b.label}
      </div>
    ))}
  </div>

  <p className="text-center text-sm font-bold mt-4">Plants</p>
</div>


      {isLoading && (
        <p className="text-center text-sm font-bold text-slate-500">
          Loading data...
        </p>
      )}

{previewImage && (
  <div
    className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
    onClick={() => setPreviewImage(null)}
  >
    {/* ❌ CLOSE ICON */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        setPreviewImage(null);
      }}
      className="absolute top-4 right-4 z-[10000]
                 bg-red-600 hover:bg-red-700
                 rounded-full p-2
                 shadow-lg"
    >
      <X size={28} className="text-white" />
    </button>

    {/* IMAGE */}
    <img
      src={previewImage}
      alt="Preview"
      onClick={(e) => e.stopPropagation()}
      className="max-w-[95vw] max-h-[95vh]
                 object-contain rounded-lg shadow-2xl"
    />
  </div>
)}



    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */
const DateInput = ({ label, value, onChange, min }) => (
  <div>
    <label className="text-xs font-bold block">{label}</label>
    <input
      type="date"
      value={value}
      min={min}
      max={TODAY}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-2 py-1 text-sm"
    />
  </div>
);
const Select = ({ label, value, onChange, options }) => (
  <div>
    <label className="text-xs font-bold block">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-2 py-1 text-sm"
    >
      {options.map(o => (
        <option key={o} value={o}>
          {label === "Zone"
            ? o === "All"
              ? "All Zones"
              : `Zone ${o}`
            : o.charAt(0).toUpperCase() + o.slice(1)}
        </option>
      ))}
    </select>
  </div>
);



const VehicleKpiCard = ({
  label,
  value,
  icon,
  bg,
  bar,
  subValue
}) => (
  <div
    className="group relative rounded-xl p-4 shadow-sm hover:shadow-md transition"
    style={{ backgroundColor: bg }}
  >
    {/* Animated bottom bar */}
    <div
      className="absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0
                 group-hover:scale-x-100 transition-transform duration-500"
      style={{ backgroundColor: bar }}
    />

    {/* Icon */}
    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-white text-slate-700">
      {icon}
    </div>

    {/* Label */}
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
      {label}
    </p>

    {/* Value */}
    <p className="text-xl font-black mt-1 text-slate-900">
      {value}
    </p>

    {/* Optional sub value */}
    {subValue && (
      <p className="text-xs font-semibold mt-1 text-slate-600">
        {subValue}
      </p>
    )}
  </div>
);




