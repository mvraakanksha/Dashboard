import { NavLink, Outlet } from "react-router-dom";

export default function Report() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-5">

      {/* Buttons */}
<div className="mb-6">
  <div
    className="
      flex flex-wrap gap-3
      justify-start
    "
  >
    {[
      { to: ".", label: "Daily", end: true },
      { to: "monthly", label: "Monthly" },
    
      { to: "individual", label: "Individual" },
      { to: "attendance", label: "Attendance" },
      { to: "water", label: "Water Type" },
      { to: "performance", label: "Performance" },
       { to: "utility", label: "Utility" },
        { to: "discom", label: "Discom" },
           { to: "employee", label: "Employees" },
           { to: "stockreport", label: "StockReport" },
            { to: "master", label: "Plant Master Report" },
              { to: "customized", label: "Customized Report" },
    ].map(({ to, label, end }) => (
<NavLink
  key={to}
  to={to}
  end={end}
  className={({ isActive }) => {
    const isCustomized = to === "customized";

    return `
      px-4 py-2 rounded-lg font-semibold text-sm
      transition-all whitespace-nowrap max-w-full
      ${
        isActive
          ? "bg-[#013B88] text-white" // active always blue
          : isCustomized
            ? "bg-green-800 text-white hover:bg-green-900" // default customized = green
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }
    `;
  }}
>
  {label}
</NavLink>
    ))}
  </div>
</div>


      {/* Report Content */}
      <Outlet />
    </div>
  );
}
