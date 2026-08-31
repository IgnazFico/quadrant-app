import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { startOfWeek, addDays } from "../../../../lib/week";

/**
 * GET /api/review?weekStart=YYYY-MM-DD
 * Defaults to LAST week (the most recently completed one) — reviewing the
 * current, still-in-progress week wouldn't make sense.
 *
 * Reason text stays encrypted here — the client decrypts it locally with
 * the master key before displaying it. This route only ever sees ciphertext.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const url = new URL(req.url);
  const param = url.searchParams.get("weekStart");
  const weekStart = param
    ? startOfWeek(new Date(param))
    : addDays(startOfWeek(), -7);

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

  const serialized = roles.map((r) => ({
    ...r,
    goals: r.goals.map((g) => ({
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
