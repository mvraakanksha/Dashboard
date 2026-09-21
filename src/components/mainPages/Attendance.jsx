import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LabelList, CartesianGrid, Label
} from "recharts";
import { useNavigate } from "react-router-dom";
import { Users, UserCheck, UserMinus, Activity , Layers} from "lucide-react";

import { getAllPlants } from "../../services/plantService";
// import {
//   getEmployeesByPlant,
//   getEmployeeOperationsByDate,
//   getDeletedEmployeesByPlantAndDate,
//   getEmployeeOperationsByDateRangeFull

// } from "../../services/employeeService";

import {
  getAttendanceSummaryPlantWise, getAttendanceDashboardDesignation,
} from "../../services/employeeService";

// import { getAttendanceDashboard } from "../../services/dashboardService";

/* ---------------- UTIL ---------------- */
const mark = (v) => {
  if (v === true)
    return <span className="text-green-600 font-bold">✔</span>;

  if (v === false)
    return <span className="text-red-600 font-bold">✘</span>;

  return <span className="text-slate-400">-</span>;
};


/* ---------------- METRIC THEMES ---------------- */
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
  amber: {
    text: isDark ? "text-amber-400" : "text-amber-600",
    staticBg: isDark ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200",
    bar: "bg-amber-500",
    iconHoverBg: isDark ? "bg-amber-500/20" : "bg-amber-50"
  }
});

/* ---------------- X TICK ---------------- */
const ClickableTick = ({ x, y, payload, plantMap, onPlantClick, isDark }) => {
  const label = payload?.value;
  const plant = plantMap[label];

  return (
    <text
      x={x}
      y={y + 10}
      textAnchor="end"
      fill={isDark ? "#94a3b8" : "#003f8a"}
      fontSize={window.innerWidth < 640 ? 9 : 11}
      fontWeight={600}
      transform={`rotate(-45 ${x} ${y + 10})`}
      style={{ cursor: "pointer", textDecoration: "underline" }}
      onClick={() => plant && onPlantClick(plant)}
    >
      {label}
    </text>
  );
};

/* ---------------- TOOLTIP ---------------- */
const CustomTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;
  const plant = payload[0].payload;

return (
  <div
    className={`p-2 rounded shadow-lg border text-xs ${
      isDark
        ? "bg-slate-800 border-slate-700 text-white"
        : "bg-white border-slate-200 text-slate-800"
    }`}
  >
    <p className="font-bold text-blue-500 mb-1">
      PID: {plant.plantId} - {plant.label} - {plant.kld} KLD
    </p>

    {plant.employees.map(emp => (

<p
 key={emp.employeeId}
 className="border-t pt-1 mt-1"
>

<span className="font-medium">
{emp.designation}
</span>

<span className="font-semibold">
 AM {mark(emp.attendanceAm)}
 |
 PM {mark(emp.attendancePm)}
</span>

</p>

))}
  </div>
);

};


/* ================= MAIN ================= */
export default function Attendance({ isDark, date, zone, selectedPlants }) {
  const navigate = useNavigate();

  const [plants, setPlants] = useState([]);
//   const [employees, setEmployees] = useState([]);
//   const [attendanceOps, setAttendanceOps] = useState([]);
// const [historyOps, setHistoryOps] = useState([]);
const [attendanceSummary, setAttendanceSummary] = useState([]);
const [designationSummary, setDesignationSummary] = useState(null);
const [attendanceSortMode, setAttendanceSortMode] =
  useState("attendanceDesc");

  // const abortRef = useRef(null);

  
const DESIGNATION_ORDER = [
  "Supervisor",
  "Operator",
  "Driver",
  "Helper",
  "Security Guard"
];

  /* ---------- LOAD PLANTS ---------- */
  useEffect(() => {
    getAllPlants().then(setPlants).catch(console.error);
  }, []);

  /* ---------- LOAD ATTENDANCE ---------- */
// useEffect(() => {
//   abortRef.current?.abort();
//   ...
// }, [date]);
  /* ---------- LOAD EMPLOYEES (PER PLANT) ---------- */
// useEffect(() => {
//   abortRef.current?.abort();
//   abortRef.current = new AbortController();
//   const signal = abortRef.current.signal;

//   const run = async () => {
//     try {
//       const plantsData = await getAllPlants({ signal });
//       setPlants(plantsData);

//       if (!date) return;

//       const attendance = await getEmployeeOperationsByDate(date, { signal });
//       setAttendanceOps(attendance);

//       // 🔥 parallel employee fetch
//       const employeesData = await Promise.all(
//         plantsData.map(p =>
//           getEmployeesByPlant(p.plantID, { signal }).then(arr =>
//             arr.map(e => ({ ...e, plantId: p.plantID }))
//           )
//         )
//       );
// const history = await getEmployeeOperationsByDateRangeFull(date, date);
// setHistoryOps(history);

//       setEmployees(employeesData.flat());
//     } catch (err) {
//       if (err.name !== "AbortError") {
//         console.error(err);
//       }
//     }
//   };

//   run();

//   return () => abortRef.current?.abort();
// }, [date]);

useEffect(() => {
  if (!date) return;

  const loadData = async () => {
    try {

      const [kpiData, graphData] =
        await Promise.all([

          getAttendanceDashboardDesignation({
            date,
            zone,
            plantIds: selectedPlants,
          }),

          getAttendanceSummaryPlantWise({
            date,
            zone,
            plantIds: selectedPlants,
          })

        ]);

     setDesignationSummary(kpiData);
setAttendanceSummary(graphData.plants || []);

    } catch (err) {
      console.error(err);
      setDesignationSummary(null);
      setAttendanceSummary([]);
    }
  };

  loadData();

}, [date, zone, selectedPlants]);

const allPlantsData = useMemo(() => {
  return attendanceSummary.map(item => ({
    label: item.plantName,
    plantId: item.plantId,
    kld: item.kld,
    presentUnits: item.presentEmployees,
    totalEmployees: item.totalEmployees,
    employees: item.employees || [],
  }));
}, [attendanceSummary]);

const sortedAttendanceData = useMemo(() => {
  const data = [...allPlantsData];

  switch (attendanceSortMode) {
    case "plantId":
      return data.sort((a, b) => a.plantId - b.plantId);

    default:
      return data.sort((a, b) => b.presentUnits - a.presentUnits);
  }
}, [allPlantsData, attendanceSortMode]);

const entryCount = useMemo(() => {
  return sortedAttendanceData.filter(
    p => Number(p.presentUnits) > 0
  ).length;
}, [sortedAttendanceData]);

// const strengthSummary = useMemo(() => {
//   const summary = {};

//   // init all designations
//   DESIGNATION_ORDER.forEach(d => {
//     summary[d] = 0;
//   });

//   // ✅ only zone plants
// const zonePlantIds = plants
//   .filter((p) => {
//     const zoneMatch =
//       zone === "All" ||
//       String(p.zones) === String(zone);

//     const plantMatch =
//       selectedPlants.length === 0 ||
//       selectedPlants.includes(p.plantID);

//     return zoneMatch && plantMatch;
//   })
//   .map((p) => p.plantID);

//   const zoneEmployees = zonePlantIds.flatMap(
//     pid => employeesByPlant[pid] || []
//   );

//   zoneEmployees.forEach(emp => {
//     if (!isEmployeeValid(emp, date)) return;

//     if (summary.hasOwnProperty(emp.designation)) {
//       summary[emp.designation] += 1;
//     }
//   });

//   return summary;
// }, [
//   employeesByPlant,
//   plants,
//   zone,
//   selectedPlants,
//   date,
// ]);

const totalPlants =
  designationSummary?.totalPlants || 0;

const totalEmployees =
  designationSummary?.totalStrength?.total || 0;

const totalPresent =
  designationSummary?.totalPresent?.total || 0;

const totalAbsent =
  designationSummary?.totalAbsent?.total || 0;

const avgAttendance =
  designationSummary?.avgPerPlant || 0;

const plantMap = useMemo(() => {
  return Object.fromEntries(
    allPlantsData.map(p => [p.label, p])
  );
}, [allPlantsData]);

  /* ---------- BAR LABEL ---------- */
const renderBarLabel = useCallback(({ x, y, width, index }) => {
  const row = sortedAttendanceData[index];
  if (!row) return null;

  return (
    <text
      x={x + width / 2}
      y={y - 10}
      textAnchor="middle"
      fill={isDark ? "#60a5fa" : "#013B88"}
      fontSize={11}
      fontWeight={800}
    >
      {row.presentUnits}/{row.totalEmployees}
    </text>
  );
}, [sortedAttendanceData, isDark]);



    return (
      
       <div className="min-h-screen p-6 bg-gradient-to-br from-[#CFE2FF] via-[#BBD8FE] to-[#013B88]">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-2">
                <div className={`p-3 rounded-2xl ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-600 text-white"}`}>
                    <Activity className="w-6 h-6" />
                </div>
                <h2 className={`text-xl sm:text-2xl font-black tracking-tight uppercase ${isDark ? "text-slate-100" : "text-blue-900"}`}>
                    Attendance Analytics
                </h2>
            </div>

            {/* KPI ROW WITH DYNAMIC COLORS AND DOWN BAR */}
{/* ================= PREMIUM KPI CARDS ================= */}
 <div className="rounded-2xl p-5 sm:p-4 sm:p-6 bg-white shadow-lg mb-5">
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 ">

  {[
     { label: "Total Plants", value: totalPlants, icon: <Layers/>, themeKey: "amber" },
    { label: "Total Strength", value: totalEmployees, icon: <Users />, themeKey: "blue", type: "strength" },
    { label: "Total Present", value: totalPresent, icon: <UserCheck />, themeKey: "emerald", type: "present" },
    { label: "Total Absent", value: totalAbsent, icon: <UserMinus />, themeKey: "rose", type: "absent" },
    { label: "Avg Per Plant", value: avgAttendance, icon: <Activity />, themeKey: "amber" }
  ].map((c, i) => {
    const theme = METRIC_THEMES(isDark)[c.themeKey];

    return (
      
      <div
  key={i}
  className={`group relative overflow-hidden rounded-2xl p-3 sm:p-4 shadow-md hover:shadow-xl transition-all border ${theme.staticBg}`}
>
        {/* Bottom Animated Bar */}
        <div
          className={`absolute bottom-0 left-0 h-1 w-full ${theme.bar}
          scale-x-0 origin-left transition-transform duration-500
          group-hover:scale-x-100`}
        />

        {/* ICON */}
        <div className={`absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center ${theme.iconHoverBg} ${theme.text}`}>
          {c.icon}
        </div>

        {/* LABEL */}
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
          {c.label}
        </p>

        {/* VALUE */}
        <p className={`text-2xl sm:text-3xl font-extrabold mt-2 ${theme.text}`}>
          {c.value}
        </p>

        {/* DESIGNATION BREAKDOWN */}
        {(c.type === "present" || c.type === "absent" || c.type === "strength") && (
          <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
            {DESIGNATION_ORDER.map((desig) => {
              const present =
  designationSummary?.totalPresent?.designation
    ?.find(d => d.designation === desig)
    ?.count || 0;
              const absent =
  designationSummary?.totalAbsent?.designation
    ?.find(d => d.designation === desig)
    ?.count || 0;
             const strength =
  designationSummary?.totalStrength?.designation
    ?.find(d => d.designation === desig)
    ?.count || 0;

              let value = 0;

              if (c.type === "present") value = present;
              if (c.type === "absent") value = absent;
              if (c.type === "strength") value = strength;

              return (
                <div
                  key={desig}
                  className="flex justify-between text-xs font-medium text-slate-800"
                >
                  <span>{desig}</span>
                  <span className="font-bold text-slate-800">
                    {typeof value === "number" ? value.toFixed(1) : value}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  })}
</div>
</div>

            {/* GRAPH SECTION WITH LABELS */}
           {/* GRAPH SECTION WITH LABELS */}
<div className="p-4 sm:p-6 rounded-3xl border bg-white border-slate-100 shadow-xl">

  <div className="flex items-center gap-3 mb-3">
    <h3 className="font-bold text-blue-900 text-lg">
      Attendance Overview
    </h3>

    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">
      Entries: {entryCount}
    </span>
  </div>
                            <div className="flex justify-end mb-3">
  <div className="flex-col justify-end">
    <span className="text-xs font-semibold text-slate-500">
      Sort by 
    </span>

    <select
  value={attendanceSortMode}
  onChange={(e) => setAttendanceSortMode(e.target.value)}
  className={`border rounded-md px-2 py-1 text-xs font-semibold outline-none "bg-slate-800 border-slate-700 text-slate-200"`}
>
  <option value="attendanceDesc">
    Attendance
  </option>
  <option value="plantId">
    Plant ID
  </option>
</select>

  </div>
</div>
                <div className="overflow-x-auto">
                    <div
  style={{
    width: zone === "All" ? Math.max(allPlantsData.length * 70, 600) : "100%"
  }}
>
                 
   


                        <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 320 : 450}>
                            <BarChart data={sortedAttendanceData} margin={{ top: 40, right: 30, left: 40, bottom: 100 }}>

                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#e2e8f0"} />
                                
                                <XAxis 
                                    dataKey="label" 
                                    interval={0} 
                                    height={window.innerWidth < 640 ? 100 : 80}
                                    tick={(props) => <ClickableTick {...props} plantMap={plantMap} onPlantClick={(p) => navigate(`/attendance-view/${p.plantId}`)} isDark={isDark} />} 
                                >
                                    {/* <Label value="FSTP PLANTS" offset={-60} position="insideBottom" fill={isDark ? "#94a3b8" : "#475569"} fontSize={12} fontWeight={800} /> */}
                                </XAxis>

                                <YAxis stroke={isDark ? "#64748b" : "#475569"} fontSize={12} domain={[0, 6]}
                                ticks={[0, 1, 2, 3, 4, 5, 6]}
                                allowDecimals={false}>
                                  
                                  
                                    <Label value="PRESENT COUNT" angle={-90} position="insideLeft" offset={-10} style={{ textAnchor: 'middle', fill: isDark ? '#94a3b8' : '#475569', fontSize: '12px', fontWeight: 800 }} />
                                </YAxis>

                                <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={{ fill: isDark ? "#1e293b" : "#f1f5f9" }} />
                                
                                <Bar dataKey="presentUnits" fill={isDark ? "#3b82f6" : "#013B88"} barSize={30}>
                                    <LabelList content={renderBarLabel} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                   {/* ===== STATIC X-AXIS LABEL BELOW ===== */}
                <div className="text-center mt-2 text-[#1E3A8A] text-[18px] font-semibold">
                    Plants
                </div>
            </div>
        </div>
    );
}