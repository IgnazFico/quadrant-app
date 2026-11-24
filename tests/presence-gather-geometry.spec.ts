import { test, expect } from "@playwright/test";
import { gatherStars, GATHER_SIZE as S } from "../components/patterns/gatherGeometry";

// WO-092 prototype: pure function, no server or login needed.
const seed = 2026 * 12 + 11;
for (const n of [0, 1, 2, 10, 22, 31]) {
  test(`${n} days`, () => {
    const st = gatherStars(n, seed);
    expect(st).toHaveLength(n);
    for (const p of st) {
      expect(Number.isFinite(p.x + p.y + p.s)).toBe(true);
      expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(S);
      expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThan(S);
    }
    // stars never sit on top of each other
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) expect(Math.hypot(st[i].x - st[j].x, st[i].y - st[j].y)).toBeGreaterThan(8);
    // same month, same picture; fixed scale: star k does not move when more days are added
    expect(gatherStars(n + 1, seed).slice(0, n)).toEqual(st);
    if (n > 0) expect(Math.hypot(st[0].x - S / 2, st[0].y - S / 2)).toBeLessThan(0.19 * S + 2);
  });
}
test("31 days stay inside the fixed scale", () => {
  const far = Math.max(...gatherStars(31, seed).map((p) => Math.hypot(p.x - S / 2, p.y - S / 2)));
  expect(far).toBeLessThan(0.455 * S + 3);
});

// WO-098: the ring must share the circle's centre (stars come in opposite pairs).
test("even star counts are centred on the circle", () => {
  for (let seed = 24000; seed < 24100; seed++) for (const n of [8, 12, 20, 30]) {
    const st = gatherStars(n, seed);
    const cx = st.reduce((a, p) => a + p.x, 0) / n, cy = st.reduce((a, p) => a + p.y, 0) / n;
    expect(Math.hypot(cx - S / 2, cy - S / 2)).toBeLessThan(0.01 * S);
  }
});
