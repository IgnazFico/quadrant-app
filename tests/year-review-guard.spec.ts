import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { loginAsSeededUser } from "./helpers/auth";
import { isRecapWindowOpenOnServer } from "../lib/yearRecapWindow";

/**
 * WO-033 (D-039 C): /year-review and /api/year-review answer only from
 * Dec 20 to Dec 31 (Asia/Jakarta, SERVER clock). Outside it the page shows the
 * "Opens December 20." screen and the API returns 403 RECAP_WINDOW_CLOSED with
 * no ceremony data.
 *
 * Which server clock the run is checking is given by SERVER_NOW (an ISO
 * instant). Leave it unset to test a server on its real clock. A server whose
 * clock is faked (see the Date freeze preload described in the WO-033 report)
 * must be started with the same instant, so this file knows which half to run.
 * The browser date is frozen to the same instant, as a tester's device would be.
 *
 * Needs the seeded staging user like the other e2e specs.
 */
const SERVER_NOW = process.env.SERVER_NOW ? new Date(process.env.SERVER_NOW) : new Date();
const OPEN = isRecapWindowOpenOnServer(SERVER_NOW);
const FAKED = !!process.env.SERVER_NOW;
const AUTH_FILE = path.join("test-results", ".auth", "wo033-user.json");

test.use({ timezoneId: "Asia/Jakarta" });
test.setTimeout(60000);

// ---- the running server -------------------------------------------------------
// Stable title: the real clock must not end up in it (workers would disagree on the name).
test.describe(`server clock ${FAKED ? process.env.SERVER_NOW : "real"} (${OPEN ? "window open" : "window closed"})`, () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    test.setTimeout(120000);
    const ctx = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await loginAsSeededUser(page);
    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
    await ctx.storageState({ path: AUTH_FILE });
    await ctx.close();
  });
  test.use({ storageState: AUTH_FILE });

  test("API: login check stays (no cookie -> 401, window or not)", async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
    const res = await anon.get("/api/year-review?year=2026");
    expect(res.status()).toBe(401);
    await anon.dispose();
  });

  if (!OPEN) {
    for (const [view, viewport] of [
      ["phone", { width: 390, height: 844 }],
      ["desktop", { width: 1440, height: 900 }],
    ] as const) {
      test.describe(`closed, ${view}`, () => {
        test.use({ viewport });

        for (const url of ["/year-review", "/year-review?year=2026", "/year-review?year=2025", "/year-review?year=abc"]) {
          test(`page ${url} shows the closed screen, no ceremony`, async ({ page }) => {
            await page.emulateMedia({ reducedMotion: "reduce" });
            if (FAKED) await page.clock.setFixedTime(SERVER_NOW);
            await page.goto(url);
            const closed = page.getByTestId("year-review-closed");
            await expect(closed).toBeVisible();
            await expect(closed.getByText("Opens December 20.")).toBeVisible();
            await expect(closed.getByRole("link", { name: "Back to your week" })).toBeVisible();
            // No ceremony: no scenes, no stage, and no data request was needed to decide.
            await expect(page.locator(".yc-scene")).toHaveCount(0);
            await expect(page.locator(".yc-stage")).toHaveCount(0);
            await expect(page.getByText("Before anything else,")).toHaveCount(0);
            await expect(page.getByText("Gathering your year")).toHaveCount(0);
          });
        }

        test("page: the way back works", async ({ page }) => {
          if (FAKED) await page.clock.setFixedTime(SERVER_NOW);
          await page.goto("/year-review");
          await page.getByRole("link", { name: "Back to your week" }).click();
          await page.waitForURL("**/goals");
        });

        test("old YEAR_END_REVIEW notification, tapped, lands on the closed screen", async ({ page }) => {
          if (FAKED) await page.clock.setFixedTime(SERVER_NOW);
          // The notification list is stubbed with one that a tester got inside an earlier window.
          await page.route("**/api/notifications?*", (route) =>
            route.fulfill({
              json: {
                unreadCount: 1,
                notifications: [
                  {
                    id: "wo033-old-year-end",
                    type: "YEAR_END_REVIEW",
                    title: "Year-End Review",
                    message: "Your Year in Review is ready.",
                    link: "/year-review",
                    read: false,
                    createdAt: "2025-12-24T03:00:00.000Z",
                  },
                ],
              },
            }),
          );
          await page.goto("/goals");
          await page.getByTestId("notification-bell-btn").locator("visible=true").first().click();
          await page.getByText("Year-End Review").locator("visible=true").first().click();
          await page.waitForURL("**/year-review");
          await expect(page.getByTestId("year-review-closed")).toBeVisible();
          await expect(page.getByText("Opens December 20.")).toBeVisible();
          await expect(page.getByText("Something went wrong")).toHaveCount(0);
        });
      });
    }

    test("API: closed response, no ceremony data (any ?year=)", async ({ page }) => {
      for (const q of ["", "?year=2026", "?year=2025", "?year=abc"]) {
        const res = await page.request.get(`/api/year-review${q}`);
        expect(res.status(), q).toBe(403);
        expect(res.headers()["cache-control"]).toContain("no-store");
        const body = await res.json();
        expect(body).toEqual({ error: "The year review opens on December 20.", code: "RECAP_WINDOW_CLOSED" });
        for (const k of ["momentum", "integrity", "identity", "rings", "missionStatement", "year"]) {
          expect(body).not.toHaveProperty(k);
        }
      }
    });
  } else {
    test.describe("open", () => {
      test.use({ viewport: { width: 1280, height: 860 } });

      test("API: answers as before (200, ceremony data)", async ({ page }) => {
        const year = SERVER_NOW.getUTCFullYear();
        const res = await page.request.get(`/api/year-review?year=${year}`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        for (const k of ["momentum", "integrity", "identity", "rings", "missionStatement"]) {
          expect(body).toHaveProperty(k);
        }
        expect(body.year).toBe(year);
        // The input check still comes after the window check
        expect((await page.request.get("/api/year-review?year=abc")).status()).toBe(400);
      });

      test("page: the ceremony opens as before", async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        if (FAKED) await page.clock.setFixedTime(SERVER_NOW);
        const year = SERVER_NOW.getUTCFullYear();
        await page.goto(`/year-review?year=${year}`);
        await expect(page.locator(".yc-scene.yc-active")).toHaveAttribute("data-scene", "threshold", { timeout: 30000 });
        await expect(page.getByTestId("year-review-closed")).toHaveCount(0);
      });
    });
  }
});
