// Unit checks for the Sunday review window and next-week planning date math.
// Pure date logic, no database.
//   npx tsx scripts/verify-review-window.ts
import {
  addDays,
  carryTargetWeek,
  currentWeekFor,
  dayKey,
  latestStartedWeek,
  reviewCandidateWeek,
  startOfWeek,
  todayInTimeZone,
} from "../lib/week";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
};
const d = (iso: string) => new Date(iso);
const day = (s: string) => new Date(`${s}T00:00:00.000Z`);
const key = (x: Date | null | undefined) => (x ? dayKey(x) : "null");

// Server clock is UTC on Vercel; these instants are UTC.
// Week of Mon Oct 5 – Sun Oct 11 2026.
const serverPast = (now: Date) => addDays(startOfWeek(now), -7);

// --- todayInTimeZone ------------------------------------------------------
check("Bangkok Sun 01:00 local = Sat 18:00 UTC", key(todayInTimeZone(d("2026-10-10T18:00:00Z"), "Asia/Bangkok")) === "2026-10-11");
check("New York Sat 23:00 local = Sun 03:00 UTC", key(todayInTimeZone(d("2026-10-11T03:00:00Z"), "America/New_York")) === "2026-10-10");

// --- reviewCandidateWeek: early Sunday review --------------------------------
// The server's startOfWeek() reads LOCAL getters; these cases assume the
// script runs in a TZ where the instants below fall in the same server week
// (true for UTC and UTC+7, which is where this runs).
{
  const now = d("2026-10-11T05:00:00Z"); // Sun Oct 11: 12:00 Bangkok, 01:00 New York
  const bkk = reviewCandidateWeek(now, "Asia/Bangkok", serverPast(now));
  check("Bangkok on Sunday -> current week, early", key(bkk?.week) === "2026-10-05" && bkk?.early === true, `${key(bkk?.week)} early=${bkk?.early}`);
  const ny = reviewCandidateWeek(now, "America/New_York", serverPast(now));
  check("New York on Sunday -> current week, early", key(ny?.week) === "2026-10-05" && ny?.early === true, `${key(ny?.week)} early=${ny?.early}`);
}
{
  const now = d("2026-10-08T05:00:00Z"); // Thursday everywhere
  check("Thursday -> no candidate", reviewCandidateWeek(now, "Asia/Bangkok", serverPast(now)) === null);
}
{
  const now = d("2026-10-10T05:00:00Z"); // Saturday everywhere
  check("Saturday -> no candidate", reviewCandidateWeek(now, "Asia/Bangkok", serverPast(now)) === null);
}
check("no timezone -> no candidate", reviewCandidateWeek(d("2026-10-11T05:00:00Z"), null, day("2026-09-28")) === null);
check("invalid timezone -> no candidate", reviewCandidateWeek(d("2026-10-11T05:00:00Z"), "Mars/Base", day("2026-09-28")) === null);
{
  // Monday 03:00 in Bangkok, still Sunday 20:00 UTC: the server thinks the
  // week is current, so the user's just-ended week is offered (not early).
  const now = d("2026-10-11T20:00:00Z");
  const past = day("2026-09-28"); // server (UTC) last week while it's still Sun Oct 11 UTC
  const c = reviewCandidateWeek(now, "Asia/Bangkok", past);
  check("Bangkok Monday morning ahead of UTC -> ended week, not early", key(c?.week) === "2026-10-05" && c?.early === false, `${key(c?.week)} early=${c?.early}`);
}
{
  // Monday once the server agrees: the gate covers it, no extra candidate.
  const now = d("2026-10-12T10:00:00Z");
  const c = reviewCandidateWeek(now, "Asia/Bangkok", day("2026-10-05"));
  check("Monday after UTC catches up -> gate's job, no candidate", c === null);
}

// --- carryTargetWeek ---------------------------------------------------------
const cur = day("2026-10-05");
check("Sunday review of current week carries into next week", key(carryTargetWeek(cur, cur)) === "2026-10-12");
check("Monday review of last week carries into current week", key(carryTargetWeek(day("2026-09-28"), cur)) === "2026-10-05");
check("late review of an old week carries into current, not the past", key(carryTargetWeek(day("2026-09-07"), cur)) === "2026-10-05");

// --- currentWeekFor ---------------------------------------------------------
check("currentWeekFor Bangkok Mon 03:00 (Sun UTC) -> new week", key(currentWeekFor(d("2026-10-11T20:00:00Z"), "Asia/Bangkok")) === "2026-10-12");

// --- latestStartedWeek (done-guard) ----------------------------------------
check("Wed: next week hasn't started anywhere", key(latestStartedWeek(d("2026-10-07T12:00:00Z"))) === "2026-10-05");
check("Sun 11:00 UTC: Kiribati (UTC+14) is already Monday", key(latestStartedWeek(d("2026-10-11T11:00:00Z"))) === "2026-10-12");
check("Sun 09:00 UTC: nobody is in Monday yet", key(latestStartedWeek(d("2026-10-11T09:00:00Z"))) === "2026-10-05");

console.log(failures ? `\n${failures} FAILED` : "\nall passed");
process.exit(failures ? 1 : 0);
