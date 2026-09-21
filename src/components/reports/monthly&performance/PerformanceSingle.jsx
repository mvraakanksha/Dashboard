import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getAllPlants } from "../../../services/plantService";
import { getOperationByPlantAndDate } from "../../../services/operationService";
import companyLogo from "../../reports/company_logo1.jpg";
import html2canvas from "html2canvas";
/* ================= HELPERS ================= */
const formatValue = (v) =>
  Number(v || 0).toLocaleString("en-IN");

const BarValueLabel = ({ x, y, width, value }) => {
  if (!value || value <= 0) return null;

  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      fill="#000"
      fontSize={13}
      fontWeight={800}
    >
      {formatValue(value)}
    </text>
  );
};
const formatDateLocal = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

  const today = new Date();

  const FIRST_DAY = formatDateLocal(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
const TODAY = formatDateLocal(today);

/* ================= SMALL ================= */
const DateInput = ({ label, value, onChange, min }) => (
  <div>
    <label className="text-xs font-bold block">{label}</label>
    <input
      type="date"
      value={value}
      min={min}
      max={TODAY}
      onChange={e => onChange(e.target.value)}
      className="border rounded px-2 py-1"
    />
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div>
    <label className="text-xs font-bold block">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="border rounded px-2 py-1"
    >
      {options.map(o => (
        <option key={o} value={o}>
          {o === "All" ? "All Zones" : `Zone ${o}`}
        </option>
      ))}
    </select>


  </div>

);
const getDateRangeArray = (from, to) => {
  const dates = [];
  let current = new Date(from);
  const end = new Date(to);

  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, "0");
    const dd = String(current.getDate()).padStart(2, "0");

    dates.push(`${yyyy}-${mm}-${dd}`);

    current.setDate(current.getDate() + 1);
  }

  return dates;
};

let cachedLogo = null;

const loadImage = (src) =>
  fetch(src)
    .then(res => res.blob())
    .then(blob => new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    }));
const formatDisplayDate = (date) => {
  return new Date(date).toLocaleDateString("en-GB"); // ✅ dd/mm/yyyy
};
export default function PerformanceSingle() {

  const [fromDate, setFromDate] = useState(FIRST_DAY);
  const [toDate, setToDate] = useState(TODAY);

  const [plants, setPlants] = useState([]);
  const [zones, setZones] = useState([]);

  const [zone, setZone] = useState("All");

  const [plantId, setPlantId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [operations, setOperations] = useState([]);
const chartRef = useRef(null);
  /* ================= FETCH PLANTS ================= */
  useEffect(() => {
    getAllPlants().then((res) => {
      const data = res || [];
      setPlants(data);

      const z = [...new Set(data.map(p => p.zones))].sort((a, b) => a - b);
      setZones(z);
    });
  }, []);
    /* ================= MONTHLY ================= */
const monthlyData = useMemo(() => {
  const map = {};

  operations.forEach((op) => {
    const dateObj = new Date(op.date);

const month = dateObj.toLocaleString("en-US", { month: "long" });
const year = dateObj.getFullYear();

const monthKey = `${month}, ${year}`;

    if (!map[monthKey]) {
      map[monthKey] = { received: 0, processed: 0 };
    }

    map[monthKey].received += op.sludgeReceived;
    map[monthKey].processed += op.sludgeProcessed;
  });

  return Object.entries(map).map(([month, val]) => ({
    month,
    ...val
  }));
}, [operations]);

const isMoreThan6Months = monthlyData.length > 6;
  /* ================= FILTERED PLANTS ================= */
  const filteredPlants = useMemo(() => {
    if (zone === "All") return plants;
    return plants.filter(p => String(p.zones) === String(zone));
  }, [plants, zone]);

  /* ================= FETCH OPERATIONS ================= */
  useEffect(() => {
    if (!plantId || !fromDate || !toDate) return;

    const fetchData = async () => {
      setLoading(true);

      try {
        const dates = getDateRangeArray(fromDate, toDate);

        const responses = await Promise.all(
          dates.map((date) =>
            getOperationByPlantAndDate(plantId, date).catch(() => null)
          )
        );

        setOperations(
          responses.map((r, i) => ({
            date: dates[i],
            sludgeReceived: r?.sludgeReceived || 0,
            sludgeProcessed: r?.sludgeProcessed || 0
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [plantId, fromDate, toDate]);



  const totals = useMemo(() => {
    return monthlyData.reduce(
      (acc, m) => {
        acc.received += m.received;
        acc.processed += m.processed;
        return acc;
      },
      { received: 0, processed: 0 }
    );
  }, [monthlyData]);


const captureChart = async (element) => {
  if (!element) throw new Error("Chart container not found");

  // 🔥 REMOVE TAILWIND COLORS TEMPORARILY
  const allElements = element.querySelectorAll("*");

  allElements.forEach(el => {
    const style = window.getComputedStyle(el);

    // Replace unsupported colors
    if (style.color.includes("oklch")) {
      el.style.color = "#000000";
    }
    if (style.backgroundColor.includes("oklch")) {
      el.style.backgroundColor = "#ffffff";
    }
  });

  await new Promise(r => setTimeout(r, 100));

const canvas = await html2canvas(element, {
  scale: 2,
  backgroundColor: "#ffffff",
  useCORS: true,
  scrollY: -window.scrollY,
  height: element.scrollHeight + 20, // 🔥 prevents bottom cut
});
  return canvas.toDataURL("image/jpeg", 0.95);
};

const downloadPdf = async () => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const isMoreThan6Months = monthlyData.length > 6;

  /* 🔹 LOGO */
  if (!cachedLogo) {
    cachedLogo = await loadImage(companyLogo);
  }
  doc.addImage(cachedLogo, "PNG", 10, 8, 18, 10);

  /* 🔹 HEADER */
  doc.setFont("times", "bold");
  doc.setFontSize(16);
doc.setTextColor(179, 24, 24);
  doc.text("MVR TECHNOLOGY", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(0,0,0);
  doc.text("FSTP Rajasthan", pageWidth / 2, 22, { align: "center" });

doc.setFontSize(9);
doc.setTextColor(0, 0, 0);
doc.text(
  `${formatDisplayDate(fromDate)} - ${formatDisplayDate(toDate)}`,
  pageWidth / 2,
  38,
  { align: "center" }
);

  /* 🔹 PLANT DETAILS */
const selectedPlant = plants.find(p => p.plantID === plantId);

doc.setFontSize(11);
doc.setTextColor(0, 0, 0);

doc.text(
  `${selectedPlant?.plantName || ""} Plant Performance Report ` ,
  pageWidth / 2,
  28,
  { align: "center" }
);
doc.text(
  `PID: ${ selectedPlant?.plantID || ""} - ${selectedPlant?.kld || ""} KLD` ,
  pageWidth / 2,
  34,
  { align: "center" }
);

  /* 🔹 TABLE DATA */
  const tableBody = [
    ...monthlyData.map((m, i) => [
      i + 1,
      m.month,
      formatValue(m.received),
      formatValue(m.processed),
    ]),
    [
      "",
      "TOTAL",
      formatValue(totals.received),
      formatValue(totals.processed),
    ],
  ];

  /* 🔹 WAIT RENDER */
  await new Promise(requestAnimationFrame);

const chartImg = await captureChart(chartRef.current);
  if (isMoreThan6Months) {
    /* ✅ TABLE FULL WIDTH */
    autoTable(doc, {
      startY: 52,
      margin: { left: 14 },
      tableWidth: 260,

      styles: { font: "times", fontSize: 9, halign: "center" },

  headStyles: {
    fillColor: [0, 36, 90],   // 🔥 Blue (#00245A)
    textColor: [255, 255, 255],
    fontStyle: "bold",
  },
      head: [["S.No", "Month,Year", "Received (L)", "Processed (L)"]],
      body: tableBody,

  /* 🟡 TOTAL ROW (YELLOW) */
  didParseCell: function (data) {
    const isLastRow = data.row.index === tableBody.length - 1;

    if (data.section === "body" && isLastRow) {
      data.cell.styles.fillColor = [255, 230, 150]; // 🔥 light yellow
      data.cell.styles.fontStyle = "bold";
    }
  },
});

    /* ✅ GRAPH BELOW */
const finalY = doc.lastAutoTable.finalY + 10;
const pageHeight = doc.internal.pageSize.getHeight();

// 🔥 HEIGHTS
const graphHeight = 90;
const graphHeightLarge = 120;

/* 🔹 FUNCTION → DRAW COMMON HEADER */
const drawHeader = () => {
  doc.addImage(cachedLogo, "PNG", 10, 8, 18, 10);

  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(179, 24, 24);
  doc.text("MVR TECHNOLOGY", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("FSTP Rajasthan", pageWidth / 2, 22, { align: "center" });

  doc.setFontSize(9);
doc.text(
  `${formatDisplayDate(fromDate)} - ${formatDisplayDate(toDate)}`,
  pageWidth / 2,
  38,
  { align: "center" }
);

  /* 🔹 PLANT DETAILS */
const selectedPlant = plants.find(p => p.plantID === plantId);

doc.setFontSize(11);
doc.setTextColor(0, 0, 0);

doc.text(
  `${selectedPlant?.plantName || ""} Plant Performance Report ` ,
  pageWidth / 2,
  28,
  { align: "center" }
);
doc.text(
  `PID: ${ selectedPlant?.plantID || ""} - ${selectedPlant?.kld || ""} KLD` ,
  pageWidth / 2,
  34,
  { align: "center" }
);
};

if (isMoreThan6Months) {
  // ✅ ALWAYS NEW PAGE FOR GRAPH
  doc.addPage();

  drawHeader(); // 🔥 reuse

  // 🔥 GRAPH TITLE
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Plant Performance Graphical View", 14, 42);

  // 🔥 BIG GRAPH (better spacing)
  doc.addImage(chartImg, "JPEG", 15, 48, 260, graphHeightLarge);

}  else {
  // ✅ ALWAYS DRAW BOTH HEADERS FIRST

  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  // 🔥 TABLE HEADER (LEFT)
  doc.text("Plant Performance", 14, 45);

  // 🔥 GRAPH HEADER (RIGHT)
  doc.text("Plant Performance Graph", 145, 45);

  // 🔥 SPACE CHECK FOR GRAPH
  if (finalY + graphHeight > pageHeight - 10) {
    doc.addPage();

    drawHeader(); // 🔥 common header (logo + title)

    // 🔥 GRAPH HEADER AGAIN (NEW PAGE)
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("Plant Performance Graph", 14, 42);

    // 🔥 BIG GRAPH
    doc.addImage(chartImg, "JPEG", 15, 48, 260, graphHeightLarge);

  } else {
    // 🔥 SAME PAGE (RIGHT SIDE)
    doc.addImage(chartImg, "JPEG", 145, 50, 130, graphHeight);
  }
}
} else {
  // ✅ ALWAYS DRAW BOTH HEADERS FIRST

  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  // 🔥 TABLE HEADER
  doc.text("Plant Performance - Tabular View", 14, 45);

  // 🔥 GRAPH HEADER (RIGHT SIDE)
  doc.text("Plant Performance - Graphical View", 155, 45);

  // 🔥 NOW RENDER TABLE (push below header)
  autoTable(doc, {
    startY: 55,
    margin: { left: 14 },
    tableWidth: 120,

    styles: { font: "times", fontSize: 8, halign: "center" },

    headStyles: {
      fillColor: [0, 36, 90],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },

    head: [["S.No", "Month, Year", "Received (L)", "Processed (L)"]],
    body: tableBody,

    didParseCell: function (data) {
      const isLastRow = data.row.index === tableBody.length - 1;
      if (data.section === "body" && isLastRow) {
        data.cell.styles.fillColor = [255, 230, 150];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // 🔥 GRAPH (AFTER TABLE)
  doc.addImage(chartImg, "JPEG", 145, 50, 130, 90);
  
}

const safePlantName = (selectedPlant?.plantName || "Plant")
  .replace(/\s+/g, "_");   // remove spaces

const fileName = `${safePlantName}_Performance_Report.pdf`;

doc.save(fileName);
};
  /* ================= UI ================= */
  return (
    <div className="space-y-6">

      {/* 🔹 FILTER */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4">

        <DateInput
          label="From"
          value={fromDate}
          onChange={setFromDate}
        />

        <DateInput
          label="To"
          value={toDate}
          onChange={setToDate}
          min={fromDate}
        />

        <Select
          label="Zone"
          value={zone}
          onChange={setZone}
          options={["All", ...zones]}
        />

        <div>
          <label className="text-xs font-bold block">Plant</label>
          <select
            value={plantId}
            onChange={(e) => setPlantId(Number(e.target.value))}
            className="border px-2 py-1 rounded"
          >
            {filteredPlants.map((p) => (
              <option key={p.plantID} value={p.plantID}>
                {p.plantID} - {p.plantName} - {p.kld} KLD
              </option>
            ))}
          </select>
        </div>

<button
  onClick={downloadPdf}
  className="bg-red-600 text-white px-4 py-1 rounded text-xs font-bold hover:bg-red-700"
>
  Download PDF
</button>
      </div>
 {/* <h2 className="font-bold text-blue-900 mb-3">
            Plant Performance
          </h2> */}
      {/* 🔹 CONTENT */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* TABLE */}
<div className="w-full lg:w-[40%] bg-white p-4 rounded-xl shadow h-[550px] flex flex-col">
  
  <h2 className="font-bold text-blue-900 mb-3">
    Plant Performance
  </h2>

  {/* 🔥 SCROLL AREA */}
  <div className="overflow-y-auto flex-1">
    <table className="w-full border text-sm">
      
      {/* 🔥 STICKY HEADER */}
      <thead className="bg-gray-200 sticky top-0 z-10">
        <tr>
          <th className="border p-2">S.No</th>
          <th className="border p-2">Month, Year</th>
          <th className="border p-2">Received (L)</th>
          <th className="border p-2">Processed (L)</th>
        </tr>
      </thead>

      <tbody>
        {monthlyData.map((m, i) => (
          <tr key={i}>
            <td className="border p-2 text-center">{i + 1}</td>
            <td className="border p-2">{m.month}</td>
            <td className="border p-2 text-right">
              {formatValue(m.received)}
            </td>
            <td className="border p-2 text-right">
              {formatValue(m.processed)}
            </td>
          </tr>
        ))}

        {/* 🔥 TOTAL ROW STICKY BOTTOM (optional) */}
        <tr className="bg-yellow-200 font-bold sticky bottom-0">
         <td className="border p-2 text-center font-bold" colSpan={2}>
  Total
</td>
          <td className="border p-2 text-right">
            {formatValue(totals.received)}
          </td>
          <td className="border p-2 text-right">
            {formatValue(totals.processed)}
          </td>
        </tr>
      </tbody>

    </table>
  </div>
</div>
        {/* GRAPH */}
<div className="w-full lg:w-[60%] bg-white p-4 rounded-xl shadow h-[550px] flex flex-col">

  <h2 className="font-bold text-blue-900 mb-3">
    Plant Performance Graph
  </h2>

  {/* 🔥 CHART SCROLL AREA */}
<div
  ref={chartRef}
  className="w-full flex flex-col items-center pb-8"
>
  {/* GRAPH SCROLL */}
  <div className="overflow-x-auto w-full ">
    <div
      style={{
        width: `${Math.max(monthlyData.length * 120, 900)}px`,
        height: 320
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={monthlyData}
          margin={{ top: 50, right: 20, left: 40, bottom: 5 }}
          barCategoryGap={30}
          barGap={10}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="month"
            interval={0}
            height={30}
            tick={{ fontSize: 12 }}
            style={{ fill: "#000", fontWeight: "bold", fontSize: 12 }}
          />

          <YAxis tickFormatter={formatValue} label={{
                    value: "Sludge (L)",     
                    angle: -90,
                    position: "insideLeft",
                    offset: -15,
                    dy: 35,
                    fill: "#333",
                    fontSize: 12,
                    fontWeight: "bold",
                  }}  style={{ fill: "#000", fontWeight: "bold", fontSize: 12 }} />

          <Tooltip formatter={formatValue} />

          <Bar dataKey="received" fill="#6AA6FF" barSize={28}>
            <LabelList
              formatter={formatValue}
              position="top"
              style={{ fill: "#000", fontWeight: "bold", fontSize: 12 }}
            />
          </Bar>

          <Bar dataKey="processed" fill="#013B88" barSize={28}>
            <LabelList
              formatter={formatValue}
              position="top"
              style={{ fill: "#000", fontWeight: "bold", fontSize: 12 }}
            />
          </Bar>

        </BarChart>
      </ResponsiveContainer>
      
    </div>
    
  </div>

  {/* 🔥 LEGEND (FIXED BOTTOM) */}
<div className="flex items-center justify-center gap-8 mt-1 text-[13px] font-semibold">

  <div className="flex items-center gap-2">
    <svg width="10" height="10">
      <circle cx="5" cy="5" r="4" fill="#6AA6FF" />
    </svg>
    <span style={{ lineHeight: "10px" }}>Received</span>
  </div>

  <div className="flex items-center gap-2">
    <svg width="10" height="10">
      <circle cx="5" cy="5" r="4" fill="#013B88" />
    </svg>
    <span style={{ lineHeight: "10px" }}>Processed</span>
  </div>

</div>
<p
  style={{ color: "#374151" }}
  className="text-center text-sm font-bold mt-1 mb-2"
>
  Months
</p>
</div>
</div>
      </div>

      {loading && (
        <p className="text-center font-bold text-gray-500">
          Loading...
        </p>
      )}
    </div>
  );
}