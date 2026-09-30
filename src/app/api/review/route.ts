import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { startOfWeek, addDays } from "../../../../lib/week";
import { getEarliestUnreviewedWeekStart } from "../../../../lib/weeklyReviewGate";

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
  const weekStart = param
    ? startOfWeek(new Date(param))
    : (await getEarliestUnreviewedWeekStart(userId)) ?? addDays(startOfWeek(), -7);

  const roles = await prisma.role.findMany({
    where: { userId, goals: { some: { weekStart } } },
    orderBy: { createdAt: "asc" },
    include: {
      goals: {
        where: { weekStart },
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

  return NextResponse.json({ weekStart, roles: serialized });
}
