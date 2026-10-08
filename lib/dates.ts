/**
 * Date helpers that work on plain YYYY-MM-DD strings, so the server and the browser
 * always agree regardless of the process time zone (Docker runs in UTC).
 * "today" is computed for the viewer's time zone (sent by the browser in a cookie).
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function isValidTimeZone(tz: string | undefined | null): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Today's date as YYYY-MM-DD in the given IANA time zone (defaults to the process zone). */
export function todayIso(timeZone?: string | null, now: Date = new Date()) {
  const tz = isValidTimeZone(timeZone) ? timeZone : undefined;
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Local calendar date of a Date object, as YYYY-MM-DD (used for date pickers). */
export function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parse YYYY-MM-DD into a local-midnight Date (for date pickers only). */
export function fromIsoDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const toUtcDays = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

export function addDaysIso(iso: string, days: number) {
  return new Date((toUtcDays(iso) + days) * 86_400_000).toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string) {
  return Math.round(toUtcDays(toIso) - toUtcDays(fromIso));
}

export function formatDue(iso: string, today: string) {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  const [y, m, d] = iso.split("-").map(Number);
  const label = `${MONTHS[m - 1]} ${d}`;
  return y === Number(today.slice(0, 4)) ? label : `${label}, ${y}`;
}

export function isOverdue(iso: string | null, completed: boolean, today: string) {
  return !!iso && !completed && iso < today;
}

export function formatRelative(isoDateTime: string, now: number = Date.now()) {
  const d = new Date(isoDateTime);
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
