import { Page, expect } from "@playwright/test";

/**
 * Logs in as the seeded staging test user and waits for the
 * week dashboard (/goals) to finish loading. Shared by every
 * spec that needs an authenticated session against real data.
 * Credentials match prisma/seed.ts (TEST_EMAIL / TEST_PASSWORD).
 */
const TEST_PASSWORD = 'Quadrant_079';

export async function loginAsSeededUser(page: Page) {
  await page.goto("/login");
  await expect(page).toHaveTitle(/Quadrant/);

  await page.locator('input[type="email"]').fill("ignaz.fico@quadrant.com");
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);

  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/goals", { timeout: 20000 });

  await page.waitForFunction(
    () => {
      const el = document.body;
      return (
        !el ||
        (!el.textContent?.includes("Loading your week") &&
          !el.textContent?.includes("Couldn't load your week"))
      );
    },
    { timeout: 15000 },
  );
}
