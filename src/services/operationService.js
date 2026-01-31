// src/services/operationService.js
import { apiFetch } from "./api";


/* =====================================================
   OPERATIONS (SLUDGE / POWER / PELLETS)
===================================================== */

/**
 * Operations for a specific date
 * GET /api/operations/date?date=yyyy-MM-dd
 */
export const getOperationsByDate = (date) => {
  if (!date) throw new Error("Date is required");
  return apiFetch(`/operations/date?date=${date}`);
};

/**
 * Operations between dates
 * GET /api/operations/date-range?start=yyyy-MM-dd&end=yyyy-MM-dd
 */
export const getOperationsByDateRange = (startDate, endDate) => {
  if (!startDate || !endDate)
    throw new Error("Start date and End date are required");

  return apiFetch(
    `/operations/date-range?start=${startDate}&end=${endDate}`
  );
};

/**
 * Operations for a specific plant on a specific date
 * (Used in preview)
 */
export const getOperationByPlantAndDate = (plantId, date) => {
  if (!plantId || !date)
    throw new Error("Plant ID and Date are required");

  return apiFetch(
    `/operations/plant/${plantId}?date=${date}`
  );
};

/* =====================================================
   LAB OPERATIONS (SAME SERVICE FILE)
===================================================== */

/**
 * Lab operations for a specific date
 * GET /api/laboperations/date?date=yyyy-MM-dd
 */
export const getLabOperationsByDate = (date) => {
  if (!date) throw new Error("Date is required");
  return apiFetch(`/laboperations/date?date=${date}`);
};

/**
 * Lab operations between dates
 * GET /api/laboperations/date-range?fromDate=yyyy-MM-dd&toDate=yyyy-MM-dd
 */
export const getLabOperationsByDateRange = (fromDate, toDate) => {
  if (!fromDate || !toDate)
    throw new Error("From date and To date are required");

  return apiFetch(
    `/laboperations/date-range?fromDate=${fromDate}&toDate=${toDate}`
  );
};
