import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { getYearReview } from "../../../../lib/yearReview";

/** GET /api/year-review?year=2026 — defaults to the current calendar year. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  const url = new URL(req.url);
  const yearParam = url.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  if (Number.isNaN(year)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const data = await getYearReview(userId, year);
  return NextResponse.json(data);
}
