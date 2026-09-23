import { apiFetch } from "./api";

export const getDashboardSummaryCount = async ({
  date,
  zone,
 plantIds,
}) => {
  const params = new URLSearchParams();

  // Date is mandatory
  params.append("date", date);

  // Zone is optional
  if (zone && zone !== "All") {
    params.append("zone", zone);
  }

  // PlantIds are optional
  if (plantIds && plantIds.length > 0) {
    params.append("plantIds", plantIds.join(","));
  }

  return apiFetch(
    `/plants/dashboard-summary-count?${params.toString()}`
  );
};


// ----------------------
// Attendance Summary API
// ----------------------
export const getAttendanceSummaryCount = async ({
  date,
  zone,
  plantIds,
}) => {
  const params = new URLSearchParams();

  if (date) {
    params.append("date", date);
  }

  if (plantIds?.length) {
    params.append("plantIds", plantIds.join(","));
  }

  return apiFetch(
    `/employee-operations/attendance-summary-count?${params.toString()}`
  );
};

// ----------------------
// Sludge Summary API
// ----------------------
export const getSludgeDashboard = async ({
  date,
  zone,
  plantIds,
}) => {
  const params = new URLSearchParams();

  if (date) {
    params.append("date", date);
  }

  if (zone && zone !== "All") {
    params.append("zone", zone);
  }

  if (plantIds?.length) {
    params.append("plantIds", plantIds.join(","));
  }

  return apiFetch(
    `/operations/sludge-dashboard?${params.toString()}`
  );
};

// ----------------------
// Power Summary API
// ----------------------

export const getPowerDashboard = async ({
  date,
  zone,
  plantIds,
}) => {
  const params = new URLSearchParams();

  if (date) params.append("date", date);

  if (zone && zone !== "All") {
    params.append("zone", zone);
  }

  if (plantIds?.length) {
    params.append("plantIds", plantIds.join(","));
  }

  return apiFetch(
    `/operations/power-dashboard?${params.toString()}`
  );
};

// ----------------------
// Vehicle Summary API
// ----------------------

export const getVehicleDashboard = async ({
  date,
  zone,
  plantIds,
}) => {
  const params = new URLSearchParams();

  if (date) {
    params.append("date", date);
  }

  if (zone && zone !== "All") {
    params.append("zone", zone);
  }

  if (plantIds?.length) {
    params.append("plantIds", plantIds.join(","));
  }

  return apiFetch(
    `/vehicle-operations/dashboard-summary-vehicle?${params.toString()}`
  );
};

// ----------------------
// Inventory Summary API
// ----------------------
export const getInventoryDashboard = async ({
  date,
  zone,
  plantIds,
}) => {
  const params = new URLSearchParams();

  // Mandatory
  params.append("date", date);

  // Optional
  if (zone && zone !== "All") {
    params.append("zone", zone);
  }

  // Optional
  if (plantIds?.length) {
    params.append("plantIds", plantIds.join(","));
  }

  return apiFetch(
    `/operations/inventory-dashboard?${params.toString()}`
  );
};

// ----------------------
// Attendance Page KPI Counts API
// ----------------------

export const getAttendanceDashboard = async ({
  date,
  zone,
  plantIds = [],
}) => {
  const params = new URLSearchParams();

  if (date) {
    params.append("date", date);
  }

  if (zone && zone !== "All") {
    params.append("zone", zone);
  }

  if (plantIds?.length) {
    params.append("plantIds", plantIds.join(","));
  }

  return apiFetch(
    `/employee-operations/attendance-dashboard-designation?${params.toString()}`
  );
};


// ----------------------
// Lab Dashboard Summary API
// ----------------------
export const getLabDashboard = async ({
  date,
  zone,
  plantIds,
}) => {
  const params = new URLSearchParams();

  if (date) {
    params.append("date", date);
  }

  if (zone && zone !== "All") {
    params.append("zone", zone);
  }

  if (plantIds?.length) {
    params.append("plantIds", plantIds.join(","));
  }

  return apiFetch(
    `/laboperations/dashboard-summary-lab?${params.toString()}`
  );
};