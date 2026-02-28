import React, { useEffect, useMemo, useState, useRef } from "react";
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import companyLogo from './company_logo1.jpg'

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
}
,

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
  if (m.module === "lab" && m.metric !== "cumulativeFlow") return true;

  // Stock metrics (pelletsStock, polymerStock)
  // if (m.metric.toLowerCase().includes("stock")) return true;

  // Odometer should never be summed
  if (m.module === "vehicle" && m.metric === "odometer") return true;

  return false; // tankLevel, power, distance, trips → summed
};

// Side totals (right-end totals)
const shouldExcludeMultiSideTotal = (m) => {
  // Lab metrics
    if (m.module === "lab" && m.metric !== "cumulativeFlow") return true;

  // Stock metrics
  if (m.metric.toLowerCase().includes("stock")) return true;

  // Tank level should NOT be in side totals
  if (m.metric === "tankLevel") return true;

  // Odometer should NOT be summed
  if (m.module === "vehicle" && m.metric === "odometer") return true;

  return false;
};
const sumVehicleMetricForDateBySlot = (rows, date, metric, vehicleNo) => {
  if (!vehicleNo) return 0;

  let total = 0;

  rows.forEach(r => {
    const vehicleRows = r.values?.[date]?.vehicleRows || [];
vehicleRows.forEach(v => {
  if (normalizeVehicleNo(v.vehicleNo) === normalizeVehicleNo(vehicleNo)) {
    total += Number(v[metric]) || 0;
  }
});

  });

  return total;
};

const formatDisplayDate = (dateString) => {
  if (!dateString) return "-";

  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};


const sumSinglePlantVehicleMetric = (plantRow, dates, metric) => {
  let total = 0;

  dates.forEach(date => {
    const vehicles = plantRow.values?.[date]?.vehicleRows || [];
    vehicles.forEach(v => {
      total += Number(v[metric]) || 0;
    });
  });

  return total;
};


const getTopVehiclesForPlant = (plantRow, dates) => {
  const usage = {};

  dates.forEach(d => {
    plantRow.values?.[d]?.vehicleRows?.forEach(v => {
      const key = normalizeVehicleNo(v.vehicleNo);
      usage[key] = (usage[key] || 0) + (Number(v.distance) || 0);
    });
  });

  return Object.entries(usage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([v]) => v);
};

const sumVehicleMetricForDateAllPlants = (rows, date, metric) => {
  let total = 0;

  rows.forEach(r => {
    const vehicleRows = r.values?.[date]?.vehicleRows || [];
    vehicleRows.forEach(v => {
      total += Number(v[metric]) || 0;
    });
  });

  return total;
};

const sumVehicleMetricAllPlants = (rows, dates, metric, vehicleNo) => {
  if (!vehicleNo) return 0;

  let total = 0;

  rows.forEach(r => {
    dates.forEach(d => {
      const vehicleRows = r.values?.[d]?.vehicleRows || [];
vehicleRows.forEach(v => {
  if (normalizeVehicleNo(v.vehicleNo) === normalizeVehicleNo(vehicleNo)) {
    total += Number(v[metric]) || 0;
  }
});

    });
  });

  return total;
};

const normalizeVehicleNo = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

    const isCodBodCompleted = (plant) => {
  return Boolean(plant.codAndBodSenserDate);
};

const formatDate = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
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
  TOTAL: false,
  MNIT: false,
  POWER: false,
  SOLAR: false,
  INTERNET: false,
  COD_BOD: false,
});

const tableInfraKeys = infraFilters.TOTAL
  ? ["MNIT", "POWER", "SOLAR", "INTERNET", "COD_BOD"]
  : Object.keys(infraFilters).filter(
      k => infraFilters[k] && k !== "TOTAL"
    );

  const reportCacheRef = useRef(new Map());
  const vehicleMasterCacheRef = useRef({});
  const abortRef = useRef(null);


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


const handleDownloadTablePdf = async () => {
  const pdf = new jsPDF("landscape", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();

  /* ================= IMAGE HELPER ================= */
  const loadAndCompressImage = (
    src,
    {
      targetWidth = 240,
      targetHeight = 120,
      quality = 0.7
    } = {}
  ) =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false; // 🔴 important for logos

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        resolve({
          base64: canvas.toDataURL("image/jpeg", quality),
          width: targetWidth,
          height: targetHeight
        });
      };
    });

  /* ================= LOAD LOGO ================= */
  const logo = await loadAndCompressImage(companyLogo, {
    targetWidth: 240,
    targetHeight: 120,
    quality: 0.7
  });

  /* ================= HEADER ================= */

  // Logo (top-left)
  pdf.addImage(
    logo.base64,
    "JPEG",
    10,              // x
    6,               // y
    logo.width / 8,  // scaled width
    logo.height / 8
  );

  // Company name (center)
  pdf.setFont("times", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(200, 0, 0);
  pdf.text("MVR TECHNOLOGY", pageWidth / 2, 14, { align: "center" });

  // Subtitle
  pdf.setFont("times", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(90);
  pdf.text(
    "Plant Infrastructure Report",
    pageWidth / 2,
    20,
    { align: "center" }
  );

  // Divider line
  pdf.setDrawColor(220);
  pdf.line(10, 24, pageWidth - 10, 24);

  /* ================= TABLE DATA ================= */

  const tableInfraKeys = infraFilters.TOTAL
    ? ["MNIT", "POWER", "SOLAR", "INTERNET", "COD_BOD"]
    : Object.keys(infraFilters).filter(
        (k) => infraFilters[k] && k !== "TOTAL"
      );

  const head = [[
    "S.No",
    "Plant ID",
    "Plant Name",
    "Plant KLD",
    "District",
    ...(tableInfraKeys.length === 0
      ? ["Infrastructure"]
      : tableInfraKeys.flatMap(k => [k, `${k} Date`]))
  ]];

  const body = filteredPlants.map((p, index) => {
    const infraMap = {
      MNIT: [p.mnit, formatDate(p.mnitDateOfCompletion)],
      POWER: [p.permanentPower, formatDate(p.permanentPowerDateOfCompletion)],
      SOLAR: [p.solar, formatDate(p.solarDateOfCompletion)],
      INTERNET: [p.internet, formatDate(p.internetDateOfCompletion)],
     COD_BOD: [isCodBodCompleted(p), formatDate(p.codAndBodSenserDate || "-")],
    };

    if (tableInfraKeys.length === 0) {
      return [
        index + 1,
        p.plantID,
        p.plantName,
        p.kld,
        p.district,
        [
          p.mnit && "MNIT",
          p.permanentPower && "POWER",
          p.solar && "SOLAR",
          p.internet && "INTERNET",
           isCodBodCompleted(p) && "COD & BOD",
        ].filter(Boolean).join(", ") || "-"
      ];
    }

    return [
      index + 1,
      p.plantID,
      p.plantName,
      p.kld,
      p.district,
      ...tableInfraKeys.flatMap(k => {
        const [active, date] = infraMap[k] || [];
        return [
          active ? "YES" : "NO",
          active && date ? date : "-"
        ];
      })
    ];
  });

  /* ================= TABLE ================= */

/* ================= TABLE ================= */
const isSingleInfra =
  tableInfraKeys.length === 1 && !infraFilters.TOTAL;

const pageWidthMm = pdf.internal.pageSize.getWidth();

let marginLeft;

if (isSingleInfra) {
  // ✅ Force true center for single infra
  marginLeft = pageWidthMm * 0.15;
} else {
  const totalColumns = head[0].length;
  const EST_COL_WIDTH = 20;
  const tableWidth = totalColumns * EST_COL_WIDTH;
  marginLeft = Math.max((pageWidthMm - tableWidth) / 2, 8);
}


let finalMarginLeft = 10; // fallback
// ✅ MASTER COLUMN WIDTHS (TOTAL PLANTS DESIGN)
const MASTER_COLUMN_WIDTHS = {
  sno: 10,
  plantId: 18,
  plantName: 32,
  kld: 14,
  district: 24,

  infraValue: 18,   // YES / NO
  infraDate: 26     // Date
};

autoTable(pdf, {
  head,
  body,
  startY: 28,

  margin: {
    left: 10,
    right: 10
  },

  styles: {
    fontSize: 8,
    halign: "center",
    valign: "middle",
    cellPadding: 2,
    overflow: "linebreak"
  },

  headStyles: {
    fillColor: [55, 65, 81],
    textColor: 255,
    fontStyle: "bold",
    fontSize: 8
  },

  alternateRowStyles: {
    fillColor: [245, 247, 250]
  },

  columnStyles: {
    0: { cellWidth: 10 },   // S.No
    1: { cellWidth: 18 },   // Plant ID
    2: { cellWidth: 25 },   // Plant Name
    3: { cellWidth: 14 },   // KLD
    4: { cellWidth: 22 },   // District
  },

  tableWidth: "auto",

  didDrawPage: (data) => {
    // ✅ TRUE table width after render
    const tableWidth = data.table.width;
    const pageWidth = pdf.internal.pageSize.getWidth();

    finalMarginLeft = (pageWidth - tableWidth) / 2;

    // re-draw table centered
    if (finalMarginLeft > 10) {
      data.settings.margin.left = finalMarginLeft;
    }
  }
});


  pdf.save("Plant_Infrastructure_Table.pdf");
};

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

    // TOTAL → no infra filtering
    if (infraFilters.TOTAL) return true;

    if (infraFilters.MNIT && !p.mnit) return false;
    if (infraFilters.POWER && !p.permanentPower) return false;
    if (infraFilters.SOLAR && !p.solar) return false;
    if (infraFilters.INTERNET && !p.internet) return false;
    if (infraFilters.COD_BOD && !isCodBodCompleted(p)) return false;

    return true;
  });
}, [plants, zoneFilter, infraFilters]);

const initialized = useRef(false);

useEffect(() => {
  if (!initialized.current && filteredPlants.length) {
    setSelectedPlants(filteredPlants.map(p => p.plantID));
    initialized.current = true;
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


  
  const cacheKey = JSON.stringify({
  plants: selectedPlants,
  from: dateRange.from,
  to: dateRange.to,
  metrics: getSelectedMetric().map(
    m => `${m.module}:${m.metric}`
  )
});

const getVehicleMasterCached = async (plantID) => {
  if (!vehicleMasterCacheRef.current[plantID]) {
    vehicleMasterCacheRef.current[plantID] =
      await getVehiclesByPlant(plantID);
  }
  return vehicleMasterCacheRef.current[plantID];
};

abortRef.current?.abort();
abortRef.current = new AbortController();
const signal = abortRef.current.signal;


if (reportCacheRef.current.has(cacheKey)) {
  setPreviewData(reportCacheRef.current.get(cacheKey));
  setShowPreview(true);
  return;
}


  const metrics = getSelectedMetric();
  if (!metrics.length) return;

  setIsGenerating(true);

  try {
    /* ================= BUILD DATE LIST ================= */
    const dates = [];
    let d = new Date(dateRange.from);
    const end = new Date(dateRange.to);
    while (d <= end) {
      dates.push(d.toISOString().split("T")[0]);
      d.setDate(d.getDate() + 1);
    }

    /* ================= PARALLEL API CALLS ================= */
const [
  vehicleRangeData,
  operationsRangeData,
  labRangeData,
  vehiclesByPlant
] = await Promise.all([
  getVehicleOperationsByDateRange(
    dateRange.from,
    dateRange.to,
    { signal }
  ),

  getOperationsByDateRange(
    dateRange.from,
    dateRange.to,
    { signal }
  ),

  getLabOperationsByDateRange(
    dateRange.from,
    dateRange.to,
    { signal }
  ),

  Promise.all(
    selectedPlants.map(plantID =>
      getVehicleMasterCached(plantID)
        .then(list => [plantID, list])
    )
  )
]);


    /* ================= NORMALIZE VEHICLE MASTER ================= */
    const vehicleMasterMap = Object.fromEntries(vehiclesByPlant);

    /* ================= NORMALIZE OPERATION DATA ================= */
const opsByPlantDate = {};
operationsRangeData.forEach(rec => {
  const op = rec.operation;
  if (!rec.plantId || !op?.operationDate) return;

  const key = `${rec.plantId}_${op.operationDate}`;
  opsByPlantDate[key] = op;
});

    /* ================= NORMALIZE LAB DATA ================= */
const labByPlantDate = {};
labRangeData.forEach(rec => {
  const lab = rec.labOperation;
  if (!rec.plantId || !lab?.operationDate) return;

  const key = `${rec.plantId}_${lab.operationDate}`;
  labByPlantDate[key] = lab;
  
});

    /* ================= NORMALIZE VEHICLE OPS ================= */
    const vehicleOpsByPlantDate = {};
    vehicleRangeData.forEach(v => {
      const date = v.vehicleOp?.operationDate;
      if (!date) return;

      const key = `${v.plantId}_${date}`;
      if (!vehicleOpsByPlantDate[key]) {
        vehicleOpsByPlantDate[key] = {};
      }

      const vid = v.vehicle?.vehicleID;
      if (vid) vehicleOpsByPlantDate[key][vid] = v;
    });

    /* ================= BUILD ROWS ================= */
const rows = selectedPlants
  .map(plantID => {
    const plant = filteredPlants.find(
      p => String(p.plantID) === String(plantID)
    );

    if (!plant) return null;

      const values = {};
      const vehicleMasterList = vehicleMasterMap[plantID] || [];

      dates.forEach(date => {
        values[date] = {};

        const opData = opsByPlantDate[`${plantID}_${date}`];
        const lab = labByPlantDate[`${plantID}_${date}`];
        const vehicleOpsMap =
          vehicleOpsByPlantDate[`${plantID}_${date}`] || {};

        /* ---------- PRIVATE VEHICLE ---------- */
        const isPrivateVehicle = opData?.privateVehicle === true;
        values[date].privateTrips = isPrivateVehicle
          ? Number(opData?.noOfTripsPrivateVehicle) || 0
          : "-";

        /* ---------- LAB ---------- */
        if (lab) {
          values[date].cod = lab.cod ?? "-";
          values[date].bod = lab.bod ?? "-";
          values[date].tn = lab.tn ?? "-";
          values[date].tss = lab.tss ?? "-";
          values[date].ph = lab.ph ?? "-";
          values[date].temp = lab.temperature ?? "-";
          values[date].cumulativeFlow =
            lab.cumulativeFlow != null ? Number(lab.cumulativeFlow) : "-";
        }

        /* ---------- VEHICLE ROWS ---------- */
values[date].vehicleRows = vehicleMasterList.map(vm => {
  const op = vehicleOpsMap[vm.vehicleID]?.vehicleOp;

  const am = op?.vehicleReadingAm ?? null;
  const pm = op?.vehicleReadingPm ?? null;

  return {
    vehicleNo: String(vm.vehicleNumber).trim().toUpperCase(),

    am,
    pm,

    trips: Number(op?.noOfTrips) || 0,

    distance:
      am != null && pm != null
        ? Number(pm) - Number(am)
        : 0   // ✅ IMPORTANT → ZERO, not "-"
  };
});

        /* ---------- POWER / PELLETS ---------- */
        const power = calcPowerMetrics(opData);
        const pellets = calcPelletsMetrics(opData);

        metrics.forEach(m => {
       
          if (m.module === "power") {
            values[date][m.metric] = power[m.metric] ?? "-";
          }

          if (m.module === "pellets") {
            values[date][m.metric] = pellets[m.metric] ?? "-";
          }

          if (m.module === "sludge") {
            if (m.metric === "received") {
              values[date].received =
                opData?.sludgeReceived != null
                  ? Number(opData.sludgeReceived)
                  : "-";
            }

            if (m.metric === "processed") {
              values[date].processed = opData?.sludgeProcessed ?? "-";
            }

            if (m.metric === "tankLevel") {
              values[date].tankLevel = getTankLevel(opData);
            }

            if (m.metric === "biochar") {
              values[date].biochar =
                opData?.biocharProduced ?? "-";
            }
          }
        });
      });

      return { plant, values };
    })
      .filter(Boolean); // ✅ IMPORTANT
reportCacheRef.current.set(cacheKey, {
  dates,
  metrics,
  rows
});

    setPreviewData({ dates, metrics, rows });
    setShowPreview(true);
  } catch (err) {
    console.error("Error generating preview", err);
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
  ["TOTAL", "TOTAL PLANTS"],
  ["MNIT", "MNIT DONE"],
  ["POWER", "PERM. POWER"],
  ["SOLAR", "SOLAR PLANT"],
  ["INTERNET", "INTERNET ACTIVE"],
  ["COD_BOD", "COD & BOD COMPLETED"],
].map(([key, label]) => (
  <button
    key={key}
    onClick={() =>
      setInfraFilters((prev) => {
        if (key === "TOTAL") {
          return {
            TOTAL: !prev.TOTAL,
            MNIT: false,
            POWER: false,
            SOLAR: false,
            INTERNET: false,
            COD_BOD: false,
          };
        }
        return {
          ...prev,
          TOTAL: false,
          [key]: !prev[key],
        };
      })
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

   {!infraFilters.TOTAL && tableInfraKeys.length === 0 && (
  <th className="border p-2 text-center">Infrastructure</th>
)}


    {tableInfraKeys.map((k) => (
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

      {tableInfraKeys.length === 0 && (
        <td className="border p-2">
          <div className="flex justify-center gap-3">
            <StatusBadge active={p.mnit} label="MNIT" />
            <StatusBadge active={p.permanentPower} label="POWER" />
            <StatusBadge active={p.solar} label="SOLAR" />
            <StatusBadge active={p.internet} label="INTERNET" />
          </div>
        </td>
      )}

{tableInfraKeys.map((k) => {
    // if (!map[k]) return null;
const infraMap = {
  
  MNIT: [p.mnit,formatDate( p.mnitDateOfCompletion)],
  POWER: [p.permanentPower, formatDate(p.permanentPowerDateOfCompletion)],
  SOLAR: [p.solar,formatDate( p.solarDateOfCompletion )],
  INTERNET: [p.internet, formatDate(p.internetDateOfCompletion)],
  COD_BOD: [isCodBodCompleted(p), formatDate(p.codAndBodSenserDate || "-")],
};

  // ⛑️ SAFETY CHECK


// const infraMap = {
//   MNIT: [p.mnit, p.mnitDateOfCompletion],
//   POWER: [p.permanentPower, p.permanentPowerDateOfCompletion],
//   SOLAR: [p.solar, p.solarDateOfCompletion],
//   INTERNET: [p.internet, p.internetDateOfCompletion],
//   COD_BOD: [isCodBodCompleted(p), p.codAndBodSenserDate || "-"],
// };

const [active, date] = infraMap[k] || [];


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
        
          <div className="flex justify-end mt-4">
  <button
    onClick={handleDownloadTablePdf}
    className="px-5 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700"
  >
    Download Table PDF
  </button>
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

// ================= VEHICLE-WISE SIDE TOTAL HELPER =================
const sumVehicleMetricBySlot = (plantRow, dates, metric, vehicleNo) => {
  if (!vehicleNo) return 0;

  let total = 0;

  dates.forEach(date => {
    const rows = plantRow.values?.[date]?.vehicleRows || [];
rows.forEach(v => {
  if (normalizeVehicleNo(v.vehicleNo) === normalizeVehicleNo(vehicleNo)) {
    total += Number(v[metric]) || 0;
  }
});

  });

  return total;
};


function PreviewReport({ previewData, dateRange, onBack }) {




if (
  !previewData ||
  !Array.isArray(previewData.metrics) ||
  !Array.isArray(previewData.dates) ||
  !Array.isArray(previewData.rows) ||
  previewData.rows.length === 0
) {
  return null;
}


  const { dates, metrics, rows } = previewData;

// ✅ ADDED (DO NOT AFFECT EXISTING LOGIC)
const isSinglePlant = rows.length === 1;
const singlePlantRow = isSinglePlant ? rows[0] : null;


const isVehicleEnabled = Array.isArray(metrics) &&
  metrics.some(m => m.module === "vehicle");

  const showSinglePlantVehicleTable = isSinglePlant && isVehicleEnabled;
  const showSimpleDateTable = isSinglePlant && !isVehicleEnabled;




const sideTotalMetrics = useMemo(
  () => metrics.filter(m => !shouldExcludeMultiSideTotal(m)),
  [metrics]
);


const [v1, v2] = useMemo(() => {
  const usage = {};

  rows.forEach(r => {
    dates.forEach(d => {
      r.values?.[d]?.vehicleRows?.forEach(v => {
        if (!v?.vehicleNo) return;
        const key = normalizeVehicleNo(v.vehicleNo);
        usage[key] =
          (usage[key] || 0) + (Number(v.distance) || 0);
      });
    });
  });

  return Object.entries(usage)
    .sort((a, b) => b[1] - a[1]) // 🔥 by distance used
    .slice(0, 2)
    .map(([vehicleNo]) => vehicleNo);
}, [rows, dates]);

  // const bottomTotalMetrics = useMemo(
  //   () => metrics.filter(m => !EXCLUDE_FROM_TOTALS.has(m.metric)),
  //   [metrics]
  // );

  const nonVehicleMetrics = metrics.filter(m => m.module !== "vehicle");
// const hasNonVehicle = nonVehicleMetrics.length > 0;

const showVehicleOdometer = metrics.some(
  m => m.module === "vehicle" && m.metric === "odometer"
);

const showVehicleDistance = metrics.some(
  m => m.module === "vehicle" && m.metric === "distance"
);

const showVehicleTrips = metrics.some(
  m => m.module === "vehicle" && m.metric === "trips"
);
// const showPrivateVehicleTrips = metrics.some(
//   m => m.module === "PrivateVehicle" && m.metric === "privateTrips"
// );


// ✅ vehicle count per date (REQUIRED for rowSpan)
const vehicleCountByDate = useMemo(() => {
  if (!singlePlantRow) return {};

  const map = {};
  dates.forEach(d => {
    map[d] =
      singlePlantRow.values?.[d]?.vehicleRows?.length || 1;
  });
  return map;
}, [dates, singlePlantRow]);

const allVehicleNos = useMemo(() => {
  const set = new Set();

  rows.forEach(r => {
    dates.forEach(d => {
      r.values?.[d]?.vehicleRows?.forEach(v => {
        if (v?.vehicleNo) set.add(v.vehicleNo);
      });
    });
  });

  return Array.from(set);
}, [rows, dates]);

// ===== TOTAL HELPERS =====


const sumMetricForPlant = (plantRow, metric) =>
  dates.reduce(
    (sum, d) => sum + (Number(plantRow.values?.[d]?.[metric]) || 0),
    0
  );

const singlePlantVehicleRowSpan = useMemo(() => {
  if (!singlePlantRow) return 0;

return dates.reduce(
  (sum, d) =>
    sum +
    (singlePlantRow?.values?.[d]?.vehicleRows?.length || 1),
  0
);

}, [dates, singlePlantRow]);

const overviewTotals = useMemo(() => {
  if (!metrics?.length) return [];

  const list = [];

  const isVehicleEnabled = metrics.some(
    m => m.module === "vehicle"
  );

  /* ================= TOTAL SELECTED PLANTS (NEW) ================= */
  list.push({
    label: "Selected Plants",
    value: rows.length
  });

  /* ================= TOTAL VEHICLES ================= */
  if (isVehicleEnabled) {
    const vehicleSet = new Set();

    rows.forEach(r => {
      dates.forEach(d => {
        r.values?.[d]?.vehicleRows?.forEach(v => {
          if (v?.vehicleNo) {
            vehicleSet.add(
              String(v.vehicleNo).trim().toUpperCase()
            );
          }
        });
      });
    });

    list.push({
      label: "Vehicles",
      value: vehicleSet.size
    });
  }

  /* ================= EXISTING TOTALS ================= */
  metrics.forEach(m => {
    const isVehicle = m.module === "vehicle";

    const shouldExclude =
      (m.module === "lab" && m.metric !== "cumulativeFlow") ||
      m.metric === "tankLevel" ||
      m.metric?.toLowerCase()?.includes("stock") ||
      (isVehicle && m.metric === "odometer");

    if (shouldExclude) return;

    let value = 0;

    if (isVehicle) {
      value = sumVehicleMetricOverall(rows, dates, m.metric);
    } else {
      value = sumMetricOverall(rows, dates, m.metric);
    }

    list.push({
      label: m.label,
      value
    });
  });

  return list;
}, [metrics, rows, dates]);


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

{/* Totals Label */}
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">

  {overviewTotals.map(t => (
    <div
      key={t.label}
      className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm"
    >
      <p className="text-[11px] text-slate-900 font-semibold">
         Total {t.label}
      </p>

      <p className="text-xl font-bold text-indigo-700">
        {formatIndian(t.value)}
      </p>
    </div>
  ))}

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

                  <td className="border p-2">{formatDisplayDate(date)}</td>

                  {metrics.map(m => {
  const value =
    singlePlantRow?.values?.[date]?.[m.metric];

  return (
    <td key={m.metric} className="border p-2 text-center">
      {formatIndian(value)}
    </td>
  );
})}

                </tr>
              ))}

             <tr className="bg-slate-200 font-bold">
  <td className="border p-2">Total</td>

  {metrics.map(m => {
    const shouldHide =
      m.module === "lab" && m.metric !== "cumulativeFlow";

    return (
      <td key={m.metric} className="border p-2 text-center">
        {shouldHide
          ? "-"
          : formatIndian(
              sumMetricOverall([singlePlantRow], dates, m.metric)
            )}
      </td>
    );
  })}
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
     const vehicles = singlePlantRow
  ? singlePlantRow.values?.[date]?.vehicleRows || []
  : [];


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
      {formatDisplayDate(date)}
    </td>

    {nonVehicleMetrics.map(m => (
      <td
        key={m.metric}
        rowSpan={vehicleCountByDate[date]}
        className="border p-2 text-center"
      >
       {formatIndian(
  singlePlantRow
    ? singlePlantRow.values?.[date]?.[m.metric]
    : "-"
)}

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
  (m.module === "lab" && m.metric !== "cumulativeFlow") ||
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

   
        {/* ✅ Distance TOTAL */}
    {showVehicleDistance && (
      <td className="border p-2 text-center">
        {formatIndian(
          sumSinglePlantVehicleMetric(
            singlePlantRow,
            dates,
            "distance"
          )
        )}
      </td>
    )}

    {/* ✅ Trips TOTAL */}
    {showVehicleTrips && (
      <td className="border p-2 text-center">
        {formatIndian(
          sumSinglePlantVehicleMetric(
            singlePlantRow,
            dates,
            "trips"
          )
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
          {formatDisplayDate(date)}
        </th>
      ))}

      {/* ✅ SIDE TOTAL HEADERS (FILTERED) */}
{sideTotalMetrics

  .flatMap(m =>
 m.module === "vehicle"
  ? [
      <th key={`${m.metric}-v1`} rowSpan={2} className="border p-2 bg-slate-200">
        {m.label} By V1
      </th>,
      <th key={`${m.metric}-v2`} rowSpan={2} className="border p-2 bg-slate-200">
        {m.label} By V2
      </th>,
      <th key={`${m.metric}-total`} rowSpan={2} className="border p-2 bg-slate-300">
        {m.label} Total
      </th>
    ]
      : (
        <th key={m.metric} rowSpan={2} className="border p-2 bg-slate-200">
          {m.label} Total
        </th>
      )
  )}


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
        <tr key={`${r.plant?.plantID ?? "-"
}-${rowIdx}`}>
          {rowIdx === 0 && (
            <>
              <td rowSpan={maxVehicleRows} className="border p-2 text-center">{i + 1}</td>
              <td rowSpan={maxVehicleRows} className="border p-2 text-center">{r.plant?.plantID ?? "-"}</td>
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

    .flatMap(m => {
   if (m.module === "vehicle") {
const [pV1, pV2] = getTopVehiclesForPlant(r, dates);

const v1Value = sumVehicleMetricBySlot(r, dates, m.metric, pV1);
const v2Value = sumVehicleMetricBySlot(r, dates, m.metric, pV2);


  return [
    <td
      key={`${m.metric}-v1`}
      rowSpan={maxVehicleRows}
      className="border p-2 text-center font-bold bg-slate-100"
    >
      {formatIndian(v1Value)}
    </td>,
    <td
      key={`${m.metric}-v2`}
      rowSpan={maxVehicleRows}
      className="border p-2 text-center font-bold bg-slate-100"
    >
      {formatIndian(v2Value)}
    </td>,
    <td
      key={`${m.metric}-total`}
      rowSpan={maxVehicleRows}
      className="border p-2 text-center font-bold bg-slate-200"
    >
      {formatIndian(v1Value + v2Value)}
    </td>
  ];
}

      return (
        <td
          key={m.metric}
          rowSpan={maxVehicleRows}
          className="border p-2 text-center font-bold bg-slate-100"
        >
          {formatIndian(sumMetricForPlant(r, m.metric))}
        </td>
      );
    }
    )}

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
    {formatIndian(
      sumVehicleMetricForDateAllPlants(rows, date, "distance")
    )}
  </td>
)}

{showVehicleTrips && (
  <td className="border p-2 text-center">
    {formatIndian(
      sumVehicleMetricForDateAllPlants(rows, date, "trips")
    )}
  </td>
)}

        </React.Fragment>
      ))}
      {/* ✅ ADD THIS PART — SIDE TOTALS AT BOTTOM */}
{/* ✅ SIDE TOTALS AT BOTTOM — FIXED */}
{/* ✅ SIDE TOTALS — GLOBAL (MULTI PLANT) */}
{/* ✅ SIDE TOTALS AT BOTTOM — PERFECTLY ALIGNED */}
{/* ✅ SIDE TOTALS AT BOTTOM — SUM OF ROW VALUES */}
{sideTotalMetrics.flatMap(m => {

  // 🚗 VEHICLE METRICS
  if (m.module === "vehicle") {
    let v1Total = 0;
    let v2Total = 0;

    rows.forEach(r => {
      const [pV1, pV2] = getTopVehiclesForPlant(r, dates);

      v1Total += sumVehicleMetricBySlot(r, dates, m.metric, pV1);
      v2Total += sumVehicleMetricBySlot(r, dates, m.metric, pV2);
    });

    return [
      <td
        key={`${m.metric}-v1`}
        className="border p-2 text-center font-bold bg-slate-300"
      >
        {formatIndian(v1Total)}
      </td>,
      <td
        key={`${m.metric}-v2`}
        className="border p-2 text-center font-bold bg-slate-300"
      >
        {formatIndian(v2Total)}
      </td>,
      <td
        key={`${m.metric}-total`}
        className="border p-2 text-center font-bold bg-slate-400"
      >
        {formatIndian(v1Total + v2Total)}
      </td>
    ];
  }

  // 🧮 NON-VEHICLE METRICS
  const total = shouldExcludeMultiBottomTotal(m)
    ? "-"
    : sumMetricOverall(rows, dates, m.metric);

  return [
    <td
      key={`${m.metric}-total`}
      className="border p-2 text-center font-bold bg-slate-300"
    >
      {typeof total === "number" ? formatIndian(total) : "-"}
    </td>
  ];
})}




    </tr>
  </tfoot>
</table>

        )}
      </div>

    </div>
  );
}

