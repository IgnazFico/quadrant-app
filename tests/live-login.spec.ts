import { test, expect } from "@playwright/test";
import { loginAsSeededUser } from "./helpers/auth";

test.describe("Quadrant Live Production User Session & Dashboard", () => {
  test("Can log in with seeded account and view live dashboard", async ({ page }) => {
    await loginAsSeededUser(page);

    expect(page.url()).toContain("/goals");

    // Verify the dashboard renders the user's seeded roles and goals.
    await expect(page.getByText(/Software Architect|Physical Vitality/i).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
