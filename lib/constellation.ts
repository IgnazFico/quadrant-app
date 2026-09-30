import { prisma } from "./prisma";
import type {
  MonthScores,
  RoleConstellation,
  YearScores,
} from "../types/constellation";

// GROWTH-RING-REDESIGN: monthly scores behind the constellation badge and sky.
//
// A month's score is DONE / (DONE + MISSED) for goals whose `weekStart` falls
// in that month (UTC, matching lib/yearReview.ts). IN_PROGRESS goals are left
// out so a week that is still open never drags a month down; a month with no
// finished goals is null. Vote counts (lib/growthRing.ts) still drive
// milestones and are deliberately not used here.

type Options = {
  /** Last year to include (default: this year). */
  upToYear?: number;
  /** Only `upToYear`, one entry per role, for the badge. */
  currentYearOnly?: boolean;
};

const emptyMonths = (): MonthScores => new Array(12).fill(null);

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

  const firstYear = opts.currentYearOnly
    ? upTo
    : Math.min(...roles.map((r) => r.createdAt.getUTCFullYear()));

  const [grouped, rings] = await Promise.all([
    prisma.goal.groupBy({
      by: ["roleId", "weekStart", "status"],
      where: {
        role: { userId },
        status: { in: ["DONE", "MISSED"] },
        weekStart: {
          gte: new Date(Date.UTC(firstYear, 0, 1)),
          lt: new Date(Date.UTC(upTo + 1, 0, 1)),
        },
      },
      _count: { _all: true },
    }),
    prisma.growthRing.findMany({
      where: { role: { userId }, year: { gte: firstYear, lte: upTo } },
      select: { roleId: true, year: true, sealed: true },
    }),
  ]);

  // roleId -> year -> month -> tallies
  const tally = new Map<string, Map<number, { done: number; missed: number }[]>>();
  for (const g of grouped) {
    const year = g.weekStart.getUTCFullYear();
    const month = g.weekStart.getUTCMonth();
    const byYear = tally.get(g.roleId) ?? new Map();
    const months =
      byYear.get(year) ??
      Array.from({ length: 12 }, () => ({ done: 0, missed: 0 }));
    if (g.status === "DONE") months[month].done += g._count._all;
    else months[month].missed += g._count._all;
    byYear.set(year, months);
    tally.set(g.roleId, byYear);
  }

  const sealedRows = new Set(
    rings.filter((r) => r.sealed).map((r) => `${r.roleId}:${r.year}`),
  );

  return roles.map((role) => {
    const byYear = tally.get(role.id);
    const dataYears = byYear ? [...byYear.keys()] : [];
    const start = opts.currentYearOnly
      ? upTo
      : Math.min(role.createdAt.getUTCFullYear(), ...dataYears);

    const years: YearScores[] = [];
    for (let year = start; year <= upTo; year++) {
      const tallies = byYear?.get(year);
      const months: MonthScores = tallies
        ? tallies.map((t) => {
            const finished = t.done + t.missed;
            return finished === 0
              ? null
              : Math.round((t.done / finished) * 100) / 100;
          })
        : emptyMonths();
      years.push({
        year,
        months,
        // The seal cron can lag, but a year that has ended is closed regardless.
        sealed: year < thisYear || sealedRows.has(`${role.id}:${year}`),
      });
    }

    return {
      roleId: role.id,
      label: role.label,
      domain: role.domain,
      years,
    };
  });
}
