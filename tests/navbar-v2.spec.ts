/**
 * WO-022 / NB-4 prototype checks for the phone bottom bar v2 (icons only,
 * 72 px, #EA580C, filled swap, sliding pill). Items a, b, c, d, e, f, h of
 * the NB-4 SUCCESS SIGNAL (outputs/WO-021-navbar-design-v2.md section 9).
 * Item g (WO-020 flow spec) is tests/navbar-focused-flows.spec.ts.
 *
 * Environment: the seeded staging user (tests/helpers/auth.ts), read only.
 * Run against `next start` of a production build.
 *   NAVBAR_SHOTS  screenshot dir   (default test-results/navbar-v2-shots)
 *   NAVBAR_LOG    JSONL log        (default test-results/navbar-v2-measure.jsonl)
 *   NAVBAR_BEFORE=1  measure only, for the OLD 66 px bar (no assertions, no
 *                    v2-only tests). Used to take the "before" numbers with
 *                    the same code as the "after" numbers.
 */
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { loginAsSeededUser } from "./helpers/auth";

const SHOT_DIR = process.env.NAVBAR_SHOTS ?? "test-results/navbar-v2-shots";
const LOG = process.env.NAVBAR_LOG ?? "test-results/navbar-v2-measure.jsonl";
const BEFORE = !!process.env.NAVBAR_BEFORE;

const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "360x640", width: 360, height: 640 },
];
const PAGES = [
  { name: "week", route: "/goals" },
  { name: "schedule", route: "/schedule" },
  { name: "patterns", route: "/patterns" },
  { name: "profile", route: "/profile" },
  { name: "weekly-review", route: "/weekly-review" },
];
const MIN_CLEAR = 16;

type MeasuredPage = {
  url: string;
  vh: number;
  vw: number;
  navTop: number | null;
  navHeight: number | null;
  navWidth: number | null;
  lowest: { bottom: number; label: string; hit: boolean } | null;
  clear: number | null;
  scrollers: number;
};
type Measured = MeasuredPage & { vp: string; page: string; route: string };

function log(row: unknown) {
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  fs.appendFileSync(LOG, JSON.stringify(row) + "\n");
}

async function settle(page: Page, route: string) {
  await page.goto(route);
  await page.waitForTimeout(2500);
  if (route === "/patterns") {
    await page.getByText("Gathering your patterns").waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
  }
  await page.waitForTimeout(1500);
}

/**
 * Scroll the window and every scrollable container to its end, then report
 * the bar's rect and the lowest visible content. "Content" = leaf elements
 * (text, svg, img, button, input) that are not inside the bar and not
 * position:fixed overlays (toasts), clipped to their scroll containers.
 */
async function measure(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector("nav.fixed") as HTMLElement | null;
    const navRect = nav?.getBoundingClientRect();
    const scrollers = [document.scrollingElement as HTMLElement, ...Array.from(document.querySelectorAll<HTMLElement>("*"))].filter((el) => {
      if (el === document.scrollingElement) return true;
      const cs = getComputedStyle(el);
      return /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1;
    });
    for (const s of scrollers) s.scrollTop = s.scrollHeight;
    return new Promise<unknown>((resolve) => {
      setTimeout(() => {
        const leaves = Array.from(document.body.querySelectorAll<HTMLElement>("*")).filter((el) => {
          if (nav?.contains(el)) return false;
          if (el.closest("[aria-live]")) return false;
          const tag = el.tagName.toLowerCase();
          if (["script", "style", "noscript", "path", "rect", "circle", "line", "polyline", "g", "defs", "linearGradient", "stop"].includes(tag)) return false;
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) === 0) return false;
          for (let p: HTMLElement | null = el; p && p !== document.body; p = p.parentElement) {
            if (getComputedStyle(p).position === "fixed" && p !== el && !p.matches("[class*='overflow-y-auto']")) {
              // inside a fixed overlay that is not the patterns scroller
              if (!/(auto|scroll)/.test(getComputedStyle(p).overflowY)) return false;
            }
          }
          const hasOwnText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent || "").trim());
          const isMedia = ["svg", "img", "canvas", "input", "textarea", "select"].includes(tag);
          return hasOwnText || isMedia;
        });
        let best: { bottom: number; label: string; hit: boolean } | null = null;
        for (const el of leaves) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          // ignore anything scrolled out of view (not at the end of a scroller)
          if (r.bottom > window.innerHeight || r.top < 0) {
            // below the viewport: it is not reachable at the end of scroll
            if (r.top >= window.innerHeight) continue;
          }
          if (!best || r.bottom > best.bottom) {
            const hit = document.elementFromPoint(r.left + r.width / 2, Math.min(r.top + r.height / 2, window.innerHeight - 1));
            best = { bottom: r.bottom, label: (el.textContent || el.tagName).trim().slice(0, 40), hit: !!hit && (el === hit || el.contains(hit) || hit.contains(el)) };
          }
        }
        resolve({
          url: location.pathname,
          vh: window.innerHeight,
          vw: window.innerWidth,
          navTop: navRect?.top ?? null,
          navHeight: navRect?.height ?? null,
          navWidth: navRect?.width ?? null,
          lowest: best,
          clear: best && navRect ? navRect.top - best.bottom : null,
          scrollers: scrollers.length,
        });
      }, 400);
    });
  });
}

for (const vp of VIEWPORTS) {
  test.describe(`bar v2 ${vp.name}`, () => {
    test.use({
      viewport: { width: vp.width, height: vp.height },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
      timezoneId: "Asia/Jakarta",
    });

    test(`a, b: equal bar, end of scroll clear (five pages) ${vp.name}`, async ({ page }) => {
      test.setTimeout(240_000);
      await loginAsSeededUser(page);
      const rows: Measured[] = [];
      for (const p of PAGES) {
        await settle(page, p.route);
        const dir = path.join(SHOT_DIR, vp.name);
        fs.mkdirSync(dir, { recursive: true });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(dir, `${p.name}-top.png`) });
        const m = (await measure(page)) as MeasuredPage;
        await page.screenshot({ path: path.join(dir, `${p.name}-end.png`) });
        const row: Measured = { vp: vp.name, page: p.name, route: p.route, ...m };
        rows.push(row);
        log({ kind: BEFORE ? "before" : "after", ...row });
      }
      if (BEFORE) return;
      const ref = rows[0];
      for (const r of rows) {
        const where = `${vp.name} ${r.page} (landed on ${r.url})`;
        expect.soft(r.navHeight, `${where} bar height`).toBe(72);
        expect.soft(r.navTop, `${where} bar top equals the first page`).toBe(ref.navTop);
        expect.soft((r.navTop ?? 0) + (r.navHeight ?? 0), `${where} bar bottom at viewport bottom`).toBe(r.vh);
        expect.soft(r.clear ?? -1, `${where} lowest content "${r.lowest?.label}" clear of the bar`).toBeGreaterThanOrEqual(MIN_CLEAR);
        expect.soft(r.lowest?.hit, `${where} nothing covers the lowest content`).toBe(true);
      }
    });
  });
}

test.describe("bar v2 details (360 px)", () => {
  test.skip(BEFORE, "v2 only");
  test.use({
    viewport: { width: 360, height: 640 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    timezoneId: "Asia/Jakarta",
  });

  test("c, e, f: contrast from rendered colours, hit areas, names, aria-current", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsSeededUser(page);
    await settle(page, "/profile");
    const d = await page.evaluate(() => {
      const nav = document.querySelector('nav.bn') as HTMLElement;
      const tabs = Array.from(nav.querySelectorAll<HTMLAnchorElement>("a"));
      const pill = nav.querySelector(".bn-pill") as HTMLElement;
      return {
        barBg: getComputedStyle(nav).backgroundColor,
        pillBg: getComputedStyle(pill, "::after").backgroundColor,
        tabs: tabs.map((a) => {
          const r = a.getBoundingClientRect();
          return {
            name: a.getAttribute("aria-label"),
            text: (a.textContent || "").trim(),
            current: a.getAttribute("aria-current"),
            color: getComputedStyle(a).color,
            w: r.width,
            h: r.height,
            offOpacity: getComputedStyle(a.querySelector(".bn-off")!).opacity,
            onOpacity: getComputedStyle(a.querySelector(".bn-on")!).opacity,
          };
        }),
      };
    });
    const lum = (rgb: string) => {
      const [r, g, b] = rgb.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    const sel = d.tabs.find((t) => t.current === "page")!;
    const idle = d.tabs.filter((t) => t.current !== "page");
    const out = {
      kind: "c-e-f",
      barBg: d.barBg,
      pillBg: d.pillBg,
      selectedColor: sel.color,
      idleColor: idle[0].color,
      selectedOnBar: +ratio(sel.color, d.barBg).toFixed(2),
      selectedOnPill: +ratio(sel.color, d.pillBg).toFixed(2),
      idleOnBar: +ratio(idle[0].color, d.barBg).toFixed(2),
      tabs: d.tabs,
    };
    log(out);
    expect(out.selectedOnBar, "selected icon on bar").toBeGreaterThanOrEqual(3);
    expect(out.selectedOnPill, "selected icon on pill").toBeGreaterThanOrEqual(3);
    expect(out.idleOnBar, "idle icon on bar").toBeGreaterThanOrEqual(3);
    // e: hit areas
    for (const t of d.tabs) {
      expect(t.w, `${t.name} width`).toBeGreaterThanOrEqual(44);
      expect(t.h, `${t.name} height`).toBeGreaterThanOrEqual(44);
    }
    // f: names, exactly one aria-current, a non-colour cue (filled swap)
    expect(d.tabs.map((t) => t.name)).toEqual(["This week", "Schedule", "Patterns", "Profile"]);
    expect(d.tabs.every((t) => t.text === "")).toBe(true); // icons only
    expect(d.tabs.filter((t) => t.current === "page")).toHaveLength(1);
    expect(sel.name).toBe("Profile");
    expect(sel.onOpacity).toBe("1");
    expect(sel.offOpacity).toBe("0");
    for (const t of idle) {
      expect(t.onOpacity, `${t.name} idle shows outline`).toBe("0");
      expect(t.offOpacity).toBe("1");
    }
  });

  test("d: reduced motion shows no movement; normal motion does", async ({ page }) => {
    test.setTimeout(150_000);
    await loginAsSeededUser(page);
    await settle(page, "/goals");

    async function probe() {
      // computed durations, a pressed-state check, and a pill x-trace after a tap
      const durations = await page.evaluate(() => {
        const q = (s: string) => getComputedStyle(document.querySelector(s)!);
        return {
          pill: q(".bn-pill").transitionDuration,
          tab: q(".bn-tab").transitionDuration,
          ic: q(".bn-ic").transitionDuration,
          svg: q(".bn-ic svg").transitionDuration,
          animation: q(".bn-pill").animationName,
        };
      });
      // press: hold the mouse on tab 2, read the icon transform, release off the tab
      const tab = page.locator('nav.bn a[aria-label="Schedule"]');
      const box = (await tab.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(250);
      const pressed = await tab.locator(".bn-ic").evaluate((el) => getComputedStyle(el).transform);
      await page.mouse.move(2, 2);
      await page.mouse.up();
      await page.waitForTimeout(250);
      // trace the pill x for 600 ms after a real tap on Schedule
      await page.evaluate(() => {
        const pill = document.querySelector(".bn-pill") as HTMLElement;
        const xs: number[] = [];
        (window as unknown as { __trace: number[] }).__trace = xs;
        const t0 = performance.now();
        const tick = () => {
          xs.push(Math.round(pill.getBoundingClientRect().left * 10) / 10);
          if (performance.now() - t0 < 600) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await tab.tap();
      await page.waitForTimeout(900);
      const trace = (await page.evaluate(() => (window as unknown as { __trace: number[] }).__trace));
      const distinct = Array.from(new Set(trace));
      const current = await page.locator('nav.bn a[aria-current="page"]').getAttribute("aria-label");
      return { durations, pressed, distinctPillX: distinct.length, firstX: trace[0], lastX: trace[trace.length - 1], current };
    }

    const normal = await probe();
    log({ kind: "d-normal", ...normal });
    await settle(page, "/goals");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const reduced = await probe();
    log({ kind: "d-reduced", ...reduced });

    // normal: motion exists (control, so the zero below means something)
    expect(normal.durations.pill).toBe("0.22s, 0.16s"); // transform, opacity
    expect(normal.durations.ic).toBe("0.09s");
    expect(normal.durations.svg).toBe("0.16s");
    expect(normal.pressed).not.toBe("none");
    expect(normal.distinctPillX, "pill slides through intermediate x values").toBeGreaterThan(3);
    // reduced: nothing moves, selection still changes at once
    for (const [k, v] of Object.entries(reduced.durations)) {
      if (k === "animation") expect(v).toBe("none");
      else expect(v, `reduced ${k} duration`).toBe("0s");
    }
    expect(reduced.pressed).toBe("none");
    expect(reduced.distinctPillX, "pill jumps: at most start and end x").toBeLessThanOrEqual(2);
    expect(reduced.current).toBe("Schedule");
  });

  test("h: filled and outline icons keep a 2 px inset of the 24 px box (rendered, 20x)", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsSeededUser(page);
    await settle(page, "/profile");
    const rows = await page.evaluate(async () => {
      const S = 20;
      const out: { icon: string | null; state: string; left: number; top: number; right: number; bottom: number; ink: number }[] = [];
      const tabs = Array.from(document.querySelectorAll<HTMLAnchorElement>('nav.bn a'));
      for (const a of tabs) {
        for (const state of ["on", "off"] as const) {
          const svg = a.querySelector(`.bn-${state}`) as SVGElement;
          const inner = svg.innerHTML;
          // same paint rules as bottomNav.css, written inline so the image is self-contained
          const css =
            state === "on"
              ? "svg *{fill:#000;stroke:#000;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.cut{stroke:#000;fill:none}"
              : "svg *{fill:none;stroke:#000;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}";
          const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${24 * S}" height="${24 * S}"><style>${css}</style>${inner}</svg>`;
          const img = new Image();
          img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
          await img.decode();
          const c = document.createElement("canvas");
          c.width = c.height = 24 * S;
          const ctx = c.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
          let x0 = width, y0 = height, x1 = -1, y1 = -1, ink = 0;
          for (let y = 0; y < height; y++)
            for (let x = 0; x < width; x++) {
              if (data[(y * width + x) * 4 + 3] > 8) {
                ink++;
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
              }
            }
          out.push({
            icon: a.getAttribute("aria-label"),
            state: state === "on" ? "filled" : "outline",
            left: x0 / S,
            top: y0 / S,
            right: (width - 1 - x1) / S,
            bottom: (height - 1 - y1) / S,
            ink: Math.round(ink / (S * S)),
          });
        }
      }
      return out;
    });
    for (const r of rows) log({ kind: "h", ...r });
    expect(rows).toHaveLength(8);
    for (const r of rows) {
      const where = `${r.icon} ${r.state}`;
      expect(r.left, `${where} left`).toBeGreaterThanOrEqual(2);
      expect(r.top, `${where} top`).toBeGreaterThanOrEqual(2);
      expect(r.right, `${where} right`).toBeGreaterThanOrEqual(2);
      expect(r.bottom, `${where} bottom`).toBeGreaterThanOrEqual(2);
    }
  });
});

test.describe("bar v2 shared height (source)", () => {
  test.skip(BEFORE, "v2 only");
  test("every reader uses --bar-clear and none keeps an old number", () => {
    const read = (f: string) => fs.readFileSync(f, "utf8");
    const g = read("src/app/globals.css");
    expect(g).toMatch(/--bar-h:\s*72px/);
    expect(g).toMatch(/--bar-clear:\s*calc\(var\(--bar-h\)\s*\+\s*env\(safe-area-inset-bottom\)\)/);
    const readers = [
      "components/nav/bottomNav.css",
      "components/schedule/schedule.css",
      "components/patterns/PatternsPage.tsx",
      "components/patterns/PatternsPageAlt.tsx",
      "components/toast/Toaster.tsx",
      "components/yearreview/RecapPrompt.tsx",
      "components/goals/WeeklyGoalsPage.tsx",
      "components/profile/ProfilePage.tsx",
      "components/review/WeeklyReviewPage.tsx",
    ];
    for (const f of readers) expect(read(f), `${f} reads --bar-clear`).toContain("--bar-clear");
    const old: [string, RegExp][] = [
      ["components/schedule/schedule.css", /--nav-h|64px/],
      ["components/patterns/PatternsPage.tsx", /"64px"/],
      ["components/patterns/PatternsPageAlt.tsx", /"64px"/],
      ["components/toast/Toaster.tsx", /88px/],
      ["components/yearreview/RecapPrompt.tsx", /bottom-\[76px\]/],
      ["components/goals/WeeklyGoalsPage.tsx", /pb-24/],
      ["components/profile/ProfilePage.tsx", /pb-24/],
      ["components/review/WeeklyReviewPage.tsx", /pb-24|bottom-24/],
    ];
    for (const [f, re] of old) expect(read(f), `${f} has no old height`).not.toMatch(re);
  });
});
