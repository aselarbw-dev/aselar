// geocode.js — new file, not touching existing controllers
const axios = require("axios");

async function geocodePlace(place) {
  try {
    const res = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q: place, format: "json", limit: 1 },
      headers: { "User-Agent": "Aselar/1.0 (contact@yourdomain.com)" },
    });
    if (!res.data?.[0]) return null;
    const { lat, lon } = res.data[0];
    return { type: "Point", coordinates: [parseFloat(lon), parseFloat(lat)] };
  } catch (err) {
    console.warn("Geocode failed for:", place, err.message);
    return null; // never throw — a failed geocode should not block registration
  }
}

module.exports = geocodePlace;