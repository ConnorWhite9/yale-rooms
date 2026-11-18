import { pace } from "./pace.js";

const USER_AGENT = "yale-rooms/0.1 (hackathon room finder)";

export async function fetchText(url) {
  return pace(async () => {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    });
    if (!response.ok) {
      throw new Error(`${response.status} for ${url}`);
    }
    return response.text();
  });
}

export async function fetchGrid(lid, gid, start, end) {
  const body = new URLSearchParams({
    lid: String(lid),
    gid: String(gid),
    eid: "0",
    seat: "0",
    seatId: "0",
    zone: "0",
    start,
    end,
    pageIndex: "0",
    pageSize: "100",
  });
  return pace(async () => {
    console.log(`libcal grid ${lid}/${gid} ${start}`);
    const response = await fetch("https://schedule.yale.edu/spaces/availability/grid", {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `https://schedule.yale.edu/spaces?lid=${lid}&gid=${gid}`,
      },
      body,
    });
    if (!response.ok) {
      throw new Error(`availability ${lid}/${gid} returned ${response.status}`);
    }
    return response.json();
  });
}

export function parseSelects(html) {
  const selects = [];
  const pattern = /<select\b([^>]*)>([\s\S]*?)<\/select>/gi;
  for (const match of html.matchAll(pattern)) {
    const options = [];
    const optionPattern = /<option\b([^>]*)>([\s\S]*?)<\/option>/gi;
    for (const option of match[2].matchAll(optionPattern)) {
      const value = /value="([^"]*)"/.exec(option[1]);
      options.push({
        value: value ? value[1] : "",
        label: decode(option[2].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim(),
      });
    }
    selects.push(options);
  }
  return selects;
}

export function parseRooms(html) {
  const rooms = [];
  const pattern = /resources\.push\(\{([\s\S]*?)\}\);/g;
  for (const match of html.matchAll(pattern)) {
    const block = match[1];
    const id = numberField(block, "eid");
    const title = stringField(block, "title");
    if (!id || !title) continue;
    const capacity = numberField(block, "capacity");
    const thumbnail = stringField(block, "thumbnail");
    rooms.push({
      id,
      name: title.replace(/\s*\(Capacity\s+\d+\)\s*$/i, "").trim(),
      capacity: capacity ?? 0,
      gid: numberField(block, "gid"),
      lid: numberField(block, "lid"),
      image: thumbnail ? `https:${thumbnail.replace(/^https?:/, "")}` : "",
      bookUrl: `https://schedule.yale.edu/space/${id}`,
    });
  }
  return rooms;
}

function stringField(block, name) {
  const match = block.match(new RegExp(`${name}:\\s*"((?:\\\\.|[^"\\\\])*)"`));
  if (!match) return "";
  return JSON.parse(`"${match[1]}"`);
}

function numberField(block, name) {
  const match = block.match(new RegExp(`${name}:\\s*(-?\\d+)`));
  return match ? Number(match[1]) : null;
}

function decode(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"');
}
