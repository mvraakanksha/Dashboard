import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import logo from '../../reports/company_logo.png'
import { getPlantById } from "../../../services/plantService";
import { getVehiclesByPlant } from "../../../services/vehicleService";
import { getEmployeesByPlant } from "../../../services/employeeService";

/* ================= INFO ROW ================= */
const InfoRow = ({ label, value }) => (
  <div className="flex justify-between gap-4 py-1 border-b last:border-b-0">
    <span className="text-slate-500 text-sm">{label}</span>
    <span className="font-semibold text-slate-800 text-sm">
      {value ?? "-"}
    </span>
  </div>
);
/* ================= SAFE VALUE HELPER ================= */

const formatDate = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};


export default function PlantOneTimeReport() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [plant, setPlant] = useState(null);
  const [loading, setLoading] = useState(true);


const [vehicles, setVehicles] = useState([]);
const [employees, setEmployees] = useState([]);


  /* ================= FETCH PLANT (SERVICE) ================= */
useEffect(() => {
  setLoading(true);

  getPlantById(id)
    .then((data) => setPlant(data || null))
    .catch(console.error)
    .finally(() => setLoading(false));
}, [id]);

useEffect(() => {
  if (!id) return;

  const loadPlantDetails = async () => {
    try {
      const [vehicleData, employeeData] = await Promise.all([
        getVehiclesByPlant(id),
        getEmployeesByPlant(id),
      ]);

      setVehicles(Array.isArray(vehicleData) ? vehicleData : []);
      setEmployees(Array.isArray(employeeData) ? employeeData : []);
    } catch (err) {
      console.error("Plant details fetch failed:", err);
      setVehicles([]);
      setEmployees([]);
    }
  };

  loadPlantDetails();
}, [id]);
const dashVal = (v) =>
  v === null || v === undefined || v === "" ? "-" : String(v);

const licenceVal = (isDriver, v) =>
  isDriver ? dashVal(v) : "NA";

const downloadPdf = () => {
  if (!plant) return;

 const doc = new jsPDF({
  orientation: "portrait",
  unit: "mm",
  format: "a4",
  compress: true   // ⭐ important
});
doc.setFont("times", "normal");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  /* =====================================================
     PAGE 1 : HEADER + PLANT DETAILS
  ===================================================== */

  doc.setFillColor(0, 0, 128);
  doc.rect(0, 0, pageWidth, 18, "F");

  doc.addImage(logo, "PNG", 10, 3, 24, 12);

  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.text("PLANT REPORT", pageWidth / 2, 12, { align: "center" });

  doc.setFontSize(9);
  doc.text(
    `Generated on: ${new Date().toLocaleString("en-IN")}`,
    pageWidth - 10,
    12,
    { align: "right" }
  );

  doc.setTextColor(0);

  autoTable(doc, {
    startY: 25,
    theme: "grid",
    styles: { fontSize: 8 ,  font: "times"},
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 85 } },
    body: [
      ["Plant ID", plant.plantID],
      ["Plant Name", plant.plantName],
      ["State", plant.stateCode],
      ["District", plant.district],
      ["KLD", plant.kld],
      ["Zone", `Zone ${plant.zones}`],
      ["Ward No", dashVal(plant.wardNo)],
      ["Pin Code", dashVal(plant.pinCode)],

      ["MNIT", plant.mnit ? "YES" : "NO"],
      ["MNIT Completion Date", dashVal(formatDate(plant.mnitDateOfCompletion))],

      ["Permanent Power", plant.permanentPower ? "YES" : "NO"],
      ["PP Completion Date", dashVal(formatDate(plant.permanentPowerDateOfCompletion))],
      ["PP Meter Serial No", dashVal(plant.ppMeterSerialNo)],

      ["Solar", plant.solar ? "YES" : "NO"],
      ["Solar Completion Date", dashVal(formatDate(plant.solarDateOfCompletion))],
      ["Solar Capacity", dashVal(plant.solarPlantCapacity)],
      ["Solar Meter Serial No", dashVal(plant.solarMeterSerialNo)],

      ["Internet", plant.internet ? "YES" : "NO"],
      ["Internet Completion Date", dashVal(formatDate(plant.internetDateOfCompletion))],

      ["Construction Start Date", dashVal(formatDate(plant.constructionStartedDate))],
      ["Civil Work Completed Date", dashVal(formatDate(plant.civilWorkCompletedDate))],
      ["Machinery Assemble Date", dashVal(formatDate(plant.machinaryAssembleDate))],

      ["COD/BOD Sensor Date", dashVal(formatDate(plant.codAndBodSenserDate))],
      ["IP Phone Date", dashVal(formatDate(plant.ipPhoneDate))],
      ["Camera Configuration Date", dashVal(formatDate(plant.cameraConfigurationDate))],

      ["Tabs Received", plant.tabs ? "YES" : "NO"],
      ["Tabs Received Date", dashVal(formatDate(plant.tabsReceivedDate))],

      ["CTO Certified", plant.ctoCertified ? "YES" : "NO"],
      ["CTO Issued Date", dashVal(formatDate(plant.ctoIssuedDate))],
      ["CTE Certified", plant.cteCertified ? "YES" : "NO"],
      ["CTE Issued Date", dashVal(formatDate(plant.cteIssuedDate))],

      ["Total Vehicles", vehicles.length],
      ["Total Employees", employees.length],
    ],
  });

  /* =====================================================
     PAGE 2 : VEHICLES + EMPLOYEES (CONTINUOUS)
  ===================================================== */

  doc.addPage();

  doc.setFontSize(14);
  doc.text("Vehicle Details", pageWidth / 2, 20, { align: "center" });

  const v1 = vehicles[0] || {};
  const v2 = vehicles[1] || {};

  autoTable(doc, {
    startY: 28,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3,  font: "times" },
    headStyles: { fillColor: [0, 0, 128], textColor: 255 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 70 },
      1: { cellWidth: 55 },
      2: { cellWidth: 55 },
    },
    head: [["Field", "Vehicle 1", "Vehicle 2"]],
    body: [
      ["Vehicle Number", dashVal(v1.vehicleNumber), dashVal(v2.vehicleNumber)],
      ["Model Name", dashVal(v1.vehicleModelName), dashVal(v2.vehicleModelName)],
      ["Chassis No", dashVal(v1.vehicleChassisNo), dashVal(v2.vehicleChassisNo)],
      ["Engine No", dashVal(v1.vehicleEngineNumber), dashVal(v2.vehicleEngineNumber)],
      ["Registration Date", dashVal(formatDate(v1.dateOfRegistration)), dashVal(formatDate(v2.dateOfRegistration))],
      ["Insurance Date", dashVal(formatDate(v1.insuranceDate)), dashVal(formatDate(v2.insuranceDate))],
      ["Insurance Expiry", dashVal(formatDate(v1.insuranceExpiryDate)), dashVal(formatDate(v2.insuranceExpiryDate))],
      ["GPS Installed", v1.gpsStatus ? "YES" : "-", v2.gpsStatus ? "YES" : "-"],
      ["GPS Installation Date", dashVal(formatDate(v1.gpsInstallationDate)), dashVal(formatDate(v2.gpsInstallationDate))],

      ["Battery Make", dashVal(v1.vehicleBatteryMake), dashVal(v2.vehicleBatteryMake)],
      ["Battery Number", dashVal(v1.vehicleBatteryNumber), dashVal(v2.vehicleBatteryNumber)],
      ["Battery Purchase Date", dashVal(formatDate(v1.vehicleBatteryPurchaseDate)), dashVal(formatDate(v2.vehicleBatteryPurchaseDate))],
      ["Battery Expiry Date", dashVal(formatDate(v1.vehicleBatteryExpiryDate)), dashVal(formatDate(v2.vehicleBatteryExpiryDate))],

      ["Front Right Tyre Make", dashVal(v1.vehicleTyreFrontRightMake), dashVal(v2.vehicleTyreFrontRightMake)],
      ["Front Right Tyre Serial No", dashVal(v1.vehicleTyreFrontRightSerialNo), dashVal(v2.vehicleTyreFrontRightSerialNo)],
      ["Front Left Tyre Make", dashVal(v1.vehicleTyreFrontLeftMake), dashVal(v2.vehicleTyreFrontLeftMake)],
      ["Front Left Tyre Serial No", dashVal(v1.vehicleTyreFrontLeftSerialNo), dashVal(v2.vehicleTyreFrontLeftSerialNo)],

      ["Rear Right Inner Tyre Make", dashVal(v1.vehicleTyreRearRightInnerMake), dashVal(v2.vehicleTyreRearRightInnerMake)],
      ["Rear Right Inner Tyre Serial No", dashVal(v1.vehicleTyreRearRightInnerSerialNo), dashVal(v2.vehicleTyreRearRightInnerSerialNo)],
      ["Rear Right Outer Tyre Make", dashVal(v1.vehicleTyreRearRightOuterMake), dashVal(v2.vehicleTyreRearRightOuterMake)],
      ["Rear Right Outer Tyre Serial No", dashVal(v1.vehicleTyreRearRightOuterSerialNo), dashVal(v2.vehicleTyreRearRightOuterSerialNo)],

      ["Rear Left Inner Tyre Make", dashVal(v1.vehicleTyreRearLeftInnerMake), dashVal(v2.vehicleTyreRearLeftInnerMake)],
      ["Rear Left Inner Tyre Serial No", dashVal(v1.vehicleTyreRearLeftInnerSerialNo), dashVal(v2.vehicleTyreRearLeftInnerSerialNo)],
      ["Rear Left Outer Tyre Make", dashVal(v1.vehicleTyreRearLeftOuterMake), dashVal(v2.vehicleTyreRearLeftOuterMake)],
      ["Rear Left Outer Tyre Serial No", dashVal(v1.vehicleTyreRearLeftOuterSerialNo), dashVal(v2.vehicleTyreRearLeftOuterSerialNo)],

      ["Stepney Make", dashVal(v1.stepneyMake), dashVal(v2.stepneyMake)],
      ["Stepney Serial No", dashVal(v1.stepneySerialNo), dashVal(v2.stepneySerialNo)],
    ],
  });

  /* ================= EMPLOYEES (BELOW VEHICLES) ================= */

  const empStartY = doc.lastAutoTable.finalY + 10;

  doc.setFontSize(14);
  doc.text("Employee Details", pageWidth / 2, empStartY - 4, { align: "center" });

  autoTable(doc, {
    startY: empStartY,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3,  font: "times" },
    headStyles: { fillColor: [0, 0, 128], textColor: 255 },
    head: [[
      "Emp ID",
      "Name",
      "Designation",
      "Mobile No",
      "Date of Joining",
      "Licence Type",
      "Licence No",
      "Licence Expiry",
    ]],
    body: employees.map(e => {
      const isDriver = String(e.designation).toLowerCase() === "driver";
      return [
        dashVal(e.employeeId),
        dashVal(e.employeeName),
        dashVal(e.designation),
        dashVal(e.mobileNo),
        dashVal(formatDate(e.dateOfJoining)),
        licenceVal(isDriver, e.licenceType),
        licenceVal(isDriver, e.licenceNumber),
        licenceVal(formatDate(isDriver, e.licenceExpiryDate)),
      ];
    }),
  });

  /* ================= FOOTER ================= */
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  doc.save(`Plant_${plant.plantID}_Complete_Report.pdf`);
};


  /* ================= UI ================= */
  if (loading) {
    return <div className="p-6">Loading plant details…</div>;
  }

  if (!plant) {
    return <div className="p-6 text-red-600">Plant not found</div>;
  }

  return (
<div className="max-w-15xl mx-auto p-6 space-y-4">
  <div className="max-w-12xl mx-auto p-6 space-y-4">

    {/* HEADER */}
    <div className="bg-white rounded-xl border border-slate-200 px-6 py-6 mb-6">
      <div className="flex items-center justify-between">
    {/* LEFT */}
    <div>
      <h2 className="text-2xl font-extrabold text-slate-800 tracking-wide">
        {plant.plantName}
      </h2>

      <p className="text-sm text-slate-500 mt-1">
        Plant ID: <span className="font-semibold">{plant.plantID}</span>
      </p>

      {/* COUNTS */}
      <div className="mt-3 flex gap-6 text-sm text-slate-600">
        <span>
          Total Vehicles:{" "}
          <strong className="text-slate-800">{vehicles.length}</strong>
        </span>
        <span>
          Total Employees:{" "}
          <strong className="text-slate-800">{employees.length}</strong>
        </span>
      </div>
    </div>

    {/* RIGHT ACTIONS */}
    <div className="flex gap-3">
      <button
        onClick={downloadPdf}
        className="flex items-center gap-2 px-5 py-2.5
                   text-sm font-bold bg-indigo-600 text-white
                   rounded-lg hover:bg-indigo-700 shadow"
      >
        <Download size={16} />
        Download
      </button>

      <button
        onClick={() => navigate("/plants")}
        className="flex items-center gap-2 px-5 py-2.5
                   text-sm font-bold border border-slate-300
                   rounded-lg hover:bg-slate-100"
      >
        <X size={16} />
        Close
      </button>
    </div>

  </div>
</div>


 {/* DETAILS CARD */}

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-white rounded-xl border p-5 max-h-[620px] shadow-sm">
  {/* SCROLL CONTAINER */}
  <div className="space-y-3 max-h-[580px] overflow-y-auto pr-2">
<div className="border rounded-lg p-4 bg-slate-50 space-y-2">
    <InfoRow label="State" value={plant.stateCode} />
    <InfoRow label="District" value={plant.district} />
    <InfoRow label="KLD" value={plant.kld} />
    <InfoRow label="Zone" value={`Zone ${plant.zones}`} />
    <InfoRow label="Ward No" value={plant.wardNo} />
    <InfoRow label="Pin Code" value={plant.pinCode} />

    <InfoRow label="MNIT" value={plant.mnit ? "YES" : "NO"} />
    <InfoRow label="MNIT Completion Date" value={formatDate(plant.mnitDateOfCompletion)} />

    <InfoRow
      label="Permanent Power"
      value={plant.permanentPower ? "YES" : "NO"}
    />
    <InfoRow
      label="Permanent Power Completion Date"
      value={formatDate(plant.permanentPowerDateOfCompletion)}
    />
    <InfoRow
      label="Permanent Power Meter Serial Number"
      value={plant.ppMeterSerialNo}
    />

    <InfoRow label="Solar Plant" value={plant.solar ? "YES" : "NO"} />
    <InfoRow
      label="Solar Completion Date"
      value={formatDate(plant.solarDateOfCompletion)}
    />
    <InfoRow
      label="Solar Capacity (KLD)"
      value={plant.solarPlantCapacity}
    />
    <InfoRow
      label="Solar Meter Serial Number"
      value={plant.solarMeterSerialNo}
    />

    <InfoRow label="Internet" value={plant.internet ? "YES" : "NO"} />
    <InfoRow
      label="Internet Completion Date"
      value={formatDate(plant.internetDateOfCompletion)}
    />

    <InfoRow label="Number of Vehicles" value={plant.noOfVehicle} />
    <InfoRow label="Number of Employees" value={plant.noOfEmployees} />

    <InfoRow
      label="Construction Started Date"
      value={formatDate(plant.constructionStartedDate)}
    />
    <InfoRow
      label="Civil Work Completed Date"
      value={formatDate(plant.civilWorkCompletedDate)}
    />
    <InfoRow
      label="Machinery Assemble Date"
      value={formatDate(plant.machinaryAssembleDate)}
    />

    <InfoRow
      label="COD/BOD Sensor Date"
      value={formatDate(plant.codAndBodSenserDate)}
    />
    <InfoRow
      label="IP Phone Reached Date"
      value={formatDate(plant.ipPhoneDate)}
    />
    <InfoRow
      label="Camera Configuration Date"
      value={formatDate(plant.cameraConfigurationDate)}
    />

    <InfoRow label="Tabs Received" value={plant.tabs ? "YES" : "NO"} />
    <InfoRow
      label="Tabs Received Date"
      value={formatDate(plant.tabsReceivedDate)}
    />

    <InfoRow label="CTO Certified" value={plant.ctoCertified ? "YES" : "NO"} />
    <InfoRow label="CTO Issued Date" value={formatDate(plant.ctoIssuedDate)} />

    <InfoRow label="CTE Certified" value={plant.cteCertified ? "YES" : "NO"} />
    <InfoRow label="CTE Issued Date" value={formatDate(plant.cteIssuedDate)} />
</div>
  </div>
</div>


  {/* VEHICLES LIST */}
{/* VEHICLES DETAILS */}
<div className="bg-white rounded-xl border p-4  max-h-[620px] shadow-sm">
  <h3 className="text-sm font-bold text-slate-700 mb-3">
    Vehicles ({vehicles.length})
  </h3>

  {vehicles.length === 0 ? (
    <p className="text-xs text-slate-400">No vehicles found</p>
  ) : (
    <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
     {vehicles.map((v) => (
  <div
    key={v.vehicleID}
    className="border rounded-lg p-4 bg-slate-50 space-y-2"
  >
    {/* HEADER */}
    <p className="text-xs font-bold text-indigo-700 mb-2">
      Vehicle Number: {v.vehicleNumber}
    </p>

    {/* BASIC DETAILS */}
    <InfoRow label="Model Name" value={v.vehicleModelName} />
    <InfoRow label="Chassis No" value={v.vehicleChassisNo} />
    <InfoRow label="Engine No" value={v.vehicleEngineNumber} />

    {/* REGISTRATION & INSURANCE */}
    <InfoRow label="Registration Date" value={formatDate(v.dateOfRegistration)} />
    <InfoRow label="Insurance Date" value={formatDate(v.insuranceDate)} />
    <InfoRow label="Insurance Expiry Date" value={formatDate(v.insuranceExpiryDate)} />

    {/* GPS */}
    <InfoRow label="GPS Installed" value={v.gpsStatus ? "YES" : "NO"} />
    <InfoRow label="GPS Installation Date" value={v.gpsInstallationDate} />

    {/* BATTERY */}
    <InfoRow label="Battery Make" value={v.vehicleBatteryMake} />
    <InfoRow label="Battery Number" value={v.vehicleBatteryNumber} />
    <InfoRow label="Battery Purchase Date" value={formatDate(v.vehicleBatteryPurchaseDate)} />
    <InfoRow label="Battery Expiry Date" value={formatDate(v.vehicleBatteryExpiryDate)} />

    {/* TYRES */}
    <div className="pt-2 mt-2 border-t text-xs font-bold text-slate-600">
      Tyre Details
    </div>

    <InfoRow
      label="Front Right Tyre Make"
      value={v.vehicleTyreFrontRightMake}
    />
    <InfoRow
      label="Front Right Tyre Serial No"
      value={v.vehicleTyreFrontRightSerialNo}
    />

    <InfoRow
      label="Front Left Tyre Make"
      value={v.vehicleTyreFrontLeftMake}
    />
    <InfoRow
      label="Front Left Tyre Serial No"
      value={v.vehicleTyreFrontLeftSerialNo}
    />

    <InfoRow
      label="Rear Right Inner Tyre Make"
      value={v.vehicleTyreRearRightInnerMake}
    />
    <InfoRow
      label="Rear Right Inner Tyre Serial No"
      value={v.vehicleTyreRearRightInnerSerialNo}
    />

    <InfoRow
      label="Rear Right Outer Tyre Make"
      value={v.vehicleTyreRearRightOuterMake}
    />
    <InfoRow
      label="Rear Right Outer Tyre Serial No"
      value={v.vehicleTyreRearRightOuterSerialNo}
    />

    <InfoRow
      label="Rear Left Inner Tyre Make"
      value={v.vehicleTyreRearLeftInnerMake}
    />
    <InfoRow
      label="Rear Left Inner Tyre Serial No"
      value={v.vehicleTyreRearLeftInnerSerialNo}
    />

    <InfoRow
      label="Rear Left Outer Tyre Make"
      value={v.vehicleTyreRearLeftOuterMake}
    />
    <InfoRow
      label="Rear Left Outer Tyre Serial No"
      value={v.vehicleTyreRearLeftOuterSerialNo}
    />

    {/* STEPNEY */}
    <div className="pt-2 mt-2 border-t text-xs font-bold text-slate-600">
      Stepney Details
    </div>

    <InfoRow label="Stepney Make" value={v.stepneyMake} />
    <InfoRow label="Stepney Serial No" value={v.stepneySerialNo} />

    {/* META */}
    {/* <div className="pt-2 mt-2 border-t text-[10px] text-slate-400 flex justify-between">
      
      <span>Updated: {v.updatedAt}</span>
    </div> */}
  </div>
))}

    </div>
  )}
</div>


  {/* EMPLOYEES LIST */}
{/* EMPLOYEES DETAILS */}
<div className="bg-white rounded-xl border p-4 shadow-sm  max-h-[620px]">
  <h3 className="text-sm font-bold text-slate-700 mb-3">
    Employees ({employees.length})
  </h3>

  {employees.length === 0 ? (
    <p className="text-xs text-slate-400">No employees found</p>
  ) : (
    <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
      {employees.map((e) => (
  <div
    key={e.employeeId}
    className="border rounded-lg p-3 bg-slate-50"
  >
    <p className="text-xs font-bold text-emerald-700 mb-2">
      Employee ID: {e.employeeId}
    </p>

    <InfoRow label="Name" value={e.employeeName} />
    <InfoRow label="Designation" value={e.designation} />
    <InfoRow label="Mobile No" value={e.mobileNo} />
    <InfoRow label="Alternate Mobile" value={e.alternateMobNo} />
    <InfoRow label="Address" value={e.address} />
    <InfoRow label="Date of Birth" value={formatDate(e.dateOfBirth)} />
    <InfoRow label="Date of Joining" value={formatDate(e.dateOfJoining)} />

    {/* ✅ SHOW ONLY FOR DRIVER */}
    {String(e.designation).toLowerCase() === "driver" && (
      <>
        <InfoRow label="Licence Type" value={e.licenceType} />
        <InfoRow label="Licence Number" value={e.licenceNumber} />
        <InfoRow label="Licence Issue Date" value={formatDate(e.licenceIssueDate)} />
        <InfoRow label="Licence Expiry Date" value={formatDate(e.licenceExpiryDate)} />
      </>
    )}
  </div>
))}

    </div>
  )}
  
</div>


 </div>

</div>

    </div>
  );
}
