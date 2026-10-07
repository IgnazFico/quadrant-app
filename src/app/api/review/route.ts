import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import {
  addDays,
  currentWeekFor,
  reviewCandidateWeek,
  startOfWeek,
  weekRange,
} from "../../../../lib/week";
import { getReviewWindow } from "../../../../lib/weeklyReviewGate";

/**
 * GET /api/review?weekStart=YYYY-MM-DD&tz=Area/City
 * Without a weekStart param, defaults to the OLDEST past week that still
 * has an unresolved goal (matching the layout's gate — see
 * lib/weeklyReviewGate.ts), falling back to last week if nothing is
 * outstanding. This must stay in sync with the gate: if the gate instead
 * showed "last week" while an older week was still unresolved, completing
 * "last week" could never satisfy the gate, causing a redirect loop back
 * to this same page.
 *
 * `tz` (the browser's IANA zone) also opens the review on the user's own
 * Sunday for the week that's ending, before it is required (see
 * getReviewWindow). Response flags:
 *   due    a past week is unresolved; the layout gate is redirecting here
 *   open   some week can be reviewed now (due, or the Sunday review)
 *   early  the week shown is the user's ongoing week (Sunday review)
 *
 * The returned weekStart is always a Monday (startOfWeek). The client must
 * treat it as an opaque key and send it back verbatim; it is only ever
 * re-snapped here, never re-derived from local-time Date math.
 *
 * Reason text stays encrypted here — the client decrypts it locally with
 * the master key before displaying it. This route only ever sees ciphertext.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  const url = new URL(req.url);
  const param = url.searchParams.get("weekStart");
  const tz = url.searchParams.get("tz");
  const now = new Date();
  // When neither due nor open, the review has nothing to ask yet and the
  // desktop Reflect page shows "this week so far" instead (see
  // components/reflect/ReflectDesktopView.tsx).
  const reviewWindow = await getReviewWindow(userId, tz, now);
  const lastWeek = addDays(startOfWeek(now), -7);
  // Default: the week needing review; else the week ending for the user (so
  // a Sunday visit shows this week even if every goal in it is done); else
  // last week.
  const weekStart = startOfWeek(
    param
      ? new Date(param)
      : reviewWindow.week ?? reviewCandidateWeek(now, tz, lastWeek)?.week ?? lastWeek,
  );
  const early = weekStart.getTime() === currentWeekFor(now, tz).getTime();
  // Range, not equality: this must load every goal the gate can see in this
  // week, or the gate can never be cleared (see lib/weeklyReviewGate.ts).
  const inWeek = weekRange(weekStart);

  const roles = await prisma.role.findMany({
    where: { userId, goals: { some: { weekStart: inWeek } } },
    orderBy: { createdAt: "asc" },
    include: {
      goals: {
        where: { weekStart: inWeek },
        orderBy: { createdAt: "asc" },
        include: { reviewEntry: true },
      },
    },
  });

  const serialized = roles.map((r: any) => ({
    ...r,
    goals: r.goals.map((g: any) => ({
      ...g,
      reviewEntry: g.reviewEntry
        ? {
            id: g.reviewEntry.id,
            choice: g.reviewEntry.choice,
            reasonEncrypted: Buffer.from(
              g.reviewEntry.reasonEncrypted,
            ).toString("base64"),
          }
        : null,
    })),
  }));

  return NextResponse.json({
    weekStart,
    roles: serialized,
    due: reviewWindow.required,
    open: reviewWindow.week !== null,
    early,
  });
}
