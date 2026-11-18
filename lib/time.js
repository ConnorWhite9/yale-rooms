const ZONE = "America/New_York";

export function nowInNewYork(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type).value;
  let hour = get("hour");
  if (hour === "24") hour = "00";
  const day = `${get("year")}-${get("month")}-${get("day")}`;
  const time = `${hour}:${get("minute")}:${get("second")}`;
  return { day, time, stamp: `${day} ${time}` };
}

export function nextDay(ymd) {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function minutesBetween(start, end) {
  return Math.round((civilMinutes(end) - civilMinutes(start)) / 1);
}

function civilMinutes(stamp) {
  const [day, time] = stamp.split(" ");
  const [year, month, date] = day.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  return Date.UTC(year, month - 1, date, hour, minute, second) / 60000;
}

export function addMinutes(stamp, minutes) {
  const total = civilMinutes(stamp) + minutes;
  const date = new Date(total * 60000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

export function formatClock(stamp) {
  if (!stamp) return "";
  const [, time] = stamp.split(" ");
  let [hour, minute] = time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  if (minute === 0) return `${hour} ${suffix}`;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}
