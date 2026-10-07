import { test, expect } from "@playwright/test";
import { loginAsSeededUser } from "./helpers/auth";

/**
 * Next-week planning (Habit 3: organize the week ahead) on the mobile
 * Week pages. Requires the seeded staging user, so it's excluded from the
 * "smoke" CI project like the other seeded-backend specs.
 *
 * Covers: the This week / Next week toggle on /goals, adding a goal to next
 * week, the choice carrying over to /schedule via ?week=next, and no "done"
 * checkbox for a week that hasn't started.
 */
test.describe("Next-week planning (mobile)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("add a goal to next week on /goals, then find it in next week's schedule", async ({ page }) => {
    await loginAsSeededUser(page);
    const title = `Plan ahead ${Date.now()}`;

    await page.getByRole("button", { name: "Next week" }).click();
    await expect(page).toHaveURL(/\/goals\?week=next/);
    await expect(page.getByRole("heading", { name: "Next week" })).toBeVisible();
    // Today belongs to this week, not the one being planned.
    await expect(page.getByRole("heading", { name: "Today" })).toBeHidden();

    // First role is expanded by default.
    const add = page.getByPlaceholder("Add a goal for this role...").first();
    await add.fill(title);
    await add.press("Enter");
    const row = page.locator(`input[value="${title}"]`);
    await expect(row).toBeVisible();

    // A week that hasn't started has no done checkbox on any goal row.
    await expect(
      page.locator(".md\\:hidden").getByRole("button", { name: "Delete goal" }).first(),
    ).toBeVisible();
    await expect(page.locator('.md\\:hidden button[class*="rounded-[5px]"]')).toHaveCount(0);

    // "Give it a day" keeps the week: lands on next week's schedule.
    await page.getByRole("link", { name: "Give it a day in next week's schedule" }).first().click();
    await expect(page).toHaveURL(/\/schedule\?week=next/);
    await expect(page.getByRole("button", { name: "Next week", pressed: true })).toBeVisible();

    // Clean up: back on /goals?week=next, delete the goal again.
    await page.goto("/goals?week=next");
    await page.waitForFunction(() => !document.body.textContent?.includes("Loading your week"));
    const goal = page.locator(`input[value="${title}"]`);
    await goal.locator("xpath=..").getByRole("button", { name: "Delete goal" }).click();
    await expect(goal).toHaveCount(0);
  });

  test("switching back to This week drops ?week=next", async ({ page }) => {
    await loginAsSeededUser(page);
    await page.goto("/goals?week=next");
    await page.getByRole("button", { name: "This week" }).click();
    await expect(page).toHaveURL(/\/goals$/);
    await expect(page.getByRole("heading", { name: "This week" })).toBeVisible();
  });
});
