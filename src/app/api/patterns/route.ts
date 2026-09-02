import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { getPatterns } from "../../../../lib/patterns";

/** GET /api/patterns?year=2026&month=8 — defaults to the current month. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const url = new URL(req.url);
  const now = new Date();
  const year =
    parseInt(url.searchParams.get("year") ?? "", 10) || now.getFullYear();
  const month =
    parseInt(url.searchParams.get("month") ?? "", 10) || now.getMonth() + 1;

  const data = await getPatterns(userId, year, month);
  return NextResponse.json(data);
}
