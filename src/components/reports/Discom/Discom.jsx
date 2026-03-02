import { useEffect, useState, useMemo } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getAllPlants } from "../../../services/plantService";
import companyLogo from '../company_logo1.jpg';

export default function Discom() {
  const [plants, setPlants] = useState([]);

const [selectedDiscom, setSelectedDiscom] = useState([]);
const [selectedHeadquarter, setSelectedHeadquarter] = useState([]);
const [showDiscom, setShowDiscom] = useState(true);   // default visible
const [showHeadquarter, setShowHeadquarter] = useState(false);
const [selectedZone, setSelectedZone] = useState("all");
  const [showPermanentPower, setShowPermanentPower] = useState(false); // ✅ ADDED

  /* ===== FETCH PLANTS ===== */
  useEffect(() => {
    getAllPlants()
      .then(setPlants)
      .catch(console.error);
  }, []);

  /* ===== UNIQUE DISCOM LIST ===== */
  const discomList = useMemo(() => {
    const unique = [...new Set(plants.map(p => p.discomName).filter(Boolean))];
    return unique.sort();
  }, [plants]);

  const headquarterList = useMemo(() => {
  const unique = [...new Set(plants.map(p => p.headquarterName).filter(Boolean))];
  return unique.sort();
}, [plants]);

const toggleDiscom = (d) => {
  setSelectedDiscom(prev =>
    prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
  );
};

const toggleHQ = (hq) => {
  setSelectedHeadquarter(prev =>
    prev.includes(hq) ? prev.filter(x => x !== hq) : [...prev, hq]
  );
};
  /* ===== UNIQUE ZONE LIST ===== */
  const zoneList = useMemo(() => {
    const unique = [...new Set(plants.map(p => p.zones).filter(Boolean))];
    return unique.sort((a, b) => a - b);
  }, [plants]);

  /* ===== FILTER LOGIC ===== */
const filteredPlants = useMemo(() => {
  return plants.filter(p => {

    const discomMatch =
      selectedDiscom.length === 0 ||
      selectedDiscom.includes(p.discomName);

    const hqMatch =
      selectedHeadquarter.length === 0 ||
      selectedHeadquarter.includes(p.headquarterName);

    const zoneMatch =
      selectedZone === "all" || String(p.zones) === selectedZone;

    return discomMatch && hqMatch && zoneMatch;
  });
}, [plants, selectedDiscom, selectedHeadquarter, selectedZone]);

  const formatDate = (dateString) => {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (isNaN(date)) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};


  /* ===== DOWNLOAD PDF ===== */
  const downloadTablePdf = async () => {
    const doc = new jsPDF("portrait", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

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
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          resolve({
            base64: canvas.toDataURL("image/jpeg", quality),
            width: targetWidth,
            height: targetHeight
          });
        };
      });

    const logo = await loadAndCompressImage(companyLogo);

    doc.addImage(
      logo.base64,
      "JPEG",
      8,
      6,
      logo.width / 10,
      logo.height / 8
    );

    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(200, 0, 0);
    doc.text("MVR TECHNOLOGY", pageWidth / 2, 14, { align: "center" });

    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("FSTP RAJASTHAN", pageWidth / 2, 21, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(70);
    doc.text("Discom Details Report", pageWidth / 2, 27, { align: "center" });

    doc.setDrawColor(180);
    doc.line(6, 31, pageWidth - 6, 31);

    /* ===== DYNAMIC TABLE HEAD ===== */
    const tableHead = [
      "S.No",
      "Plant ID",
      "Plant Name",
      "KLD",
      "District",
      "Zone",
     
    ];
if (showHeadquarter) tableHead.push("Headquarter");

    if (showDiscom) tableHead.push("Discom");

    if (showPermanentPower) {
    tableHead.push("Permanent Power\nCompletion Date");
    }

    /* ===== DYNAMIC TABLE BODY ===== */
const tableBody = filteredPlants.map((p, i) => {
  const row = [
    i + 1,
    p.plantID || "-",
    p.plantName || "-",
    p.kld || "-",
    p.district || "-",
    p.zones || "-"
  ];

  // ⭐ dynamic columns
    if (showHeadquarter) row.push(p.headquarterName || "-");

  if (showDiscom) row.push(p.discomName || "-");

  if (showPermanentPower) {
    row.push(formatDate(p.permanentPowerDateOfCompletion));
  }

  return row;
});

    autoTable(doc, {
      startY: 35,
      margin: { left: 10, right: 10 },
      pageBreak: "auto",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: "linebreak",
        halign: "center",
        valign: "middle"
      },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: 20,
        fontStyle: "bold"
      },
      head: [tableHead],
      body: tableBody
    });

    doc.save("Discom_Report.pdf");
  };

  return (
    <div className="p-6 space-y-4">

      {/* FILTER SECTION */}
      <div className="flex flex-wrap items-center justify-between gap-4">

        <div className="flex flex-wrap items-center gap-4">

{/* HEADQUARTER */}
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    id="headquarter"
    checked={showHeadquarter}
    onChange={(e) => setShowHeadquarter(e.target.checked)}
    className="h-4 w-4"
  />
  <label htmlFor="headquarter" className="text-sm font-semibold">
    Headquarter
  </label>
</div>


{/* DISCOM */}
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    id="discom"
    checked={showDiscom}
    onChange={(e) => setShowDiscom(e.target.checked)}
    className="h-4 w-4"
  />
  <label htmlFor="discom" className="text-sm font-semibold">
    Discom
  </label>
</div>


          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold">Zone:</label>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm bg-gray-50"
            >
              <option value="all">All</option>
              {zoneList.map((z) => (
                <option key={z} value={z}>Zone {z}</option>
              ))}
            </select>
          </div>

          {/* ✅ PERMANENT POWER CHECKBOX ADDED */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="permanentPower"
              checked={showPermanentPower}
              onChange={(e) => setShowPermanentPower(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="permanentPower" className="text-sm font-semibold">
              Permanent Power Completion Dates
            </label>
          </div>

          <div className="text-sm text-gray-600 font-medium">
            Total Plants: {filteredPlants.length}
          </div>

        </div>

        <button
          onClick={downloadTablePdf}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-semibold"
        >
          Download
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-100 text-xs font-bold sticky top-0 z-10">
            <tr>
              <th className="border p-2">S.NO</th>
              <th className="border p-2">Plant ID</th>
              <th className="border p-2">Plant Name</th>
              <th className="border p-2 text-center">KLD</th>
              <th className="border p-2">District</th>
              <th className="border p-2">Zone</th>
              {showHeadquarter && (
  <th className="border p-2 text-center">Headquarter</th>
)}
            {showDiscom && (
  <th className="border p-2 text-center">Discom</th>
)}

              {showPermanentPower && (
                <th className="border p-2 text-center">
                  Permanent Power Completion Date
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {filteredPlants.map((p, i) => (
              <tr key={p.plantID || i} className="even:bg-gray-50 hover:bg-gray-100">
                <td className="border p-2 text-center">{i + 1}</td>
                <td className="border p-2 text-center font-mono">{p.plantID}</td>
                <td className="border p-2 font-semibold text-center">{p.plantName}</td>
                <td className="border p-2 text-center">{p.kld}</td>
                <td className="border p-2 text-center">{p.district}</td>
                <td className="border p-2 text-center">{p.zones}</td>
         
         {showHeadquarter && (
  <td className="border p-2 text-center font-semibold">
    {p.headquarterName || "-"}
  </td>
)}

           {showDiscom && (
  <td className="border p-2 text-center font-semibold">
    {p.discomName || "-"}
  </td>
)}

                {showPermanentPower && (
                  <td className="border p-2 text-center">
                    {formatDate(p.permanentPowerDateOfCompletion)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
