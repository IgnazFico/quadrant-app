/**
 * GROWTH-RING-REDESIGN: the ceremony's visuals, now constellations.
 *
 * These replaced the dot ring and the concentric progress rings. Every ring
 * visual in the app carries the GROWTH-RING-REDESIGN tag so they can be found
 * with
 *   grep -rn "GROWTH-RING-REDESIGN" components hooks src
 *
 * Like the rest of the ceremony this measures showing up, never a rate: a star
 * is a month, and its size is how many goals were finished that month against
 * the person's own busiest month. There is no target and no "out of". A month
 * with nothing finished is just a quiet dot, and a role that rested is a faint
 * dotted orbit.
 *
 * Reveal animation reuses the ceremony's existing classes (yc-dot, yc-draw,
 * yc-fade, driven by --d / --len / --dur) in ./ceremony.css, so the scenes
 * keep their timing and reduced-motion handling.
 */
import type { CSSProperties } from "react";
import { constellationTint } from "../../../lib/domainColors";
import { SPARKLE_AT, orbitStars, star4 } from "../../constellation/geometry";
import type { CeremonyRing } from "../../../hooks/useYearReview";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const REST = "#CFC6B8";

function polyLength(pts: { x: number; y: number }[], closed: boolean) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  if (closed && pts.length > 2) {
    len += Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y);
  }
  return len;
}

function linePath(pts: { x: number; y: number }[], closed: boolean) {
  return (
    "M" + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L") + (closed ? "Z" : "")
  );
}

const showedUp = (r: { votesLogged: number; months: number[] }) =>
  r.votesLogged > 0 && r.months.some((m) => m > 0);

/**
 * GROWTH-RING-REDESIGN: one role's year as twelve stars, one per month, that
 * ignite in order and then join into a loop. A role that rested is a faint
 * dotted orbit and nothing else.
 */
export function RoleStars({
  months,
  peak,
  votes,
  domain,
  variant = "role",
}: {
  months: number[];
  peak: number;
  votes: number;
  domain: string;
  variant?: "role" | "mini";
}) {
  const c = 110;
  const mini = variant === "mini";
  const cls = `yc-ring ${mini ? "yc-ring-mini" : "yc-ring-role"}`;

  if (!showedUp({ votesLogged: votes, months })) {
    return (
      <svg className={cls} viewBox="0 0 220 220" aria-hidden="true" style={{ "--c": "#D6D2C8" } as Vars}>
        <circle
          className="yc-fade"
          cx={c}
          cy={c}
          r={66}
          fill="none"
          stroke={REST}
          strokeWidth={1.5}
          strokeDasharray="2 8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const col = constellationTint(domain);
  const stars = orbitStars(months, peak, 66, 22, 1).map((s) => ({ ...s, x: c + s.x, y: c + s.y }));
  const lit = stars.filter((s) => s.lit);
  const closed = lit.length >= 3;
  const stepMs = 150;

  return (
    <svg className={cls} viewBox="0 0 220 220" aria-hidden="true" style={{ "--c": col } as Vars}>
      <circle
        className="yc-fade"
        cx={c}
        cy={c}
        r={66}
        fill="none"
        stroke={REST}
        strokeWidth={1}
        strokeDasharray="1 6"
        strokeLinecap="round"
      />
      <circle className="yc-fade" cx={c} cy={c} r={50} fill={col} fillOpacity={0.07} style={{ "--d": "300ms" } as Vars} />
      {lit.length > 1 && (
        <path
          className="yc-draw"
          d={linePath(lit, closed)}
          fill="none"
          stroke={col}
          strokeOpacity={0.55}
          strokeWidth={mini ? 2.4 : 1.3}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ "--len": polyLength(lit, closed).toFixed(1), "--d": `${12 * stepMs}ms`, "--dur": "1800ms" } as Vars}
        />
      )}
      {stars.map((s) => {
        const delay = { "--d": `${s.j * stepMs}ms` } as Vars;
        if (!s.lit) {
          return (
            <circle
              key={s.j}
              className="yc-fade"
              cx={+s.x.toFixed(1)}
              cy={+s.y.toFixed(1)}
              r={mini ? 2.4 : 1.6}
              fill={REST}
              style={delay}
            />
          );
        }
        const core = (3 + 5 * s.t) * (mini ? 1.4 : 1);
        return (
          <g key={s.j} className="yc-dot" style={delay}>
            <circle cx={+s.x.toFixed(1)} cy={+s.y.toFixed(1)} r={+(core * 2.4).toFixed(1)} fill={col} fillOpacity={0.16} />
            <circle cx={+s.x.toFixed(1)} cy={+s.y.toFixed(1)} r={+core.toFixed(1)} fill={col} />
            {s.t >= SPARKLE_AT && (
              <path
                className="yc-twinkle"
                d={star4(s.x, s.y, core * 2.8)}
                fill={col}
                style={{ animationDelay: `${(s.j * 0.37).toFixed(2)}s` }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * GROWTH-RING-REDESIGN: every role's year together, one orbit per role in the
 * user's own role order (never ranked). A role that rested is a faint dotted
 * orbit. `yearOrbit` adds the thin outer orbit that traces the year on the
 * final scene and, as it closes, lights one bright star where the year began
 * and ended (12 o'clock): the year sealed into the sky.
 */
export function TogetherSky({
  rings,
  yearOrbit = false,
  variant = "together",
  trackStroke = "rgba(124,45,18,0.10)",
}: {
  rings: CeremonyRing[];
  yearOrbit?: boolean;
  variant?: "together" | "card";
  trackStroke?: string;
}) {
  const base = 34;
  const gap = 22;
  const amp = 6;
  const n = rings.length;
  const lastR = base + Math.max(0, n - 1) * gap;
  const yearR = lastR + 26;
  const outer = yearOrbit ? yearR + 10 : lastR + amp + 8;
  const half = outer + 8;

  return (
    <svg
      className={`yc-ring ${variant === "together" ? "yc-ring-together" : ""}`}
      viewBox={`${-half} ${-half} ${half * 2} ${half * 2}`}
      aria-hidden="true"
    >
      {rings.map((r, i) => {
        const radius = base + i * gap;
        const delay = i * 260;
        if (!showedUp(r)) {
          return (
            <circle
              key={r.roleId}
              className="yc-fade"
              r={radius}
              fill="none"
              stroke={REST}
              strokeWidth={1.4}
              strokeDasharray="2 6"
              strokeLinecap="round"
              style={{ "--d": `${delay}ms` } as Vars}
            />
          );
        }
        const col = constellationTint(r.domain);
        const stars = orbitStars(r.months, r.peak, radius, amp, i + 1);
        const lit = stars.filter((s) => s.lit);
        const closed = lit.length >= 3;
        return (
          <g key={r.roleId}>
            <circle
              className="yc-fade"
              r={radius}
              fill="none"
              stroke={trackStroke}
              strokeWidth={1}
              strokeDasharray="1 5"
              strokeLinecap="round"
              style={{ "--d": `${delay}ms` } as Vars}
            />
            {lit.length > 1 && (
              <path
                className="yc-draw"
                d={linePath(lit, closed)}
                fill="none"
                stroke={col}
                strokeOpacity={0.4}
                strokeWidth={1}
                strokeLinejoin="round"
                style={{ "--len": polyLength(lit, closed).toFixed(1), "--d": `${delay + 500}ms`, "--dur": "1400ms" } as Vars}
              />
            )}
            {lit.map((s) => {
              const core = 1.7 + 2.6 * s.t;
              return (
                <g key={s.j} className="yc-dot" style={{ "--d": `${delay + s.j * 45}ms` } as Vars}>
                  <circle cx={+s.x.toFixed(1)} cy={+s.y.toFixed(1)} r={+core.toFixed(1)} fill={col} />
                  {s.t >= SPARKLE_AT && (
                    <path d={star4(s.x, s.y, core * 2.6)} fill={col} fillOpacity={0.85} />
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
      {yearOrbit && (
        <>
          <circle
            className="yc-draw"
            r={yearR}
            fill="none"
            stroke="#F97316"
            strokeOpacity={0.7}
            strokeWidth={1.3}
            strokeLinecap="round"
            transform="rotate(-90)"
            style={
              {
                "--len": (2 * Math.PI * yearR).toFixed(1),
                "--d": `${n * 260 + 900}ms`,
                "--dur": "3600ms",
              } as Vars
            }
          />
          {/* The year's own star, lit as the orbit closes (see yearOrbitCloseMs). */}
          <g className="yc-dot" style={{ "--d": `${yearOrbitCloseMs(n)}ms` } as Vars}>
            <circle cy={-yearR} r={9} fill="#F97316" fillOpacity={0.18} />
            <circle cy={-yearR} r={3.4} fill="#F97316" />
            <path className="yc-twinkle" d={star4(0, -yearR, 10)} fill="#F97316" />
          </g>
        </>
      )}
    </svg>
  );
}

/** When the year orbit finishes closing, relative to its line appearing. Keep in sync with TogetherSky's yearOrbit timing. */
export function yearOrbitCloseMs(ringCount: number) {
  return ringCount * 260 + 900 + 3400;
}
