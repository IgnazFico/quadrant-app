import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { getPatterns } from "../../../../lib/patterns";
import { isValidTimeZone } from "../../../../lib/week";

/**
 * GET /api/patterns?year=2026&month=8&tz=Asia/Bangkok
 * Clients should always pass their local year/month and IANA timezone; the
 * fallbacks are the server clock (UTC on Vercel) and UTC. `tz` only affects
 * which weekday a finished goal counts on (Rhythm).
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  const url = new URL(req.url);
  const now = new Date();
  const year =
    parseInt(url.searchParams.get("year") ?? "", 10) || now.getFullYear();
  const monthParam = parseInt(url.searchParams.get("month") ?? "", 10);
  const month = monthParam >= 1 && monthParam <= 12 ? monthParam : now.getMonth() + 1;
  const tzParam = url.searchParams.get("tz");
  const timeZone = isValidTimeZone(tzParam) ? tzParam : "UTC";

  const data = await getPatterns(userId, year, month, timeZone);
  return NextResponse.json(data);
}
