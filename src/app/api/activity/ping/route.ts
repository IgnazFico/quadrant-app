import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { recordActivityToday } from "../../../../../lib/missionGate";
import { parseClientDay } from "../../../../../lib/week";

/**
 * POST /api/activity/ping  body: { day: "YYYY-MM-DD" }
 * `day` is the user's local calendar date, so the server never has to know
 * the user's timezone. Days outside UTC-today ±1 are rejected.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const day = parseClientDay(body?.day);
  if (!day) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }

  await recordActivityToday(userId, day);
  return NextResponse.json({ ok: true });
}
