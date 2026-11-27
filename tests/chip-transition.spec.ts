/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import path from "node:path";

// WO-129: needs no server or login. Bundles the real hook into a blank page and drives it with real timers.
const hook = path.join(__dirname, "../hooks/useChipTransition.ts").replace(/\\/g, "/");
const entry = `
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useChipTransition } from "${hook}";
const A = [{ id: "a" }, { id: "b" }];
function App() {
  const [on, setOn] = useState<string[]>(["a", "b"]);
  const [ready] = useState(true);
  const items = React.useMemo(() => A.filter((x) => on.includes(x.id)), [on]);
  const chips = useChipTransition(items, ready);
  (window as any).toggle = (id: string) => setOn((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  return <div id="out">{chips.length === 0 ? "HINT" : chips.map((c) => c.item.id + ":" + c.state).join(",")}</div>;
}
createRoot(document.body.appendChild(document.createElement("div"))).render(<App />);
`;

async function mount(page: import("@playwright/test").Page, reduced: boolean) {
  const { outputFiles } = await build({
    stdin: { contents: entry, resolveDir: path.join(__dirname, ".."), loader: "tsx" },
    bundle: true, write: false, format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' },
  });
  await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
  await page.setContent("<body></body>");
  await page.addScriptTag({ content: outputFiles[0].text });
  await expect(page.locator("#out")).toHaveText("a:,b:");
}
const toggle = (page: import("@playwright/test").Page, id: string) => page.evaluate((i) => (window as any).toggle(i), id);

for (const width of [390, 1440]) {
  test(`quick removal of both badges ends with the hint (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await mount(page, false);
    await toggle(page, "a");
    await page.waitForTimeout(50);
    await toggle(page, "b"); // second removal inside the first one's leave time
    await expect(page.locator("#out")).toHaveText("HINT", { timeout: 2000 });
  });
}

test("5 rapid toggles then both off ends with the hint", async ({ page }) => {
  await mount(page, false);
  for (let i = 0; i < 5; i++) { await toggle(page, "a"); await page.waitForTimeout(30); }
  await toggle(page, "b");
  await expect(page.locator("#out")).toHaveText("HINT", { timeout: 2000 });
});

test("reduced motion: chips drop at once", async ({ page }) => {
  await mount(page, true);
  await toggle(page, "a");
  await toggle(page, "b");
  await expect(page.locator("#out")).toHaveText("HINT", { timeout: 200 });
});
