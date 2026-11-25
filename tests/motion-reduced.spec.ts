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

// WO-108: new motions run at 3x (--m-scale); reduced motion must still end them at once.
const wo108 = `<style>${css}</style><div id="e" class="row-wrap" data-entering="true"><i>a</i></div><div id="l" class="row-wrap" data-leaving="true"><i>a</i></div><div id="f" class="sched-form"><i>a</i></div><div data-done="true"><span id="s" class="goal-strike">t</span></div><button id="b" class="badge-tile press">b</button><div id="c" class="chip-enter">c</div>`;
const dur = (page: import("@playwright/test").Page, id: string, pseudo = "") =>
  page.evaluate(([i, p]) => { const s = getComputedStyle(document.getElementById(i)!, p || null); return [s.animationDuration, s.transitionDuration]; }, [id, pseudo]);

test("WO-108 motions: 3x slower normally, instant under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setContent(wo108);
  expect((await dur(page, "e"))[0]).toBe("0.66s");
  expect((await dur(page, "l"))[0]).toBe("0.6s");
  expect((await dur(page, "s", "::after"))[1]).toBe("0.66s");
  expect((await dur(page, "c"))[0]).toBe("0.66s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [id, p] of [["e", ""], ["l", ""], ["f", ""], ["s", "::after"], ["b", ""], ["c", ""]]) {
    const [a, t] = await dur(page, id, p);
    expect([...a.split(","), ...t.split(",")].every((d) => parseFloat(d) < 0.001)).toBe(true);
  }
});
