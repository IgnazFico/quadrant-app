import { test, expect } from "@playwright/test";

test.describe("Quadrant Live Production User Session & Dashboard", () => {
  test("Can log in with seeded account and view live dashboard", async ({ page }) => {
    // 1. Navigate to login page
    await page.goto("/login");
    await expect(page).toHaveTitle(/Quadrant/);

    // 2. Fill login credentials
    await page.locator('input[type="email"]').fill("ignaz.fico@quadrant.com");
    await page.locator('input[type="password"]').fill("Quadrant_079");

    // 3. Submit login
    await page.locator('button[type="submit"]').click();

    // 4. Expect navigation to /goals dashboard
    await page.waitForURL("**/goals", { timeout: 20000 });
    expect(page.url()).toContain("/goals");

    // 5. Verify the dashboard renders user's seeded roles and goals
    await expect(page.getByText(/Software Architect|Physical Vitality/i).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
