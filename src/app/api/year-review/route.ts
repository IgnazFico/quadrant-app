import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { getYearReview } from "../../../../lib/yearReview";
import { isRecapWindowOpenOnServer } from "../../../../lib/yearRecapWindow";

/**
 * GET /api/year-review?year=2026 — defaults to the current calendar year.
 *
 * WO-033 (D-039 C): answers only from Dec 20 to Dec 31 (Asia/Jakarta, server
 * clock), whatever `year` is asked for. Outside the window: 403 with
 * code "RECAP_WINDOW_CLOSED" and no ceremony data. The login check comes first.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  if (!isRecapWindowOpenOnServer()) {
    return NextResponse.json(
      { error: "The year review opens on December 20.", code: "RECAP_WINDOW_CLOSED" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const url = new URL(req.url);
  const yearParam = url.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  if (Number.isNaN(year)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const data = await getYearReview(userId, year);
  return NextResponse.json(data);
}
