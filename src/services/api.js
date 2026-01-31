export const API_BASE = import.meta.env.VITE_API_BASE_URL;

/* ---------- Generic Fetch Wrapper ---------- */
export const apiFetch = async (url, options = {}) => {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "API Error");
  }

  // ✅ SAFE JSON HANDLING
  const text = await res.text();

  // Backend sometimes returns empty response
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
