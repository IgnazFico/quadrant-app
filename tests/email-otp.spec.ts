import { test, expect, type Page } from "@playwright/test";

// UI behaviour of the sign-up code step (WO-012, D-024). The API is stubbed so
// these run anywhere (CI included) without a mail provider; the real flow is
// exercised by scripts/sit/sit-otp-api.mjs and scripts/sit/sit-otp-ui.mjs.

async function toCodeStep(page: Page, register: { status: number; body: object }) {
  await page.route("**/api/auth/register", (route) =>
    route.fulfill({
      status: register.status,
      contentType: "application/json",
      body: JSON.stringify(register.body),
    }),
  );
  await page.goto("/login");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.locator('input[type="email"]').fill(`otp+${Date.now()}@example.com`);
  await page.locator('input[type="password"]').fill("Test-password-123!");
  await page.getByRole("button", { name: "Create account" }).nth(1).click();
}

test("sign-up shows the code step and does not reveal the recovery code yet", async ({ page }) => {
  await toCodeStep(page, { status: 200, body: { ok: true, verificationRequired: true, retryAfter: 60 } });
  await expect(page.getByText("Check your email")).toBeVisible({ timeout: 10000 });
  await expect(page.getByLabel("6-digit code")).toBeVisible();
  // The recovery code is only shown after verification.
  await expect(page.getByText(/[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/)).toHaveCount(0);
  // Verify stays disabled until six digits are entered.
  const verify = page.getByRole("button", { name: "Verify email" });
  await expect(verify).toBeDisabled();
  await page.getByLabel("6-digit code").fill("12ab34");
  await expect(page.getByLabel("6-digit code")).toHaveValue("1234");
  await page.getByLabel("6-digit code").fill("123456");
  await expect(verify).toBeEnabled();
});

test("a wrong code shows the server's message and keeps the step open", async ({ page }) => {
  await page.route("**/api/auth/verify-email", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "That code isn't right. 4 tries left.", code: "wrong_code", attemptsLeft: 4 }),
    }),
  );
  await toCodeStep(page, { status: 200, body: { ok: true, verificationRequired: true, retryAfter: 60 } });
  await page.getByLabel("6-digit code").fill("000000");
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(page.locator('[role="alert"]', { hasText: "4 tries left" })).toBeVisible();
  await expect(page.getByLabel("6-digit code")).toBeVisible();
});

test("resend is disabled during the cooldown and shows a countdown", async ({ page }) => {
  await toCodeStep(page, { status: 200, body: { ok: true, verificationRequired: true, retryAfter: 60 } });
  const resend = page.getByRole("button", { name: /Send a new code in \d+s/ });
  await expect(resend).toBeVisible();
  await expect(resend).toBeDisabled();
});

test("when the server cannot send mail, sign-up shows an error and no code step", async ({ page }) => {
  await toCodeStep(page, {
    status: 503,
    body: { error: "Sign-up is temporarily unavailable. Please try again later.", code: "mail_unavailable" },
  });
  await expect(page.getByText("Sign-up is temporarily unavailable")).toBeVisible({ timeout: 10000 });
  await expect(page.getByLabel("6-digit code")).toHaveCount(0);
});
