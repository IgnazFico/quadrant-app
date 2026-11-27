"use client";

import { constellationTint } from "../../lib/domainColors";
import { YearBadge } from "../constellation/YearBadge";
import { useChipTransition } from "../../hooks/useChipTransition";
import type { RoleBadge } from "../../hooks/useProfile";

/** Featured-role chips (or the hint) at the foot of the ID card; shared by phone and desktop. */
export function FeaturedChips({ featured, ready, currentMonth }: { featured: RoleBadge[]; ready: boolean; currentMonth: number }) {
  const chips = useChipTransition(featured, ready);
  return (
    <div className="mt-auto flex gap-2.5">
      {chips.length === 0 ? (
        <p className="chip-hint text-[11px] text-[#C9CBCF]">Feature up to 2 roles below</p>
      ) : (
        chips.map(({ item: r, state }) => (
          <div
            key={r.id}
            className={`flex flex-1 items-center gap-1.5 rounded-lg bg-[#F3F4F6] px-2.5 py-1.5${
              state === "new" ? " chip-enter" : state === "leaving" ? " chip-leave" : ""
            }`}
          >
            {/* GROWTH-RING-REDESIGN: featured-role constellation on the ID card (was ringSvg) */}
            <div className="shrink-0">
              <YearBadge
                months={r.constellation.months}
                peak={r.constellation.peak}
                tint={constellationTint(r.domain)}
                size={34}
                settle
                sealed={r.constellation.sealed}
                currentMonth={currentMonth}
                label={r.label}
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[10.5px] font-semibold leading-tight">{r.label}</div>
              <div className="font-mono text-[8.5px] text-[#9CA3AF]">Year {r.tenureYears}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
