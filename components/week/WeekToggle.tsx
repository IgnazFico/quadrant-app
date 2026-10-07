"use client";

import type { WeekView } from "../../hooks/useWeek";

const OPTIONS: { value: WeekView; label: string }[] = [
  { value: "this", label: "This week" },
  { value: "next", label: "Next week" },
];

/**
 * This week / Next week. Replaces the old prev/next arrows, which let you
 * browse any week. Habit 3's weekly organizing only ever looks at the week
 * in progress and the one ahead, so those are the only two choices; looking
 * back is the weekly review's job. See useWeek().
 */
export function WeekToggle({
  view,
  onChange,
  size = "md",
}: {
  view: WeekView;
  onChange: (v: WeekView) => void;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-2.5 py-1 text-[11.5px]" : "px-3 py-1.5 text-[12.5px]";
  return (
    <div role="group" aria-label="Which week" className="inline-flex rounded-lg border border-[#E5E1D8] bg-[#F3F1EC] p-0.5">
      {OPTIONS.map((o) => {
        const active = view === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`rounded-md font-sans font-semibold transition-colors ${pad} ${
              active
                ? "bg-white text-[#1F2937] shadow-sm ring-1 ring-black/5"
                : "text-[#9CA3AF] hover:text-[#4B5563]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** "Oct 5 – Oct 11" */
export function weekRangeLabel(days: Date[]) {
  const f = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${f(days[0])} – ${f(days[6])}`;
}
