import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { weekRange } from "../../../../lib/week";
import {
  getEarliestUnreviewedWeekStart,
  resolveReviewWeek,
} from "../../../../lib/weeklyReviewGate";

/**
 * GET /api/review?weekStart=YYYY-MM-DD
 * Without a weekStart param, defaults to the OLDEST past week that still
 * has an unresolved goal (matching the layout's gate — see
 * lib/weeklyReviewGate.ts), falling back to last week if nothing is
 * outstanding. This must stay in sync with the gate: if the gate instead
 * showed "last week" while an older week was still unresolved, completing
 * "last week" could never satisfy the gate, causing a redirect loop back
 * to this same page.
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
  // `due`: some past week still has an unresolved goal (the same check as
  // the layout gate). When false, the review has nothing to ask yet and the
  // desktop Reflect page shows "this week so far" instead (see
  // components/reflect/ReflectDesktopView.tsx).
  const earliest = await getEarliestUnreviewedWeekStart(userId);
  const weekStart = await resolveReviewWeek(userId, param);
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

  return NextResponse.json({ weekStart, roles: serialized, due: earliest !== null });
}
