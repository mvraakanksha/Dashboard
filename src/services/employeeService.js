import { apiFetch } from "./api";

/* ================= EMPLOYEES ================= */

/**
 * Get ALL employees of a plant
 * GET /plantemployees/plant/{plantId}
 */
export const getEmployeesByPlant = (plantId) => {
  if (!plantId) throw new Error("Plant ID is required");
  return apiFetch(`/plantemployees/plant/${plantId}`);
};

/* ================= EMPLOYEE OPERATIONS ================= */

/**
 * Get ALL employee operations for a date
 * GET /employee-operations/date?date=YYYY-MM-DD
 */
export const getEmployeeOperationsByDate = (date) => {
  if (!date) throw new Error("Date is required");
  return apiFetch(`/employee-operations/date?date=${date}`);
};

/**
 * Get employee operations between dates
 * GET /employee-operations/date-range?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export const getEmployeeOperationsByDateRange = (start, end) => {
  if (!start || !end) throw new Error("Start & End dates are required");
  return apiFetch(
    `/employee-operations/date-range?start=${start}&end=${end}`
  );
};

/* ================= ATTENDANCE METRICS ================= */

/**
 * Attendance metrics for a date
 * Derived from employee-operations API
 */
export const getAttendanceMetrics = async (date) => {
  const data = await getEmployeeOperationsByDate(date);

  const total = data.length;
  const present = data.filter(e => e.present === true).length;
  const absent = data.filter(e => e.present === false).length;

  return {
    total,
    present,
    absent,
  };
};

//History Employees
export const getDeletedEmployeesByPlantAndDate = (plantId, date) => {
  if (!plantId || !date) throw new Error("PlantId & Date required");
  return apiFetch(`/historyEmployees/employees/${plantId}/date/${date}`);
};
//History Employees Operations
export const getEmployeeOperationsByDateRangeFull = (from, to) => {
  if (!from || !to) throw new Error("From & To required");
  return apiFetch(
    `/historyEmployees/employee-operations?startDate=${from}&endDate=${to}`
  );
};

/**
 * Attendance Summary - Plant Wise
 * GET /employee-operations/summary/all-plant-wise
 *
 * Examples:
 * ?date=2026-07-24
 * ?date=2026-07-24&plantIds=1,2,3
 * ?date=2026-07-24&zone=1
 */
export const getAttendanceSummaryPlantWise = ({
  date,
  plantIds = [],
  zone = "",
}) => {
  if (!date) throw new Error("Date is required");

  const params = new URLSearchParams();
  params.append("date", date);

  if (plantIds?.length) {
    params.append("plantIds", plantIds.join(","));
  }

  if (zone && zone !== "All") {
    params.append("zone", zone);
  }

  return apiFetch(
    `/employee-operations/summary/all-plant-wise?${params.toString()}`
  );
};


/**
 * Attendance Dashboard Designation Summary
 * GET /employee-operations/attendance-dashboard-designation
 *
 * Examples:
 * ?date=2026-07-24
 * ?date=2026-07-24&plantIds=1,2,3
 * ?date=2026-07-24&zone=1
 */
export const getAttendanceDashboardDesignation = ({
  date,
  plantIds = [],
  zone = "",
}) => {
  if (!date) throw new Error("Date is required");

  const params = new URLSearchParams();
  params.append("date", date);

  if (plantIds?.length) {
    params.append("plantIds", plantIds.join(","));
  }

  if (zone && zone !== "All") {
    params.append("zone", zone);
  }

  return apiFetch(
    `/employee-operations/attendance-dashboard-designation?${params.toString()}`
  );
};

// ================= Attendance Date Range (Plant Wise) =================
export const getEmployeeAttendanceDateRange = async ({
  plantId,
  fromDate,
  toDate,
}) => {
  if (!plantId || !fromDate || !toDate) {
    throw new Error("plantId, fromDate and toDate are required");
  }

  const params = new URLSearchParams({
    plantId,
    fromDate,
    toDate,
  });

  return apiFetch(
    `/employee-operations/attendance/date-range?${params.toString()}`
  );
};