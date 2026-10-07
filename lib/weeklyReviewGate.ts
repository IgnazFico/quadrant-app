import { prisma } from "./prisma";
import { startOfWeek, addDays, weekRange, reviewCandidateWeek } from "./week";

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
 * Invariant the whole review flow depends on: the week returned here must be
 * a week GET /api/review and POST /api/review/complete can actually load,
 * i.e. a Monday. Both routes snap any requested date to its Monday and match
 * goals by equality. A goal stored on a non-Monday would be found here but
 * never loaded there, so the gate could never be cleared (redirect loop).
 * The goals_weekStart_is_monday CHECK constraint guarantees it at the DB.
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
 * The single source of truth for "which week does the review show, and which
 * goals are in it". Used by GET /api/review and POST /api/review/complete so
 * they can never disagree with each other or with the gate above.
 *
 * - The week is always snapped to its Monday, so the client gets one key per week.
 * - Goals are matched by range (Mon..Sun), not equality, so every goal the gate
 *   can see in that week is loaded, even if it was stored on another weekday.
 */
export async function resolveReviewWeek(
  userId: string,
  requested: string | null,
): Promise<Date> {
  return startOfWeek(
    requested
      ? new Date(requested)
      : (await getEarliestUnreviewedWeekStart(userId)) ?? addDays(startOfWeek(), -7),
  );
}

export function reviewWeekGoalsWhere(userId: string, weekStart: Date) {
  return { weekStart: weekRange(weekStart), role: { userId } };
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

/** True if `week` has a goal that is neither done nor reflected on. */
async function hasUnresolvedGoalsIn(userId: string, week: Date): Promise<boolean> {
  const count = await prisma.goal.count({
    where: { ...reviewWeekGoalsWhere(userId, week), status: { not: "DONE" }, reviewEntry: null },
  });
  return count > 0;
}

/**
 * Whether `week` may be completed now: any week the gate counts as past, or
 * the week ending for the user (their Sunday, or their Monday morning ahead
 * of UTC). Stops an ongoing week from being closed out mid-week, which would
 * carry its open goals into next week early.
 */
export function isReviewableWeek(
  week: Date,
  now: Date,
  timeZone: string | null | undefined,
): boolean {
  const serverPastWeek = addDays(startOfWeek(now), -7);
  if (week.getTime() <= serverPastWeek.getTime()) return true;
  return reviewCandidateWeek(now, timeZone, serverPastWeek)?.week.getTime() === week.getTime();
}

/**
 * Which week the review should show, and whether it's required.
 *
 *   required  a past week is unresolved: the layout gate redirects (unchanged)
 *   open      `week` can be reviewed now, required or not
 *
 * On top of the gate, the review opens on the user's own Sunday for the week
 * that's ending (Habit 3: look back, then plan the coming week). That early
 * review is offered, never forced: the gate still only fires once the week
 * is over. `timeZone` is the browser's IANA zone; without it only the gate
 * applies.
 */
export async function getReviewWindow(
  userId: string,
  timeZone: string | null | undefined,
  now: Date = new Date(),
): Promise<{ required: boolean; week: Date | null }> {
  const earliest = await getEarliestUnreviewedWeekStart(userId);
  if (earliest) return { required: true, week: startOfWeek(earliest) };

  const candidate = reviewCandidateWeek(now, timeZone, addDays(startOfWeek(now), -7));
  if (candidate && (await hasUnresolvedGoalsIn(userId, candidate.week))) {
    return { required: false, week: candidate.week };
  }
  return { required: false, week: null };
}
