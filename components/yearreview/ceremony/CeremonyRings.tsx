/**
 * GROWTH-RING-REDESIGN: ring visuals used by the year-end ceremony.
 *
 * The growth ring components are due for a redesign. Every ring visual in
 * the app carries the GROWTH-RING-REDESIGN tag so they can be found with
 *   grep -rn "GROWTH-RING-REDESIGN" components hooks src
 *
 * Ring styles for these live in ./ceremony.css under the
 * "Rings (GROWTH-RING-REDESIGN ...)" section. The ceremony's copy doesn't
 * depend on the ring shape, so these can be swapped for the new design
 * without touching scenes.tsx beyond the call sites.
 */
import type { CSSProperties } from "react";
import { domainColor } from "../../../lib/domainColors";
import type { CeremonyRing } from "../../../hooks/useYearReview";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * GROWTH-RING-REDESIGN: one dot per time the user showed up for a role.
 * No target and no "out of": a ring with 3 dots is complete, not 3/24.
 */
export function DotRing({
  votes,
  domain,
  variant = "role",
}: {
  votes: number;
  domain: string;
  variant?: "role" | "mini";
}) {
  const c = 110;
  const R = 92;
  const cls = `yc-ring ${variant === "mini" ? "yc-ring-mini" : "yc-ring-role"}`;

  if (!votes) {
    return (
      <svg className={cls} viewBox="0 0 220 220" aria-hidden="true" style={{ "--c": "#D6D2C8" } as Vars}>
        <circle
          className="yc-fade"
          cx={c}
          cy={c}
          r={R}
          fill="none"
          stroke="#CFC6B8"
          strokeWidth={1.5}
          strokeDasharray="2 8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const col = domainColor(domain);
  const spacing = (2 * Math.PI * R) / votes;
  const dotR = Math.max(1.6, Math.min(5, spacing / 3));
  const total = Math.min(2400, votes * 70);

  return (
    <svg className={cls} viewBox="0 0 220 220" aria-hidden="true" style={{ "--c": col } as Vars}>
      <circle className="yc-fade" cx={c} cy={c} r={62} fill={col} fillOpacity={0.08} style={{ "--d": "300ms" } as Vars} />
      {Array.from({ length: votes }, (_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / votes;
        return (
          <circle
            key={i}
            className="yc-dot"
            cx={+(c + R * Math.cos(a)).toFixed(2)}
            cy={+(c + R * Math.sin(a)).toFixed(2)}
            r={+dotR.toFixed(2)}
            fill={col}
            style={{ "--d": `${Math.round((i * total) / votes)}ms` } as Vars}
          />
        );
      })}
    </svg>
  );
}

/**
 * GROWTH-RING-REDESIGN: every role's ring, concentric, in the user's own
 * role order. A role that showed up at all gets a whole ring (not a
 * progress arc); a resting role is a faint dashed circle. `yearRing`
 * adds the thin outer ring that closes on the final scene.
 */
export function ConcentricRings({
  rings,
  yearRing = false,
  variant = "together",
  trackStroke = "rgba(124,45,18,0.07)",
}: {
  rings: CeremonyRing[];
  yearRing?: boolean;
  variant?: "together" | "card";
  trackStroke?: string;
}) {
  const base = 26;
  const gap = 15;
  const sw = 7;
  const n = rings.length;
  const yearR = base + Math.max(0, n - 1) * gap + 20;
  const outer = (yearRing ? yearR : base + Math.max(0, n - 1) * gap) + sw;
  const half = outer + 4;

  return (
    <svg
      className={`yc-ring ${variant === "together" ? "yc-ring-together" : ""}`}
      viewBox={`${-half} ${-half} ${half * 2} ${half * 2}`}
      aria-hidden="true"
    >
      {rings.map((r, i) => {
        const rad = base + i * gap;
        const delay = `${i * 260}ms`;
        if (r.votesLogged > 0) {
          const len = (2 * Math.PI * rad).toFixed(1);
          return (
            <g key={r.roleId}>
              <circle r={rad} fill="none" stroke={trackStroke} strokeWidth={sw} />
              <circle
                className="yc-draw"
                r={rad}
                fill="none"
                stroke={domainColor(r.domain)}
                strokeWidth={sw}
                strokeLinecap="round"
                transform="rotate(-90)"
                style={{ "--len": len, "--d": delay } as Vars}
              />
            </g>
          );
        }
        return (
          <circle
            key={r.roleId}
            className="yc-fade"
            r={rad}
            fill="none"
            stroke="#CFC6B8"
            strokeWidth={1.5}
            strokeDasharray="2 6"
            strokeLinecap="round"
            style={{ "--d": delay } as Vars}
          />
        );
      })}
      {yearRing && (
        <circle
          className="yc-draw"
          r={yearR}
          fill="none"
          stroke="#F97316"
          strokeWidth={2}
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
      )}
    </svg>
  );
}

/** When the year ring finishes closing, relative to its line appearing. Keep in sync with ConcentricRings' yearRing timing. */
export function yearRingCloseMs(ringCount: number) {
  return ringCount * 260 + 900 + 3400;
}
