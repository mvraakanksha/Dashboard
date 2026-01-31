import React from "react";
import { Layers, ExternalLink, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const InventoryRow = ({ title, used, stock, avg, unit, low, color, isDark, formatValue }) => {
  const total = Number(used) + Number(stock);
  const percentage = total > 0 ? Math.min((stock / total) * 100, 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4
          className={`text-sm font-black uppercase tracking-wide ${
            isDark ? "text-slate-300" : "text-slate-700"
          }`}
        >
          {title}
        </h4>

        {low && (
          <div
            className={`flex items-center gap-1 text-[10px] font-black text-red-500 px-2 py-1 rounded-full border
              ${isDark ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-100"}
            `}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        {[
          { l: "Used", v: used },
          { l: "Stock", v: stock, highlight: low },
          { l: "Avg/Plant", v: avg }
        ].map((item, idx) => (
          <div
            key={idx}
            className={`rounded-xl p-3 border ${
              isDark
                ? "bg-slate-800/40 border-slate-700/30"
                : "bg-slate-50 border-slate-100"
            }`}
          >
            <p className="text-[9px] font-bold uppercase text-slate-400">
              {item.l}
            </p>
            <p
              className={`text-xs font-black ${
                item.highlight
                  ? "text-red-500"
                  : isDark
                  ? "text-slate-200"
                  : "text-slate-800"
              }`}
            >
              {formatValue(item.v)} {unit}
            </p>
          </div>
        ))}
      </div>

      <div
        className={`h-2 rounded-full overflow-hidden ${
          isDark ? "bg-slate-700/50" : "bg-slate-100"
        }`}
      >
        <div
          className={`h-full transition-all duration-1000 ${
            low ? "bg-red-500" : `bg-${color}-500`
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default function InventoryMonitor({ kpis, isDark, cardClass, formatValue }) {
  const navigate = useNavigate();

  return (
    <div
      className={`rounded-[3rem] p-10 border relative overflow-hidden transition-all ${cardClass}`}
    >
      {/* Top accent bar */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-500 via-amber-400 to-emerald-500" />

      {/* HEADER */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-2xl ${
              isDark
                ? "bg-indigo-500/10 text-indigo-400"
                : "bg-indigo-50 text-indigo-600"
            }`}
          >
            <Layers className="w-6 h-6" />
          </div>

          <h3
            className={`text-lg font-black uppercase tracking-tight ${
              isDark ? "text-slate-100" : "text-slate-800"
            }`}
          >
            Inventory Monitor
          </h3>
        </div>

        <button
          onClick={() => navigate("/pellets")}
          title="View Inventory Details"
          className={`
            p-2 rounded-xl transition-all duration-300
            hover:scale-105 active:scale-95
            ${
              isDark
                ? "bg-slate-800/60 text-slate-400 hover:text-indigo-400"
                : "bg-slate-100 text-slate-500 hover:text-indigo-600"
            }
          `}
        >
          <ExternalLink className="w-5 h-5" />
        </button>
      </div>

      {/* CONTENT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
     <InventoryRow
  title="Pellets Usage (kg)"
  used={kpis.totalPelletsUsed}
  stock={kpis.pelletsStock}
  avg={kpis.avgPelletsUsage}
  unit="kg"
  low={kpis.hasLowPelletsStock}
  color="amber"
  isDark={isDark}
  formatValue={formatValue}
/>

<InventoryRow
  title="Polymer Usage (kg)"
  used={kpis.totalPolymerUsed / 1000}
  stock={kpis.polymerStock}
  avg={kpis.avgPolymerUsage / 1000}
  unit="kg"
  low={kpis.hasLowPolymerStock}
  color="emerald"
  isDark={isDark}
  formatValue={formatValue}
/>

      </div>
    </div>
  );
}
