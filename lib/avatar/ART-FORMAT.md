# Avatar art format

For the illustrator. Everything here is a placeholder today; real art replaces it file by file, with no code change.

## The grid

- One avatar is a stack of SVG pieces on a **100 × 100** grid (`viewBox="0 0 100 100"`).
- The renderer clips the whole stack to a **circle** (centre 50,50, radius 50). Art outside that circle is cut off, so keep essential shapes inside it.
- Head: about 38 wide × 43 tall, centred on x = 50, between y ≈ 24 and y ≈ 68. Hair volume may reach radius 32 and still fit the circle. Shoulders start around y = 78 and run off the bottom edge.

## Layers (draw order, bottom to top)

| Layer | What | Piece ids |
|---|---|---|
| 10 | hair, back | `hair-1-back` … `hair-10-back` |
| 15 | covering, back | `cover-1-back` … `cover-3-back` |
| 20 | shoulders + neck | `base-shoulders` |
| 30 | ears | `base-ears` |
| 40 | face | `face-1` … `face-4` |
| 45 | facial hair | `facial-1` … `facial-3` |
| 50 | mouth | `mouth-1` … `mouth-4` |
| 55 | nose | `nose-1` … `nose-3` |
| 60 | eyes | `eyes-1` … `eyes-4` |
| 65 | brows | `brows-1` … `brows-3` |
| 70 | hair, front | `hair-1-front` … `hair-10-front` |
| 75 | covering, front | `cover-1-front` … `cover-3-front` |
| 80 | accessories | `extra-1` … `extra-5` |

`base-shoulders` and `base-ears` are always drawn when there is a face; they have no code.

## The 54 pieces

- base: `base-shoulders`, `base-ears`
- face: `face-1` oval, `face-2` round, `face-3` long, `face-4` square jaw
- eyes: `eyes-1` dots, `eyes-2` large with glints, `eyes-3` closed, `eyes-4` almond
- brows: `brows-1` straight, `brows-2` arched, `brows-3` thick angled
- nose: `nose-1` curve, `nose-2` bridge, `nose-3` button
- mouth: `mouth-1`, `mouth-2` calm; `mouth-3`, `mouth-4` smiling
- hair: 1 short crop, 2 long straight, 3 waves, 4 curly, 5 coily short, 6 locs, 7 braids/cornrows, 8 bun, 9 close shave, 10 bob/side part — each as `hair-N-front` and `hair-N-back`
- cover: 1 hijab, 2 beanie, 3 dastar — each as `cover-N-front` and `cover-N-back`
- facial: `facial-1` full beard, `facial-2` moustache, `facial-3` goatee
- extra: `extra-1` round glasses, `extra-2` soft-square glasses, `extra-3` earrings, `extra-4` sunglasses, `extra-5` cat-eye glasses

Each style has a front and a back file. The back piece sits behind the head: it may be a small shape for styles with no back volume, but it must not be empty.

## File format

One file per piece, `lib/avatar/art/<id>.ts`, **exactly one line**:

```ts
export default "<svg markup>";
```

- The markup is a double-quoted string. Use **single quotes** for every attribute inside it. No double quotes, no backslashes.
- Only these elements: `<g>`, `<path>`, `<circle>`, `<ellipse>`, `<rect>`.
- No gradients, no filters, no ids, no `url()`.

## Colour slots

Never hard-code a skin, hair or fabric colour — the renderer sets these from the user's swatches:

- `fill='var(--skin)'` — face, ears, neck
- `fill='var(--hair)'` — hair, facial hair, brows
- `fill='var(--fabric)'` — shoulders, coverings

Fixed details (eye pupils, mouth interior, gold earrings) may use a literal hex.

## Style

- One ink for every outline: `#2B2620`, `stroke-width='2.4'`, `stroke-linejoin='round'`, `stroke-linecap='round'`.
- Flat fills only. Outlines come from the ink stroke, not from shading.
- Line work for folds, strands and lashes: `fill='none'` with the same ink.

## Hiding rules (already in data, do not draw around them)

- `cover-1-front` and `cover-1-back` (hijab) hide all hair, the ears and `extra-3` (earrings).
- `cover-2-front`, `cover-2-back`, `cover-3-front`, `cover-3-back` hide all hair.

So a hijab must cover where hair and ears would be, and a beanie or dastar must cover the hair line. Nothing else hides anything.

## Forbidden in art files

Art files are static markup; the build fails on any of these:

`<script`, any `on…=` attribute, `href`, `url(`, `http`, `<image`, `<foreignObject`, `@import`, `<style`, `javascript:`, `data:`.

## Replacing a placeholder

1. Replace the file's one line with your markup. Nothing else changes.
2. In `lib/avatar/manifest.ts`, set `placeholder: false` on that piece's entry.
3. Replace files only; no code change. The release check (`npx tsx scripts/verify-avatar-manifest.ts --release`) fails until every entry is marked false.
