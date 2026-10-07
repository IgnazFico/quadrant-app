// Unit checks for the Patterns month default + switch dates and the timezone
// weekday. Pure date logic, no database.
//   npx tsx scripts/verify-patterns-month.ts
import { cardMonth, shouldSplit } from "../lib/patternsSplit";
import {
  compareMonth,
  firstMondayOfMonth,
  isValidTimeZone,
  patternsDefaultMonth,
  shiftMonth,
  weekdayInTimeZone,
} from "../lib/week";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
};
const ym = (m: { year: number; month: number }) => `${m.year}-${String(m.month).padStart(2, "0")}`;
// Local-time constructor: patternsDefaultMonth reads local getters, so these
// cases hold in any TZ the test runs in.
const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

// --- first Monday / switch day ------------------------------------------
check("Oct 2026 first Monday is the 5th", firstMondayOfMonth({ year: 2026, month: 10 }) === 5);
check("Nov 2026 first Monday is the 2nd", firstMondayOfMonth({ year: 2026, month: 11 }) === 2);
check("Dec 2026 first Monday is the 7th", firstMondayOfMonth({ year: 2026, month: 12 }) === 7);
check("Jun 2026 starts on a Monday -> 1st", firstMondayOfMonth({ year: 2026, month: 6 }) === 1);
check("Feb 2027 first Monday is the 1st", firstMondayOfMonth({ year: 2027, month: 2 }) === 1);

// --- default month -------------------------------------------------------
const cases: [string, Date, string, boolean, number][] = [
  ["Oct 1 -> September (fallback)", local(2026, 10, 1), "2026-09", true, 12],
  ["Oct 6 (today) -> September", local(2026, 10, 6), "2026-09", true, 12],
  ["Oct 11 23:59 -> still September", local(2026, 10, 11, 23), "2026-09", true, 12],
  ["Oct 12 00:00 -> October", local(2026, 10, 12, 0), "2026-10", false, 12],
  ["Oct 31 -> October", local(2026, 10, 31), "2026-10", false, 12],
  ["Nov 8 -> October", local(2026, 11, 8), "2026-10", true, 9],
  ["Nov 9 -> November", local(2026, 11, 9), "2026-11", false, 9],
  ["Dec 13 -> November", local(2026, 12, 13), "2026-11", true, 14],
  ["Jan 1 2027 -> December 2026 (year rollover)", local(2027, 1, 1), "2026-12", true, 11],
  ["Jan 11 2027 -> January 2027", local(2027, 1, 11), "2027-01", false, 11],
  ["Jun 7 2026 (month starts Monday) -> May", local(2026, 6, 7), "2026-05", true, 8],
  ["Jun 8 2026 -> June", local(2026, 6, 8), "2026-06", false, 8],
];
for (const [name, now, want, fb, sw] of cases) {
  const r = patternsDefaultMonth(now);
  check(name, ym(r.initial) === want && r.fallback === fb && r.switchDay === sw,
    `got ${ym(r.initial)} fallback=${r.fallback} switchDay=${r.switchDay}`);
}
// Fallback window is always 8..14 days long.
for (let m = 1; m <= 24; m++) {
  const t = shiftMonth({ year: 2026, month: 1 }, m - 1);
  const sw = patternsDefaultMonth(local(t.year, t.month, 1)).switchDay;
  if (sw < 8 || sw > 14) check(`switch day in 8..14 for ${ym(t)}`, false, String(sw));
}
check("switch day always within the 8..14 range (24 months)", true);

// --- month arithmetic ----------------------------------------------------
check("shiftMonth Jan -1 -> Dec previous year", ym(shiftMonth({ year: 2027, month: 1 }, -1)) === "2026-12");
check("shiftMonth Dec +1 -> Jan next year", ym(shiftMonth({ year: 2026, month: 12 }, 1)) === "2027-01");
check("shiftMonth -11 from Oct 2026 -> Nov 2025", ym(shiftMonth({ year: 2026, month: 10 }, -11)) === "2025-11");
check("compareMonth ordering", compareMonth({ year: 2026, month: 9 }, { year: 2026, month: 10 }) < 0 &&
  compareMonth({ year: 2027, month: 1 }, { year: 2026, month: 12 }) > 0);

// --- weekday in timezone (the Rhythm UTC fix) -----------------------------
// Oct 1 2026 is a Thursday. 18:30Z Thursday = Friday 01:30 in Bangkok (UTC+7).
const late = new Date("2026-10-01T18:30:00Z");
check("UTC weekday of Thu 18:30Z is Thursday", weekdayInTimeZone(late, "UTC") === 4);
check("same instant in Bangkok is Friday", weekdayInTimeZone(late, "Asia/Bangkok") === 5);
check("same instant in New York is Thursday", weekdayInTimeZone(late, "America/New_York") === 4);
const early = new Date("2026-10-02T02:00:00Z"); // Fri 02:00Z = Thu 22:00 in New York
check("Fri 02:00Z in New York is Thursday", weekdayInTimeZone(early, "America/New_York") === 4);

check("valid tz accepted", isValidTimeZone("Asia/Bangkok") && isValidTimeZone("UTC"));
check("bogus tz rejected", !isValidTimeZone("Mars/Olympus") && !isValidTimeZone("") && !isValidTimeZone(null));

// --- split rule (lib/patternsSplit.ts) -------------------------------------
check("split: in window + previous has goals", shouldSplit(true, 3) === true);
check("split skipped: previous month has 0 goals", shouldSplit(true, 0) === false);
check("split skipped: previous missing/failed", shouldSplit(true, null) === false && shouldSplit(true, undefined) === false);
check("split skipped: outside window even with goals", shouldSplit(false, 9) === false);
check("split: rhythm/balance/honesty -> previous",
  (["rhythm", "balance", "honesty"] as const).every((id) => cardMonth(id, true) === "previous"));
check("split: presence/style -> current", (["presence", "style"] as const).every((id) => cardMonth(id, true) === "current"));
check("no split: every card -> current",
  (["rhythm", "presence", "balance", "style", "honesty"] as const).every((id) => cardMonth(id, false) === "current"));

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
