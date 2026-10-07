import type { YearMonth } from "./week";

export type PatternCardId = "rhythm" | "presence" | "balance" | "style" | "honesty";

/**
 * Which month a Patterns card shows. Rhythm, Balance and Honesty count by the
 * goal's week (weekStart), so during the early-month split window they still
 * show the previous month; Presence and Style count by calendar day and are
 * always the current month.
 */
export function cardMonth(id: PatternCardId, split: boolean): "current" | "previous" {
  if (!split) return "current";
  return id === "presence" || id === "style" ? "current" : "previous";
}

/**
 * The split applies only inside the early-month window (`inWindow`) and only
 * when the previous month actually has goals (any status). Without goals,
 * Rhythm/Balance/Honesty would be empty cards under a previous-month label.
 */
export function shouldSplit(inWindow: boolean, previousGoalCount: number | null | undefined): boolean {
  return inWindow && (previousGoalCount ?? 0) > 0;
}

export type { YearMonth };
