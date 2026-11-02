import { test, expect } from "@playwright/test";
const TEST_PASSWORD = "Quadrant_079"; // seeded staging user, same as tests/helpers/auth.ts

test.describe("Notification bell (WO-039)", () => {
  test("no Manual Test Generator, seed route gone, real notifications still work", async ({ page }) => {
    // The login form submits natively (GET) if filled before hydration; wait for the challenge fetch path to be ready.
    await page.goto("/login");
    await page.waitForTimeout(5000);
    await page.locator('input[type="email"]').fill("ignaz.fico@quadrant.com");
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/goals", { timeout: 30000 });
    await page.getByTestId("notification-bell-btn").click();
    await expect(page.getByText("Notifications").first()).toBeVisible();

    await expect(page.getByText("Manual Test Generator")).toHaveCount(0);
    await expect(page.locator('[data-testid^="test-trigger-"]')).toHaveCount(0);

    const seed = await page.request.post("/api/notifications/test-seed", { data: { type: "MORNING_FOCUS" } });
    expect(seed.status()).toBe(404);

    const before = await (await page.request.get("/api/notifications")).json();
    expect(Array.isArray(before.notifications)).toBe(true);

    const markAll = await page.request.patch("/api/notifications", { data: { all: true } });
    expect(markAll.status()).toBe(200);
    const after = await (await page.request.get("/api/notifications")).json();
    expect(after.unreadCount).toBe(0);
  });
});
