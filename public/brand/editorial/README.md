# Quadrant icon — Editorial refinement

Colours: ink `#2E2A26`, linen `#F6F0E6`, clay accent `#D9845A`.

## SVG (primary)

| File | Use |
|---|---|
| `svg/quadrant-icon.svg` | App icon, linen tile |
| `svg/quadrant-icon-dark.svg` | App icon on ink tile |
| `svg/quadrant-icon-mono.svg` / `-reverse.svg` | One-colour versions |
| `svg/quadrant-icon-maskable.svg` | Full-bleed square, mark inside the 80% safe zone (Android / PWA maskable) |
| `svg/quadrant-mark.svg` | Mark only, transparent, for light backgrounds |
| `svg/quadrant-mark-light.svg` | Mark only, transparent, for dark backgrounds |
| `svg/quadrant-mark-mono.svg` | Mark only, one colour |
| `svg/favicon.svg` / `favicon-dark.svg` | Dedicated 16-unit favicon geometry |
| `svg/quadrant-plan.svg`, `-reflect`, `-year`, `-mission` | Centre-symbol family for future products |

## PNG (fallback)

`png/` holds rasters of the same files: app icon at 1024 / 512 / 192, maskable at 512 / 192, `apple-touch-icon.png` (180, full bleed), favicons at 16 / 32 / 48, and 512 px versions of the dark, mono, mark and family icons. `favicon.ico` bundles 16, 32 and 48.

## Wiring it up (Next.js)

```ts
// src/app/layout.tsx -> metadata
icons: {
  icon: [
    { url: "/brand/editorial/svg/favicon.svg", type: "image/svg+xml" },
    { url: "/brand/editorial/png/favicon-32.png", sizes: "32x32", type: "image/png" },
  ],
  apple: "/brand/editorial/png/apple-touch-icon.png",
},
```

```ts
// src/app/manifest.ts -> icons
{ src: "/brand/editorial/png/quadrant-icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
{ src: "/brand/editorial/png/quadrant-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
{ src: "/brand/editorial/svg/quadrant-icon.svg", sizes: "any", type: "image/svg+xml" },
```
