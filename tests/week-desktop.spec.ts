import { test, expect } from "@playwright/test";
import { loginAsSeededUser } from "./helpers/auth";

/**
 * Desktop split-view for /goals and /schedule (both render WeekPage).
 * Requires the seeded staging user — see prisma/seed.ts. Excluded from
 * the "smoke" CI project (see playwright.config.ts) for the same reason
 * live-login.spec.ts is: needs a real seeded backend, not a stub.
 *
 * Viewport is forced to a desktop width per-test via test.use, so this
 * suite is meaningful even if the default project viewport changes.
 */
test.describe("Week desktop split-view", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("shows goals-by-role column and the day board together on /goals", async ({ page }) => {
    await loginAsSeededUser(page);

    // Desktop view merges goals+schedule regardless of which route loaded it.
    await expect(page.getByRole("heading", { name: "This week" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Goals by role" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "The week ahead" })).toBeVisible();

    // Seeded roles (prisma/seed.ts) appear in the left column.
    await expect(page.getByText("Software Architect")).toBeVisible();
    await expect(page.getByText("Physical Vitality")).toBeVisible();

    // Seeded goals appear as editable rows.
    await expect(page.locator('input[value="Ship the staging environment"]')).toBeVisible();
    await expect(page.locator('input[value="Run 5km three times this week"]')).toBeVisible();

    // The mobile-only views must not be visible at this viewport.
    await expect(page.locator(".md\\:hidden")).toBeHidden();
  });

  test("same desktop split-view renders when visiting /schedule directly", async ({ page }) => {
    await loginAsSeededUser(page);
    await page.goto("/schedule");

    await expect(page.getByRole("heading", { name: "Goals by role" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "The week ahead" })).toBeVisible();

    // Seeded today's blocks (prisma/seed.ts) are visible somewhere in the day board.
    await expect(page.getByText("Standup meeting")).toBeVisible();
    await expect(page.getByText("Code review")).toBeVisible();
    await expect(page.getByText("Morning run")).toBeVisible();
  });

  test("+ Add opens the schedule-a-goal modal for that day", async ({ page }) => {
    await loginAsSeededUser(page);

    const addButtons = page.getByRole("button", { name: "+ Add" });
    await addButtons.first().click();

    await expect(page.getByText("Schedule a goal")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to week" })).toBeVisible();

    // Cancel closes without creating anything.
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Schedule a goal")).toBeHidden();
  });

  test("editing a goal title persists after reload", async ({ page }) => {
    await loginAsSeededUser(page);

    const input = page.locator('input[value="Ship the staging environment"]');
    await input.fill("Ship the staging environment (v2)");
    await input.blur();

    await page.reload();
    await page.waitForFunction(
      () => !document.body.textContent?.includes("Loading your week"),
      { timeout: 15000 },
    );
    await expect(
      page.locator('input[value="Ship the staging environment (v2)"]'),
    ).toBeVisible();

    // Restore original title so re-runs of this test (and the seed script)
    // stay consistent with prisma/seed.ts's expected state.
    const restored = page.locator('input[value="Ship the staging environment (v2)"]');
    await restored.fill("Ship the staging environment");
    await restored.blur();
  });

  test("clicking an existing block opens the edit modal, not the create modal", async ({ page }) => {
    await loginAsSeededUser(page);

    await page.getByText("Standup meeting").click();
    await expect(page.getByText("Edit time block")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
  });
});
