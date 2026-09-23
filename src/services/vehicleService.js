import { apiFetch } from "./api";

/* ================= VEHICLE INFORMATION ================= */

/**
 * Get ALL vehicles registered for a plant
 * GET /vehiclesinformation/plant/{plantId}
 */
export const getVehiclesByPlant = (plantId) => {
  if (!plantId) throw new Error("Plant ID is required");
  return apiFetch(`/vehiclesinformation/plant/${plantId}`);
};

/**
 * Get ALL vehicle operations for a plant (with operations data)
 * GET /vehicle-operations/plant/{plantId}/vehicles
 */
export const getVehicleOperationsByPlant = (plantId) => {
  if (!plantId) throw new Error("Plant ID is required");
  return apiFetch(`/vehicle-operations/plant/${plantId}/vehicles`);
};

/* ================= VEHICLE OPERATIONS ================= */

/**
 * Get ALL vehicle operations for a date
 * GET /vehicle-operations/date?date=YYYY-MM-DD
 */
export const getVehicleOperationsByDate = (date) => {
  if (!date) throw new Error("Date is required");
  return apiFetch(`/vehicle-operations/date?date=${date}`);
};

/**
 * Get vehicle operations between dates
 * GET /vehicle-operations/vehicle/date-range?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export const getVehicleOperationsByDateRange = (start, end) => {
  if (!start || !end) throw new Error("Start & End dates are required");
  return apiFetch(
    `/vehicle-operations/vehicle/date-range?start=${start}&end=${end}`
  );
};


export const getLatestVehicleFuel = (vehicleId, date) => {
  if (!vehicleId || !date)
    throw new Error("Vehicle ID and Date are required");

  return apiFetch(
    `/vehicle-operations/${vehicleId}/latest-fuel?date=${date}`
  );
};


/* ================= VEHICLE ================= */

export const getVehicleFuelDetails = (vehicleId) => {
  if (!vehicleId) {
    throw new Error("Vehicle ID is required");
  }

  return apiFetch(`/vehicle-operations/fuel/${vehicleId}`);
};


export const getVehicleGraphDashboard = async ({
  operationDate,
  zone,
  plantIds = [],
  expiryFilter = "ALL",
  sortBy,
  sortDirection,
}) => {
  const params = new URLSearchParams();

  if (operationDate) {
    params.append("operationDate", operationDate);
  }

  // Only send zone when actually selected
  if (
    zone &&
    zone !== "All" &&
    zone !== "ALL" &&
    zone !== ""
  ) {
    params.append("zone", zone);
  }

  // Only send selected plant IDs
  if (Array.isArray(plantIds) && plantIds.length > 0) {
    params.append("plantIds", plantIds.join(","));
  }

  if (expiryFilter) {
    params.append("expiryFilter", expiryFilter);
  }

  if (sortBy) {
    params.append("sortBy", sortBy);
  }

  if (sortDirection) {
    params.append("sortDirection", sortDirection);
  }

  return apiFetch(
    `/vehicle-operations/dashboard-vehicle-graph?${params.toString()}`
  );
};

export const getVehicleOperationsDashboardByDateRange = async (
  plantId,
  fromDate,
  toDate
) => {
  return apiFetch(
    `/vehicle-operations/dashboard-vehicle-graph/date-range/${plantId}?fromDate=${fromDate}&toDate=${toDate}`
  );
};