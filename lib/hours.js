const HOURS_URL = "https://api3.libcal.com/api_hours_grid.php?iid=457&format=json&weeks=1";
let cached = null;
let cachedAt = 0;
let pending = null;
const HOURS_TTL = 6 * 60 * 60 * 1000;

export async function hoursFor(locationName, day) {
  const locations = await loadHours();
  const wanted = normalize(locationName);
  let best = null;
  for (const location of locations) {
    const name = normalize(location.name);
    if (!name || !wanted) continue;
    const match = name === wanted || wanted.includes(name) || name.includes(wanted);
    if (!match) continue;
    if (!best || location.category === "library") best = location;
  }
  if (!best) return null;
  const week = best.weeks?.[0];
  if (!week) return null;
  const entry = Object.values(week).find((value) => value?.date === day);
  if (!entry) return null;
  return {
    rendered: entry.rendered || "",
    open: entry.times?.status === "open",
  };
}

function loadHours() {
  if (cached && Date.now() - cachedAt < HOURS_TTL) return Promise.resolve(cached);
  if (!pending) {
    pending = fetch(HOURS_URL, {
      headers: { "User-Agent": "yale-rooms/0.1", Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`hours returned ${response.status}`);
        const payload = await response.json();
        cached = payload.locations || [];
        cachedAt = Date.now();
        return cached;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

function normalize(value) {
  return value
    .toLowerCase()
    .replace(/memorial/g, "")
    .replace(/library/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
