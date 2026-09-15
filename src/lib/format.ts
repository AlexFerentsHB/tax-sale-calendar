import type { AuctionEvent } from "./types";

export function dayKey(startDate: string | null): string {
  return (startDate ?? "").slice(0, 10);
}

/** Parse a "YYYY-MM-DD HH:MM:SS" wall-time string treating it as UTC so we can
 *  re-render it inside the event's own timezone. */
function wallDate(startDate: string | null): Date | null {
  if (!startDate) return null;
  const d = new Date(startDate.replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? null : d;
}

const DAY_FMT = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const TIME_FMT = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const MONTH_FMT = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

export function formatDayHeader(key: string): string {
  const d = new Date(key + "T00:00:00Z");
  if (isNaN(d.getTime())) return key;
  return DAY_FMT.format(d);
}

export function formatTime(startDate: string | null, timezone: string | null): string | null {
  const d = wallDate(startDate);
  if (!d) return null;
  try {
    if (timezone) {
      return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(d);
    }
    return TIME_FMT.format(d);
  } catch {
    return null;
  }
}

export function formatFull(startDate: string | null, timezone: string | null): string {
  const d = wallDate(startDate);
  if (!d) return (startDate ?? "").slice(0, 10);
  const date = DAY_FMT.format(d);
  const time = formatTime(startDate, timezone);
  return time ? `${date} · ${time}` : date;
}

export function formatMonth(monthKey: string): string {
  const d = new Date(monthKey + "-01T00:00:00Z");
  if (isNaN(d.getTime())) return monthKey;
  return MONTH_FMT.format(d);
}

export function relativeDay(key: string, nowMs = Date.now()): string {
  const today = new Date(nowMs);
  const d = new Date(key + "T00:00:00Z");
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1) return `In ${diff} days`;
  if (diff === -1) return "Yesterday";
  return `${Math.abs(diff)} days ago`;
}

export function lastSyncedLabel(iso: string | undefined): string {
  if (!iso) return "Not synced yet";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Unknown";
  const rel = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diffMs = d.getTime() - Date.now();
  const mins = Math.round(diffMs / 60000);
  if (Math.abs(mins) < 60) return `Synced ${rel.format(mins, "minute")}`;
  const hrs = Math.round(mins / 60);
  if (Math.abs(hrs) < 24) return `Synced ${rel.format(hrs, "hour")}`;
  return `Synced ${rel.format(Math.round(hrs / 24), "day")}`;
}

export function typeClasses(type: string | null): { badge: string; dot: string } {
  switch (type) {
    case "Redeemable Deed":
      return { badge: "bg-emerald-500/12 text-emerald-500 border-emerald-500/25", dot: "bg-emerald-400" };
    case "Tax Deed":
      return { badge: "bg-amber-500/12 text-amber-500 border-amber-500/25", dot: "bg-amber-400" };
    case "Tax Lien":
      return { badge: "bg-sky-500/12 text-sky-500 border-sky-500/25", dot: "bg-sky-400" };
    default:
      return { badge: "bg-zinc-500/12 text-zinc-400 border-zinc-500/25", dot: "bg-zinc-400" };
  }
}

export function toICS(events: AuctionEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tax Sale Calendar//EN",
    "CALSCALE:GREGORIAN",
  ];
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "").slice(0, 15) + "Z";
  for (const e of events) {
    const start = (e.startDate ?? "").replace(/[-: ]/g, "").slice(0, 13);
    const tz = e.timezone ? `TZID=${e.timezone}:` : "";
    lines.push(
      "BEGIN:VEVENT",
      `UID:taxsale-${e.id}@taxsale.app`,
      `DTSTAMP:${now}`,
      `DTSTART;${tz}${start}`,
      `SUMMARY:${escapeICS(e.title)}`,
      e.county ? `LOCATION:${escapeICS(e.county)} County` : "LOCATION:",
      e.url ? `URL;VALUE=URI:${e.url}` : "",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.filter((l) => l !== undefined).join("\r\n");
}

function escapeICS(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function toCSV(events: AuctionEvent[]): string {
  const header = ["id", "title", "county", "state", "type", "startDate", "timezone", "url", "summary"];
  const rows = events.map((e) =>
    [e.id, e.title, e.county ?? "", e.state ?? "", e.type ?? "", e.startDate ?? "", e.timezone ?? "", e.url, e.blurb]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function stateCodeToName(code: string | null): string | null {
  return code ?? null;
}