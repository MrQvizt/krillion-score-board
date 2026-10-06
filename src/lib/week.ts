/**
 * Date helpers. Krillion's daily puzzle resets at 00:00 UTC, so every "day"
 * in this app is a UTC calendar date written as YYYY-MM-DD.
 */

const DAY_MS = 86_400_000;

export function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function isValidDateString(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseDate(s);
  return !Number.isNaN(d.getTime()) && toDateString(d) === s;
}

export function todayUtc(now: Date = new Date()): string {
  return toDateString(now);
}

export function addDays(s: string, n: number): string {
  return toDateString(new Date(parseDate(s).getTime() + n * DAY_MS));
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / DAY_MS);
}

/** Monday of the ISO week containing the date. */
export function weekStart(s: string): string {
  const d = parseDate(s);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return toDateString(new Date(d.getTime() - dow * DAY_MS));
}

export function weekEnd(start: string): string {
  return addDays(start, 6);
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function isInWeek(date: string, start: string): boolean {
  return date >= start && date <= weekEnd(start);
}

/** ISO 8601 week number for a date. */
export function isoWeekNumber(s: string): number {
  const d = parseDate(s);
  const thursday = new Date(d.getTime() + (3 - ((d.getUTCDay() + 6) % 7)) * DAY_MS);
  const jan1 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  return 1 + Math.round((thursday.getTime() - jan1.getTime()) / DAY_MS / 7);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function formatShort(s: string): string {
  const d = parseDate(s);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function formatLong(s: string): string {
  const d = parseDate(s);
  return `${WEEKDAYS[(d.getUTCDay() + 6) % 7]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** e.g. "Thu 8 Oct" */
export function formatDayMonth(s: string): string {
  const d = parseDate(s);
  return `${WEEKDAYS[(d.getUTCDay() + 6) % 7]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function weekdayShort(s: string): string {
  return WEEKDAYS[(parseDate(s).getUTCDay() + 6) % 7];
}

/** e.g. "Week 41 · 6 – 12 Oct 2026" */
export function weekLabel(start: string): string {
  const end = weekEnd(start);
  const a = parseDate(start);
  const b = parseDate(end);
  const range =
    a.getUTCMonth() === b.getUTCMonth()
      ? `${a.getUTCDate()} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`
      : `${formatShort(start)} – ${formatShort(end)} ${b.getUTCFullYear()}`;
  return `Week ${isoWeekNumber(start)} · ${range}`;
}
