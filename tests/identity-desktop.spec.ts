import { test, expect } from "@playwright/test";
import { loginAsSeededUser } from "./helpers/auth";

/**
 * Desktop merged "Identity" view for /profile (renders IdentityPage).
 * Requires the seeded staging user — see prisma/seed.ts. Excluded from
 * the "smoke" CI project (see playwright.config.ts), same reason as the
 * other desktop specs: needs a real seeded backend, not a stub.
 *
 * Viewport is forced to a desktop width per-test via test.use, so this
 * suite is meaningful even if the default project viewport changes.
 */
test.describe("Identity desktop merged view", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("shows the ID card column next to a Mission statement panel", async ({ page }) => {
    await loginAsSeededUser(page);
    await page.goto("/profile");

    await expect(page.getByText("Quadrant ID")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Role badges" })).toBeVisible();

    // Mission panel: either the signed-document view or the CTA, never neither.
    const hasDoc = await page.getByText("The words you chose.").isVisible().catch(() => false);
    const hasCta = await page.getByRole("link", { name: /Begin/ }).isVisible().catch(() => false);
    expect(hasDoc || hasCta).toBe(true);

    // The mobile-only view must not be visible at this viewport.
    await expect(page.locator(".md\\:hidden")).toBeHidden();
  });

  test("clicking a role badge toggles its featured state", async ({ page }) => {
    await loginAsSeededUser(page);
    await page.goto("/profile");

    // Scope to the desktop view: the mobile ProfilePage is also in the DOM (hidden).
    const desktop = page.locator(".hidden.md\\:block");
    const first = desktop.getByTestId("role-badge").first();
    await expect(first).toBeVisible();

    const initiallyFeatured = await first.getAttribute("aria-pressed");
    await first.click();
    await expect(first).not.toHaveAttribute("aria-pressed", initiallyFeatured ?? "false");

    // Restore original state so re-runs stay consistent.
    await first.click();
  });

  // GROWTH-RING-REDESIGN: badges are constellations, described by months shown up.
  test("role badges draw this year's constellation", async ({ page }) => {
    await loginAsSeededUser(page);
    await page.goto("/profile");

    const desktop = page.locator(".hidden.md\\:block");
    const badge = desktop.getByTestId("role-badge").first();
    await expect(badge.getByRole("img")).toHaveAttribute(
      "aria-label",
      /: (showed up in \d+ months?|no finished goals yet)$/,
    );
    await expect(badge).toContainText(/\d+ stars? this year|First star waiting/);

    const copy = (await desktop.innerText()) ?? "";
    expect(copy).not.toMatch(/growth ring|streak|%/i);
  });

  test("Your year in Quadrant link navigates to /year-review", async ({ page }) => {
    await loginAsSeededUser(page);
    await page.goto("/profile");

    await page.getByRole("link", { name: "Your year in Quadrant" }).click();
    await page.waitForURL("**/year-review");
  });
});
