import { test, expect } from "@playwright/test";

test.describe("Quadrant Production Verification Suite", () => {
  test("PWA Webmanifest is valid and accessible", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const contentType = res.headers()["content-type"] || "";
    expect(contentType).toContain("json");

    const manifest = await res.json();
    expect(manifest.name).toContain("Quadrant");
    expect(manifest.start_url).toBe("/goals");
    expect(manifest.theme_color).toBe("#FFF9F2");
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test("Landing page renders typography, meta, and CTA buttons", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Quadrant/);

    const ctaLink = page.getByRole("link", { name: /Design Your Week Free|Get Started/i }).first();
    await expect(ctaLink).toBeVisible();
    await expect(ctaLink).toHaveAttribute("href", "/login");
  });

  test("Production Shields block test utility routes with 404", async ({ request }) => {
    const notifPageRes = await request.get("/test-notifications");
    expect(notifPageRes.status()).toBe(404);

    const testSeedRes = await request.post("/api/notifications/test-seed");
    expect(testSeedRes.status()).toBe(404);
  });

  test("Anti-enumeration returns deterministic synthetic credentials for unknown user", async ({
    request,
  }) => {
    const email = `unknown-audit-${Date.now()}@example.com`;

    const res1 = await request.get(`/api/auth/login-challenge?email=${encodeURIComponent(email)}`);
    expect(res1.status()).toBe(200);
    const data1 = await res1.json();
    expect(data1.saltPassword).toBeDefined();
    expect(data1.wrappedKeyPassword).toBeDefined();
    expect(data1.isNewUser).toBe(false);

    const res2 = await request.get(`/api/auth/login-challenge?email=${encodeURIComponent(email)}`);
    const data2 = await res2.json();
    expect(data1.saltPassword).toBe(data2.saltPassword);
    expect(data1.wrappedKeyPassword).toBe(data2.wrappedKeyPassword);
  });

  test("Auth page switches seamlessly between Login and Signup tabs", async ({ page }) => {
    await page.goto("/login");

    // Login tab is active by default
    await expect(page.getByRole("button", { name: "Log in" }).first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Switch to Create account tab
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("button", { name: "Create account" }).nth(1)).toBeVisible();

    // Forgot password link directs to /recover
    await page.getByRole("button", { name: "Log in" }).click();
    const forgotLink = page.getByRole("link", { name: /Forgot password/i });
    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveAttribute("href", "/recover");
  });
});
