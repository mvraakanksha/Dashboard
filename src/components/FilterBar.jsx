import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  Moon,
  Sun,
  CalendarDays,
  MapPin,
  ChevronDown,
  Building2,
  RotateCcw,
  Search,
} from "lucide-react";

import { getAllPlants } from "../services/plantService";

const STORAGE_KEY = "fstp_report_filters_v1";

export default function FilterBar({
  isDark,
  setIsDark,
  showThemeToggle,
  date,
  setDate,
  zone,
  setZone,
  zones = [],

  selectedPlants = [],
  setSelectedPlants = () => {},

  // NEW: parent supplies this. Called only when GET / RESET is pressed
  // (and once on initial load), never on every keystroke/selection.
  onFetch = () => {},
}) {
  const [plants, setPlants] = useState([]);
  const [plantDropdownOpen, setPlantDropdownOpen] = useState(false);

  // ---- DRAFT STATE ----
  // Everything the user interacts with lives here. It only gets
  // pushed to the parent (date/zone/selectedPlants) on GET or RESET.
  const [draftDate, setDraftDate] = useState(date);
  const [draftZone, setDraftZone] = useState(zone);
  const [draftSelectedPlants, setDraftSelectedPlants] = useState(selectedPlants);

  const dropdownRef = useRef(null);
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // ---- FETCH PLANT LIST (once) + HYDRATE PERSISTED FILTERS ----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getAllPlants();
        const data = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
          ? res.data
          : [];

        if (cancelled) return;
        setPlants(data);

        let persisted = null;
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) persisted = JSON.parse(raw);
        } catch {
          persisted = null;
        }

        const validPersistedPlantIDs = persisted?.selectedPlants
          ? persisted.selectedPlants.filter((id) =>
              data.some((p) => p.plantID === id)
            )
          : null;

        const initialDate = persisted?.date || today;
        const initialZone = persisted?.zone || "All";
        const initialPlants =
          validPersistedPlantIDs && validPersistedPlantIDs.length > 0
            ? validPersistedPlantIDs
            : data.map((p) => p.plantID);

        setDraftDate(initialDate);
        setDraftZone(initialZone);
        setDraftSelectedPlants(initialPlants);

        setDate(initialDate);
        setZone(initialZone);
        setSelectedPlants(initialPlants);

        // Load data once for whatever filters we just restored.
        onFetch({
          date: initialDate,
          zone: initialZone,
          selectedPlants: initialPlants,
        });
      } catch (err) {
        console.error("Failed to fetch plants", err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- CLOSE DROPDOWN ON OUTSIDE CLICK ----
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setPlantDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ---- TOGGLE A SINGLE PLANT (draft only) ----
  const togglePlant = useCallback((plantID) => {
    setDraftSelectedPlants((prev) =>
      prev.includes(plantID)
        ? prev.filter((id) => id !== plantID)
        : [...prev, plantID]
    );
  }, []);

  // ---- FILTERED PLANTS BASED ON DRAFT ZONE ----
  const filteredPlants = useMemo(() => {
    return draftZone === "All"
      ? plants
      : plants.filter((p) => Number(p.zones) === Number(draftZone));
  }, [plants, draftZone]);

  // ---- ZONE CHANGE (draft only, auto re-selects all plants in that zone) ----
  const handleZoneChange = useCallback(
    (e) => {
      const newZone = e.target.value;
      setDraftZone(newZone);

      const newFiltered =
        newZone === "All"
          ? plants
          : plants.filter((p) => Number(p.zones) === Number(newZone));

      setDraftSelectedPlants(newFiltered.map((p) => p.plantID));
    },
    [plants]
  );

  // ---- PERSIST HELPER ----
  const persistFilters = useCallback((filters) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (e) {
      console.error("Failed to persist filters", e);
    }
  }, []);

  // ---- GET: applies draft -> real state, persists, fetches ----
  const handleGetData = useCallback(() => {
    setDate(draftDate);
    setZone(draftZone);
    setSelectedPlants(draftSelectedPlants);

    const filters = {
      date: draftDate,
      zone: draftZone,
      selectedPlants: draftSelectedPlants,
    };

    persistFilters(filters);
    onFetch(filters);
  }, [draftDate, draftZone, draftSelectedPlants, setDate, setZone, setSelectedPlants, persistFilters, onFetch]);

  // ---- RESET: clears everything, wipes storage, fetches default view ----
  const handleResetFilters = useCallback(() => {
    const allPlantIDs = plants.map((p) => p.plantID);

    setDraftDate(today);
    setDraftZone("All");
    setDraftSelectedPlants(allPlantIDs);

    setDate(today);
    setZone("All");
    setSelectedPlants(allPlantIDs);

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear persisted filters", e);
    }

    onFetch({ date: today, zone: "All", selectedPlants: allPlantIDs });
  }, [plants, today, setDate, setZone, setSelectedPlants, onFetch]);

  const allFilteredSelected =
    filteredPlants.length > 0 &&
    filteredPlants.every((p) => draftSelectedPlants.includes(p.plantID));

  const selectedInZoneCount = draftSelectedPlants.filter((id) =>
    filteredPlants.some((p) => p.plantID === id)
  ).length;

  return (
    <div
      className={`
        relative z-40
        flex flex-wrap items-center justify-between gap-4
        px-6 py-3 mb-6 rounded-xl border
        ${
          isDark
            ? "bg-slate-900/80 border-slate-800 backdrop-blur text-slate-200"
            : "bg-white border-slate-200 text-slate-800"
        }
      `}
    >
      {/* LEFT */}
      <div className="flex flex-wrap items-center gap-4">
        {/* DATE */}
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-indigo-500" />

          <input
            type="date"
            value={draftDate}
            max={today}
            onChange={(e) => setDraftDate(e.target.value)}
            className={`
              text-sm rounded-lg px-3 py-1.5 border outline-none
              ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-slate-200"
                  : "bg-white border-slate-300"
              }
            `}
          />
        </div>

        {/* ZONE */}
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-500" />

          <select
            value={draftZone}
            onChange={handleZoneChange}
            className={`
              text-sm rounded-lg px-3 py-1.5 border outline-none
              ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-slate-200"
                  : "bg-white border-slate-300"
              }
            `}
          >
            <option value="All">All Zones</option>

            {zones.map((z) => (
              <option key={z} value={String(z)}>
                Zone {z}
              </option>
            ))}
          </select>
        </div>

        {/* PLANT MULTI SELECT */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setPlantDropdownOpen((v) => !v)}
            className={`
              min-w-[220px]
              flex items-center justify-between gap-3
              text-sm rounded-lg px-3 py-2 border outline-none
              ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-slate-200"
                  : "bg-white border-slate-300 text-slate-700"
              }
            `}
          >
            <div className="flex items-center gap-2 truncate">
              {/* <Building2 className="w-4 h-4 text-indigo-500" /> */}

              <span className="truncate">
                {draftSelectedPlants.length === 0
                  ? "Select Plants"
                  : allFilteredSelected
                  ? `All ${filteredPlants.length} Plants Selected`
                  : `${selectedInZoneCount} Plant${
                      selectedInZoneCount > 1 ? "s" : ""
                    } Selected`}
              </span>
            </div>

            <ChevronDown className="w-4 h-4" />
          </button>

          {/* DROPDOWN */}
          {plantDropdownOpen && (
            <div
              className={`
                absolute top-full mt-2 left-0 w-[280px]
                rounded-xl border shadow-xl z-50 max-h-72 overflow-y-auto
                ${
                  isDark
                    ? "bg-slate-900 border-slate-700"
                    : "bg-white border-slate-200"
                }
              `}
            >
              {/* ALL PLANTS */}
              <label
                className={`
                  flex items-center gap-3 px-4 py-3 cursor-pointer border-b
                  font-semibold
                  ${
                    isDark
                      ? "bg-slate-800 border-slate-700"
                      : "bg-slate-50 border-slate-200"
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setDraftSelectedPlants(filteredPlants.map((p) => p.plantID));
                    } else {
                      setDraftSelectedPlants([]);
                    }
                  }}
                  className="w-4 h-4 accent-indigo-600"
                />

                <span>All Plants</span>
              </label>

              {/* PLANTS */}
              {filteredPlants.map((plant) => {
                const checked = draftSelectedPlants.includes(plant.plantID);

                return (
                  <label
                    key={plant.plantID}
                    className={`
                      flex items-center gap-3 px-4 py-3 cursor-pointer
                      transition
                      ${isDark ? "hover:bg-slate-800" : "hover:bg-slate-50"}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePlant(plant.plantID)}
                      className="w-4 h-4 accent-indigo-600"
                    />

                    <span className="text-sm">
                      {plant.plantID} - {plant.plantName} - Zone {plant.zones}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* GET BUTTON — the only thing that triggers a fetch (besides reset) */}
        <button
          onClick={handleGetData}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl
            font-bold text-xs transition-all duration-300
            ${
              isDark
                ? "bg-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30"
                : "bg-emerald-200 text-emerald-700 hover:bg-emerald-100"
            }
          `}
        >
          {/* <Search className="w-4 h-4" /> */}
          GET
        </button>

        {/* RESET BUTTON */}
        <button
          onClick={handleResetFilters}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl
            font-bold text-xs transition-all duration-300
            ${
              isDark
                ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }
          `}
        >
          <RotateCcw className="w-4 h-4" />
          RESET
        </button>
      </div>

      {/* RIGHT */}
      {showThemeToggle && (
        <button
          onClick={() => setIsDark((v) => !v)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs
            transition-all duration-300
            ${
              isDark
                ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            }
          `}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {isDark ? "LIGHT" : "DARK"}
        </button>
      )}
    </div>
  );
}
