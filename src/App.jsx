import React, { useState, useEffect } from "react";
import "./App.css";

import {
   MemoryRouter as Router,
  Routes,
  Route,
  NavLink,
  useLocation
} from "react-router-dom";


import { lazy, Suspense } from "react";

const Dashboard = lazy(() => import("./components/Dashboard"));
const SludgeReports = lazy(() => import('./components/mainPages/SludgeReports'));
const Attendance = lazy(() => import("./components/mainPages/Attendance"));
const Vehicle = lazy(() => import("./components/mainPages/Vehicle"));
const Power = lazy(() => import("./components/mainPages/Power"));
const Pellets = lazy(() => import("./components/mainPages/Pellets"));
const LabOperations = lazy(() => import("./components/mainPages/LabOperations"));

// Pages
const SludgeReportView = lazy(() => import("./components/pages/SludgeReportView"));
const AttendanceView = lazy(() => import("./components/pages/AttendanceView"));
const VehiclePage = lazy(() => import("./components/pages/VehiclePage"));
const PowerPage = lazy(() => import("./components/pages/PowerPage"));

// Pages


const PelletsPage = lazy(() => import("./components/pages/PelletsPage"));
const Report = lazy(() => import("./components/Report"));
const DailyReportPage = lazy(() => import("./components/reports/DailyReportPage"));
const MonthlyReportPage = lazy(() => import("./components/reports/MonthlyReportPage"));
const CustomizedReport = lazy(() => import("./components/reports/CustomizedReport"));
const Individual = lazy(() => import("./components/reports/Individual"));
const AttendanceReport = lazy(() => import("./components/reports/AttendanceReport"));
const WaterReport = lazy(() => import("./components/reports/WaterReport"));
const EmployeeDetails =  lazy(() => import("./components/reports/EmployeeDetails"));

const Performance = lazy(() => import("./components/reports/Performance"));
const powerbillReport = lazy(() => import("./components/reports/PowerbillReport"));
const Utility = lazy(() => import('./components/reports/Utility'));

// Shared UI
import FilterBar from "./components/FilterBar";
import LabView from "./components/pages/LabView";
import PlantReport from "./components/reports/PlantReport";

import PlantOneTimeReport from "./components/reports/PlantOneTimeReport";
import DaterangeView from "./components/DaterangeView";
import PowerbillReport from "./components/reports/PowerbillReport";
import Discom from "./components/reports/Discom";


const TODAY = new Date().toISOString().split("T")[0];

/* ================= SIDEBAR ================= */
const Sidebar = React.memo(function Sidebar({ isDark }) {
  const location = useLocation();


 const isActivePath = React.useCallback(
  (paths) => paths.some((p) => location.pathname.startsWith(p)),
  [location.pathname]
);

  const getClass = (active) =>
    `side-btn ${active ? "active" : ""} ${isDark ? "dark" : ""}`;

  const isDashboardActive =
    location.pathname === "/" ||
    location.pathname === "/plants" ||
    location.pathname.startsWith("/plants/");

 return (
  <div
    className={`
      sidebar
      ${isDark ? "sidebar-dark" : ""}
      flex
      flex-row md:flex-col
      overflow-x-auto md:overflow-x-visible
      whitespace-nowrap
    `}
  >
    <NavLink to="/" className={getClass(isDashboardActive)}>
      Dashboard
    </NavLink>

    <NavLink
      to="/sludge-report"
      className={getClass(
        isActivePath(["/sludge-report", "/sludge-report-view"])
      )}
    >
      Sludge Report
    </NavLink>

    <NavLink
      to="/attendance"
      className={getClass(
        isActivePath(["/attendance", "/attendance-view"])
      )}
    >
      Attendance
    </NavLink>

    <NavLink
      to="/vehicle"
      className={getClass(isActivePath(["/vehicle", "/vehicle-view"]))}
    >
      Vehicle
    </NavLink>

    <NavLink
      to="/power"
      className={getClass(isActivePath(["/power", "/power-view"]))}
    >
      Power
    </NavLink>

    <NavLink
      to="/pellets"
      className={getClass(isActivePath(["/pellets", "/pellets-view"]))}
    >
      Pellets & Polymer
    </NavLink>

    <NavLink
      to="/lab"
      className={getClass(isActivePath(["/lab", "/lab-view"]))}
    >
      Lab Operations
    </NavLink>

    <NavLink
      to="/daterange"
      className={getClass(isActivePath(["/daterange"]))}
    >
      Indetail
    </NavLink>

    <NavLink
      to="/reports"
      className={getClass(isActivePath(["/reports", "/reports-view"]))}
    >
      Reports
    </NavLink>
  </div>
);

});

/* ================= NAVBAR ================= */
const Navbar = React.memo(function Navbar({ isDark }) {
  return (
    <nav className={`navbar-custom px-4 ${isDark ? "navbar-dark" : ""}`}>
      <div className="logo">
        <img
          src="https://mvrtech.org/MVR_Company_Logo%20copy.png"
          alt="Logo"
        />
      </div>

      <div
        className="nav-title mx-auto text-center"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        <h1>MVR TECHNOLOGY</h1>
        <small>FSTP CENTRAL DASHBOARD</small>
      </div>
    </nav>
  );
});



/* ================= APP CONTENT ================= */
function AppContent() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

// 👇 ADD THIS
const isEmbed = window.self !== window.top; // iframe detection

const [selectedPlants, setSelectedPlants] = useState([]);
const [dashboardDark, setDashboardDark] = useState(false);

  const [zones, setZones] = useState([]);

  const [date, setDate] = useState(
    () => localStorage.getItem("selectedDate") || TODAY
  );
  const [zone, setZone] = useState(
    () => localStorage.getItem("selectedZone") || "All"
  );


    const location = useLocation(); 

const isDashboard = location.pathname === "/";
const isDark = isDashboard && dashboardDark;


  useEffect(() => {
    localStorage.setItem("selectedDate", date);
    localStorage.setItem("selectedZone", zone);
  }, [date, zone]);


  const hideFilterBar =
    location.pathname === "/plants" ||
    location.pathname.startsWith("/plants/") ||
    location.pathname.startsWith("/reports") ||
    location.pathname.startsWith("/sludge-report-view/") ||
    location.pathname.startsWith("/attendance-view/") ||
    location.pathname.startsWith("/power-view/") ||
    location.pathname.startsWith("/vehicle-view/") ||
    location.pathname.startsWith("/pellets-view/") ||
    location.pathname.startsWith("/lab-operations/") ||
    location.pathname.startsWith("/daterange"); // ✅ HIDE FOR DATERANGE

useEffect(() => {
  const cached = sessionStorage.getItem("plants");

  if (cached) {
    const data = JSON.parse(cached);
    setZones([...new Set(data.map(p => p.zones))]);
    return;
  }

  fetch(`${API_BASE}/plants/all`)
    .then(res => res.json())
    .then(data => {
      sessionStorage.setItem("plants", JSON.stringify(data));
      setZones([...new Set(data.map(p => p.zones))]);
    });
}, []);


  return (
   <div
  className={`app-wrapper ${
    isDashboard && isDark ? "theme-dark" : "theme-light"
  }`}
>

   {!isEmbed && <Navbar isDark={isDark} />}


   <div className={`main-container ${isEmbed ? "no-sidebar" : ""}`}>

{!isEmbed && <Sidebar isDark={isDark} />}


        <div className="main-content">
          {/* 🔎 GLOBAL FILTER BAR */}
        {!isEmbed && !hideFilterBar && (
            <FilterBar
              isDark={isDark}
              setIsDark={setDashboardDark}   // ✅ IMPORTANT
              showThemeToggle={isDashboard}
              date={date}
              setDate={setDate}
              zone={zone}
              setZone={setZone}
              zones={zones}
            />


          )}
<Suspense fallback={<div className="loader">Loading...</div>}>
          <Routes>
            <Route
              path="/"
              element={<Dashboard isDark={isDark} date={date} zone={zone}  setZones={setZones} />}
            />


              <Route path="/sludge-report" element={<SludgeReports date={date} zone={zone}  setZones={setZones}  />} />
              <Route path="/attendance" element={<Attendance date={date} zone={zone} />} />
              <Route path="/vehicle" element={<Vehicle date={date} zone={zone} />} />
              <Route path="/power" element={<Power date={date} zone={zone} />} />
              <Route path="/pellets" element={<Pellets date={date} zone={zone} />} />
              <Route path="/lab" element={<LabOperations date={date} zone={zone} />} />



            <Route
              path="/sludge-report-view/:plantId"
              element={<SludgeReportView />}
            />

            <Route
              path="/attendance-view/:plantId"
              element={<AttendanceView />}
            />

            
            <Route
              path="/vehicle-view/:plantId/:plantName"
              element={<VehiclePage />}
            />

            <Route
              path="/power-view/:plantId/:plantName"
              element={<PowerPage />}
            />

            <Route
              path="/utility-view/:plantId/:plantName"
              element={<Utility />}
            />

            {/* <Route
              path="/pellets"
              element={<Pellets isDark={isDark} date={date} zone={zone} />}
            /> */}
            <Route
              path="/pellets-view/:plantId/:plantName"
              element={<PelletsPage />}
            />

            <Route
              path="/lab-operations/:plantId/:plantName"
              element={<LabView />}
            />

            <Route path="/daterange" element={<DaterangeView />} />

            <Route path="/reports" element={<Report />}>
            
              <Route index element={<DailyReportPage />} />

              <Route path="daily" element={<DailyReportPage />} />
                <Route path="monthly" element={<MonthlyReportPage/>} />
              <Route path="customized" element={<CustomizedReport />} />
               <Route path="individual" element={<Individual/>} />
                <Route path="attendance" element={<AttendanceReport/>} />
                   <Route path="water" element={<WaterReport/>} />
                   <Route path="performance" element={<Performance/>} />
                      <Route path="utility" element={<Utility/>} />
                      <Route path="discom" element={<Discom />} />
                        <Route path="employee" element={<EmployeeDetails/>} />
            </Route>
<Route
  path="/plants"
  element={
    <PlantReport
      selectedPlants={selectedPlants}
      setSelectedPlants={setSelectedPlants}
    />
  }
/>

<Route
  path="/plants/:id"
  element={<PlantOneTimeReport />}
/>

            {/* <Route path="/logout" element={<h2>You are logged out.</h2>} /> */}
          </Routes>
          </Suspense>

        </div>
      </div>
    </div>
  );
}

/* ================= ROOT ================= */
export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
