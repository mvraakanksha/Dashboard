import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Box } from "lucide-react";

import {
  getPelletsGraphDashboard,
  getPolymerGraphDashboard,
} from "../../services/operationService";


const formatIN = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return "0";
  }

  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value));
};


/* ---------------- TOOLTIP ---------------- */

const PelletsTooltip = ({
  active,
  payload,
  materialType,
  sortBy,
}) => {
  if (!active || !payload?.length) return null;

  const d = payload[0].payload;

  const isPellets = materialType === "pellets";

  const usedValue = isPellets
    ? `${formatIN(d.pelletsUsed)} Kg`
    : `${formatIN(d.polymerUsed)} grms`;

  const stockValue = isPellets
    ? d.pelletsStock !== null && d.pelletsStock !== undefined
      ? `${formatIN(d.pelletsStock)} Kg`
      : "-"
    : d.polymerStock !== null && d.polymerStock !== undefined
    ? `${formatIN(d.polymerStock)} Kg`
    : "-";

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs w-64">

      {/* HEADER */}
      <p className="font-bold text-red-700 mb-1">
        PID: {d.plantId} – {d.plantName}

        <span className="text-slate-500 font-semibold">
          {" "}({d.kld} KLD)
        </span>
      </p>

      {/* USED */}
      <p
        className={`mt-2 ${
          sortBy === "used"
            ? "font-bold text-slate-900"
            : "text-slate-500"
        }`}
      >
        {isPellets ? "Pellets Used:" : "Polymer Used:"}{" "}
        {usedValue}
      </p>

      {/* STOCK */}
      <p
        className={`mt-1 ${
          sortBy === "stock"
            ? "font-bold text-slate-900"
            : "text-slate-900"
        }`}
      >
        {isPellets ? "Pellets Stock:" : "Polymer Stock:"}{" "}
        {stockValue}
      </p>

    </div>
  );
};


/* ---------------- COMPONENT ---------------- */

export default function Pellets({
  isDark,
  date,
  zone,
  selectedPlants = [],
}) {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);

  const [sortBy, setSortBy] = useState("stock");

  const [materialType, setMaterialType] = useState("pellets");

  const [loading, setLoading] = useState(false);


  /* ---------------- THEME ---------------- */

  const theme = {
    blue: {
      bg: isDark ? "bg-blue-900/20" : "bg-blue-50",
      border: "border-blue-100",
      barColor: "bg-blue-600",
      iconColor: "text-blue-600",
    },

    indigo: {
      bg: isDark ? "bg-indigo-900/20" : "bg-indigo-50",
      border: "border-indigo-100",
      barColor: "bg-indigo-600",
      iconColor: "text-indigo-600",
    },

    emerald: {
      bg: isDark ? "bg-emerald-900/20" : "bg-emerald-50",
      border: "border-emerald-100",
      barColor: "bg-emerald-600",
      iconColor: "text-emerald-600",
    },

    amber: {
      bg: isDark ? "bg-amber-900/20" : "bg-amber-50",
      border: "border-amber-100",
      barColor: "bg-amber-600",
      iconColor: "text-amber-600",
    },
  };


  /* =========================================================
     BACKEND DASHBOARD API
     ========================================================= */

  useEffect(() => {
    if (!date) return;

    const loadDashboard = async () => {
      try {
        setLoading(true);

        const sortField =
          sortBy === "stock"
            ? "STOCK"
            : sortBy === "used"
            ? "USED"
            : "PLANT_ID";

        const requestParams = {
          date,
          zone,
          plantIds: selectedPlants,
          sortField,
          sortOrder: "DESC",
        };

        let response;

        if (materialType === "pellets") {
          response = await getPelletsGraphDashboard(requestParams);
        } else {
          response = await getPolymerGraphDashboard(requestParams);
        }

        setDashboardData(response || null);

      } catch (error) {
        console.error(
          `Failed to fetch ${materialType} graph dashboard:`,
          error
        );

        setDashboardData(null);

      } finally {
        setLoading(false);
      }
    };

    loadDashboard();

  }, [
    date,
    zone,
    selectedPlants,
    materialType,
    sortBy,
  ]);


  /* =========================================================
     BACKEND PLANT DATA
     ========================================================= */

  const sortedChartData = dashboardData?.plants || [];


  /* =========================================================
     LOW STOCK ALERT
     ========================================================= */

  const getStockAlert = (value, type) => {
    if (value === null || value === undefined) {
      return null;
    }

    const numericValue = Number(value);

    if (numericValue === 0) {
      return "red";
    }

    if (
      type === "pellets" &&
      numericValue <= 200
    ) {
      return "yellow";
    }

    if (
      type === "polymer" &&
      numericValue <= 20
    ) {
      return "yellow";
    }

    return null;
  };


  /* =========================================================
     SELECTED CHART KEY
     ========================================================= */

  const selectedKey = useMemo(() => {

    if (sortBy === "used") {
      return materialType === "pellets"
        ? "pelletsUsed"
        : "polymerUsed";
    }

    return materialType === "pellets"
      ? "pelletsStock"
      : "polymerStock";

  }, [
    materialType,
    sortBy,
  ]);


  /* =========================================================
     ENTRY COUNT
     ========================================================= */

  const entryCount = useMemo(() => {

    if (!sortedChartData?.length) {
      return 0;
    }

    return sortedChartData.filter((plant) => {

      const value = plant[selectedKey];

      return (
        value !== null &&
        value !== undefined &&
        Number(value) > 0
      );

    }).length;

  }, [
    sortedChartData,
    selectedKey,
  ]);


  /* =========================================================
     ENTRY LABEL
     ========================================================= */

  const entryLabel = useMemo(() => {

    if (sortBy === "plantId") {
      return "Plants With Data";
    }

    return "Entries";

  }, [sortBy]);


  /* =========================================================
     KPI VALUES FROM BACKEND
     ========================================================= */

  const totalPlants =
    dashboardData?.totalPlants || 0;


  const totalPelletsUsed =
    dashboardData?.totalPelletsUsed || 0;


  const totalPelletsStock =
    dashboardData?.totalPelletsStock || 0;


  const avgPellets =
    dashboardData?.averagePelletsUsage || 0;


  const totalPolymerUsed =
    dashboardData?.totalPolymerUsed || 0;


  const totalPolymerStock =
    dashboardData?.totalPolymerStock || 0;


  const avgPolymer =
    dashboardData?.averagePolymerUsage || 0;


  /* =========================================================
     CHART BAR LABEL
     ========================================================= */

  const TopBarLabel = ({
    x,
    y,
    width,
    value,
  }) => {

    if (
      value === null ||
      value === undefined
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
        {formatIN(value)}
      </text>
    );
  };


  /* =========================================================
     CHART WIDTH
     ========================================================= */

  const BAR_SLOT_WIDTH = 90;

  const needsScroll =
    sortedChartData.length > 12;

  const chartWidth = needsScroll
    ? sortedChartData.length * BAR_SLOT_WIDTH
    : "100%";


  /* =========================================================
     KPI CARD
     ========================================================= */

  const KPICard = ({
    label,
    value,
    unit,
    theme,
    icon,
    isDark,
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
          {React.cloneElement(icon, {
            size: 18,
          })}
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

        </div>

      </div>

    </div>
  );


  /* =========================================================
     UI
     ========================================================= */

  return (
    <div className="p-6 bg-[#D9E6FF] min-h-screen">

      {/* 🔝 HEADER */}

      <div className="flex items-center justify-between mb-8">

        <div className="flex items-center gap-4">

          {/* ICON */}

          <div
            className={`p-3 rounded-2xl ${
              isDark
                ? "bg-blue-500/20 text-blue-400"
                : "bg-blue-600 text-white"
            }`}
          >
            <Box className="w-6 h-6" />
          </div>

          {/* TITLE */}

          <div>

            <h2
              className={`text-2xl font-black uppercase tracking-tight ${
                isDark
                  ? "text-slate-100"
                  : "text-blue-900"
              }`}
            >
              Pellets and Polymer Report
            </h2>

            <p className="text-xs tracking-widest font-bold text-slate-900">
              Pellets & Polymer Usage and Stock Monitoring
            </p>

          </div>

        </div>

      </div>


      {/* ================= KPI + FILTER LAYOUT ================= */}

      <div className="flex flex-col lg:flex-row items-stretch gap-4 mb-6">

        {/* KPI CARDS */}

        <div className="flex-1 bg-white rounded-2xl shadow-lg border border-blue-100 p-5">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            <KPICard
              label="Total Plants"
              value={totalPlants}
              theme={theme.blue}
              icon={<Box />}
              isDark={isDark}
            />


            <KPICard
              label={
                materialType === "pellets"
                  ? "Total Pellets Used"
                  : "Total Polymer Used"
              }
              value={formatIN(
                materialType === "pellets"
                  ? totalPelletsUsed
                  : totalPolymerUsed
              )}
              unit={
                materialType === "pellets"
                  ? "Kg"
                  : "grms"
              }
              theme={theme.emerald}
              icon={<Box />}
              isDark={isDark}
            />


            <KPICard
              label="Stock"
              value={formatIN(
                materialType === "pellets"
                  ? totalPelletsStock
                  : totalPolymerStock
              )}
              unit="Kg"
              theme={theme.indigo}
              icon={<Box />}
              isDark={isDark}
            />


            <KPICard
              label="Average Usage"
              value={formatIN(
                materialType === "pellets"
                  ? avgPellets
                  : avgPolymer
              )}
              unit={
                materialType === "pellets"
                  ? "Kg"
                  : "grms"
              }
              theme={theme.amber}
              icon={<Box />}
              isDark={isDark}
            />

          </div>

        </div>


        {/* MATERIAL FILTER */}

        <div
          className={`w-72 rounded-xl p-4 flex flex-col justify-center
            ${
              isDark
                ? "bg-slate-900 border border-slate-800"
                : "bg-white shadow-md"
            }
          `}
        >

          <label
            className={`text-xs font-semibold mb-1 ${
              isDark
                ? "text-slate-300"
                : "text-gray-800"
            }`}
          >
            Select Material
          </label>

          <select
            value={materialType}
            onChange={(e) =>
              setMaterialType(e.target.value)
            }
            className={`border p-2 rounded-md text-sm font-semibold outline-none
              ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-slate-200"
                  : "bg-white border-slate-300"
              }
            `}
          >
            <option value="pellets">
              Pellets
            </option>

            <option value="polymer">
              Polymer
            </option>

          </select>

        </div>

      </div>


      {/* ================= GRAPH ================= */}

      <div className="p-6 rounded-[2rem] border bg-white border-slate-100 shadow-xl">

        {/* GRAPH HEADER */}

        <div className="flex items-center justify-between mb-3">

          <h3 className="font-bold text-blue-900 text-lg flex items-center gap-3">

            Material Analytics

            <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {entryLabel}: {entryCount}
            </span>

          </h3>

        </div>


        {/* SORT CONTROL */}

        <div className="flex justify-end mb-3">

          <div className="flex items-center gap-2">

            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              Sort by
            </span>

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value)
              }
              className="border rounded-md px-2 py-1 text-xs font-semibold outline-none
                         bg-white border-slate-300 text-slate-700"
            >

              <option value="stock">
                Stock
              </option>

              <option value="used">
                Used
              </option>

              <option value="plantId">
                Plant ID
              </option>

            </select>

          </div>

        </div>


        {/* LOADING */}

        {loading && (
          <div className="flex justify-center items-center py-4">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-sm font-semibold text-slate-500">
              Loading...
            </span>
          </div>
        )}


        {/* 📊 GRAPH */}

        <div className="overflow-x-auto">

          <div
            style={{
              width: chartWidth,
              minWidth: "100%",
            }}
          >

            <ResponsiveContainer
              width="100%"
              height={450}
            >

              <BarChart
                data={sortedChartData}
                margin={{
                  top: 30,
                  right: 30,
                  left: 70,
                  bottom: 80,
                }}
                barCategoryGap={30}
              >

                {/* GRADIENT */}

                <defs>

                  {/* Pellets */}

                  <linearGradient
                    id="pelletsGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#ff6b6b"
                    />

                    <stop
                      offset="100%"
                      stopColor="#c81e1e"
                    />
                  </linearGradient>


                  {/* Polymer */}

                  <linearGradient
                    id="polymerGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#5da9ff"
                    />

                    <stop
                      offset="100%"
                      stopColor="#1e3a8a"
                    />
                  </linearGradient>

                </defs>


                <CartesianGrid
                  strokeDasharray="3 3"
                />


                {/* X AXIS */}

                <XAxis
                  dataKey="plantName"
                  interval={0}
                  height={70}

                  tick={({
                    x,
                    y,
                    payload,
                  }) => {

                    const row =
                      sortedChartData.find(
                        (d) =>
                          d.plantName ===
                          payload.value
                      );

                    const stockValue =
                      materialType === "pellets"
                        ? row?.pelletsStock
                        : row?.polymerStock;

                    const alert =
                      getStockAlert(
                        stockValue,
                        materialType
                      );

                    return (
                      <text
                        x={x}
                        y={y + 10}
                        textAnchor="end"
                        fill="#003f8a"
                        fontSize={11}
                        fontWeight={600}
                        transform={`rotate(-45 ${x} ${
                          y + 10
                        })`}
                        style={{
                          cursor: "pointer",
                          textDecoration:
                            "underline",
                          whiteSpace:
                            "nowrap",
                        }}

                        onClick={() => {

                          if (!row) return;

                          navigate(
                            `/pellets-view/${row.plantId}/${row.plantName}?type=${materialType}`
                          );

                        }}
                      >

                        {/* LOW STOCK ALERT */}

                        {alert && (
                          <tspan
                            fill={
                              alert === "red"
                                ? "#dc2626"
                                : "#f59e0b"
                            }
                            fontSize={16}
                            fontWeight="bold"
                          >

                            ⚠

                            <animate
                              attributeName="opacity"
                              values="1;0.3;1"
                              dur="1s"
                              repeatCount="indefinite"
                            />

                            {" "}

                          </tspan>
                        )}

                        {/* PLANT NAME */}

                        <tspan>
                          {payload.value}
                        </tspan>

                      </text>
                    );
                  }}
                />


                {/* Y AXIS */}

                <YAxis
                  label={{
                    value:
                      sortBy === "used"
                        ? materialType === "pellets"
                          ? "PELLETS USED (KG)"
                          : "POLYMER USED (GRMS)"
                        : materialType === "pellets"
                        ? "PELLETS STOCK (KG)"
                        : "POLYMER STOCK (KG)",

                    angle: -90,
                    position: "insideLeft",
                    dy: 80,
                    fontWeight: "bold",
                  }}
                />


                {/* TOOLTIP */}

                <Tooltip
                  content={
                    <PelletsTooltip
                      materialType={
                        materialType
                      }
                      sortBy={sortBy}
                    />
                  }
                />


                {/* BAR */}

                <Bar
                  dataKey={selectedKey}
                  fill={
                    materialType === "pellets"
                      ? "url(#pelletsGradient)"
                      : "url(#polymerGradient)"
                  }
                  barSize={28}
                  label={<TopBarLabel />}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

          <p className="text-center text-sm font-bold text-gray-700 mt-3">
            Plants
          </p>

        </div>

      </div>

    </div>
  );
}