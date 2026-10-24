/**
 * WO-020 / NB-1 prototype check: the bottom bar is gone on the focused flows
 * (mission statement, role onboarding) and every control is fully visible,
 * hit-testable and clear of the page end once scrolled to the end.
 *
 * Environment: the seeded staging user (tests/helpers/auth.ts). The two POSTs
 * that would write data (/api/mission-statement, /api/roles) are answered by
 * the test, so nothing is written to the database. Screenshots go to
 * NAVBAR_SHOTS (default test-results/navbar-shots); one JSON line per
 * measured control goes to NAVBAR_LOG.
 *
 * "Address bar shown" is emulated by a shorter viewport (56 px less). Real
 * browser chrome, a soft keyboard and the OS font scale cannot be emulated
 * here; the 130% runs set html font-size to 130% (rem-based sizes only).
 */
import { test, expect, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { loginAsSeededUser } from "./helpers/auth";

const SHOT_DIR = process.env.NAVBAR_SHOTS ?? "test-results/navbar-shots";
const LOG = process.env.NAVBAR_LOG ?? "test-results/navbar-measure.jsonl";

const CONFIGS = [
  { name: "390x844-bar-hidden", width: 390, height: 844, scale: 100 },
  { name: "390x788-bar-shown", width: 390, height: 788, scale: 100 },
  { name: "360x640-bar-hidden", width: 360, height: 640, scale: 100 },
  { name: "360x584-bar-shown", width: 360, height: 584, scale: 100 },
  { name: "390x844-text130", width: 390, height: 844, scale: 130 },
  { name: "360x640-text130", width: 360, height: 640, scale: 130 },
];

const MIN_CLEAR_PX = 40; // larger of 40 px and the safe-area inset (0 in Chromium)
const MIN_TARGET_PX = 44;

async function scale(page: Page, pct: number) {
  if (pct === 100) return;
  await page.addStyleTag({ content: `html{font-size:${pct}% !important}` });
}

async function check(
  page: Page,
  cfg: string,
  flow: string,
  screen: string,
  controls: Locator[],
) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  // The phone bar must not exist on these routes.
  await expect.soft(page.locator("nav"), `${cfg} ${flow}/${screen} no bottom bar`).toHaveCount(0);
  for (const c of controls) {
    await expect(c).toBeVisible();
    const m = await c.evaluate((el) => {
      const b = el.getBoundingClientRect();
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return {
        barTop: document.querySelector("nav.fixed")?.getBoundingClientRect().top ?? null,
        top: b.top,
        bottom: b.bottom,
        left: b.left,
        right: b.right,
        h: b.height,
        vh: window.innerHeight,
        vw: window.innerWidth,
        hit: !!hit && (el === hit || el.contains(hit)),
        clear: document.documentElement.scrollHeight - (window.scrollY + b.bottom),
        label: (el.textContent || "").trim().slice(0, 30),
      };
    });
    fs.mkdirSync(path.dirname(LOG), { recursive: true });
    fs.appendFileSync(LOG, JSON.stringify({ cfg, flow, screen, ...m }) + "\n");
    const where = `${cfg} ${flow}/${screen} "${m.label}"`;
    expect.soft(m.top, `${where} top inside viewport`).toBeGreaterThanOrEqual(0);
    expect.soft(m.bottom, `${where} bottom inside viewport`).toBeLessThanOrEqual(m.vh);
    if (m.barTop !== null) expect.soft(m.bottom, `${where} above the bar`).toBeLessThanOrEqual(m.barTop);
    expect.soft(m.left, `${where} left inside viewport`).toBeGreaterThanOrEqual(0);
    expect.soft(m.right, `${where} right inside viewport`).toBeLessThanOrEqual(m.vw);
    expect.soft(m.hit, `${where} nothing covers its centre`).toBe(true);
    expect.soft(m.clear, `${where} clear of page end`).toBeGreaterThanOrEqual(MIN_CLEAR_PX - 0.5);
    expect.soft(m.h, `${where} tap target height`).toBeGreaterThanOrEqual(MIN_TARGET_PX - 0.5);
  }
  const dir = path.join(SHOT_DIR, cfg);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${flow}-${screen}.png`) });
}

/**
 * The flows only show to an account with no mission statement and no roles.
 * The seeded user has both, so the flow tests use a throwaway staging account
 * (NAVBAR_EMAIL / NAVBAR_PASSWORD, created through the signup form). Both
 * write endpoints are stubbed, so the account stays empty and reusable.
 */
// CI does not provide the throwaway account (D-068 A): those flows skip there
// and run only where NAVBAR_EMAIL and NAVBAR_PASSWORD are set.
const HAS_FRESH_USER = Boolean(process.env.NAVBAR_EMAIL && process.env.NAVBAR_PASSWORD);
const FRESH_USER_SKIP = "NAVBAR_EMAIL and NAVBAR_PASSWORD not set";

async function loginAsFreshUser(page: Page) {
  const email = process.env.NAVBAR_EMAIL;
  const password = process.env.NAVBAR_PASSWORD;
  if (!email || !password) throw new Error("set NAVBAR_EMAIL and NAVBAR_PASSWORD");
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/onboarding\/roles|goals/, { timeout: 60_000 });
}

const btn = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });

for (const c of CONFIGS) {
  test.describe(`navbar flows ${c.name}`, () => {
    test.use({
      viewport: { width: c.width, height: c.height },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
      timezoneId: "Asia/Jakarta",
    });

    test("mission statement: 8 screens", async ({ page }) => {
      test.skip(!HAS_FRESH_USER, FRESH_USER_SKIP);
      test.setTimeout(180_000);
      await page.route("**/api/mission-statement", (route) =>
        route.request().method() === "POST"
          ? route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' })
          : route.continue(),
      );
      await loginAsFreshUser(page);
      // The master key lives in sessionStorage, so a full navigation keeps it.
      await page.goto("/mission-statement");
      await expect(btn(page, "Begin")).toBeVisible({ timeout: 20_000 });
      await scale(page, c.scale);

      await check(page, c.name, "mission", "1-intro", [btn(page, "Begin")]);
      await btn(page, "Begin").click();
      const qs = [
        ["2-q1", "Continue"],
        ["3-q2", "Continue"],
        ["4-q3", "Continue"],
        ["5-q4", "Review draft"],
      ];
      for (const [screen, next] of qs) {
        await page.locator("textarea").fill("A short honest answer for the layout check.");
        await check(page, c.name, "mission", screen, [btn(page, "Back"), btn(page, next)]);
        await btn(page, next).click();
      }
      await check(page, c.name, "mission", "6-assemble", [btn(page, "Sign and commit")]);
      await btn(page, "Sign and commit").click();
      await page.getByLabel("Your signature").fill("Test User");
      await check(page, c.name, "mission", "7-sign", [btn(page, "Commit")]);
      await btn(page, "Commit").click();
      await check(page, c.name, "mission", "8-done", [page.getByRole("link", { name: "Plan this week" })]);
    });

    test("role onboarding: 4 steps", async ({ page }) => {
      test.skip(!HAS_FRESH_USER, FRESH_USER_SKIP);
      test.setTimeout(180_000);
      await page.route("**/api/roles", (route) =>
        route.request().method() === "POST"
          ? route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' })
          : route.continue(),
      );
      await loginAsFreshUser(page);
      await page.goto("/onboarding/roles");
      await expect(btn(page, "Continue")).toBeVisible({ timeout: 20_000 });
      await scale(page, c.scale);

      const chips = page.locator("button:not(:has-text('Continue')):not(:has-text('Back'))");
      // Role-heavy choice: 5 domains.
      for (let i = 0; i < 5; i++) await chips.nth(i).click();
      await check(page, c.name, "onboarding", "1-domains", [btn(page, "Continue")]);
      await btn(page, "Continue").click();

      const roleChips = page.locator("button:not(:has-text('Continue')):not(:has-text('Back'))");
      const n = Math.min(await roleChips.count(), 12);
      for (let i = 0; i < n; i++) await roleChips.nth(i).click();
      await check(page, c.name, "onboarding", "2-roles", [btn(page, "Back"), btn(page, "Continue")]);
      await btn(page, "Continue").click();

      await check(page, c.name, "onboarding", "3-personalize", [btn(page, "Back"), btn(page, "Finish")]);
      await btn(page, "Finish").click();
      await check(page, c.name, "onboarding", "4-done", [page.getByRole("link", { name: "Start setting goals" })]);
    });
  });
}

test.describe("bar still shows on the other pages (phone)", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    timezoneId: "Asia/Jakarta",
  });

  for (const route of ["/goals", "/schedule", "/patterns", "/profile"]) {
    test(`bar present on ${route}`, async ({ page }) => {
      test.setTimeout(120_000);
      await loginAsSeededUser(page);
      await page.goto(route);
      await expect(page.locator("nav.fixed").filter({ has: page.getByRole("link", { name: "Schedule" }) })).toBeVisible({ timeout: 20_000 });
    });
  }
});

test.describe("RecapPrompt on 22 Dec (fixed clock)", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    timezoneId: "Asia/Jakarta",
  });
  const RECAP = "Your year in Quadrant is nearly written";

  test("hidden on /mission-statement and /onboarding, shown elsewhere", async ({ page }) => {
    test.skip(!HAS_FRESH_USER, FRESH_USER_SKIP);
    test.setTimeout(150_000);
    await page.clock.setFixedTime(new Date("2026-12-22T10:00:00+07:00"));
    await loginAsFreshUser(page);
    await page.goto("/goals");
    // Positive control: the card does render here, so "hidden" below is meaningful.
    await expect(page.getByText(RECAP)).toBeVisible({ timeout: 15_000 });
    // Dismissal is stored per year; clear it so each route is judged on its own.
    for (const route of ["/mission-statement", "/onboarding/roles"]) {
      await page.evaluate(() => localStorage.clear());
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
      await expect(page.getByText(RECAP), `${route} shows no recap card`).toHaveCount(0);
    }
    await page.evaluate(() => localStorage.clear());
    await page.goto("/profile");
    await expect(page.getByText(RECAP)).toBeVisible({ timeout: 15_000 });
  });
});
