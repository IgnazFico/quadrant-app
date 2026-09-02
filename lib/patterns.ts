import { prisma } from "./prisma";

function monthRange(year: number, month: number) {
  // month is 1-indexed (1 = January) to match how the API/query params read
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function getPatterns(userId: string, year: number, month: number) {
  const { start, end } = monthRange(year, month);

  const roles = await prisma.role.findMany({
    where: { userId },
    include: { goals: { where: { weekStart: { gte: start, lt: end } } } },
  });
  const allGoals = roles.flatMap((r) => r.goals);
  const completedGoals = allGoals.filter((g) => g.status === "DONE" && g.completedAt);

  const scheduleBlocks = await prisma.scheduleBlock.findMany({
    where: { role: { userId }, day: { gte: start, lt: end } },
  });

  const activityDays = await prisma.activityDay.findMany({
    where: { userId, date: { gte: start, lt: end } },
    select: { date: true },
  });

  const reviewEntries = await prisma.reviewEntry.findMany({
    where: { goal: { weekStart: { gte: start, lt: end }, role: { userId } } },
  });

  // ---------------- rhythm ----------------
  const weekdayCounts = new Array(7).fill(0);
  completedGoals.forEach((g) => weekdayCounts[g.completedAt!.getUTCDay()]++);
  const weekday = WEEKDAY_LABELS.map((label, i) => ({ label, count: weekdayCounts[i] }));

  const timedBlocks = scheduleBlocks.filter((b) => !b.isPriority && b.hour !== null);
  const daypartCounts = { morning: 0, afternoon: 0, evening: 0 };
  timedBlocks.forEach((b) => {
    const h = b.hour!;
    if (h >= 5 && h < 12) daypartCounts.morning++;
    else if (h >= 12 && h < 17) daypartCounts.afternoon++;
    else daypartCounts.evening++;
  });
  const timedTotal = timedBlocks.length;
  const daypart = timedTotal
    ? {
        morning: Math.round((daypartCounts.morning / timedTotal) * 100),
        afternoon: Math.round((daypartCounts.afternoon / timedTotal) * 100),
        evening: Math.round((daypartCounts.evening / timedTotal) * 100),
      }
    : null;

  // ---------------- presence ----------------
  const activeDates = new Set(activityDays.map((a) => a.date.toISOString().slice(0, 10)));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const heatmap = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1, i + 1));
    return { date: d.toISOString().slice(0, 10), active: activeDates.has(d.toISOString().slice(0, 10)) };
  });

  // ---------------- balance ----------------
  const totalCompleted = completedGoals.length;
  const balance = roles
    .map((r) => {
      const done = r.goals.filter((g) => g.status === "DONE").length;
      return { roleId: r.id, label: r.label, domain: r.domain, completed: done };
    })
    .filter((r) => r.completed > 0)
    .map((r) => ({ ...r, share: totalCompleted ? Math.round((r.completed / totalCompleted) * 100) : 0 }))
    .sort((a, b) => b.completed - a.completed);
  const rolesWithActivity = balance.length;

  // ---------------- style ----------------
  const scheduledCount = scheduleBlocks.filter((b) => !b.isPriority).length;
  const flexibleCount = scheduleBlocks.filter((b) => b.isPriority).length;
  const scheduleTotal = scheduledCount + flexibleCount;
  const linkedCount = scheduleBlocks.filter((b) => b.goalId !== null).length;
  const standaloneCount = scheduleBlocks.length - linkedCount;

  const style = scheduleTotal
    ? {
        scheduledPct: Math.round((scheduledCount / scheduleTotal) * 100),
        flexiblePct: Math.round((flexibleCount / scheduleTotal) * 100),
        linkedPct: scheduleBlocks.length ? Math.round((linkedCount / scheduleBlocks.length) * 100) : 0,
        standalonePct: scheduleBlocks.length ? Math.round((standaloneCount / scheduleBlocks.length) * 100) : 0,
      }
    : null;

  // ---------------- honesty ----------------
  const reflectedCount = reviewEntries.length;
  const carriedCount = reviewEntries.filter((e) => e.choice === "CARRY").length;
  const cancelledCount = reviewEntries.filter((e) => e.choice === "CANCEL").length;

  return {
    year,
    month,
    rhythm: { weekday, daypart },
    presence: { activeDaysCount: activeDates.size, heatmap },
    balance: { roles: balance, rolesWithActivity, totalRoles: roles.length },
    style,
    honesty: { reflectedCount, carriedCount, cancelledCount },
  };
}
