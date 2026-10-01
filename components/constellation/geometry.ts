// GROWTH-RING-REDESIGN: pure drawing helpers shared by YearBadge and the year ceremony.
//
// Everything here measures showing up: a star's size is how many goals were
// finished that month against the person's OWN busiest month. There is no
// target, no ratio, and no "hard" or "lean" month - a quiet month is just quiet.

export const TAU = Math.PI * 2;

/** From this share of the person's own peak (after sqrt) a star also sparkles. */
export const SPARKLE_AT = 0.7;

export const WHITE = "#FFFFFF";
export const BASE = "#DDD5C4"; // quiet and not-yet months
export const ORBIT = "#CFC6B2";

export const r1 = (n: number) => Math.round(n * 10) / 10;
export const r2 = (n: number) => Math.round(n * 100) / 100;

export function mix(a: string, b: string, t: number): string {
  const A = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const B = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return (
    "#" +
    A.map((v, i) =>
      Math.round(v + (B[i] - v) * t)
        .toString(16)
        .padStart(2, "0"),
    ).join("")
  );
}

/** A filled circle as a path, so many stars can share one <path>. */
export function circ(x: number, y: number, r: number): string {
  if (r <= 0.1) return "";
  const s = r2(r);
  return `M${r1(x - r)} ${r1(y)}a${s} ${s} 0 1 0 ${r2(2 * r)} 0a${s} ${s} 0 1 0 ${r2(-2 * r)} 0Z`;
}

/** A four-point sparkle centred on (x, y). */
export function star4(x: number, y: number, s: number): string {
  if (s <= 0.2) return "";
  const X = r1(x);
  const Y = r1(y);
  return `M${X} ${r1(y - s)}Q${X} ${Y} ${r1(x + s)} ${Y}Q${X} ${Y} ${X} ${r1(y + s)}Q${X} ${Y} ${r1(x - s)} ${Y}Q${X} ${Y} ${X} ${r1(y - s)}Z`;
}

/** Angle for month j, starting at 12 o'clock and running clockwise. */
export function monthAngle(j: number): number {
  return ((j + 0.5) / 12) * TAU - Math.PI / 2;
}

/** Small deterministic hand-drawn wobble in [-0.5, 0.5). */
export function jitter(seed: number, j: number): number {
  const s = Math.sin(seed * 12.9898 + j * 78.233) * 43758.5453;
  return s - Math.floor(s) - 0.5;
}

/** 0 for a quiet month; otherwise 0..1 against the person's own busiest month. */
export function intensity(count: number, peak: number): number {
  if (count <= 0) return 0;
  return Math.min(1, Math.sqrt(count / Math.max(1, peak)));
}

export type Star = {
  /** month index 0..11 */
  j: number;
  x: number;
  y: number;
  /** intensity 0..1; 0 = quiet month */
  t: number;
  count: number;
  lit: boolean;
};

/**
 * Twelve stars around an orbit. A month that was fuller sits further out, so
 * every year draws a shape of its own; a quiet month rests on the orbit itself.
 */
export function orbitStars(
  months: number[],
  peak: number,
  radius: number,
  amp: number,
  seed = 0,
): Star[] {
  return months.map((count, j) => {
    const t = intensity(count, peak);
    const a = monthAngle(j) + jitter(seed, j) * 0.1;
    const r = radius + (t > 0 ? (amp * (t - 0.5)) / 0.5 : 0);
    return { j, x: r * Math.cos(a), y: r * Math.sin(a), t, count, lit: t > 0 };
  });
}

/** Number of months with at least one finished goal. */
export function monthsShownUp(months: number[]): number {
  return months.filter((c) => c > 0).length;
}

export function describeYear(months: number[]): string {
  const n = monthsShownUp(months);
  if (n === 0) return "no finished goals yet";
  return `showed up in ${n} ${n === 1 ? "month" : "months"}`;
}

/**
 * The month whose star should pulse: the current calendar month while it has
 * no finished goals yet, otherwise the one after it. Only for an open year.
 */
export function nextMonth(months: number[], currentMonth: number): number | null {
  const now = Math.min(11, Math.max(0, currentMonth));
  const idx = months[now] > 0 ? now + 1 : now;
  return idx <= 11 ? idx : null;
}
