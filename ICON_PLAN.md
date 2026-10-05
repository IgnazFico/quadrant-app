# Implementation plan: Editorial app icon

Status: plan only, nothing wired yet. Assets: `public/brand/editorial/` (untracked, added Oct 5).
Design: a "Q" made of four ring segments with a tail. The top-right segment (Quadrant II) is clay `#D9845A`; the rest is ink `#2E2A26` on a linen `#F6F0E6` tile. The favicon uses its own simplified 16-unit geometry.

---

## 0. Current state (what gets replaced)

| Where | Today | Problem |
|---|---|---|
| `src/app/layout.tsx` `metadata.icons` | `/icon.svg`, `/icon-192.png`, apple `/apple-touch-icon.png` | old 2x2 grid icon (orange `#F97316`) |
| `src/app/manifest.ts` `icons` | `/icon-192.png` (maskable), `/icon-512.png` (any), `/icon.svg` | old icon; no `any` 192 and no maskable 512 |
| `src/app/favicon.ico` | old 4-image ico | Next serves it at `/favicon.ico` and injects a `<link>` automatically, so the old icon keeps showing until it's replaced |
| `public/icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | old rasters | become dead files |
| ~17 inline CSS 2x2 grid marks (`grid-cols-2 grid-rows-2` + `#F97316`) | AppShell brand, landing header, login, page eyebrows, RecapPrompt, mission flow | in-app logo no longer matches the app icon |

Note: the README snippet in `public/brand/editorial/README.md` is incomplete for the manifest. Chrome's install criteria want `any` icons at 192 and 512, and the maskable icon should also ship at 512. Phase 1 fixes this.

---

## Phase 1: Browser + PWA icons (small, low risk; ship first)

1. **Favicon (`src/app/favicon.ico`)**: replace it with `public/brand/editorial/favicon.ico` (16/32/48). Keep it in `src/app/` so the file convention still serves `/favicon.ico`. Browsers request that path directly, and `src/proxy.ts` already excludes it from the matcher.
2. **`src/app/layout.tsx` metadata**:
   ```ts
   icons: {
     icon: [
       { url: "/brand/editorial/svg/favicon.svg", type: "image/svg+xml" },
       { url: "/brand/editorial/png/favicon-32.png", sizes: "32x32", type: "image/png" },
       { url: "/brand/editorial/png/favicon-16.png", sizes: "16x16", type: "image/png" },
     ],
     apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
   },
   ```
   - Keep the apple link at the root path, but **overwrite `public/apple-touch-icon.png` with `brand/editorial/png/apple-touch-icon.png`**. iOS also probes `/apple-touch-icon.png` without a link, so deleting it would 404.
   - Optional: dark-tab favicon via `{ url: "/brand/editorial/svg/favicon-dark.svg", media: "(prefers-color-scheme: dark)" }`. The installed Next docs (`app-icons.md`, line ~615) confirm `media` is supported. Chrome/Firefox honour it; Safari mostly ignores it.
3. **`src/app/manifest.ts` icons**:
   ```ts
   { src: "/brand/editorial/png/quadrant-icon-192.png",          sizes: "192x192", type: "image/png", purpose: "any" },
   { src: "/brand/editorial/png/quadrant-icon-512.png",          sizes: "512x512", type: "image/png", purpose: "any" },
   { src: "/brand/editorial/png/quadrant-icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
   { src: "/brand/editorial/png/quadrant-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
   { src: "/brand/editorial/svg/quadrant-icon.svg",              sizes: "any",     type: "image/svg+xml", purpose: "any" },
   ```
4. **Theme / background colour (decision, default = no change)**: `theme_color` / `background_color` / `viewport.themeColor` stay `#FFF9F2`. It's the app surface and is asserted in `tests/production.spec.ts`. The icon's linen `#F6F0E6` tile on the `#FFF9F2` Android splash is a near-match, so leave it.
5. **Remove the old files**: `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`. Grep first; today only `layout.tsx` and `manifest.ts` reference them.
6. **Tests (`tests/production.spec.ts`, runs in the PR smoke job)**: add one test that:
   - checks the manifest has `any` icons at 192 and 512 and at least one `maskable` icon
   - requests every manifest icon `src` and expects 200 with an `image/*` content type
   - expects 200 from `/favicon.ico` and `/apple-touch-icon.png`
   - checks the landing `<head>` has a `link[rel=icon][href*="brand/editorial"]`
7. **Verify**: `tsc --noEmit` and `eslint` locally, then the Vercel preview. Don't run `next dev` (RAM). On the preview:
   - DevTools > Application > Manifest shows every icon with no errors
   - the maskable icon looks right in a circle mask (maskable.app or the DevTools preview)
   - tab favicon on light and dark tabs
   - iOS "Add to Home Screen"
8. **Commit**: `public/brand/` together with the wiring, as one commit.

**Cache caveat for beta testers**: the new paths bust browser caches. Installed Android PWAs pick up manifest icon changes on Chrome's periodic manifest check (can take a day or more). **iOS home-screen icons never update**: testers must remove and re-add the app. Add a line to `BETA_TESTER_GUIDE.md` or the next beta note.

---

## Phase 2: In-app brand mark (larger; needs a design decision)

The app UI still draws the old 2x2 grid in orange `#F97316`. Two options:

- **A (recommended)**: change only the **brand lockups** (logo + "Quadrant" wordmark) to the new mark, and keep the small 2x2 eyebrow glyphs. The eyebrows work as a section motif, not as a logo.
  - Lockups: `components/nav/AppShell.tsx:105`, `src/app/page.tsx:101` (landing header), `src/app/(auth)/login/page.tsx:9`, and the large marks in `MissionStatementFlow.tsx:122/286` and `RecapPrompt.tsx:47`.
- **B**: replace all ~17 grid instances with the new mark for full consistency. More churn, and the Q's tail reads poorly at 14–16px. Those sizes would need the favicon geometry.

Implementation, either way:
1. Create `components/brand/QuadrantMark.tsx`: an inline SVG built from the `quadrant-mark.svg` paths, **without the C2PA `<metadata>` block** (~10 KB per file).
   - Props: `size`, `variant: "full" | "small"` (small = the `favicon.svg` 16-unit geometry, for ≤20px), `tone: "color" | "mono"`.
   - Fills use `currentColor` for ink, plus an `accent` prop that defaults to clay.
   - `aria-hidden` when sitting next to the wordmark.
2. **Accent decision**: the icon accent is clay `#D9845A`; the app UI accent is orange `#F97316`. Either render the in-app mark in clay to match the icon (recommended, since it's the brand mark), or pass `accent="#F97316"`. Don't retheme the app's UI orange as part of this work.
3. Swap the call sites. Desktop placement can't be visually checked locally: use the temporary dev-only mock route + browser_exec pattern only if RAM allows, otherwise rely on the Vercel preview.
4. Tests: existing specs that look for the brand by text ("Quadrant") are unaffected. Grep `tests/` for grid-specific selectors before merging.

---

## Phase 3: Optional / later

- **Social card**: no `opengraph-image` exists today. Add `src/app/opengraph-image.png` (1200x630, mark + wordmark on linen) or generate it with `opengraph-image.tsx` (`ImageResponse`). This needs Phase 2's SVG component or a static export.
- **Ceremony share card** (open item in STATE.md): can reuse `QuadrantMark` for the "Keep a card of this year" export.
- **Capacitor packaging** (roadmap #5): `png/quadrant-icon-1024.png` is the source for the iOS/Android icon sets. The maskable SVG is the Android adaptive-icon foreground reference.
- **Family icons** (`quadrant-plan/reflect/year/mission`): not wired. Candidates for notification icons (web push, roadmap #2) or section headers; no action now.
- **SVG weight**: each served SVG carries ~10–11 KB of C2PA provenance metadata (`favicon.svg` is 13 KB, of which ~2 KB is geometry). Fine as is. If size matters, serve stripped copies and keep the originals in `brand/`. Don't strip in place without deciding whether to keep the provenance.

---

## Order & effort

| Step | Effort | Risk |
|---|---|---|
| Phase 1 (favicon, apple, manifest, tests) | ~30 min + CI | low; only metadata and static files |
| Phase 2 option A (6 lockups + component) | ~1–2 h | low–medium; visual, not checkable locally |
| Phase 2 option B (all 17) | +1 h | medium; small-size legibility |
| Phase 3 | separate tickets | — |

Decisions needed from Ignaz before Phase 2: **A or B**, and **clay or orange** accent for the in-app mark.
