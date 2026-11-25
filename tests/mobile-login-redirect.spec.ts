import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./helpers/auth";

// Stops at /goals: the shared helper also waits for the week data, which this spec does not need.
async function loginAsSeededUser(page: Page) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("ignaz.fico@quadrant.com");
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/goals", { timeout: 20000 });
}

/**
 * WO-034: on mobile (below md), /weekly-review with no session key goes straight
 * to /login, and /profile has a Log out button. Desktop is unchanged.
 * Needs the seeded staging user, like the other e2e specs.
 */
const KEY = "quadrant_session_vault_key";
const dropKey = (page: Page) => page.evaluate((k) => sessionStorage.removeItem(k), KEY);

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("AC1: no session key on /weekly-review goes to /login", async ({ page }) => {
    await loginAsSeededUser(page);
    await dropKey(page);
    await page.goto("/weekly-review");
    await expect(page).toHaveURL(/\/login/, { timeout: 20000 });
  });

  test("AC2: Log out on /profile ends the session and lands on /login", async ({ page }) => {
    await loginAsSeededUser(page);
    await page.goto("/profile");
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 20000 });
    expect(await page.evaluate((k) => sessionStorage.getItem(k), KEY)).toBeNull();
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("AC3: no session key on /weekly-review stays put with the inline notice; no Log out button on the profile card view", async ({ page }) => {
    await loginAsSeededUser(page);
    await dropKey(page);
    await page.goto("/weekly-review");
    await expect(page.getByRole("heading", { name: "Weekly review" })).toBeVisible();
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/weekly-review/);
    await page.goto("/profile");
    await expect(page.getByRole("button", { name: "Log out" })).toBeHidden();
  });
});
