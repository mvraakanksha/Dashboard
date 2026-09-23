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

export const getPlantOperationsReport = (plantId, fromDate, toDate) => {
  if (!plantId || !fromDate || !toDate)
    throw new Error("Plant ID, From date and To date are required");

  return apiFetch(
    `/operations/plant/${plantId}/date-range?fromDate=${fromDate}&toDate=${toDate}`
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
export const getLabOperationsByDateRange = (
  fromDate,
  toDate,
  options = {}
) => {
  if (!fromDate || !toDate)
    throw new Error("From date and To date are required");

  return apiFetch(
    `/laboperations/date-range?fromDate=${fromDate}&toDate=${toDate}`,
    options
  );
};


export const getLatestPowerBill = (plantId, date) => {
  if (!plantId || !date)
    throw new Error("Plant ID and Date are required");

  return apiFetch(
    `/operations/plant/${plantId}/latest-power-bill?date=${date}`
  );
};


export const getLatestWaterBill = (plantId, date) => {
  if (!plantId || !date)
    throw new Error("Plant ID and Date are required");

  return apiFetch(
    `/operations/plant/${plantId}/latest-water?date=${date}`
  );
};

export const getPowerBillDetailsByPlant = (plantId) => {
  if (!plantId) throw new Error("Plant ID is required");
  return apiFetch(`/operations/powerbill/${plantId}`);
};

/* ================= WATER ================= */
export const getWaterDetailsByPlant = (plantId) => {
  if (!plantId) throw new Error("Plant ID is required");
  return apiFetch(`/operations/water/${plantId}`);
};

/**
 * Fetch merged plant + operation rows for the sludge charts in one call.
 * Backend handles filtering (zone, plantIds) and sorting (sortField, sortOrder),
 * so no client-side join/merge/sort is needed.
 *
 * @param {Object} p
 * @param {string} p.date - required, YYYY-MM-DD
 * @param {string} [p.sortField] - one of SLUDGE_RECEIVED | SLUDGE_TANK_LEVEL | SLUDGE_PROCESSED | BIOCHAR_PRODUCED | PLANT_ID
 * @param {string} [p.sortOrder] - ASC | DESC
 * @param {number[]} [p.plantIds]
 * @param {string|number} [p.zone] - omit or "All" to skip zone filtering
 */
export const getSludgeChartData = ({ date, sortField, sortOrder, plantIds, zone } = {}) => {
  if (!date) throw new Error("Date is required");

  const qs = new URLSearchParams();
  qs.set("date", date);
  if (sortField) qs.set("sortField", sortField);
  if (sortOrder) qs.set("sortOrder", sortOrder);
  if (plantIds && plantIds.length) qs.set("plantIds", plantIds.join(","));
  if (zone && zone !== "All") qs.set("zone", zone);

  return apiFetch(`/operations/sludge-chart?${qs.toString()}`);
};

export const getPowerDashboard = async ({
  date,
  zone,
  plantIds = [],
  sortField = "POWER_CONSUMPTION",
  sortOrder = "DESC",
}) => {
  const params = new URLSearchParams();

  if (date) {
    params.append("date", date);
  }

  if (zone && zone !== "All") {
    params.append("zone", zone);
  }

  if (plantIds?.length > 0) {
    params.append("plantIds", plantIds.join(","));
  }

  if (sortField) {
    params.append("sortField", sortField);
  }

  if (sortOrder) {
    params.append("sortOrder", sortOrder);
  }

  return await apiFetch(
    `/operations/get-power-solar/dashboard-graph?${params.toString()}`
  );
};


/* ---------- Power Plant Wise Date Range ---------- */

export const getPowerPlantWiseDateRange = async ({
  plantId,
  fromDate,
  toDate,
}) => {
  const params = new URLSearchParams();

  if (plantId) {
    params.append("plantId", plantId);
  }

  if (fromDate) {
    params.append("fromDate", fromDate);
  }

  if (toDate) {
    params.append("toDate", toDate);
  }

  return await apiFetch(
    `/operations/get-power-solar/plant-wise/date-range?${params.toString()}`
  );
};


export const getPelletsGraphDashboard = async ({
  date,
  zone,
  plantIds = [],
  sortField = "STOCK",
  sortOrder = "DESC",
}) => {
  const params = new URLSearchParams();

  if (date) params.append("date", date);

  if (zone && zone !== "All") {
    params.append("zone", zone);
  }

  if (plantIds?.length > 0) {
    params.append("plantIds", plantIds.join(","));
  }

  if (sortField) {
    params.append("sortField", sortField);
  }

  if (sortOrder) {
    params.append("sortOrder", sortOrder);
  }

  return await apiFetch(
    `/operations/inventory/pellets-graph?${params.toString()}`
  );
};


export const getPolymerGraphDashboard = async ({
  date,
  zone,
  plantIds = [],
  sortField = "STOCK",
  sortOrder = "DESC",
}) => {
  const params = new URLSearchParams();

  if (date) params.append("date", date);

  if (zone && zone !== "All") {
    params.append("zone", zone);
  }

  if (plantIds?.length > 0) {
    params.append("plantIds", plantIds.join(","));
  }

  if (sortField) {
    params.append("sortField", sortField);
  }

  if (sortOrder) {
    params.append("sortOrder", sortOrder);
  }

  return await apiFetch(
    `/operations/inventory/polymer-graph?${params.toString()}`
  );
};

/* =========================================================
   PELLETS DATE RANGE - PLANT WISE
   ========================================================= */

export const getPelletsDateRangeByPlant = async ({
  plantId,
  fromDate,
  toDate,
}) => {
  const params = new URLSearchParams();

  if (fromDate) {
    params.append("fromDate", fromDate);
  }

  if (toDate) {
    params.append("toDate", toDate);
  }

  return await apiFetch(
    `/operations/inventory/pellets/date-range/${plantId}?${params.toString()}`
  );
};


/* =========================================================
   POLYMER DATE RANGE - PLANT WISE
   ========================================================= */

export const getPolymerDateRangeByPlant = async ({
  plantId,
  fromDate,
  toDate,
}) => {
  const params = new URLSearchParams();

  if (fromDate) {
    params.append("fromDate", fromDate);
  }

  if (toDate) {
    params.append("toDate", toDate);
  }

  return await apiFetch(
    `/operations/inventory/polymer/date-range/${plantId}?${params.toString()}`
  );
};
// export const getPelletsDateRangeByPlant = async ({
//   plantId,
//   fromDate,
//   toDate,
// }) => {
//   const params = new URLSearchParams();

//   if (fromDate) {
//     params.append("fromDate", fromDate);
//   }

//   if (toDate) {
//     params.append("toDate", toDate);
//   }

//   return await apiFetch(
//     `/operations/inventory/pellets/date-range/${plantId}?${params.toString()}`
//   );
// };