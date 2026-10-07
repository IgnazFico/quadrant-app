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

/**
 * Parses a calendar day sent by the client ("YYYY-MM-DD", the user's local
 * date) into the UTC-midnight Date that @db.Date stores verbatim. Returns
 * null unless the string is a real date within ±1 day of the server's UTC
 * date: every timezone (UTC-12..UTC+14) falls inside that window, so this
 * accepts every honest client and rejects arbitrary backfilled days.
 */
export function parseClientDay(s: unknown, now: Date = new Date()): Date | null {
  if (typeof s !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (dayKey(d) !== s) return null; // rejects 2026-02-30 etc.
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.round((d.getTime() - todayUtc) / 86_400_000);
  return Math.abs(diffDays) <= 1 ? d : null;
}

export function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + n));
}

// ---------------------------------------------------------------------------
// Review window (Habit 3: look back as the week ends, then plan the next).
// Pure, UTC-only date math so it behaves the same on any server clock.

/** The user's local calendar date in `timeZone`, as UTC midnight (the @db.Date convention). */
export function todayInTimeZone(now: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

/** Monday (UTC midnight) of a UTC-midnight calendar day. */
export function mondayOf(utcDay: Date): Date {
  return addDays(utcDay, -((utcDay.getUTCDay() + 6) % 7));
}

/** The user's current week: from their timezone when known, else the server clock. */
export function currentWeekFor(now: Date, timeZone: string | null | undefined): Date {
  return timeZone && isValidTimeZone(timeZone)
    ? mondayOf(todayInTimeZone(now, timeZone))
    : startOfWeek(now);
}

/**
 * The week the user may review before the server-side gate counts it as
 * past, or null. The gate (lib/weeklyReviewGate.ts) only sees weeks up to
 * `serverPastWeek` (last week by the server clock), which makes the review
 * *required*. This adds the week that is ending for the user:
 *   - on their Sunday: the current week ("early", the Sunday review)
 *   - ahead of UTC on their Monday morning: last week, which the server
 *     still treats as current for a few hours
 * Offering it never requires it; the gate is unchanged.
 */
export function reviewCandidateWeek(
  now: Date,
  timeZone: string | null | undefined,
  serverPastWeek: Date,
): { week: Date; early: boolean } | null {
  if (!timeZone || !isValidTimeZone(timeZone)) return null;
  const today = todayInTimeZone(now, timeZone);
  const early = today.getUTCDay() === 0;
  const week = early ? mondayOf(today) : addDays(mondayOf(today), -7);
  return week.getTime() > serverPastWeek.getTime() ? { week, early } : null;
}

/**
 * Where a review carries goals: the week after the reviewed one, but never a
 * week that's already over (catching up on an old week carries into the
 * current one). Sunday review of the current week -> next week.
 */
export function carryTargetWeek(reviewedWeek: Date, currentWeek: Date): Date {
  const after = addDays(reviewedWeek, 7);
  return after.getTime() > currentWeek.getTime() ? after : currentWeek;
}

/**
 * Monday of the latest week that has started somewhere on Earth (UTC+14 is
 * the furthest ahead). A goal in a later week hasn't started for anyone, so
 * it can't be done yet.
 */
export function latestStartedWeek(now: Date = new Date()): Date {
  const ahead = new Date(now.getTime() + 14 * 3_600_000);
  return mondayOf(new Date(Date.UTC(ahead.getUTCFullYear(), ahead.getUTCMonth(), ahead.getUTCDate())));
}

// ---------------------------------------------------------------------------
// Patterns month selection (client) and weekday-in-timezone (server)

export type YearMonth = { year: number; month: number }; // month 1..12

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const i = year * 12 + (month - 1) + delta;
  return { year: Math.floor(i / 12), month: (i % 12) + 1 };
}

export function compareMonth(a: YearMonth, b: YearMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

/** Day-of-month (1..7) of the first Monday of a calendar month. Pure calendar math. */
export function firstMondayOfMonth({ year, month }: YearMonth): number {
  const dow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // Sun=0
  return 1 + ((8 - dow) % 7);
}

/**
 * Which month the Patterns page opens on.
 *
 * Patterns count goals and reflections by their week (weekStart), so a new
 * month's cards stay empty until its first week has run and been reviewed.
 * Until then the page opens on the previous month, which is the one still
 * being completed. The switch happens on the month's first Monday + 7 days,
 * the day that first week's review opens (Oct 2026: Oct 1 is a Thursday,
 * first Monday Oct 5, switch Oct 12).
 *
 * `now` is read with LOCAL getters: the user's own calendar decides.
 */
export function patternsDefaultMonth(now: Date = new Date()): {
  current: YearMonth;
  initial: YearMonth;
  fallback: boolean;
  /** Local calendar day the current month takes over (day of `current`). */
  switchDay: number;
} {
  const current = { year: now.getFullYear(), month: now.getMonth() + 1 };
  const switchDay = firstMondayOfMonth(current) + 7;
  const fallback = now.getDate() < switchDay;
  return { current, initial: fallback ? shiftMonth(current, -1) : current, fallback, switchDay };
}

/** True if `tz` is an IANA zone this runtime understands (e.g. "Asia/Bangkok"). */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * Weekday (Sun=0..Sat=6) of an instant as seen in `timeZone`. Use instead of
 * getUTCDay() for anything the user experiences as "the day it happened":
 * at UTC+7, 00:00-06:59 local is still the previous day in UTC.
 */
export function weekdayInTimeZone(d: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(d);
  return WEEKDAY_INDEX[name];
}
