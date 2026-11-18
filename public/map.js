// Campus map.
// GET /api/availability — library rooms. Optional date=YYYY-MM-DD and at=HH:mm, America/New_York.
// GET /api/directory — { places: [...] }.
// GET /api/buildings — optional. An array, or { buildings }, with a name plus latitude and longitude.
// A { ok, count } status object is ignored. Matching names nudge a pin toward the official coordinate.

import {
  CAMPUSES,
  NEW_HAVEN_BOUNDS,
  applyOfficial,
  buildScene,
  readOfficialRows,
} from "./place.js";

const params = new URLSearchParams(location.search);
const API = apiBase(params.get("api"));

const TONE_RANK = {
  free: 0,
  soon: 1,
  loading: 2,
  busy: 3,
  later: 4,
  error: 5,
  closed: 6,
  unknown: 7,
  inquiry: 8,
  college: 9,
};
const KIND_RANK = { live: 0, walkin: 1, inquiry: 2, college: 3 };
const STATUS_RANK = { free: 0, soon: 1, busy: 2, later: 3, closed: 4, unknown: 5 };

const state = {
  buildings: [],
  places: [],
  rooms: [],
  warnings: [],
  venues: [],
  unplaced: [],
  officialMoved: 0,
  liveStatus: "loading",
  stale: false,
  at: "",
  date: "",
  q: "",
  freeOnly: false,
  minCapacity: 0,
  colleges: false,
  campus: "haven",
  selected: "",
  open: "",
  scrollTo: "",
  map: null,
  mapReady: false,
  collegeLink: null,
};

const $ = (id) => document.getElementById(id);

async function main() {
  $("clock").textContent = formatNow();
  setInterval(() => {
    $("clock").textContent = formatNow();
  }, 30_000);

  const [buildingFile, fallbackDirectory, liveDirectory, officialPayload] = await Promise.all([
    fetch("/data/buildings.json").then((response) => response.json()),
    fetch("/data/directory.json")
      .then((response) => (response.ok ? response.json() : { places: [] }))
      .catch(() => ({ places: [] })),
    fetchJson("/api/directory"),
    fetchJson("/api/buildings"),
  ]);

  const official = applyOfficial(buildingFile.buildings || [], readOfficialRows(officialPayload));
  state.buildings = official.buildings;
  state.officialMoved = official.moved;
  state.places = liveDirectory?.places || fallbackDirectory.places || [];
  state.collegeLink = state.places.find((place) => /residential college/i.test(place.name)) || null;
  rebuild();
  bind();
  initMap();
  loadLive();
}

function bind() {
  $("q").addEventListener("input", (event) => {
    state.q = event.target.value.trim().toLowerCase();
    render();
  });
  $("free").addEventListener("click", () => {
    state.freeOnly = !state.freeOnly;
    $("free").setAttribute("aria-pressed", String(state.freeOnly));
    render();
  });
  $("colleges").addEventListener("click", () => {
    state.colleges = !state.colleges;
    $("colleges").setAttribute("aria-pressed", String(state.colleges));
    render();
  });
  $("size").addEventListener("change", (event) => {
    state.minCapacity = Number(event.target.value) || 0;
    render();
  });
  $("refresh").addEventListener("click", () => loadLive());
  document.querySelectorAll(".switch button").forEach((button) => {
    button.addEventListener("click", () => {
      state.campus = button.dataset.campus;
      if (state.selected) {
        const selected = state.venues.find((venue) => venue.id === state.selected);
        if (selected && !venueInCampus(selected, state.campus)) {
          state.selected = "";
          state.open = "";
        }
      }
      syncCampusButtons();
      fitCampus(state.campus);
      render();
    });
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
      event.preventDefault();
      $("q").focus();
    }
  });
  window.addEventListener("resize", () => {
    if (state.map) padMap();
  });
}

function initMap() {
  if (!window.maplibregl) {
    $("map").textContent = "The map library did not load.";
    return;
  }
  const map = new maplibregl.Map({
    container: "map",
    style: "/data/style.json",
    center: [-72.9276, 41.3112],
    zoom: 15,
    minZoom: 11,
    maxZoom: 19,
    maxBounds: [[-73.03, 41.23], [-72.88, 41.35]],
    pitchWithRotate: false,
    dragRotate: false,
    attributionControl: true,
  });
  state.map = map;
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(
    new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      showUserLocation: true,
    }),
    "top-right",
  );
  map.on("load", async () => {
    const footprints = await fetch("/data/footprints.geojson").then((response) => response.json());
    map.addSource("yale", { type: "geojson", data: footprints });
    map.addSource("pins", { type: "geojson", data: emptyCollection() });
    map.addLayer({
      id: "yale-fill",
      type: "fill",
      source: "yale",
      paint: {
        "fill-color": "#1c4068",
        "fill-opacity": 0.34,
      },
    });
    map.addLayer({
      id: "yale-line",
      type: "line",
      source: "yale",
      paint: {
        "line-color": "#10283f",
        "line-width": ["interpolate", ["linear"], ["zoom"], 13, 0.4, 17, 1.5],
        "line-opacity": 0.45,
      },
    });
    map.addImage("mark-inquiry", markImage("#9a6b24"));
    map.addImage("mark-college", markImage("#00356b"));
    map.addLayer({
      id: "pins",
      type: "circle",
      source: "pins",
      filter: ["==", ["get", "kind"], "live"],
      paint: {
        "circle-color": [
          "match",
          ["get", "tone"],
          "free",
          "#1d7a45",
          "soon",
          "#6d7a74",
          "busy",
          "#a33b32",
          "later",
          "#8a5a12",
          "closed",
          "#8a8175",
          "inquiry",
          "#9a6b24",
          "college",
          "#00356b",
          "loading",
          "#00356b",
          "#5c564c",
        ],
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          13,
          ["case", ["==", ["get", "kind"], "college"], 3.5, ["==", ["get", "selected"], 1], 8, 6],
          17,
          ["case", ["==", ["get", "kind"], "college"], 7, ["==", ["get", "selected"], 1], 16, 12],
        ],
        "circle-stroke-color": "#f7f3ea",
        "circle-stroke-width": ["case", ["==", ["get", "selected"], 1], 3.5, 2],
        "circle-opacity": 0.96,
      },
    });
    map.addLayer({
      id: "pin-marks",
      type: "symbol",
      source: "pins",
      filter: ["!=", ["get", "kind"], "live"],
      layout: {
        "icon-image": ["match", ["get", "kind"], "college", "mark-college", "mark-inquiry"],
        "icon-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          13,
          ["case", ["==", ["get", "selected"], 1], 0.72, 0.5],
          17,
          ["case", ["==", ["get", "selected"], 1], 1.15, 0.82],
        ],
        "icon-allow-overlap": true,
      },
    });
    map.addLayer({
      id: "pin-labels",
      type: "symbol",
      source: "pins",
      minzoom: 14.6,
      layout: {
        "text-field": ["get", "short"],
        "text-font": ["Noto Sans Bold"],
        "text-size": 12,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-allow-overlap": false,
        "text-padding": 2,
      },
      paint: {
        "text-color": "#1c1915",
        "text-halo-color": "#f7f3ea",
        "text-halo-width": 1.3,
      },
    });

    const tip = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 14,
      anchor: "bottom",
      className: "tip",
    });
    map.on("mousemove", (event) => {
      const hits = map.queryRenderedFeatures(event.point, { layers: ["pins", "pin-marks", "yale-fill"] });
      const pin = hits.find((feature) => feature.layer.id === "pins" || feature.layer.id === "pin-marks");
      const building = hits.find((feature) => feature.properties.venueId);
      map.getCanvas().style.cursor = pin || building ? "pointer" : "";
      if (!pin) {
        tip.remove();
        return;
      }
      tip.setLngLat(pin.geometry.coordinates).setHTML(escapeHtml(pin.properties.tip)).addTo(map);
    });
    map.on("mouseleave", () => tip.remove());
    map.on("click", (event) => {
      const pins = map.queryRenderedFeatures(event.point, { layers: ["pins", "pin-marks"] });
      if (pins.length) {
        selectVenue(pins[0].properties.id, { fly: false, scroll: true });
        return;
      }
      const fills = map.queryRenderedFeatures(event.point, { layers: ["yale-fill"] });
      const hit = fills.find((feature) => feature.properties.venueId);
      if (!hit) return;
      const venue = state.venues.find((item) => item.id === hit.properties.venueId);
      if (!venue) return;
      if (venue.kind === "college" && !state.colleges) {
        state.colleges = true;
        $("colleges").setAttribute("aria-pressed", "true");
      }
      selectVenue(venue.id, { fly: false, scroll: true });
    });

    state.mapReady = true;
    padMap();
    fitCampus(state.campus, false);
    render();
  });
}

async function loadLive({ quiet = false } = {}) {
  if (!quiet) {
    state.liveStatus = "loading";
    state.stale = false;
    renderChrome();
  }
  try {
    const response = await fetch(`${API}/api/availability`);
    if (!response.ok) throw new Error(String(response.status));
    const payload = scrub(await response.json());
    state.rooms = payload.rooms || [];
    state.warnings = payload.warnings || [];
    state.at = payload.at || "";
    state.date = payload.date || "";
    state.liveStatus = "ready";
    state.stale = false;
    rebuild();
  } catch {
    if (quiet && state.rooms.length) state.stale = true;
    else state.liveStatus = "error";
    rebuild();
  }
  render();
}

function rebuild() {
  const scene = buildScene({
    buildings: state.buildings,
    rooms: state.liveStatus === "ready" ? state.rooms : [],
    places: state.places,
  });
  state.venues = scene.venues;
  state.unplaced = scene.unplaced;
}

function render() {
  renderChrome();
  renderList();
  drawPins();
  paintBuildings();
  if (state.scrollTo) {
    document.getElementById(`venue-${cssEscape(state.scrollTo)}`)?.scrollIntoView({ block: "nearest" });
    state.scrollTo = "";
  }
}

function renderChrome() {
  const visible = visibleVenues();
  const liveRooms = visible
    .filter((venue) => venue.kind === "live")
    .flatMap((venue) => visibleRooms(venue));
  const free = liveRooms.filter((room) => room.status === "free").length;
  const bits = [];
  if (state.liveStatus === "loading") {
    bits.push("Reading the library calendars");
    bits.push("about two minutes the first time");
  }
  else if (state.liveStatus === "error") bits.push("Live calendar offline");
  else {
    const soon = liveRooms.filter((room) => room.status === "soon").length;
    if (liveRooms.length) {
      if (free) bits.push(`${free} free now`);
      if (soon) bits.push(`${soon} free shortly`);
      if (!free && !soon) bits.push("nothing free");
      bits.push(`${liveRooms.length} library rooms`);
    } else bits.push("No library rooms in this view");
  }
  if (state.at) bits.push(`as of ${formatClock(state.at)}`);
  if (state.stale) bits.push("refresh failed");
  $("stats").textContent = bits.join(" · ");
  $("warn").hidden = state.liveStatus !== "error" && !state.warnings.length && !state.officialMoved;
  const notes = [];
  if (state.liveStatus === "error") {
    notes.push("The live calendar is not reachable. Conference buildings are still on the map.");
  } else if (state.warnings.length) {
    notes.push(
      state.warnings.length === 1
        ? "One library calendar did not load."
        : `${state.warnings.length} library calendars did not load.`,
    );
  }
  if (state.officialMoved) notes.push("A few pins are using Yale's building coordinates.");
  $("warn").textContent = notes.join(" ");
  $("loading").hidden = state.liveStatus !== "loading";
  syncCampusButtons();
  renderDirectory();
}

function renderList() {
  const visible = visibleVenues();
  const groups = [
    ["live", "Open to book now"],
    ["walkin", "Walk in, no reservation"],
    ["inquiry", "Request a room"],
    ["college", "Residential colleges"],
  ];
  const parts = [];
  for (const [kind, label] of groups) {
    const items = visible.filter((venue) => venue.kind === kind);
    if (!items.length) continue;
    parts.push(`<h2 class="group-label">${label}</h2>`);
    for (const venue of items) parts.push(venueCard(venue));
  }
  const homeless = state.unplaced.filter(roomMatches);
  if (homeless.length && state.liveStatus === "ready") {
    parts.push(`<h2 class="group-label">Not placed on the map</h2>`);
    parts.push(`<div class="unplaced">${homeless.map((room) => roomRow(room)).join("")}</div>`);
  }
  if (!parts.length) {
    parts.push(
      `<p class="empty">Nothing on the map matches that. Clear the search or the filters.</p>`,
    );
  }
  $("list").innerHTML = parts.join("");
  $("list").querySelectorAll("[data-venue]").forEach((button) => {
    button.addEventListener("click", () => {
      const opening = state.open !== button.dataset.venue;
      selectVenue(button.dataset.venue, { fly: opening, scroll: false });
    });
  });
  $("list").querySelectorAll("img").forEach((img) => {
    img.addEventListener("error", () => img.remove());
  });
}

function renderDirectory() {
  const query = state.q;
  const places = state.places.filter((place) => {
    if (!query) return true;
    return `${place.name} ${place.group} ${place.system} ${place.who}`.toLowerCase().includes(query);
  });
  const groups = [];
  for (const place of places) {
    let group = groups.find((item) => item.name === place.group);
    if (!group) {
      group = { name: place.group, places: [] };
      groups.push(group);
    }
    group.places.push(place);
  }
  const body = groups
    .map((group) => {
      const cards = group.places.map((place) => {
        const venue = state.venues.find((item) => item.places.includes(place));
        const mapButton = venue
          ? `<button type="button" class="text-btn" data-jump="${escapeHtml(venue.id)}">Show on map</button>`
          : "";
        return `<article class="dir-card">
          <h3>${escapeHtml(place.name)}</h3>
          <p class="meta">${escapeHtml(place.system)} · ${escapeHtml(place.wait)}</p>
          <p>${escapeHtml(place.who)}</p>
          <p class="links">
            ${link(place.url, "Open the system", "book quiet")}
            ${place.info ? link(place.info, "How it works", "text-btn") : ""}
            ${mapButton}
          </p>
        </article>`;
      });
      return `<h2 class="group-label">${escapeHtml(group.name)}</h2>${cards.join("")}`;
    })
    .join("");
  $("directory").innerHTML = `<h2 class="dir-title">How booking actually works</h2>${body}`;
  $("directory").querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => selectVenue(button.dataset.jump, { fly: true, scroll: true }));
  });
}

function venueCard(venue) {
  const rooms = visibleRooms(venue);
  const tone = venueTone(venue, rooms);
  const open = state.open === venue.id;
  const count =
    venue.kind === "live"
      ? state.liveStatus === "loading"
        ? "Checking"
        : state.liveStatus === "error"
          ? "Offline"
          : countLabel(rooms, tone)
      : venue.kind === "college"
        ? "Ask first"
        : venue.kind === "walkin"
          ? "Walk in"
          : "Request";
  const hours = rooms.find((room) => room.hours)?.hours || "";
  const place = venue.places[0];
  const policy = venue.places
    .map(
      (item) =>
        `<p class="who"><strong>${escapeHtml(item.system)}.</strong> ${escapeHtml(item.wait)} ${escapeHtml(item.who)}</p>`,
    )
    .join("");
  const primary = place?.url || venue.url || "";
  const primaryLabel = venue.linkLabel || (venue.kind === "live" ? "" : "Open");
  const collegeUrl = venue.kind === "college" ? state.collegeLink?.url : "";
  const body = open
    ? `<div class="detail">
        ${venue.note ? `<p class="note">${escapeHtml(venue.note)}</p>` : ""}
        ${hours ? `<p class="hours">${escapeHtml(hours)}</p>` : ""}
        ${rooms.map((room) => roomRow(room, venue)).join("")}
        ${policy}
        ${
          venue.kind !== "live" && primary
            ? `<p class="links">${link(primary, primaryLabel || "Open", "book")}${
                place?.info ? link(place.info, "Details", "text-btn") : ""
              }</p>`
            : ""
        }
        ${
          collegeUrl
            ? `<p class="links">${link(collegeUrl, "College room policy", "book quiet")}</p>`
            : ""
        }
      </div>`
    : "";
  return `<article class="venue${open ? " is-on" : ""}" id="venue-${escapeHtml(venue.id)}">
    <button type="button" class="venue-head" data-venue="${escapeHtml(venue.id)}" aria-expanded="${open}">
      <span class="dot ${escapeHtml(tone)}"></span>
      <span class="venue-copy">
        <span class="venue-title">${escapeHtml(venue.title)}</span>
        <span class="venue-address">${escapeHtml(venue.address || "")}</span>
      </span>
      <span class="count">${escapeHtml(count)}</span>
    </button>
    ${body}
  </article>`;
}

function roomRow(room, venue) {
  const showWhere = room.location && (!venue || !samePlace(room.location, venue.title));
  const where = showWhere ? `<span class="where">${escapeHtml(room.location)}</span>` : "";
  const bits = [];
  if (room.category && !sameLabel(room.category, venue?.title)) bits.push(room.category);
  if (room.capacity > 0) bits.push(room.capacity === 1 ? "1 seat" : `${room.capacity} seats`);
  const when = whenText(room);
  if (when) bits.push(when);
  const image = safeUrl(room.image);
  return `<div class="room">
    ${image ? `<img src="${escapeHtml(image)}" alt="" width="56" height="42" referrerpolicy="no-referrer">` : ""}
    <div class="room-main">
      <div class="room-top">
        <h3>${where}${escapeHtml(room.name)}</h3>
        <span class="pill ${escapeHtml(room.status || "unknown")}">${escapeHtml(statusLabel(room))}</span>
      </div>
      <p class="meta">${escapeHtml(bits.join(" · "))}</p>
      ${room.note ? `<p class="meta">${escapeHtml(room.note)}</p>` : ""}
      ${track(room)}
    </div>
    ${room.bookUrl ? link(room.bookUrl, "Book", "book") : ""}
  </div>`;
}

function track(room) {
  if (!state.at || !room.bar?.length) return "";
  const start = civilMinutes(state.at);
  const span = 4 * 60;
  const segments = room.bar
    .map((slot) => {
      const from = Math.max(civilMinutes(slot.start), start);
      const to = Math.min(civilMinutes(slot.end), start + span);
      if (to <= from) return "";
      const left = ((from - start) / span) * 100;
      const width = ((to - from) / span) * 100;
      return `<i class="${slot.free ? "free" : "busy"}" style="left:${left}%;width:${width}%"></i>`;
    })
    .join("");
  if (!segments) return "";
  return `<div class="track" title="Next 4 hours from ${escapeHtml(formatClock(state.at))}">${segments}</div>`;
}

function visibleVenues() {
  return state.venues
    .filter((venue) => {
      if (venue.kind === "college" && !state.colleges) return false;
      if (!venueInCampus(venue, state.campus)) return false;
      if (venue.kind === "live" && state.liveStatus === "ready" && venue.rooms.length === 0 && !venue.dynamic) {
        return false;
      }
      const rooms = visibleRooms(venue);
      if (venue.kind === "live" && state.minCapacity > 0 && rooms.length === 0) return false;
      if (
        state.freeOnly &&
        venue.kind !== "walkin" &&
        !rooms.some((room) => room.status === "free" || room.status === "soon")
      ) {
        return false;
      }
      if (!textHit(venue, rooms)) return false;
      return true;
    })
    .sort((a, b) => {
      const kind = KIND_RANK[a.kind] - KIND_RANK[b.kind];
      if (kind) return kind;
      const tone = TONE_RANK[venueTone(a, visibleRooms(a))] - TONE_RANK[venueTone(b, visibleRooms(b))];
      if (tone) return tone;
      const free = visibleRooms(b).filter((room) => room.status === "free").length
        - visibleRooms(a).filter((room) => room.status === "free").length;
      if (free) return free;
      return a.title.localeCompare(b.title);
    });
}

function visibleRooms(venue) {
  return (venue.rooms || []).filter(roomMatches).sort((a, b) => {
    const rank = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
    if (rank) return rank;
    const limit = Number(Boolean(a.limited)) - Number(Boolean(b.limited));
    if (limit) return limit;
    if (a.status === "free" || a.status === "soon") return (b.freeMinutes || 0) - (a.freeMinutes || 0);
    return a.name.localeCompare(b.name);
  });
}

function roomMatches(room) {
  if ((room.capacity || 0) < state.minCapacity) return false;
  if (state.freeOnly && room.status !== "free" && room.status !== "soon") return false;
  if (!state.q) return true;
  return `${room.name} ${room.location} ${room.category} ${room.note || ""}`.toLowerCase().includes(state.q);
}

function textHit(venue, rooms) {
  if (!state.q) return true;
  if (rooms.length) return true;
  const placeText = venue.places
    .map((place) => `${place.name} ${place.system} ${place.wait} ${place.who}`)
    .join(" ");
  return `${venue.title} ${venue.address} ${venue.note || ""} ${placeText}`.toLowerCase().includes(state.q);
}

function venueInCampus(venue, campus) {
  if (!campus || campus === "all") return true;
  if (campus === "haven") return venue.campus !== "west";
  return venue.campus === campus;
}

function venueTone(venue, rooms = visibleRooms(venue)) {
  if (venue.kind === "inquiry" || venue.kind === "walkin") return "inquiry";
  if (venue.kind === "college") return "college";
  if (state.liveStatus === "loading") return "loading";
  if (state.liveStatus === "error") return "error";
  if (rooms.some((room) => room.status === "free")) return "free";
  if (rooms.some((room) => room.status === "soon")) return "soon";
  if (rooms.some((room) => room.status === "busy")) return "busy";
  if (rooms.some((room) => room.status === "later")) return "later";
  if (rooms.some((room) => room.status === "closed")) return "closed";
  return "unknown";
}

function toneLabel(tone) {
  if (tone === "busy") return "In use";
  if (tone === "closed") return "Closed";
  if (tone === "soon") return "Soon";
  if (tone === "later") return "Later";
  return "No schedule";
}

function selectVenue(id, { fly = true, scroll = false } = {}) {
  const venue = state.venues.find((item) => item.id === id);
  if (!venue) return;
  if (!venueInCampus(venue, state.campus)) {
    state.campus = venue.campus === "west" ? "west" : state.campus === "haven" ? "haven" : venue.campus;
    syncCampusButtons();
  }
  if (venue.kind === "college") {
    state.colleges = true;
    $("colleges").setAttribute("aria-pressed", "true");
  }
  const same = state.open === id;
  state.selected = id;
  state.open = same && !scroll ? "" : id;
  if (scroll) state.scrollTo = id;
  render();
  if (fly && state.map && venue.lat != null) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    state.map.easeTo({
      center: [venue.lng, venue.lat],
      zoom: Math.max(state.map.getZoom(), 16.2),
      duration: reduce ? 0 : 700,
      essential: true,
    });
  }
}

function drawPins() {
  if (!state.mapReady) return;
  const features = visibleVenues().map((venue) => {
    const rooms = visibleRooms(venue);
    const tone = venueTone(venue, rooms);
    const free = rooms.filter((room) => room.status === "free").length;
    const tip =
      venue.kind === "live" && state.liveStatus === "ready"
        ? `${venue.title} · ${free ? `${free} free` : rooms.some((room) => room.status === "soon") ? "free shortly" : toneLabel(tone)}`
        : venue.title;
    return {
      type: "Feature",
      properties: {
        id: venue.id,
        short: venue.short,
        tone,
        kind: venue.kind,
        selected: state.selected === venue.id ? 1 : 0,
        tip,
      },
      geometry: { type: "Point", coordinates: [venue.lng, venue.lat] },
    };
  });
  state.map.getSource("pins").setData({ type: "FeatureCollection", features });
}

function paintBuildings() {
  if (!state.mapReady) return;
  const selected = state.selected || "___none___";
  state.map.setPaintProperty("yale-fill", "fill-color", [
    "case",
    ["==", ["get", "venueId"], selected],
    "#e0b03a",
    ["in", ["get", "role"], ["literal", ["live", "inquiry"]]],
    "#1d4e89",
    "#1c4068",
  ]);
  state.map.setPaintProperty("yale-fill", "fill-opacity", [
    "case",
    ["==", ["get", "venueId"], selected],
    0.9,
    ["in", ["get", "role"], ["literal", ["live", "inquiry"]]],
    0.62,
    0.3,
  ]);
  state.map.setPaintProperty("yale-line", "line-color", [
    "case",
    ["==", ["get", "venueId"], selected],
    "#8a6414",
    "#10283f",
  ]);
}

function fitCampus(campus, animate = true) {
  if (!state.mapReady) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bounds =
    campus === "haven" || campus === "all"
      ? NEW_HAVEN_BOUNDS
      : CAMPUSES.find((item) => item.id === campus)?.bounds;
  if (!bounds) return;
  state.map.fitBounds(bounds, {
    duration: animate && !reduce ? 700 : 0,
    essential: true,
  });
}

function padMap() {
  state.map.setPadding(mapPadding());
}

function mapPadding() {
  const narrow = window.innerWidth <= 860;
  const sheet = Math.min(Math.round(window.innerHeight * 0.46), 440);
  return {
    top: narrow ? 96 : 64,
    left: 24,
    right: 52,
    bottom: narrow ? sheet + 16 : 40,
  };
}

function syncCampusButtons() {
  document.querySelectorAll(".switch button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.campus === state.campus));
  });
}

function countLabel(rooms, tone) {
  const free = rooms.filter((room) => room.status === "free").length;
  const soon = rooms.filter((room) => room.status === "soon").length;
  if (free) return `${free} free`;
  if (soon) return `${soon} shortly`;
  return toneLabel(tone);
}

function cleanLabel(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function samePlace(location, title) {
  const left = cleanLabel(location);
  const right = cleanLabel(title);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function sameLabel(left, right) {
  const a = cleanLabel(left);
  const b = cleanLabel(right);
  return Boolean(a && b && a === b);
}

function statusLabel(room) {
  if (room.status === "free") {
    return room.freeMinutes > 0 ? `Free · ${formatDuration(room.freeMinutes)}` : "Free";
  }
  if (room.status === "soon") return room.waitMinutes ? `Free in ${room.waitMinutes}m` : "Free shortly";
  if (room.status === "busy") return room.busyUntil ? `Until ${formatClock(room.busyUntil)}` : "Busy";
  if (room.status === "later") return room.nextFree ? `Later · ${formatClock(room.nextFree)}` : "Later";
  if (room.status === "closed") return "Closed";
  return "No schedule";
}

function whenText(room) {
  if (room.status === "free" && room.freeUntil) return `until ${formatClock(room.freeUntil)}`;
  if (room.status === "busy" && room.nextFree) return `next free ${formatClock(room.nextFree)}`;
  if (room.status === "soon" && room.freeUntil) return `until ${formatClock(room.freeUntil)}`;
  if (room.status === "later" && room.nextFree) return `at ${formatClock(room.nextFree)}`;
  return "";
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!rest) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

function formatClock(stamp) {
  if (!stamp) return "";
  const time = stamp.split(" ")[1] || "";
  let [hour, minute] = time.split(":").map(Number);
  if (!Number.isFinite(hour)) return "";
  if (!minute && hour === 0) return "midnight";
  if (!minute && hour === 12) return "noon";
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  if (!minute) return `${hour} ${suffix}`;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatNow() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

function civilMinutes(stamp) {
  const [day, time] = String(stamp).split(" ");
  if (!day || !time) return 0;
  const [year, month, date] = day.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  return Date.UTC(year, month - 1, date, hour, minute, second) / 60000;
}

function link(url, label, className) {
  const href = safeUrl(url);
  if (!href) return "";
  return `<a class="${className}" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function safeUrl(url) {
  try {
    const parsed = new URL(url, location.origin);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
  } catch {
    return "";
  }
  return "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cssEscape(value) {
  return window.CSS?.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, "");
}

function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (!value || typeof value !== "object") return value;
  const next = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "checksum") continue;
    next[key] = scrub(item);
  }
  return next;
}

function markImage(fill) {
  const size = 28;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f7f3ea";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = fill;
  ctx.fillRect(3, 3, size - 6, size - 6);
  return ctx.getImageData(0, 0, size, size);
}

function emptyCollection() {
  return { type: "FeatureCollection", features: [] };
}

function apiBase(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
  } catch {
    return "";
  }
  return "";
}

async function fetchJson(path) {
  try {
    const response = await fetch(`${API}${path}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

setInterval(() => {
  if (state.liveStatus === "ready") loadLive({ quiet: true });
}, 60_000);

main().catch((error) => {
  console.error(error);
  const stats = document.getElementById("stats");
  if (stats) stats.textContent = "The campus map could not be loaded.";
});
