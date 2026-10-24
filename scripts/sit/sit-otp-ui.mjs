// Real-browser SIT of the sign-up code step (WO-012). Needs the app running with
// RESEND_API_URL pointing at scripts/sit/mock-resend.mjs (see the build report).
//   node scripts/sit/sit-otp-ui.mjs <baseUrl> <outDir>
// Runs the same flow on desktop Chrome, Pixel 5 (Chromium emulation) and
// iPhone 12 (WebKit emulation). Emulation is NOT a real device: see the report.
import { chromium, webkit, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3201";
const OUT = process.argv[3] ?? "./sit-ui";
const MOCK = "http://127.0.0.1:4010";
fs.mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
};
const lastCode = async (to) => {
  const r = await fetch(`${MOCK}/last?to=${encodeURIComponent(to)}`);
  return r.ok ? ((await r.json()).text.match(/\b(\d{6})\b/)?.[1] ?? "") : "";
};

const profiles = [
  { name: "desktop-chrome", engine: chromium, ctx: { ...devices["Desktop Chrome"] } },
  { name: "android-pixel5", engine: chromium, ctx: { ...devices["Pixel 5"] } },
  { name: "ios-iphone12-webkit", engine: webkit, ctx: { ...devices["iPhone 12"] } },
];

for (const p of profiles) {
  console.log(`\n== ${p.name} ==`);
  const browser = await p.engine.launch();
  const context = await browser.newContext({ ...p.ctx, baseURL: BASE });
  const page = await context.newPage();
  const email = `ui-${p.name}.${Date.now()}@quadrant.test`;
  const shot = (n) => page.screenshot({ path: path.join(OUT, `${p.name}-${n}.png`), fullPage: true });
  try {
    await page.goto("/login");
    await page.getByRole("button", { name: "Create account" }).click();
    await shot("1-signup");
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill("Sit-ui-password-1");
    await page.getByRole("button", { name: "Create account" }).nth(1).click();

    await page.getByText("Check your email").waitFor({ timeout: 30000 });
    check(`${p.name}: code step appears after Create account`, true);
    await shot("2-code-step");
    check(`${p.name}: no recovery code shown before verification`, (await page.getByText(/[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/).count()) === 0);

    // Unverified: cannot reach the app.
    await page.goto("/goals");
    check(`${p.name}: unverified user is sent to /login, not the app`, new URL(page.url()).pathname.startsWith("/login"), page.url());

    // Back to the form; sign in unverified -> hint to verify. (Server state is the source of truth.)
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill("Sit-ui-password-1");
    await page.getByRole("button", { name: "Log in", exact: true }).nth(1).click().catch(async () => {
      await page.locator('button[type="submit"]').first().click();
    });
    await page.getByText("isn't verified yet").waitFor({ timeout: 30000 });
    check(`${p.name}: sign-in before verifying says the email is not verified`, true);
    await shot("3-unverified-signin");

    // Sign up again with the same email (takes over the unverified account) after the 60 s cooldown.
    console.log("      (waiting 61 s for the cooldown)");
    await new Promise((r) => setTimeout(r, 61000));
    await page.locator('input[type="password"]').fill("Sit-ui-password-1");
    await page.getByRole("button", { name: "Create account" }).nth(1).click();
    await page.getByText("Check your email").waitFor({ timeout: 30000 });
    const code = await lastCode(email);
    check(`${p.name}: a code arrived by (mock) email`, /^\d{6}$/.test(code));

    // Wrong code message.
    const wrong = code === "000000" ? "111111" : "000000";
    await page.getByLabel("6-digit code").fill(wrong);
    await page.getByRole("button", { name: "Verify email" }).click();
    const alert = page.locator('[role="alert"]', { hasText: "isn't right" });
    await alert.waitFor({ timeout: 15000 });
    check(`${p.name}: wrong code shows a clear message`, /4 tries left/.test(await alert.innerText()));
    await shot("4-wrong-code");

    // Right code -> recovery code reveal.
    await page.getByLabel("6-digit code").fill(code);
    await page.getByRole("button", { name: "Verify email" }).click();
    await page.getByText(/[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/).first().waitFor({ timeout: 30000 });
    check(`${p.name}: right code -> recovery code is shown`, true);
    await shot("5-recovery-code");
  } catch (e) {
    check(`${p.name}: flow completed`, false, String(e).split("\n")[0]);
    await shot("error").catch(() => {});
  } finally {
    await browser.close();
  }
}
console.log(failures ? `\n${failures} FAILED` : "\nALL PASS");
process.exit(failures ? 1 : 0);
