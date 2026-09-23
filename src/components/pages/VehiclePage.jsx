import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Truck,
  Navigation,
  Milestone,
  Activity,
  Layers,
} from "lucide-react";

import { useParams, useNavigate } from "react-router-dom";
import { getVehicleOperationsDashboardByDateRange } from "../../services/vehicleService";

/* ---------------- UTILITIES ---------------- */

const formatDate = (d) =>
  new Date(d).toISOString().split("T")[0];

const subtractDays = (d, days) => {
  const x = new Date(d);
  x.setDate(x.getDate() - days);
  return x;
};

const formatDateDisplay = (iso) => {
  const dt = new Date(iso);

  return `${String(dt.getDate()).padStart(2, "0")}-${String(
    dt.getMonth() + 1
  ).padStart(2, "0")}-${dt.getFullYear()}`;
};

const formatIndianRounded = (num) =>
  new Intl.NumberFormat("en-IN").format(Math.round(Number(num) || 0));

/* ---------------- TOOLTIP ---------------- */

const DaywiseTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const d = payload[0].payload;

  const formatOneDecimal = (val) =>
    val != null ? Number(val).toFixed(1) : "0.0";

  return (
    <div className="bg-white border rounded shadow-md p-3 text-xs w-72">
      <p className="font-bold text-blue-900">
        {formatDateDisplay(d.date)}
      </p>

      {d.v1 && (
        <>
          <p className="mt-1 font-semibold text-blue-400">
            Vehicle 1 – {d.v1.vehicleNumber}
          </p>

          <p>
            Distance: {formatOneDecimal(d.v1.distance)} Km
          </p>

          <p>
            Fuel: {d.v1.fuel ?? "-"}
          </p>

          <p>
            No. of Trips: {d.v1.trips ?? 0}
          </p>

          <p>
            Sludge Collected: {d.v1.sludge ?? 0} L
          </p>
        </>
      )}

      {d.v2 && (
        <>
          <p className="mt-2 font-semibold text-blue-900">
            Vehicle 2 – {d.v2.vehicleNumber}
          </p>

          <p>
            Distance: {formatOneDecimal(d.v2.distance)} Km
          </p>

          <p>
            Fuel: {d.v2.fuel ?? "-"}
          </p>

          <p>
            No. of Trips: {d.v2.trips ?? 0}
          </p>

          <p>
            Sludge Collected: {d.v2.sludge ?? 0} L
          </p>
        </>
      )}
    </div>
  );
};

/* ---------------- DATE TICK ---------------- */

const DateTick = ({ x, y, payload }) => {
  if (!payload?.value) return null;

  return (
    <text
      x={x}
      y={y + 10}
      textAnchor="end"
      fill="#003f8a"
      fontSize={11}
      fontWeight={600}
      transform={`rotate(-45 ${x} ${y + 10})`}
    >
      {formatDateDisplay(payload.value)}
    </text>
  );
};

/* ---------------- THEME ---------------- */

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

  violet: {
    bg: "bg-violet-50",
    border: "border-violet-100",
    barColor: "bg-violet-600",
    iconColor: "text-violet-600",
  },
};

/* ---------------- KPI CARD ---------------- */

const KPICard = ({
  label,
  value,
  theme,
  icon,
  children,
}) => (
  <div
    className={`group relative overflow-hidden p-6 min-h-[190px] rounded-xl border ${theme.bg} ${theme.border} shadow-sm hover:shadow-md flex flex-col justify-between`}
  >
    <div
      className={`absolute bottom-0 left-0 h-1.5 w-full ${theme.barColor} origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}
    />

    <div>
      <div
        className={`p-2 w-fit rounded-lg bg-white shadow-sm ${theme.iconColor}`}
      >
        {icon}
      </div>

      <p className="text-[11px] font-black uppercase tracking-wider text-slate-900 mt-3">
        {label}
      </p>

      <p className="text-2xl font-black text-slate-900 mt-1">
        {value}
      </p>
    </div>

    {children && (
      <div className="mt-4 text-sm font-semibold text-slate-600">
        {children}
      </div>
    )}
  </div>
);

/* ================= VEHICLE PAGE ================= */

export default function VehiclePage() {
  const navigate = useNavigate();

  const { plantId, plantName } = useParams();

  /* ---------------- DATE STATE ---------------- */

  const [fromDate, setFromDate] = useState(
    formatDate(subtractDays(new Date(), 10))
  );

  const [toDate, setToDate] = useState(
    formatDate(new Date())
  );

  const today = formatDate(new Date());

  /* ---------------- BACKEND DATA ---------------- */

  const [dashboardData, setDashboardData] = useState(null);

  /* ---------------- FETCH DASHBOARD ---------------- */

const fetchDaywise = async () => {
  try {
    const data =
      await getVehicleOperationsDashboardByDateRange(
        plantId,
        fromDate,
        toDate
      );

    setDashboardData(data || null);
  } catch (error) {
    console.error(
      "Failed to fetch vehicle dashboard data:",
      error
    );

    setDashboardData(null);
  }
};
// Initial API call only when page opens
useEffect(() => {
  fetchDaywise();
}, [plantId]);
  /* ---------------- BACKEND VALUES ---------------- */

  const backendPlantId =
    dashboardData?.plantId ?? plantId;

  const backendPlantName =
    dashboardData?.plantName ??
    decodeURIComponent(plantName || "");

  const kld =
    dashboardData?.kld ?? 0;

  const summary =
    dashboardData?.summary || {};

  /* ---------------- SUMMARY ---------------- */

  const totalVehicles =
    summary.totalVehicles ?? 0;

  const totalDistance =
    summary.totalDistance ?? 0;

  const avgDistance =
    summary.averageDistance ?? 0;

  const totalSludge =
    summary.totalSludgeCollected ?? 0;

  const totalPrivateTrips =
    summary.privateVehicleTrips ?? 0;

  const totalPrivateSludge =
    summary.privateSludgeCollected ?? 0;

  /* ---------------- VEHICLE SUMMARY ---------------- */

  const vehicleSummary =
    summary.vehicleSummary || [];

  const vehicle1 =
    vehicleSummary[0] || {};

  const vehicle2 =
    vehicleSummary[1] || {};

  const vehicle1Number =
    vehicle1.vehicleNumber || "-";

  const vehicle2Number =
    vehicle2.vehicleNumber || "-";

  const vehicle1Distance =
    vehicle1.totalDistance ?? 0;

  const vehicle2Distance =
    vehicle2.totalDistance ?? 0;

  const vehicle1Trips =
    vehicle1.totalTrips ?? 0;

  const vehicle2Trips =
    vehicle2.totalTrips ?? 0;

  const vehicle1AverageDistance =
    vehicle1.averageDistance ?? 0;

  const vehicle2AverageDistance =
    vehicle2.averageDistance ?? 0;

  const vehicle1Sludge =
    vehicle1.totalSludgeCollected ?? 0;

  const vehicle2Sludge =
    vehicle2.totalSludgeCollected ?? 0;

  /* ---------------- DAILY DATA ---------------- */

  const dailyData =
    dashboardData?.dailyData || [];

  /*
   * Backend already provides all daily values.
   * This only maps the backend structure to
   * the existing Recharts structure.
   */

  const chartData = dailyData.map((day) => {
    const firstVehicle =
      day.vehicles?.[0] || null;

    const secondVehicle =
      day.vehicles?.[1] || null;

    return {
      date: day.operationDate,

      v1: firstVehicle
        ? {
            vehicleNumber:
              firstVehicle.vehicleNumber,

            distance:
              firstVehicle.distance ?? 0,

            fuel:
              firstVehicle.fuel,

            trips:
              firstVehicle.noOfTrips ?? 0,

            sludge:
              firstVehicle.sludgeCollected ?? 0,
          }
        : null,

      v2: secondVehicle
        ? {
            vehicleNumber:
              secondVehicle.vehicleNumber,

            distance:
              secondVehicle.distance ?? 0,

            fuel:
              secondVehicle.fuel,

            trips:
              secondVehicle.noOfTrips ?? 0,

            sludge:
              secondVehicle.sludgeCollected ?? 0,
          }
        : null,

      bar1:
        firstVehicle?.distance ?? 0,

      bar2:
        secondVehicle?.distance ?? 0,
    };
  });

const handleFromDateChange = (e) => {
  setFromDate(e.target.value);
};

const handleToDateChange = (e) => {
  setToDate(e.target.value);
};

  /* ---------------- SCROLL LOGIC ---------------- */

  const DAY_SCROLL_THRESHOLD = 40;
  const BAR_WIDTH = 40;

  const needsScroll =
    chartData.length > DAY_SCROLL_THRESHOLD;

  const chartWidth = needsScroll
    ? chartData.length * BAR_WIDTH
    : "100%";

  /* ---------------- BAR LABEL ---------------- */

  const TopBarLabel = React.memo(
    ({ x, y, width, value }) => {
      if (
        value === null ||
        value === undefined ||
        value === 0
      ) {
        return null;
      }

      return (
        <text
          x={x + width / 2}
          y={y - 6}
          textAnchor="middle"
          fill="#003f8a"
          fontSize={11}
          fontWeight={700}
          pointerEvents="none"
        >
          {Math.round(value)}
        </text>
      );
    }
  );

  /* ================= UI ================= */

  return (
    <div className="p-6 bg-[#D9E6FF] min-h-screen">

      {/* PAGE TITLE */}

      <h2
        className="text-2xl font-bold text-blue-900 text-center mb-4 tracking-wide"
        style={{
          fontFamily:
            '"Times New Roman", Times, serif',
        }}
      >
        Vehicle Movement and Distance Covered Status
      </h2>

      {/* CLOSE */}

      <button
        onClick={() => navigate("/vehicle")}
        className="bg-red-600 text-white px-4 py-1 rounded mb-4"
      >
        Close
      </button>

      {/* PLANT DETAILS */}

      <h2 className="text-2xl font-bold text-blue-900 mb-6">
        Vehicle Usage – {backendPlantName}

        <span className="text-gray-700 text-lg font-semibold">
          {" "}
          (PID: {backendPlantId} – KLD:{" "}
          {kld ?? "..."})
        </span>
      </h2>

      {/* KPI + FILTERS */}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">

        {/* KPI CARDS */}

        <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg border border-blue-100 p-6">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

            {/* TOTAL VEHICLES */}

            <KPICard
              label="Total Vehicles"
              value={formatIndianRounded(
                totalVehicles
              )}
              theme={theme.blue}
              icon={<Truck size={18} />}
            />

            {/* TOTAL DISTANCE */}

            <KPICard
              label="Total Distance Covered (Km)"
              value={formatIndianRounded(
                totalDistance
              )}
              theme={theme.rose}
              icon={<Navigation size={18} />}
            >
              <div>
                Vehicle 1:{" "}
                {formatIndianRounded(
                  vehicle1Distance
                )}{" "}
                Km (Trips: {vehicle1Trips})
              </div>

              <div>
                Vehicle 2:{" "}
                {formatIndianRounded(
                  vehicle2Distance
                )}{" "}
                Km (Trips: {vehicle2Trips})
              </div>
            </KPICard>

            {/* AVERAGE DISTANCE */}

            <KPICard
              label="Average Distance (Km)"
              value={formatIndianRounded(
                avgDistance
              )}
              theme={theme.emerald}
              icon={<Activity size={18} />}
            >
              <div>
                Vehicle 1:{" "}
                {formatIndianRounded(
                  vehicle1AverageDistance
                )}{" "}
                Km
              </div>

              <div>
                Vehicle 2:{" "}
                {formatIndianRounded(
                  vehicle2AverageDistance
                )}{" "}
                Km
              </div>
            </KPICard>

            {/* TOTAL SLUDGE */}

            <KPICard
              label="Total Sludge Collected (L)"
              value={formatIndianRounded(
                totalSludge
              )}
              theme={theme.amber}
              icon={<Layers size={18} />}
            >
              <div>
                Vehicle 1:{" "}
                {formatIndianRounded(
                  vehicle1Sludge
                )}{" "}
                L
              </div>

              <div>
                Vehicle 2:{" "}
                {formatIndianRounded(
                  vehicle2Sludge
                )}{" "}
                L
              </div>
            </KPICard>

            {/* PRIVATE VEHICLE */}

            <KPICard
              label="Private Vehicle Trips"
              value={formatIndianRounded(
                totalPrivateTrips
              )}
              theme={theme.violet}
              icon={<Milestone size={18} />}
            >
              Sludge:{" "}
              {formatIndianRounded(
                totalPrivateSludge
              )}{" "}
              L
            </KPICard>

          </div>
        </div>

        {/* DATE FILTERS */}

        <div className="lg:col-span-1 bg-white rounded-xl shadow-md p-4 flex flex-col justify-center gap-3">

          <div>
            <label className="text-xs font-semibold text-gray-700">
              From
            </label>

           <input
  type="date"
  value={fromDate}
  onChange={handleFromDateChange}
  className="border p-2 rounded-md w-full"
/>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">
              To
            </label>

         <input
  type="date"
  max={today}
  value={toDate}
  onChange={handleToDateChange}
  className="border p-2 rounded-md w-full"
/>
          </div>

<button
  onClick={fetchDaywise}
  className="bg-blue-700 text-white py-2 rounded-lg font-semibold hover:bg-blue-800 transition"
>
  GET
</button>
        </div>
      </div>

      {/* BAR GRAPH */}

      <div className="bg-white rounded-xl shadow-xl p-6 w-full">

        <div
          className={
            needsScroll
              ? "overflow-x-auto"
              : ""
          }
        >
          <div
            style={{
              width: chartWidth,
              height: 420,
            }}
          >

            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={chartData}
                margin={{
                  top: 50,
                  right: 30,
                  left: 70,
                  bottom: 90,
                }}
                barCategoryGap={20}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                {/* X AXIS */}

                <XAxis
                  dataKey="date"
                  interval={0}
                  height={80}
                  tick={<DateTick />}
                />

                {/* Y AXIS */}

                <YAxis
                  label={{
                    value:
                      "Distance Covered (Km)",
                    angle: -90,
                    position: "insideLeft",
                    dy: 80,
                    fontWeight: "bold",
                  }}
                />

                {/* TOOLTIP */}

                <Tooltip
                  content={
                    <DaywiseTooltip />
                  }
                />

                {/* VEHICLE 1 */}

                <Bar
                  dataKey="bar1"
                  fill="#6AA6FF"
                  barSize={28}
                  label={<TopBarLabel />}
                  name="Vehicle 1"
                />

                {/* VEHICLE 2 */}

                <Bar
                  dataKey="bar2"
                  fill="#0047B3"
                  barSize={28}
                  label={<TopBarLabel />}
                  name="Vehicle 2"
                />

              </BarChart>
            </ResponsiveContainer>

          </div>
        </div>

        {/* STATIC LEGEND */}

        <div className="flex items-center justify-center gap-6 mt-4 text-[13px] font-semibold">

          <span className="flex items-center gap-2 text-blue-400">
            <span className="w-3 h-3 bg-[#6AA6FF] rounded-sm" />

            Vehicle 1 – {vehicle1Number}
          </span>

          <span className="flex items-center gap-2 text-blue-900">
            <span className="w-3 h-3 bg-[#0047B3] rounded-sm" />

            Vehicle 2 – {vehicle2Number}
          </span>

        </div>

        {/* X AXIS LABEL */}

        <p className="text-center text-lg font-bold text-gray-700 mt-3">
          Dates
        </p>

      </div>
    </div>
  );
}