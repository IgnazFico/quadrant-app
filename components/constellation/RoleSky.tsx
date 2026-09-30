// GROWTH-RING-REDESIGN: one role's history as stacked orbits, replacing the concentric rings.
import type { YearScores } from "../../types/constellation";
import {
  BASE,
  GREY,
  HARD,
  STRONG,
  WHITE,
  average,
  circ,
  jitter,
  mix,
  monthAngle,
  nextMonth,
  star4,
  yearColor,
} from "./geometry";
import "./constellation.css";

type Props = {
  /** Oldest first. */
  years: YearScores[];
  tint: string;
  size: number;
  /** Year to light up; the others fade. 0 shows every year evenly. */
  selectedYear?: number;
  currentYear: number;
  /** 0-11 */
  currentMonth: number;
  label?: string;
  /** Print each orbit's year on the vertical axis (needs about 240px). */
  showYearLabels?: boolean;
  /** Colour behind the year labels so they mask the axis. */
  background?: string;
};

export function RoleSky({
  years,
  tint,
  size,
  selectedYear = 0,
  currentYear,
  currentMonth,
  label,
  showYearLabels = false,
  background = "#FFFFFF",
}: Props) {
  const level = size < 64 ? 0 : size < 160 ? 1 : 2;
  const rings = level === 0 ? years.slice(-3) : years;
  const n = rings.length;
  const pitch = 84 / ((level === 0 ? n : Math.max(n, 5)) + 0.6);
  const u = 200 / size;
  const axes = level > 1 ? "M-92 0H92M0 -92V92" : "";

  return (
    <svg
      viewBox="-100 -100 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={`${label ? label + ": " : ""}${n} ${n === 1 ? "year" : "years"} of monthly stars`}
      className="shrink-0"
    >
      {axes && (
        <path
          d={axes}
          fill="none"
          stroke="#E4DCCB"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {rings.map((yr, i) => {
        const c = pitch * (i + 1);
        const isCurrent = yr.year === currentYear && !yr.sealed;
        const isSelected = selectedYear > 0 && yr.year === selectedYear;
        const dim = selectedYear > 0 && !isSelected;
        const fade = (x: string) => (dim ? mix(x, WHITE, 0.72) : x);
        const main = fade(yearColor(tint, yr.months));
        const accent = fade(mix(tint, "#2B1B0E", 0.45));
        const grey = fade(GREY);
        const base = fade(BASE);
        const lineColor = isSelected
          ? mix(main, "#2B1B0E", 0.15)
          : fade(mix(main, WHITE, 0.35));
        const orbitColor = isSelected ? "#8C877B" : fade("#CFC6B2");
        const next = isCurrent ? nextMonth(yr.months, currentMonth) : null;

        const avg = average(yr.months);
        let best = -1;
        let bestV = -1;
        yr.months.forEach((v, j) => {
          if (v != null && v > bestV) {
            bestV = v;
            best = j;
          }
        });

        let dots = "";
        let halo = "";
        let embers = "";
        let marks = "";
        let quiet = "";
        const sparks: { d: string; j: number }[] = [];
        const lit: { x: number; y: number }[] = [];
        const nextPoint: { x: number; y: number }[] = [];

        yr.months.forEach((v, j) => {
          const th = monthAngle(j) + jitter(yr.year, j) * 0.1;
          const r = c + pitch * 0.26 * (((v ?? 0.5) - 0.55) / 0.45);
          const x = r * Math.cos(th);
          const y = r * Math.sin(th);
          if (v == null) {
            if (j === next) nextPoint.push({ x, y });
            else if (level > 0) quiet += circ(x, y, Math.max(0.8, u * 0.9));
            return;
          }
          lit.push({ x, y });
          const rs = Math.max(1.1 + 2 * v, u * 1.2 * (0.7 + 0.6 * v));
          if (v < HARD) {
            embers += circ(x, y, rs * 0.95);
            return;
          }
          dots += circ(x, y, rs);
          if (level > 0) halo += circ(x, y, rs * (v >= STRONG ? 2.7 : 2));
          if (level > 0 && v >= STRONG) sparks.push({ d: star4(x, y, rs * 2.6), j });
          if (level > 1 && !dim && j === best && yr.sealed && avg > 0.4) {
            marks += circ(x, y, rs * 3.7);
          }
        });

        const drawLines =
          level > 0 && lit.length > 1 && (level === 2 || isCurrent || isSelected);
        const lines = drawLines
          ? "M" +
            lit.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L") +
            (yr.sealed && lit.length >= 3 ? "Z" : "")
          : "";

        return (
          <g key={yr.year}>
            {level > 0 && (
              <circle
                r={c}
                fill="none"
                stroke={orbitColor}
                strokeWidth={1}
                strokeDasharray="1 5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {lines && (
              <path
                d={lines}
                fill="none"
                stroke={lineColor}
                strokeWidth={isSelected ? 1.4 : 1}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {halo && <path d={halo} fill={main} fillOpacity={0.16} />}
            {quiet && <path d={quiet} fill={base} />}
            {dots && <path className="cn-fade" d={dots} fill={main} />}
            {sparks.map((s) => (
              <path
                key={s.j}
                d={s.d}
                fill={main}
                className="cn-twinkle"
                style={{ animationDelay: `${(s.j + i) * 0.4}s` }}
              />
            ))}
            {embers && (
              <path
                d={embers}
                fill="none"
                stroke={grey}
                strokeWidth={1.3}
                vectorEffect="non-scaling-stroke"
              />
            )}
            {marks && (
              <path
                d={marks}
                fill="none"
                stroke={accent}
                strokeWidth={1.2}
                vectorEffect="non-scaling-stroke"
              />
            )}
            {nextPoint.map((p) => (
              <circle
                key="next"
                className="cn-pulse"
                cx={p.x}
                cy={p.y}
                r={level === 0 ? 1.5 * u : 2.6}
                fill="none"
                stroke={main}
                strokeWidth={1.2}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {showYearLabels && level === 2 && (
              <text
                x={0}
                y={-c}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={5.4}
                className="font-mono"
                fill={isSelected ? "#1F2937" : "#6B7280"}
                stroke={background}
                strokeWidth={3}
                paintOrder="stroke"
              >
                {yr.year}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
