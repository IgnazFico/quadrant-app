import { test, expect } from "@playwright/test";
import { isRecapWindowOpen, isRecapWindowOpenOnServer } from "../lib/yearRecapWindow";

/**
 * WO-033 (D-039 C): the one window function, Dec 20 to Dec 31 inclusive.
 * The server reads it in Asia/Jakarta; the browser callers (Profile button,
 * recap prompt) still read the device's own calendar. No server or login
 * needed, so this file also runs in the CI "smoke" project.
 * The running-server checks are in year-review-guard.spec.ts.
 */
test.describe("window rule, server (Asia/Jakarta)", () => {
  const cases: [string, string, boolean][] = [
    ["Dec 19 23:59 WIB", "2026-12-19T23:59:00+07:00", false],
    ["Dec 20 00:00 WIB", "2026-12-20T00:00:00+07:00", true],
    ["Dec 31 23:59 WIB", "2026-12-31T23:59:00+07:00", true],
    ["Jan 1 00:00 WIB", "2027-01-01T00:00:00+07:00", false],
    ["Dec 19 16:59:59 UTC (= Dec 19 23:59:59 WIB)", "2026-12-19T16:59:59Z", false],
    ["Dec 19 17:00:00 UTC (= Dec 20 00:00:00 WIB)", "2026-12-19T17:00:00Z", true],
    ["Dec 31 16:59:59 UTC (= Dec 31 23:59:59 WIB)", "2026-12-31T16:59:59Z", true],
    ["Dec 31 17:00:00 UTC (= Jan 1 00:00:00 WIB)", "2026-12-31T17:00:00Z", false],
    ["Oct 27", "2026-10-27T12:00:00+07:00", false],
    ["Nov 30 23:59 WIB", "2026-11-30T23:59:00+07:00", false],
    ["Feb 29 2028 (leap day)", "2028-02-29T12:00:00+07:00", false],
  ];
  for (const [label, iso, expected] of cases) {
    test(`${label} -> ${expected ? "open" : "closed"}`, () => {
      expect(isRecapWindowOpenOnServer(new Date(iso))).toBe(expected);
      expect(isRecapWindowOpen(new Date(iso), "Asia/Jakarta")).toBe(expected);
    });
  }
});

test.describe("window rule, browser callers unchanged (device calendar)", () => {
  // Built from local parts, so the result does not depend on the machine's zone.
  const cases: [string, Date, boolean][] = [
    ["local Dec 19 23:59", new Date(2026, 11, 19, 23, 59), false],
    ["local Dec 20 00:00", new Date(2026, 11, 20, 0, 0), true],
    ["local Dec 31 23:59", new Date(2026, 11, 31, 23, 59), true],
    ["local Jan 1 00:00", new Date(2027, 0, 1, 0, 0), false],
    ["local Nov 25", new Date(2026, 10, 25), false],
  ];
  for (const [label, date, expected] of cases) {
    test(`${label} -> ${expected ? "open" : "closed"}`, () => {
      expect(isRecapWindowOpen(date)).toBe(expected);
    });
  }
});
