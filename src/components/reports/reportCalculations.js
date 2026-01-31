/* ================= VEHICLE ================= */
export const calcVehicleMetrics = (vehicleOps, plant) => {
  let distance = 0;
  let trips = 0;
  const moved = new Set();

  vehicleOps.forEach(v => {
    const am = v.vehicleOp?.vehicleReadingAm;
    const pm = v.vehicleOp?.vehicleReadingPm;

    if (am != null && pm != null && pm > am) {
      distance += pm - am;
      moved.add(v.vehicle?.vehicleID);
    }

    trips += v.vehicleOp?.noOfTrips || 0;
  });

  return {
    totalVehicles: plant.noOfVehicle || vehicleOps.length,
    movedVehicles: moved.size,
    trips,
    distance: +distance.toFixed(2),
  };
};

/* ================= POWER ================= */
export const calcPowerMetrics = (op) => {
  if (!op) return {};

  const importPower =
    op.powerReadingAmImport != null && op.powerReadingPmImport != null
      ? Math.max(op.powerReadingPmImport - op.powerReadingAmImport, 0)
      : 0;

  const exportPower =
    op.powerReadingAmExport != null && op.powerReadingPmExport != null
      ? Math.max(op.powerReadingPmExport - op.powerReadingAmExport, 0)
      : 0;

  return {
    powerConsumed: +importPower.toFixed(2),
    solarGenerated: +exportPower.toFixed(2),
    runningHours: +(op.plantRunningHrs ?? 0).toFixed(2),
  };
};

/* ================= PELLETS ================= */
export const calcPelletsMetrics = (op) => {
  if (!op) return {};

  return {
    pelletsUsed: op.pillets ?? 0,
    pelletsStock: op.pilletsStock ?? 0,
    polymerUsed: op.polymerUsage ?? 0, // grams
    polymerStock: op.polymerStock ?? 0, // kg
  };
};
