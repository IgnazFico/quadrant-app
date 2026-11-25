import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Needs no dev server: loads the real globals.css into a blank page.
const css = fs.readFileSync(path.join(__dirname, "../src/app/globals.css"), "utf8");
const html = `<style>${css}</style><div id="a" class="page-enter">x</div><div id="r" class="role-body" data-open="false"><div>y</div></div>`;

async function times(page: import("@playwright/test").Page) {
  return page.evaluate(() => ({
    anim: getComputedStyle(document.getElementById("a")!).animationDuration,
    trans: getComputedStyle(document.getElementById("r")!).transitionDuration,
  }));
}

test("reduced motion cuts animation and transition time to 0.01 ms", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setContent(html);
  const t = await times(page);
  expect(parseFloat(t.anim)).toBeCloseTo(0.00001, 6); // browsers print 1e-05s
  expect(t.trans.split(",").every((d) => parseFloat(d) < 0.001)).toBe(true);
});

test("without the setting the page enter animation keeps its length", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setContent(html);
  expect(parseFloat((await times(page)).anim)).toBeGreaterThan(0.01);
});

test("a closed role card is hidden from layout measuring", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setContent(html);
  expect(await page.evaluate(() => getComputedStyle(document.getElementById("r")!).visibility)).toBe("hidden");
});
