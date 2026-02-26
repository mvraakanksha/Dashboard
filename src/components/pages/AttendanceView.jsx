import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  CartesianGrid
} from "recharts";
import { useParams, useNavigate } from "react-router-dom";
import { Users, UserCheck, UserMinus, Activity } from "lucide-react";
import { getPlantById } from "../../services/plantService";
import { getEmployeeOperationsByDateRange } from "../../services/employeeService";
import { getEmployeesByPlant } from "../../services/employeeService";

const theme = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    barColor: "bg-blue-600",
    iconColor: "text-blue-600",
  },
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-100",
    barColor: "bg-rose-600",
    iconColor: "text-rose-600",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    barColor: "bg-emerald-600",
    iconColor: "text-emerald-600",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-100",
    barColor: "bg-amber-600",
    iconColor: "text-amber-600",
  },
};

const KPICard = ({ label, value, theme, icon }) => (
  <div className={`group relative overflow-hidden p-6 min-h-[170px] rounded-xl border ${theme.bg} ${theme.border} shadow-sm hover:shadow-md flex flex-col justify-center`}>
    
    <div className={`absolute bottom-0 left-0 h-1.5 w-full ${theme.barColor} origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />

    <div className="flex flex-col gap-3">
      <div className={`p-2 w-fit rounded-lg bg-white shadow-sm ${theme.iconColor}`}>
        {icon}
      </div>

      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="text-2xl font-black text-slate-900 mt-1">
          {value}
        </p>
      </div>
    </div>
  </div>
);
// ---------------- TOOLTIP ----------------
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;


  return (
    <div className="bg-white text-xs border p-2 rounded shadow-md max-w-xs">
      <p className="font-bold text-blue-700">{formatDisplay(label)}</p>

      {row.employees.map((e) => (
        <p key={e.employeeId}>
          {e.desination || e.designation || "Staff"}:{" "}
          <span className="font-semibold">
            AM {mark(e.att?.attendanceAm)} | PM {mark(e.att?.attendancePm)}
          </span>
        </p>
      ))}
    </div>
  );
};

/* ---------------- UTILITIES ---------------- */
const formatISO = (d) => new Date(d).toISOString().split("T")[0];

const formatDisplay = (iso) => {
  const dt = new Date(iso);
  return `${String(dt.getDate()).padStart(2, "0")}-${String(
    dt.getMonth() + 1
  ).padStart(2, "0")}-${dt.getFullYear()}`;
};

const subtractDays = (d, days) => {
  const x = new Date(d);
  x.setDate(x.getDate() - days);
  return x;
};
const mark = (v) => {
  if (v === true)
    return <span className="text-green-600 font-bold">✔</span>;

  if (v === false)
    return <span className="text-red-600 font-bold">✘</span>;

  return <span className="text-slate-400">-</span>;
};

const DateTick = ({ x, y, payload }) => {
  if (!payload?.value) return null;

  return (
    <text
      x={x}
      y={y + 10}
      textAnchor="end"
      fill="#1E3A8A"
      fontSize={11}
      fontWeight={600}
      transform={`rotate(-45 ${x} ${y + 10})`}
    >
      {formatDisplay(payload.value)}
    </text>
  );
};


/* ===================================================================== */
export default function AttendanceView() {
  const navigate = useNavigate();
  const { plantId } = useParams();

  /* ---------------- STATE ---------------- */

  const [employees, setEmployees] = useState([]);
  const [daywiseData, setDaywiseData] = useState([]);
const [plant, setPlant] = useState(null);

  const today = formatISO(new Date());
  const tenDaysBack = formatISO(subtractDays(new Date(), 10));

  const [fromDate, setFromDate] = useState(tenDaysBack);
  const [toDate, setToDate] = useState(today);



  /* ---------------- FETCH PLANT ---------------- */
useEffect(() => {
  const loadPlant = async () => {
    const data = await getPlantById(plantId);
    setPlant(data || null);
  };
  loadPlant();
}, [plantId]);

  /* ---------------- FETCH EMPLOYEES ---------------- */
useEffect(() => {
  const loadEmployees = async () => {
    const data = await getEmployeesByPlant(plantId);
    setEmployees(data || []);
  };
  loadEmployees();
}, [plantId]);

  /* ---------------- FETCH ATTENDANCE ---------------- */
  const fetchDaywise = async () => {
    try {
     const arr = await getEmployeeOperationsByDateRange(fromDate, toDate);

      const map = {};
      arr.forEach((r) => {
        if (String(r.plantId) !== String(plantId)) return;
        const date = r.plantOp?.operationDate;
        if (!date) return;
        if (!map[date]) map[date] = [];
        map[date].push(r);
      });

      const days = [];
      let d = new Date(fromDate);
      const end = new Date(toDate);

      while (d <= end) {
        const iso = formatISO(d);
        const recs = map[iso] || [];

        const emps = employees.map((emp) => {
          const op = recs.find((r) => r.employeeId === emp.employeeId);
          return {
            employeeId: emp.employeeId,
            designation: emp.designation || emp.desination || "Staff",
            att: {
              attendanceAm: op?.plantOp?.attendanceAm ?? null,
              attendancePm: op?.plantOp?.attendancePm ?? null
            }
          };
        });

        let presentUnits = 0;
        emps.forEach((e) => {
          const am = e.att.attendanceAm;
          const pm = e.att.attendancePm;

          if (am === true && pm === null) presentUnits += 1.0;
          else if (am === true && pm === true) presentUnits += 1.0;
          else if (am === true && pm === false) presentUnits += 0.5;
          else if (am === false && pm === true) presentUnits += 0.5;
        });

        days.push({
          date: iso,
          presentUnits,
          totalEmployees: employees.length,
          employees: emps
        });

        d.setDate(d.getDate() + 1);
      }

      setDaywiseData(days);
    } catch (err) {
      console.error("Attendance fetch failed", err);
      setDaywiseData([]);
    }
  };

useEffect(() => {
  if (!employees.length) return;
  fetchDaywise();
}, [employees, fromDate, toDate, plantId]);

  /* ---------------- KPI CALCULATIONS ---------------- */
  const totalEmployees = employees.length;
  const totalPresent = daywiseData.reduce((a, b) => a + b.presentUnits, 0);
  const noOfDays = daywiseData.length || 1;
  const totalAbsent = totalEmployees * noOfDays - totalPresent;
  const avgAttendance = Math.round(totalPresent / noOfDays);

  /* ---------------- BAR LABEL ---------------- */
  const BarTopLabel = ({ x, y, width, index }) => {
    const row = daywiseData[index];
    if (!row || row.presentUnits <= 0) return null;

    return (
      <text
        x={x + width / 2}
        y={y - 10}
        textAnchor="middle"
        fill="#013B88"
        fontSize={13}
        fontWeight={800}
      >
        {row.presentUnits} / {row.totalEmployees}
      </text>
    );
  };

  /* ---------------- SCROLL LOGIC ---------------- */
  const BAR_WIDTH = 45;
  const SCROLL_THRESHOLD = 20;

  const needsScroll = daywiseData.length > SCROLL_THRESHOLD;
  const chartWidth = needsScroll
    ? daywiseData.length * BAR_WIDTH
    : "100%";

  // =====================================================================
  return (
    <div className="p-6 bg-[#D9E6FF] min-h-screen">
      <button
        onClick={() => navigate("/attendance")}
        className="bg-red-600 text-white px-4 py-1 rounded mb-4"
      >
        Close
      </button>

    <h2 className="text-2xl font-bold text-blue-900 text-center mb-4 tracking-wide">
  Attendance – {plant?.plantName ?? "Loading..."} (PID: {plantId} – KLD: {plant?.kld ?? "-"})
</h2>


      {/* KPI + FILTERS */}
<div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">

  {/* KPI CARDS */}
  <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg border border-blue-100 p-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

      <KPICard
        label="Total Employees"
        value={totalEmployees}
        theme={theme.blue}
        icon={<Users size={18} />}
      />

      <KPICard
        label="Total Present Employees"
        value={totalPresent}
        theme={theme.emerald}
        icon={<UserCheck size={18} />}
      />

      <KPICard
        label="Total Absent Employees"
        value={totalAbsent}
        theme={theme.rose}
        icon={<UserMinus size={18} />}
      />

      <KPICard
        label="Average Attendance"
        value={avgAttendance}
        theme={theme.amber}
        icon={<Activity size={18} />}
      />

    </div>
  </div>

  {/* DATE FILTER */}
  <div className="bg-white rounded-xl shadow-md p-4 space-y-3">
    <label className="text-xs font-semibold text-gray-700">From</label>
    <input
      type="date"
      value={fromDate}
      onChange={(e) => setFromDate(e.target.value)}
      className="border p-2 rounded w-full"
    />

    <label className="text-xs font-semibold text-gray-700">To</label>
    <input
      type="date"
      value={toDate}
      onChange={(e) => setToDate(e.target.value)}
      className="border p-2 rounded w-full"
    />

    <button
      onClick={fetchDaywise}
      className="bg-blue-700 text-white py-2 rounded-lg font-semibold w-full hover:bg-blue-800 transition"
    >
      GET
    </button>
  </div>

</div>

      {/* ================= CHART ================= */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className={needsScroll ? "overflow-x-auto" : ""}>
          <div style={{ width: chartWidth, height: 420 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={daywiseData}
                margin={{ top: 40, right: 30, left: 60, bottom: 90 }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
  dataKey="date"
  interval={0}
  height={80}
  tick={<DateTick />}
/>


                <YAxis
                  domain={[0, 6]}
                  ticks={[0, 1, 2, 3, 4, 5, 6]}
                  allowDecimals={false}
                   label={{
                                        value: "No. of Employees",
                                        angle: -90,
                                        position: "insideLeft",
                                        dy: 60,
                                        style: {
                                            fill: "#1E3A8A", 
                                            fontSize: 14, 
                                            fontWeight: 600
                                        }
                                    }}

                />

                <Tooltip content={<CustomTooltip />} />

                <Bar dataKey="presentUnits" fill="#032d7cff" barSize={30}>
                  <LabelList content={BarTopLabel} />
                </Bar>
                
              </BarChart>
               
            </ResponsiveContainer>
            
          </div>
          <p className="text-center text-lg font-bold text-gray-700 mt-3">
        Dates
      </p>
        </div>
      </div>
    </div>
  );
}

