import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Filter,
  Factory,
  CheckCircle,
  BarChart2
} from "lucide-react";

import {
  EXCLUDE_FROM_TOTALS,
  EXCLUDE_FROM_SIDE_TOTALS,
  sumMetricOverall,
  sumVehicleMetricOverall,
  sumMetricForDate,
  sumVehicleMetricForDate
} from "./ReportTotals";

import CustomizedExcel from './CustomizedExcel'
import CustomizedPdf from "./CustomizedPdf";


import {
 
  calcPowerMetrics,
  calcPelletsMetrics
} from './reportCalculations';



/* ================= API ================= */
import { getAllPlants } from '../../services/plantService'
import { getVehiclesByPlant, getVehicleOperationsByDateRange } from "../../services/vehicleService";

import {
  getOperationsByDate,
  getOperationsByDateRange,
  getOperationByPlantAndDate,
  getLabOperationsByDate,
  getLabOperationsByDateRange,
 
} from '../../services/operationService';



/* ================= STATUS BADGE ================= */
const StatusBadge = ({ active, label }) => (
  <div className="flex flex-col items-center gap-1 min-w-[55px]">
    <div
      className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
        active
          ? "bg-emerald-50 text-emerald-600 border-emerald-300"
          : "bg-slate-50 text-slate-300 border-slate-200"
      }`}
    >
      {active ? "ACTIVE" : "N/A"}
    </div>
    <span className="text-[9px] text-slate-500 font-semibold">{label}</span>
  </div>
);


const OPERATIONAL_MODULES = {
  sludge: {
    label: "Sludge",
    options: [
      { id: "processed", label: "Processed (L)" },
      { id: "received", label: "Received (L)" },
      { id: "tankLevel", label: "Tank Level (L)" },
      { id: "biochar", label: "Biochar (Kg)" },
    ],
  },
vehicle: {
  label: "Vehicle",
  options: [
    { id: "odometer", label: "Odometer Readings (AM / PM)" },
    { id: "distance", label: "Distance Covered (Km)" },
    { id: "trips", label: "No. of Trips" }
  ]
},
  power: {
    label: "Power",
    options: [
      { id: "runningHours", label: "Plant Running Hours" },
      { id: "solarGenerated", label: "Solar Generated (Kwh)" },
      { id: "powerConsumed", label: "Power Consumed (Kwh)" },
    ],
  },
  pellets: {
    label: "Pellets",
    options: [
      { id: "pelletsUsed", label: "Pellets Used (Kg)" },
      { id: "pelletsStock", label: "Pellets Stock (Kg)" },
      { id: "polymerUsed", label: "Polymer Used (grms)" },
      { id: "polymerStock", label: "Polymer Stock (Kg)" },
    ],
  },
  lab: {
    label: "Lab",
    options: [
      { id: "cod", label: "COD (mg/L)" },
      { id: "bod", label: "BOD (mg/L)" },
      { id: "temp", label: "Temperature (°C)" },
      { id: "tn", label: "TN (mg/L)" },
      { id: "tss", label: "TSS (mg/L)" },
      { id: "ph", label: "pH (pH)" },
      { id: "cumulativeFlow", label: "Cumulative Flow (L)" },
    ],
  },
  PrivateVehicle: {
  label: "Private Vehicle",
  options: [
     { id: "privateTrips", label: "Private Vehicle Trips" } // ✅ NEW
  ]
},
};

const MODULE_CONFIGS = {
  sludge: {
    label: "Sludge",
    dataKey: "operation",
    options: [
      { id: "received", label: "Received (L)" },
      { id: "processed", label: "Processed (L)" },
      { id: "tankLevel", label: "Tank Level (L)" },
      { id: "biochar", label: "Biochar (Kg)" },
    ],
  },

  vehicle: {
  label: "Vehicle",
  options: [
    { id: "odometer", label: "Odometer Readings (AM / PM)" },
    { id: "distance", label: "Distance Covered (Km)" },
    { id: "trips", label: "No. of Trips" }
  ]
},

  power: {
    label: "Power",
    dataKey: "power",
    options: [
      { id: "runningHours", label: "Plant Running Hours" },
      { id: "solarGenerated", label: "Solar Generated (Kwh)" },
      { id: "powerConsumed", label: "Power Consumed (Kwh)" },
    ],
  },
  pellets: {
    label: "Pellets",
    dataKey: "inventory",
    options: [
      { id: "pelletsUsed", label: "Pellets Used (Kg)" },
      { id: "pelletsStock", label: "Pellets Stock (Kg)" },
      { id: "polymerUsed", label: "Polymer Used (grms)" },
      { id: "polymerStock", label: "Polymer Stock (Kg)" },
    ],
  },
  lab: {
    label: "Lab",
    dataKey: "lab",
    options: [
      { id: "cod", label: "COD (mg/L)" },
      { id: "bod", label: "BOD (mg/L)" },
      { id: "temp", label: "Temperature (°C)" },
      { id: "tn", label: "TN (mg/L)" },
      { id: "tss", label: "TSS (mg/L)" },
      { id: "ph", label: "pH (pH)" },
      { id: "cumulativeFlow", label: "Cumulative Flow (L)" },
    ],
  },
    PrivateVehicle: {
  label: "Private Vehicle",
  options: [
     { id: "privateTrips", label: "Private Vehicle Trips" } // ✅ NEW
  ]
},
};
/* ================= REPORT HEADER (PREVIEW) ================= */


/* ================= FORMAT ================= */
const formatIndian = (val) => {
  if (val === null || val === undefined || val === "-") return "-";
  const num = Number(val);
  if (isNaN(num)) return val;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 1,
    maximumFractionDigits: 1,
  });
};

/* ================= TOTAL HELPERS ================= */
// ================= TOTAL EXCLUSION RULES =================

// Side totals (right side)
const EXCLUDE_SIDE_TOTALS_METRICS = new Set([
  "lab",
  "tankLevel",
  "stock"
]);

// Bottom totals – single plant
const EXCLUDE_BOTTOM_TOTALS_SINGLE = new Set([
  "lab",
  "tankLevel",
  "stock"
]);

// Bottom totals – multi plant
const EXCLUDE_BOTTOM_TOTALS_MULTI = new Set([
  "lab"
]);

// ================= MULTI-PLANT TOTAL HELPERS =================

// Bottom totals (footer row)
const shouldExcludeMultiBottomTotal = (m) => {
  // Lab metrics (COD, BOD, TN, etc.)
  if (m.module === "lab") return true;

  // Stock metrics (pelletsStock, polymerStock)
  // if (m.metric.toLowerCase().includes("stock")) return true;

  // Odometer should never be summed
  if (m.module === "vehicle" && m.metric === "odometer") return true;

  return false; // tankLevel, power, distance, trips → summed
};

// Side totals (right-end totals)
const shouldExcludeMultiSideTotal = (m) => {
  // Lab metrics
  if (m.module === "lab") return true;

  // Stock metrics
  if (m.metric.toLowerCase().includes("stock")) return true;

  // Tank level should NOT be in side totals
  if (m.metric === "tankLevel") return true;

  // Odometer should NOT be summed
  if (m.module === "vehicle" && m.metric === "odometer") return true;

  return false;
};


/* ================= MAIN COMPONENT ================= */
export default function CustomizedReport() {
  const [plants, setPlants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoneFilter, setZoneFilter] = useState("All");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
const [selectedPlants, setSelectedPlants] = useState([]);
const [dateError, setDateError] = useState("");


const [showPreview, setShowPreview] = useState(false);
const [previewData, setPreviewData] = useState(null);

  const [infraFilters, setInfraFilters] = useState({
    MNIT: false,
    POWER: false,
    SOLAR: false,
    NET: false,
  });




const togglePlant = (plantID) => {
  setSelectedPlants((prev) =>
    prev.includes(plantID)
      ? prev.filter((id) => id !== plantID)
      : [...prev, plantID]
  );
};
const getSelectedMetric = () => {
  const result = [];

  Object.entries(reportTypes).forEach(([moduleKey, mod]) => {
    if (!mod.enabled) return;

    Object.entries(mod).forEach(([k, v]) => {
      if (k !== "enabled" && v) {
        result.push({
          module: moduleKey,
          metric: k,
          label:
            OPERATIONAL_MODULES[moduleKey].options.find(o => o.id === k)?.label
        });
      }
    });
  });

  return result;
};



const toggleAllPlants = () => {
  if (selectedPlants.length === filteredPlants.length) {
    setSelectedPlants([]);
  } else {
    setSelectedPlants(filteredPlants.map((p) => p.plantID));
  }
};

const [reportTypes, setReportTypes] = useState(() =>
  Object.fromEntries(
    Object.entries(MODULE_CONFIGS).map(([k, cfg]) => [
      k,
      {
        enabled: false,
        ...Object.fromEntries(cfg.options.map(o => [o.id, false])),
      },
    ])
  )
);



  /* ================= LOAD PLANTS ================= */
useEffect(() => {
  const loadPlants = async () => {
    setIsLoading(true);          // 👈 start loading
    try {
      const data = await getAllPlants();
      setPlants(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setPlants([]);
    } finally {
      setIsLoading(false);       // 👈 stop loading
    }
  };

  loadPlants();
}, []);




  /* ================= ZONES ================= */
/* ================= ZONES FROM PLANTS API ================= */
const zones = useMemo(() => {
  if (!Array.isArray(plants)) return [];
  return Array.from(
    new Set(plants.map(p => p.zones).filter(Boolean))
  ).sort((a, b) => a - b);
}, [plants]);



  const activeInfraKeys = Object.keys(infraFilters).filter(
    (k) => infraFilters[k]
  );


  /* ================= FILTERED PLANTS ================= */
const filteredPlants = useMemo(() => {
  return plants.filter((p) => {
    if (zoneFilter !== "All" && String(p.zones) !== String(zoneFilter))
      return false;

    if (infraFilters.MNIT && !p.mnit) return false;
    if (infraFilters.POWER && !p.permanentPower) return false;
    if (infraFilters.SOLAR && !p.solar) return false;
    if (infraFilters.NET && !p.internet) return false;

    return true;
  });
}, [plants, zoneFilter, infraFilters]);

useEffect(() => {
  if (filteredPlants.length > 0) {
    setSelectedPlants(filteredPlants.map(p => p.plantID));
  } else {
    setSelectedPlants([]);
  }
}, [filteredPlants]);




/* ================= HELPER TOGGLES (ADD HERE) ================= */

const toggleMain = (section) => {
  setReportTypes(prev => {
    const isEnabling = !prev[section].enabled;

    // build new sub-metric state
    const updatedSubMetrics = Object.fromEntries(
      Object.keys(prev[section])
        .filter(k => k !== "enabled")
        .map(k => [k, isEnabling])
    );

    return {
      ...prev,
      [section]: {
        enabled: isEnabling,
        ...updatedSubMetrics
      }
    };
  });
};

const toggleSub = (section, key) => {
  setReportTypes(prev => ({
    ...prev,
    [section]: {
      ...prev[section],
      [key]: !prev[section][key],
    },
  }));
};



const getTankLevel = (opData) => {
  if (!opData) return "-";
  if (opData.sludgeTankLevelPm != null && opData.sludgeTankLevelPm !== 0)
    return opData.sludgeTankLevelPm;
  if (opData.sludgeTankLevelAm != null)
    return opData.sludgeTankLevelAm;
  return "-";
};


 const hasAnyReportSelected = Object.values(reportTypes).some(
  (mod) =>
    mod.enabled &&
    Object.entries(mod).some(([k, v]) => k !== "enabled" && v)
);

const hasPlantsSelected = selectedPlants.length > 0;

const canPreview =
  hasAnyReportSelected &&
  hasPlantsSelected &&
  dateRange.from &&
  dateRange.to &&
  !dateError;
  /* ================= MATCHING COUNT ================= */
  const matchingCount = filteredPlants.length;
const selectedMetric = getSelectedMetric();



// ================= TOTAL HELPERS (SHARED) =================


const handlePreview = async () => {
  const metrics = getSelectedMetric();
  if (!metrics.length) return;

  setIsGenerating(true);

  try {
    /* ================= FETCH VEHICLE OPS RANGE ================= */
    const vehicleRangeData = await getVehicleOperationsByDateRange(
      dateRange.from,
      dateRange.to
    );

    /* ================= BUILD DATE LIST ================= */
    const dates = [];
    let d = new Date(dateRange.from);
    const end = new Date(dateRange.to);
    while (d <= end) {
      dates.push(d.toISOString().split("T")[0]);
      d.setDate(d.getDate() + 1);
    }

    const vehicleMasters = Object.fromEntries(
  await Promise.all(
    selectedPlants.map(async pid => [
      pid,
      await getVehiclesByPlant(pid)
    ])
  )
);

    /* ================= BUILD ROWS ================= */
    const rows = await Promise.all(
      selectedPlants.map(async (plantID) => {
        const plant = filteredPlants.find(p => p.plantID === plantID);
        const values = {};

        /* ---------- VEHICLE MASTER (STATIC) ---------- */
    const vehicleMasterList = vehicleMasters[plantID] || [];


        /* ---------- VEHICLE OPS (GROUPED BY DATE) ---------- */
        const plantVehicleRecords = vehicleRangeData.filter(
          v => v.plantId === plantID
        );

        const vehiclesByDate = {};
        plantVehicleRecords.forEach(v => {
          const dt = v.vehicleOp?.operationDate;
          if (!dt) return;
          if (!vehiclesByDate[dt]) vehiclesByDate[dt] = [];
          vehiclesByDate[dt].push(v);
        });

        /* ================= PER DATE ================= */
         const labCache = {};

        for (const date of dates) {
          values[date] = {};

          /* ---------- OPERATION DATA ---------- */
          const opData = await getOperationByPlantAndDate(plantID, date);

          /* ---------- PRIVATE VEHICLE TRIPS ---------- */
const isPrivateVehicle = opData?.privateVehicle === true;

const privateVehicleTrips = isPrivateVehicle
  ? Number(opData?.noOfTripsPrivateVehicle) || 0
  : 0;

values[date].privateTrips = isPrivateVehicle ? privateVehicleTrips : "-";
          
          /* ---------- LAB DATA ---------- */
        

if (!labCache[date]) {
  labCache[date] = await getLabOperationsByDate(date);
}
const labArr = labCache[date];

          const labRec = labArr?.find(l => l.plantId === plantID);
          const lab = labRec?.labOperation;

          if (lab) {
            values[date].cod = lab.cod ?? "-";
            values[date].bod = lab.bod ?? "-";
            values[date].tn = lab.tn ?? "-";
            values[date].tss = lab.tss ?? "-";
            values[date].ph = lab.ph ?? "-";
            values[date].temp = lab.temperature ?? "-";
            values[date].cumulativeFlow =
              lab.cumulativeFlow != null
                ? Number(lab.cumulativeFlow)
                : "-";
          }

          /* ---------- VEHICLE OPS FOR DATE ---------- */
          const opsForDay = vehiclesByDate[date] || [];

          /* Map: vehicleID → operation */
          const opsByVehicleId = {};
          opsForDay.forEach(v => {
            const vid = v.vehicle?.vehicleID;
            if (vid) opsByVehicleId[vid] = v;
          });

          /* 🚀 ALWAYS BUILD ROWS FROM VEHICLE MASTER */
          values[date].vehicleRows = (vehicleMasterList || []).map(vm => {
            const op = opsByVehicleId[vm.vehicleID];

            const am = op?.vehicleOp?.vehicleReadingAm ?? null;
            const pm = op?.vehicleOp?.vehicleReadingPm ?? null;
            const trips = op?.vehicleOp?.noOfTrips ?? 0;

            const distance =
              am != null && pm != null ? pm - am : "-";

            return {
              vehicleNo: vm.vehicleNumber, // ✅ ALWAYS SHOWN
              am,
              pm,
              trips,
              distance
            };
          });

          /* ---------- POWER / PELLETS ---------- */
          const power = calcPowerMetrics(opData);
          const pellets = calcPelletsMetrics(opData);

          metrics.forEach(m => {
            if (m.module === "vehicle")
              values[date][m.metric] = values[date][m.metric] ?? "-";

            if (m.module === "power")
              values[date][m.metric] = power[m.metric] ?? "-";

            if (m.module === "pellets")
              values[date][m.metric] = pellets[m.metric] ?? "-";

            if (m.module === "sludge") {
              if (m.metric === "received")
                values[date].received =
                  opData?.sludgeReceived != null
                    ? Number(opData.sludgeReceived)
                    : "-";

              if (m.metric === "processed")
                values[date].processed = opData?.sludgeProcessed ?? "-";

              if (m.metric === "tankLevel")
                values[date].tankLevel = getTankLevel(opData);

              if (m.metric === "biochar")
                values[date].biochar = opData?.biocharProduced ?? "-";
            }
          });
        }

        return { plant, values };
      })
    );

    setPreviewData({ dates, metrics, rows });
    setShowPreview(true);
  } finally {
    setIsGenerating(false);
  }
};
useEffect(() => {
  const today = new Date().toISOString().split("T")[0];

  setDateRange({
    from: today,
    to: today
  });
}, []);

  // ===== CALCULATE TOTALS PER DATE (DOWN-END TOTAL) =====


// Metrics that should NOT show right-end grand total column

  /* ================= UI ================= */
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 bg-slate-50 min-h-screen">

{isLoading && (
  <div className="flex items-center justify-center py-10">
    <span className="text-sm font-semibold text-slate-600">
      Loading plants...
    </span>
  </div>
)}

      {/* ================= DATE & ZONE BAR ================= */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap items-end gap-6">
        {["From", "To"].map((label, idx) => (
          <div key={label}>
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              {label}
            </label>
            <div className="flex items-center gap-2 mt-1">
              <Calendar size={16} />
           <input
              type="date"
              value={idx === 0 ? dateRange.from : dateRange.to}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => {
                const value = e.target.value;

                setDateRange(prev => {
                  const newRange =
                    idx === 0
                      ? { from: value, to: prev.to }
                      : { from: prev.from, to: value };

                  // 🔴 VALIDATION
                  if (newRange.to < newRange.from) {
                    setDateError("To date cannot be earlier than From date");
                  } else {
                    setDateError("");
                  }

                  return newRange;
                });
              }}
              className={`border p-2 rounded text-xs ${
                dateError ? "border-red-500" : ""
              }`}
            />


            </div>



          </div>
          
        ))}

                    {dateError && (
  <p className="text-red-600 text-xs mt-1 font-semibold">
    {dateError}
  </p>
)}

<div>
  <label className="text-[10px] font-bold text-slate-500 uppercase">
    Zone
  </label>

  <div className="flex items-center gap-2 mt-1">
    <Filter size={16} />

    <select
      value={zoneFilter}
      onChange={(e) => setZoneFilter(e.target.value)}
      className="border p-2 rounded text-xs"
    >
      <option value="All">All Zones</option>

      {zones.map((z) => (
        <option key={z} value={String(z)}>
          Zone {z}
        </option>
      ))}
    </select>
  </div>
</div>

      </div>


      {/* ================= INFRA FILTERS ================= */}
      <div className="bg-white rounded-xl border p-4">
        <div className="text-[11px] font-bold uppercase text-slate-600 mb-3">
          Plant Infrastructure Filters
        </div>


        <div className="flex flex-wrap gap-3">
          {[
            ["MNIT", "MNIT DONE"],
            ["POWER", "PERM. POWER"],
            ["SOLAR", "SOLAR PLANT"],
            ["INTERNET", "INTERNET ACTIVE"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() =>
                setInfraFilters((p) => ({ ...p, [key]: !p[key] }))
              }
              className={`px-4 py-2 rounded-full text-[11px] font-bold border ${
                infraFilters[key]
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>


      {/* ================= OPERATIONAL REPORTS CARD ================= */}
{/* ================= OPERATIONAL REPORTS CARD ================= */}
<div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
  <div className="flex items-center gap-2 mb-4">
    <BarChart2 size={18} className="text-indigo-600" />
    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600">
      Operational Reports To Include
    </h3>
  </div>


  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
    {Object.entries(OPERATIONAL_MODULES).map(([key, config]) => {
      const enabled = reportTypes[key].enabled;

      return (
        <div
          key={key}
          className={`rounded-xl border p-4 transition-all ${
            enabled
              ? "border-indigo-200 bg-indigo-50/40"
              : "border-slate-100 bg-white"
          }`}
        >
          {/* MAIN CHECK */}
          <label className="flex items-center gap-3 cursor-pointer mb-3">
            <div
              className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                enabled
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white border-slate-300"
              }`}
            >
              {enabled && <CheckCircle size={12} />}
            </div>

            <input
              type="checkbox"
              className="hidden"
              checked={enabled}
              onChange={() => toggleMain(key)}
            />

            <span
              className={`font-bold text-sm ${
                enabled ? "text-indigo-900" : "text-slate-700"
              }`}
            >
              {config.label}
            </span>
          </label>

          {/* SUB OPTIONS */}
          {enabled && (
            <div className="grid grid-cols-2 gap-2 pl-8">
              {config.options.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={!!reportTypes[key][opt.id]}
                    onChange={() => toggleSub(key, opt.id)}
                    className="w-3.5 h-3.5 rounded text-indigo-600"
                  />
                  <span className="text-[11px] text-slate-500 group-hover:text-indigo-600">
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      );
    })}


      {canPreview && selectedMetric &&(
  <div className="flex justify-end mt-4">
    <button
  onClick={handlePreview}
  disabled={isGenerating}
  className={`px-6 py-2 rounded-lg font-semibold text-sm shadow
    ${isGenerating
      ? "bg-indigo-400 cursor-not-allowed"
      : "bg-indigo-600 hover:bg-indigo-700 text-white"}
  `}
>
  {isGenerating ? "Generating report..." : "Preview Report"}
</button>

  </div>
)}

  </div>

</div>


{!showPreview ? (
  /* 🔽 EXISTING PLANTS TABLE (UNCHANGED) */
<>
  {/* ================= TABLE ================= */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-3 border-b font-bold flex items-center gap-2">
          <Factory size={18} />
          Matching Plants ({matchingCount})
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
           <thead className="bg-slate-100 text-[11px] uppercase font-bold">
  <tr>
    {/* ⭐ SELECT ALL */}
    <th className="border p-2 text-center">
      <input
        type="checkbox"
        checked={
          filteredPlants.length > 0 &&
          selectedPlants.length === filteredPlants.length
        }
        onChange={toggleAllPlants}
      />
    </th>

    <th className="border p-2 text-center">S.No</th>
    <th className="border p-2 text-center">Plant ID</th>
    <th className="border p-2">Plant Name</th>
    <th className="border p-2">Plant KLD</th>
    <th className="border p-2">District</th>

    {activeInfraKeys.length === 0 && (
      <th className="border p-2 text-center">Infrastructure</th>
    )}

    {activeInfraKeys.map((k) => (
      <React.Fragment key={k}>
        <th className="border p-2 text-center">{k}</th>
        <th className="border p-2 text-center">{k} Date</th>
      </React.Fragment>
    ))}
  </tr>
</thead>


          <tbody>
  {filteredPlants.map((p, i) => (
    <tr
      key={p.plantID}
      className={`hover:bg-slate-50 ${
        selectedPlants.includes(p.plantID) ? "bg-indigo-50/40" : ""
      }`}
    >
      {/* ⭐ SELECT PLANT */}
      <td className="border p-2 text-center">
        <input
          type="checkbox"
          checked={selectedPlants.includes(p.plantID)}
          onChange={() => togglePlant(p.plantID)}
        />
      </td>

      <td className="border p-2 text-center">{i + 1}</td>
      <td className="border p-2 text-center">{p.plantID}</td>
      <td className="border p-2 font-semibold">{p.plantName}</td>
      <td className="border p-2 text-center">{p.kld}</td>
      <td className="border p-2">{p.district}</td>

      {activeInfraKeys.length === 0 && (
        <td className="border p-2">
          <div className="flex justify-center gap-3">
            <StatusBadge active={p.mnit} label="MNIT" />
            <StatusBadge active={p.permanentPower} label="POWER" />
            <StatusBadge active={p.solar} label="SOLAR" />
            <StatusBadge active={p.internet} label="INTERNET" />
          </div>
        </td>
      )}

      {activeInfraKeys.map((k) => {
        const map = {
          MNIT: [p.mnit, p.mnitDateOfCompletion],
          POWER: [p.permanentPower, p.permanentPowerDateOfCompletion],
          SOLAR: [p.solar, p.solarDateOfCompletion],
          INTERNET: [p.internet, p.internetDateOfCompletion],
        };
        const [active, date] = map[k];

        return (
          <React.Fragment key={k}>
            <td className="border p-2 text-center">
              {active ? "YES" : "NO"}
            </td>
            <td className="border p-2 text-center">
              {active && date ? date : "-"}
            </td>
          </React.Fragment>
        );
      })}
    </tr>
  ))}
</tbody>

          </table>
        </div>
        
      </div>
      </>
) : (
<PreviewReport
  previewData={previewData}
  dateRange={dateRange}
  onBack={() => setShowPreview(false)}
/>

)}

    
      {/* DOWNLOAD */}
     
    </div>
  );
}



function PreviewReport({ previewData, dateRange, onBack }) {



 if (
  !previewData ||
  !previewData.metrics ||
  !previewData.dates ||
  !previewData.rows
) {
  return null;
}


  const { dates, metrics, rows } = previewData;

// ✅ ADDED (DO NOT AFFECT EXISTING LOGIC)
  const isSinglePlant = rows.length === 1;
  const singlePlantRow = rows[0];

  const isVehicleEnabled = metrics.some(m => m.module === "vehicle");
  const showSinglePlantVehicleTable = isSinglePlant && isVehicleEnabled;
  const showSimpleDateTable = isSinglePlant && !isVehicleEnabled;




const sideTotalMetrics = useMemo(
  () => metrics.filter(m => !EXCLUDE_FROM_SIDE_TOTALS.has(m.metric)),
  [metrics]
);


  const bottomTotalMetrics = useMemo(
    () => metrics.filter(m => !EXCLUDE_FROM_TOTALS.has(m.metric)),
    [metrics]
  );

  const nonVehicleMetrics = metrics.filter(m => m.module !== "vehicle");
const hasNonVehicle = nonVehicleMetrics.length > 0;

const showVehicleOdometer = metrics.some(
  m => m.module === "vehicle" && m.metric === "odometer"
);

const showVehicleDistance = metrics.some(
  m => m.module === "vehicle" && m.metric === "distance"
);

const showVehicleTrips = metrics.some(
  m => m.module === "vehicle" && m.metric === "trips"
);
const showPrivateVehicleTrips = metrics.some(
  m => m.module === "PrivateVehicle" && m.metric === "privateTrips"
);


// ✅ vehicle count per date (REQUIRED for rowSpan)
const vehicleCountByDate = useMemo(() => {
  const map = {};
  dates.forEach(d => {
    map[d] = singlePlantRow.values?.[d]?.vehicleRows?.length || 1;
  });
  return map;
}, [dates, singlePlantRow]);



// ===== TOTAL HELPERS =====


const sumMetricForPlant = (plantRow, metric) =>
  dates.reduce(
    (sum, d) => sum + (Number(plantRow.values?.[d]?.[metric]) || 0),
    0
  );

const singlePlantVehicleRowSpan = useMemo(() => {
  return dates.reduce(
    (sum, d) =>
      sum + (singlePlantRow.values?.[d]?.vehicleRows?.length || 1),
    0
  );
}, [dates, singlePlantRow]);



  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
{/* COMPANY HEADER */}

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-slate-800">
          Operational Report Preview
        </h2>
        <div className="flex gap-3">
   <button
  onClick={() => CustomizedExcel(previewData, dateRange)}
  className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm"
>
  Download Excel
</button>

<button
  onClick={() => CustomizedPdf(previewData, dateRange)}
  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm"
>
  Download PDF
</button>





          <button onClick={onBack} className="text-indigo-600">
            ← Back
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">

         {/* ===================================================== */}
        {/* 🔽 SINGLE PLANT DATE-WISE TABLE (ADDED ONLY) */}
        {/* ===================================================== */}
        {showSimpleDateTable ? (
          <table className="border-collapse w-full text-sm">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="border p-2">S.No</th>
                <th className="border p-2">Plant ID</th>
                <th className="border p-2">Plant Name</th>
                <th className="border p-2">KLD</th>
                <th className="border p-2">Date</th>

                {metrics.map(m => (
                  <th key={m.metric} className="border p-2">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {dates.map((date, idx) => (
                <tr key={date}>
                  {idx === 0 && (
                    <>
                      <td rowSpan={dates.length + 1} className="border p-2 text-center">
                        1
                      </td>
                      <td rowSpan={dates.length + 1} className="border p-2 text-center">
                        {singlePlantRow.plant.plantID}
                      </td>
                      <td rowSpan={dates.length + 1} className="border p-2">
                        {singlePlantRow.plant.plantName}
                      </td>
                      <td rowSpan={dates.length + 1} className="border p-2 text-center">
                        {singlePlantRow.plant.kld}
                      </td>
                    </>
                  )}

                  <td className="border p-2">{date}</td>

                  {metrics.map(m => (
                    <td key={m.metric} className="border p-2 text-center">
                      {formatIndian(singlePlantRow.values?.[date]?.[m.metric])}
                    </td>
                  ))}
                </tr>
              ))}

              <tr className="bg-slate-200 font-bold">
                <td className="border p-2">Total</td>
                {metrics.map(m => (
                  <td key={m.metric} className="border p-2 text-center">
                    {formatIndian(
                      sumMetricOverall([singlePlantRow], dates, m.metric)
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
         /* SINGLE PLANT + VEHICLE */
        ) : showSinglePlantVehicleTable ? (
        
<table className="border-collapse w-full text-sm">
  <thead>
  <tr className="bg-blue-900 text-white">
    <th className="border p-2">S.No</th>
    <th className="border p-2">Plant ID</th>
    <th className="border p-2">Plant Name</th>
    <th className="border p-2">KLD</th>
    <th className="border p-2">Date</th>


{/* Non-vehicle metrics FIRST */}
{nonVehicleMetrics.map(m => (
  <th key={m.metric} className="border p-2">
    {m.label}
  </th>
))}

    {/* Vehicle is always shown */}
    <th className="border p-2">Vehicle No</th>

    {showVehicleOdometer && (
      <>
        <th className="border p-2">Odometer AM</th>
        <th className="border p-2">Odometer PM</th>
      </>
    )}

    {showVehicleDistance && (
      <th className="border p-2">Distance (Km)</th>
    )}

    {showVehicleTrips && (
      <th className="border p-2">Trips</th>
    )}
  </tr>
</thead>


  <tbody>
    {dates.flatMap((date, dateIdx) => {
      const vehicles = singlePlantRow.values?.[date]?.vehicleRows || [];

      return vehicles.map((v, vIdx) => (
        <tr key={`${date}-${vIdx}`}>
          {dateIdx === 0 && vIdx === 0 && (
            <>
              <td rowSpan={singlePlantVehicleRowSpan}
      className="border p-2 text-center"
    >
      1
    </td>

              <td rowSpan={singlePlantVehicleRowSpan}
      className="border p-2 text-center"
    >
      {singlePlantRow.plant.plantID}
    </td>

              <td rowSpan={singlePlantVehicleRowSpan}
      className="border p-2"
    >
      {singlePlantRow.plant.plantName}
    </td>

              <td rowSpan={singlePlantVehicleRowSpan}
      className="border p-2 text-center"
    >
      {singlePlantRow.plant.kld}
    </td>
            </>
          )}
 {/* ✅ DATE + NON-VEHICLE (MERGED) */}
          {vIdx === 0 && (
  <>
    <td
      rowSpan={vehicleCountByDate[date]}
      className="border p-2"
    >
      {date}
    </td>

    {nonVehicleMetrics.map(m => (
      <td
        key={m.metric}
        rowSpan={vehicleCountByDate[date]}
        className="border p-2 text-center"
      >
        {formatIndian(singlePlantRow.values?.[date]?.[m.metric])}
      </td>
    ))}
  </>
)}
  {/* VEHICLE COLUMNS */}


          <td className="border p-2 text-center">{v.vehicleNo}</td>

{showVehicleOdometer && (
  <>
    <td className="border p-2 text-center">{v.am ?? "-"}</td>
    <td className="border p-2 text-center">{v.pm ?? "-"}</td>
  </>
)}

{showVehicleDistance && (
  <td className="border p-2 text-center">
    {typeof v.distance === "number" ? formatIndian(v.distance) : "-"}
  </td>
)}

{showVehicleTrips && (
  <td className="border p-2 text-center">
    {v.trips ?? "-"}
  </td>
)}

        </tr>
      ));
    })}
  </tbody>

{/* 🔽 ADD TOTALS ROW HERE */}
  <tfoot>
    <tr className="bg-slate-200 font-bold">
      <td colSpan={5} className="border p-2 text-center">
        Total
      </td>

      {/* Non-vehicle totals */}
      {nonVehicleMetrics.map(m => {
  const shouldExclude =
    m.module === "lab" ||
    m.metric === "tankLevel" ||
    m.metric.toLowerCase().includes("stock");

  return (
    <td key={m.metric} className="border p-2 text-center">
      {shouldExclude
        ? "-"
        : formatIndian(
            sumMetricOverall([singlePlantRow], dates, m.metric)
          )}
    </td>
  );
})}


      {/* Vehicle No — no total */}
      <td className="border p-2 text-center">-</td>

      {/* Odometer */}
      {showVehicleOdometer && (
        <>
          <td className="border p-2 text-center">-</td>
          <td className="border p-2 text-center">-</td>
        </>
      )}

      {/* Distance */}
      {showVehicleDistance && (
        <td className="border p-2 text-center">
          {formatIndian(
            sumVehicleMetricOverall([singlePlantRow], dates, "distance")
          )}
        </td>
      )}

      {/* Trips */}
      {showVehicleTrips && (
        <td className="border p-2 text-center">
          {formatIndian(
            sumVehicleMetricOverall([singlePlantRow], dates, "trips")
          )}
        </td>
      )}
    </tr>
  </tfoot>

</table>  
 ) : (
       <table className="border-collapse w-full text-sm">
  <thead>
    <tr className="bg-slate-100">
      <th rowSpan={2} className="border p-2">S.No</th>
      <th rowSpan={2} className="border p-2">Plant ID</th>
      <th rowSpan={2} className="border p-2">Plant Name</th>
      <th rowSpan={2} className="border p-2">KLD</th>

      {dates.map(date => (
        <th
          key={date}
          colSpan={
            nonVehicleMetrics.length +
            (isVehicleEnabled ? 1 : 0) +
            (showVehicleOdometer ? 2 : 0) +
            (showVehicleDistance ? 1 : 0) +
            (showVehicleTrips ? 1 : 0)
          }
          className="border p-2 text-center"
        >
          {date}
        </th>
      ))}

      {/* ✅ SIDE TOTAL HEADERS (FILTERED) */}
      {sideTotalMetrics
        .filter(m => !shouldExcludeMultiSideTotal(m))
        .map(m => (
          <th key={m.metric} rowSpan={2} className="border p-2 bg-slate-200">
            {m.label} Total
          </th>
        ))}
    </tr>

    <tr className="bg-slate-50 text-xs font-semibold">
      {dates.map(date => (
        <React.Fragment key={date}>
          {nonVehicleMetrics.map(m => (
            <th key={m.metric} className="border p-2">{m.label}</th>
          ))}

          {isVehicleEnabled && <th className="border p-2">Vehicle No</th>}

          {showVehicleOdometer && (
            <>
              <th className="border p-2">Odometer AM</th>
              <th className="border p-2">Odometer PM</th>
            </>
          )}

          {showVehicleDistance && <th className="border p-2">Distance</th>}
          {showVehicleTrips && <th className="border p-2">Trips</th>}
        </React.Fragment>
      ))}
    </tr>
  </thead>

  <tbody>
    {rows.map((r, i) => {
      const maxVehicleRows = Math.max(
        ...dates.map(d => r.values?.[d]?.vehicleRows?.length || 1)
      );

      return Array.from({ length: maxVehicleRows }).map((_, rowIdx) => (
        <tr key={`${r.plant.plantID}-${rowIdx}`}>
          {rowIdx === 0 && (
            <>
              <td rowSpan={maxVehicleRows} className="border p-2 text-center">{i + 1}</td>
              <td rowSpan={maxVehicleRows} className="border p-2 text-center">{r.plant.plantID}</td>
              <td rowSpan={maxVehicleRows} className="border p-2">{r.plant.plantName}</td>
              <td rowSpan={maxVehicleRows} className="border p-2 text-center">{r.plant.kld}</td>
            </>
          )}

          {dates.map(date => {
            const v = r.values?.[date]?.vehicleRows?.[rowIdx];
            return (
              <React.Fragment key={date}>
                {rowIdx === 0 &&
                  nonVehicleMetrics.map(m => (
                    <td key={m.metric} rowSpan={maxVehicleRows} className="border p-2 text-center">
                      {formatIndian(r.values?.[date]?.[m.metric])}
                    </td>
                  ))}

                {isVehicleEnabled && (
                  <td className="border p-2 text-center">{v?.vehicleNo || "-"}</td>
                )}

                {showVehicleOdometer && (
                  <>
                    <td className="border p-2 text-center">{v?.am ?? "-"}</td>
                    <td className="border p-2 text-center">{v?.pm ?? "-"}</td>
                  </>
                )}

                {showVehicleDistance && (
                  <td className="border p-2 text-center">
                    {typeof v?.distance === "number" ? formatIndian(v.distance) : "-"}
                  </td>
                )}

                {showVehicleTrips && (
                  <td className="border p-2 text-center">{v?.trips ?? "-"}</td>
                )}
              </React.Fragment>
            );
          })}

          {/* ✅ SIDE TOTAL VALUES */}
          {rowIdx === 0 &&
            sideTotalMetrics
              .filter(m => !shouldExcludeMultiSideTotal(m))
              .map(m => {
                const value =
                  m.module === "vehicle"
                    ? sumVehicleMetricOverall([r], dates, m.metric)
                    : sumMetricForPlant(r, m.metric);

                return (
                  <td
                    key={m.metric}
                    rowSpan={maxVehicleRows}
                    className="border p-2 text-center font-bold bg-slate-100"
                  >
                    {formatIndian(value)}
                  </td>
                );
              })}
        </tr>
      ));
    })}
  </tbody>

  <tfoot>
    <tr className="bg-slate-200 font-bold">
      <td colSpan={4} className="border p-2 text-center">Total</td>

      {dates.map(date => (
        <React.Fragment key={date}>
          {nonVehicleMetrics.map(m => {
            const total = shouldExcludeMultiBottomTotal(m)
              ? "-"
              : sumMetricForDate(rows, date, m.metric);

            return (
              <td key={m.metric} className="border p-2 text-center">
                {typeof total === "number" ? formatIndian(total) : "-"}
              </td>
            );
          })}

          {isVehicleEnabled && <td className="border p-2 text-center">-</td>}

          {showVehicleOdometer && (
            <>
              <td className="border p-2 text-center">-</td>
              <td className="border p-2 text-center">-</td>
            </>
          )}

          {showVehicleDistance && (
            <td className="border p-2 text-center">
              {formatIndian(sumVehicleMetricForDate(rows, date, "distance"))}
            </td>
          )}

          {showVehicleTrips && (
            <td className="border p-2 text-center">
              {formatIndian(sumVehicleMetricForDate(rows, date, "trips"))}
            </td>
          )}
        </React.Fragment>
      ))}
      {/* ✅ ADD THIS PART — SIDE TOTALS AT BOTTOM */}
    {sideTotalMetrics
      .filter(m => !shouldExcludeMultiSideTotal(m))
      .map(m => {
        const value =
          m.module === "vehicle"
            ? sumVehicleMetricOverall(rows, dates, m.metric)
            : sumMetricOverall(rows, dates, m.metric);

        return (
          <td
            key={m.metric}
            className="border p-2 text-center font-bold bg-slate-300"
          >
            {typeof value === "number" ? formatIndian(value) : "-"}
          </td>
        );
      })}
    </tr>
  </tfoot>
</table>

        )}
      </div>

    </div>
  );
}

