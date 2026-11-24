"use client";
// "Gather" presence sky (WO-094).
import { star4, r1 } from "../constellation/geometry";
import { GATHER_SIZE as S, gatherStars } from "./gatherGeometry";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * `labels[k]` = hover title of the k-th star. `from` = how many stars were
 * already there before the last change; only newer ones animate in.
 * `current` = this month (newest star twinkles); a past month is still.
 */
export function PresenceGather({ year, month, count, labels, from = count, current }: {
  year: number; month: number; count: number; labels: string[]; from?: number; current: boolean;
}) {
  const stars = gatherStars(count, year * 12 + month);
  const name = MONTHS[month - 1];
  const label = count === 0 ? `No days yet in ${name}` : `${count} ${count === 1 ? "day" : "days"} in ${name}`;
  const first = gatherStars(1, year * 12 + month)[0];
  return (
    <div className="pg">
      <style>{CSS}</style>
      <svg viewBox={`0 0 ${S} ${S}`} role="img" aria-label={label} className="pg-sky">
        <circle cx={S / 2} cy={S / 2} r={0.15 * S} fill="none" stroke="#B4432A" strokeWidth="1"
          strokeOpacity={count ? 0.28 : 0.22} strokeDasharray={count ? undefined : "3 4"} />
        {count === 0 ? (
          <>
            <path d={star4(first.x, first.y, 6)} fill="#B4432A" opacity="0.3" />
            <text x={S / 2} y={S / 2 + 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11" letterSpacing="1.3" fill="#A6482E">OPEN SKY</text>
          </>
        ) : (
          <>
            {stars.map((st, k) => {
              const newest = current && k === count - 1;
              const fresh = k >= from;
              return (
                <g key={k} className={fresh ? "pg-arrive" : undefined} style={fresh ? { animationDelay: `${Math.min(k - from, 30) * 45}ms` } : undefined}>
                  <circle cx={r1(st.x)} cy={r1(st.y)} r={st.s * 1.8} fill="#B4432A" opacity="0.1" />
                  <path className={newest ? "pg-twinkle" : undefined} d={star4(st.x, st.y, newest ? st.s * 1.25 : st.s)} fill="#B4432A">
                    {labels[k] && <title>{labels[k]}</title>}
                  </path>
                </g>
              );
            })}
            <text key={count} className="pg-num" x={S / 2} y={S / 2 + 2} textAnchor="middle" fontFamily="var(--font-serif)" fontWeight="700" fontSize="54" fill="#8A331F">{count}</text>
            <text x={S / 2} y={S / 2 + 22} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" letterSpacing="1.2" fill="#A6482E">{count === 1 ? "DAY" : "DAYS"}</text>
          </>
        )}
      </svg>
      <p className="pg-line">
        {count === 0 ? "Your first day this month will appear here when you open Quadrant."
          : <><b>{count}</b> separate {count === 1 ? "day" : "days"} you opened Quadrant {current ? "this month" : `in ${name}`}.</>}
      </p>
      {count === 0 && <p className="pg-cap">A new month starts with an open sky. Nothing from last month was lost.</p>}
    </div>
  );
}

const CSS = `
.pg{display:flex;flex-direction:column;align-items:center;color:#A6482E}
.pg-sky{width:100%;max-width:300px;height:auto;overflow:visible}
.pg-line{margin:8px 0 0;font-size:13px;font-weight:500;text-align:center}
.pg-line b{font-weight:800;color:#8A331F}
.pg-cap{margin:6px 0 0;font-size:12px;text-align:center;opacity:.8}
.pg-arrive{animation:pg-in .9s ease-out both;transform-box:fill-box;transform-origin:center}
.pg-twinkle{animation:pg-tw 4.2s ease-in-out infinite}
.pg-num{animation:pg-pop .5s ease-out both}
@keyframes pg-in{from{opacity:0;transform:scale(.3)}60%{opacity:1;transform:scale(1.15)}to{opacity:1;transform:scale(1)}}
@keyframes pg-tw{50%{opacity:.55}}
@keyframes pg-pop{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.pg *{animation:none !important}}
`;
