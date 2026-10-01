import { test, expect } from "@playwright/test";
import { loginAsSeededUser } from "./helpers/auth";

/**
 * Year-end ceremony at /year-review (components/yearreview/ceremony/).
 * Requires the seeded staging user (prisma/seed.ts seeds goals, roles and
 * an activity day for the current week), so it asks for the current year.
 * Excluded from the "smoke" CI project like the other seeded-data specs.
 *
 * Runs with reduced motion so every scene reveals instantly and the
 * assertions don't depend on animation timing.
 */
const YEAR = new Date().getFullYear();

test.describe("Year-end ceremony", () => {
  test.use({ viewport: { width: 1280, height: 860 } });
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("walks from the threshold to the close, one scene at a time", async ({ page }) => {
    await loginAsSeededUser(page);
    await page.goto(`/year-review?year=${YEAR}`);

    const active = page.locator(".yc-scene.yc-active");
    await expect(active).toHaveAttribute("data-scene", "threshold");
    await expect(active.getByText("Before anything else,")).toBeVisible();
    await expect(active.locator(".yc-year-mark")).toHaveText(String(YEAR));

    // Only one scene is interactive at a time
    await expect(page.locator(".yc-scene.yc-active")).toHaveCount(1);

    await active.getByRole("button", { name: "Begin" }).click();
    await expect(page.locator(".yc-scene.yc-active")).toHaveAttribute("data-scene", "showed-up");
    await expect(page.locator(".yc-scene.yc-active").getByText("you came back")).toBeVisible();

    // Back goes to the previous scene, shown whole
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator(".yc-scene.yc-active")).toHaveAttribute("data-scene", "threshold");

    // Keyboard forward all the way to the close
    for (let i = 0; i < 20; i++) {
      const id = await page.locator(".yc-scene.yc-active").getAttribute("data-scene");
      if (id === "close") break;
      await page.waitForTimeout(550); // engine locks input for 500ms after each move
      await page.keyboard.press("ArrowRight");
    }
    const close = page.locator(".yc-scene.yc-active");
    await expect(close).toHaveAttribute("data-scene", "close");
    await expect(close.getByText("Thank you for making time for yourself.")).toBeVisible();
    // GROWTH-RING-REDESIGN: the close speaks in stars, not rings.
    await expect(close.getByText("These stars are yours to keep.")).toBeVisible();
    await expect(close.getByRole("button", { name: "Close the year" })).toBeVisible();
  });

  test("never shows a completion rate or role rankings", async ({ page }) => {
    await loginAsSeededUser(page);
    await page.goto(`/year-review?year=${YEAR}`);
    await expect(page.locator(".yc-scene.yc-active")).toHaveAttribute("data-scene", "threshold");

    const all = (await page.locator(".yc-stage").textContent()) ?? "";
    expect(all).not.toMatch(/%|completion rate|most improved|most consistent|quietest|due some attention|did it match/i);
    // GROWTH-RING-REDESIGN: no ring language left anywhere in the ceremony.
    expect(all).not.toMatch(/\bring\b|growth ring|tree/i);
  });

  test("the numbers stay optional, behind a disclosure", async ({ page }) => {
    await loginAsSeededUser(page);
    await page.goto(`/year-review?year=${YEAR}`);

    const closeScene = page.locator('.yc-scene[data-scene="close"]');
    const numbers = closeScene.locator("details");
    await expect(numbers).toHaveCount(1);
    expect(await numbers.getAttribute("open")).toBeNull();
  });

  test("Close the year returns to the week", async ({ page }) => {
    await loginAsSeededUser(page);
    await page.goto(`/year-review?year=${YEAR}`);
    await expect(page.locator(".yc-scene.yc-active")).toHaveAttribute("data-scene", "threshold");

    for (let i = 0; i < 20; i++) {
      const id = await page.locator(".yc-scene.yc-active").getAttribute("data-scene");
      if (id === "close") break;
      await page.waitForTimeout(550);
      await page.keyboard.press("ArrowRight");
    }
    await page.locator(".yc-scene.yc-active").getByRole("button", { name: "Close the year" }).click();
    await page.waitForURL("**/goals", { timeout: 10000 });
  });
});
