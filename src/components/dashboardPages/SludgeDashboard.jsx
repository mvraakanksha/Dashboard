import React from "react";
import { Droplets, Recycle, BarChart3, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * SludgeDashboard
 * ----------------
 * Only sludge & biochar related UI
 */

const SludgeDashboard = ({
  kpis,
  isDark,
  cardClass,
  Metric,
  formatValue
}) => {
  const navigate = useNavigate();

  return (
    <div
      className={`
        lg:col-span-2 relative overflow-hidden
        p-8 rounded-[3rem] border flex flex-col transition-all
        ${isDark
          ? "bg-slate-900/60 border-slate-800"
          : "bg-white border-slate-100"}
      `}
    >
      {/* 🌈 Gradient background wash */}
      <div
        className={`
          absolute inset-0 pointer-events-none
          ${isDark
            ? "bg-gradient-to-br from-blue-500/10 via-transparent to-emerald-500/10"
            : "bg-gradient-to-br from-blue-100/70 via-white to-emerald-100/50"}
        `}
      />

      {/* ✨ Soft glow blobs */}
      <div
        className={`absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl
          ${isDark ? "bg-blue-500/10" : "bg-blue-300/30"}
        `}
      />
      <div
        className={`absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl
          ${isDark ? "bg-emerald-500/10" : "bg-emerald-300/30"}
        `}
      />

      {/* 🔝 CONTENT */}
      <div className="relative z-10 flex flex-col gap-10 flex-1">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-2xl ${
                isDark
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-blue-50 text-blue-600"
              }`}
            >
              <Droplets className="w-6 h-6" />
            </div>
            <h4
              className={`font-black uppercase tracking-tight ${
                isDark ? "text-slate-100" : "text-slate-800"
              }`}
            >
              Sludge & Biochar
            </h4>
          </div>

          <button
            onClick={() => navigate("/sludge-report")}
            title="View Sludge Report"
            className={`
              p-2 rounded-xl transition-all duration-300
              hover:scale-105 active:scale-95
              ${isDark
                ? "bg-slate-800/60 text-slate-400 hover:text-blue-400"
                : "bg-slate-100 text-slate-500 hover:text-blue-600"}
            `}
          >
            <ExternalLink className="w-5 h-5" />
          </button>
        </div>

        {/* DAILY TOTALS */}
        <div>
          <p className="text-[12px] uppercase tracking-[0.2em] text-blue-500 font-black border-l-4 border-blue-500 pl-3 mb-6">
            Daily Totals
          </p>

          {/* 🔹 KPI + AVG STACKED PER COLUMN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* RECEIVED */}
            <div className="space-y-3">
              <Metric
                icon={<Droplets />}
                label="Received"
                value={formatValue(kpis.totalReceived)}
                unit="L"
                isDark={isDark}
                colorClass="blue"
              />
               <AvgCard
                label="Avg Received"
                value={formatValue(kpis.avgReceived)}
                unit="L"
                color="blue"
                isDark={isDark}
              />
            </div>

            {/* PROCESSED */}
            <div className="space-y-3">
              <Metric
                icon={<Recycle />}
                label="Processed"
                value={formatValue(kpis.totalProcessed)}
                unit="L"
                isDark={isDark}
                colorClass="emerald"
              />
              <AvgCard
                label="Avg Processed"
                value={formatValue(kpis.avgProcessed)}
                unit="L"
                color="emerald"
                isDark={isDark}
              />
            </div>

            {/* TANK LEVEL */}
            <div className="space-y-3">
              <Metric
                icon={<BarChart3 />}
                label="Tank Level"
                value={formatValue(kpis.totalTank)}
                unit="L"
                isDark={isDark}
                colorClass="indigo"
              />
              <AvgCard
                label="Avg Tank Level"
                value={formatValue(kpis.avgTank)}
                unit="L"
                color="indigo"
                isDark={isDark}
              />
            </div>

            {/* BIOCHAR */}
            <div className="space-y-3">
              <Metric
                icon={<Recycle />}
                label="Biochar"
                value={formatValue(kpis.totalBiochar)}
                unit="Kg"
                isDark={isDark}
                colorClass="amber"
              />
              <AvgCard
                label="Avg Biochar"
                value={formatValue(kpis.avgBiochar)}
                unit="Kg"
                color="amber"
                isDark={isDark}
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

/* ================= Avg Card ================= */
/* ================= Avg Card ================= */
const AvgCard = ({ label, value, unit, color, isDark }) => {
  const lightBg = {
    blue: "bg-blue-50 border-blue-200",
    emerald: "bg-emerald-50 border-emerald-200",
    indigo: "bg-indigo-50 border-indigo-200",
    amber: "bg-amber-50 border-amber-200"
  };

  const lightText = {
    blue: "text-blue-700",
    emerald: "text-emerald-700",
    indigo: "text-indigo-700",
    amber: "text-amber-700"
  };

  return (
    <div
      className={`
        flex items-center gap-3 p-4 rounded-2xl border transition-all
        ${isDark
          ? "bg-slate-900/50 border-slate-700/40"
          : `${lightBg[color]} shadow-sm`}
      `}
    >
      {/* COLOR STRIP */}
      <span className={`w-1.5 h-10 rounded-full bg-${color}-500`} />

      {/* LABEL */}
      <p
        className={`text-xs font-bold flex-1 uppercase tracking-wide
          ${isDark ? "text-slate-300" : "text-slate-600"}
        `}
      >
        {label}
      </p>

      {/* VALUE */}
      <p
        className={`text-base font-black
          ${isDark ? "text-white" : lightText[color]}
        `}
      >
        {value}
        <span className="ml-1 text-xs font-bold opacity-70">
          {unit}
        </span>
      </p>
    </div>
  );
};


export default SludgeDashboard;


