// ReportTotals.js

export const EXCLUDE_FROM_TOTALS = new Set([
  "vehicleNo",
  "am",
  "pm"
]);

export const EXCLUDE_FROM_SIDE_TOTALS = new Set([
  "vehicleNo",
  "am",
  "pm",
  "odometer",
  "tankLevel"
]);

// 🔹 Non-vehicle metric TOTAL (ALL dates + plants)
export const sumMetricOverall = (rows, dates, metric) =>
  rows.reduce(
    (sum, r) =>
      sum +
      dates.reduce((s, d) => {
        const v = r.values?.[d]?.[metric];
        return typeof v === "number" ? s + v : s;
      }, 0),
    0
  );

// 🔹 Vehicle metric TOTAL (ALL dates + plants)
export const sumVehicleMetricOverall = (rows, dates, metric) =>
  rows.reduce(
    (sum, r) =>
      sum +
      dates.reduce((s, d) => {
        const vehicleRows = r.values?.[d]?.vehicleRows || [];
        return (
          s +
          vehicleRows.reduce(
            (x, v) => x + (typeof v?.[metric] === "number" ? v[metric] : 0),
            0
          )
        );
      }, 0),
    0
  );

// 🔹 Non-vehicle metric DATE total
export const sumMetricForDate = (rows = [], date, metric) => {
  if (!Array.isArray(rows)) return 0;

  return rows.reduce((sum, r) => {
    const v = r.values?.[date]?.[metric];
    return typeof v === "number" ? sum + v : sum;
  }, 0);
};

export const sumVehicleMetricForDate = (rows = [], date, metric) => {
  if (!Array.isArray(rows)) return 0;

  return rows.reduce((sum, r) => {
    const vehicleRows = r.values?.[date]?.vehicleRows || [];
    return (
      sum +
      vehicleRows.reduce(
        (s, v) => s + (typeof v?.[metric] === "number" ? v[metric] : 0),
        0
      )
    );
  }, 0);
};
