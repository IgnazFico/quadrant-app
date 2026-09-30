import "dotenv/config";
import { prisma } from "../lib/prisma";
import { getRoleConstellations } from "../lib/constellation";

// GROWTH-RING-REDESIGN: checks the monthly star counts behind the constellation.
// Run against a scratch database:  npx tsx scripts/simulate-constellation.ts
//
// The constellation measures showing up: a month's value is how many goals were
// FINISHED in it (by completedAt). Missed and open goals never enter into it.

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

type Row = {
  week: string;
  status: "DONE" | "MISSED" | "IN_PROGRESS";
  n: number;
  /** completion day, when it differs from the week (DONE only) */
  done?: string;
};

async function goals(roleId: string, rows: Row[]) {
  for (const r of rows) {
    for (let i = 0; i < r.n; i++) {
      await prisma.goal.create({
        data: {
          roleId,
          title: `goal ${r.week} ${i}`,
          status: r.status,
          weekStart: new Date(`${r.week}T00:00:00Z`),
          completedAt:
            r.status === "DONE" ? new Date(`${r.done ?? r.week}T12:00:00Z`) : null,
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
      { week: `${older}-06-09`, status: "MISSED", n: 2 }, // missed goals are not counted
      { week: `${past}-01-06`, status: "DONE", n: 3 },
      { week: `${past}-01-13`, status: "MISSED", n: 1 },
      { week: `${past}-02-03`, status: "DONE", n: 1 },
      { week: `${past}-02-10`, status: "MISSED", n: 3 },
      { week: `${past}-01-27`, status: "DONE", n: 1, done: `${past}-02-02` }, // counts where it was finished
      { week: `${past}-03-03`, status: "IN_PROGRESS", n: 2 }, // open goals are not counted
      { week: `${past}-05-05`, status: "DONE", n: 4 },
      { week: `${thisYear}-01-05`, status: "DONE", n: 2 },
    ]);
    await goals(stranger.id, [{ week: `${past}-01-06`, status: "DONE", n: 9 }]);

    console.log("\nhistory up to last year");
    const hist = await getRoleConstellations(user.id, { upToYear: past });
    const run = hist.find((c) => c.roleId === runner.id)!;
    check("runner spans two years", same(run.years.map((y) => y.year), [older, past]));
    const y0 = run.years[0].months;
    const y1 = run.years[1].months;
    check("finished goals count, missed ones do not", y0[5] === 2, JSON.stringify(y0));
    check("three finished in January", y1[0] === 3, JSON.stringify(y1));
    check("counted by completion month, not week start", y1[1] === 2, JSON.stringify(y1));
    check("only open goals -> 0", y1[2] === 0);
    check("no goals -> 0", y1[3] === 0);
    check("four finished in May", y1[4] === 4);
    check("peak is the role's own busiest month", run.peak === 4, String(run.peak));
    check("years that have ended are sealed", run.years.every((y) => y.sealed));
    check("a role created later has no years yet", hist.find((c) => c.roleId === newer.id)!.years.length === 0);
    check("other users' goals never leak in", !hist.some((c) => c.roleId === stranger.id));

    console.log("\nbadge (current year only)");
    const now = await getRoleConstellations(user.id, { currentYearOnly: true });
    const nowRunner = now.find((c) => c.roleId === runner.id)!;
    check("one year", nowRunner.years.length === 1 && nowRunner.years[0].year === thisYear);
    check("this year's January counted", nowRunner.years[0].months[0] === 2);
    check("peak still spans the whole history", nowRunner.peak === 4, String(nowRunner.peak));
    check("this year is open until it ends", nowRunner.years[0].sealed === false);
    const parent = now.find((c) => c.roleId === newer.id)!;
    check("a role with no goals still gets an empty year", same(parent.years[0].months, new Array(12).fill(0)) && parent.peak === 1);

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
