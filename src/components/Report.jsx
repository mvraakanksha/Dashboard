import { NavLink, Outlet } from "react-router-dom";

export default function Report() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-5">

      {/* Buttons */}
      <div
        className="
  flex flex-wrap gap-3 mb-6
  md:flex-nowrap
"

      >
        {[
          { to: ".", label: "Daily", end: true },
          { to: "monthly", label: "Monthly" },
          { to: "customized", label: "Customized" },
          { to: "individual", label: "Individual" },
          { to: "attendance", label: "Attendance" },
          { to: "water", label: "Water Type" },
        ].map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `
              px-4 py-2 rounded-lg font-semibold text-sm
              transition-all whitespace-nowrap
              ${
                isActive
                  ? "bg-[#013B88] text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-200"
              }
            `
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Report Content */}
      <Outlet />
    </div>
  );
}
