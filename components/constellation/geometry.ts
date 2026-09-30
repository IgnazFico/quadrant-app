// GROWTH-RING-REDESIGN: pure drawing helpers shared by YearBadge and RoleSky.
import type { MonthScores } from "../../types/constellation";

export const TAU = Math.PI * 2;

/** Below this a month is "hard": hollow grey star. */
export const HARD = 0.32;
/** From this a month is "strong": sparkle and wide glow. */
export const STRONG = 0.6;

export const WHITE = "#FFFFFF";
export const BASE = "#DDD5C4"; // quiet / future dots
export const GREY = "#9A9385"; // hard months
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
export function jitter(year: number, j: number): number {
  const s = Math.sin(year * 12.9898 + j * 78.233) * 43758.5453;
  return s - Math.floor(s) - 0.5;
}

export function average(months: MonthScores): number {
  const known = months.filter((m): m is number => m != null);
  return known.length ? known.reduce((a, b) => a + b, 0) / known.length : 0.6;
}

/** Strength of a year tints its stars: strong years glow green-full, lean years fade. */
export function yearColor(tint: string, months: MonthScores): string {
  return mix(tint, WHITE, (1 - average(months)) * 0.45);
}

export function lastLit(months: MonthScores): number {
  for (let j = 11; j >= 0; j--) if (months[j] != null) return j;
  return -1;
}

/**
 * The month whose star should pulse: the current calendar month while it has
 * no finished goals yet, otherwise the one after it. Only for an open year.
 */
export function nextMonth(
  months: MonthScores,
  currentMonth: number,
): number | null {
  const now = Math.min(11, Math.max(0, currentMonth));
  const idx = months[now] == null ? now : now + 1;
  return idx <= 11 && months[idx] == null ? idx : null;
}

export function describeYear(months: MonthScores): string {
  const known = months.filter((m): m is number => m != null);
  if (known.length === 0) return "no finished goals yet";
  const strong = known.filter((m) => m >= STRONG).length;
  const hard = known.filter((m) => m < HARD).length;
  return `${known.length} of 12 months lit, ${strong} strong, ${hard} hard`;
}
