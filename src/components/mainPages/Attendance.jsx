import React, { useState, useEffect, useMemo, useCallback,useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LabelList, CartesianGrid, Label
} from "recharts";
import { useNavigate } from "react-router-dom";
import { Users, UserCheck, UserMinus, Activity } from "lucide-react";

import { getAllPlants } from "../../services/plantService";
import {
  getEmployeesByPlant,
  getEmployeeOperationsByDate
} from "../../services/employeeService";

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
      fontSize={11}
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
    <div className={`p-2 rounded shadow-lg border text-xs ${
      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-800"
    }`}>
      <p className="font-bold text-blue-500 mb-1">PID: {plant.plantId} - {plant.label} - {plant.kld} KLD</p>
      {plant.employees.map((e) => {
        const op = plant.attendance.find(x => x.employeeId === e.employeeId);
        return (
          <p key={e.employeeId} className="border-t pt-1 mt-1">
            {e.designation}:
            <span className="font-semibold">
              {" "}AM {mark(op?.plantOp?.attendanceAm)} | PM {mark(op?.plantOp?.attendancePm)}
            </span>
          </p>
        );
      })}
    </div>
  );
};


/* ================= MAIN ================= */
export default function Attendance({ isDark, date, zone }) {
  const navigate = useNavigate();

  const [plants, setPlants] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendanceOps, setAttendanceOps] = useState([]);
const [attendanceSortMode, setAttendanceSortMode] =
  useState("attendanceDesc");

  const abortRef = useRef(null);

  /* ---------- LOAD PLANTS ---------- */
  useEffect(() => {
    getAllPlants().then(setPlants).catch(console.error);
  }, []);

  /* ---------- LOAD ATTENDANCE ---------- */
  useEffect(() => {
    if (!date) return;
    getEmployeeOperationsByDate(date)
      .then(setAttendanceOps)
      .catch(console.error);
  }, [date]);

  /* ---------- LOAD EMPLOYEES (PER PLANT) ---------- */
useEffect(() => {
  abortRef.current?.abort();
  abortRef.current = new AbortController();
  const signal = abortRef.current.signal;

  const run = async () => {
    try {
      const plantsData = await getAllPlants({ signal });
      setPlants(plantsData);

      if (!date) return;

      const attendance = await getEmployeeOperationsByDate(date, { signal });
      setAttendanceOps(attendance);

      // 🔥 parallel employee fetch
      const employeesData = await Promise.all(
        plantsData.map(p =>
          getEmployeesByPlant(p.plantID, { signal }).then(arr =>
            arr.map(e => ({ ...e, plantId: p.plantID }))
          )
        )
      );

      setEmployees(employeesData.flat());
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error(err);
      }
    }
  };

  run();

  return () => abortRef.current?.abort();
}, [date]);


  /* ---------- CALCULATE PER PLANT ---------- */
const employeesByPlant = useMemo(() => {
  const map = {};
  employees.forEach(e => {
    (map[e.plantId] ||= []).push(e);
  });
  return map;
}, [employees]);

const attendanceByPlant = useMemo(() => {
  const map = {};
  attendanceOps.forEach(o => {
    (map[o.plantId] ||= []).push(o);
  });
  return map;
}, [attendanceOps]);


const calculatePlant = useCallback(
  (plantId) => {
    const emps = employeesByPlant[plantId] || [];
    const ops  = attendanceByPlant[plantId] || [];

    let presentUnits = 0;

    emps.forEach(emp => {
      const rec = ops.find(o => o.employeeId === emp.employeeId);

      if (
        rec?.plantOp?.attendanceAm === true &&
        (rec?.plantOp?.attendancePm === null ||
         rec?.plantOp?.attendancePm === true)
      ) {
        presentUnits += 1;
      } else if (
        rec?.plantOp?.attendanceAm === true ||
        rec?.plantOp?.attendancePm === true
      ) {
        presentUnits += 0.5;
      }
    });

    return { presentUnits, employees: emps, attendance: ops };
  },
  [employeesByPlant, attendanceByPlant]
);


  /* ---------- BUILD CHART DATA ---------- */
const allPlantsData = useMemo(() => {
  return plants
    .filter(p => zone === "All" || String(p.zones) === String(zone))
    .map(p => {
      const stats = calculatePlant(p.plantID);
      return {
        label: p.plantName,
        plantId: p.plantID,
        kld: p.kld,
        presentUnits: stats.presentUnits,
        employees: stats.employees,
        attendance: stats.attendance,
        totalEmployees: p.noOfEmployees ?? stats.employees.length
      };
    });
}, [plants, zone, calculatePlant]);


  const sortedAttendanceData = useMemo(() => {
  const data = [...allPlantsData];

  switch (attendanceSortMode) {
    case "plantId":
      return data.sort((a, b) => a.plantId - b.plantId);

    case "attendanceDesc":
    default:
      return data.sort((a, b) => b.presentUnits - a.presentUnits);
  }
}, [allPlantsData, attendanceSortMode]);



  /* ---------- KPIs ---------- */
  const totalEmployees = allPlantsData.reduce((s, p) => s + p.totalEmployees, 0);
  const totalPresent = allPlantsData.reduce((s, p) => s + p.presentUnits, 0);
  const totalAbsent = totalEmployees - totalPresent;
  const avgAttendance = allPlantsData.length
    ? (totalPresent / allPlantsData.length).toFixed(1)
    : 0;

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
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-2">
                <div className={`p-3 rounded-2xl ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-600 text-white"}`}>
                    <Activity className="w-6 h-6" />
                </div>
                <h2 className={`text-2xl font-black tracking-tight uppercase ${isDark ? "text-slate-100" : "text-blue-900"}`}>
                    Attendance Analytics
                </h2>
            </div>

            {/* KPI ROW WITH DYNAMIC COLORS AND DOWN BAR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
  { label: "Total Strength", value: totalEmployees, icon: <Users />, themeKey: "blue" },
  { label: "Total Present", value: totalPresent, icon: <UserCheck />, themeKey: "emerald" },
  { label: "Total Absent", value: totalAbsent, icon: <UserMinus />, themeKey: "rose" },
  { label: "Avg Per Plant", value: avgAttendance, icon: <Activity />, themeKey: "amber" }
].map((c, i) => {
  const theme = METRIC_THEMES(isDark)[c.themeKey];

  return (
    <div
      key={i}
      className={`group relative overflow-hidden p-5 rounded-2xl transition-all ${theme.staticBg}`}
    >
      {/* Bottom Bar */}
      <div
        className={`absolute bottom-0 left-0 h-1 w-full ${theme.bar}
          scale-x-0 origin-left transition-transform duration-500 ease-out
          group-hover:scale-x-100`}
      />

      {/* ICON */}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${theme.iconHoverBg} ${theme.text}`}>
        {c.icon}
      </div>

      {/* LABEL */}
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        {c.label}
      </p>

      {/* VALUE */}
      <p className={`text-xl font-black mt-1 ${theme.text}`}>
        {c.value}
      </p>
    </div>
  );
})}
            </div>

            {/* GRAPH SECTION WITH LABELS */}
            <div className={`p-6 rounded-[2rem] border bg-white border-slate-100 shadow-xl"}`}>
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
                    <div style={{ width: zone === "All" ? allPlantsData.length * 80 : "100%", minWidth: "100%" }}>
                 
   


                        <ResponsiveContainer width="100%" height={450}>
                            <BarChart data={sortedAttendanceData} margin={{ top: 40, right: 30, left: 40, bottom: 100 }}>

                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#e2e8f0"} />
                                
                                <XAxis 
                                    dataKey="label" 
                                    interval={0} 
                                    height={80}
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