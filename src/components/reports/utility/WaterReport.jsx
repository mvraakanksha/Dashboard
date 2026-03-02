import { useEffect, useState, useMemo } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getAllPlants } from "../../../services/plantService";
import companyLogo from "./company_logo1.jpg";

export default function WaterReport() {
  const [plants, setPlants] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState("All");

  const [waterTypes, setWaterTypes] = useState({
    normal: true,
    salt: true,
    noBorewell: true
  });

  /* ===== FETCH PLANTS ===== */
  useEffect(() => {
    getAllPlants()
      .then((data) => {
        setPlants(data);

        const uniqueZones = [
          ...new Set(data.map((p) => p.zones).filter(Boolean))
        ].sort((a, b) => a - b);

        setZones(uniqueZones);
      })
      .catch(console.error);
  }, []);

  /* ===== FILTER LOGIC ===== */
  const filteredPlants = useMemo(() => {
    return plants.filter((p) => {
      const zoneMatch =
        selectedZone === "All" || String(p.zones) === String(selectedZone);

      const type = (p.waterType || "").toLowerCase().trim();

      const waterMatch =
        (waterTypes.normal && type === "normal water") ||
        (waterTypes.salt && type === "salt water") ||
        (waterTypes.noBorewell && type === "no borewell");

      return zoneMatch && waterMatch;
    });
  }, [plants, selectedZone, waterTypes]);

  /* ===== COUNTS ===== */
  const waterCounts = useMemo(() => {
    const counts = {
      normal: 0,
      salt: 0,
      noBorewell: 0
    };

    filteredPlants.forEach((p) => {
      const type = (p.waterType || "").toLowerCase().trim();

      if (type === "normal water") counts.normal++;
      if (type === "salt water") counts.salt++;
      if (type === "no borewell") counts.noBorewell++;
    });

    return counts;
  }, [filteredPlants]);
const totalFilteredPlants = filteredPlants.length;
  /* ===== PDF DOWNLOAD ===== */
  const downloadTablePdf = async () => {
    const doc = new jsPDF("portrait", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    const logo = await loadLogo(companyLogo);

    doc.addImage(logo, "JPEG", 8, 6, 30, 15);

     /* ===== COMPANY HEADER ===== */
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(200, 0, 0);
  doc.text("MVR TECHNOLOGY", pageWidth / 2, 14, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("FSTP RAJASTHAN", pageWidth / 2, 19, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text("Water Report", pageWidth / 2, 24, { align: "center" });

    doc.setFontSize(10);
    doc.text(
      `Zone: ${selectedZone}|Total: ${totalFilteredPlants} | Normal: ${waterCounts.normal} | Salt: ${waterCounts.salt} | No Borewell: ${waterCounts.noBorewell}`,
      pageWidth / 2,
      28,
      { align: "center" }
    );
  // 🔹 Divider Line
  // doc.setDrawColor(200);
  // doc.line(6, 30, pageWidth - 6, 24);

    autoTable(doc, {
      startY: 34,
      head: [[
        "S.No",
        "Plant ID",
        "Plant Name",
        "KLD",
        "District",
        "Zone",
        "Water Type"
      ]],
      body: filteredPlants.map((p, i) => [
        i + 1,
        p.plantID || "-",
        p.plantName || "-",
        p.kld || "-",
        p.district || "-",
        p.zones || "-",
        p.waterType || "-"
      ]),
      styles: { fontSize: 8 }
    });

    doc.save("Water_Report.pdf");
  };

  const loadLogo = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 240;
        canvas.height = 120;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, 240, 120);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
    });

  /* ================= UI ================= */
  return (
    <div className="p-6 space-y-4">

      {/* FILTER SECTION */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-wrap gap-6 items-center">

        {/* Zone Filter */}
        <div>
          <label className="text-sm font-semibold mr-2">Zone:</label>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="All">All</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                Zone {z}
              </option>
            ))}
          </select>
        </div>

        {/* Water Type Checkboxes */}
        <div className="flex gap-4">
          <label>
            <input
              type="checkbox"
              checked={waterTypes.normal}
              onChange={(e) =>
                setWaterTypes({ ...waterTypes, normal: e.target.checked })
              }
            />{" "}
            Normal Water
          </label>

          <label>
            <input
              type="checkbox"
              checked={waterTypes.salt}
              onChange={(e) =>
                setWaterTypes({ ...waterTypes, salt: e.target.checked })
              }
            />{" "}
            Salt Water
          </label>

          <label>
            <input
              type="checkbox"
              checked={waterTypes.noBorewell}
              onChange={(e) =>
                setWaterTypes({ ...waterTypes, noBorewell: e.target.checked })
              }
            />{" "}
            No Borewell
          </label>
        </div>

        <button
          onClick={downloadTablePdf}
          className="ml-auto bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold"
        >
          Download PDF
        </button>
      </div>

      {/* SUMMARY COUNTS */}
      <div className="bg-slate-50 p-4 rounded-lg shadow text-sm font-semibold flex flex-wrap gap-6">
        <span className="text-indigo-700">
    Total Plants: {totalFilteredPlants}
  </span>
        {waterTypes.normal && (
          <span>Normal Water Plants: {waterCounts.normal}</span>
        )}
        {waterTypes.salt && (
          <span>Salt Water Plants: {waterCounts.salt}</span>
        )}
        {waterTypes.noBorewell && (
          <span>No Borewell Plants: {waterCounts.noBorewell}</span>
        )}
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-100 text-xs font-bold">
            <tr>
              <th className="border p-2">S.NO</th>
              <th className="border p-2">Plant ID</th>
              <th className="border p-2">Plant Name</th>
              <th className="border p-2">KLD</th>
              <th className="border p-2">District</th>
              <th className="border p-2">Zone</th>
              <th className="border p-2">Water Type</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlants.map((p, i) => (
              <tr key={p.plantID || i}>
                <td className="border p-2 text-center">{i + 1}</td>
                <td className="border p-2 text-center">{p.plantID}</td>
                <td className="border p-2 text-center">{p.plantName}</td>
                <td className="border p-2 text-center">{p.kld}</td>
                <td className="border p-2 text-center">{p.district}</td>
                <td className="border p-2 text-center">{p.zones}</td>
                <td className="border p-2 text-center">{p.waterType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}