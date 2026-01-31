import { apiFetch } from "./api";

/* ================= PLANT APIs ================= */

export const getAllPlants = () => {
  return apiFetch("/plants/all");
};

export const getPlantById = async (plantId) => {
  const data = await getAllPlants();
  return data.find(p => p.plantID === Number(plantId));
};

export const getPlantsByZone = async (zone) => {
  const data = await getAllPlants();
  if (zone === "All") return data;
  return data.filter(p => p.zones === Number(zone));
};

export const getPlantInfraStats = async () => {
  const data = await getAllPlants();
  return {
    total: data.length,
    mnit: data.filter(p => p.mnit).length,
    power: data.filter(p => p.permanentPower).length,
    solar: data.filter(p => p.solar).length,
    internet: data.filter(p => p.internet).length,
  };
};
