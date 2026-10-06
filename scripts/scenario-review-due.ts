// STAGING ONLY. Puts the seed test user (ignaz.fico@quadrant.com) into the
// state that triggers the weekly-review gate: last week has 5 DONE + 5 open
// goals (mirrors prod user e8c8ec12 on Oct 6). Run `npm run seed` first.
//   npx tsx scripts/scenario-review-due.ts          -> create scenario
//   npx tsx scripts/scenario-review-due.ts --clear  -> remove scenario goals
// Scenario goals are tagged by title prefix "[review-due]" so --clear only
// touches its own rows.
import "./lib/use-staging.mjs";

const TAG = "[review-due]";
const EMAIL = "ignaz.fico@quadrant.com";

async function main() {
  const { prisma } = await import("../lib/prisma");
  const { startOfWeek, addDays } = await import("../lib/week");
  const gate = await import("../lib/weeklyReviewGate");

  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`${EMAIL} not on staging; run npm run seed first`);

  const removed = await prisma.goal.deleteMany({
    where: { role: { userId: user.id }, title: { startsWith: TAG } },
  });
  console.log(`removed ${removed.count} previous scenario goals`);

  if (!process.argv.includes("--clear")) {
    const roles = await prisma.role.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    if (!roles.length) throw new Error("test user has no roles; run npm run seed first");
    const lastWeek = addDays(startOfWeek(), -7);
    const rows = Array.from({ length: 10 }, (_, i) => ({
      roleId: roles[i % roles.length].id,
      title: `${TAG} goal ${i + 1}`,
      weekStart: lastWeek,
      status: i < 5 ? ("DONE" as const) : ("IN_PROGRESS" as const),
      completedAt: i < 5 ? addDays(lastWeek, 2) : null,
    }));
    await prisma.goal.createMany({ data: rows });
    console.log(`created 10 goals in week ${lastWeek.toISOString().slice(0, 10)} (5 DONE, 5 IN_PROGRESS)`);
  }

  const g = await gate.getWeeklyReviewGateStatus(user.id);
  console.log("gate required:", g.required, "week:", g.earliestUnreviewedWeekStart?.toISOString().slice(0, 10) ?? null);
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
