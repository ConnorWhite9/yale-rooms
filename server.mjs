import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { availability } from "./lib/availability.js";
import { getCatalog } from "./lib/catalog.js";
import { directory } from "./lib/directory.js";
import { buildingsStatus } from "./lib/portal.js";
import { nowInNewYork } from "./lib/time.js";

const PUBLIC_DIR = resolve("public");
const FILES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const PORT = Number(process.env.PORT) || 8787;

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (request.method === "OPTIONS") {
    return send(response, 204, null);
  }
  if (request.method !== "GET") {
    return send(response, 405, { error: "Only GET is supported." });
  }

  try {
    if (url.pathname === "/api/health") {
      const portal = await buildingsStatus();
      const now = nowInNewYork();
      return send(response, 200, {
        ok: true,
        time: now.stamp,
        timezone: "America/New_York",
        buildingsApi: portal.ok ? "ok" : "unavailable",
      });
    }
    if (url.pathname === "/api/catalog") {
      const catalog = await getCatalog();
      return send(response, 200, catalog);
    }
    if (url.pathname === "/api/directory") {
      return send(response, 200, { places: directory });
    }
    if (url.pathname === "/api/availability") {
      const query = readQuery(url);
      if (query.error) return send(response, 400, { error: query.error });
      const result = await availability({ day: query.day, at: query.at });
      const rooms = result.rooms.filter((room) => matches(room, query));
      rooms.sort(byUsefulness);
      return send(response, 200, { ...result, rooms, count: rooms.length });
    }
    return serveStatic(response, url.pathname);
  } catch (error) {
    console.error(error);
    return send(response, 500, { error: "The room feed failed." });
  }
});

server.listen(PORT, () => {
  console.log(`yale-rooms api on http://localhost:${PORT}`);
});

function readQuery(url) {
  const now = nowInNewYork();
  const day = url.searchParams.get("date") || now.day;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return { error: "date must be YYYY-MM-DD." };
  }
  const clock = url.searchParams.get("at");
  let at;
  if (!clock) {
    at = day === now.day ? now.stamp : `${day} 12:00:00`;
  } else if (!/^\d{2}:\d{2}$/.test(clock)) {
    return { error: "at must be HH:mm in America/New_York." };
  } else {
    at = `${day} ${clock}:00`;
  }
  const minCapacity = Number(url.searchParams.get("minCapacity") || 0);
  if (!Number.isFinite(minCapacity) || minCapacity < 0) {
    return { error: "minCapacity must be a number." };
  }
  const status = url.searchParams.get("status") || "";
  if (status && !["free", "soon", "busy", "later", "closed", "unknown"].includes(status)) {
    return { error: "status must be free, soon, busy, later, closed, or unknown." };
  }
  return {
    day,
    at,
    lid: url.searchParams.get("lid") || "",
    minCapacity,
    q: (url.searchParams.get("q") || "").trim().toLowerCase(),
    status,
  };
}

function matches(room, query) {
  if (query.lid && String(room.lid) !== query.lid) return false;
  if (room.capacity < query.minCapacity) return false;
  if (query.status && room.status !== query.status) return false;
  if (!query.q) return true;
  const haystack = `${room.name} ${room.location} ${room.category} ${room.note || ""}`.toLowerCase();
  return haystack.includes(query.q);
}

function byUsefulness(a, b) {
  const rank = { free: 0, soon: 1, busy: 2, later: 3, closed: 4, unknown: 5 };
  const diff = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
  if (diff !== 0) return diff;
  const limit = Number(Boolean(a.limited)) - Number(Boolean(b.limited));
  if (limit !== 0) return limit;
  if (a.status === "free" || a.status === "soon") return b.freeMinutes - a.freeMinutes;
  if (a.nextFree && b.nextFree) return a.nextFree.localeCompare(b.nextFree);
  return a.name.localeCompare(b.name);
}

async function serveStatic(response, pathname) {
  const rel = (pathname === "/" ? "index.html" : pathname).replace(/^\/+/, "");
  const filePath = resolve(PUBLIC_DIR, rel);
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + sep)) {
    return send(response, 403, { error: "Forbidden." });
  }
  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": FILES[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(body);
  } catch (error) {
    if (error.code === "ENOENT") return send(response, 404, { error: "Not found." });
    throw error;
  }
}

function send(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  });
  response.end(body == null ? "" : JSON.stringify(body));
}
