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
import { useNavigate } from "react-router-dom";

import { getAllPlants } from "../../services/plantService";

import companyLogo from './company_logo1.jpg'

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

  const [zoneFilter, setZoneFilter] = useState(() => {
  return localStorage.getItem("plantReportZone") || "All";
});

  const [selectedCard, setSelectedCard] = useState("ALL");

  const navigate = useNavigate();

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
  return zoneFilteredPlants.filter(p => {
    if (selectedCard === "MNIT") return p.mnit;
    if (selectedCard === "POWER") return p.permanentPower;
    if (selectedCard === "SOLAR") return p.solar;
    if (selectedCard === "INTERNET") return p.internet;
    return true; // ALL
  });
}, [zoneFilteredPlants, selectedCard]);


  /* ================= COUNTS ================= */
const counts = useMemo(() => ({
  total: zoneFilteredPlants.length,
  mnit: zoneFilteredPlants.filter(p => p.mnit).length,
  power: zoneFilteredPlants.filter(p => p.permanentPower).length,
  solar: zoneFilteredPlants.filter(p => p.solar).length,
  internet: zoneFilteredPlants.filter(p => p.internet).length,
}), [zoneFilteredPlants]);


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
  doc.text("MVR TECHNOLOGY", pageWidth / 2, 14, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(
    selectedCard === "ALL"
      ? "Plant Infrastructure Report"
      : `${selectedCard} Completion Report`,
    pageWidth / 2,
    20,
    { align: "center" }
  );

  doc.setDrawColor(220);
  doc.line(6, 24, pageWidth - 6, 24);

  /* ================= DYNAMIC HEAD ================= */
  const isAll = selectedCard === "ALL";

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

    let status = false;
    let completionDate = "-";

    if (selectedCard === "MNIT") {
      status = p.mnit;
      completionDate = p.mnitDateOfCompletion;
    }
    if (selectedCard === "POWER") {
      status = p.permanentPower;
      completionDate = p.permanentPowerDateOfCompletion;
    }
    if (selectedCard === "SOLAR") {
      status = p.solar;
      completionDate = p.solarDateOfCompletion;
    }
    if (selectedCard === "INTERNET") {
      status = p.internet;
      completionDate = p.internetDateOfCompletion;
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
    startY: 28,
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


  /* ================= UI ================= */
  return (
    <div className="space-y-6 p-6">

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard title="Total Plants" count={counts.total} icon={<Factory size={20} />} active={selectedCard === "ALL"} onClick={() => setSelectedCard("ALL")} />
        <StatCard title="MNIT Completed" count={counts.mnit} icon={<CheckCircle size={20} />} active={selectedCard === "MNIT"} onClick={() => setSelectedCard("MNIT")} />
        <StatCard title="Internet Active" count={counts.internet} icon={<Wifi size={20} />} active={selectedCard === "INTERNET"} onClick={() => setSelectedCard("INTERNET")} />
        <StatCard title="Solar Plants" count={counts.solar} icon={<Sun size={20} />} active={selectedCard === "SOLAR"} onClick={() => setSelectedCard("SOLAR")} />
        <StatCard title="Permanent Power" count={counts.power} icon={<Zap size={20} />} active={selectedCard === "POWER"} onClick={() => setSelectedCard("POWER")} />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border overflow-x-auto p-4">
   <div className="flex items-center justify-between mb-3 gap-4">
  {/* LEFT: HEADING */}
  <h3 className="font-bold flex items-center gap-2 whitespace-nowrap">
    <LayoutDashboard size={18} />
    Matching Plants ({filteredPlants.length})
  </h3>

  {/* RIGHT: ZONE + DOWNLOAD */}
  <div className="flex items-center gap-3">
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

    <button
      onClick={downloadTablePdf}
      className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow whitespace-nowrap"
    >
      Download
    </button>
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
              <tr className="bg-slate-100">
                <th rowSpan={2} className="border p-2">S.No</th>
                <th rowSpan={2} className="border p-2">Plant ID</th>
                <th rowSpan={2} className="border p-2">Plant Name</th>
                <th rowSpan={2} className="border p-2">KLD</th>

                <th className="border p-2 text-center">{selectedCard}</th>
            <th className="border p-2 text-center">Completion Date</th>

              </tr>
             
            </thead>
          <tbody>
  {filteredPlants.map((p, i) => (
    <tr key={p.plantID}>
      <td className="border p-2 text-center">{i + 1}</td>
      <td className="border p-2 text-center">{p.plantID}</td>
      <td className="border p-2 text-center">{p.plantName}</td>
      <td className="border p-2 text-center">{p.kld}</td>

      {/* STATUS */}
      <td className="border p-2 text-center font-semibold">
        {selectedCard === "MNIT" && (p.mnit ? "YES" : "NO")}
        {selectedCard === "POWER" && (p.permanentPower ? "YES" : "NO")}
        {selectedCard === "SOLAR" && (p.solar ? "YES" : "NO")}
        {selectedCard === "INTERNET" && (p.internet ? "YES" : "NO")}
      </td>

      {/* COMPLETION DATE */}
      <td className="border p-2 text-center">
        {selectedCard === "MNIT" && (p.mnitDateOfCompletion || "-")}
        {selectedCard === "POWER" && (p.permanentPowerDateOfCompletion || "-")}
        {selectedCard === "SOLAR" && (p.solarDateOfCompletion || "-")}
        {selectedCard === "INTERNET" && (p.internetDateOfCompletion || "-")}
      </td>
    </tr>
  ))}
</tbody>

          </table>
        )}

  
      </div>
    </div>
  );
}
