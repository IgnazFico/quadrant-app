import { test, expect } from "@playwright/test";
import {
  EMPTY_DAY_OPENING_HOUR,
  defaultAddHour,
  defaultSelectedKey,
  distinctFirst,
  fmtLongDay,
  fmtMonthDay,
  freeHours,
  openingHour,
  resolveSelectedKey,
} from "../lib/scheduleDayView";

/**
 * Rules behind the phone layout of /schedule (WO-015). Pure functions: no
 * browser, no backend, so this runs in the smoke project on every PR.
 */
const WEEK = [
  "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22",
  "2026-10-23", "2026-10-24", "2026-10-25",
];
const NEXT = [
  "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29",
  "2026-10-30", "2026-10-31", "2026-11-01",
];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6..21, as the page

test.describe("schedule day view rules", () => {
  test("opens on today when today is in the week, else on the first day", () => {
    expect(defaultSelectedKey(WEEK, "2026-10-20")).toBe("2026-10-20");
    expect(defaultSelectedKey(NEXT, "2026-10-20")).toBe("2026-10-26");
    expect(defaultSelectedKey(WEEK, "2026-10-19")).toBe("2026-10-19");
    expect(defaultSelectedKey(WEEK, "2026-10-25")).toBe("2026-10-25");
  });

  test("a chosen day is kept; a day of another week falls back to the default", () => {
    expect(resolveSelectedKey("2026-10-23", WEEK, "2026-10-20")).toBe("2026-10-23");
    // user picked Friday this week, then switched to Next week
    expect(resolveSelectedKey("2026-10-23", NEXT, "2026-10-20")).toBe("2026-10-26");
    // and back: this week opens on today again
    expect(resolveSelectedKey("2026-10-27", WEEK, "2026-10-20")).toBe("2026-10-20");
    expect(resolveSelectedKey(null, WEEK, "2026-10-20")).toBe("2026-10-20");
  });

  test("today opens one hour before now, clamped to the hours shown", () => {
    const base = { isToday: true, firstBlockHour: 8, firstHour: 6, lastHour: 21 };
    expect(openingHour({ ...base, nowHour: 13 })).toBe(12);
    expect(openingHour({ ...base, nowHour: 6 })).toBe(6);
    expect(openingHour({ ...base, nowHour: 3 })).toBe(6); // before the first hour
    expect(openingHour({ ...base, nowHour: 23 })).toBe(21); // after the last hour
    expect(openingHour({ ...base, nowHour: 7, firstBlockHour: null })).toBe(6);
  });

  test("another day opens one hour before its first block, else 7 AM", () => {
    const base = { isToday: false, nowHour: 13, firstHour: 6, lastHour: 21 };
    expect(openingHour({ ...base, firstBlockHour: 9 })).toBe(8);
    expect(openingHour({ ...base, firstBlockHour: 6 })).toBe(6);
    expect(openingHour({ ...base, firstBlockHour: 21 })).toBe(20);
    expect(openingHour({ ...base, firstBlockHour: null })).toBe(EMPTY_DAY_OPENING_HOUR);
    expect(EMPTY_DAY_OPENING_HOUR).toBe(7);
  });

  test("free hours drop taken hours and never invent one", () => {
    expect(freeHours(HOURS, [])).toEqual(HOURS);
    expect(freeHours(HOURS, [8, 9, 21])).toEqual(HOURS.filter((h) => ![8, 9, 21].includes(h)));
    expect(freeHours(HOURS, [99])).toEqual(HOURS); // outside the page: ignored
    expect(freeHours(HOURS, HOURS)).toEqual([]);
  });

  test("the add action starts on the first free hour below the opening view", () => {
    expect(defaultAddHour(HOURS, 12)).toBe(13);
    expect(defaultAddHour(freeHours(HOURS, [13, 14]), 12)).toBe(15);
    expect(defaultAddHour([6, 7], 12)).toBe(6); // nothing later: first free hour
    expect(defaultAddHour(HOURS, 21)).toBe(6); // opening at the last hour wraps to first free
    expect(defaultAddHour([], 12)).toBeNull(); // full day
  });

  test("role dots: distinct, ordered, capped", () => {
    expect(distinctFirst(["a", "b", "a", "c", "d"], 3)).toEqual(["a", "b", "c"]);
    expect(distinctFirst(["a", "a"], 3)).toEqual(["a"]);
    expect(distinctFirst([], 3)).toEqual([]);
  });

  test("day labels do not depend on the device timezone", () => {
    const d = new Date(Date.UTC(2026, 9, 20)); // Tue Oct 20, UTC midnight
    expect(fmtMonthDay(d)).toBe("Oct 20");
    expect(fmtLongDay(d)).toBe("Tuesday, October 20");
    const sun = new Date(Date.UTC(2026, 9, 25));
    expect(fmtLongDay(sun)).toBe("Sunday, October 25");
  });
});
