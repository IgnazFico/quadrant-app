// Regression check for schedule rules: one place per goal, and at most
// ANYTIME_PER_DAY "Anytime" (untimed) blocks per user per day.
//
//   npx tsx scripts/verify-schedule-rules.ts
//
// Always runs against STAGING. Creates a throwaway user, cleans up after.
//
// Invariants:
//  - the DB refuses a second schedule block for the same goal
//    (schedule_blocks.goalId UNIQUE, migration 20261002090000), so no client
//    path can schedule a goal twice
//  - moving a block (PATCH /api/schedule/[id] day/hour) keeps it the goal's
//    single block
//  - a goal's block can be re-linked once the old block is gone
//  - the DB trigger (migration 20261002120000) refuses a 3rd Anytime block
//    on a day — inserted, converted from timed, or moved in — but still
//    allows editing an Anytime block in place and moving it to a free day
//  - parseDayKey() round-trips the client's "YYYY-MM-DD" to the same
//    calendar day regardless of the server's timezone
// Locally: .env.staging. In CI: the workflow's DATABASE_URL (already staging).
// Refuses the production host either way (scripts/lib/env.mjs).
import "./lib/use-staging.mjs";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
};
const key = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  const { prisma } = await import("../lib/prisma");
  const { startOfWeek, addDays, parseDayKey, dayKey } = await import("../lib/week");
  const { isUniqueViolation, isAnytimeLimitError, anytimeDayFull } = await import("../lib/scheduleGoal");
  const { ANYTIME_PER_DAY } = await import("../lib/scheduleRules");

  // 0. Pure: parseDayKey is timezone-independent.
  const monday = startOfWeek();
  check("parseDayKey round-trips dayKey", key(parseDayKey(dayKey(monday))) === key(monday));

  // 0b. No goal anywhere on staging has more than one block.
  const dups = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM (
      SELECT 1 FROM schedule_blocks WHERE "goalId" IS NOT NULL
      GROUP BY "goalId" HAVING COUNT(*) > 1) t`;
  check("no goal has more than one block", dups[0].n === 0, `dups=${dups[0].n}`);

  const user = await prisma.user.create({
    data: { email: `one-per-goal.${Date.now()}@quadrant.test`, passwordHash: "x" },
  });
  try {
    const role = await prisma.role.create({
      data: { userId: user.id, label: "Tester", domain: "career" },
    });
    const goal = await prisma.goal.create({
      data: { roleId: role.id, title: "goal A", weekStart: monday },
    });

    // 1. First block for the goal is fine.
    const block = await prisma.scheduleBlock.create({
      data: { roleId: role.id, goalId: goal.id, day: monday, hour: 9, title: goal.title },
    });
    check("first block for a goal is created", !!block.id);

    // 2. A second block for the same goal (another day/time) is refused.
    let refused = false;
    try {
      const dup = await prisma.scheduleBlock.create({
        data: { roleId: role.id, goalId: goal.id, day: addDays(monday, 2), hour: 14, title: goal.title },
      });
      await prisma.scheduleBlock.delete({ where: { id: dup.id } });
    } catch (e) {
      refused = isUniqueViolation(e);
    }
    check("DB refuses a second block for the same goal", refused);

    // 3. Moving (what PATCH does for a drag or an edit) keeps one block.
    const thursday = addDays(monday, 3);
    const moved = await prisma.scheduleBlock.update({
      where: { id: block.id },
      data: { day: thursday, hour: null, isPriority: true },
    });
    const count = await prisma.scheduleBlock.count({ where: { goalId: goal.id } });
    check(
      "moving a block changes its day/time and keeps one block",
      key(moved.day) === key(thursday) && moved.hour === null && moved.isPriority && count === 1,
      `day=${key(moved.day)} hour=${moved.hour} count=${count}`,
    );

    // 4. Standalone blocks (no goal) are unaffected: many are allowed.
    await prisma.scheduleBlock.createMany({
      data: [
        { roleId: role.id, goalId: null, day: monday, hour: 10, title: "standalone 1" },
        { roleId: role.id, goalId: null, day: monday, hour: 11, title: "standalone 2" },
      ],
    });
    const standalone = await prisma.scheduleBlock.count({ where: { roleId: role.id, goalId: null } });
    check("multiple standalone blocks are allowed", standalone === 2, `n=${standalone}`);

    // 5. Removing the goal's block frees it to be scheduled again.
    await prisma.scheduleBlock.delete({ where: { id: block.id } });
    const again = await prisma.scheduleBlock.create({
      data: { roleId: role.id, goalId: goal.id, day: addDays(monday, 4), hour: 8, title: goal.title },
    });
    check("after removing its block, the goal can be scheduled again", !!again.id);

    // ---- Anytime limit ----
    const tue = addDays(monday, 1);
    const wed = addDays(monday, 2);
    const refuses = async (label: string, op: () => Promise<unknown>) => {
      let blocked = false;
      try {
        await op();
      } catch (e) {
        blocked = isAnytimeLimitError(e);
      }
      check(label, blocked);
    };
    const anytime = (day: Date, title: string) =>
      prisma.scheduleBlock.create({
        data: { roleId: role.id, day, hour: null, isPriority: true, title },
      });

    check("ANYTIME_PER_DAY is 2 (matches the DB trigger)", ANYTIME_PER_DAY === 2);
    const a1 = await anytime(tue, "anytime 1");
    await anytime(tue, "anytime 2");
    check("route pre-check sees the day as full", await anytimeDayFull(user.id, tue));
    check("route pre-check ignores the block being edited", !(await anytimeDayFull(user.id, tue, a1.id)));
    await refuses("DB refuses a 3rd Anytime block on a day", () => anytime(tue, "anytime 3"));

    const timed = await prisma.scheduleBlock.create({
      data: { roleId: role.id, day: tue, hour: 15, title: "timed" },
    });
    await refuses("DB refuses turning a timed block into a 3rd Anytime", () =>
      prisma.scheduleBlock.update({ where: { id: timed.id }, data: { hour: null, isPriority: true } }),
    );

    const w1 = await anytime(wed, "wed anytime");
    await refuses("DB refuses moving an Anytime block onto a full day", () =>
      prisma.scheduleBlock.update({ where: { id: w1.id }, data: { day: tue } }),
    );

    const renamed = await prisma.scheduleBlock.update({ where: { id: a1.id }, data: { title: "renamed" } });
    check("editing an Anytime block in place on a full day is allowed", renamed.title === "renamed");
    const movedOut = await prisma.scheduleBlock.update({ where: { id: a1.id }, data: { day: wed } });
    check("moving an Anytime block off a full day to a free day is allowed", key(movedOut.day) === key(wed));
    const timedAgain = await prisma.scheduleBlock.update({
      where: { id: timed.id },
      data: { hour: null, isPriority: true },
    });
    check("once a slot frees up, a timed block can become Anytime", timedAgain.isPriority);

    // Another user's Anytime blocks don't count against this user.
    const other = await prisma.user.create({
      data: { email: `one-per-goal.other.${Date.now()}@quadrant.test`, passwordHash: "x" },
    });
    try {
      const otherRole = await prisma.role.create({ data: { userId: other.id, label: "Other", domain: "career" } });
      const o = await prisma.scheduleBlock.create({
        data: { roleId: otherRole.id, day: tue, hour: null, isPriority: true, title: "other user" },
      });
      check("the limit is per user (another user's day is independent)", !!o.id);
    } finally {
      await prisma.user.delete({ where: { id: other.id } });
    }
  } finally {
    await prisma.user.delete({ where: { id: user.id } }); // cascades roles/goals/blocks
    await prisma.$disconnect();
  }

  if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
