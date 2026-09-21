import React, { useState, useEffect, useRef } from "react";
import {
  Droplets,
  Recycle,
  CheckCircle,
  Wifi,
  Zap,
  Sun,
  Activity,
  Layers,
  ExternalLink,
  Moon,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import AttendanceDashboard from "./dashboardPages/AttendanceDashboard";
import SludgeDashboard from "./dashboardPages/SludgeDashboard";
import InventoryMonitor from "./dashboardPages/InventoryMonitor";
import VehicleDashboard from "./dashboardPages/VehicleDashboard";

import { getAllPlants } from "../services/plantService";

import {
  getDashboardSummaryCount,
  getAttendanceSummaryCount,
  getSludgeDashboard,
  getPowerDashboard,
  getVehicleDashboard,
  getInventoryDashboard,
} from "../services/dashboardService";

import { getOperationsByDate } from "../services/operationService";

const formatValue = (val) => {
  if (val === null || val === undefined) return "-";
  const num = Number(val);
  if (isNaN(num)) return val;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

const METRIC_THEMES = (isDark) => ({
  blue: {
    text: isDark ? "text-blue-400" : "text-blue-600",
    staticBg: isDark
      ? "bg-blue-500/10 border-blue-500/30"
      : "bg-blue-50 border-blue-200",
    bar: "bg-blue-500",
    iconHoverBg: isDark ? "bg-blue-500/20" : "bg-blue-50",
  },
  emerald: {
    text: isDark ? "text-emerald-400" : "text-emerald-600",
    staticBg: isDark
      ? "bg-emerald-500/10 border-emerald-500/30"
      : "bg-emerald-50 border-emerald-200",
    bar: "bg-emerald-500",
    iconHoverBg: isDark ? "bg-emerald-500/20" : "bg-emerald-50",
  },
  rose: {
    text: isDark ? "text-rose-400" : "text-rose-600",
    staticBg: isDark
      ? "bg-rose-500/10 border-rose-500/30"
      : "bg-rose-50 border-rose-200",
    bar: "bg-rose-500",
    iconHoverBg: isDark ? "bg-rose-500/20" : "bg-rose-50",
  },
  indigo: {
    text: isDark ? "text-indigo-400" : "text-indigo-600",
    staticBg: isDark
      ? "bg-indigo-500/10 border-indigo-500/30"
      : "bg-indigo-50 border-indigo-200",
    bar: "bg-indigo-500",
    iconHoverBg: isDark ? "bg-indigo-500/20" : "bg-indigo-50",
  },
  amber: {
    text: isDark ? "text-amber-400" : "text-amber-600",
    staticBg: isDark
      ? "bg-amber-500/10 border-amber-500/30"
      : "bg-amber-50 border-amber-200",
    bar: "bg-amber-500",
    iconHoverBg: isDark ? "bg-amber-500/20" : "bg-amber-50",
  },
});

const Metric = ({ icon, label, value, unit, isDark, colorClass, loading }) => {
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
          {loading ? formatValue(value) : formatValue(value)}{" "}
          {unit && <span className="text-[10px] font-bold opacity-50 ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  );
};

const getValueTheme = (label, value, isDark) => {
  let level = "good";

  if (label.includes("POWER") && value > 5000) level = "warn";
  if (label.includes("SLUDGE") && value === 0) level = "danger";
  if (label === "PERMANENT POWER" && value === 0) level = "danger";

  if (level === "danger") {
    return isDark ? "bg-rose-500/15 border-rose-500/40" : "bg-rose-50 border-rose-300";
  }

  if (level === "warn") {
    return isDark ? "bg-amber-500/15 border-amber-500/40" : "bg-amber-50 border-amber-300";
  }

  return null;
};

const AverageRow = ({ label, value, unit, color, isDark, loading }) => (
  <div className="group">
    <div className={`flex justify-between text-[10px] font-bold tracking-widest mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
      <span>{label}</span>
      <span className={isDark ? "text-slate-200" : "text-slate-800"}>
        {formatValue(value)}{unit}
      </span>
    </div>
    <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-slate-700/50" : "bg-slate-100"}`}>
      <div className={`h-full bg-${color}-500 transition-all duration-1000 ease-out`} style={{ width: `${Math.min(value > 0 ? 75 : 0, 100)}%` }} />
    </div>
  </div>
);

const TelemetryRow = ({
  leftLabel,
  leftValue,
  leftUnit,
  rightLabel,
  rightValue,
  rightUnit,
  isDark,
  loading,
}) => (
  <div className="grid grid-cols-2 gap-8 pb-4 border-b border-white/10">
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">{leftLabel}</p>
      <p className={`mt-1 text-2xl font-black ${isDark ? "text-white" : "text-slate-900"} ${loading ? "opacity-90" : ""}`}>
        {formatValue(leftValue)} <span className="text-xs font-bold opacity-60">{leftUnit}</span>
      </p>
    </div>
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">{rightLabel}</p>
      <p className={`mt-1 text-2xl font-black ${isDark ? "text-white" : "text-slate-900"} ${loading ? "opacity-90" : ""}`}>
        {formatValue(rightValue)} <span className="text-xs font-bold opacity-60">{rightUnit}</span>
      </p>
    </div>
  </div>
);

export default function Dashboard({ isDark, date, zone, setZones, selectedPlants }) {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const requestIdRef = useRef(0);

  const cardClass = isDark ? "bg-slate-900/60 border-slate-800 shadow-xl" : "bg-white border-slate-100 shadow-sm";

  const cacheKey = `dashboard-kpis:${date}:${zone}:${(selectedPlants || []).join(",")}`;

  useEffect(() => {
    getAllPlants()
      .then((plants) => {
        const uniqueZones = [...new Set(plants.map((p) => p.zones).filter(Boolean))].sort((a, b) => a - b);
        if (typeof setZones === "function") {
          setZones(uniqueZones);
        }
      })
      .catch((err) => console.error("Dashboard: Zone fetch error", err));
  }, [setZones]);

  useEffect(() => {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setKpis(JSON.parse(cached));
        setInitialLoading(false);
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }
  }, [cacheKey]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const selectedDate = date;
      const currentRequestId = ++requestIdRef.current;
      let hasLowPelletsStock = false;
      let hasLowPolymerStock = false;

      setLoading(true);
      setError(false);

      try {
        const allPlants = await getAllPlants();

        if (!Array.isArray(allPlants)) {
          throw new Error("Invalid plants response");
        }

        const filteredPlants = allPlants.filter((p) => {
          const zoneMatch = zone === "All" || String(p.zones) === String(zone);
          const plantMatch = selectedPlants.length === 0 || selectedPlants.includes(p.plantID);
          return zoneMatch && plantMatch;
        });

        const plantIds = new Set(filteredPlants.map((p) => String(p.plantID)));

        const [
          summary,
          opsData,
          inventorySummary,
          vehicleSummary,
          sludgeSummary,
          powerSummary,
          attendanceSummary,
        ] = await Promise.all([
          getDashboardSummaryCount({
            date: selectedDate,
            zone,
            plantIds: selectedPlants,
          }),
          getOperationsByDate(selectedDate),
          getInventoryDashboard({
            date: selectedDate,
            zone,
            plantIds: selectedPlants,
          }),
          getVehicleDashboard({
            date: selectedDate,
            zone,
            plantIds: selectedPlants,
          }),
          getSludgeDashboard({
            date: selectedDate,
            zone,
            plantIds: selectedPlants,
          }),
          getPowerDashboard({
            date: selectedDate,
            zone,
            plantIds: selectedPlants,
          }),
          getAttendanceSummaryCount({
            date: selectedDate,
            zone,
            plantIds: selectedPlants,
          }),
        ]);

        let totalPelletsUsed = 0,
          pelletsStock = 0,
          totalPolymerUsed = 0,
          polymerStock = 0;

        opsData.forEach(({ plantId, operation }) => {
          if (!operation || !plantIds.has(String(plantId))) return;

          if (operation.pilletsStock != null) {
            pelletsStock += operation.pilletsStock;
            if (operation.pilletsStock === 0 || operation.pilletsStock <= 100) {
              hasLowPelletsStock = true;
            }
          }

          if (operation.polymerStock != null) {
            polymerStock += operation.polymerStock;
            if (operation.polymerStock === 0 || operation.polymerStock <= 5) {
              hasLowPolymerStock = true;
            }
          }
        });

        totalPelletsUsed = inventorySummary?.pelletsUsed || 0;
        pelletsStock = inventorySummary?.pelletsStock || 0;
        totalPolymerUsed = inventorySummary?.polymerUsed || 0;
        polymerStock = inventorySummary?.polymerStock || 0;

        const nextKpis = {
          totalPlants: summary?.totalPlants || 0,
          mnitCount: summary?.mnitPlants || 0,
          permanentPowerCount: summary?.permanentPower || 0,
          solarCount: summary?.solarCompleted || 0,
          internetCount: summary?.internetActive || 0,
          codbodCount: summary?.codBodInstalled || 0,

          totalReceived: sludgeSummary?.sludgeReceived || 0,
          avgReceived: sludgeSummary?.avgReceived || 0,
          totalProcessed: sludgeSummary?.sludgeProcessed || 0,
          avgProcessed: sludgeSummary?.avgProcessed || 0,
          totalTank: sludgeSummary?.tankLevel || 0,
          avgTank: sludgeSummary?.avgTankLevel || 0,
          totalBiochar: sludgeSummary?.biochar || 0,
          avgBiochar: sludgeSummary?.avgBiochar || 0,

          totalPresent: attendanceSummary?.presentEmployees || 0,
          totalEmployees: attendanceSummary?.totalEmployees || 0,
          totalAbsent: attendanceSummary?.absentEmployees || 0,
          attendancePercentage: attendanceSummary?.attendancePercentage || 0,

          totalRunHours: powerSummary?.plantRunHours || 0,
          avgRunHours: powerSummary?.avgRunHours || 0,
          totalPowerImport: powerSummary?.powerConsumption || 0,
          avgPowerImport: powerSummary?.avgPowerConsumption || 0,
          totalSolarExport: powerSummary?.solarGenerated || 0,
          avgSolarExport: powerSummary?.avgSolarGenerated || 0,

          totalVehicles: vehicleSummary?.totalVehicles || 0,
          movedVehicles: vehicleSummary?.movedVehicles || 0,
          totalDistance: vehicleSummary?.totalDistance || 0,
          avgDistance: vehicleSummary?.avgDistance || 0,
          totalTrips: vehicleSummary?.totalTrips || 0,

          totalPelletsUsed,
          pelletsStock,
          totalPolymerUsed,
          polymerStock,
          avgPelletsUsage: inventorySummary?.avgPelletsPerPlant || 0,
          avgPolymerUsage: inventorySummary?.avgPolymerPerPlant || 0,

          hasLowPelletsStock,
          hasLowPolymerStock,
        };

        if (currentRequestId !== requestIdRef.current) return;

        setKpis(nextKpis);
        sessionStorage.setItem(cacheKey, JSON.stringify(nextKpis));
        setInitialLoading(false);
      } catch (e) {
        console.error("Dashboard error", e);
        if (!kpis) {
          setError(true);
          setKpis(null);
        }
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
          setInitialLoading(false);
        }
      }
    };

    fetchDashboardData();
  }, [date, zone, selectedPlants]);

  const present = kpis?.totalPresent?.toFixed(1) || "0.0";
  const absent = kpis?.totalAbsent?.toFixed(1) || "0.0";
  const total = kpis?.totalEmployees || 0;
  const attendancePercent = kpis?.attendancePercentage || 0;

  if (error) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center text-center ${
          isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
        }`}
      >
        <Wifi className="w-14 h-14 text-red-500 mb-4" />
        <h2 className="text-2xl font-black mb-2">Unable to load data</h2>
        <p className="text-slate-400 max-w-md">
          Unable to connect to the server. Please check backend status or internet connection.
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

  if (!kpis && initialLoading) {
    return (
      <div
        className={`min-h-screen transition-all p-6 ${
          isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
        }`}
      >
        <div className="space-y-8 animate-pulse">
          <div className="flex items-center gap-4 mb-2">
            <div className={`w-12 h-12 rounded-2xl ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
            <div className={`h-8 w-72 rounded-xl ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`h-28 rounded-[2rem] border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"}`} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`h-96 rounded-[3rem] border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"}`} />
            <div className={`h-96 rounded-[3rem] border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"}`} />
            <div className={`h-96 rounded-[3rem] border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"}`} />
          </div>

          <div className={`h-96 rounded-[3rem] border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"}`} />
        </div>
      </div>
    );
  }

  const displayValue = (value) => formatValue(value);

  return (
    <div
      className={`relative p-6 min-h-screen transition-all ${
        isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      {loading && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 bg-slate-900/80 text-white shadow-lg backdrop-blur">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-semibold">Updating dashboard...</span>
        </div>
      )}

      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 mb-2">
          <div className={`p-3 rounded-2xl ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-600 text-white"}`}>
            <Activity className="w-6 h-6" />
          </div>
          <h2 className={`text-2xl font-black tracking-tight uppercase ${isDark ? "text-slate-100" : "text-blue-900"}`}>
            Plant Monitoring Overview
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 mb-10">
          {[
            { label: "TOTAL PLANTS", value: kpis.totalPlants, theme: "blue", icon: <Layers />, card: "ALL" },
            { label: "MNIT PLANTS", value: kpis.mnitCount, theme: "emerald", icon: <CheckCircle />, card: "MNIT" },
            { label: "PERMANENT POWER", value: kpis.permanentPowerCount, theme: "indigo", icon: <Zap />, card: "POWER" },
            { label: "SOLAR COMPLETED", value: kpis.solarCount, theme: "amber", icon: <Sun />, card: "SOLAR" },
            { label: "INTERNET ACTIVE", value: kpis.internetCount, theme: "blue", icon: <Wifi />, card: "INTERNET" },
            { label: "COD / BOD INSTALLED", value: kpis.codbodCount, theme: "rose", icon: <Activity />, card: "CODBOD" },
          ].map((k, i) => {
            const theme = METRIC_THEMES(isDark)[k.theme];
            return (
              <div key={i} className={`group relative p-5 rounded-[2rem] border transition-all ${theme.staticBg} ${cardClass}`}>
                <div className={`absolute bottom-0 left-4 h-1 rounded-[15rem] w-full ${theme.bar} scale-x-0 origin-left transition-transform duration-500 group-hover:scale-x-87`} />
                <div className="flex items-center gap-2 mb-2">
                  <span className={`p-1.5 rounded-lg ${theme.iconHoverBg}`}>
                    {React.cloneElement(k.icon, { className: `w-3.5 h-3.5 ${theme.text}` })}
                  </span>
                  <p className="text-[10px] font-black text-slate-400 tracking-widest">{k.label}</p>
                </div>
                <p className={`text-2xl font-black ${theme.text}`}>{displayValue(k.value)}</p>
                <button
                  onClick={() => navigate("/plants", { state: { selectedCard: k.card } })}
                  className={`
                    absolute top-4 right-4 p-2 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95
                    ${isDark ? "bg-slate-800/60 text-slate-400 hover:text-blue-400" : "bg-slate-100 text-slate-500 hover:text-blue-600"}
                  `}
                  title="View details"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <SludgeDashboard kpis={kpis} isDark={isDark} cardClass={cardClass} Metric={Metric} AverageRow={AverageRow} formatValue={formatValue} />
          <div className={`p-8 rounded-[3rem] border transition-all ${isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200"}`}>
            <AttendanceDashboard attendancePercent={attendancePercent} present={present} absent={absent} total={total} isDark={isDark} />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className={`relative overflow-hidden p-8 rounded-[3rem] border transition-all ${cardClass}`}>
            <div className={`absolute inset-0 pointer-events-none ${isDark ? "bg-gradient-to-br from-amber-500/10 via-transparent to-rose-500/10" : "bg-gradient-to-br from-amber-100/60 via-white to-rose-100/40"}`} />
            <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl ${isDark ? "bg-amber-500/10" : "bg-amber-300/30"}`} />
            <div className={`absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-3xl ${isDark ? "bg-rose-500/10" : "bg-rose-300/30"}`} />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-600"}`}>
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold uppercase tracking-tight ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                      Power & Energy
                    </h3>
                    <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">
                      Grid & Solar Analysis
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate("/power")}
                  title="View Power & Energy Details"
                  className={`
                    p-2 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95
                    ${isDark ? "bg-slate-800/60 text-slate-400 hover:text-amber-400" : "bg-slate-100 text-slate-500 hover:text-amber-600"}
                  `}
                >
                  <ExternalLink className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <TelemetryRow
                  leftLabel="Power consumption"
                  leftValue={kpis.totalPowerImport}
                  leftUnit="Kwh"
                  rightLabel="Avg Power consumption"
                  rightValue={kpis.avgPowerImport}
                  rightUnit="Kwh"
                  isDark={isDark}
                  loading={loading}
                />
                <TelemetryRow
                  leftLabel="Solar generated"
                  leftValue={kpis.totalSolarExport}
                  leftUnit="Kwh"
                  rightLabel="Avg Solar generated"
                  rightValue={kpis.avgSolarExport}
                  rightUnit="Kwh"
                  isDark={isDark}
                  loading={loading}
                />
                <TelemetryRow
                  leftLabel="Plant Run Hours"
                  leftValue={kpis.totalRunHours}
                  leftUnit="Hrs"
                  rightLabel="Avg Run Hours"
                  rightValue={kpis.avgRunHours}
                  rightUnit="Hrs"
                  isDark={isDark}
                  loading={loading}
                />
              </div>
            </div>
          </div>

          <div>
            <VehicleDashboard
              kpis={kpis}
              isDark={isDark}
              cardClass={cardClass}
              formatValue={formatValue}
            />
          </div>
        </div>

        <InventoryMonitor
          kpis={kpis}
          isDark={isDark}
          cardClass={cardClass}
          formatValue={formatValue}
        />
      </div>
    </div>
  );
}