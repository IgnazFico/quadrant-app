/**
 * WO-074: desktop top-bar Feedback button (design WO-076 v2, option A).
 * Environment: seeded staging user (tests/helpers/auth.ts); /api/feedback is
 * stubbed, so no mail is sent and nothing is stored.
 */
import { test, expect } from "@playwright/test";
import { loginAsSeededUser } from "./helpers/auth";

const btn = (page: import("@playwright/test").Page) => page.getByTestId("feedback-topbar-btn");

test.describe("top-bar Feedback button", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("AC1 shows on /goals, /patterns, /profile, left of the bell, named Feedback", async ({ page }) => {
    await loginAsSeededUser(page);
    for (const route of ["/goals", "/patterns", "/profile"]) {
      await page.goto(route);
      await expect(page.getByRole("button", { name: "Feedback", exact: true })).toBeVisible();
      const b = await btn(page).boundingBox();
      const bell = await page.locator("header").getByRole("button", { name: /notification/i }).first().boundingBox();
      expect(b!.x + b!.width).toBeLessThanOrEqual(bell!.x);
    }
  });

  test("AC2, AC5 opens the form, Escape and X close it and return focus", async ({ page }) => {
    await loginAsSeededUser(page);
    await btn(page).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Beta Feedback")).toBeVisible();
    await expect(btn(page)).toHaveAttribute("aria-expanded", "true");
    await expect(dialog.locator("textarea")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(btn(page)).toBeFocused();
    await btn(page).click();
    await page.getByRole("button", { name: "Close modal" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(btn(page)).toBeFocused();
  });

  test("AC4 failed send shows the error and keeps the text", async ({ page }) => {
    await loginAsSeededUser(page);
    await page.route("**/api/feedback", (r) =>
      r.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "We couldn't send your feedback. Your text is still here, please try again." }) }),
    );
    await btn(page).click();
    await page.locator("textarea").fill("keep me");
    await page.getByRole("button", { name: "Submit Reflection" }).click();
    await expect(page.getByText("We couldn't send your feedback.")).toBeVisible();
    await expect(page.locator("textarea")).toHaveValue("keep me");
  });

  test("AC3 sent note carries the page; success closes and returns focus", async ({ page }) => {
    await loginAsSeededUser(page);
    let body: undefined | { metadata: { pathname: string } };
    await page.route("**/api/feedback", (r) => {
      body = r.request().postDataJSON();
      return r.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await page.goto("/patterns");
    await btn(page).click();
    await page.locator("textarea").fill("hello");
    await page.getByRole("button", { name: "Submit Reflection" }).click();
    await expect(page.getByText("Your feedback has been emailed to the team.")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 5000 });
    await expect(btn(page)).toBeFocused();
    expect(body!.metadata.pathname).toBe("/patterns");
  });

  test("label from 1280 px, icon only at 1024; date from 1536 px only", async ({ page }) => {
    await loginAsSeededUser(page);
    const label = btn(page).locator("span");
    const date = page.locator("header").filter({ has: btn(page) }).locator("span.font-mono").first();
    for (const [w, labelShown, dateShown] of [[1536, true, true], [1280, true, false], [1024, false, false]] as const) {
      await page.setViewportSize({ width: w, height: 800 });
      expect(await label.isVisible()).toBe(labelShown);
      expect(await date.isVisible()).toBe(dateShown);
      const h = await page.locator("header").filter({ has: btn(page) }).boundingBox();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(h!.width).toBeLessThanOrEqual(w);
    }
  });

  test("AC6 phone: no top bar button; AC7 focused routes: none", async ({ page }) => {
    await loginAsSeededUser(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/goals");
    await expect(btn(page)).toBeHidden();
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const route of ["/mission-statement", "/onboarding", "/year-review"]) {
      await page.goto(route);
      await expect(btn(page)).toHaveCount(0);
    }
  });
});
