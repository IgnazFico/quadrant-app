import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { startOfWeek, addDays } from "../../../../../lib/week";

/** GET /api/schedule/week?weekStart=YYYY-MM-DD (defaults to the current week) */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  const url = new URL(req.url);
  const param = url.searchParams.get("weekStart");
  const weekStart = param ? startOfWeek(new Date(param)) : startOfWeek();
  const weekEnd = addDays(weekStart, 6);

  const blocks = await prisma.scheduleBlock.findMany({
    where: {
      role: { userId },
      day: { gte: weekStart, lte: weekEnd },
    },
    include: { role: true },
    orderBy: [{ day: "asc" }, { hour: "asc" }],
  });

  return NextResponse.json({ weekStart, blocks });
}
