import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { startOfWeek } from "../../../../../lib/week";

const bodySchema = z.object({
  weekStart: z.string(), // the week being reviewed (the past week)
});

/**
 * POST /api/review/complete
 *
 * Re-checks, server-side, that every non-done goal from the reviewed week
 * has a ReviewEntry — mirroring the client's disabled-button gate so it
 * can't be bypassed by calling this endpoint directly. Only then does it
 * roll carried-forward goals (done+carryForward, or missed+choice=CARRY)
 * into the CURRENT week as fresh Goal rows.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const reviewedWeek = startOfWeek(new Date(parsed.data.weekStart));

  const goals = await prisma.goal.findMany({
    where: { weekStart: reviewedWeek, role: { userId } },
    include: { reviewEntry: true },
  });

  const unresolvedMissed = goals.filter(
    (g) => g.status !== "DONE" && !g.reviewEntry,
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
    (g) =>
      (g.status === "DONE" && g.carryForward) ||
      g.reviewEntry?.choice === "CARRY",
  );

  const currentWeek = startOfWeek();
  const created = await prisma.$transaction(
    toCarry.map((g) =>
      prisma.goal.create({
        data: { roleId: g.roleId, title: g.title, weekStart: currentWeek },
      }),
    ),
  );

  return NextResponse.json({ carriedCount: created.length });
}
