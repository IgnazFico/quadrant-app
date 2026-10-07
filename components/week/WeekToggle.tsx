"use client";

import type { WeekView } from "../../hooks/useWeek";
import { SegmentedToggle, type SegmentItem } from "../ui/SegmentedToggle";

const OPTIONS: SegmentItem<WeekView>[] = [
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
  return (
    <SegmentedToggle items={OPTIONS} value={view} onChange={onChange} ariaLabel="Which week" size={size} />
  );
}

/** "Oct 5 – Oct 11" */
export function weekRangeLabel(days: Date[]) {
  const f = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${f(days[0])} – ${f(days[6])}`;
}
