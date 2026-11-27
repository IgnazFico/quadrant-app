import { test, expect, type Locator, type Page } from "@playwright/test";
import { loginAsSeededUser } from "./helpers/auth";

/**
 * WO-140 (card C6): the ID card on /profile — flip, avatar editor, name.
 * Requires the seeded staging user — see prisma/seed.ts. Excluded from the
 * "smoke" CI project (playwright.config.ts), same reason as the other
 * desktop specs: it needs a real seeded backend. Run with `--project=e2e`.
 *
 * Serial: every test drives the one seeded account, and the tests that save a
 * card put it back to blank (Start over, Save), so re-runs stay clean.
 *
 * Desktop scopes to the visible card container; the phone page is also in the
 * DOM but hidden (IdentityPage.tsx mounts both).
 */
test.describe.configure({ mode: "serial" });

const phoneView = (page: Page) => page.locator(".md\\:hidden");
const desktopView = (page: Page) => page.locator(".hidden.md\\:block");
const flipCard = (view: Locator) => view.getByRole("button", { name: "Flip card" });
const editAvatar = (view: Locator) => view.getByRole("button", { name: "Edit avatar" });
const cardAvatar = (view: Locator) => editAvatar(view).getByRole("img", { name: "Your avatar" });
// The only .truncate inside the card is the name line.
const frontName = (view: Locator) => flipCard(view).locator(".truncate").first();
const dialog = (page: Page) => page.getByRole("dialog", { name: "Your card" });

async function openProfile(page: Page) {
  await loginAsSeededUser(page);
  await page.goto("/profile");
  await expect(page.getByText("Quadrant ID").locator("visible=true").first()).toBeVisible({
    timeout: 20000,
  });
}

async function saveCard(page: Page, dlg: Locator) {
  const put = page.waitForResponse(
    (r) => r.url().includes("/api/profile/card") && r.request().method() === "PUT",
  );
  await dlg.getByRole("button", { name: "Save" }).click();
  expect((await put).status()).toBe(200);
  await expect(dlg).toHaveCount(0);
}

/** Leaves the seeded user with no avatar and no name. */
async function clearCard(page: Page, view: Locator) {
  await editAvatar(view).click();
  const dlg = dialog(page);
  await dlg.getByRole("button", { name: "Start over" }).click();
  await saveCard(page, dlg);
}

test.describe("avatar card, phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("shows the silhouette on the card front", async ({ page }) => {
    await openProfile(page);
    const view = phoneView(page);
    await expect(cardAvatar(view)).toBeVisible();
    // The silhouette body path; a saved card would replace it with pieces.
    expect(await cardAvatar(view).innerHTML()).toContain("M56 58 V74");
  });

  test("tapping the circle opens the editor and does not flip the card", async ({ page }) => {
    await openProfile(page);
    const view = phoneView(page);
    await editAvatar(view).click();
    const dlg = dialog(page);
    await expect(dlg).toBeVisible();
    await expect(dlg).toContainText("Your card");
    await expect(page.getByText("\u21bb Tap the card to flip it")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dlg).toHaveCount(0);
  });

  test("tapping the card front flips it", async ({ page }) => {
    await openProfile(page);
    const view = phoneView(page);
    await flipCard(view).getByText("Quadrant ID").click();
    await expect(page.getByText("Tap the card to flip it back")).toBeVisible();
  });

  test("shuffle, Hair 2 and a name survive a save and a reload", async ({ page }) => {
    await openProfile(page);
    const view = phoneView(page);
    const silhouette = await cardAvatar(view).innerHTML();

    await editAvatar(view).click();
    const dlg = dialog(page);
    const preview = dlg.getByRole("img", { name: "Your avatar" });
    const before = await preview.innerHTML();
    let changed = false;
    // A shuffle can land on the current codes, so try a few.
    for (let i = 0; i < 5 && !changed; i++) {
      await dlg.getByRole("button", { name: "Shuffle" }).click();
      changed = (await preview.innerHTML()) !== before;
    }
    expect(changed, "a shuffle changes the preview").toBe(true);

    await dlg.getByRole("tab", { name: "Hair" }).click();
    const hair2 = dlg.getByRole("radio", { name: "Hair 2" });
    await hair2.click();
    await expect(hair2).toHaveAttribute("aria-checked", "true");
    await dlg.getByLabel("Name").fill("Sam");
    await saveCard(page, dlg);

    // The master key survives a reload (sealed-titles test 5), so the card opens again.
    await page.reload();
    await expect(frontName(view)).toHaveText("Sam", { timeout: 20000 });
    expect(await cardAvatar(view).innerHTML(), "the saved avatar is not the silhouette").not.toBe(
      silhouette,
    );

    await clearCard(page, view);
  });

  test("Esc and Cancel close the editor without saving", async ({ page }) => {
    await openProfile(page);
    const view = phoneView(page);
    const name = await frontName(view).innerText();

    await editAvatar(view).click();
    await dialog(page).getByLabel("Name").fill("Not saved");
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
    await expect(frontName(view)).toHaveText(name);

    await editAvatar(view).click();
    await dialog(page).getByLabel("Name").fill("Not saved either");
    await dialog(page).getByRole("button", { name: "Cancel" }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(frontName(view)).toHaveText(name);
  });

  test("name limit: 30 accepted, 31 rejected, whitespace clears", async ({ page }) => {
    await openProfile(page);
    const view = phoneView(page);
    const initial = await frontName(view).innerText();
    const max = "W".repeat(30);

    await editAvatar(view).click();
    await dialog(page).getByLabel("Name").fill(max);
    await saveCard(page, dialog(page));
    await expect(frontName(view)).toHaveText(max);

    await editAvatar(view).click();
    const dlg = dialog(page);
    await dlg.getByLabel("Name").fill(max + "W");
    await expect(dlg.getByText("Up to 30 characters")).toBeVisible();
    await expect(dlg.getByRole("button", { name: "Save" })).toBeDisabled();

    await dlg.getByLabel("Name").fill("   ");
    await expect(dlg.getByRole("button", { name: "Save" })).toBeEnabled();
    await saveCard(page, dlg);
    await expect(frontName(view)).toHaveText(initial);

    await clearCard(page, view);
  });

  test("a 30-character name stays inside the card on a phone", async ({ page }) => {
    await openProfile(page);
    const view = phoneView(page);
    const max = "W".repeat(30);
    await editAvatar(view).click();
    await dialog(page).getByLabel("Name").fill(max);
    await saveCard(page, dialog(page));

    await expect(frontName(view)).toHaveText(max);
    const cardBox = (await flipCard(view).boundingBox())!;
    const nameBox = (await frontName(view).boundingBox())!;
    expect(nameBox.x).toBeGreaterThanOrEqual(cardBox.x - 1);
    expect(nameBox.x + nameBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 1);

    await clearCard(page, view);
  });

  test("keyboard: focus stays in the dialog, Esc returns it, tiles are 44px", async ({ page }) => {
    await openProfile(page);
    const view = phoneView(page);
    await editAvatar(view).click();
    const dlg = dialog(page);
    await expect(dlg).toBeVisible();

    for (const radio of await dlg.getByRole("radio").all()) {
      const box = (await radio.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    for (let i = 0; i < 60; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
      expect(inside, `focus left the dialog after Tab ${i + 1}`).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(dlg).toHaveCount(0);
    await expect(editAvatar(view)).toBeFocused();
  });

  test("editing sends no request until Save", async ({ page }) => {
    await openProfile(page);
    const view = phoneView(page);
    await editAvatar(view).click();
    const dlg = dialog(page);
    await expect(dlg).toBeVisible();

    const requests: string[] = [];
    page.on("request", (r) => requests.push(`${r.method()} ${r.url()}`));
    await dlg.getByRole("button", { name: "Shuffle" }).click();
    for (const tab of ["Face", "Hair", "Cover", "Extra"]) {
      await dlg.getByRole("tab", { name: tab }).click();
    }
    await page.waitForTimeout(300);
    expect(requests).toEqual([]);

    await saveCard(page, dlg);
    expect(requests.length).toBe(1);
    expect(requests[0]).toMatch(/^PUT .*\/api\/profile\/card$/);

    await clearCard(page, view);
  });

  test("the editor uses no pricing words", async ({ page }) => {
    await openProfile(page);
    await editAvatar(phoneView(page)).click();
    const text = await dialog(page).innerText();
    expect(text).not.toMatch(/price|premium|lock|\$/i);
    expect(text).not.toMatch(/\bfree\b/i);
    expect(text).not.toMatch(/\bnew\b/i);
  });
});

// Desktop repeats only the card-front tests: the editor behaves the same at both
// widths, and running it twice just doubles the run against one seeded account.
test.describe("avatar card, desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("shows the silhouette on the card front", async ({ page }) => {
    await openProfile(page);
    const view = desktopView(page);
    await expect(cardAvatar(view)).toBeVisible();
    expect(await cardAvatar(view).innerHTML()).toContain("M56 58 V74");
  });

  test("the circle opens the editor and the card does not flip", async ({ page }) => {
    await openProfile(page);
    const view = desktopView(page);
    const card = flipCard(view);
    // backface-visibility:hidden does not hide the back from Playwright's
    // visibility check, so the flip is asserted on the transform instead.
    await expect(card).toHaveCSS("transform", "none");
    await editAvatar(view).click();
    await expect(dialog(page)).toBeVisible();
    await expect(card).toHaveCSS("transform", "none");
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
  });

  test("tapping the card front flips it", async ({ page }) => {
    await openProfile(page);
    const card = flipCard(desktopView(page));
    await card.getByText("Quadrant ID").click();
    await expect(card).not.toHaveCSS("transform", "none");
  });
});
