// Place matching for the campus map. Pure data, no DOM.

export const CAMPUSES = [
  {
    id: "central",
    label: "Central",
    title: "Cross Campus, Hillhouse, and the law school",
    bounds: [[-72.9342, 41.3066], [-72.9182, 41.3163]],
  },
  {
    id: "science",
    label: "Science Hill",
    title: "Kline Tower and the science buildings",
    bounds: [[-72.9268, 41.3156], [-72.9182, 41.321]],
  },
  {
    id: "prospect",
    label: "Prospect",
    title: "Greenberg Conference Center",
    bounds: [[-72.9262, 41.3206], [-72.9178, 41.3254]],
  },
  {
    id: "medical",
    label: "Medical",
    title: "Cedar Street and the School of Public Health",
    bounds: [[-72.9368, 41.3014], [-72.9295, 41.3056]],
  },
  {
    id: "west",
    label: "West Campus",
    title: "West Haven conference center",
    bounds: [[-72.9965, 41.2538], [-72.9825, 41.2628]],
  },
];

export const NEW_HAVEN_BOUNDS = [[-72.9375, 41.301], [-72.9178, 41.3256]];

// Curated meeting places. `match` catches live calendar locations and, where
// noted, a directory entry. Coordinates come from the footprint file.
export const VENUES = [
  {
    id: "bass",
    title: "Bass Library",
    short: "Bass",
    kind: "live",
    campus: "central",
    match: [/\bbass\b/i],
    reject: [/center/i, /molecular/i],
    note: "Group study rooms under Cross Campus. Both entrances are on Wall Street.",
    directoryTest: /bass open study/i,
  },
  {
    id: "haas",
    title: "Haas Arts Library",
    short: "Haas",
    kind: "live",
    campus: "central",
    match: [/haas/i, /arts library/i],
    note: "Enter through the Loria Center, 190 York Street.",
    address: "190 York Street",
    directoryTest: /haas reading/i,
  },
  {
    id: "marx",
    title: "Marx Library",
    short: "Marx",
    kind: "live",
    campus: "science",
    match: [/marx/i],
    note: "Concourse level of Kline Tower, 219 Prospect Street.",
    address: "219 Prospect Street",
    directoryTest: /marx open study/i,
  },
  {
    id: "rosenkranz",
    title: "Rosenkranz Hall",
    short: "Rosenkranz",
    kind: "live",
    campus: "central",
    match: [/rosenkranz/i, /rosenkraz/i],
    note: "The library classroom is on the live calendar. Other rooms in this building are requested through 25Live.",
  },
  {
    id: "hillhouse-17",
    title: "17 Hillhouse",
    short: "17 Hillhouse",
    kind: "live",
    campus: "central",
    match: [/17\s*hillhouse/i],
    address: "17 Hillhouse Avenue",
  },
  {
    id: "law",
    title: "Sterling Law Building",
    short: "Law",
    kind: "inquiry",
    campus: "central",
    match: [/law school/i, /sterling law/i],
    directoryTest: /law school/i,
    address: "127 Wall Street",
  },
  {
    id: "som",
    title: "Evans Hall",
    short: "SOM",
    kind: "inquiry",
    campus: "central",
    match: [/school of management/i, /evans hall/i],
    directoryTest: /school of management/i,
    note: "School of Management interview rooms, at the Evans Hall on Whitney Avenue.",
    address: "165 Whitney Avenue",
  },
  {
    id: "ysph",
    title: "School of Public Health",
    short: "YSPH",
    kind: "inquiry",
    campus: "medical",
    match: [/public health/i, /epidemiology/i, /\bysph\b/i],
    directoryTest: /public health/i,
    note: "Laboratory of Epidemiology and Public Health. The outline is from OpenStreetMap; it is missing from the facilities footprint layer.",
    address: "60 College Street",
  },
  {
    id: "medical",
    title: "Medical campus",
    short: "Medical",
    kind: "inquiry",
    campus: "medical",
    match: [/medical library/i, /cushing/i],
    directoryTest: /medical campus|medical library reading/i,
    note: "Sterling Hall of Medicine. The medical calendar is behind a NetID login, so this pin is the front door, not a live board.",
    address: "333 Cedar Street",
  },
  {
    id: "greenberg",
    title: "Greenberg Conference Center",
    short: "Greenberg",
    kind: "inquiry",
    campus: "prospect",
    match: [/greenberg/i],
    note: "Amphitheater, dining room, and smaller meeting rooms. Yale Conferences & Events confirms the booking. There is no public live calendar.",
    url: "https://conferencesandevents.yale.edu/managed-venues/greenberg-conference-center",
    linkLabel: "Inquire",
    address: "391 Prospect Street",
  },
  {
    id: "west-conference",
    title: "West Campus Conference Center",
    short: "West Campus",
    kind: "inquiry",
    campus: "west",
    match: [/west campus conference/i],
    note: "From a 10-person video room to the Grace Murray Hopper Auditorium. The study lounge is first come, first served. Rooms are requested, not listed live.",
    url: "https://westcampus.yale.edu/conference-center",
    linkLabel: "Inquire",
    address: "800 West Campus Drive, West Haven",
  },
  {
    id: "divinity",
    title: "Divinity Library",
    short: "Divinity",
    kind: "walkin",
    match: [/divinity library/i],
    directoryTest: /divinity reading/i,
    buildingId: "sterling-divinity-quadrangle",
    note: "Sterling Divinity Quadrangle, 409 Prospect Street. Quiet reading rooms, no live room calendar.",
    address: "409 Prospect Street",
  },
  {
    id: "classics",
    title: "Classics Library",
    short: "Classics",
    kind: "walkin",
    campus: "central",
    match: [/classics library/i],
    directoryTest: /classics library/i,
    buildingId: "phelps-hall",
    note: "Floor 5 of Phelps Hall. A study space for anyone with a current Yale ID.",
    address: "344 College Street",
  },
  {
    id: "sterling",
    title: "Sterling Memorial Library",
    short: "Sterling",
    kind: "live",
    campus: "central",
    match: [/film archive/i, /film study/i, /sterling/i],
    reject: [/law/i, /chemistry/i, /medicine/i, /divinity/i, /power/i],
    directoryTest: /poorvu|sterling open reading/i,
    note: "Library rooms on the live calendar, and the Film Archive on the 7th floor. Poorvu Center classrooms are in this building, at 301 York Street, on a request form.",
    address: "120 High Street",
  },
];

export function norm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bmem\b/g, "memorial")
    .replace(/\blawa\b/g, "law")
    .replace(/\brosenkraz\b/g, "rosenkranz")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function scoreName(query, name) {
  const left = norm(query);
  const right = norm(name);
  if (!left || !right) return 0;
  if (left === right) return 100;
  const queryTokens = new Set(left.split(" ").filter(Boolean));
  const nameTokens = new Set(right.split(" ").filter(Boolean));
  let shared = 0;
  let longest = 0;
  for (const token of queryTokens) {
    if (!nameTokens.has(token)) continue;
    shared += 1;
    if (token.length > longest) longest = token.length;
  }
  if (!shared) return 0;
  let score = (shared / queryTokens.size) * 65 + (shared / nameTokens.size) * 25;
  if (right.includes(left)) score += 20;
  if (left.includes(right) && right.length > 3) score += 15;
  if (longest >= 6) score += 8;
  return score;
}

function meters(a, b) {
  const radius = 6371000;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

function spread(points) {
  let max = 0;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      max = Math.max(max, meters(points[i], points[j]));
    }
  }
  return max;
}

export function fuzzyBuildings(query, buildings) {
  const ranked = buildings
    .map((building) => ({ building, score: scoreName(query, building.name) }))
    .filter((row) => row.score >= 72)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return null;
  const top = ranked[0].score;
  const close = ranked.filter((row) => top - row.score <= 12).map((row) => row.building);
  if (spread(close) > 150) return null;
  return close;
}

export function resolveLocation(locationName, buildings) {
  const text = String(locationName || "");
  if (!text.trim()) return null;
  for (const venue of VENUES) {
    if (venue.reject?.some((pattern) => pattern.test(text))) continue;
    if (venue.match?.some((pattern) => pattern.test(text))) {
      return { venueId: venue.id };
    }
  }
  const hits = fuzzyBuildings(text, buildings);
  if (!hits) return null;
  const ids = [...new Set(hits.map((building) => building.venueId).filter(Boolean))];
  if (ids.length === 1) return { venueId: ids[0], buildings: hits };
  return { venueId: `open-${hits[0].id}`, buildings: hits };
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function pinFor(venueId, buildings) {
  let members = buildings.filter((building) => building.venueId === venueId);
  if (!members.length) {
    const spec = VENUES.find((venue) => venue.id === venueId);
    if (spec?.buildingId) members = buildings.filter((building) => building.id === spec.buildingId);
  }
  if (!members.length) return null;
  return {
    lat: average(members.map((building) => building.lat)),
    lng: average(members.map((building) => building.lng)),
    address: members.find((building) => building.address)?.address || "",
    campus: members[0].campus,
  };
}

function collegeVenues(buildings) {
  const groups = new Map();
  for (const building of buildings) {
    if (building.role !== "college" || !building.venueId) continue;
    const list = groups.get(building.venueId) || [];
    list.push(building);
    groups.set(building.venueId, list);
  }
  return [...groups.values()].map((members) => {
    const primary = members.find((building) => !/south/i.test(building.name)) || members[0];
    return {
      id: primary.venueId,
      title: `${primary.college || primary.name} College`.replace(/ College College$/, " College"),
      short: primary.short || primary.college || primary.name,
      kind: "college",
      campus: primary.campus,
      lat: average(members.map((building) => building.lat)),
      lng: average(members.map((building) => building.lng)),
      address: primary.address,
      note: "Common rooms are real. There is no shared calendar. A student group needs that college's Head of College.",
      rooms: [],
      places: [],
    };
  });
}

function shortName(name) {
  const cleaned = String(name)
    .replace(/\b(library|hall|center|building|memorial)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const text = cleaned || name;
  return text.length > 18 ? `${text.slice(0, 17)}…` : text;
}

export function applyOfficial(buildings, rows) {
  const next = buildings.map((building) => ({ ...building }));
  let moved = 0;
  for (const row of rows || []) {
    const hits = fuzzyBuildings(row.name, next);
    if (!hits) continue;
    for (const hit of hits) {
      if (meters(hit, row) > 500) continue;
      hit.lat = row.lat;
      hit.lng = row.lng;
      hit.official = true;
      moved += 1;
    }
  }
  return { buildings: next, moved };
}

export function readOfficialRows(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : payload?.buildings || payload?.feed || payload?.items || [];
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const lat = Number(row.lat ?? row.latitude ?? row.LATITUDE ?? row.Latitude);
      const lng = Number(
        row.lng ?? row.lon ?? row.longitude ?? row.LONGITUDE ?? row.Longitude,
      );
      const name =
        row.name ||
        row.NAME ||
        row.BUILDING_NAME ||
        row.BuildingName ||
        row.BLDG_NAME ||
        row.title ||
        row.TITLE ||
        row["BUILDING NAME"] ||
        row["HISTORICAL NAME"] ||
        row.historicalName ||
        "";
      if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
      return { name: String(name), lat, lng };
    })
    .filter(Boolean);
}

export function buildScene({ buildings, rooms, places }) {
  const venues = [];
  const byId = new Map();

  for (const spec of VENUES) {
    const pin = pinFor(spec.id, buildings);
    if (!pin) continue;
    const venue = {
      ...spec,
      lat: pin.lat,
      lng: pin.lng,
      address: spec.address || pin.address,
      campus: spec.campus || pin.campus,
      rooms: [],
      places: [],
    };
    venues.push(venue);
    byId.set(spec.id, venue);
  }

  for (const college of collegeVenues(buildings)) {
    venues.push(college);
    byId.set(college.id, college);
  }

  const unplaced = [];
  for (const room of rooms || []) {
    const resolved = resolveLocation(room.location, buildings);
    if (!resolved) {
      unplaced.push(room);
      continue;
    }
    let venue = byId.get(resolved.venueId);
    if (!venue) {
      const members = resolved.buildings || [];
      const member = members[0];
      if (!member) {
        unplaced.push(room);
        continue;
      }
      venue = {
        id: resolved.venueId,
        title: room.location,
        short: shortName(room.location),
        kind: "live",
        campus: member.campus,
        lat: average(members.map((building) => building.lat)),
        lng: average(members.map((building) => building.lng)),
        address: member.address || "",
        note: "",
        rooms: [],
        places: [],
        dynamic: true,
      };
      venues.push(venue);
      byId.set(venue.id, venue);
    }
    venue.rooms.push(room);
  }

  for (const place of places || []) {
    const venue = venues.find((item) => item.directoryTest?.test(place.name));
    if (venue) venue.places.push(place);
  }

  return { venues, unplaced };
}
