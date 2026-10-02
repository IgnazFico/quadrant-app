/** Returns the calendar date (UTC midnight) of the given date's local midnight.
 *  Use this for any date that will be stored to the DB (@db.Date) so that
 *  the UTC date component matches the intended local calendar date. */
export function startOfDay(d: Date = new Date()): Date {
  const date = new Date(d);
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

/** Returns UTC midnight of the Monday for the given date's week. */
export function startOfWeek(d: Date = new Date()): Date {
  const ms = startOfDay(d);
  const date = new Date(ms);
  const dow = (date.getUTCDay() + 6) % 7; // Mon = 0 … Sun = 6
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - dow));
}

/** Returns YYYY-MM-DD using UTC components (matches @db.Date storage). */
export function dayKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Returns YYYY-MM-DD in the local timezone (not UTC). */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Prisma filter matching every stored date inside d's week (Mon..Sun).
 * Use for week lookups that must agree with a gate or count which found a
 * goal by its raw weekStart: an equality match on startOfWeek() silently
 * misses a row stored on any other day, and range matching cannot.
 */
export function weekRange(d: Date): { gte: Date; lt: Date } {
  const monday = startOfWeek(d);
  return { gte: monday, lt: addDays(monday, 7) };
}

/**
 * Parses a calendar day sent by the client ("YYYY-MM-DD", from dayKey())
 * into the UTC-midnight Date stored in @db.Date columns. Parsed directly
 * instead of via startOfDay(new Date(s)): `new Date("YYYY-MM-DD")` is UTC
 * midnight, and startOfDay reads local fields, so on a server west of UTC
 * that round-trip lands on the previous day. Other ISO strings fall back
 * to startOfDay.
 */
export function parseDayKey(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return startOfDay(new Date(s));
}

export function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + n));
}
