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
