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

export function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + n));
}
