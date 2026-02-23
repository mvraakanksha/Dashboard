import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getAllPlants } from "../../services/plantService";
import companyLogo from './company_logo1.jpg';

export default function WaterReport() {
  const [plants, setPlants] = useState([]);

  /* ===== FETCH PLANTS ===== */
  useEffect(() => {
    getAllPlants()
      .then(setPlants)
      .catch(console.error);
  }, []);

  /* ===== DOWNLOAD PDF ===== */
const downloadTablePdf = async () => {
  const doc = new jsPDF("portrait", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  /* ================= IMAGE COMPRESS HELPER ================= */
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
        ctx.imageSmoothingEnabled = false; // 🔥 keep logo sharp
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        resolve({
          base64: canvas.toDataURL("image/jpeg", quality),
          width: targetWidth,
          height: targetHeight
        });
      };
    });

  /* ================= LOAD LOGO ================= */
  const logo = await loadAndCompressImage(companyLogo);

  /* ================= HEADER ================= */

  // Logo (TOP LEFT)
  doc.addImage(
    logo.base64,
    "JPEG",
    8,
    6,
    logo.width / 8,   // scaled correctly → no blur
    logo.height / 8
  );

  // Company Name (CENTER, RED)
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(200, 0, 0);
  doc.text("MVR TECHNOLOGY", pageWidth / 2, 14, { align: "center" });

    doc.setFontSize(10);
  doc.setTextColor(0,0,0);
doc.text("FSTP RAJASTHAN", pageWidth / 2, 18, { align: "center" });

  // Subtitle
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text("Water Report", pageWidth / 2, 23, { align: "center" });

  // Divider line
  doc.setDrawColor(220);
  doc.line(6, 24, pageWidth - 6, 24);

  /* ================= TABLE ================= */
  autoTable(doc, {
    startY: 28, // ✅ pushed below header
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
      fillColor: [240, 242, 245],
      textColor: 20,
      fontStyle: "bold"
    },

    columnStyles: {
      0: { cellWidth: 12 },  // S.No
      1: { cellWidth: 26 },  // Plant ID
      2: { cellWidth: 42 },  // Plant Name
      3: { cellWidth: 14 },  // KLD
      4: { cellWidth: 34 },  // District
      5: { cellWidth: 14 },  // Zone
      6: { cellWidth: 34 }   // Water Type
    },

    head: [[
      "S.No",
      "Plant ID",
      "Plant Name",
      "KLD",
      "District",
      "Zone",
      "Water Type"
    ]],

    body: plants.map((p, i) => [
      i + 1,
      p.plantID || "-",
      p.plantName || "-",
      p.kld || "-",
      p.district || "-",
      p.zones || "-",
      p.waterType || "-"
    ])
  });

  doc.save("Water_Report.pdf");
};

  return (
    <div className="p-6 space-y-4">
       <div className="flex justify-end">
        <button
          onClick={downloadTablePdf}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-semibold"
        >
          Download
        </button>
      </div>

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
              <th className="border p-2 text-center">Water Type</th>
            </tr>
          </thead>

          <tbody>
            {plants.map((p, i) => (
              <tr key={p.plantID || i}>
                <td className="border p-2 text-center">{i + 1}</td>
                <td className="border p-2 text-center font-mono">{p.plantID}</td>
                <td className="border p-2 font-semibold text-center">{p.plantName}</td>
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
