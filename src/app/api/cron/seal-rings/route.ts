import { NextResponse } from "next/server";
import { sealPastYearRings } from "../../../../../lib/growthRing";

/**
 * GET /api/cron/seal-rings
 *
 * Meant to be called by Vercel Cron (see vercel.json). Protected by
 * CRON_SECRET so it can't be triggered by anyone who finds the URL.
 * Vercel automatically sends this as a Bearer token when it invokes
 * scheduled functions — see https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sealedCount = await sealPastYearRings();
  return NextResponse.json({ sealed: sealedCount });
}
