// GROWTH-RING-REDESIGN: the role badge. One orbit, this year only, replacing ringSvg.
import type { MonthScores } from "../../types/constellation";
import {
  BASE,
  GREY,
  HARD,
  ORBIT,
  STRONG,
  circ,
  describeYear,
  monthAngle,
  mix,
  nextMonth,
  star4,
  WHITE,
  yearColor,
} from "./geometry";
import "./constellation.css";

type Props = {
  months: MonthScores;
  /** Star colour, usually constellationTint(domain). */
  tint: string;
  size: number;
  /** Closed loop for a finished year. */
  sealed?: boolean;
  /** 0-11, the calendar month the badge is being drawn in. */
  currentMonth: number;
  /** Accessible name prefix, e.g. the role label. */
  label?: string;
};

export function YearBadge({
  months,
  tint,
  size,
  sealed = false,
  currentMonth,
  label,
}: Props) {
  const small = size < 48;
  const u = 200 / size; // one screen pixel in viewBox units
  const base = small ? 40 : 34;
  const amp = small ? 8 : 12;
  const main = yearColor(tint, months);
  const lineColor = mix(main, WHITE, 0.35);
  const next = sealed ? null : nextMonth(months, currentMonth);

  const pos = (j: number, v: number | null) => {
    const r = base + (amp * ((v ?? 0.55) - 0.55)) / 0.45;
    const a = monthAngle(j);
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  };

  let dots = "";
  let greyDots = "";
  let halo = "";
  let quiet = "";
  let embers = "";
  const sparks: { d: string; delay: number }[] = [];
  const lit: { x: number; y: number }[] = [];

  months.forEach((v, j) => {
    if (v == null) {
      if (j === next) return; // drawn as the pulsing marker below
      const { x, y } = pos(j, null);
      if (!small) quiet += circ(x, y, Math.max(0.9, u * 0.8));
      return;
    }
    const { x, y } = pos(j, v);
    lit.push({ x, y });
    const rs = Math.max(
      (2.6 + 3.4 * v) * (small ? 0.9 : 1),
      u * (small ? 0.95 : 1.2) * (0.75 + 0.5 * v),
    );
    if (v < HARD) {
      if (small) greyDots += circ(x, y, rs * 0.85);
      else embers += circ(x, y, rs * 0.95);
      return;
    }
    dots += circ(x, y, rs);
    if (!small) halo += circ(x, y, rs * (v >= STRONG ? 2.6 : 2));
    if (!small && v >= STRONG) sparks.push({ d: star4(x, y, rs * 2.5), delay: j });
  });

  const lines =
    lit.length > 1
      ? "M" +
        lit.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L") +
        (sealed && lit.length >= 3 ? "Z" : "")
      : "";

  const nextPos = next != null ? pos(next, null) : null;
  const ticks = small
    ? ""
    : [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ]
        .map(
          ([dx, dy]) =>
            `M${dx * (base - 4)} ${dy * (base - 4)}L${dx * (base + 4)} ${dy * (base + 4)}`,
        )
        .join("");

  return (
    <svg
      viewBox="-100 -100 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={`${label ? label + ": " : ""}${describeYear(months)}`}
      className="shrink-0"
    >
      {!small && (
        <circle
          r={base}
          fill="none"
          stroke={ORBIT}
          strokeWidth={1}
          strokeDasharray="1 5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {ticks && (
        <path
          d={ticks}
          fill="none"
          stroke={BASE}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {sealed && lit.length >= 3 && (
        <circle
          r={base + amp + 8}
          fill="none"
          stroke={main}
          strokeOpacity={0.28}
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {lines && (
        <path
          d={lines}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.1}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {halo && <path d={halo} fill={main} fillOpacity={0.17} />}
      {quiet && <path d={quiet} fill={BASE} />}
      {dots && <path d={dots} fill={main} />}
      {greyDots && <path d={greyDots} fill={GREY} />}
      {sparks.map((s) => (
        <path
          key={s.delay}
          d={s.d}
          fill={main}
          className="cn-twinkle"
          style={{ animationDelay: `${s.delay * 0.35}s` }}
        />
      ))}
      {embers && (
        <path
          d={embers}
          fill="none"
          stroke={GREY}
          strokeWidth={1.3}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {nextPos && (
        <circle
          className="cn-pulse"
          cx={nextPos.x}
          cy={nextPos.y}
          r={small ? 1.5 * u : 3.2}
          fill="none"
          stroke={main}
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
