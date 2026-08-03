import React, { useState, useEffect, useMemo, useCallback,useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LabelList, CartesianGrid, Label
} from "recharts";
import { useNavigate } from "react-router-dom";
import { Users, UserCheck, UserMinus, Activity , Layers} from "lucide-react";

import { getAllPlants } from "../../services/plantService";
import {
  getEmployeesByPlant,
  getEmployeeOperationsByDate,
  getDeletedEmployeesByPlantAndDate,
  getEmployeeOperationsByDateRangeFull

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

    {plant.employees
      .filter((e) => {
        if (!e.dateOfJoining) return false;

        // ✅ exclude future joiners
        if (e.dateOfJoining > plant.date) return false;

        // ✅ exclude employees already left
        if (e.dateOfLeaving && e.dateOfLeaving < plant.date) return false;

        return true;
      })
      .map((e) => {
        const key = `${e.employeeId}_${e.dateOfJoining}`;
        const op = plant.attendanceMap?.[key];

        return (
          <p key={key} className="border-t pt-1 mt-1">
            <span className="font-medium">{e.designation}</span>:
            <span className="font-semibold">
              {" "}AM {mark(op?.plantOp?.attendanceAm)} | PM{" "}
              {mark(op?.plantOp?.attendancePm)}
            </span>
          </p>
        );
      })}
  </div>
);

};


/* ================= MAIN ================= */
export default function Attendance({ isDark, date, zone, selectedPlants }) {
  const navigate = useNavigate();

  const [plants, setPlants] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendanceOps, setAttendanceOps] = useState([]);
const [historyOps, setHistoryOps] = useState([]);

const [attendanceSortMode, setAttendanceSortMode] =
  useState("attendanceDesc");

  const abortRef = useRef(null);

  
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
const history = await getEmployeeOperationsByDateRangeFull(date, date);
setHistoryOps(history);

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

const isEmployeeValid = (emp, selectedDate) => {
  if (!emp.dateOfJoining) return false;

  const doj = emp.dateOfJoining;
  const dol = emp.dateOfLeaving;

  if (doj > selectedDate) return false;

  if (dol && dol < selectedDate) return false;

  return true;
};
  /* ---------- CALCULATE PER PLANT ---------- */
const employeesByPlant = useMemo(() => {
  const map = {};

employees.forEach(e => {
  if (!isEmployeeValid(e, date)) return;

  const key = `${e.employeeId}_${e.dateOfJoining}`;

  map[e.plantId] ||= [];

  if (!map[e.plantId].some(
    x => `${x.employeeId}_${x.dateOfJoining}` === key
  )) {
    map[e.plantId].push(e);
  }
});
  // 🔥 ADD EXIT EMPLOYEES FROM HISTORY
  historyOps.forEach(op => {
    const emp = {
      employeeId: op.employeeId,
      plantId: op.plantId,
      employeeName: op.employeeName,
      designation: op.designation,
      dateOfJoining: op.dateOfJoining,
      dateOfLeaving: op.dateOfLeaving
    };

    if (!isEmployeeValid(emp, date)) return;

    const key = `${emp.employeeId}_${emp.dateOfJoining}`;
map[op.plantId] ||= [];

if (!map[op.plantId].some(e => `${e.employeeId}_${e.dateOfJoining}` === key)) {
  map[op.plantId].push(emp);
}
  });

  return map;
}, [employees, historyOps, date]);

const attendanceByPlant = useMemo(() => {
  const map = {};
attendanceOps.forEach(o => {
  const empList = employeesByPlant[o.plantId] || [];

  const isValid = empList.some(
    e => e.employeeId === o.employeeId
  );

  if (isValid) {
    (map[o.plantId] ||= []).push(o);
  }
});
  return map;
}, [attendanceOps]);

// const empLookup = useMemo(() => {
//   const map = {};

//   employees.forEach(e => {
//     map[e.employeeId] = e;
//   });

//   historyOps.forEach(e => {
//     map[e.employeeId] = e;
//   });

//   return map;
// }, [employees, historyOps]);

/* ---------- ATTENDANCE MAP ---------- */
const attendanceMap = useMemo(() => {
  const map = {};

  // ACTIVE
attendanceOps.forEach(o => {
  const empList = employeesByPlant[o.plantId] || [];

  empList.forEach(emp => {
    if (emp.employeeId === o.employeeId) {
      const key = `${emp.employeeId}_${emp.dateOfJoining}`;
      map[key] = o;
    }
  });
});
historyOps.forEach(o => {
  const key = `${o.employeeId}_${o.dateOfJoining}`;

  const validOp = (o.operations || []).find(op => {
    if (!o.dateOfLeaving) return true;

    return op.operationDate <= o.dateOfLeaving;
  });

  if (validOp) {
    map[key] = {
      plantOp: validOp
    };
  }
});
  return map;
}, [attendanceOps, historyOps]);


const calculatePlant = useCallback(
  (plantId) => {
    const emps = employeesByPlant[plantId] || [];
    const ops = attendanceByPlant[plantId] || [];

    let presentUnits = 0;

    emps.forEach(emp => {
     const key = `${emp.employeeId}_${emp.dateOfJoining}`;
const rec = attendanceMap[key];

      if (!isEmployeeValid(emp, date)) return;

      if (emp.dateOfLeaving && emp.dateOfLeaving < date) return;

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

    return {
      presentUnits,
      employees: emps,
      attendance: ops   // ✅ FIX
    };
  },
  [employeesByPlant, attendanceMap, attendanceByPlant, date]
);


  /* ---------- BUILD CHART DATA ---------- */
const allPlantsData = useMemo(() => {
  return plants
    .filter((p) => {
      const zoneMatch =
        zone === "All" ||
        String(p.zones) === String(zone);

      const plantMatch =
        selectedPlants.length === 0 ||
        selectedPlants.includes(p.plantID);

      return zoneMatch && plantMatch;
    })
    .map((p) => {
      const stats = calculatePlant(p.plantID);

      return {
        label: p.plantName,
        plantId: p.plantID,
        kld: p.kld,
        presentUnits: stats.presentUnits,
        employees: stats.employees,
        attendance: stats.attendance,
        attendanceMap,
        date,

        totalEmployees: stats.employees.filter((e) =>
          isEmployeeValid(e, date)
        ).length,
      };
    });
}, [
  plants,
  zone,
  selectedPlants,
  calculatePlant,
  attendanceMap,
  date,
]);

const totalPlants = allPlantsData.length;

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

/* ---------------- ENTRY COUNT ---------------- */
const entryCount = useMemo(() => {
  if (!sortedAttendanceData?.length) return 0;

  return sortedAttendanceData.filter(
    p => Number(p.presentUnits) > 0
  ).length;

}, [sortedAttendanceData]);
  /* ---------- KPIs ---------- */
/* ---------- KPIs (CORRECT LOGIC) ---------- */

const zonePlantIds = useMemo(() => {
  return plants
    .filter((p) => {
      const zoneMatch =
        zone === "All" ||
        String(p.zones) === String(zone);

      const plantMatch =
        selectedPlants.length === 0 ||
        selectedPlants.includes(p.plantID);

      return zoneMatch && plantMatch;
    })
    .map((p) => p.plantID);
}, [plants, zone, selectedPlants]);

const zoneEmployees = useMemo(() => {
  return zonePlantIds.flatMap(pid => employeesByPlant[pid] || []);
}, [employeesByPlant, zonePlantIds]);

/* ---------- DESIGNATION SUMMARY ---------- */
/* ---------- DESIGNATION SUMMARY (CORRECT HALF DAY LOGIC) ---------- */
const designationSummary = useMemo(() => {
  const summary = {};

const zonePlantIds = plants
  .filter((p) => {
    const zoneMatch =
      zone === "All" ||
      String(p.zones) === String(zone);

    const plantMatch =
      selectedPlants.length === 0 ||
      selectedPlants.includes(p.plantID);

    return zoneMatch && plantMatch;
  })
  .map((p) => p.plantID);

const zoneEmployees = zonePlantIds.flatMap(
  pid => employeesByPlant[pid] || []
);

zoneEmployees.forEach(emp => {
  if (!isEmployeeValid(emp, date)) return;

  const key = `${emp.employeeId}_${emp.dateOfJoining}`;
  const rec = attendanceMap[key];

  if (!summary[emp.designation]) {
    summary[emp.designation] = { present: 0, absent: 0 };
  }

  // 🔥 DEFAULT: fully absent
  let presentValue = 0;

  // ✅ Only calculate if valid record exists
  if (rec?.plantOp) {
    const opDate = rec.plantOp.operationDate;

    // 🔥 Ignore operations AFTER leaving
    if (emp.dateOfLeaving && opDate > emp.dateOfLeaving) {
      presentValue = 0;
    } else {
      if (
        rec.plantOp.attendanceAm === true &&
        (rec.plantOp.attendancePm === null ||
         rec.plantOp.attendancePm === true)
      ) {
        presentValue = 1;
      } else if (
        rec.plantOp.attendanceAm === true ||
        rec.plantOp.attendancePm === true
      ) {
        presentValue = 0.5;
      }
    }
  }

  summary[emp.designation].present += presentValue;
  summary[emp.designation].absent += (1 - presentValue);
});

  return summary;
}, [
  employees,
  attendanceMap,
  plants,
  zone,
  selectedPlants,
  employeesByPlant,
  date,
]);

const strengthSummary = useMemo(() => {
  const summary = {};

  // init all designations
  DESIGNATION_ORDER.forEach(d => {
    summary[d] = 0;
  });

  // ✅ only zone plants
const zonePlantIds = plants
  .filter((p) => {
    const zoneMatch =
      zone === "All" ||
      String(p.zones) === String(zone);

    const plantMatch =
      selectedPlants.length === 0 ||
      selectedPlants.includes(p.plantID);

    return zoneMatch && plantMatch;
  })
  .map((p) => p.plantID);

  const zoneEmployees = zonePlantIds.flatMap(
    pid => employeesByPlant[pid] || []
  );

  zoneEmployees.forEach(emp => {
    if (!isEmployeeValid(emp, date)) return;

    if (summary.hasOwnProperty(emp.designation)) {
      summary[emp.designation] += 1;
    }
  });

  return summary;
}, [
  employeesByPlant,
  plants,
  zone,
  selectedPlants,
  date,
]);

const totalEmployees = zoneEmployees.length;

const totalPresent = zoneEmployees.reduce((sum, emp) => {
  if (!isEmployeeValid(emp, date)) return sum;

  const key = `${emp.employeeId}_${emp.dateOfJoining}`;
  const rec = attendanceMap[key];

  let presentValue = 0; // ✅ default absent

  if (rec?.plantOp) {
    const opDate = rec.plantOp.operationDate;

    if (emp.dateOfLeaving && opDate > emp.dateOfLeaving) {
      presentValue = 0;
    } else {
      if (
        rec.plantOp.attendanceAm === true &&
        (rec.plantOp.attendancePm === null ||
         rec.plantOp.attendancePm === true)
      ) {
        presentValue = 1;
      } else if (
        rec.plantOp.attendanceAm === true ||
        rec.plantOp.attendancePm === true
      ) {
        presentValue = 0.5;
      }
    }
  }

  return sum + presentValue;

}, 0);

const totalAbsent = totalEmployees - totalPresent;

const avgAttendance = zonePlantIds.length
  ? (totalPresent / zonePlantIds.length).toFixed(1)
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
              const present = designationSummary[desig]?.present || 0;
              const absent = designationSummary[desig]?.absent || 0;
              const strength = strengthSummary[desig] || 0;

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