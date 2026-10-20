/**
 * Pure helpers for the phone layout of /schedule (a week strip plus one
 * day's timeline). No React, no network, no dates read from the clock:
 * the caller passes "now" in, so every rule here is testable.
 *
 * Day keys are the YYYY-MM-DD strings produced by dayKey()/toDateKey()
 * in lib/week.ts. Days of the visible week are UTC-midnight Dates.
 */

/** The day the page opens on: today when it is in the visible week,
 *  otherwise the first day (Monday of next week). */
export function defaultSelectedKey(dayKeys: string[], todayKey: string): string {
  return dayKeys.includes(todayKey) ? todayKey : dayKeys[0];
}

/** Keep `selected` if it is one of the visible days, else the default.
 *  Switching This week / Next week changes the keys, so a stale
 *  selection falls back to the default without any effect or reset. */
export function resolveSelectedKey(
  selected: string | null,
  dayKeys: string[],
  todayKey: string,
): string {
  return selected && dayKeys.includes(selected)
    ? selected
    : defaultSelectedKey(dayKeys, todayKey);
}

/** Hour shown when the user has no reason to look anywhere else. */
export const EMPTY_DAY_OPENING_HOUR = 7;

/**
 * The hour that sits at the top of the timeline when a day opens.
 *  - today: one hour before now, so the current hour has context above it
 *  - another day: one hour before its first timed block
 *  - another day with no blocks: 7 AM
 * Always clamped to the hours the page shows.
 */
export function openingHour(o: {
  isToday: boolean;
  nowHour: number;
  firstBlockHour: number | null;
  firstHour: number;
  lastHour: number;
}): number {
  const clamp = (h: number) => Math.min(o.lastHour, Math.max(o.firstHour, h));
  if (o.isToday) return clamp(o.nowHour - 1);
  if (o.firstBlockHour !== null) return clamp(o.firstBlockHour - 1);
  return clamp(EMPTY_DAY_OPENING_HOUR);
}

/** Hours of the page that have no timed block yet (a block can only be
 *  added to a free hour: tapping a taken hour edits that block). */
export function freeHours(hours: number[], takenHours: number[]): number[] {
  const taken = new Set(takenHours);
  return hours.filter((h) => !taken.has(h));
}

/** Hour the "Add on <day>" action starts on: the first free hour at or
 *  after one hour below the top of the opening view, else the first free
 *  hour, else null when the day is full. */
export function defaultAddHour(free: number[], opening: number): number | null {
  if (free.length === 0) return null;
  return free.find((h) => h >= opening + 1) ?? free[0];
}

/** First `max` distinct values, order kept (role colour dots under a day). */
export function distinctFirst<T>(values: T[], max: number): T[] {
  const out: T[] = [];
  for (const v of values) {
    if (!out.includes(v)) out.push(v);
    if (out.length === max) break;
  }
  return out;
}

/** "Oct 20" for a UTC-midnight day, the same on every device timezone. */
export function fmtMonthDay(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** "Tuesday, October 20" for screen readers and the sheet. */
export function fmtLongDay(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
