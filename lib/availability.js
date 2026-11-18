import { getCatalog } from "./catalog.js";
import { hoursFor } from "./hours.js";
import { fetchGrid } from "./libcal.js";
import { annotateRoom } from "./notes.js";
import { addMinutes, minutesBetween, nextDay } from "./time.js";

const GRID_TTL = 5 * 60 * 1000;
const days = new Map();
const inflight = new Map();

export async function availability({ day, at }) {
  const catalog = await getCatalog();
  const snapshot = await slotsForDay(day, catalog);

  const windowEnd = addMinutes(at, 4 * 60);
  const hoursByLocation = new Map();
  for (const name of new Set(catalog.rooms.map((room) => room.location))) {
    hoursByLocation.set(name, await hoursFor(name, day).catch(() => null));
  }

  const rooms = [];
  for (const room of catalog.rooms) {
    const slots = dedupeSlots(snapshot.slotsByRoom.get(room.id) || []);
    const state = describe(slots, at);
    const hours = hoursByLocation.get(room.location);
    const info = annotateRoom(room, at);
    rooms.push({
      ...room,
      hours: hours?.rendered || "",
      open: hours ? hours.open : null,
      ...state,
      ...(info.note ? { note: info.note } : {}),
      ...(info.limited ? { limited: true } : {}),
      bar: slots.filter((slot) => slot.end > at && slot.start < windowEnd),
    });
  }

  return {
    timezone: "America/New_York",
    date: day,
    at,
    fetchedAt: new Date(snapshot.fetchedAt).toISOString(),
    ageSeconds: Math.max(0, Math.round((Date.now() - snapshot.fetchedAt) / 1000)),
    stale: snapshot.stale,
    refreshing: snapshot.refreshing,
    warnings: snapshot.warnings,
    locations: catalog.locations,
    rooms,
  };
}

async function slotsForDay(day, catalog) {
  const groups = [...groupRooms(catalog.rooms).values()];
  const entry = days.get(day);
  if (entry && Date.now() - entry.fetchedAt < GRID_TTL) {
    return { ...entry, stale: false, refreshing: false };
  }
  // No snapshot yet: every caller waits on the same paced pull.
  if (!entry?.fetchedAt) {
    const next = await ensureRefresh(day, groups, null);
    return { ...next, stale: false, refreshing: false };
  }
  if (!inflight.has(day)) ensureRefresh(day, groups, entry);
  return { ...entry, stale: true, refreshing: true };
}

function ensureRefresh(day, groups, previous) {
  const running = inflight.get(day);
  if (running) return running;

  const entry = previous || { slotsByRoom: new Map(), warnings: [], fetchedAt: 0 };
  entry.refreshing = true;
  if (previous) days.set(day, entry);

  const run = refresh(day, groups, entry)
    .then((next) => {
      const saved = { ...next, refreshing: false };
      days.set(day, saved);
      return saved;
    })
    .catch((error) => {
      entry.refreshing = false;
      if (entry.fetchedAt) {
        entry.warnings = [...(entry.warnings || []), error.message];
        days.set(day, entry);
        return entry;
      }
      throw error;
    })
    .finally(() => {
      if (inflight.get(day) === run) inflight.delete(day);
    });

  inflight.set(day, run);
  return run;
}

async function refresh(day, groups, previous) {
  const slotsByRoom = new Map(previous?.slotsByRoom || []);
  const warnings = [];
  const end = nextDay(day);
  for (const group of groups) {
    try {
      const value = await fetchGrid(group.lid, group.gid, day, end);
      for (const id of group.roomIds) slotsByRoom.delete(id);
      for (const slot of value.slots || []) {
        const id = Number(slot.itemId);
        const list = slotsByRoom.get(id) || [];
        list.push({
          start: normalizeStamp(slot.start),
          end: normalizeStamp(slot.end),
          free: !slot.className,
        });
        slotsByRoom.set(id, list);
      }
    } catch (error) {
      warnings.push(`${group.lid}/${group.gid}: ${error.message}`);
    }
  }
  if (slotsByRoom.size === 0 && warnings.length > 0) {
    throw new Error(warnings.join("; "));
  }
  return { fetchedAt: Date.now(), slotsByRoom, warnings };
}

function describe(slots, at) {
  if (slots.length === 0) {
    return emptyState("unknown");
  }

  let index = slots.findIndex((slot) => slot.start <= at && at < slot.end);
  let from = at;
  let waitMinutes = 0;

  // LibCal often starts today's grid on the next 15-minute boundary, so "now"
  // can fall in a short hole before the first returned slot.
  if (index === -1) {
    const next = slots.findIndex((slot) => slot.start > at);
    if (next === -1) return { ...emptyState("closed"), nextFree: null };
    const gap = minutesBetween(at, slots[next].start);
    const previous = next > 0 ? slots[next - 1] : null;
    const paddingOnly = !previous || previous.end <= at;
    if (paddingOnly && gap <= 30) {
      index = next;
      from = slots[next].start;
      waitMinutes = gap;
    } else {
      const upcoming = slots.slice(next).find((slot) => slot.free);
      return {
        ...emptyState(upcoming ? "later" : "closed"),
        nextFree: upcoming?.start || null,
        waitMinutes: upcoming ? minutesBetween(at, upcoming.start) : 0,
      };
    }
  }

  if (slots[index].free) {
    let endIndex = index;
    while (
      endIndex + 1 < slots.length &&
      slots[endIndex + 1].free &&
      slots[endIndex + 1].start === slots[endIndex].end
    ) {
      endIndex += 1;
    }
    const freeUntil = slots[endIndex].end;
    return {
      status: waitMinutes > 0 ? "soon" : "free",
      freeMinutes: Math.max(0, minutesBetween(from, freeUntil)),
      freeUntil,
      busyUntil: null,
      nextFree: waitMinutes > 0 ? from : null,
      waitMinutes,
    };
  }

  let endIndex = index;
  while (
    endIndex + 1 < slots.length &&
    !slots[endIndex + 1].free &&
    slots[endIndex + 1].start <= slots[endIndex].end
  ) {
    endIndex += 1;
  }
  const nextFree = slots.slice(endIndex + 1).find((slot) => slot.free);
  return {
    status: "busy",
    freeMinutes: 0,
    freeUntil: null,
    busyUntil: slots[endIndex].end,
    nextFree: nextFree?.start || null,
    waitMinutes,
  };
}

function emptyState(status) {
  return {
    status,
    freeMinutes: 0,
    freeUntil: null,
    busyUntil: null,
    nextFree: null,
    waitMinutes: 0,
  };
}

function groupRooms(rooms) {
  const groups = new Map();
  for (const room of rooms) {
    const key = `${room.lid}:${room.gid}`;
    const group = groups.get(key) || { lid: room.lid, gid: room.gid, roomIds: [] };
    group.roomIds.push(room.id);
    groups.set(key, group);
  }
  return groups;
}

function dedupeSlots(slots) {
  const byStart = new Map();
  for (const slot of slots) {
    const existing = byStart.get(slot.start);
    if (!existing || (existing.free && !slot.free)) byStart.set(slot.start, slot);
  }
  return [...byStart.values()].sort((a, b) => a.start.localeCompare(b.start));
}

function normalizeStamp(value) {
  return value.length === 16 ? `${value}:00` : value;
}
