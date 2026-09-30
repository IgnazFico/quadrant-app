import { prisma } from "./prisma";
import { startOfWeek, addDays } from "./week";

/**
 * Checks if the user has any unreviewed goals from past weeks.
 * Unresolved missed goals (status != DONE and no reviewEntry) from past weeks
 * trigger the weekly review prompt before the user proceeds with setting new weekly goals.
 */
export async function hasUnreviewedPastGoals(userId: string): Promise<boolean> {
  const pastWeekStart = addDays(startOfWeek(), -7);
  const count = await prisma.goal.count({
    where: {
      weekStart: { lte: pastWeekStart },
      role: { userId },
      status: { not: "DONE" },
      reviewEntry: null,
    },
  });
  return count > 0;
}

/**
 * Returns the weekStart (UTC midnight Monday) of the OLDEST past week that
 * still has an unresolved goal, or null if every past week is clear.
 *
 * The review page must always surface this week, not just "last week" —
 * a user can have unresolved goals sitting in more than one past week
 * (e.g. they skipped reviewing for a while), and completing the single
 * most recent week does not clear the gate if an older week is still
 * outstanding. Reviewing weeks oldest-first also makes more sense for
 * the user than jumping around.
 */
export async function getEarliestUnreviewedWeekStart(
  userId: string,
): Promise<Date | null> {
  const pastWeekStart = addDays(startOfWeek(), -7);
  const goal = await prisma.goal.findFirst({
    where: {
      weekStart: { lte: pastWeekStart },
      role: { userId },
      status: { not: "DONE" },
      reviewEntry: null,
    },
    orderBy: { weekStart: "asc" },
    select: { weekStart: true },
  });
  return goal?.weekStart ?? null;
}

/**
 * Returns the weekly review gate status.
 * Required when there are unreviewed goals from past weeks that need reflection.
 */
export async function getWeeklyReviewGateStatus(userId: string) {
  const earliestUnreviewedWeekStart = await getEarliestUnreviewedWeekStart(userId);
  return {
    required: earliestUnreviewedWeekStart !== null,
    earliestUnreviewedWeekStart,
  };
}
