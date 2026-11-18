import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchText, parseRooms, parseSelects } from "./libcal.js";

const SEED = "https://schedule.yale.edu/spaces?lid=9058";
const FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "catalog.json");
const CATALOG_TTL = 24 * 60 * 60 * 1000;

let cached = null;
let pending = null;

export function getCatalog() {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = loadCatalog()
      .then((value) => {
        cached = value;
        return value;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

async function loadCatalog() {
  const saved = await readSaved();
  if (saved) return saved;
  const fresh = await fetchCatalog();
  await writeSaved(fresh);
  return fresh;
}

async function readSaved() {
  try {
    const parsed = JSON.parse(await readFile(FILE, "utf8"));
    const age = Date.now() - Date.parse(parsed.fetchedAt);
    if (!Array.isArray(parsed.rooms) || parsed.rooms.length === 0) return null;
    if (!Number.isFinite(age) || age > CATALOG_TTL) return null;
    return { locations: parsed.locations, rooms: parsed.rooms };
  } catch {
    return null;
  }
}

async function writeSaved(catalog) {
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(
    FILE,
    JSON.stringify({ fetchedAt: new Date().toISOString(), ...catalog }),
  );
}

async function fetchCatalog() {
  const seed = await fetchText(SEED);
  const locations = locationOptions(parseSelects(seed));
  const jobs = [];
  for (const location of locations) {
    const html = await fetchText(`https://schedule.yale.edu/spaces?lid=${location.id}`);
    for (const category of categoryOptions(parseSelects(html))) {
      jobs.push({ location, category });
    }
  }

  const byId = new Map();
  for (const { location, category } of jobs) {
    const html = await fetchText(
      `https://schedule.yale.edu/spaces?lid=${location.id}&gid=${category.id}`,
    );
    for (const room of parseRooms(html)) {
      if (!byId.has(room.id)) {
        byId.set(room.id, { ...room, location: location.name, category: category.name });
      }
    }
  }

  return {
    locations,
    rooms: [...byId.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function locationOptions(selects) {
  const select = selects.find((options) =>
    options.some((option) => option.label === "Bass Library"),
  );
  if (!select) throw new Error("Could not find the library location list");
  return select
    .filter((option) => option.value && option.value !== "0" && option.label)
    .map((option) => ({ id: option.value, name: option.label }));
}

function categoryOptions(selects) {
  const select = selects.find((options) =>
    options.some((option) => option.label === "Show All"),
  );
  if (!select) return [];
  return select
    .filter((option) => option.value && option.value !== "0" && option.label !== "Show All")
    .map((option) => ({ id: option.value, name: option.label }));
}
