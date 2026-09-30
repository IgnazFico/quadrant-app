import { prisma } from "./prisma";
import type { RoleConstellation, YearStars } from "../types/constellation";

// GROWTH-RING-REDESIGN: monthly stars behind the constellation badge and sky.
//
// A month's value is how many goals were FINISHED in it, by `completedAt` (UTC,
// matching `busiestMonth` in lib/yearReview.ts). It is a count of showing up,
// never a success rate: missed goals and open goals do not enter into it, and
// there is no target. The visuals scale each role against its own busiest
// month (`peak`). Vote counts (lib/growthRing.ts) still drive milestones and
// the "showed up N times" copy.

type Options = {
  /** Last year to include (default: this year). */
  upToYear?: number;
  /** Only `upToYear`, one entry per role, for the badge. */
  currentYearOnly?: boolean;
};

export async function getRoleConstellations(
  userId: string,
  opts: Options = {},
): Promise<RoleConstellation[]> {
  const thisYear = new Date().getUTCFullYear();
  const upTo = opts.upToYear ?? thisYear;

  const roles = await prisma.role.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, label: true, domain: true, createdAt: true },
  });
  if (roles.length === 0) return [];

  const firstYear = Math.min(...roles.map((r) => r.createdAt.getUTCFullYear()));

  const [done, rings] = await Promise.all([
    prisma.goal.findMany({
      where: {
        role: { userId },
        status: "DONE",
        completedAt: {
          gte: new Date(Date.UTC(firstYear, 0, 1)),
          lt: new Date(Date.UTC(upTo + 1, 0, 1)),
        },
      },
      select: { roleId: true, completedAt: true },
    }),
    prisma.growthRing.findMany({
      where: { role: { userId }, year: { gte: firstYear, lte: upTo } },
      select: { roleId: true, year: true, sealed: true },
    }),
  ]);

  // roleId -> year -> twelve monthly counts
  const counts = new Map<string, Map<number, number[]>>();
  for (const g of done) {
    if (!g.completedAt) continue;
    const year = g.completedAt.getUTCFullYear();
    const byYear = counts.get(g.roleId) ?? new Map<number, number[]>();
    const months = byYear.get(year) ?? new Array(12).fill(0);
    months[g.completedAt.getUTCMonth()] += 1;
    byYear.set(year, months);
    counts.set(g.roleId, byYear);
  }

  const sealedRows = new Set(
    rings.filter((r) => r.sealed).map((r) => `${r.roleId}:${r.year}`),
  );

  return roles.map((role) => {
    const byYear = counts.get(role.id);
    const dataYears = byYear ? [...byYear.keys()] : [];
    const start = Math.min(role.createdAt.getUTCFullYear(), ...dataYears);

    // Peak spans the role's whole history, so a badge drawn for this year alone
    // still measures against the person's own busiest month, not just this year's.
    let peak = 1;
    byYear?.forEach((months) => months.forEach((c) => (peak = Math.max(peak, c))));

    const years: YearStars[] = [];
    for (let year = opts.currentYearOnly ? upTo : start; year <= upTo; year++) {
      if (year < start) continue; // the role did not exist yet
      years.push({
        year,
        months: byYear?.get(year) ?? new Array(12).fill(0),
        // The seal cron can lag, but a year that has ended is closed regardless.
        sealed: year < thisYear || sealedRows.has(`${role.id}:${year}`),
      });
    }

    return { roleId: role.id, label: role.label, domain: role.domain, peak, years };
  });
}
