import { test, expect } from "@playwright/test";

// GROWTH-RING-REDESIGN: the landing page shows the constellation, not growth rings,
// and follows the ceremony's copy rules (showing up, never a rate).
test.describe("Landing constellation showcase", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
  });

  test("no growth-ring copy remains and the constellation renders", async ({ page }) => {
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(/growth rings?/i);

    const demo = page.getByTestId("constellation-demo");
    await demo.scrollIntoViewIfNeeded();
    // getByRole skips the aria-hidden crossfade layer.
    await expect(demo.getByRole("img", { name: /Founder: showed up in \d+ months?/ })).toBeVisible();
  });

  test("finishing a goal lights October's star; copy never measures a rate", async ({ page }) => {
    const card = page.getByTestId("constellation-showcase");
    await card.getByRole("button", { name: /Finish a goal/ }).click();
    await expect(card.getByText(/goals? finished in October|grew brighter|new star lit up/).first()).toBeVisible();

    await card.getByRole("button", { name: /^Athlete/ }).click();
    await card.getByRole("button", { name: /Skip to Dec 31/ }).click();
    await expect(card.getByText(/Athlete's year closed/)).toBeVisible();

    const copy = await card.innerText();
    expect(copy).not.toMatch(/%|completion rate|out of|missed|hard month|lean month/i);
  });
});
