import React, { useState, useEffect } from "react";
import {
  Droplets, Recycle,CheckCircle,Wifi, Zap, Sun, Activity, Layers, ExternalLink, Moon
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Components
import AttendanceDashboard from "./dashboardPages/AttendanceDashboard";
import SludgeDashboard from "./dashboardPages/SludgeDashboard";
import InventoryMonitor from "./dashboardPages/InventoryMonitor";
import VehicleDashboard from "./dashboardPages/VehicleDashboard";


import { getAllPlants } from "../services/plantService";
import { getOperationsByDate } from "../services/operationService";
import { getVehicleOperationsByDate } from "../services/vehicleService";
import { getEmployeeOperationsByDate } from "../services/employeeService";


const formatValue = (val) => {
  if (val === null || val === undefined) return "-";
  const num = Number(val);
  if (isNaN(num)) return val;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
};

const METRIC_THEMES = (isDark) => ({
  blue: {
    text: isDark ? "text-blue-400" : "text-blue-600",
    staticBg: isDark ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200",
    bar: "bg-blue-500",
    iconHoverBg: isDark ? "bg-blue-500/20" : "bg-blue-50"
  },
  emerald: {
    text: isDark ? "text-emerald-400" : "text-emerald-600",
    staticBg: isDark ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200",
    bar: "bg-emerald-500",
    iconHoverBg: isDark ? "bg-emerald-500/20" : "bg-emerald-50"
  },
  rose: {
    text: isDark ? "text-rose-400" : "text-rose-600",
    staticBg: isDark ? "bg-rose-500/10 border-rose-500/30" : "bg-rose-50 border-rose-200",
    bar: "bg-rose-500",
    iconHoverBg: isDark ? "bg-rose-500/20" : "bg-rose-50"
  },
  indigo: {
  text: isDark ? "text-indigo-400" : "text-indigo-600",
  staticBg: isDark
    ? "bg-indigo-500/10 border-indigo-500/30"
    : "bg-indigo-50 border-indigo-200",
  bar: "bg-indigo-500",
  iconHoverBg: isDark ? "bg-indigo-500/20" : "bg-indigo-50"
},
  amber: {
    text: isDark ? "text-amber-400" : "text-amber-600",
    staticBg: isDark ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200",
    bar: "bg-amber-500",
    iconHoverBg: isDark ? "bg-amber-500/20" : "bg-amber-50"
  }
});

// --- UI Sub-Components ---
const Metric = ({ icon, label, value, unit, isDark, colorClass }) => {
  const themes = METRIC_THEMES(isDark);
  const theme = themes[colorClass] || themes.blue;
  return (
    <div className={`group relative overflow-hidden flex items-start gap-3 rounded-xl p-4 border transition-all duration-300 ${theme.staticBg}`}>
      <div className={`absolute bottom-0 left-0 h-1 w-full ${theme.bar} scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100`} />
      <div className={`p-2 rounded-lg shadow-sm ${isDark ? "bg-slate-800" : "bg-white"}`}>
        {React.cloneElement(icon, { className: `w-4 h-4 ${theme.text}` })}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</p>
        <p className={`text-lg font-black mt-1 ${theme.text}`}>
          {value} {unit && <span className="text-[10px] font-bold opacity-50 ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  );
};


const getValueTheme = (label, value, isDark) => {
  // default safe
  let level = "good";

  // 🔴 define rules (you can tune)
  if (label.includes("POWER") && value > 5000) level = "warn";
  if (label.includes("SLUDGE") && value === 0) level = "danger";
  if (label === "PERMANENT POWER" && value === 0) level = "danger";

  if (level === "danger") {
    return isDark
      ? "bg-rose-500/15 border-rose-500/40"
      : "bg-rose-50 border-rose-300";
  }

  if (level === "warn") {
    return isDark
      ? "bg-amber-500/15 border-amber-500/40"
      : "bg-amber-50 border-amber-300";
  }

  // ✅ good
  return null; // fallback to theme.staticBg
};


const AverageRow = ({ label, value, unit, color, isDark }) => (
  <div className="group">
    <div className={`flex justify-between text-[10px] font-bold tracking-widest mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
      <span>{label}</span>
      <span className={isDark ? "text-slate-200" : "text-slate-800"}>{formatValue(value)} {unit}</span>
    </div>
    <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-slate-700/50" : "bg-slate-100"}`}>
      <div className={`h-full bg-${color}-500 transition-all duration-1000 ease-out`} style={{ width: `${Math.min(value > 0 ? 75 : 0, 100)}%` }} />
    </div>
  </div>
);

const TelemetryRow = ({ leftLabel, leftValue, leftUnit, rightLabel, rightValue, rightUnit, isDark }) => (
  <div className="grid grid-cols-2 gap-8 pb-4 border-b border-white/10">
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">{leftLabel}</p>
      <p className={`mt-1 text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{formatValue(leftValue)} <span className="text-xs font-bold opacity-60">{leftUnit}</span></p>
    </div>
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">{rightLabel}</p>
      <p className={`mt-1 text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{formatValue(rightValue)} <span className="text-xs font-bold opacity-60">{rightUnit}</span></p>
    </div>
  </div>
);

// ================= MAIN DASHBOARD COMPONENT =================
export default function Dashboard({ isDark, date, zone, setZones }) {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [error, setError] = useState(false);


  const cardClass = isDark ? "bg-slate-900/60 border-slate-800 shadow-xl" : "bg-white border-slate-100 shadow-sm";

  // 1. Fetch zones for the Global FilterBar (from App.jsx)
useEffect(() => {
  getAllPlants()
    .then((plants) => {
      const uniqueZones = [
        ...new Set(plants.map(p => p.zones).filter(Boolean))
      ].sort((a, b) => a - b);

      if (typeof setZones === "function") {
        setZones(uniqueZones);
      }
    })
    .catch((err) =>
      console.error("Dashboard: Zone fetch error", err)
    );
}, [setZones]);

  // 2. Fetch Dashboard Data based on Global Filters
  useEffect(() => {
    const fetchDashboardData = async () => {

      let hasLowPelletsStock = false;
      let hasLowPolymerStock = false;

setLoading(true);
setError(false); // ✅ reset error on retry

try {
  const allPlants = await getAllPlants();

  // 🔒 If API returns empty / invalid
  if (!Array.isArray(allPlants)) {
    throw new Error("Invalid plants response");
  }

      const filteredByZone =
  zone === "All"
    ? allPlants
    : allPlants.filter(p => String(p.zones) === String(zone));

// 🔥 Apply Permanent Power Date Logic
const filteredPlants = filteredByZone;

          

       const permanentPowerCount =
  filteredPlants.filter((p) => {
    if (!p.permanentPower) return false;

    const completionDate = p.permanentPowerDateOfCompletion;
    if (!completionDate) return false;

    const selectedISO = new Date(date).toISOString().split("T")[0];
    const completedISO = new Date(completionDate).toISOString().split("T")[0];

    return selectedISO >= completedISO;
  }).length;
  

          const mnitCount =
  filteredPlants.filter(p => p.mnit === true).length;

const solarCount =
  filteredPlants.filter(p => p.solar === true).length;

const internetCount =
  filteredPlants.filter(p => p.internet === true).length;

const codbodCount =
  filteredPlants.filter(p => !!p.codAndBodSenserDate).length;


        const plantIds = new Set(filteredPlants.map(p => String(p.plantID)));
        const totalPlants = filteredPlants.length;
        const totalVehicles = filteredPlants.reduce((s, p) => s + (p.noOfVehicle || 0), 0);
        const plantCount = totalPlants || 1;

        // Sludge / Energy Operations
        const opsData = await getOperationsByDate(date);

        let totalReceived = 0, totalProcessed = 0, totalTank = 0, totalBiochar = 0,
            totalRunHours = 0, totalPowerImport = 0, totalSolarExport = 0,
            totalPelletsUsed = 0, pelletsStock = 0, totalPolymerUsed = 0, polymerStock = 0;

       opsData.forEach(({ plantId, operation }) => {
  if (!operation || !plantIds.has(String(plantId))) return;

  // ----- existing sums (keep as-is) -----
  totalReceived += operation.sludgeReceived || 0;
  totalProcessed += operation.sludgeProcessed || 0;
  totalTank += operation.sludgeTankLevelPm ?? operation.sludgeTankLevelAm ?? 0;
  totalBiochar += operation.biocharProduced || 0;
  totalRunHours += operation.plantRunningHrs || 0;

  totalPelletsUsed += operation.pillets || 0;
  totalPolymerUsed += operation.polymerUsage || 0;

  // ----- 🚨 PER-PLANT LOW STOCK CHECK (RED + YELLOW) -----
if (operation.pilletsStock != null) {
  pelletsStock += operation.pilletsStock;

  // 🔴 RED = 0 kg
  // 🟡 YELLOW = <= 100 kg
  if (operation.pilletsStock === 0 || operation.pilletsStock <= 100) {
    hasLowPelletsStock = true;
  }
}

if (operation.polymerStock != null) {
  polymerStock += operation.polymerStock;

  // 🔴 RED = 0 kg
  // 🟡 YELLOW = <= 5 kg
  if (operation.polymerStock === 0 || operation.polymerStock <= 5) {
    hasLowPolymerStock = true;
  }
}

  // ----- power -----
  if (operation.powerReadingAmImport != null && operation.powerReadingPmImport != null) {
    totalPowerImport += Math.max(
      operation.powerReadingPmImport - operation.powerReadingAmImport,
      0
    );
  }

  if (operation.powerReadingAmExport != null && operation.powerReadingPmExport != null) {
    totalSolarExport += Math.max(
      operation.powerReadingPmExport - operation.powerReadingAmExport,
      0
    );
  }
});


        // Vehicle Operations
        const vData = await getVehicleOperationsByDate(date);

        let totalDistance = 0, totalTrips = 0;
        const movedVehiclesSet = new Set();
        vData.forEach(v => {
          if (!plantIds.has(String(v.plantId))) return;
          const am = v.vehicleOp?.vehicleReadingAm, pm = v.vehicleOp?.vehicleReadingPm;
          if (am != null && pm != null) {
            const dist = Math.max(pm - am, 0);
            totalDistance += dist;
            if (dist > 0) movedVehiclesSet.add(v.vehicle?.vehicleID);
          }
          totalTrips += Number(v.vehicleOp?.noOfTrips || 0);
        });

        // Attendance
        const attData = await getEmployeeOperationsByDate(date);

        let presentUnits = 0;
        attData.forEach((a) => {
          if (!plantIds.has(String(a.plantId))) return;
          const am = a.plantOp?.attendanceAm, pm = a.plantOp?.attendancePm;
          if (am && pm) presentUnits += 1;
          else if (am || pm) presentUnits += 0.5;
        });
        const totalEmployees = filteredPlants.reduce((s, p) => s + (p.noOfEmployees || 0), 0);

 
        setKpis({
          totalPlants, totalVehicles,  permanentPowerCount,    mnitCount,  solarCount, internetCount,codbodCount,
          totalReceived, totalProcessed, totalTank, totalBiochar,
           avgReceived: Math.round(totalReceived / plantCount),
             avgTank: Math.round(totalTank / plantCount),
             avgProcessed: Math.round(
            totalProcessed / permanentPowerCount),
         avgBiochar: (totalBiochar / permanentPowerCount).toFixed(1),
         
          totalAttendance: `${presentUnits}/${totalEmployees}`,
          totalRunHours,
          totalPowerImport: totalPowerImport.toFixed(2),
          totalSolarExport: totalSolarExport.toFixed(2),
          avgPowerImport: (totalPowerImport / plantCount).toFixed(2),
          avgSolarExport: (totalSolarExport / plantCount).toFixed(2),
          movedVehicles: movedVehiclesSet.size,
          totalDistance,
          avgDistance: movedVehiclesSet.size > 0 ? Math.round(totalDistance / movedVehiclesSet.size) : 0,
          totalTrips,
           totalPelletsUsed,
  pelletsStock,
  totalPolymerUsed,
  polymerStock,

  // 🔥 THESE TWO ARE MANDATORY
  hasLowPelletsStock,
  hasLowPolymerStock,

  avgPelletsUsage: (totalPelletsUsed / plantCount).toFixed(1),
  avgPolymerUsage: (totalPolymerUsed / plantCount).toFixed(1)
        });
      }  catch (e) {
  console.error("Dashboard error", e);
  setError(true);   // ✅ trigger UI error
  setKpis(null);    // ✅ clear old data
} finally {
  setLoading(false);
}
    };
    fetchDashboardData();
  }, [date, zone]);

  const present = kpis?.totalAttendance ? Number(kpis.totalAttendance.split("/")[0]) : 0;
  const totalAtt = kpis?.totalAttendance ? Number(kpis.totalAttendance.split("/")[1]) : 0;
  const absent = Math.max(totalAtt - present, 0);
  const attendancePercent = totalAtt > 0 ? Math.round((present / totalAtt) * 100) : 0;

 if (loading) {
  return (
    <div className="p-10 text-center font-bold text-slate-600 animate-pulse">
      Updating Telemetry...
    </div>
  );
}

if (error) {
  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center text-center ${
        isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      <Wifi className="w-14 h-14 text-red-500 mb-4" />
      <h2 className="text-2xl font-black mb-2">
        Unable to load data
      </h2>
      <p className="text-slate-400 max-w-md">
        Unable to connect to the server.  
        Please check backend status or internet connection.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="mt-6 px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
      >
        Retry
      </button>
    </div>
  );
}

if (!kpis) return null;


  
  return (
    <div
  className={`p-6 min-h-screen transition-all ${
    isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
  }`}
>
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. HEADER */}
      <div className="flex items-center gap-4 mb-2">
        <div className={`p-3 rounded-2xl ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-600 text-white"}`}>
          <Activity className="w-6 h-6" />
        </div>
        <h2 className={`text-2xl font-black tracking-tight uppercase ${isDark ? "text-slate-100" : "text-blue-900"}`}>
          Plant Monitoring Overview
        </h2>
      </div>
{/* 2. TOP KPI RIBBON */}
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 mb-10">
  {[
  {
    label: "TOTAL PLANTS",
    value: kpis.totalPlants,
    theme: "blue",
    icon: <Layers />,
    card: "ALL"
  },
  {
    label: "MNIT PLANTS",
    value: kpis.mnitCount,
    theme: "emerald",
    icon: <CheckCircle />,
    card: "MNIT"
  },
  {
    label: "PERMANENT POWER",
    value: kpis.permanentPowerCount,
    theme: "indigo",
    icon: <Zap />,
    card: "POWER"
  },
  {
    label: "SOLAR COMPLETED",
    value: kpis.solarCount,
    theme: "amber",
    icon: <Sun />,
    card: "SOLAR"
  },
  {
    label: "INTERNET ACTIVE",
    value: kpis.internetCount,
    theme: "blue",
    icon: <Wifi />,
    card: "INTERNET"
  },
  {
    label: "COD / BOD INSTALLED",
    value: kpis.codbodCount,
    theme: "rose",
    icon: <Activity />,
    card: "CODBOD"
  }
]
.map((k, i) => {
    const theme = METRIC_THEMES(isDark)[k.theme];


    return (
  <div
    key={i}
    className={`group relative p-5 rounded-[2rem] border transition-all ${theme.staticBg} ${cardClass}`}
  >
    {/* Bottom hover bar */}
    <div
      className={`absolute bottom-0 left-4 h-1 rounded-[15rem] w-full ${theme.bar}
      scale-x-0 origin-left transition-transform duration-500
      group-hover:scale-x-87`}
    />

    {/* Header */}
    <div className="flex items-center gap-2 mb-2">
      <span className={`p-1.5 rounded-lg ${theme.iconHoverBg}`}>
        {React.cloneElement(k.icon, {
          className: `w-3.5 h-3.5 ${theme.text}`
        })}
      </span>
      <p className="text-[10px] font-black text-slate-400 tracking-widest">
        {k.label}
      </p>
    </div>

    {/* Value */}
    <p className={`text-2xl font-black ${theme.text}`}>
      {formatValue(k.value)}
    </p>

    {/* 🔥 Navigation Button */}
    <button
      onClick={() =>
        navigate("/plants", {
          state: { selectedCard: k.card }
        })
      }
      className={`
        absolute top-4 right-4
        p-2 rounded-xl transition-all duration-300
        hover:scale-105 active:scale-95
        ${isDark
          ? "bg-slate-800/60 text-slate-400 hover:text-blue-400"
          : "bg-slate-100 text-slate-500 hover:text-blue-600"}
      `}
      title="View details"
    >
      <ExternalLink className="w-4 h-4" />
    </button>
  </div>
);
  })}
</div>


      {/* 3. ROW: SLUDGE & ATTENDANCE */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <SludgeDashboard kpis={kpis} isDark={isDark} cardClass={cardClass} Metric={Metric} AverageRow={AverageRow} formatValue={formatValue} />
        <div className={`p-8 rounded-[3rem] border transition-all ${isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200"}`}>
          <AttendanceDashboard attendancePercent={attendancePercent} present={present} absent={absent} total={totalAtt} isDark={isDark} />
        </div>
      </section>

      {/* 4. ROW: ENERGY & LOGISTICS */}
  {/* 4. ENERGY & LOGISTICS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Updated Power & Energy Card */}
       
       <div
  className={`
    relative overflow-hidden
    p-8 rounded-[3rem] border transition-all
    ${cardClass}
  `}
>
  {/* 🌈 Subtle energy background layer */}
  <div
    className={`
      absolute inset-0 pointer-events-none
      ${
        isDark
          ? "bg-gradient-to-br from-amber-500/10 via-transparent to-rose-500/10"
          : "bg-gradient-to-br from-amber-100/60 via-white to-rose-100/40"
      }
    `}
  />

  {/* Optional soft glow blobs */}
  <div
    className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl
      ${isDark ? "bg-amber-500/10" : "bg-amber-300/30"}
    `}
  />
  <div
    className={`absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-3xl
      ${isDark ? "bg-rose-500/10" : "bg-rose-300/30"}
    `}
  />

  {/* CONTENT */}
  <div className="relative z-10">
    {/* HEADER */}
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <div
          className={`p-3 rounded-2xl
            ${isDark
              ? "bg-amber-500/20 text-amber-400"
              : "bg-amber-100 text-amber-600"}
          `}
        >
          <Zap className="w-6 h-6" />
        </div>

        <div>
          <h3
            className={`text-lg font-bold uppercase tracking-tight
              ${isDark ? "text-slate-100" : "text-slate-800"}
            `}
          >
            Power & Energy
          </h3>
          <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">
            Grid & Solar Analysis
          </p>
        </div>
      </div>

      {/* 🔗 External Link */}
      <button
        onClick={() => navigate("/power")}
        title="View Power & Energy Details"
        className={`
          p-2 rounded-xl transition-all duration-300
          hover:scale-105 active:scale-95
          ${
            isDark
              ? "bg-slate-800/60 text-slate-400 hover:text-amber-400"
              : "bg-slate-100 text-slate-500 hover:text-amber-600"
          }
        `}
      >
        <ExternalLink className="w-5 h-5" />
      </button>
    </div>

    {/* BODY */}
    {/* LIVE TELEMETRY */}
<div className="space-y-6">

  {/* ROW 1 */}
  <TelemetryRow
    leftLabel="Power consumption"
    leftValue={kpis.totalPowerImport}
    leftUnit="Kwh"
    rightLabel="Avg Power consumption"
    rightValue={kpis.avgPowerImport}
    rightUnit="Kwh"
    isDark={isDark}
  />

  {/* ROW 2 */}
  <TelemetryRow
    leftLabel="Solar generated"
    leftValue={kpis.totalSolarExport}
    leftUnit="Kwh"
    rightLabel="Avg Solar generated"
    rightValue={kpis.avgSolarExport}
    rightUnit="Kwh"
    isDark={isDark}
  />

  {/* ROW 3 */}
  <TelemetryRow
    leftLabel="Plant Run Hours"
    leftValue={kpis.totalRunHours}
    leftUnit="Hrs"
    rightLabel="Avg Run Hours"
    rightValue={(
      kpis.totalRunHours / (kpis.totalPlants || 1)
    ).toFixed(2)}
    rightUnit="Hrs"
    isDark={isDark}
  />

</div>

  </div>
</div>

        <div >
          <VehicleDashboard
    kpis={kpis}
    isDark={isDark}
    cardClass={cardClass}
    formatValue={formatValue}
  />
        </div>
      </div>

      {/* 5. INVENTORY MONITOR */}
      <InventoryMonitor kpis={kpis} isDark={isDark} cardClass={cardClass} formatValue={formatValue} />
    </div>
    </div>
  );
}



