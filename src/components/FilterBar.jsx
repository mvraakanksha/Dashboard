import React from "react";
import { Moon, Sun, CalendarDays, MapPin } from "lucide-react";

export default function FilterBar({
  isDark,
  setIsDark,
    showThemeToggle, 
  date,
  setDate,
  zone,
  setZone,
  zones
}) {

  const today = new Date().toISOString().split("T")[0];

  return (
    <div
      className={`
        sticky top-0 z-40
        flex flex-wrap items-center justify-between gap-4
        px-6 py-3 mb-6 rounded-xl border
        ${isDark
          ? "bg-slate-900/80 border-slate-800 backdrop-blur text-slate-200"
          : "bg-white border-slate-200 text-slate-800"}
      `}
    >
      {/* LEFT : DATE + ZONE */}
      <div className="flex flex-wrap items-center gap-4">

        {/* DATE */}
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-indigo-500" />
       <input
  type="date"
  value={date}
  max={new Date().toISOString().split("T")[0]}
  onChange={(e) => setDate(e.target.value)}
/>


        </div>

        {/* ZONE */}
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-500" />
          <select
            value={zone}
              onChange={(e) => setZone(e.target.value)} 
            className={`
              text-sm rounded-lg px-3 py-1.5 border outline-none
              ${isDark
                ? "bg-slate-800 border-slate-700 text-slate-200"
                : "bg-white border-slate-300"}
            `}
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

      {/* RIGHT : THEME TOGGLE */}
  {showThemeToggle && (
  <button
    onClick={() => setIsDark((v) => !v)}
    className={`
      flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs
      transition-all duration-300
      ${isDark
        ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
        : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"}
    `}
  >
    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    {isDark ? "LIGHT" : "DARK"}
  </button>
)}

    </div>
  );
}


