import { useEffect, useMemo, useState } from "react";
import {
  Factory,
  CheckCircle,
  Wifi,
  Sun,
  Zap,
  LayoutDashboard,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { getAllPlants } from "../../../services/plantService";
import { getVehiclesByPlant } from "../../../services/vehicleService";
import companyLogo from '../company_logo1.jpg'

// ✔ jsPDF-safe PNG icons (verified)
const GREEN_TICK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAAX0lEQVR42mNgGAWjgP9nYGBg+M+ABZgYGBgYkJGR/4GBgYFhGJwYGBgYGJwE0H0AxIYGBgYHhGQxYGBgYHjGgYGBgYHjGgYGBgYHgGABf2S6O4n2d0AAAAAElFTkSuQmCC";

const RED_CROSS =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAAXklEQVR42mNgGAWjgP+ZmZkZGBj8//8/AwMDAwMDE4GBgYFhGJwYGBgYGJwE0H0AxIYGBgYHhGQxYGBgYHjGgYGBgYHjGgYGBgYHgGAAAslS6O3v9KAAAAAElFTkSuQmCC";


/* ================= STATUS BADGE ================= */
const StatusBadge = ({ active, label }) => (
  <div
    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
      active
        ? "bg-emerald-50 text-emerald-600 border-emerald-300"
        : "bg-slate-50 text-slate-300 border-slate-200"
    }`}
  >
    {label}
  </div>
);

const formatDate = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

/* ================= STAT CARD ================= */
const StatCard = ({ title, count, icon, active, onClick }) => (
  <div
    onClick={onClick}
    className={`p-5 rounded-xl border cursor-pointer transition-all ${
      active
        ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500"
        : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow"
    }`}
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 mt-1">{count}</h3>
      </div>
      <div className="p-2 rounded bg-slate-100 text-slate-500">{icon}</div>
    </div>
  </div>
);

export default function PlantReport() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
const [fromDate, setFromDate] = useState("");
const [toDate, setToDate] = useState("");
const [gpsVehicleMap, setGpsVehicleMap] = useState({});
  const [zoneFilter, setZoneFilter] = useState(() => {
  return localStorage.getItem("plantReportZone") || "All";
});

const location = useLocation();

const [selectedCard, setSelectedCard] = useState(
  location.state?.selectedCard || "ALL"
);

useEffect(() => {
  if (location.state?.selectedCard) {
    setSelectedCard(location.state.selectedCard);
  }
}, [location.state]);

  const navigate = useNavigate();
const [yesNoFilter, setYesNoFilter] = useState("ALL");
useEffect(() => {
  localStorage.setItem("plantReportZone", zoneFilter);
}, [zoneFilter]);

  /* ================= FETCH PLANTS ================= */
useEffect(() => {
  getAllPlants()
    .then(setPlants)
    .catch(console.error)
    .finally(() => setLoading(false));
}, []);
useEffect(() => {
  if (!plants.length) return;

  const fetchGpsVehicles = async () => {
    const map = {};

    await Promise.all(
      plants.map(async (plant) => {
        try {
          const vehicles = await getVehiclesByPlant(plant.plantID);

          map[plant.plantID] = vehicles || [];
        } catch (err) {
          map[plant.plantID] = [];
        }
      })
    );

    setGpsVehicleMap(map);
  };

  fetchGpsVehicles();
}, [plants]);

  /* ================= ZONES ================= */
  const zones = useMemo(
    () => Array.from(new Set(plants.map(p => p.zones))).sort(),
    [plants]
  );

const zoneFilteredPlants = useMemo(() => {
  if (zoneFilter === "All") return plants;
  return plants.filter(p => p.zones === Number(zoneFilter));
}, [plants, zoneFilter]);


  /* ================= FILTERED PLANTS ================= */
const filteredPlants = useMemo(() => {

  if (selectedCard === "ALL") {
    return zoneFilteredPlants;
  }

  return zoneFilteredPlants.filter(p => {

    let value = false;
    let dateField = null;

    if (selectedCard === "MNIT") {
      value = p.mnit;
      dateField = p.mnitDateOfCompletion;
    }

    if (selectedCard === "POWER") {
      value = p.permanentPower;
      dateField = p.permanentPowerDateOfCompletion;
    }

    if (selectedCard === "SOLAR") {
      value = p.solar;
      dateField = p.solarDateOfCompletion;
    }

    if (selectedCard === "INTERNET") {
      value = p.internet;
      dateField = p.internetDateOfCompletion;
    }

    if (selectedCard === "CODBOD") {
      value = !!p.codAndBodSenserDate;
      dateField = p.codAndBodSenserDate;
    }

    if (selectedCard === "IPPHONES") {
  value = !!p.ipPhoneDate;
  dateField = p.ipPhoneDate;
}

if (selectedCard === "TABS") {
  value = !!p.tabsReceivedDate;
  dateField = p.tabsReceivedDate;
}

if (selectedCard === "GPS") {
  const vehicles = gpsVehicleMap[p.plantID] || [];

  // if any vehicle matches
  value = vehicles.some(v => v.gpsStatus);

  // take first installed date for filtering
  const installedVehicle = vehicles.find(v => v.gpsStatus);
  dateField = installedVehicle?.gpsInstallationDate || null;
}
if (selectedCard === "CAMERA") {
  value = !!p.cameraConfigurationDate;
  dateField = p.cameraConfigurationDate;
}
    if (selectedCard === "CTE") {
      value = p.cteCertified;
      dateField = p.cteIssuedDate;
    }

    if (selectedCard === "CTO") {
      value = p.ctoCertified;
      dateField = p.ctoIssuedDate;
    }

    if (selectedCard === "CTE/CTO") {
      value = p.cteCertified && p.ctoCertified;
      dateField = p.cteIssuedDate || p.ctoIssuedDate;
    }

    // YES / NO filter
    if (yesNoFilter === "YES" && value !== true) return false;
    if (yesNoFilter === "NO" && value !== false) return false;

    // DATE RANGE FILTER
    if (fromDate && dateField) {
      if (new Date(dateField) < new Date(fromDate)) return false;
    }

    if (toDate && dateField) {
      if (new Date(dateField) > new Date(toDate)) return false;
    }

    return true;

  });

}, [zoneFilteredPlants, selectedCard, yesNoFilter, fromDate, toDate]);
  /* ================= COUNTS ================= */
const counts = useMemo(() => ({
  total: zoneFilteredPlants.length,
  mnit: zoneFilteredPlants.filter(p => p.mnit).length,
  power: zoneFilteredPlants.filter(p => p.permanentPower).length,
  solar: zoneFilteredPlants.filter(p => p.solar).length,
  internet: zoneFilteredPlants.filter(p => p.internet).length,
codBod: zoneFilteredPlants.filter(p => p.codAndBodSenserDate).length,
ipPhones: zoneFilteredPlants.filter(p => p.ipPhoneDate).length,
tabsReceived: zoneFilteredPlants.filter(p => p.tabsReceivedDate).length,
gpsInstalled: zoneFilteredPlants.reduce((total, plant) => {
  const vehicles = gpsVehicleMap[plant.plantID] || [];
  const installedCount = vehicles.filter(v => v.gpsStatus).length;
  return total + installedCount;
}, 0),
cameraConfigured: zoneFilteredPlants.filter(p => p.cameraConfigurationDate).length,
  // ✅ CTE / CTO
  cteCertified: zoneFilteredPlants.filter(p => p.cteCertified).length,
  cteIssued: zoneFilteredPlants.filter(p => p.cteIssuedDate).length,
  ctoCertified: zoneFilteredPlants.filter(p => p.ctoCertified).length,
  ctoIssued: zoneFilteredPlants.filter(p => p.ctoIssuedDate).length,
}), [zoneFilteredPlants,gpsVehicleMap]);

  /* ================= TODAY DATE ================= */
  const today = useMemo(
    () => new Date().toISOString().split("T")[0],
    []
  );

  const yesNoIcon = (value) => ({
  content: value ? "✓" : "✗",
  styles: {
    textColor: value ? [0, 150, 0] : [200, 0, 0], // green / red
    fontStyle: "bold"
  }
});

const yn = (v) => (v ? "✓" : "✗");

const loadImageAsBase64 = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpg"));
    };
  });

const loadAndCompressImage = (
  src,
  { targetWidth = 240, targetHeight = 120, quality = 0.7 } = {}
) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false; // 🔥 keeps logo sharp
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      resolve({
        base64: canvas.toDataURL("image/jpeg", quality),
        width: targetWidth,
        height: targetHeight,
      });
    };
  });

  /* ================= DOWNLOAD ================= */
const downloadTablePdf = async () => {
  const doc = new jsPDF("portrait", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  /* ================= LOAD LOGO ================= */
  const logo = await loadAndCompressImage(companyLogo, {
    targetWidth: 240,
    targetHeight: 120,
    quality: 0.7
  });

  /* ================= DRAW LOGO ================= */
  doc.addImage(
    logo.base64,
    "JPEG",
    8,               // x
    6,               // y
    logo.width / 8,  // display width
    logo.height / 8  // display height
  );

  /* ================= TITLE ================= */
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(200, 0, 0);
  doc.text("MVR TECHNOLOGY", pageWidth / 2, 14, { align: "center" }
  );

doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("FSTP RAJASTHAN", pageWidth / 2, 20, { align: "center" });


  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(95);
doc.text(
  selectedCard === "ALL"
    ? "Plant Infrastructure Report"
    : `${selectedCard} Completion Report`,
  pageWidth / 2,
  25,
  { align: "center" }
);


  doc.setDrawColor(220);
  doc.line(6, 28, pageWidth - 6, 28);

  /* ================= DYNAMIC HEAD ================= */
  const isAll = selectedCard === "ALL";
const isCTECTO = selectedCard === "CTE/CTO";

const pdfHead = isAll
  ? [[
      "S.No",
      "Plant ID",
      "Plant Name",
      "KLD",
      "District",
      "Zone",
      "MNIT",
      "POWER",
      "SOLAR",
      "INTERNET",
      "COD/BOD"
    ]]
  : isCTECTO
    ? [[
        "S.No",
        "Plant ID",
        "Plant Name",
        "KLD",
        "CTE Certified",
        "CTE Issued Date",
        "CTO Certified",
        "CTO Issued Date"
      ]]
    : [[
        "S.No",
        "Plant ID",
        "Plant Name",
        "KLD",
        selectedCard,
        "Completion Date"
      ]];

  /* ================= DYNAMIC BODY ================= */
const pdfBody = filteredPlants.map((p, i) => {
  if (isAll) {
    return [
      i + 1,
      p.plantID,
      p.plantName,
      p.kld,
      p.district,
      p.zones,
      p.mnit,
      p.permanentPower,
      p.solar,
      p.internet,
      !!p.codAndBodSenserDate
    ];
  }

  // ✅ CTE / CTO MODE
  if (isCTECTO) {
    return [
      i + 1,
      p.plantID,
      p.plantName,
      p.kld,

      p.cteCertified ? "YES" : "No",
      p.cteCertified ? formatDate(p.cteIssuedDate) : "-",

      p.ctoCertified ? "YES" : "No",
      p.ctoCertified ? formatDate(p.ctoIssuedDate) : "-"
    ];
  }

  // ✅ EXISTING SINGLE-STATUS MODE
  let status = false;
  let completionDate = "-";

  if (selectedCard === "MNIT") {
    status = p.mnit;
   completionDate = formatDate(p.mnitDateOfCompletion);
  }
  if (selectedCard === "POWER") {
    status = p.permanentPower;
    completionDate =formatDate( p.permanentPowerDateOfCompletion);
  }
  if (selectedCard === "SOLAR") {
    status = p.solar;
    completionDate = formatDate(p.solarDateOfCompletion);
  }
  if (selectedCard === "INTERNET") {
    status = p.internet;
    completionDate = formatDate(p.internetDateOfCompletion);
  }

  if (selectedCard === "CODBOD") {
  status = !!p.codAndBodSenserDate;
  completionDate = p.codAndBodSenserDate
    ? formatDate(p.codAndBodSenserDate)
    : "-";
}

  if (selectedCard === "IPPHONES") {
  status = !!p.ipPhoneDate;
  completionDate = p.ipPhoneDate ? formatDate(p.ipPhoneDate) : "-";
}

if (selectedCard === "TABS") {
  status = !!p.tabsReceivedDate;
  completionDate = p.tabsReceivedDate ? formatDate(p.tabsReceivedDate) : "-";
}

if (selectedCard === "GPS") {
  const vehicles = gpsVehicleMap[p.plantID] || [];

  return vehicles.map((vehicle, idx) => [
    i + 1,
    p.plantID,
    p.plantName,
    p.kld,
    vehicle.vehicleNumber,
    vehicle.gpsStatus ? "YES" : "NO",
    vehicle.gpsStatus
      ? formatDate(vehicle.gpsInstallationDate)
      : "-"
  ]);
}

if (selectedCard === "CAMERA") {
  status = !!p.cameraConfigurationDate;
  completionDate = p.cameraConfigurationDate ? formatDate(p.cameraConfigurationDate) : "-";
}

  return [
    i + 1,
    p.plantID,
    p.plantName,
    p.kld,
    status ? "YES" : "NO",
    completionDate || "-"
  ];
});

  /* ================= TABLE ================= */
  autoTable(doc, {
    startY: 31,
    margin: { left: 6, right: 6 },

    styles: {
      fontSize: 7,
      halign: "center",
      valign: "middle"
    },

    headStyles: {
      fillColor: [55, 65, 81],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8
    },

    head: pdfHead,
    body: pdfBody,

    didParseCell(data) {
      if (isAll && data.section === "body" && data.column.index >= 6) {
        data.cell.text = "";
      }
    },

    didDrawCell(data) {
      if (isAll && data.section === "body" && data.column.index >= 6) {
        const value = data.cell.raw;
        const cx = data.cell.x + data.cell.width / 2;
        const cy = data.cell.y + data.cell.height / 2;
        const size = 1.4;

        if (value) {
          doc.setDrawColor(0, 150, 0);
          doc.line(cx - size, cy, cx - size / 3, cy + size);
          doc.line(cx - size / 3, cy + size, cx + size, cy - size);
        } else {
          doc.setDrawColor(200, 0, 0);
          doc.line(cx - size, cy - size, cx + size, cy + size);
          doc.line(cx - size, cy + size, cx + size, cy - size);
        }
      }
    }
  });

  doc.save(`Plant_Report_${selectedCard}.pdf`);
};
const imageToBase64 = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
  });

/* ================= PROFESSIONAL PLANT REPORT EXCEL ================= */
const downloadTableExcel = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Plant Report");

  /* =====================================================
     LOGO (TOP LEFT)
  ===================================================== */
  const logoBase64 = await imageToBase64(companyLogo);

  const logoId = workbook.addImage({
    base64: logoBase64,
    extension: "png",
  });

  sheet.addImage(logoId, {
    tl: { col: 0, row: 0 },
    ext: { width: 100, height: 55 },
  });

  /* =====================================================
     COMPANY HEADER (START FROM ROW 1)
  ===================================================== */

  // Row 1
  sheet.mergeCells("A1:H1");
  const companyCell = sheet.getCell("A1");
  companyCell.value = "MVR TECHNOLOGY";
  companyCell.font = {
    name: "Times New Roman",
    size: 18,
    bold: true,
    color: { argb: "FFC80000" },
  };
  companyCell.alignment = { horizontal: "center", vertical: "middle" };

  // Row 2
  sheet.mergeCells("A2:H2");
  const subCell = sheet.getCell("A2");
  subCell.value = "FSTP RAJASTHAN";
  subCell.font = {
    name: "Times New Roman",
    size: 12,
    bold: true,
  };
  subCell.alignment = { horizontal: "center", vertical: "middle" };

  // Row 3
  sheet.mergeCells("A3:H3");
  const titleCell = sheet.getCell("A3");
  titleCell.value =
    selectedCard === "ALL"
      ? "Plant Infrastructure Report"
      : `${selectedCard} Completion Report`;

  titleCell.font = {
    name: "Times New Roman",
    size: 11,
    bold: true,
  };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  /* =====================================================
     TABLE HEADER (START FROM ROW 5)
  ===================================================== */

  const startRow = 5;

  const headers =
    selectedCard === "ALL"
      ? [
          "S.No",
          "Plant ID",
          "Plant Name",
          "KLD",
          "District",
          "Zone",
          "MNIT",
          "POWER",
          "SOLAR",
          "INTERNET",
          "COD/BOD",
        ]
      : [
          "S.No",
          "Plant ID",
          "Plant Name",
          "KLD",
          selectedCard,
          "Completion Date",
        ];

  const headerRow = sheet.getRow(startRow);

  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;

    cell.font = {
      name: "Times New Roman",
      bold: true,
      size: 11,
    };

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD3EAC8" },
    };

    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });

/* =====================================================
   DATA ROWS (WITH CORRECT COMPLETION DATES)
===================================================== */

filteredPlants.forEach((p, index) => {

  let rowData;

  if (selectedCard === "ALL") {

    rowData = [
      index + 1,
      p.plantID,
      p.plantName,
      p.kld,
      p.district,
      p.zones,
      p.mnit ? "YES" : "NO",
      p.permanentPower ? "YES" : "NO",
      p.solar ? "YES" : "NO",
      p.internet ? "YES" : "NO",
      p.codAndBodSenserDate ? "YES" : "NO",
    ];

  } else {

    let status = false;
    let completionDate = "-";

    if (selectedCard === "MNIT") {
      status = p.mnit;
      completionDate = p.mnitDateOfCompletion
        ? formatDate(p.mnitDateOfCompletion)
        : "-";
    }

    if (selectedCard === "POWER") {
      status = p.permanentPower;
      completionDate = p.permanentPowerDateOfCompletion
        ? formatDate(p.permanentPowerDateOfCompletion)
        : "-";
    }

    if (selectedCard === "SOLAR") {
      status = p.solar;
      completionDate = p.solarDateOfCompletion
        ? formatDate(p.solarDateOfCompletion)
        : "-";
    }

    if (selectedCard === "INTERNET") {
      status = p.internet;
      completionDate = p.internetDateOfCompletion
        ? formatDate(p.internetDateOfCompletion)
        : "-";
    }

    if (selectedCard === "CODBOD") {
      status = !!p.codAndBodSenserDate;
      completionDate = p.codAndBodSenserDate
        ? formatDate(p.codAndBodSenserDate)
        : "-";
    }
if (selectedCard === "IPPHONES") {
  status = !!p.ipPhoneDate;
  completionDate = p.ipPhoneDate ? formatDate(p.ipPhoneDate) : "-";
}

if (selectedCard === "TABS") {
  status = !!p.tabsReceivedDate;
  completionDate = p.tabsReceivedDate ? formatDate(p.tabsReceivedDate) : "-";
}

if (selectedCard === "GPS") {
  const gpsInfo = gpsDataMap[p.plantID];
  status = gpsInfo?.gpsStatus || false;
  completionDate = gpsInfo?.gpsInstallationDate
    ? formatDate(gpsInfo.gpsInstallationDate)
    : "-";
}
if (selectedCard === "CAMERA") {
  status = !!p.cameraConfigurationDate;
  completionDate = p.cameraConfigurationDate ? formatDate(p.cameraConfigurationDate) : "-";
}
    if (selectedCard === "CTE") {
      status = p.cteCertified;
      completionDate = p.cteIssuedDate
        ? formatDate(p.cteIssuedDate)
        : "-";
    }

    if (selectedCard === "CTO") {
      status = p.ctoCertified;
      completionDate = p.ctoIssuedDate
        ? formatDate(p.ctoIssuedDate)
        : "-";
    }

    rowData = [
      index + 1,
      p.plantID,
      p.plantName,
      p.kld,
      status ? "YES" : "NO",
      completionDate,
    ];
  }

  const row = sheet.addRow(rowData);

  row.eachCell((cell) => {
    cell.font = {
      name: "Times New Roman",
      size: 10,
    };

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });

});

  /* =====================================================
     COLUMN WIDTH + FREEZE
  ===================================================== */

  sheet.columns.forEach((column) => {
    column.width = 18;
  });

  sheet.views = [{ state: "frozen", ySplit: startRow }];

  /* =====================================================
     DOWNLOAD
  ===================================================== */

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer]),
    `Plant_Report_${selectedCard}.xlsx`
  );
};

const handleReset = () => {
   setYesNoFilter("ALL");
  setFromDate("");
  setToDate(""); 
};

  /* ================= UI ================= */
  return (
    <div className="space-y-6 p-6">

<div className="grid grid-cols-1 md:grid-cols-10 gap-4">

  {selectedCard !== "CTE" &&
   selectedCard !== "CTO" &&
   selectedCard !== "CTE/CTO" ? (
    <>
      <StatCard
        title="Total Plants"
        count={counts.total}
        icon={<Factory size={20} />}
        active={selectedCard === "ALL"}
        onClick={() => setSelectedCard("ALL")}
      />

      <StatCard
        title="MNIT"
        count={counts.mnit}
        icon={<CheckCircle size={20} />}
        active={selectedCard === "MNIT"}
        onClick={() => setSelectedCard("MNIT")}
      />

      <StatCard
        title="Permanent Power"
        count={counts.power}
        icon={<Zap size={20} />}
        active={selectedCard === "POWER"}
        onClick={() => setSelectedCard("POWER")}
      />

      <StatCard
        title="Solar"
        count={counts.solar}
        icon={<Sun size={20} />}
        active={selectedCard === "SOLAR"}
        onClick={() => setSelectedCard("SOLAR")}
      />

      <StatCard
        title="Internet"
        count={counts.internet}
        icon={<Wifi size={20} />}
        active={selectedCard === "INTERNET"}
        onClick={() => setSelectedCard("INTERNET")}
      />

      <StatCard
        title="COD / BOD"
        count={counts.codBod}
        icon={<CheckCircle size={20} />}
        active={selectedCard === "CODBOD"}
        onClick={() => setSelectedCard("CODBOD")}
      />
<StatCard
  title="IP Phones Received"
  count={counts.ipPhones}
  icon={<CheckCircle size={20} />}
  active={selectedCard === "IPPHONES"}
  onClick={() => setSelectedCard("IPPHONES")}
/>

<StatCard
  title="Tabs Received"
  count={counts.tabsReceived}
  icon={<CheckCircle size={20} />}
  active={selectedCard === "TABS"}
  onClick={() => setSelectedCard("TABS")}
/>

{/* <StatCard
  title="GPS Installed"
  count={counts.gpsInstalled}
  icon={<CheckCircle size={20} />}
  active={selectedCard === "GPS"}
  onClick={() => setSelectedCard("GPS")}
/> */}

<StatCard
  title="Cameras Configured"
  count={counts.cameraConfigured}
  icon={<CheckCircle size={20} />}
  active={selectedCard === "CAMERA"}
  onClick={() => setSelectedCard("CAMERA")}
/>
      <StatCard
        title="CTE / CTO"
        count={zoneFilteredPlants.filter(p => p.cteCertified && p.ctoCertified).length}
        icon={<LayoutDashboard size={20} />}
        active={false}
        onClick={() => setSelectedCard("CTE")}
      />
    </>
  ) : (
    <>
      {/* CTE */}
      <StatCard
        title="CTE"
        count={counts.cteCertified}
        icon={<CheckCircle size={20} />}
        active={selectedCard === "CTE"}
        onClick={() => setSelectedCard("CTE")}
      />

      {/* CTO */}
      <StatCard
        title="CTO"
        count={counts.ctoCertified}
        icon={<CheckCircle size={20} />}
        active={selectedCard === "CTO"}
        onClick={() => setSelectedCard("CTO")}
      />

      {/* ⭐ NEW COMBINED CARD */}
      <StatCard
        title="CTE / CTO"
        count={zoneFilteredPlants.filter(p => p.cteCertified && p.ctoCertified).length}
        icon={<LayoutDashboard size={20} />}
        active={selectedCard === "CTE/CTO"}
        onClick={() => setSelectedCard("CTE/CTO")}
      />

      {/* BACK */}
      <StatCard
        title="← Back"
        count=""
        icon={<LayoutDashboard size={20} />}
        active={false}
        onClick={() => setSelectedCard("ALL")}
      />
    </>
  )}
</div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border overflow-x-auto p-4">
<div className="flex items-center justify-between mb-3 gap-4">
  {/* LEFT: HEADING + BACK */}
  <div className="flex items-center gap-3">
   
    <h3 className="font-bold flex items-center gap-2 whitespace-nowrap">
      <LayoutDashboard size={18} />
      {selectedCard === "CTE/CTO"
        ? "CTE / CTO Report"
        : `Matching Plants (${filteredPlants.length})`}
    </h3>
  </div>


  {/* RIGHT: ZONE + DOWNLOAD */}
  <div className="flex items-center gap-3">

  {/* DATE FILTERS - only for non ALL */}
  {selectedCard !== "ALL" && (
    <>
      <input
        type="date"
        value={fromDate}
        
        onChange={(e) => setFromDate(e.target.value)}
        className="border rounded-lg p-2 text-sm"
      />

      <input
        type="date"
        max={today} 
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
        className="border rounded-lg p-2 text-sm"
      />
    </>
  )}
    <select
      value={zoneFilter}
      onChange={(e) => setZoneFilter(e.target.value)}
      className="border rounded-lg p-2 text-sm"
    >
      <option value="All">All Zones</option>
      {zones.map((z) => (
        <option key={z} value={z}>
          Zone {z}
        </option>
      ))}
    </select>

{selectedCard !== "ALL" && (
  <select
    value={yesNoFilter}
    onChange={(e) => setYesNoFilter(e.target.value)}
    className="border rounded-lg p-2 text-sm"
  >
    <option value="ALL">All</option>
    <option value="YES">Yes Only</option>
    <option value="NO">No Only</option>
  </select>
)}
    <div className="flex gap-2">
  <button
    onClick={downloadTablePdf}
    className="bg-red-600 hover:bg-red-700
               text-white px-4 py-2 rounded-lg
               text-sm font-semibold shadow"
  >
    PDF
  </button>

  <button
    onClick={downloadTableExcel}
    className="bg-green-600 hover:bg-green-700
               text-white px-4 py-2 rounded-lg
               text-sm font-semibold shadow"
  >
    Excel
  </button>
  <button
  onClick={handleReset}
  className="bg-gray-500 hover:bg-gray-600
             text-white px-4 py-2 rounded-lg
             text-sm font-semibold shadow"
>
  Reset
</button>
</div>

  </div>
  
</div>



        {selectedCard === "ALL" ? (
          
       <table className="w-full text-sm border-collapse">
  <thead className="bg-slate-100 text-xs font-bold sticky top-0 z-10">
    <tr>
      <th className="border p-2">S.NO</th>
      <th className="border p-2">Plant ID</th>
      <th className="border p-2">Plant Name</th>
      <th className="border p-2 text-center">KLD</th>
      <th className="border p-2">District</th>
        <th className="border p-2 text-center">Zone</th>
      <th className="border p-2 text-center">Infrastructure</th>
     
      <th className="border p-2 text-center">Details</th>
    </tr>
  </thead>

  <tbody>
    {filteredPlants.map((p, i) => (
      <tr
        key={p.plantID}
        
        className="hover:bg-indigo-50 cursor-pointer transition-colors"
      >
        <td className="border p-2 text-center text-slate-500">{i + 1}</td>
        <td className="border p-2 text-center font-mono">{p.plantID}</td>
        <td className="border p-2 font-semibold text-slate-800 text-center">
          {p.plantName}
        </td>
        <td className="border p-2 text-center">{p.kld}</td>
        <td className="border p-2 text-slate-600 text-center">{p.district}</td>
        <td className="border p-2 font-semibold text-slate-800 text-center">{p.zones}</td>
        <td className="border p-2">
  <div className="flex gap-1 justify-center flex-wrap">
    <StatusBadge active={p.mnit} label="MNIT" />
    <StatusBadge active={p.permanentPower} label="POWER" />
    <StatusBadge active={p.solar} label="SOLAR" />
    <StatusBadge active={p.internet} label="INTERNET" />
    <StatusBadge
      active={!!p.codAndBodSenserDate}
      label="COD BOD"
    />
  </div>
</td>


        

        <td onClick={() => navigate(`/plants/${p.plantID}`)} className="border p-2 text-center">
          <div className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold 
                          text-indigo-600 border border-indigo-300 rounded
                          hover:bg-indigo-100">
            <LayoutDashboard size={14} />
            View
          </div>
        </td>

      </tr>
    ))}
  </tbody>
</table>

        ) : (
          <table className="border-collapse w-full text-sm">
<thead>
  <tr className="bg-slate-100 text-xs font-bold">
    <th className="border p-2">S.No</th>
    <th className="border p-2">Plant ID</th>
    <th className="border p-2">Plant Name</th>
    <th className="border p-2">KLD</th>

    {selectedCard === "CTE" ? (
      <>
        <th className="border p-2 text-center">CTE Status</th>
        <th className="border p-2 text-center">CTE Issued Date</th>
      </>
    ) : selectedCard === "CTO" ? (
      <>
        <th className="border p-2 text-center">CTO Status</th>
        <th className="border p-2 text-center">CTO Issued Date</th>
      </>
    ) : selectedCard === "CTE/CTO" ? (
      <>
        <th className="border p-2 text-center">CTE Status</th>
        <th className="border p-2 text-center">CTE Issued Date</th>
        <th className="border p-2 text-center">CTO Status</th>
        <th className="border p-2 text-center">CTO Issued Date</th>
      </>
    ) : (
      <>
        <th className="border p-2 text-center">
          {selectedCard === "MNIT" && "MNIT"}
          {selectedCard === "POWER" && "Permanent Power"}
          {selectedCard === "SOLAR" && "Solar"}
          {selectedCard === "INTERNET" && "Internet"}
          {selectedCard === "CODBOD" && "COD / BOD"}

          {/* 🔥 NEW DEVICE CARDS */}
          {selectedCard === "IPPHONES" && "IP Phones Received"}
          {selectedCard === "TABS" && "Tabs Received"}
          {selectedCard === "GPS" && (
  <>
    <th className="border p-2 text-center">Vehicle Number</th>
    <th className="border p-2 text-center">GPS Status</th>
    <th className="border p-2 text-center">Installation Date</th>
  </>
)}
          {selectedCard === "CAMERA" && "Cameras Configured"}
        </th>

        <th className="border p-2 text-center">
          {selectedCard === "IPPHONES" ||
          selectedCard === "TABS" ||
          selectedCard === "GPS" ||
          selectedCard === "CAMERA"
            ? "Received Date"
            : "Completion Date"}
        </th>
      </>
    )}
  </tr>
</thead>

       <tbody>
  {filteredPlants.map((p, i) => (
    <tr key={p.plantID} className="hover:bg-indigo-50">
      <td className="border p-2 text-center">{i + 1}</td>
      <td className="border p-2 text-center">{p.plantID}</td>
      <td className="border p-2 text-center">{p.plantName}</td>
      <td className="border p-2 text-center">{p.kld}</td>

      {/* 🔥 CTE MODE */}
      {selectedCard === "CTE" && (
        <>
          <td className="border p-2 text-center font-semibold">
            {p.cteCertified ? "YES" : "NO"}
          </td>
          <td className="border p-2 text-center">
            {p.cteCertified
              ? formatDate(p.cteIssuedDate)
              : "-"}
          </td>
        </>
      )}

      {/* 🔥 CTO MODE */}
      {selectedCard === "CTO" && (
        <>
          <td className="border p-2 text-center font-semibold">
            {p.ctoCertified ? "YES" : "NO"}
          </td>
          <td className="border p-2 text-center">
            {p.ctoCertified
              ? formatDate(p.ctoIssuedDate)
              : "-"}
          </td>
        </>
      )}

{/* 🔥 COMBINED CTE / CTO MODE */}
{selectedCard === "CTE/CTO" && (
  <>
    <td className="border p-2 text-center font-semibold">
      {p.cteCertified ? "YES" : "NO"}
    </td>
    <td className="border p-2 text-center">
      {p.cteCertified ? formatDate(p.cteIssuedDate) : "-"}
    </td>
    <td className="border p-2 text-center font-semibold">
      {p.ctoCertified ? "YES" : "NO"}
    </td>
    <td className="border p-2 text-center">
      {p.ctoCertified ? formatDate(p.ctoIssuedDate) : "-"}
    </td>
  </>
)}
      {/* 🔥 OTHER KPI MODES */}
      {selectedCard !== "CTE" && selectedCard !== "CTO" && selectedCard !== "CTE/CTO" && (
        <>
          <td className="border p-2 text-center font-semibold">
            {selectedCard === "MNIT" && (p.mnit ? "YES" : "NO")}
            {selectedCard === "POWER" && (p.permanentPower ? "YES" : "NO")}
            {selectedCard === "SOLAR" && (p.solar ? "YES" : "NO")}
            {selectedCard === "INTERNET" && (p.internet ? "YES" : "NO")}
            {selectedCard === "CODBOD" && (p.codAndBodSenserDate ? "YES" : "NO")}
            {selectedCard === "IPPHONES" && (p.ipPhoneDate ? "YES" : "NO")}
            {selectedCard === "TABS" && (p.tabsReceivedDate ? "YES" : "NO")}
            {selectedCard === "GPS" &&
  (gpsDataMap[p.plantID]?.gpsStatus ? "YES" : "NO")}
            {selectedCard === "CAMERA" && (p.cameraConfigurationDate ? "YES" : "NO")}
          </td>

          <td className="border p-2 text-center">
            {selectedCard === "MNIT" &&
              (p.mnit ? formatDate(p.mnitDateOfCompletion) : "-")}

            {selectedCard === "POWER" &&
              (p.permanentPower
                ? formatDate(p.permanentPowerDateOfCompletion)
                : "-")}

            {selectedCard === "SOLAR" &&
              (p.solar ? formatDate(p.solarDateOfCompletion) : "-")}

            {selectedCard === "INTERNET" &&
              (p.internet ? formatDate(p.internetDateOfCompletion) : "-")}

            {selectedCard === "CODBOD" &&
              (p.codAndBodSenserDate
                ? formatDate(p.codAndBodSenserDate)
                : "-")}
            {selectedCard === "IPPHONES" &&
              (p.ipPhoneDate ? formatDate(p.ipPhoneDate) : "-")}

             {selectedCard === "TABS" &&
               (p.tabsReceivedDate ? formatDate(p.tabsReceivedDate) : "-")}

            {selectedCard === "GPS" &&
  (gpsDataMap[p.plantID]?.gpsInstallationDate
    ? formatDate(gpsDataMap[p.plantID]?.gpsInstallationDate)
    : "-")}

            {selectedCard === "CAMERA" &&
              (p.cameraConfigurationDate ? formatDate(p.cameraConfigurationDate) : "-")}    
          </td>
        </>
      )}
    </tr>
  ))}
</tbody>


          </table>
        )}

  
      </div>
    </div>
  );
}
