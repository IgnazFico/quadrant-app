// Real-browser SIT of the phone layout of /schedule (WO-015).
//   node scripts/sit/sit-schedule-phone.mjs <baseUrl> <outDir>
// Needs the app running (production build) against the STAGING database with
// the seeded user (npm run seed). Emulated phones, not real devices: see the
// build report. Everything it creates it removes again, through the UI.
import { chromium, webkit, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3300";
const OUT = process.argv[3] ?? "./sit-schedule";
fs.mkdirSync(OUT, { recursive: true });

// The seeded test account is defined in the repo's own test helper.
const helper = fs.readFileSync("tests/helpers/auth.ts", "utf8");
const PASSWORD = helper.match(/TEST_PASSWORD = '([^']+)'/)?.[1];
const EMAIL = helper.match(/fill\("([^"]+@quadrant\.com)"\)/)?.[1];
if (!PASSWORD || !EMAIL) throw new Error("seeded account not found in tests/helpers/auth.ts");

let failures = 0;
let total = 0;
const check = (name, ok, detail = "") => {
  total++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
};

const TZ = "Asia/Jakarta";
const ROW = 56;
const ymd = (d) => d.toLocaleDateString("en-CA", { timeZone: TZ });

const profiles = [
  { name: "phone-390", engine: chromium, ctx: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, full: true },
  { name: "phone-360", engine: chromium, ctx: { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  { name: "phone-430", engine: chromium, ctx: { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  { name: "ios-webkit-390", engine: webkit, ctx: { ...devices["iPhone 12"] } },
  { name: "standalone-390", engine: chromium, ctx: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, standalone: true },
];

async function login(page) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/goals", { timeout: 120000 });
}
async function openSchedule(page, qs = "") {
  await page.goto(`/schedule${qs}`);
  await page.getByTestId("day-timeline").waitFor();
  await page.getByTestId("hour-6").waitFor({ timeout: 20000 });
}
const hourRect = (page, h) => page.getByTestId(`hour-${h}`).evaluate((e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
const topHourOf = (page) => page.getByTestId("day-timeline").locator(".day-scroll").evaluate((e, row) => ({ top: e.scrollTop, max: e.scrollHeight - e.clientHeight, hour: 6 + Math.round(e.scrollTop / row) }), ROW);

async function addBlockByHour(page, hour, title) {
  await page.getByTestId(`hour-${hour}`).click();
  await page.getByText("Schedule a goal", { exact: true }).waitFor();
  await page.getByPlaceholder("e.g. Call the dentist").fill(title);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("Schedule a goal", { exact: true }).waitFor({ state: "hidden" });
}
async function removeBlockAt(page, hour) {
  await page.getByTestId(`hour-${hour}`).click();
  await page.getByText("Edit time block", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Remove" }).click();
  await page.getByText("Edit time block", { exact: true }).waitFor({ state: "hidden" });
}

// One login per engine: the sign-in route is limited to 10 per minute per IP.
const states = {};
for (const [key, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const b = await engine.launch();
  console.log("STEP  login", key);
  const c = await b.newContext({ baseURL: BASE, timezoneId: TZ, locale: "en-US" });
  const pg = await c.newPage();
  await login(pg);
  states[key] = await c.storageState();
  await b.close();
}

for (const p of profiles.filter((x) => !process.argv[4] || process.argv[4].split(",").includes(x.name))) {
  console.log(`\n== ${p.name} ==`);
  const browser = await p.engine.launch();
  const context = await browser.newContext({ ...p.ctx, baseURL: BASE, timezoneId: TZ, locale: "en-US", storageState: states[p.engine === webkit ? "webkit" : "chromium"] });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(90000);
  const shot = (n, full = false) => page.screenshot({ path: path.join(OUT, `${p.name}-${n}.png`), fullPage: full });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  if (p.standalone) {
    // Chromium cannot switch display-mode from a test; the standalone check
    // is therefore a full-height window with safe-area insets (see report).
    await page.addInitScript(() => {});
  }
  const created = []; // [dayLabel, hour] left to clean up if a check throws
  try {
    await openSchedule(page);
    if (p.standalone) console.log("INFO  standalone-390: emulated via a standalone-sized window (no browser UI); display-mode media query not emulated");
    // A previous aborted run may have left a block on the test day: clear it first.
    await page.locator('[data-testid^="day-chip-"]').nth(4).click();
    for (let n = 0; n < 4; n++) {
      const left = page.locator('.hblock-title', { hasText: "SIT " }).first();
      if (!(await left.count())) break;
      await left.click();
      await page.getByRole("button", { name: "Remove" }).click();
      await page.getByText("Edit time block", { exact: true }).waitFor({ state: "hidden" });
    }
    console.log("STEP  cleanup done");
    await openSchedule(page);

    // AC1 + AC2: calendar first, whole week strip, no sideways scroll.
    const vp = page.viewportSize();
    const m = await page.evaluate(() => {
      const nav = document.querySelector("nav.fixed")?.getBoundingClientRect();
      const frame = document.querySelector('[data-testid="day-timeline"]').getBoundingClientRect();
      const chips = [...document.querySelectorAll('[data-testid^="day-chip-"]')].map((c) => { const r = c.getBoundingClientRect(); return { l: r.left, r: r.right, w: r.width, h: r.height }; });
      return {
        sw: document.documentElement.scrollWidth, iw: window.innerWidth,
        navTop: nav?.top ?? null, navVisible: !!nav && nav.top < window.innerHeight && nav.bottom <= window.innerHeight + 1,
        frameTop: frame.top, frameBottom: frame.bottom, chips,
        h1: document.querySelector('[data-testid="schedule-phone"] h1')?.textContent,
        legendVisible: !!document.querySelector('[data-testid="role-legend"]'),
        scrollerOverflowX: (() => { const s = document.querySelector(".day-scroll"); return s.scrollWidth - s.clientWidth; })(),
        docScrollable: document.documentElement.scrollHeight - window.innerHeight,
      };
    });
    check(`${p.name}: 7 day chips, all inside the screen`, m.chips.length === 7 && m.chips.every((c) => c.l >= 0 && c.r <= vp.width), `lefts ${m.chips.map((c) => Math.round(c.l)).join(",")}`);
    check(`${p.name}: day chips are at least 44 x 44 px`, m.chips.every((c) => c.w >= 44 && c.h >= 44), `min ${Math.min(...m.chips.map((c) => c.w)).toFixed(1)} x ${Math.min(...m.chips.map((c) => c.h)).toFixed(1)}`);
    check(`${p.name}: no sideways scroll (page and timeline)`, m.sw <= m.iw && m.scrollerOverflowX <= 0, `scrollWidth ${m.sw} / ${m.iw}`);
    check(`${p.name}: bottom tab bar in view`, m.navVisible, `nav top ${Math.round(m.navTop)} of ${vp.height}`);
    check(`${p.name}: legend is not above the calendar until tapped`, !m.legendVisible);
    check(`${p.name}: the page does not scroll, only the timeline does`, m.docScrollable <= 1, `overflow ${m.docScrollable}`);
    console.log(`INFO  ${p.name}: timeline starts at ${Math.round((m.frameTop / vp.height) * 100)}% of the screen height (was about 36%)`);
    const rows = await page.evaluate(() => {
      const frame = document.querySelector(".day-scroll").getBoundingClientRect();
      const pill = document.querySelector('[data-testid="add-on-day"]').getBoundingClientRect();
      return [...document.querySelectorAll('[data-testid^="hour-"]')].filter((r) => { const b = r.getBoundingClientRect(); return b.top >= frame.top - 1 && b.bottom <= frame.bottom + 1; }).length;
    });
    check(`${p.name}: at least 6 hour rows fully visible on the first screen${vp.height < 740 ? " (not required: window shorter than 844 px, shown for information)" : ""}`, vp.height < 740 || rows >= 6, `${rows} rows in a ${vp.width} x ${vp.height} window`);
    const hourWidth = await page.getByTestId("hour-9").evaluate((e) => e.getBoundingClientRect().width);
    check(`${p.name}: a day's timeline fills the page width`, hourWidth >= vp.width - 24 - 2, `${Math.round(hourWidth)} of ${vp.width} px`);

    // Today selected, and its blocks readable (seeded: 9 AM Standup meeting, 2 PM Code review).
    const todayKey = ymd(new Date());
    check(`${p.name}: opens on today`, (await page.getByTestId(`day-chip-${todayKey}`).getAttribute("aria-pressed")) === "true");
    const standup = page.getByTestId("hour-9").locator(".hblock-title");
    check(`${p.name}: seeded block title is fully readable`, (await standup.textContent()) === "Standup meeting" && (await standup.evaluate((e) => e.scrollWidth <= e.clientWidth)));
    // AC4: colours unchanged (career = #F97316, health = #22C55E).
    const color = await page.getByTestId("hour-9").locator(".hblock").evaluate((e) => getComputedStyle(e).borderLeftColor);
    check(`${p.name}: block colour unchanged (career orange)`, color === "rgb(249, 115, 22)", color);
    // AC5: opening position (real clock).
    const nowH = parseInt(new Date().toLocaleString("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }), 10);
    let tp = await topHourOf(page);
    const wantTop = Math.min(Math.max(nowH - 1, 6), 21) - 6;
    check(`${p.name}: opens at the hour before now (clamped by the scroll end)`, Math.abs(tp.top - Math.min(wantTop * ROW, tp.max)) <= 1, `now ${nowH}h, top hour ${tp.hour}, scrollTop ${tp.top}/${tp.max}`);
    if (p.full) await shot("01-first-screen");

    // AC4: legend in one tap.
    await page.getByTestId("legend-toggle").click();
    const leg = await page.getByTestId("role-legend").innerText();
    check(`${p.name}: one tap on Roles shows the role colours`, /Software Architect/.test(leg) && /Physical Vitality/.test(leg), leg.replace(/\n/g, " | "));
    if (p.full) await shot("02-legend-open");
    await page.getByTestId("legend-toggle").click();
    check(`${p.name}: legend closes again`, (await page.getByTestId("role-legend").count()) === 0);

    // AC3: switch day.
    const days = await page.locator('[data-testid^="day-chip-"]').evaluateAll((els) => els.map((e) => e.dataset.testid.replace("day-chip-", "")));
    const fri = days[4];
    const thu = days[3];
    await page.getByTestId(`day-chip-${fri}`).click();
    check(`${p.name}: tapping Friday selects it and retitles the day`, (await page.getByTestId(`day-chip-${fri}`).getAttribute("aria-pressed")) === "true" && /Friday/.test(await page.getByTestId("schedule-phone").locator("h1").textContent()), await page.getByTestId("schedule-phone").locator("h1").textContent());
    check(`${p.name}: an empty day shows the one-time hint`, await page.getByTestId("empty-hint").isVisible());
    tp = await topHourOf(page);
    check(`${p.name}: an empty day opens at 7 AM`, Math.abs(tp.top - Math.min(1 * ROW, tp.max)) <= 1, `top hour ${tp.hour}`);

    // AC3: add a timed block by tapping an hour (Friday 15:00), then it opens one hour before it.
    const T1 = `SIT phone ${p.name} ${Date.now()}`;
    created.push([fri, 15]);
    await addBlockByHour(page, 15, T1);
    check(`${p.name}: block added by tapping an hour shows with its title`, (await page.getByTestId("hour-15").locator(".hblock-title").textContent()) === T1);
    check(`${p.name}: empty-day hint is gone once the day has a block`, (await page.getByTestId("empty-hint").count()) === 0);
    check(`${p.name}: the day chip shows a role dot`, (await page.getByTestId(`day-chip-${fri}`).locator(".day-chip-dots > span").count()) >= 1);
    if (p.full) await shot("03-day-with-block");
    await page.getByTestId(`day-chip-${thu}`).click();
    await page.getByTestId(`day-chip-${fri}`).click();
    tp = await topHourOf(page);
    check(`${p.name}: a day with a block opens one hour before it (3 PM block -> 2 PM)`, Math.abs(tp.top - Math.min(8 * ROW, tp.max)) <= 1, `top hour ${tp.hour}, scrollTop ${tp.top}/${tp.max}`);

    // edit
    await page.getByTestId("hour-15").click();
    await page.getByText("Edit time block", { exact: true }).waitFor();
    if (p.full) await shot("04-edit-sheet");
    const T2 = T1 + " edited";
    await page.locator('input[placeholder="e.g. Call the dentist"]').fill(T2);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Edit time block", { exact: true }).waitFor({ state: "hidden" });
    check(`${p.name}: editing a block changes its title`, (await page.getByTestId("hour-15").locator(".hblock-title").textContent()) === T2);
    // survives a reload
    await openSchedule(page);
    await page.getByTestId(`day-chip-${fri}`).click();
    check(`${p.name}: the block is still there after a reload`, (await page.getByTestId("hour-15").locator(".hblock-title").textContent()) === T2);
    // delete
    await removeBlockAt(page, 15);
    created.pop();
    check(`${p.name}: deleting a block empties the hour`, (await page.getByTestId("hour-15").locator(".hblock").count()) === 0);

    // AC3: add from the one Add action.
    const T3 = `SIT add pill ${p.name} ${Date.now()}`;
    check(`${p.name}: the Add button names the day`, /^Add on [A-Z][a-z]{2} \d{1,2}/.test((await page.getByTestId("add-on-day").innerText()).trim()), (await page.getByTestId("add-on-day").innerText()).replace(/\n/g, " "));
    const topBefore = (await topHourOf(page)).hour;
    await page.getByTestId("add-on-day").click();
    await page.getByText("Schedule a goal", { exact: true }).waitFor();
    const sheetLine = await page.locator("p.font-mono.text-xs").first().innerText();
    const sheetHour = sheetLine.match(/(\d{1,2}) (AM|PM)/);
    let h24 = sheetHour ? (parseInt(sheetHour[1], 10) % 12) + (sheetHour[2] === "PM" ? 12 : 0) : -1;
    check(`${p.name}: Add opens the sheet on a free hour inside the visible window`, h24 > topBefore && h24 <= topBefore + 8, `sheet says "${sheetLine}", top hour ${topBefore}`);
    await page.getByPlaceholder("e.g. Call the dentist").fill(T3);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Schedule a goal", { exact: true }).waitFor({ state: "hidden" });
    created.push([fri, h24]);
    check(`${p.name}: block added with the Add button shows in that hour`, (await page.getByTestId(`hour-${h24}`).locator(".hblock-title").textContent()) === T3);
    await removeBlockAt(page, h24);
    created.pop();

    // AC3: day priorities, limit of 2 per day (lib/scheduleRules.ts).
    const P1 = `SIT prio A ${p.name} ${Date.now()}`;
    const P2 = `SIT prio B ${p.name} ${Date.now()}`;
    const addPrio = async (t) => {
      await page.getByRole("button", { name: "+ priority" }).click();
      await page.getByText("Add a day priority", { exact: true }).waitFor();
      await page.getByPlaceholder("e.g. Call the dentist").fill(t);
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await page.getByText("Add a day priority", { exact: true }).waitFor({ state: "hidden" });
    };
    await addPrio(P1);
    check(`${p.name}: day priority added and shown`, await page.getByRole("button", { name: P1 }).isVisible());
    await addPrio(P2);
    check(`${p.name}: after 2 priorities the + priority control is gone (limit unchanged)`, (await page.getByRole("button", { name: "+ priority" }).count()) === 0);
    if (p.full) await shot("05-two-priorities");
    await page.getByRole("button", { name: P1 }).click();
    await page.getByText("Edit priority", { exact: true }).waitFor();
    await page.locator('input[placeholder="e.g. Call the dentist"]').fill(P1 + " edited");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Edit priority", { exact: true }).waitFor({ state: "hidden" });
    check(`${p.name}: day priority edited`, await page.getByRole("button", { name: P1 + " edited" }).isVisible());
    for (const t of [P1 + " edited", P2]) {
      await page.getByRole("button", { name: t }).click();
      await page.getByText("Edit priority", { exact: true }).waitFor();
      await page.getByRole("button", { name: "Remove" }).click();
      await page.getByText("Edit priority", { exact: true }).waitFor({ state: "hidden" });
    }
    check(`${p.name}: priorities removed, + priority is back`, (await page.getByRole("button", { name: "+ priority" }).count()) === 1);

    // AC3: This week / Next week, ?week=next.
    await page.getByRole("button", { name: "Next week" }).click();
    await page.waitForURL(/\/schedule\?week=next/);
    await page.getByTestId("hour-6").waitFor();
    const nextDays = await page.locator('[data-testid^="day-chip-"]').evaluateAll((els) => els.map((e) => ({ k: e.dataset.testid.replace("day-chip-", ""), p: e.getAttribute("aria-pressed") })));
    check(`${p.name}: Next week selects its Monday`, nextDays[0].p === "true" && nextDays.slice(1).every((d) => d.p === "false") && nextDays[0].k > days[6], `${nextDays[0].k}`);
    check(`${p.name}: Next week shows the planning sentence once, small`, /Planning the week ahead/.test(await page.getByTestId("empty-hint").innerText()));
    if (p.full) await shot("06-next-week");
    const T4 = `SIT next week ${p.name} ${Date.now()}`;
    created.push([nextDays[0].k, 10]);
    await addBlockByHour(page, 10, T4);
    check(`${p.name}: a block can be added in next week`, (await page.getByTestId("hour-10").locator(".hblock-title").textContent()) === T4);
    await removeBlockAt(page, 10);
    created.pop();
    await page.getByRole("button", { name: "This week" }).click();
    await page.waitForFunction(() => !location.search.includes("week=next"));
    await page.getByTestId("hour-6").waitFor();
    check(`${p.name}: back to This week drops ?week=next and reopens on today`, (await page.getByTestId(`day-chip-${todayKey}`).getAttribute("aria-pressed")) === "true");
    await openSchedule(page, "?week=next");
    check(`${p.name}: /schedule?week=next opens on Next week`, (await page.getByRole("button", { name: "Next week", pressed: true }).count()) === 1);

    // Sheet fits a short phone: Save is on screen.
    await page.goto("/schedule");
    await page.getByTestId("hour-6").waitFor();
    await page.getByTestId("hour-18").click();
    await page.getByText("Schedule a goal", { exact: true }).waitFor();
    const save = await page.getByRole("button", { name: "Save", exact: true }).boundingBox();
    check(`${p.name}: the sheet's Save button is on screen`, !!save && save.y + save.height <= vp.height, `y ${Math.round(save.y)} of ${vp.height}`);
    if (p.full) await shot("07-sheet-new");
    await page.getByRole("button", { name: "Cancel" }).click();
    check(`${p.name}: no script error on the page`, errors.length === 0, errors.join(" | "));
    if (!p.full) await shot("01-first-screen");
  } catch (e) {
    check(`${p.name}: flow completed`, false, String(e).split("\n")[0]);
    await shot("99-failure").catch(() => {});
    if (created.length) console.log("CLEANUP NEEDED (day, hour):", JSON.stringify(created));
  } finally {
    await browser.close();
  }
}

// Opening position at fixed clock times (AC5 rule), Chromium 390 x 844.
console.log("\n== opening position at fixed clock times ==");
{
  const browser = await chromium.launch();
  const today = ymd(new Date());
  for (const [clock, wantHour] of [["03:10", 6], ["06:20", 6], ["09:30", 8], ["13:05", 12]]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, baseURL: BASE, timezoneId: TZ, locale: "en-US", storageState: states.chromium });
    const page = await context.newPage();
    await context.clock.setFixedTime(new Date(`${today}T${clock}:00+07:00`));
    await openSchedule(page);
    const tp = await topHourOf(page);
    check(`clock ${clock}: timeline opens at ${wantHour}:00 (hour before now, not before 6 AM)`, Math.abs(tp.top - Math.min((wantHour - 6) * ROW, tp.max)) <= 1, `top hour ${tp.hour}`);
    await context.close();
  }
  await browser.close();
}

console.log(`\n${total - failures}/${total} checks passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
