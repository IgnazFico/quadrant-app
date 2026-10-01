// GROWTH-RING-REDESIGN: the role badge. One orbit, this year only, replacing ringSvg.
import {
  BASE,
  ORBIT,
  SPARKLE_AT,
  WHITE,
  circ,
  describeYear,
  mix,
  nextMonth,
  orbitStars,
  star4,
} from "./geometry";
import "./constellation.css";

type Props = {
  /** Goals finished in each month of this year. */
  months: number[];
  /** This role's own busiest month; stars are sized against it. */
  peak: number;
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
  peak,
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
  const lineColor = mix(tint, WHITE, 0.35);
  const next = sealed ? null : nextMonth(months, currentMonth);
  const stars = orbitStars(months, peak, base, amp);

  let dots = "";
  let halo = "";
  let quiet = "";
  const sparks: { d: string; j: number }[] = [];
  const lit = stars.filter((s) => s.lit);

  stars.forEach((s) => {
    if (!s.lit) {
      if (s.j === next) return; // drawn as the pulsing marker below
      if (!small) quiet += circ(s.x, s.y, Math.max(0.9, u * 0.8));
      return;
    }
    const rs = Math.max(
      (2.4 + 3.6 * s.t) * (small ? 0.9 : 1),
      u * (small ? 0.95 : 1.2) * (0.75 + 0.5 * s.t),
    );
    dots += circ(s.x, s.y, rs);
    if (!small) halo += circ(s.x, s.y, rs * (s.t >= SPARKLE_AT ? 2.6 : 2));
    if (!small && s.t >= SPARKLE_AT) sparks.push({ d: star4(s.x, s.y, rs * 2.5), j: s.j });
  });

  const lines =
    lit.length > 1
      ? "M" +
        lit.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L") +
        (sealed && lit.length >= 3 ? "Z" : "")
      : "";

  const nextStar = next != null ? stars[next] : null;
  const nextPos =
    nextStar != null
      ? {
          x: base * Math.cos(Math.atan2(nextStar.y, nextStar.x)),
          y: base * Math.sin(Math.atan2(nextStar.y, nextStar.x)),
        }
      : null;

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
        <path d={ticks} fill="none" stroke={BASE} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      )}
      {sealed && lit.length >= 3 && (
        <circle
          r={base + amp + 8}
          fill="none"
          stroke={tint}
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
      {halo && <path d={halo} fill={tint} fillOpacity={0.17} />}
      {quiet && <path d={quiet} fill={BASE} />}
      {dots && <path d={dots} fill={tint} />}
      {sparks.map((s) => (
        <path
          key={s.j}
          d={s.d}
          fill={tint}
          className="cn-twinkle"
          style={{ animationDelay: `${s.j * 0.35}s` }}
        />
      ))}
      {nextPos && (
        <circle
          className="cn-pulse"
          cx={nextPos.x}
          cy={nextPos.y}
          r={small ? 1.5 * u : 3.2}
          fill="none"
          stroke={tint}
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
