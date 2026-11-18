import { readFileSync } from "node:fs";

let result = null;

export async function buildingsStatus() {
  if (result) return result;
  const apiKey = readKey();
  if (!apiKey) {
    result = { ok: false, reason: "missing key" };
    return result;
  }
  const url = new URL("https://gw.its.yale.edu/soa-gateway/buildings/v2/feed");
  url.searchParams.set("type", "json");
  url.searchParams.set("apikey", apiKey);
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const text = await response.text();
    if (!response.ok || text.includes("Invalid API Key")) {
      result = { ok: false, reason: "gateway rejected the API key" };
      return result;
    }
    const payload = JSON.parse(text);
    const count = Array.isArray(payload) ? payload.length : Object.keys(payload).length;
    result = { ok: true, count };
    return result;
  } catch (error) {
    result = { ok: false, reason: error.message };
    return result;
  }
}

function readKey() {
  try {
    const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.startsWith("YALE_API_KEY=")) continue;
      return trimmed.slice("YALE_API_KEY=".length).replace(/^"|"$/g, "");
    }
  } catch {
    return "";
  }
  return "";
}
