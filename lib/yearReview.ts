import { prisma } from "./prisma";

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

// A role needs at least this many goals in the year to be eligible for
// "most consistent" — otherwise a role with one lucky goal (100%) would
// always win over a role that showed up every week.
const MIN_GOALS_FOR_CONSISTENCY = 6;

function yearRange(year: number) {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
    midYear: new Date(Date.UTC(year, 6, 1)), // July 1 — splits H1/H2 for "most improved"
  };
}

function completionRate(goals: { status: string }[]): number | null {
  if (goals.length === 0) return null;
  const done = goals.filter((g) => g.status === "DONE").length;
  return done / goals.length;
}

export async function getYearReview(userId: string, year: number) {
  const { start, end, midYear } = yearRange(year);

  const roles = await prisma.role.findMany({
    where: { userId },
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
  const totalGoals = allGoals.length;
  const completedCount = completedGoals.length;
  const overallRate = totalGoals
    ? Math.round((completedCount / totalGoals) * 100)
    : 0;

  const activeDays = await prisma.activityDay.count({
    where: { userId, date: { gte: start, lt: end } },
  });

  const monthCounts = new Array(12).fill(0);
  completedGoals.forEach((g) => monthCounts[g.completedAt!.getUTCMonth()]++);
  const hasAnyMonth = monthCounts.some((c) => c > 0);
  const busiestMonth = hasAnyMonth
    ? MONTH_NAMES[monthCounts.indexOf(Math.max(...monthCounts))]
    : null;

  const sortedByDate = [...completedGoals].sort(
    (a, b) => a.completedAt!.getTime() - b.completedAt!.getTime(),
  );
  const firstCompleted = sortedByDate[0]
    ? { title: sortedByDate[0].title, date: sortedByDate[0].completedAt }
    : null;
  const mostRecentCompleted = sortedByDate.length
    ? {
        title: sortedByDate[sortedByDate.length - 1].title,
        date: sortedByDate[sortedByDate.length - 1].completedAt,
      }
    : null;

  // ---------------- role insights ----------------
  let mostImproved: any = null;
  for (const r of roles) {
    const h1Goals = r.goals.filter(
      (g) => g.weekStart >= start && g.weekStart < midYear,
    );
    const h2Goals = r.goals.filter(
      (g) => g.weekStart >= midYear && g.weekStart < end,
    );
    const h1Rate = completionRate(h1Goals);
    const h2Rate = completionRate(h2Goals);
    if (h1Rate === null || h2Rate === null) continue; // needs goals in both halves to compare

    const delta = h2Rate - h1Rate;
    if (!mostImproved || delta > mostImproved.deltaRaw) {
      mostImproved = {
        roleId: r.id,
        label: r.label,
        domain: r.domain,
        before: Math.round(h1Rate * 100),
        after: Math.round(h2Rate * 100),
        delta: Math.round(delta * 100),
        deltaRaw: delta,
      };
    }
  }
  if (mostImproved) delete mostImproved.deltaRaw;

  let mostConsistent: any = null;
  for (const r of roles) {
    if (r.goals.length < MIN_GOALS_FOR_CONSISTENCY) continue;
    const rate = completionRate(r.goals)!;
    if (!mostConsistent || rate > mostConsistent.rateRaw) {
      mostConsistent = {
        roleId: r.id,
        label: r.label,
        domain: r.domain,
        completionRate: Math.round(rate * 100),
        goalCount: r.goals.length,
        rateRaw: rate,
      };
    }
  }
  if (mostConsistent) delete mostConsistent.rateRaw;

  let longestHeld: any = null;
  for (const r of roles) {
    const tenureYears = year - r.createdAt.getFullYear() + 1;
    if (tenureYears < 1) continue; // role didn't exist yet in this year
    if (!longestHeld || tenureYears > longestHeld.tenureYears) {
      longestHeld = {
        roleId: r.id,
        label: r.label,
        domain: r.domain,
        tenureYears,
      };
    }
  }

  let quietest: any = null;
  for (const r of roles) {
    if (r.goals.length === 0) continue; // no goals at all isn't "quiet", it's inactive — leave it out
    if (!quietest || r.goals.length < quietest.goalCount) {
      quietest = {
        roleId: r.id,
        label: r.label,
        domain: r.domain,
        goalCount: r.goals.length,
      };
    }
  }

  const newThisYear = roles
    .filter((r) => r.createdAt.getUTCFullYear() === year)
    .map((r) => ({ roleId: r.id, label: r.label, domain: r.domain }));

  // ---------------- integrity ----------------
  const reviewEntries = await prisma.reviewEntry.findMany({
    where: { goal: { weekStart: { gte: start, lt: end }, role: { userId } } },
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
  const identityTitle = topDomains.length
    ? topDomains.map((d) => DOMAIN_ADJECTIVE[d] ?? d).join(", ")
    : "Still finding your pattern";

  // ---------------- rings portrait ----------------
  const rings = roles.map((r) => ({
    roleId: r.id,
    label: r.label,
    domain: r.domain,
    votesLogged: r.growthRings[0]?.votesLogged ?? 0,
    sealed: r.growthRings[0]?.sealed ?? false,
  }));

  const latestStatement = await prisma.missionStatement.findFirst({
    where: { userId },
    orderBy: { version: "desc" },
  });

  return {
    year,
    momentum: {
      totalGoals,
      completedGoals: completedCount,
      completionRate: overallRate,
      activeDays,
      busiestMonth,
      firstCompleted,
      mostRecentCompleted,
    },
    roleInsights: {
      mostImproved,
      mostConsistent,
      longestHeld,
      quietest,
      newThisYear,
    },
    integrity: { reflectedCount, carriedCount, cancelledCount },
    identity: { title: identityTitle, domainCounts },
    rings,
    missionStatement: latestStatement
      ? {
          signedName: latestStatement.signedName,
          signedAt: latestStatement.signedAt,
          contentEncrypted: Buffer.from(
            latestStatement.contentEncrypted,
          ).toString("base64"),
        }
      : null,
  };
}
