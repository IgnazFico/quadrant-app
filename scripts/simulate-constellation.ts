import "dotenv/config";
import { prisma } from "../lib/prisma";
import { getRoleConstellations } from "../lib/constellation";

// GROWTH-RING-REDESIGN: checks the monthly scores behind the constellation.
// Run against a scratch database:  npx tsx scripts/simulate-constellation.ts

const thisYear = new Date().getUTCFullYear();
const failures: string[] = [];

function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ✅ ${name}`);
  else {
    failures.push(name);
    console.error(`  ❌ ${name} ${detail}`);
  }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

async function goals(
  roleId: string,
  rows: { week: string; status: "DONE" | "MISSED" | "IN_PROGRESS"; n: number }[],
) {
  for (const r of rows) {
    for (let i = 0; i < r.n; i++) {
      await prisma.goal.create({
        data: {
          roleId,
          title: `goal ${r.week} ${i}`,
          status: r.status,
          weekStart: new Date(`${r.week}T00:00:00Z`),
          completedAt: r.status === "DONE" ? new Date(`${r.week}T12:00:00Z`) : null,
        },
      });
    }
  }
}

async function main() {
  const stamp = Date.now();
  const user = await prisma.user.create({
    data: { email: `constellation.${stamp}@quadrant.com`, passwordHash: "x" },
  });
  const other = await prisma.user.create({
    data: { email: `constellation.other.${stamp}@quadrant.com`, passwordHash: "x" },
  });

  try {
    const past = thisYear - 1;
    const older = thisYear - 2;

    const runner = await prisma.role.create({
      data: {
        userId: user.id,
        domain: "health",
        label: "Runner",
        createdAt: new Date(Date.UTC(older, 4, 1)),
      },
    });
    const newer = await prisma.role.create({
      data: { userId: user.id, domain: "family", label: "Parent" },
    });
    const stranger = await prisma.role.create({
      data: { userId: other.id, domain: "career", label: "Stranger" },
    });

    await goals(runner.id, [
      { week: `${older}-06-02`, status: "DONE", n: 2 },
      { week: `${older}-06-09`, status: "MISSED", n: 2 },
      { week: `${past}-01-06`, status: "DONE", n: 3 },
      { week: `${past}-01-13`, status: "MISSED", n: 1 },
      { week: `${past}-02-03`, status: "DONE", n: 1 },
      { week: `${past}-02-10`, status: "MISSED", n: 3 },
      { week: `${past}-03-03`, status: "IN_PROGRESS", n: 2 }, // open weeks don't score
      { week: `${past}-05-05`, status: "DONE", n: 4 },
      { week: `${thisYear}-01-05`, status: "DONE", n: 2 },
    ]);
    await goals(stranger.id, [{ week: `${past}-01-06`, status: "MISSED", n: 5 }]);

    console.log("\nhistory up to last year");
    const hist = await getRoleConstellations(user.id, { upToYear: past });
    const run = hist.find((c) => c.roleId === runner.id)!;
    check("runner spans two years", same(run.years.map((y) => y.year), [older, past]));
    const y0 = run.years[0].months;
    const y1 = run.years[1].months;
    check("half done is 0.5", y0[5] === 0.5, JSON.stringify(y0));
    check("3 done of 4 is 0.75", y1[0] === 0.75, JSON.stringify(y1));
    check("1 done of 4 is 0.25 (a hard month)", y1[1] === 0.25);
    check("only open goals -> null", y1[2] === null);
    check("no goals -> null", y1[3] === null);
    check("all done is 1", y1[4] === 1);
    check("years that have ended are sealed", run.years.every((y) => y.sealed));
    check("a role created later has no years yet", hist.find((c) => c.roleId === newer.id)!.years.length === 0);
    check("other users' goals never leak in", !hist.some((c) => c.roleId === stranger.id));

    console.log("\nbadge (current year only)");
    const now = await getRoleConstellations(user.id, { currentYearOnly: true });
    const nowRunner = now.find((c) => c.roleId === runner.id)!;
    check("one year", nowRunner.years.length === 1 && nowRunner.years[0].year === thisYear);
    check("this year's January scored", nowRunner.years[0].months[0] === 1);
    check("this year is open until it ends", nowRunner.years[0].sealed === false);
    check("a role with no goals still gets an empty year", same(now.find((c) => c.roleId === newer.id)!.years[0].months, new Array(12).fill(null)));

    await prisma.growthRing.create({
      data: { roleId: newer.id, year: thisYear, votesLogged: 0, sealed: true },
    });
    const sealedNow = await getRoleConstellations(user.id, { currentYearOnly: true });
    check("a sealed ring row closes the loop", sealedNow.find((c) => c.roleId === newer.id)!.years[0].sealed === true);
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: [user.id, other.id] } } });
  }

  console.log(failures.length ? `\n${failures.length} failed` : "\nall passed");
  if (failures.length) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error("Simulation failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
