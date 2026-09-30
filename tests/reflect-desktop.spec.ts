import { test, expect } from "@playwright/test";
import { loginAsSeededUser } from "./helpers/auth";

/**
 * Desktop merged "Reflect" view for /weekly-review and /patterns (both
 * render ReflectPage). Requires the seeded staging user — see
 * prisma/seed.ts. Excluded from the "smoke" CI project (see
 * playwright.config.ts), same reason as week-desktop.spec.ts: needs a
 * real seeded backend, not a stub.
 *
 * Viewport is forced to a desktop width per-test via test.use, so this
 * suite is meaningful even if the default project viewport changes.
 */
test.describe("Reflect desktop merged view", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("shows Weekly review and Patterns side by side on /weekly-review", async ({ page }) => {
    await loginAsSeededUser(page);
    await page.goto("/weekly-review");

    await expect(page.getByRole("heading", { name: "Weekly review" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Patterns" })).toBeVisible();

    // The mobile-only views must not be visible at this viewport.
    await expect(page.locator(".md\\:hidden")).toBeHidden();
  });

  test("same desktop merged view renders when visiting /patterns directly", async ({ page }) => {
    await loginAsSeededUser(page);
    await page.goto("/patterns");

    await expect(page.getByRole("heading", { name: "Weekly review" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Patterns" })).toBeVisible();
  });

  test("reflecting on a missed goal opens the reason sheet and saves", async ({ page }) => {
    await loginAsSeededUser(page);
    await page.goto("/weekly-review");

    const reflectButtons = page.getByRole("button", { name: "Reflect" });
    const count = await reflectButtons.count();
    if (count === 0) {
      // Nothing missed and unreflected this week in seed data right now —
      // not a failure of the feature, just nothing to exercise.
      test.skip(true, "No unreflected missed goals in current seed state");
    }

    await reflectButtons.first().click();
    await expect(page.getByText("What got in the way?")).toBeVisible();

    await page.locator("textarea").fill("Ran out of time this week.");
    await page.getByRole("button", { name: "Carry to next week" }).click();

    await expect(page.getByText("What got in the way?")).toBeHidden();
  });

  test("Patterns panel renders all five prototype cards", async ({ page }) => {
    await loginAsSeededUser(page);
    await page.goto("/patterns");

    for (const heading of ["Rhythm", "Presence", "Balance", "Style", "Honesty"]) {
      await expect(page.getByText(heading, { exact: true })).toBeVisible();
    }
  });
});
