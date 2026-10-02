// Regression check for the weekly-review redirect loop. Uses the REAL gate and
// week-resolution code (lib/weeklyReviewGate.ts) that the routes use.
//
//   npx tsx scripts/verify-weekly-review-loop.ts
//
// Always runs against STAGING. Creates a throwaway user, cleans up after.
//
// Invariant: whatever week the gate (layout redirect) points at, the review
// page must be able to load that week's unresolved goals, and resolving them
// plus completing the week must clear the gate or move it to a different week.
// If it doesn't, the user is redirected to /weekly-review forever.
import "dotenv/config";

// Locally: STAGING_DATABASE_URL from .env. In CI: DATABASE_URL is already staging.
const staging = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL;
if (!staging) throw new Error("no STAGING_DATABASE_URL or DATABASE_URL");
if (/weathered-snow/.test(staging)) throw new Error("refusing: that is the production host");
process.env.DATABASE_URL = staging;

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
};
const key = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

async function main() {
  const { prisma } = await import("../lib/prisma");
  const { startOfWeek, addDays } = await import("../lib/week");
  const gate = await import("../lib/weeklyReviewGate");

  const user = await prisma.user.create({
    data: { email: `review-loop.${Date.now()}@quadrant.test`, passwordHash: "x" },
  });
  try {
    const role = await prisma.role.create({
      data: { userId: user.id, label: "Tester", domain: "career" },
    });
    const twoWeeksAgo = addDays(startOfWeek(), -14);
    const lastWeek = addDays(startOfWeek(), -7);

    // 1. The database refuses a non-Monday week (the bad data behind the loop).
    let rejected = false;
    try {
      const bad = await prisma.goal.create({
        data: { roleId: role.id, title: "sunday row", weekStart: addDays(lastWeek, -1) },
      });
      await prisma.goal.delete({ where: { id: bad.id } }); // keep the flow checks below clean
    } catch (e) {
      rejected = /goals_weekStart_is_monday|check constraint/i.test(String(e));
    }
    check("DB rejects a goal whose weekStart is not a Monday", rejected);

    // 2. Two outstanding weeks: the gate, GET and complete must walk them in order.
    const old = await prisma.goal.create({
      data: { roleId: role.id, title: "old week goal", weekStart: twoWeeksAgo },
    });
    const recent = await prisma.goal.create({
      data: { roleId: role.id, title: "last week goal", weekStart: lastWeek, carryForward: false },
    });

    for (const [label, goal, expected] of [
      ["oldest week", old, twoWeeksAgo],
      ["next week", recent, lastWeek],
    ] as const) {
      const gateWeek = await gate.getEarliestUnreviewedWeekStart(user.id);
      check(`gate points at the ${label}`, key(gateWeek) === key(expected), `gate=${key(gateWeek)}`);

      // GET /api/review with no param, then the client's follow-up with the returned key.
      const shown = await gate.resolveReviewWeek(user.id, null);
      const again = await gate.resolveReviewWeek(user.id, key(shown));
      check(`GET resolves a stable week key (${label})`, key(shown) === key(again), `${key(shown)} -> ${key(again)}`);

      const loaded = await prisma.goal.findMany({
        where: gate.reviewWeekGoalsWhere(user.id, again),
        include: { reviewEntry: true },
      });
      const unresolved = loaded.filter((g) => g.status !== "DONE" && !g.reviewEntry);
      check(`GET loads the goal the gate is waiting on (${label})`, unresolved.some((g) => g.id === goal.id));

      // Reflect (what /api/review/reflect writes), then the complete route's check.
      await prisma.$transaction([
        prisma.goal.update({ where: { id: goal.id }, data: { status: "MISSED" } }),
        prisma.reviewEntry.create({
          data: { goalId: goal.id, reasonEncrypted: Buffer.from("x"), choice: "CANCEL" },
        }),
      ]);
      const completeWeek = await gate.resolveReviewWeek(user.id, key(again));
      const left = (
        await prisma.goal.findMany({
          where: gate.reviewWeekGoalsWhere(user.id, completeWeek),
          include: { reviewEntry: true },
        })
      ).filter((g) => g.status !== "DONE" && !g.reviewEntry);
      check(`complete sees the week as resolved (${label})`, left.length === 0);

      const next = await gate.getEarliestUnreviewedWeekStart(user.id);
      check(
        `after completing, the gate moves on (${label})`,
        key(next) !== key(completeWeek),
        `next=${key(next)}`,
      );
    }
    check("gate is clear at the end", (await gate.getEarliestUnreviewedWeekStart(user.id)) === null);
  } finally {
    await prisma.reviewEntry.deleteMany({ where: { goal: { role: { userId: user.id } } } });
    await prisma.goal.deleteMany({ where: { role: { userId: user.id } } });
    await prisma.role.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
    process.exitCode = failures ? 1 : 0;
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
