import { test, expect } from "@playwright/test";

// Basic e2e for signup flow. We stub the registration API so the test
// focuses on the client-side behavior (crypto + UI) without requiring a
// fully provisioned backend or database.

test("signup shows recovery code", async ({ page }) => {
  await page.goto("/login");

  // Switch to Create account tab
  await page.getByRole("button", { name: "Create account" }).click();

  const email = `playwright+${Date.now()}@example.com`;
  const password = "Test-password-123!";

  // Intercept the register request and return a successful response.
  await page.route("**/api/auth/register", (route) =>
    route.fulfill({ status: 200, body: JSON.stringify({}) }),
  );

  // Fill form and submit
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).nth(1).click();

  // Wait for the recovery code reveal to appear.
  const reveal = page.getByText(/-/).first();
  await expect(reveal).toBeVisible({ timeout: 10000 });

  // The recovery code should be formatted with hyphen groups.
  const codeText = await reveal.textContent();
  expect(codeText).toMatch(/[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/);
});

test("login challenge returns synthetic salt for unknown email (anti-enumeration)", async ({
  request,
}) => {
  const fakeEmail = `nonexistent-${Date.now()}@example.com`;
  const res = await request.get(`/api/auth/login-challenge?email=${encodeURIComponent(fakeEmail)}`);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.saltPassword).toBeDefined();
  expect(data.wrappedKeyPassword).toBeDefined();
  expect(data.isNewUser).toBe(false);
});

test("recover challenge returns synthetic recovery salt for unknown email (anti-enumeration)", async ({
  request,
}) => {
  const fakeEmail = `nonexistent-${Date.now()}@example.com`;
  const res = await request.get(`/api/auth/recover-challenge?email=${encodeURIComponent(fakeEmail)}`);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.saltRecovery).toBeDefined();
  expect(data.wrappedKeyRecovery).toBeDefined();
});

