import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { recordActivityToday } from "../../../../../lib/missionGate";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;
  await recordActivityToday(userId);
  return NextResponse.json({ ok: true });
}
