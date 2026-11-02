import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { carryTargetWeek, currentWeekFor, dayKey } from "../../../../../lib/week";
import { carryGoalsForward } from "../../../../../lib/carryForward";
import {
  getEarliestUnreviewedWeekStart,
  isReviewableWeek,
  resolveReviewWeek,
  reviewWeekGoalsWhere,
} from "../../../../../lib/weeklyReviewGate";

const bodySchema = z.object({
  weekStart: z.string(), // the week being reviewed
  tz: z.string().max(64).optional(), // browser IANA zone; enables the Sunday review
});

/**
 * POST /api/review/complete
 *
 * Re-checks, server-side, that every non-done goal from the reviewed week
 * has a ReviewEntry — mirroring the client's disabled-button gate so it
 * can't be bypassed by calling this endpoint directly. Only then does it
 * roll carried-forward goals (done+carryForward, or missed+choice=CARRY)
 * into the week after the reviewed one as fresh Goal rows: the Sunday review
 * of the ongoing week carries into NEXT week, a late review of an older week
 * into the current one (lib/week.ts carryTargetWeek). The ongoing week can
 * only be completed on the user's Sunday (isReviewableWeek).
 *
 * Also re-checks, after committing, whether ANY past week still has an
 * unresolved goal (a user can be behind on more than one week) and
 * returns that as `nextUnreviewedWeekStart`. The layout's redirect gate
 * looks at ALL past weeks, not just the one being reviewed here — if the
 * client always navigated away after completing a single week, and an
 * older week was still outstanding, the gate would immediately redirect
 * back to /weekly-review, which would then re-show the (already
 * completed) week the client had cached, looking like a loop. Returning
 * the next outstanding week lets the client advance to it in place
 * instead of leaving and bouncing straight back.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const reviewedWeek = await resolveReviewWeek(userId, parsed.data.weekStart);
  const now = new Date();
  const tz = parsed.data.tz;
  if (!isReviewableWeek(reviewedWeek, now, tz)) {
    return NextResponse.json(
      { error: "This week's review opens on Sunday." },
      { status: 409 },
    );
  }

  // Same week + matching as GET /api/review and the gate (lib/weeklyReviewGate.ts).
  const goals = await prisma.goal.findMany({
    where: reviewWeekGoalsWhere(userId, reviewedWeek),
    include: { reviewEntry: true },
  });

  const unresolvedMissed = goals.filter(
    (g: any) => g.status !== "DONE" && !g.reviewEntry,
  );
  if (unresolvedMissed.length > 0) {
    return NextResponse.json(
      {
        error:
          "Every missed goal needs a reflection before the review can be completed",
      },
      { status: 409 },
    );
  }

  const toCarry = goals.filter(
    (g: any) =>
      (g.status === "DONE" && g.carryForward) ||
      g.reviewEntry?.choice === "CARRY",
  );

  const targetWeek = carryTargetWeek(reviewedWeek, currentWeekFor(now, tz));

  // Idempotent: completing the same week twice (a retry, a double click, or a
  // week re-opened after a data repair) must not duplicate carried goals.
  // WO-029: by source goal id, not by title (lib/carryForward.ts).
  const carriedCount = await carryGoalsForward(toCarry, targetWeek);

  const nextUnreviewedWeekStart = await getEarliestUnreviewedWeekStart(userId);

  return NextResponse.json({
    carriedCount,
    // The week carried goals went to; the client sends Sunday reviewers on
    // to plan it (/goals?week=next).
    carriedInto: dayKey(targetWeek),
    nextUnreviewedWeekStart,
  });
}
