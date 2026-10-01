import { prisma } from "./prisma";
import { getRoleConstellations } from "./constellation";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DOMAIN_ADJECTIVE: Record<string, string> = {
  career: "Career-Rooted",
  family: "Family-Anchored",
  health: "Health-Rising",
  growth: "Growth-Minded",
  relationships: "Relationship-Focused",
  community: "Community-Driven",
  values: "Values-Led",
};

function yearRange(year: number) {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

/**
 * Data for the year-end ceremony (/year-review).
 *
 * Deliberately measures *showing up*, never success rate: no completion
 * percentage, no role rankings (most improved / most consistent /
 * quietest were removed along with the old chapter layout). The only
 * goal counts left are in `momentum` and are shown in the optional
 * "numbers" back matter after the ceremony ends.
 */
export async function getYearReview(userId: string, year: number) {
  const { start, end } = yearRange(year);

  const roles = await prisma.role.findMany({
    // A role created after this year didn't exist yet, so it isn't part of it.
    where: { userId, createdAt: { lt: end } },
    orderBy: { createdAt: "asc" }, // the user's own order; roles are never ranked
    include: {
      goals: { where: { weekStart: { gte: start, lt: end } } },
      growthRings: { where: { year } },
    },
  });

  const allGoals = roles.flatMap((r) => r.goals);
  const completedGoals = allGoals.filter(
    (g) => g.status === "DONE" && g.completedAt,
  );

  // ---------------- momentum ----------------
  const activeDays = await prisma.activityDay.count({
    where: { userId, date: { gte: start, lt: end } },
  });

  // Weeks the user sat down and planned: distinct weeks that have any goal.
  const weeksPlanned = new Set(
    allGoals.map((g) => g.weekStart.toISOString().slice(0, 10)),
  ).size;

  const monthCounts = new Array(12).fill(0);
  completedGoals.forEach((g) => monthCounts[g.completedAt!.getUTCMonth()]++);
  const busiestMonth = monthCounts.some((c) => c > 0)
    ? MONTH_NAMES[monthCounts.indexOf(Math.max(...monthCounts))]
    : null;

  const first = [...completedGoals].sort(
    (a, b) => a.completedAt!.getTime() - b.completedAt!.getTime(),
  )[0];
  const firstCompleted = first
    ? { title: first.title, date: first.completedAt! }
    : null;

  // ---------------- integrity ----------------
  const reviewEntries = await prisma.reviewEntry.findMany({
    where: { goal: { weekStart: { gte: start, lt: end }, role: { userId } } },
    select: { choice: true },
  });
  const reflectedCount = reviewEntries.length;
  const carriedCount = reviewEntries.filter((e) => e.choice === "CARRY").length;
  const cancelledCount = reviewEntries.filter(
    (e) => e.choice === "CANCEL",
  ).length;

  // ---------------- identity ----------------
  const domainCounts: Record<string, number> = {};
  completedGoals.forEach((g) => {
    const role = roles.find((r) => r.id === g.roleId);
    if (role) domainCounts[role.domain] = (domainCounts[role.domain] ?? 0) + 1;
  });
  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([domain]) => domain);
  // null = no pattern yet; the ceremony says "It was the one where you began."
  const identityTitle = topDomains.length
    ? topDomains.map((d) => DOMAIN_ADJECTIVE[d] ?? d).join(", ")
    : null;

  // ---------------- rings ----------------
  // GROWTH-RING-REDESIGN: alongside the vote count, each role's twelve monthly
  // star counts (goals finished per month) and its own busiest month.
  const constellations = new Map(
    (await getRoleConstellations(userId, { upToYear: year, currentYearOnly: true })).map(
      (c) => [c.roleId, c],
    ),
  );
  const rings = roles.map((r) => ({
    roleId: r.id,
    label: r.label,
    domain: r.domain,
    months: constellations.get(r.id)?.years[0]?.months ?? new Array(12).fill(0),
    peak: constellations.get(r.id)?.peak ?? 1,
    votesLogged: r.growthRings[0]?.votesLogged ?? 0,
    sealed: r.growthRings[0]?.sealed ?? false,
    newThisYear: r.createdAt.getUTCFullYear() === year,
  }));

  // The statement as it stood during this year (not one signed later).
  const statement = await prisma.missionStatement.findFirst({
    where: { userId, signedAt: { lt: end } },
    orderBy: { version: "desc" },
  });

  return {
    year,
    momentum: {
      totalGoals: allGoals.length,
      completedGoals: completedGoals.length,
      activeDays,
      weeksPlanned,
      busiestMonth,
      firstCompleted,
    },
    integrity: { reflectedCount, carriedCount, cancelledCount },
    identity: { title: identityTitle, domainCounts },
    rings,
    missionStatement: statement
      ? {
          signedName: statement.signedName,
          signedAt: statement.signedAt,
          contentEncrypted: Buffer.from(statement.contentEncrypted).toString(
            "base64",
          ),
        }
      : null,
  };
}
