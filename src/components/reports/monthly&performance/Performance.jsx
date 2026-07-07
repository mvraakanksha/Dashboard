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

import autoTable from "jspdf-autotable";
import PerformanceSingle from "./PerformanceSingle";
import { getOperationsByDateRange } from "../../../services/operationService";
import { getAllPlants } from "../../../services/plantService";

import jsPDF from "jspdf";
import companyLogo from '../../reports/company_logo1.jpg'

import { addMonthlyReportToPdf } from "./monthlyPdfBuilder";

const HEADER_BG = [0, 36, 90];     // #00245A
const ROW_ODD_BG = [215, 231, 255]; // #D7E7FF
const ROW_EVEN_BG = [238, 238, 238]; // #EEEEEE

const formatDateLocal = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const PAGE_MARGIN_X = 15;
const GRAPH_WIDTH = 135;
const TABLE_WIDTH = 135;

const ROW_HEIGHT = 90;


/* ================= CONFIG ================= */
const today = new Date();

const FIRST_DAY_OF_MONTH = formatDateLocal(
  new Date(today.getFullYear(), today.getMonth(), 1)
);

const TODAY = formatDateLocal(today);


const METRICS = {
  received: {
    key: "sludgeReceived",
    label: "Sludge Received (L)",
    color: "#2563eb"
  },
  processed: {
    key: "sludgeProcessed",
    label: "Sludge Processed (L)",
    color: "#16a34a"
  }
};
let cachedCompanyLogo = null;

const loadImage = (src) =>
  fetch(src)
    .then(res => res.blob())
    .then(blob => new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    }));

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

const addTextHeaderOnly = (doc, pageWidth, zone, fromDate, toDate) => {
  doc.setFont("Times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(179, 24, 24);
  doc.text("MVR TECHNOLOGY", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(
    `FSTP RAJASTHAN${zone !== "All" ? ` - ZONE ${zone}` : ""}`,
    pageWidth / 2,
    22,
    { align: "center" }
  );

  // 🔹 ADD DATE RANGE (only if provided)
  if (fromDate && toDate) {
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(
      `${formatDisplayDate(fromDate)} - ${formatDisplayDate(toDate)}`,
      pageWidth / 2,
      26,
      { align: "center" }
    );
  }
};
/* ================= SIMPLE TABLE ================= */
const SimpleTable = ({ metric, data }) => (
  <table className="w-full border-collapse text-sm">
    <thead className="bg-slate-100">
      <tr>
        <th className="border p-2">S.No</th>
        <th className="border p-2">Plant ID</th>
        <th className="border p-2">District</th>
          <th className="border p-2">KLD</th>
        <th className="border p-2">Plant Name</th>
    
        <th className="border p-2 text-right">{metric.label}</th>
      </tr>
    </thead>
    <tbody>
      {data.map((r, i) => (
        <tr key={r.plantId}>
          <td className="border p-2 text-center">{i + 1}</td>
          <td className="border p-2 text-center">{r.plantId}</td>
          <td className="border p-2 ">{r.district }</td>
          <td className="border p-2">{r.kld}</td>
          <td className="border p-2">{r.label}</td>
           
          <td className="border p-2 text-right font-bold">
            {formatValue(r.value)}
          </td>
        </tr>
      ))}
      {data.length === 0 && (
        <tr>
          <td colSpan={4} className="border p-4 text-center text-slate-500">
            No data
          </td>
        </tr>
      )}
    </tbody>
  </table>
);


/* ================= ZERO RECEIVED TABLE ================= */
const ZeroReceivedTable = ({ data }) => (
  <table className="w-full min-w-[700px] border-collapse text-sm">
    <thead className="bg-slate-100">
      <tr>
        <th className="border p-2">S.No</th>
        <th className="border p-2">Plant ID</th>
        <th className="border p-2">District</th>
        <th className="border p-2">KLD</th>
        <th className="border p-2">Plant Name</th>
      </tr>
    </thead>

    <tbody>
      {data.map((r, i) => (
        <tr key={r.plantId}>
          <td className="border p-2 text-center">{i + 1}</td>
          <td className="border p-2 text-center">{r.plantId}</td>
          <td className="border p-2 text-center">{r.district || "-"}</td>
          <td className="border p-2 text-center">{r.kld}</td>
          <td className="border p-2">{r.label}</td>
        </tr>
      ))}

      {data.length === 0 && (
        <tr>
          <td colSpan={5} className="border p-4 text-center text-slate-500">
            No zero-sludge plants
          </td>
        </tr>
      )}
    </tbody>
  </table>
);


/* ================= SECTION ================= */
const Section = ({ title, metric, data, chartRef }) => (
  <div className="flex flex-col lg:flex-row gap-6">

    {/* LEFT – TABLE */}
    <div
      className="
        w-full lg:w-[35%]
        bg-white rounded-xl shadow p-4
        overflow-x-auto
      "
    >
      <h4 className="font-bold text-blue-900 mb-2">{title}</h4>
      <SimpleTable metric={metric} data={data} />
    </div>

    {/* RIGHT – GRAPH */}
    <div
      className="
        w-full lg:w-[65%]
        bg-white rounded-xl shadow p-4
      "
    >
     <h4 className="font-bold text-blue-900 mb-3 pl-8">
  {title} - Graphical View
</h4>

      <div className="w-full h-[320px] sm:h-[380px] md:h-[420px]">
        <div
          ref={chartRef}
          className="w-full h-full relative"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 40, bottom: 120, left: 50, right: 30 }}
              barCategoryGap={30}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="label"
                interval={0}
                height={60}
                tick={({ x, y, payload }) => {
                  const words = payload.value.split(" ");
                  const mid = Math.ceil(words.length / 2);

                  return (
                    <g transform={`translate(${x},${y + 15})`}>
                      <text
                        textAnchor="middle"
                        fill="#000"
                        fontSize={12}
                        fontWeight={600}
                      >
                        <tspan x="0">
                          {words.slice(0, mid).join(" ")}
                        </tspan>
                        {words.length > mid && (
                          <tspan x="0" dy="14">
                            {words.slice(mid).join(" ")}
                          </tspan>
                        )}
                      </text>
                    </g>
                  );
                }}
              />

              <YAxis tickFormatter={formatValue} />
              <Tooltip formatter={formatValue} />

              <Bar dataKey="value" fill={metric.color} barSize={28}>
                <LabelList content={BarValueLabel} />
              </Bar>

            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  </div>
);


/* ================= ZERO MODE TABLES ================= */
const ZeroTablesRow = ({ receivedData }) => (
  <div className="bg-white rounded-xl shadow p-4">
    {/* 👇 This heading should NOT go into PDF image */}
    <h2 className="font-bold text-blue-900 mb-3 pdf-hide">
      Zero Sludge Received Plants
    </h2>

    <ZeroReceivedTable data={receivedData} />
  </div>
);

const GAP = 6;

const TABLE_X = PAGE_MARGIN_X;
const GRAPH_X = PAGE_MARGIN_X + TABLE_WIDTH + GAP;

const formatMonthYear = (dateStr) => {
  const [year, month] = dateStr.split("-");
  const date = new Date(year, month - 1);

  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
};
const formatDisplayDate = (date) => {
  return new Date(date).toLocaleDateString("en-GB"); // 01-04-2026
};
const KLD_OPTIONS = [
  "All",
  "≤ 5",
  "≤ 10",
  "≤ 15",
  "≤ 20",
  "≤ 25",
  "≤ 35"
];
/* ================= MAIN ================= */
export default function Performance() {
  // const [mode, setMode] = useState("top10"); // top10 | zero
const [fromDate, setFromDate] = useState(FIRST_DAY_OF_MONTH);
const [toDate, setToDate] = useState(TODAY);

const [includeMonthly, setIncludeMonthly] = useState(false);

  const [zone, setZone] = useState("All");
  const [phase, setPhase] = useState("All");
const [selectedKlds, setSelectedKlds] = useState([]);
  const [plants, setPlants] = useState([]);
  const [zones, setZones] = useState([]);
  const [phases, setPhases] = useState([]);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(false);

  const contentRef = useRef(null);

const receivedChartRef = useRef(null);
const processedChartRef = useRef(null);
const [viewMode, setViewMode] = useState("overall"); // overall | single


const monthYearLabel = formatMonthYear(fromDate);
  /* ================= FETCH ================= */
useEffect(() => {
  getAllPlants().then(res => {
    const plantsData = res || [];
    setPlants(plantsData);
    
const sortedZones = [
  ...new Set(
    plantsData
      .map((p) => p.zones)
      .filter((z) => z != null)
  ),
].sort((a, b) => Number(a) - Number(b));

const sortedPhases = [
  ...new Set(
    plantsData
      .map((p) => p.plantPhase)
      .filter((p) => p != null)
  ),
].sort((a, b) => Number(a) - Number(b));

setZones(sortedZones);
setPhases(sortedPhases); 
  });
}, []);


  useEffect(() => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    getOperationsByDateRange(fromDate, toDate, zone)
      .then(res => setOperations(res || []))
      .finally(() => setLoading(false));
  }, [fromDate, toDate, zone]);

const kldOptions = useMemo(() => {
  return [...new Set(plants.map(p => Number(p.kld)).filter(Boolean))]
    .sort((a, b) => a - b);
}, [plants]);
const toggleKld = (kld) => {
  setSelectedKlds(prev =>
    prev.includes(kld)
      ? prev.filter(v => v !== kld)
      : [...prev, kld]
  );
};
const visiblePlants = useMemo(() => {
  let filtered = plants;

  // ✅ ONLY MNIT COMPLETED
  filtered = filtered.filter(
    p =>
      p.mnit === true &&
      p.mnitDateOfCompletion
  );

  // Zone filter
// Zone filter
if (zone !== "All") {
  filtered = filtered.filter(
    (p) => String(p.zones) === String(zone)
  );
}

// Phase filter
if (phase !== "All") {
  filtered = filtered.filter(
    (p) => String(p.plantPhase) === String(phase)
  );
}

// KLD filter
if (selectedKlds.length > 0) {
  filtered = filtered.filter((p) =>
    selectedKlds.includes(Number(p.kld))
  );
}

return filtered;
}, [plants, zone, phase, selectedKlds]);

  const aggregated = useMemo(() => {
    const map = {};
    operations.forEach(({ plantId, operation }) => {
      if (!map[plantId]) {
        map[plantId] = { sludgeReceived: 0, sludgeProcessed: 0 };
      }
      map[plantId].sludgeReceived += Number(operation.sludgeReceived || 0);
      map[plantId].sludgeProcessed += Number(operation.sludgeProcessed || 0);
    });
    return map;
  }, [operations]);

  const zeroSludgePlants = useMemo(() => {
  return visiblePlants
    .filter(p => {
      const received =
        aggregated[p.plantID]?.sludgeReceived || 0;
      return received === 0;
    })
    .map(p => ({
      plantId: p.plantID,
      label: p.plantName,
      kld: p.kld,
      district: p.district,
      zone: p.zones
    }));
}, [visiblePlants, aggregated]);


const basePlantData = useMemo(() => {
  return visiblePlants.map(p => ({
    plantId: p.plantID,
    label: p.plantName,
    kld: p.kld,
    district: p.district,
    zone: p.zones,
    received: aggregated[p.plantID]?.sludgeReceived || 0,
    processed: aggregated[p.plantID]?.sludgeProcessed || 0,
  }));
}, [visiblePlants, aggregated]);



const top10Received = useMemo(() => {
  return [...basePlantData]
    .sort((a, b) => b.received - a.received)
    .slice(0, 10);
}, [basePlantData]);

const receivedData = useMemo(
  () => top10Received.map(p => ({ ...p, value: p.received })),
  [top10Received]
);


const top10Processed = useMemo(() => {
  return [...basePlantData]
    .sort((a, b) => b.processed - a.processed)
    .slice(0, 10);
}, [basePlantData]);

const processedData = useMemo(
  () => top10Processed.map(p => ({ ...p, value: p.processed })),
  [top10Processed]
);

const drawTop10Section = async ({
  doc,
  title,
  chartRef,
  tableData,
  tableHeader,
  startY,
}) => {
  // Title
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 64, 175);
// 🔹 TABLE TITLE (LEFT)
doc.setFont("times", "bold");
doc.setFontSize(12);
doc.setTextColor(30, 64, 175);

doc.text(title, TABLE_X, startY - 4);

// 🔹 GRAPH TITLE (RIGHT)
doc.text(`${title} - Graphical View`, GRAPH_X + 5, startY - 4);
  // ✅ GRAPH ON RIGHT
  const chartImg = await svgToImage(chartRef.current);

  doc.addImage(
    chartImg,
    "JPEG",
    GRAPH_X,          // 🔥 RIGHT SIDE
    startY,
    GRAPH_WIDTH,
    ROW_HEIGHT
  );

  // ✅ TABLE ON LEFT
autoTable(doc, {
  startY,
  margin: { left: TABLE_X },
  tableWidth: TABLE_WIDTH,

  styles: {
    font: "times",
    fontSize: 7,
    halign: "center",
    textColor: [0, 0, 0],
  },

  headStyles: {
    fillColor: HEADER_BG,          // 🔥 #00245A
    textColor: [255, 255, 255],
    fontStyle: "bold",
  },

  alternateRowStyles: {
    fillColor: ROW_ODD_BG,         // 🔥 #D7E7FF
  },

  bodyStyles: {
    fillColor: ROW_EVEN_BG,        // 🔥 #EEEEEE
  },

  head: [tableHeader],
  body: tableData,
});

};


const svgToImage = async (chartContainer) => {
  if (!chartContainer) {
    throw new Error("Chart container not found");
  }

  const svg = chartContainer.querySelector("svg");
  if (!svg) {
    throw new Error("SVG not found inside chart container");
  }

  // 🔑 Read actual rendered size (UI size)
  const { width, height } = svg.getBoundingClientRect();

  const svgData = new XMLSerializer().serializeToString(svg);

  const canvas = document.createElement("canvas");

  // 🔥 Render at higher DPI but SAME proportions
  const scale = 2.5; // increase clarity without distortion
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const img = new Image();
  img.src =
    "data:image/svg+xml;base64," +
    btoa(unescape(encodeURIComponent(svgData)));

  await new Promise((resolve) => (img.onload = resolve));

  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.82);

};


const addSmallLogo = (doc, logo) => {
  doc.addImage(
    logo,
    "PNG",
    15,   // X
    8,    // Y
    14,   // 🔽 smaller width
    8    // 🔽 smaller height
  );
};



const downloadPdf = async () => {
  const doc = new jsPDF({
  orientation: "landscape",
  unit: "mm",
  format: "a4",
  compress: true,   // 🔥 MUST
});
  const pageWidth = doc.internal.pageSize.getWidth();

  if (!cachedCompanyLogo) {
    cachedCompanyLogo = await loadImage(companyLogo);
  }

  /* ========= PAGE 1 ========= */
if (includeMonthly) {
await addMonthlyReportToPdf({
  doc,
  month: fromDate.slice(0, 7),
  logos: { company: cachedCompanyLogo },
  zoneFilter: zone,
  phaseFilter: phase,
});
} else {
  addTextHeaderOnly(doc, pageWidth, zone, fromDate, toDate);
  addSmallLogo(doc, cachedCompanyLogo);
}


  /* ========= PAGE 2 : TOP 10 ========= */
  if (includeMonthly) doc.addPage();

  // ✅ logo only (small)
  addSmallLogo(doc, cachedCompanyLogo);

  await new Promise(requestAnimationFrame);

  await drawTop10Section({
    doc,
    title: "Top 10 Plants – Sludge Received (L)",
    chartRef: receivedChartRef,
    startY: 35,
    tableHeader: [
      "S.No", "Plant ID", "District", "KLD", "Plant Name", "Received (L)"
    ],
    tableData: receivedData.map((r, i) => [
      i + 1,
      r.plantId,
      r.district,
      r.kld,
      r.label,
      formatValue(r.value),
    ]),
  });

  await drawTop10Section({
    doc,
    title: "Top 10 Plants – Sludge Processed (L)",
    chartRef: processedChartRef,
    startY: 115,
    tableHeader: [
      "S.No", "Plant ID", "District", "KLD", "Plant Name", "Processed (L)"
    ],
    tableData: processedData.map((r, i) => [
      i + 1,
      r.plantId,
      r.district,
      r.kld,
      r.label,
      formatValue(r.value),
    ]),
  });

  /* ========= PAGE 3 : ZERO ========= */
  doc.addPage();

  // ✅ logo only (small)
  addSmallLogo(doc, cachedCompanyLogo);

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 64, 175);
const zeroTitle = "Zero Sludge Received Plants";
const dateText = `${formatDisplayDate(fromDate)} - ${formatDisplayDate(toDate)}`;

// 🔹 LEFT TITLE
doc.text(zeroTitle, PAGE_MARGIN_X, 32);

// 🔹 RIGHT DATE (same line)
doc.setFont("times", "normal");
doc.setFontSize(10);
doc.setTextColor(80);

doc.text(
  dateText,
  pageWidth - PAGE_MARGIN_X,
  32,
  { align: "right" }
);

autoTable(doc, {
  startY: 40,

  styles: {
    font: "times",
    fontSize: 8,
    halign: "center",
    textColor: [0, 0, 0],
  },

  headStyles: {
    fillColor: HEADER_BG,          // #00245A
    textColor: [255, 255, 255],
    fontStyle: "bold",
  },

  alternateRowStyles: {
    fillColor: ROW_ODD_BG,         // #D7E7FF
  },

  bodyStyles: {
    fillColor: ROW_EVEN_BG,        // #EEEEEE
  },

  head: [[
    "S.No",
    "Plant ID",
    "District",
    "KLD",
    "Plant Name",
  ]],

  body: zeroSludgePlants.map((r, i) => [
    i + 1,
    r.plantId,
    r.district,
    r.kld,
    r.label,
  ]),
});

  doc.save(`Monthly Report_${monthYearLabel}.pdf`);
};




  /* ================= UI ================= */
return (
  <div className="space-y-6">

    {/* 🔹 TOGGLE BUTTONS */}
    <div className="flex gap-3 mb-4">
      <button
        onClick={() => setViewMode("overall")}
        className={`px-4 py-1 rounded font-bold text-sm ${
          viewMode === "overall"
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-700"
        }`}
      >
        All Plants
      </button>

      <button
        onClick={() => setViewMode("single")}
        className={`px-4 py-1 rounded font-bold text-sm ${
          viewMode === "single"
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-700"
        }`}
      >
        Single Plant
      </button>
    </div>

    {/* 🔹 SWITCH VIEW */}
    {viewMode === "single" ? (
      <PerformanceSingle />
    ) : (
      <>
        {/* FILTER */}
        <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4">
          <DateInput label="From" value={fromDate} onChange={setFromDate} />
          <DateInput label="To" value={toDate} onChange={setToDate} min={fromDate} />

<Select
  label="Zone"
  value={zone}
  onChange={setZone}
  options={["All", ...zones]}
  formatOption={(o) =>
    o === "All" ? "All Zones" : `Zone ${o}`
  }
/>

<Select
  label="Phase"
  value={phase}
  onChange={setPhase}
  options={["All", ...phases]}
  formatOption={(o) =>
    o === "All" ? "All Phases" : `Phase ${o}`
  }
/>

<div>
  <label className="text-xs font-bold block mb-1">KLD</label>

  <div className="flex flex-wrap gap-2 max-w-[500px]">
    {kldOptions.map(kld => (
      <label
        key={kld}
        className="flex items-center gap-1 text-xs border px-2 py-1 rounded cursor-pointer"
      >
        <input
          type="checkbox"
          checked={selectedKlds.includes(kld)}
          onChange={() => toggleKld(kld)}
        />
        {kld} KLD
      </label>
    ))}
  </div>
</div>
          <label className="flex items-center gap-2 text-xs font-bold">
            <input
              type="checkbox"
              checked={includeMonthly}
              onChange={(e) => setIncludeMonthly(e.target.checked)}
            />
            Include Monthly Report in PDF
          </label>

          <button
            onClick={downloadPdf}
            className="bg-red-600 text-white px-4 py-1 rounded text-xs font-bold hover:bg-red-700"
          >
            Download PDF
          </button>
        </div>

        {/* CONTENT */}
        <div ref={contentRef} className="pdf-safe space-y-10">

          {/* PAGE 1 CONTENT */}
          <div className="pdf-page" id="pdf-top10">
            <Section
              title="Top 10 Plants – Sludge Received (L)"
              metric={METRICS.received}
              data={receivedData}
              chartRef={receivedChartRef}
            />

            <Section
              title="Top 10 Plants – Sludge Processed (L)"
              metric={METRICS.processed}
              data={processedData}
              chartRef={processedChartRef}
            />
          </div>

          {/* PAGE 2 CONTENT */}
          <div className="pdf-page" id="pdf-zero">
            <h2 className="font-bold text-blue-900 mb-3">
              Zero Sludge Received Plants
            </h2>

            <div className="overflow-x-auto">
              <ZeroReceivedTable data={zeroSludgePlants} />
            </div>
          </div>

        </div>

        {loading && (
          <p className="text-center font-bold text-slate-500">
            Loading data...
          </p>
        )}
      </>
    )}
    
  </div>
);
}

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

const Select = ({ label, value, onChange, options, formatOption }) => (
  <div>
    <label className="text-xs font-bold block">{label}</label>

    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-2 py-1"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {formatOption ? formatOption(o) : o}
        </option>
      ))}
    </select>
  </div>
);