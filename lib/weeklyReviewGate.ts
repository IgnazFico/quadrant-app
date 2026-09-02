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
 * Returns the weekly review gate status.
 * Required when there are unreviewed goals from past weeks that need reflection.
 */
export async function getWeeklyReviewGateStatus(userId: string) {
  const required = await hasUnreviewedPastGoals(userId);
  return {
    required,
  };
}
