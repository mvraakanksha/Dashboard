import { useEffect, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

/* Inline icons */
const icons = {
  Operations: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M3 12h4l2-7 4 14 2-7h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Maintainance: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-3 3-2-2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "Employee Data": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" strokeLinecap="round" />
      <path d="M16 8a3 3 0 1 1 3.5 2.96M17.5 14c2.6.5 4.5 2 4.5 4" strokeLinecap="round" />
    </svg>
  ),
  Stock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M3 7l9-4 9 4-9 4-9-4z" strokeLinejoin="round" />
      <path d="M3 7v10l9 4 9-4V7M12 11v10" strokeLinejoin="round" />
    </svg>
  ),
  Master: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" strokeLinecap="round" />
    </svg>
  ),
  Customized: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M4 6h10M4 12h6M4 18h12" strokeLinecap="round" />
      <circle cx="17" cy="6" r="2" />
      <circle cx="13" cy="18" r="2" />
    </svg>
  ),
};

const BRAND = "#013B88";
const DEFAULT_REPORT = "/reports/operations/daily";

export default function Report() {
  const navigate = useNavigate();
  const location = useLocation();

  const reportSections = [
    {
      title: "Operations",
      defaultPath: "/reports/operations/daily",
      items: [
        { label: "Daily", to: "/reports/operations/daily" },
        { label: "Monthly", to: "/reports/operations/monthly" },
        { label: "Performance", to: "/reports/operations/performance" },
        { label: "Individual", to: "/reports/operations/individual" },
      ],
    },
    {
      title: "Maintainance",
      defaultPath: "/reports/maintainance/utility",
      items: [
        { label: "Utility", to: "/reports/maintainance/utility" },
        { label: "Water Type", to: "/reports/maintainance/water" },
        { label: "Discom", to: "/reports/maintainance/discom" },
      ],
    },
    {
      title: "Employee Data",
      defaultPath: "/reports/employee-data/attendance",
      items: [
        { label: "Employee Details", to: "/reports/employee-data/employee" },
        { label: "Attendance", to: "/reports/employee-data/attendance" },
      ],
    },
  ];

  const singleButtons = [
    { label: "Stock Report", to: "/reports/stockreport", icon: "Stock",  },
    { label: "Plant Master Data", to: "/reports/master", icon: "Master", },
    { label: "Customized", to: "/reports/customized", icon: "Customized", },
  ];

  // Redirect bare /reports -> default report
  useEffect(() => {
    if (location.pathname === "/reports" || location.pathname === "/reports/") {
      navigate(DEFAULT_REPORT, { replace: true });
    }
  }, [location.pathname, navigate]);

  const getSectionFromPath = () => {
    if (location.pathname.includes("/operations/")) return "Operations";
    if (location.pathname.includes("/maintainance/")) return "Maintainance";
    if (location.pathname.includes("/employee-data/")) return "Employee Data";
    return "";
  };

  const [activeSection, setActiveSection] = useState(getSectionFromPath());

  useEffect(() => {
    setActiveSection(getSectionFromPath());
  }, [location.pathname]);

  const currentSection = reportSections.find((s) => s.title === activeSection);

  const isSinglePageActive = singleButtons.some((b) => b.to === location.pathname);

  const activeSubItem =
    currentSection?.items.find((i) => location.pathname === i.to)?.label;

  const allCards = [
    ...reportSections.map((s) => ({
      type: "section",
      key: s.title,
      label: s.title,
      icon: s.title,
    
      active: activeSection === s.title,
      onClick: () => {
        setActiveSection(s.title);
        navigate(s.defaultPath);
      },
    })),
    ...singleButtons.map((b) => ({
      type: "link",
      key: b.to,
      label: b.label,
      icon: b.icon,
  
      active: location.pathname === b.to,
      to: b.to,
      onClick: () => setActiveSection(""),
    })),
  ];

  return (
    <div >     {/* CARD GRID NAV */}
    
      <div className="bg-white-100 rounded-2xl shadow-sm overflow-hidden mb-5">
      <div
  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3
  transition-all duration-300"
>
          {allCards.map((card) => {
            const content = (
              <>
<span
  className={`flex items-center justify-center w-10 h-10 rounded-lg mb-3
transition-all duration-500 ease-out transform-gpu
  ${
  card.active
  ? "bg-white/15 text-white"
  : "bg-[#013B88]/10 text-[#013B88] group-hover:bg-[#013B88]/15"
  }`}
>
                  {icons[card.icon]}
                </span>
                <span
                 className={`text-sm font-semibold leading-tight transition-colors duration-300 ${
                    card.active ? "text-white" : "text-slate-800"
                  }`}
                >
                  {card.label}
                </span>
          
<span
  className={`
    absolute top-2.5 right-2.5
    w-2 h-2 rounded-full bg-white
    transition-all duration-500 ease-out
    ${
      card.active
        ? "opacity-100 scale-100"
        : "opacity-0 scale-75"
    }
  `}
/>
              </>
            );

            const className = `group relative flex flex-col items-start text-left p-3.5 rounded-xl border
transform-gpu will-change-transform
transition-all duration-500 ease-out ${
             card.active
  ? "bg-[#013B88] border-[#013B88] shadow-lg shadow-[#013B88]/20"
  : "bg-white border-slate-200 hover:border-[#013B88]/40 hover:shadow-md"
            }`;

            return card.type === "section" ? (
              <button key={card.key} onClick={card.onClick} className={className}>
                {content}
                <div
  className={`
    absolute inset-0 rounded-xl pointer-events-none
    transition-opacity duration-500 ease-out
    ${
      card.active
        ? "bg-white/5 opacity-100"
        : "opacity-0 group-hover:opacity-100 bg-[#013B88]/5"
    }
  `}
/>
              </button>
            ) : (
              <NavLink
                key={card.key}
                to={card.to}
                onClick={card.onClick}
                className={className}
              >
                {content}
                <div
  className={`
    absolute inset-0 rounded-xl pointer-events-none
    transition-opacity duration-300
    ${
      card.active
        ? "bg-white/5 opacity-100"
        : "opacity-0 group-hover:opacity-100 bg-[#013B88]/5"
    }
  `}
/>
              </NavLink>
            );
          })}
        </div>
      </div>
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

      {/* SUB NAV */}
      {!isSinglePageActive && currentSection && (
        <div className="px-5 sm:px-6 mt-5">
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
            <div className="flex items-center gap-2 mb-2 text-[11px] uppercase tracking-wide text-slate-400">
              <span className="font-semibold text-slate-500">
                {currentSection.title}
              </span>
              {activeSubItem && (
                <>
                  <span className="text-slate-300">/</span>
                  <span className="text-[#013B88] font-semibold normal-case tracking-normal">
                    {activeSubItem}
                  </span>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentSection.items.map(({ label, to }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-green-200 text-[#013B88] shadow-sm ring-1 ring-[#013B88]/25"
                        : "text-slate-500 hover:bg-white hover:text-slate-800"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAGE CONTENT */}
      <div className="px-5 sm:px-6 py-6">
        <Outlet />
      </div>
    </div>
    </div>
  );
}
