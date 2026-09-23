import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Activity, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getPowerDashboard } from "../../services/operationService";

/* ================= BAR TOP VALUE ================= */

const BarValueLabel = ({ x, y, width, value, fill }) => {
  if (!value || value <= 0) return null;

  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fill={fill}
      fontSize={11}
      fontWeight={700}
    >
      {Number(value).toFixed(2)}
    </text>
  );
};

/* ================= CLICKABLE X-AXIS TICK ================= */

const ClickableTick = ({
  x,
  y,
  payload,
  plantMap,
  onPlantClick,
}) => {
  const label = payload?.value;
  const plant = plantMap[label];

  return (
    <text
      x={x}
      y={y + 10}
      textAnchor="end"
      fill="#003f8a"
      fontSize={11}
      fontWeight={600}
      transform={`rotate(-45 ${x} ${y + 10})`}
      style={{
        cursor: "pointer",
        whiteSpace: "nowrap",
        textDecoration: "underline",
      }}
      onClick={() => plant && onPlantClick(plant)}
    >
      {label}
    </text>
  );
};

/* ================= DATE FORMAT ================= */

const formatDDMMYYYY = (dateStr) => {
  if (!dateStr) return "";

  const d = new Date(dateStr);

  if (isNaN(d)) return dateStr;

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};

/* ================= TOOLTIP ================= */

const PowerTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0].payload;

  return (
    <div className="bg-white border shadow-md rounded p-3 text-xs w-64">
      <p className="font-bold text-blue-900">
        PID: {row.plantId} - {row.plantName} - {row.kld} KLD
      </p>

      {row.powerCompletionDate && (
        <p className="text-[11px] font-semibold text-slate-700 mt-1">
          Power completed On :{" "}
          {formatDDMMYYYY(row.powerCompletionDate)}
        </p>
      )}

      {row.solarCompletionDate && (
        <p className="text-[11px] font-semibold text-slate-700">
          Solar completed On :{" "}
          {formatDDMMYYYY(row.solarCompletionDate)}
        </p>
      )}

      {row.powerConsumption > 0 && (
        <div className="mt-2">
          <p className="font-semibold text-red-700">
            Power Consumption :{" "}
            {Number(row.powerConsumption).toFixed(2)} Kwh
          </p>

          <p>
            AM:{" "}
            {row.powerReadingAmImport != null
              ? Number(row.powerReadingAmImport).toFixed(2)
              : "-"}
          </p>

          <p>
            PM:{" "}
            {row.powerReadingPmImport != null
              ? Number(row.powerReadingPmImport).toFixed(2)
              : "-"}
          </p>
        </div>
      )}

      {row.solarPowerGenerated > 0 && (
        <div className="mt-2">
          <p className="font-semibold text-green-700">
            Solar Power Generated :{" "}
            {Number(row.solarPowerGenerated).toFixed(2)} Kwh
          </p>

          <p>
            AM:{" "}
            {row.powerReadingAmExport != null
              ? Number(row.powerReadingAmExport).toFixed(2)
              : "-"}
          </p>

          <p>
            PM:{" "}
            {row.powerReadingPmExport != null
              ? Number(row.powerReadingPmExport).toFixed(2)
              : "-"}
          </p>
        </div>
      )}

      {row.plantRunHours > 0 && (
        <div className="mt-2">
          <p className="font-semibold text-blue-700">
            Plant Run Hours :{" "}
            {Number(row.plantRunHours).toFixed(2)} Hrs
          </p>
        </div>
      )}
    </div>
  );
};

/* ================= PAGE ================= */

export default function Power({
  date,
  zone,
  selectedPlants = [],
}) {
  const navigate = useNavigate();

  const [powerSummary, setPowerSummary] = useState(null);

  /*
   * Backend sorting values:
   *
   * POWER_CONSUMPTION
   * SOLAR_POWER_GENERATED
   * PLANT_RUN_HOURS
   * PLANT_ID
   */
  const [sortBy, setSortBy] = useState("POWER_CONSUMPTION");

  /* ================= BACKEND API ================= */

  useEffect(() => {
    if (!date) return;

    const loadPowerSummary = async () => {
      try {
        const data = await getPowerDashboard({
          date,
          zone,
          plantIds: selectedPlants,
          sortField: sortBy,
          sortOrder: "DESC",
        });

        setPowerSummary(data || null);
      } catch (err) {
        console.error(
          "Failed to fetch power dashboard",
          err
        );

        setPowerSummary(null);
      }
    };

    loadPowerSummary();
  }, [date, zone, selectedPlants, sortBy]);

  /* ================= THEME ================= */

  const theme = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-100",
      barColor: "bg-blue-600",
      iconColor: "text-blue-600",
    },

    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      barColor: "bg-emerald-600",
      iconColor: "text-emerald-600",
    },

    rose: {
      bg: "bg-rose-50",
      border: "border-rose-100",
      barColor: "bg-rose-600",
      iconColor: "text-rose-600",
    },

    indigo: {
      bg: "bg-indigo-50",
      border: "border-indigo-100",
      barColor: "bg-indigo-600",
      iconColor: "text-indigo-600",
    },

    amber: {
      bg: "bg-amber-50",
      border: "border-amber-100",
      barColor: "bg-amber-500",
      iconColor: "text-amber-600",
    },
  };

  /* ================= BACKEND DATA ================= */

  /*
   * No frontend calculations.
   *
   * Backend response:
   *
   * totalPlants
   * totalPowerConsumption
   * totalSolarPowerGenerated
   * avgPowerConsumption
   * avgSolarPowerGenerated
   * totalPlantRunHours
   * avgRunHours
   * plants[]
   */

  const totalPlants = powerSummary?.totalPlants ?? 0;

  const totalImport =
    powerSummary?.totalPowerConsumption ?? 0;

  const totalExport =
    powerSummary?.totalSolarPowerGenerated ?? 0;

  const avgImport =
    powerSummary?.avgPowerConsumption ?? 0;

  const avgExport =
    powerSummary?.avgSolarPowerGenerated ?? 0;

  const totalRunHours =
    powerSummary?.totalPlantRunHours ?? 0;

  const avgRunHours =
    powerSummary?.avgRunHours ?? 0;

  /* ================= CHART DATA ================= */

  /*
   * Backend already filters and sorts the plants.
   * No frontend filtering/sorting/calculation.
   */

  const chartData = powerSummary?.plants || [];

  /* ================= PLANT MAP ================= */

  const plantMap = {};

  chartData.forEach((plant) => {
    plantMap[plant.plantName] = plant;
  });

  /* ================= NAVIGATION ================= */

  const openPlantView = (plant) => {
    navigate(
      `/power-view/${plant.plantId}/${plant.plantName}`
    );
  };

  /* ================= ENTRY COUNT ================= */

  const entryCount = chartData.length;

  /* ================= KPI CARD ================= */

  const KPICard = ({
    label,
    value,
    unit,
    theme,
    icon,
    isDark,
    subLabel,
  }) => (
    <div
      className={`group relative overflow-hidden p-4 rounded-xl border
        transition-all duration-300 shadow-sm hover:shadow-md
        ${theme.bg} ${theme.border}`}
    >
      {/* Animated bottom bar */}

      <div
        className={`absolute bottom-0 left-0 h-1.5 w-full ${theme.barColor}
          origin-left scale-x-0 group-hover:scale-x-100
          transition-transform duration-500 ease-out`}
      />

      <div className="flex flex-col gap-3">
        <div
          className={`p-2 w-fit rounded-lg bg-white/60 backdrop-blur-sm
            ${theme.iconColor} shadow-sm`}
        >
          {icon}
        </div>

        <div>
          <p
            className={`text-[10px] font-black uppercase tracking-wider ${
              isDark
                ? "text-slate-400"
                : "text-slate-900"
            }`}
          >
            {label}
          </p>

          <p
            className={`text-xl font-black ${
              isDark
                ? "text-white"
                : "text-slate-900"
            }`}
          >
            {value}

            {unit && (
              <span className="text-sm ml-1">
                {unit}
              </span>
            )}
          </p>

          {subLabel && (
            <p className="text-xs mt-1 text-slate-700 font-semibold">
              {subLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  /* ================= UI ================= */

  return (
    <div className="p-6 bg-[#D9E6FF] min-h-screen">

      {/* ================= HEADER ================= */}

      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 rounded-2xl bg-blue-600 text-white">
          <Zap className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-blue-900">
            Power Report
          </h2>

          <p className="text-xs tracking-widest font-bold text-slate-900">
            Power Consumption & Solar Generation Monitoring
          </p>
        </div>
      </div>

      {/* ================= KPI + FILTER ROW ================= */}

      <div className="flex flex-col lg:flex-row gap-4 mb-6">

        {/* ================= KPI CARDS ================= */}

        <div className="flex-1 bg-white rounded-2xl p-6 shadow">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">

            <KPICard
              label="Total Plants"
              value={totalPlants}
              unit=""
              theme={theme.amber}
              icon={<Activity size={18} />}
            />

            <KPICard
              label="Total Power Consumption"
              value={Number(totalImport).toFixed(2)}
              unit="Kwh"
              theme={theme.rose}
              icon={<Zap size={18} />}
            />

            <KPICard
              label="Total Solar Power Generated"
              value={Number(totalExport).toFixed(2)}
              unit="Kwh"
              theme={theme.emerald}
              icon={<Zap size={18} />}
            />

            <KPICard
              label="Avg Power Consumption"
              value={Number(avgImport).toFixed(2)}
              unit="Kwh"
              theme={theme.blue}
              icon={<Zap size={18} />}
            />

            <KPICard
              label="Avg Solar Power Generated"
              value={Number(avgExport).toFixed(2)}
              unit="Kwh"
              theme={theme.emerald}
              icon={<Zap size={18} />}
            />

            <KPICard
              label="Total Plant Run Hours"
              value={Number(totalRunHours).toFixed(2)}
              unit="Hrs"
              subLabel={`Avg : ${Number(avgRunHours).toFixed(2)}`}
              theme={theme.indigo}
              icon={<Zap size={18} />}
            />

          </div>
        </div>

        {/* ================= SORT FILTER ================= */}

        <div className="w-full lg:w-72 bg-white rounded-xl p-4 shadow-md flex flex-col justify-center">

          <label className="text-xs font-semibold mb-1 text-gray-700">
            Sort By
          </label>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border p-2 rounded-md text-sm font-semibold bg-white border-slate-300"
          >
            <option value="POWER_CONSUMPTION">
              Power Consumption
            </option>

            <option value="SOLAR_POWER_GENERATED">
              Solar Power Generated
            </option>

            <option value="PLANT_RUN_HOURS">
              Plant Run Hours
            </option>

            <option value="PLANT_ID">
              Plant ID
            </option>
          </select>

        </div>
      </div>

      {/* ================= GRAPH ================= */}

      <div className="bg-white rounded-2xl shadow-lg p-6">

        <div className="flex items-center gap-3 mb-3">

          <h3 className="font-bold text-blue-900 text-lg">
            Power Analytics
          </h3>

          <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">
            Entries: {entryCount}
          </span>

        </div>

        <div className="overflow-x-auto">

          <div
            style={{
              width:
                chartData.length > 10
                  ? chartData.length * 120
                  : "100%",
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
                  top: 40,
                  right: 30,
                  left: 80,
                  bottom: 80,
                }}
                barCategoryGap={55}
              >

                <CartesianGrid strokeDasharray="3 3" />

                {/* ================= X AXIS ================= */}

                <XAxis
                  dataKey="plantName"
                  interval={0}
                  height={50}
                  tick={(props) => (
                    <ClickableTick
                      {...props}
                      plantMap={plantMap}
                      onPlantClick={openPlantView}
                    />
                  )}
                />

                {/* ================= Y AXIS ================= */}

                <YAxis
                  label={{
                    value: "Power (Kwh) / Run Hours",
                    angle: -90,
                    position: "insideLeft",
                    offset: -20,
                    dy: 60,
                    fontWeight: "bold",
                  }}
                />

                {/* ================= TOOLTIP ================= */}

                <Tooltip
                  content={<PowerTooltip />}
                />

                {/* ================= POWER CONSUMPTION ================= */}

                <Bar
                  dataKey="powerConsumption"
                  fill="#af0000"
                  barSize={24}
                  label={
                    <BarValueLabel fill="#af0000" />
                  }
                />

                {/* ================= SOLAR ================= */}

                <Bar
                  dataKey="solarPowerGenerated"
                  fill="#018f20"
                  barSize={24}
                  label={
                    <BarValueLabel fill="#018f20" />
                  }
                />

                {/* ================= RUN HOURS ================= */}

                <Bar
                  dataKey="plantRunHours"
                  fill="#1e40af"
                  barSize={24}
                  label={
                    <BarValueLabel fill="#1e40af" />
                  }
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </div>

        {/* ================= LEGEND ================= */}

        <div className="flex flex-wrap justify-center gap-4 mt-4 font-bold text-sm">

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#018f20] rounded" />
            Solar Power Generated
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#af0000] rounded" />
            Power Consumption
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#1E40AF] rounded" />
            Plant Run Hours
          </div>

        </div>

        <p className="text-center text-sm font-bold mt-4">
          Plants
        </p>

      </div>

    </div>
  );
}