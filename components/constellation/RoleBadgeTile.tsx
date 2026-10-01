// GROWTH-RING-REDESIGN: one role badge tile (constellation + label), shared by
// the mobile ProfilePage and the desktop IdentityDesktopView so they can't drift.
//
// Copy rules match the year ceremony: it counts months shown up, never a rate.
import { constellationTint } from "../../lib/domainColors";
import type { RoleBadge } from "../../hooks/useProfile";
import { monthsShownUp } from "./geometry";
import { YearBadge } from "./YearBadge";

/** "7 stars this year" / "First star waiting". */
export function starsThisYear(months: number[]): string {
  const n = monthsShownUp(months);
  if (n === 0) return "First star waiting";
  return `${n} ${n === 1 ? "star" : "stars"} this year`;
}

export function RoleBadgeTile({
  role,
  currentMonth,
  onToggle,
}: {
  role: RoleBadge;
  currentMonth: number;
  onToggle: (r: RoleBadge) => void;
}) {
  const c = role.constellation;
  return (
    <button
      type="button"
      data-testid="role-badge"
      aria-pressed={role.isFeatured}
      onClick={() => onToggle(role)}
      className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition-colors ${
        role.isFeatured
          ? "border-[#F97316] bg-[#FFF7EA]"
          : "border-[#ECE8DF] bg-white hover:border-[#DDD5C4]"
      }`}
    >
      {/* 56px: YearBadge only draws the orbit, quiet months and sparkles from 48px up. */}
      <YearBadge
        months={c.months}
        peak={c.peak}
        tint={constellationTint(role.domain)}
        size={56}
        sealed={c.sealed}
        currentMonth={currentMonth}
        label={role.label}
      />
      <div className="min-w-0">
        <div className="truncate text-[12.5px] font-semibold text-[#1F2937]">{role.label}</div>
        <div className="font-mono text-[9.5px] text-[#9CA3AF]">Year {role.tenureYears}</div>
        <div className="truncate font-mono text-[9.5px] text-[#B7A994]">{starsThisYear(c.months)}</div>
      </div>
    </button>
  );
}
