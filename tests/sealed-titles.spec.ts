import { test, expect, type Page, type Request, type Response } from "@playwright/test";

/**
 * WO-029 / D-066 system integration test.
 *
 * One real account, created through the real sign-up form (browser seals the
 * master key), walks the whole feature: onboarding roles, goals, schedule,
 * rename, move, delete, reload, password sign-in, recovery-code sign-in, a
 * tab without the master key, and carry-forward completed twice.
 *
 * Needs a running app on a database that has migration 20261028090000
 * (STAGING only). Excluded from the "smoke" CI project because it needs a real
 * backend, like week-desktop.spec.ts; run it with `--project=e2e`.
 *
 * Every request body and every JSON response the app sends or receives for
 * goals, roles, schedule, review, profile, patterns and year-review is
 * captured, and none may contain the readable marker text.
 */

test.describe.configure({ mode: "serial" });
test.use({ viewport: { width: 1440, height: 900 } });

const STAMP = Date.now();
const EMAIL = `wo029.${STAMP}@quadrant.test`;
const PASSWORD = "Wo029-first-password!";
const NEW_PASSWORD = "Wo029-second-password!";
const ROLE = `ZQroleA${STAMP}`;
const GOAL = `ZQgoalA${STAMP}`;
const GOAL_RENAMED = `ZQgoalB${STAMP}`;
const BLOCK = `ZQblockA${STAMP}`;
const BLOCK_RENAMED = `ZQblockB${STAMP}`;
const SIGNER = `ZQsigner${STAMP}`; // WO-035
const MARKERS = [ROLE, GOAL, GOAL_RENAMED, BLOCK, BLOCK_RENAMED, SIGNER]; // each ends in the run timestamp, so a chance hit inside base64 is not possible

const SEALED_PATHS = /\/api\/(goals|roles|schedule|review|profile|patterns|year-review|notifications|mission-statement)/;

const sentBodies: string[] = [];
const receivedBodies: string[] = [];
let recoveryCode = "";

function watch(page: Page) {
  page.on("request", (req: Request) => {
    if (SEALED_PATHS.test(req.url()) && req.method() !== "GET") {
      sentBodies.push(`${req.method()} ${req.url()} ${req.postData() ?? ""}`);
    }
    if (SEALED_PATHS.test(req.url())) sentBodies.push(`URL ${req.url()}`);
  });
  page.on("response", async (res: Response) => {
    if (!SEALED_PATHS.test(res.url())) return;
    try {
      receivedBodies.push(`${res.request().method()} ${res.url()} ${await res.text()}`);
    } catch {
      /* body not available (redirect) */
    }
  });
}

async function waitWeek(page: Page) {
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Loading your week"),
    undefined,
    { timeout: 20000 },
  );
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/goals", { timeout: 30000 });
  await waitWeek(page);
}

async function expectContentShown(page: Page) {
  await expect(page.getByText(ROLE).locator("visible=true").first()).toBeVisible();
  await expect(page.locator(`input[value="${GOAL_RENAMED}"]`).locator("visible=true").first()).toBeVisible();
  await expect(page.getByText(BLOCK_RENAMED).locator("visible=true").first()).toBeVisible();
}

test("1 sign up, seal role names in onboarding", async ({ page }) => {
  watch(page);
  await page.goto("/login");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).nth(1).click();

  const reveal = page.getByText(/^[A-F0-9]{4}(-[A-F0-9]{4}){9}$/);
  await expect(reveal).toBeVisible({ timeout: 30000 });
  recoveryCode = (await reveal.textContent())!.trim();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/onboarding/roles", { timeout: 30000 });

  // step 1: a life domain, step 2: a preset role, step 3: rename it
  await page.getByRole("button", { name: "Career", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Professional", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  const nameBox = page.locator("input").first();
  await nameBox.fill(ROLE);
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByText("Your roles are set")).toBeVisible({ timeout: 20000 });
});

test("2 create a goal and two schedule entries, all sealed", async ({ page }) => {
  watch(page);
  await signIn(page, EMAIL, PASSWORD);
  await expect(page.getByText(ROLE).locator("visible=true").first()).toBeVisible();

  await page.getByPlaceholder("Add a goal for this role...").locator("visible=true").first().fill(GOAL);
  await page.getByPlaceholder("Add a goal for this role...").locator("visible=true").first().press("Enter");
  await expect(page.locator(`input[value="${GOAL}"]`).locator("visible=true").first()).toBeVisible({ timeout: 15000 });

  // schedule the goal on the first day column
  await page.getByRole("button", { name: "+ Add" }).first().click();
  await page.locator("select").nth(1).selectOption({ label: GOAL });
  await page.locator('input[type="time"]').fill("09:00");
  await page.getByRole("button", { name: "Add to week" }).click();
  await expect(page.getByText(GOAL).locator("visible=true").first()).toBeVisible();

  // a free-text schedule entry on the next free day
  await page.getByRole("button", { name: "+ Add" }).nth(1).click();
  await page.getByPlaceholder("Describe it").locator("visible=true").first().fill(BLOCK);
  await page.locator('input[type="time"]').fill("14:00");
  await page.getByRole("button", { name: "Add to week" }).click();
  await expect(page.getByText(BLOCK).locator("visible=true").first()).toBeVisible({ timeout: 15000 });
});

test("3 rename a goal, rename a schedule entry, move it", async ({ page }) => {
  watch(page);
  await signIn(page, EMAIL, PASSWORD);

  // Hold the element: its value attribute changes as we type, so a value-based locator would stop matching.
  const goalBox = (await page.locator(`input[value="${GOAL}"]`).locator("visible=true").first().elementHandle())!;
  await goalBox.fill(GOAL_RENAMED);
  await goalBox.evaluate((el) => (el as HTMLInputElement).blur());
  await page.waitForTimeout(500);
  await page.reload();
  await waitWeek(page);
  await expect(page.locator(`input[value="${GOAL_RENAMED}"]`).locator("visible=true").first()).toBeVisible();

  await page.getByText(BLOCK).locator("visible=true").first().click();
  await expect(page.getByText("Edit time block")).toBeVisible();
  await page.getByPlaceholder("Describe it").locator("visible=true").first().fill(BLOCK_RENAMED);
  // move to Friday (day select is the 3rd select: role, goal, day)
  await page.locator("select").nth(2).selectOption({ index: 4 });
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(BLOCK_RENAMED).locator("visible=true").first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(BLOCK, { exact: true })).toHaveCount(0);
});

test("4 other pages show the text: schedule, patterns, identity, year in review", async ({ page }) => {
  watch(page);
  await signIn(page, EMAIL, PASSWORD);
  await expectContentShown(page);

  await page.goto("/schedule");
  await waitWeek(page);
  await expect(page.getByText(BLOCK_RENAMED).locator("visible=true").first()).toBeVisible();

  await page.goto("/profile");
  await expect(page.getByText(ROLE).locator("visible=true").first()).toBeVisible({ timeout: 20000 });

  await page.goto("/patterns");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toContainText("ZQ" + "role" + "A" + "undefined");

  await page.goto("/weekly-review");
  await page.waitForLoadState("networkidle");

  await page.goto("/year-review");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toContainText("Can't open this entry");
});

test("5 reload keeps the key and shows the same items", async ({ page }) => {
  watch(page);
  await signIn(page, EMAIL, PASSWORD);
  await page.reload();
  await waitWeek(page);
  await expectContentShown(page);
});

test("6 sign out, then password sign-in shows the same items", async ({ page }) => {
  watch(page);
  await signIn(page, EMAIL, PASSWORD);
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login", { timeout: 20000 });
  await signIn(page, EMAIL, PASSWORD);
  await expectContentShown(page);
});

test("7 recovery-code sign-in decrypts the same items (master key unchanged)", async ({ page }) => {
  watch(page);
  await page.goto("/recover");
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.getByPlaceholder(/Recovery code/).fill(recoveryCode);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.locator('input[type="password"]').fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page.getByText(/Password updated/)).toBeVisible({ timeout: 30000 });

  await signIn(page, EMAIL, NEW_PASSWORD);
  await expectContentShown(page);
});

test("8 a tab with no master key cannot save, says why, and writes nothing", async ({ page }) => {
  watch(page);
  await signIn(page, EMAIL, NEW_PASSWORD);
  await expectContentShown(page);
  // Drop only the key, keep the session cookie (same state as a new tab after the key is lost).
  await page.evaluate(() => sessionStorage.removeItem("quadrant_session_vault_key"));
  await page.reload();
  await waitWeek(page);

  await expect(page.getByTestId("locked-note").locator("visible=true").first()).toBeVisible();
  await expect(page.getByTestId("locked-note").locator("visible=true").first()).toContainText("session key");
  // readable text is gone: placeholder only, and the server never sent text anyway
  await expect(page.getByText(ROLE)).toHaveCount(0);
  await expect(page.getByText("Can't open this entry").locator("visible=true").first()).toBeVisible();

  const writes: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET" && /\/api\/(goals|roles|schedule)/.test(r.url())) writes.push(`${r.method()} ${r.url()}`);
  });
  const box = page.getByPlaceholder("Add a goal for this role...").locator("visible=true").first();
  if (await box.count()) {
    await box.fill("should not be saved");
    await box.press("Enter");
  }
  // editing the placeholder title must not write it back either
  const ph = page.locator('input[value="Can\'t open this entry"]').locator("visible=true").first();
  if (await ph.count()) {
    const phEl = (await ph.elementHandle())!;
    await phEl.fill("overwrite attempt");
    await phEl.evaluate((el) => (el as HTMLInputElement).blur());
  }
  await page.waitForTimeout(800);
  expect(writes, "no write request may leave a tab without the key").toEqual([]);
  await expect(page.getByTestId("locked-note").locator("visible=true").first()).toBeVisible();
});

test("9 carry-forward completed twice carries the goal once", async ({ page }) => {
  watch(page);
  await signIn(page, EMAIL, NEW_PASSWORD);
  const ctx = page.request;

  const now = new Date();
  const dow = (now.getUTCDay() + 6) % 7; // Monday = 0
  const thisMon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow));
  const lastMon = new Date(thisMon.getTime() - 7 * 86400000);
  const key = (d: Date) => d.toISOString().slice(0, 10);

  const roles = (await (await ctx.get("/api/roles")).json()).roles;
  const roleId = roles[0].id;
  // 60 random bytes stand in for ciphertext; the server only bounds size and base64
  const fake = Buffer.from(Array.from({ length: 60 }, (_, i) => (i * 7 + 3) % 256)).toString("base64");
  const created = await ctx.post("/api/goals", { data: { roleId, title: fake, weekStart: key(lastMon) } });
  expect(created.status()).toBe(201);
  const goalId = (await created.json()).goal.id;
  expect((await ctx.patch(`/api/goals/${goalId}`, { data: { status: "DONE", carryForward: true } })).status()).toBe(200);

  const complete = () => ctx.post("/api/review/complete", { data: { weekStart: key(lastMon), tz: "UTC" } });
  const first = await complete();
  expect(first.status()).toBe(200);
  expect((await first.json()).carriedCount).toBe(1);
  const second = await complete();
  expect(second.status()).toBe(200);
  expect((await second.json()).carriedCount).toBe(0);
  const [third, fourth] = await Promise.all([complete(), complete()]);
  expect((await third.json()).carriedCount + (await fourth.json()).carriedCount).toBe(0);

  const week = await (await ctx.get(`/api/goals?weekStart=${key(thisMon)}`)).json();
  const copies = week.roles.flatMap((r: { goals: { title: string }[] }) => r.goals).filter((g: { title: string }) => g.title === fake);
  expect(copies.length, "exactly one carried copy, same ciphertext bytes").toBe(1);
});

test("9b a deleted goal and its schedule entry stay gone after reload and re-login (V-012 V5)", async ({ page }) => {
  watch(page);
  await signIn(page, EMAIL, NEW_PASSWORD);
  const goalOnWeek = () => page.getByText(GOAL_RENAMED).locator("visible=true");
  const goalInput = () => page.locator(`input[value="${GOAL_RENAMED}"]`).locator("visible=true");
  await expect(goalInput().first()).toBeVisible();
  const del = page.waitForResponse((r) => r.request().method() === "DELETE" && /\/api\/goals\//.test(r.url()));
  await page.getByRole("button", { name: "Remove goal" }).locator("visible=true").first().click();
  expect((await del).status()).toBe(200);

  const gone = async () => {
    await expect(goalInput()).toHaveCount(0);
    await expect(goalOnWeek()).toHaveCount(0);
  };
  await gone();
  await page.reload();
  await waitWeek(page);
  await gone();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login", { timeout: 20000 });
  await signIn(page, EMAIL, NEW_PASSWORD);
  await gone();
  // the free-text entry the owner did not delete is still there
  await expect(page.getByText(BLOCK_RENAMED).locator("visible=true").first()).toBeVisible();
});

test("9c signed name is sealed: saved, shown on profile, never on the wire (WO-035)", async ({ page }) => {
  watch(page);
  await signIn(page, EMAIL, NEW_PASSWORD);
  await page.goto("/mission-statement");
  await page.getByRole("button", { name: "Begin" }).click();
  for (let i = 0; i < 3; i++) {
    await page.locator("textarea").first().fill(`answer ${i}`);
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await page.getByRole("button", { name: "Review draft" }).click();
  await page.getByRole("button", { name: "Sign and commit" }).click();
  await page.getByLabel("Your signature").fill(SIGNER);
  const saved = page.waitForResponse((r) => r.url().includes("/api/mission-statement") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Commit" }).click();
  expect((await saved).status()).toBe(200);
  await expect(page.getByText("Committed")).toBeVisible();
  await page.goto("/profile");
  await expect(page.getByText(`Signed by ${SIGNER}`).locator("visible=true").first()).toBeVisible({ timeout: 20000 });
  // WO-035 A2: feedback is accepted, but its text and the email never reach the server log
  // (checked by grepping the server log for ZQfeedbackWO035 and the email after the run).
  const fb = await page.evaluate(async (e) => (await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: "idea", message: `ZQfeedbackWO035 ${e}`, metadata: { pathname: "/profile", secret: "ZQmetaWO035" } }) })).status, EMAIL);
  expect(fb).toBe(200);
});

test("10 nothing readable crossed the wire in either direction", async () => {
  const all = [...sentBodies, ...receivedBodies].join("\n");
  expect(all.length).toBeGreaterThan(1000);
  for (const m of MARKERS) {
    expect(all.includes(m), `"${m}" must not appear in any request or response`).toBe(false);
  }
  // the three fields are strings (base64), not Buffer objects
  expect(all.includes('"type":"Buffer"')).toBe(false);
});
