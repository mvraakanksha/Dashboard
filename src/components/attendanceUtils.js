export const calculateAttendanceKpis = ({
  plants,
  employees,
  attendanceOps,
  historyOps,
  date,
  zone
}) => {

  const isEmployeeValid = (emp) => {
    if (!emp.dateOfJoining) return false;

    if (emp.dateOfJoining > date) return false;
    if (emp.dateOfLeaving && emp.dateOfLeaving < date) return false;

    return true;
  };

  // employeesByPlant
  const employeesByPlant = {};
employees.forEach(e => {
  if (!isEmployeeValid(e)) return;

  employeesByPlant[e.plantId] ||= [];

  const key = `${e.employeeId}_${e.dateOfJoining}`;

  if (!employeesByPlant[e.plantId].some(
    x => `${x.employeeId}_${x.dateOfJoining}` === key
  )) {
    employeesByPlant[e.plantId].push(e);
  }
});

// 🔥 ADD HISTORY EMPLOYEES (MISSING PART)
historyOps.forEach(op => {
  const emp = {
    employeeId: op.employeeId,
    plantId: op.plantId,
    designation: op.designation,
    dateOfJoining: op.dateOfJoining,
    dateOfLeaving: op.dateOfLeaving
  };

  if (!isEmployeeValid(emp)) return;

  const key = `${emp.employeeId}_${emp.dateOfJoining}`;

  employeesByPlant[op.plantId] ||= [];

  if (!employeesByPlant[op.plantId].some(
    e => `${e.employeeId}_${e.dateOfJoining}` === key
  )) {
    employeesByPlant[op.plantId].push(emp);
  }
});

  // attendanceMap
const attendanceMap = {};

attendanceOps.forEach(o => {
  const empList = employeesByPlant[o.plantId] || [];

  empList.forEach(emp => {
    if (emp.employeeId === o.employeeId) {
      const key = `${emp.employeeId}_${emp.dateOfJoining}`;
      attendanceMap[key] = o;
    }
  });
});


historyOps.forEach(o => {
  const key = `${o.employeeId}_${o.dateOfJoining}`;

  const validOp = (o.operations || []).find(op => {
    if (!o.dateOfLeaving) return true;
    return op.operationDate <= o.dateOfLeaving;
  });

  if (validOp) {
    attendanceMap[key] = {
      plantOp: validOp
    };
  }
});


  // zone filter
  const zonePlantIds = plants
    .filter(p => zone === "All" || String(p.zones) === String(zone))
    .map(p => p.plantID);

  const zoneEmployees = zonePlantIds.flatMap(pid => employeesByPlant[pid] || []);

  // totals
  let totalPresent = 0;

zoneEmployees.forEach(emp => {
  // ✅ IMPORTANT: same validation as Attendance page
  if (!isEmployeeValid(emp)) return;

  if (emp.dateOfLeaving && emp.dateOfLeaving < date) return;

  const key = `${emp.employeeId}_${emp.dateOfJoining}`;
  const rec = attendanceMap[key];

let presentValue = 0; // ✅ default absent

if (rec?.plantOp) {
  const opDate = rec.plantOp.operationDate;

  // 🔥 ignore operations after leaving
  if (emp.dateOfLeaving && opDate > emp.dateOfLeaving) {
    presentValue = 0;
  } else {
    if (
      rec.plantOp.attendanceAm === true &&
      (rec.plantOp.attendancePm === null ||
       rec.plantOp.attendancePm === true)
    ) {
      presentValue = 1;
    } else if (
      rec.plantOp.attendanceAm === true ||
      rec.plantOp.attendancePm === true
    ) {
      presentValue = 0.5;
    }
  }
}

totalPresent += presentValue;

});
const totalEmployees = zoneEmployees.filter(emp => {
  if (!isEmployeeValid(emp)) return false;
  if (emp.dateOfLeaving && emp.dateOfLeaving < date) return false;
  return true;
}).length;

  const totalAbsent = totalEmployees - totalPresent;

  return {
    totalEmployees,
    totalPresent,
    totalAbsent
  };
};