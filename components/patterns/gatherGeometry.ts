// WO-092 PROTOTYPE (proto/presence-gather, never merged): "Gather" presence sky.
// Pure geometry: the k-th day you showed up is the k-th star on a sunflower spiral.
import { TAU, jitter } from "../constellation/geometry";

export const GATHER_SIZE = 300; // viewBox side; the card scales it with CSS
export const GOLDEN = (137.5 * Math.PI) / 180;
const R0 = 0.19; // first star, as a share of the size
const R31 = 0.455; // 31st star; the scale is fixed so a quiet month never looks "behind"

export type GatherStar = { x: number; y: number; s: number };

/** `count` stars for one month. `seed` = year * 12 + month, so a month always looks the same. */
export function gatherStars(count: number, seed: number, S = GATHER_SIZE): GatherStar[] {
  const c = ((R31 - R0) * S) / Math.sqrt(30);
  const rot = jitter(seed, 0) * TAU;
  return Array.from({ length: Math.max(0, count) }, (_, k) => {
    const r = R0 * S + c * Math.sqrt(k) + jitter(seed, 2 * k + 1) * 2.2;
    const a = rot + (k >> 1) * GOLDEN + (k & 1) * Math.PI; // antipodal pairs keep the ring centred on the circle
    const s = 6 + jitter(seed, 2 * k + 2) * 1.2; // newest star is enlarged at draw time, so earlier stars never change
    return { x: S / 2 + r * Math.cos(a), y: S / 2 + r * Math.sin(a), s };
  });
}
