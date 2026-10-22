import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { loginAsSeededUser } from "./helpers/auth";

const AUTH_FILE = path.join("test-results", ".auth", "wo016-user.json");

/**
 * WO-016 (D-032): the "Your year in Quadrant" button on /profile shows only
 * while isRecapWindowOpen() is true (Dec 20 to Dec 31). Both views are in the
 * DOM at once (mobile below md, desktop at md and up), so the checks count
 * text matches (which include display:none elements), not visible roles.
 *
 * Needs the seeded staging user, like the other e2e specs; the date is faked
 * with page.clock.setFixedTime (Date only, timers keep running), in the
 * Asia/Jakarta zone so the day boundaries are exact.
 *
 * WO-016 (D-032 / D-033): the Beta Feedback form no longer shows a mailbox.
 */
test.use({ timezoneId: "Asia/Jakarta", storageState: AUTH_FILE });
test.setTimeout(60000);

// One login for the whole file (the login against staging is the slow step).
test.beforeAll(async ({ browser, baseURL }) => {
  test.setTimeout(120000);
  const ctx = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  await loginAsSeededUser(page);
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await ctx.storageState({ path: AUTH_FILE });
  await ctx.close();
});

const LINK = "Your year in Quadrant";

async function openProfileAt(page: Page, iso: string) {
  await page.clock.setFixedTime(new Date(iso));
  await page.goto("/profile");
  // The profile view has finished loading when the "+ add role" tile shows
  // (it exists in both the phone and the desktop view).
  await expect(page.getByText("+ add role").locator("visible=true").first()).toBeVisible({ timeout: 20000 });
}

const CLOSED = [
  ["Oct 21", "2026-10-21T12:00:00+07:00"],
  ["Dec 19 23:59", "2026-12-19T23:59:00+07:00"],
  ["Jan 1", "2027-01-01T00:00:00+07:00"],
] as const;
const OPEN = [
  ["Dec 20 00:00", "2026-12-20T00:00:00+07:00"],
  ["Dec 31 23:59", "2026-12-31T23:59:00+07:00"],
] as const;

for (const [view, viewport] of [
  ["phone", { width: 390, height: 844 }],
  ["desktop", { width: 1440, height: 900 }],
] as const) {
  test.describe(`Profile year review button, ${view}`, () => {
    test.use({ viewport });

    for (const [label, iso] of CLOSED) {
      test(`window closed (${label}): no button, no gap`, async ({ page }) => {
        await openProfileAt(page, iso);
        await expect(page.getByText(LINK)).toHaveCount(0);
        await expect(page.locator('a[href="/year-review"]')).toHaveCount(0);

        if (view === "phone") {
          // Feedback entry sits 16px under the roles section, as if the button never existed.
          const gap = await page.getByRole("button", { name: /Beta Feedback/ }).evaluate((b) => {
            const prev = b.previousElementSibling as HTMLElement;
            return Math.round(b.getBoundingClientRect().top - prev.getBoundingClientRect().bottom);
          });
          expect(gap).toBe(16);
        }
      });
    }

    for (const [label, iso] of OPEN) {
      test(`window open (${label}): button shows and opens /year-review`, async ({ page }) => {
        await openProfileAt(page, iso);
        const link = page.getByRole("link", { name: LINK });
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute("href", "/year-review");
        await link.click();
        await page.waitForURL("**/year-review");
      });
    }
  });
}

test.describe("Beta Feedback form has no mailbox", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("no email link, submit still works and thanks the user", async ({ page }) => {
    await page.goto("/profile");
    await page.getByRole("button", { name: /Beta Feedback/ }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await expect(dialog.locator('a[href^="mailto:"]')).toHaveCount(0);
    expect(await dialog.innerText()).not.toMatch(/quadrant\.me|@gmail\.com|Or email/i);

    // Submit button is right-aligned in its row.
    const submit = dialog.getByRole("button", { name: "Submit Reflection" });
    await dialog.getByPlaceholder(/What felt confusing/).fill("WO-016 SIT: test message, safe to ignore");
    const box = await submit.boundingBox();
    const dbox = await dialog.boundingBox();
    expect(box && dbox && dbox.x + dbox.width - (box.x + box.width)).toBeLessThan(30);

    await submit.click();
    await expect(dialog.getByText("Thank you for your voice")).toBeVisible({ timeout: 10000 });
  });
});
