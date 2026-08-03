import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { getAllPlants } from "../../../services/plantService";
import { getOperationsByDateRange } from "../../../services/operationService";

const formatNumber = (v) => Number(v || 0).toLocaleString("en-IN");

const formatDateLocal = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDisplayDate = (date) => {
  return new Date(date).toLocaleDateString("en-GB");
};

const getMonthDates = (monthStr) => {
  const [year, month] = monthStr.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    startDate: `${year}-${String(month).padStart(2, "0")}-01`,
    endDate: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    monthEnd: new Date(year, month, 0),
  };
};

const toYMD = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
};

const getOpeningSludge = (ops, startDate, endDate) => {
  if (!ops?.length) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const map = {};

  ops.forEach((op) => {
    if (!op.operationDate) return;
    const d = toYMD(op.operationDate);
    const time = new Date(d);
    if (time < start || time >= end) return;

    if (!map[d]) map[d] = { am: null, pm: null };
    if (op.sludgeTankLevelAm != null) map[d].am = Number(op.sludgeTankLevelAm);
    if (op.sludgeTankLevelPm != null) map[d].pm = Number(op.sludgeTankLevelPm);
  });

  let cursor = new Date(start);
  while (cursor < end) {
    const key = toYMD(cursor);
    const day = map[key];
    if (day) {
      if (day.am != null) return day.am;
      if (day.pm != null) return day.pm;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return 0;
};

const getClosingSludge = (ops, startDate, endDate) => {
  if (!ops?.length) return 0;
  const start = new Date(startDate);
  const monthEnd = new Date(endDate);
  const map = {};

  ops.forEach((op) => {
    if (!op.operationDate) return;
    const d = toYMD(op.operationDate);
    const time = new Date(d);
    if (time < start || time > monthEnd) return;

    if (!map[d]) map[d] = { am: null, pm: null };
    if (op.sludgeTankLevelAm != null) map[d].am = Number(op.sludgeTankLevelAm);
    if (op.sludgeTankLevelPm != null) map[d].pm = Number(op.sludgeTankLevelPm);
  });

  let cursor = new Date(monthEnd);
  while (cursor >= start) {
    const key = toYMD(cursor);
    const day = map[key];
    if (day) {
      if (day.pm != null) return day.pm;
      if (day.am != null) return day.am;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return 0;
};

export default function PerformanceExcelDownload() {
  const today = new Date();
  const FIRST_DAY_OF_MONTH = formatDateLocal(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const TODAY = formatDateLocal(today);

  const [fromDate, setFromDate] = useState(FIRST_DAY_OF_MONTH);
  const [toDate, setToDate] = useState(TODAY);
  const [zone, setZone] = useState("All");
  const [phase, setPhase] = useState("All");
  const [selectedKlds, setSelectedKlds] = useState([]);
  const [plants, setPlants] = useState([]);
  const [zones, setZones] = useState([]);
  const [phases, setPhases] = useState([]);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(false);

  const [includeMonthly, setIncludeMonthly] = useState(true);

  React.useEffect(() => {
    getAllPlants().then((res) => {
      const plantsData = res || [];
      setPlants(plantsData);

      const sortedZones = [...new Set(plantsData.map((p) => p.zones).filter((z) => z != null))].sort(
        (a, b) => Number(a) - Number(b)
      );
      const sortedPhases = [...new Set(plantsData.map((p) => p.plantPhase).filter((p) => p != null))].sort(
        (a, b) => Number(a) - Number(b)
      );

      setZones(sortedZones);
      setPhases(sortedPhases);
    });
  }, []);

  React.useEffect(() => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    getOperationsByDateRange(fromDate, toDate, zone)
      .then((res) => setOperations(res || []))
      .finally(() => setLoading(false));
  }, [fromDate, toDate, zone]);

  const visiblePlants = useMemo(() => {
    let filtered = plants.filter((p) => p.mnit === true && p.mnitDateOfCompletion);

    if (zone !== "All") filtered = filtered.filter((p) => String(p.zones) === String(zone));
    if (phase !== "All") filtered = filtered.filter((p) => String(p.plantPhase) === String(phase));
    if (selectedKlds.length > 0) filtered = filtered.filter((p) => selectedKlds.includes(Number(p.kld)));

    return filtered;
  }, [plants, zone, phase, selectedKlds]);

  const aggregated = useMemo(() => {
    const map = {};
    operations.forEach(({ plantId, operation }) => {
      if (!map[plantId]) map[plantId] = { sludgeReceived: 0, sludgeProcessed: 0, ops: [] };
      map[plantId].sludgeReceived += Number(operation.sludgeReceived || 0);
      map[plantId].sludgeProcessed += Number(operation.sludgeProcessed || 0);
      map[plantId].ops.push(operation);
    });
    return map;
  }, [operations]);

  const monthKey = fromDate.slice(0, 7);

  const finalRows = useMemo(() => {
    const { startDate, endDate, monthEnd } = getMonthDates(monthKey);

    return visiblePlants
      .map((p) => {
        const a = aggregated[p.plantID] || { sludgeReceived: 0, sludgeProcessed: 0, ops: [] };
        const oldSludge = getOpeningSludge(a.ops || [], startDate, endDate);
        const remaining = getClosingSludge(a.ops || [], startDate, endDate);
        const total = oldSludge + a.sludgeReceived;
        const noPower = !p.permanentPowerDateOfCompletion || new Date(p.permanentPowerDateOfCompletion) > monthEnd;

        return {
          plantId: p.plantID,
          district: p.district || "-",
          kld: p.kld || "-",
          name: p.plantName || "-",
          zone: p.zones || "-",
          phase: p.plantPhase || "-",
          sludgeReceived: a.sludgeReceived,
          oldSludge,
          total,
          sludgeProcessed: a.sludgeProcessed,
          remaining,
          noPower,
        };
      })
      .filter((r) => {
        const { monthEnd } = getMonthDates(monthKey);
        const p = plants.find((x) => x.plantID === r.plantId);
        if (!p?.mnitDateOfCompletion) return false;
        return new Date(p.mnitDateOfCompletion) <= monthEnd;
      });
  }, [visiblePlants, aggregated, monthKey, plants]);

  const zeroSludgePlants = useMemo(() => {
    return visiblePlants
      .filter((p) => (aggregated[p.plantID]?.sludgeReceived || 0) === 0)
      .map((p) => ({
        plantId: p.plantID,
        district: p.district || "-",
        kld: p.kld || "-",
        label: p.plantName || "-",
      }));
  }, [visiblePlants, aggregated]);

  const top10Received = useMemo(() => {
    return [...visiblePlants]
      .map((p) => ({
        plantId: p.plantID,
        district: p.district || "-",
        kld: p.kld || "-",
        label: p.plantName || "-",
        value: aggregated[p.plantID]?.sludgeReceived || 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [visiblePlants, aggregated]);

  const top10Processed = useMemo(() => {
    return [...visiblePlants]
      .map((p) => ({
        plantId: p.plantID,
        district: p.district || "-",
        kld: p.kld || "-",
        label: p.plantName || "-",
        value: aggregated[p.plantID]?.sludgeProcessed || 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [visiblePlants, aggregated]);

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();

    const monthlyRows = finalRows.map((r, i) => ({
      "S.No": i + 1,
      "Plant ID": r.plantId,
      District: r.district,
      KLD: r.kld,
      "Site Name": r.name,
      "Sludge Received (L)": r.sludgeReceived,
      "Old Sludge (L)": r.oldSludge,
      "Total Sludge (L)": r.total,
      "Sludge Processed (L)": r.sludgeProcessed,
      "Remaining Sludge (L)": r.remaining,
      "No Power": r.noPower ? "Yes" : "No",
    }));

    const topReceivedRows = top10Received.map((r, i) => ({
      "S.No": i + 1,
      "Plant ID": r.plantId,
      District: r.district,
      KLD: r.kld,
      "Plant Name": r.label,
      "Sludge Received (L)": r.value,
    }));

    const topProcessedRows = top10Processed.map((r, i) => ({
      "S.No": i + 1,
      "Plant ID": r.plantId,
      District: r.district,
      KLD: r.kld,
      "Plant Name": r.label,
      "Sludge Processed (L)": r.value,
    }));

    const zeroRows = zeroSludgePlants.map((r, i) => ({
      "S.No": i + 1,
      "Plant ID": r.plantId,
      District: r.district,
      KLD: r.kld,
      "Plant Name": r.label,
    }));

    const ws1 = XLSX.utils.json_to_sheet(monthlyRows);
    const ws2 = XLSX.utils.json_to_sheet(topReceivedRows);
    const ws3 = XLSX.utils.json_to_sheet(topProcessedRows);
    const ws4 = XLSX.utils.json_to_sheet(zeroRows);

    XLSX.utils.book_append_sheet(wb, ws1, "Monthly Report");
    XLSX.utils.book_append_sheet(wb, ws2, "Top Received");
    XLSX.utils.book_append_sheet(wb, ws3, "Top Processed");
    XLSX.utils.book_append_sheet(wb, ws4, "Zero Sludge");

    const fileName = `Monthly_Report_${monthKey}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const kldOptions = useMemo(() => {
    return [...new Set(plants.map((p) => Number(p.kld)).filter(Boolean))].sort((a, b) => a - b);
  }, [plants]);

  const toggleKld = (kld) => {
    setSelectedKlds((prev) => (prev.includes(kld) ? prev.filter((v) => v !== kld) : [...prev, kld]));
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs font-bold block">From</label>
          <input type="date" value={fromDate} min={TODAY} max={TODAY} onChange={(e) => setFromDate(e.target.value)} className="border rounded px-2 py-1" />
        </div>

        <div>
          <label className="text-xs font-bold block">To</label>
          <input type="date" value={toDate} min={fromDate} max={TODAY} onChange={(e) => setToDate(e.target.value)} className="border rounded px-2 py-1" />
        </div>

        <div>
          <label className="text-xs font-bold block">Zone</label>
          <select value={zone} onChange={(e) => setZone(e.target.value)} className="border rounded px-2 py-1">
            <option value="All">All Zones</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                Zone {z}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold block">Phase</label>
          <select value={phase} onChange={(e) => setPhase(e.target.value)} className="border rounded px-2 py-1">
            <option value="All">All Phases</option>
            {phases.map((p) => (
              <option key={p} value={p}>
                Phase {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold block">KLD</label>
          <div className="flex flex-wrap gap-2 max-w-[500px]">
            {kldOptions.map((kld) => (
              <label key={kld} className="flex items-center gap-1 text-xs border px-2 py-1 rounded cursor-pointer">
                <input type="checkbox" checked={selectedKlds.includes(kld)} onChange={() => toggleKld(kld)} />
                {kld} KLD
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-bold">
          <input type="checkbox" checked={includeMonthly} onChange={(e) => setIncludeMonthly(e.target.checked)} />
          Include Monthly Report
        </label>

        <button onClick={downloadExcel} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold">
          Download Excel
        </button>
      </div>

      {loading && <p className="text-sm font-bold">Loading data...</p>}
    </div>
  );
}