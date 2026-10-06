import "./lib/use-staging.mjs"; // seals rings (writes): staging only
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
// Prisma 7 has no built-in engine connection: the client needs a driver adapter.
if (!databaseUrl) throw new Error("DATABASE_URL is not set (expected .env.staging)");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

// "Growth ring" = the GrowthRing table (one row per role per year). In the app its sealed flag
// closes the role's yearly constellation. Mirrors the MCP tool simulate_growth_ring_seal.
async function simulateSeal2026() {
  const targetYear = 2026;
  console.log(`\n========================================`);
  console.log(`🌲 Simulating growth ring sealing (closing role constellations) for ${targetYear}`);
  console.log(`========================================\n`);

  // 1. Fetch all roles across all users
  const roles = await prisma.role.findMany({
    include: {
      user: { select: { email: true, id: true } },
      goals: true,
      growthRings: { where: { year: targetYear } },
    },
  });

  console.log(`Found ${roles.length} roles across ${new Set(roles.map((r: any) => r.userId)).size} user(s).`);

  // 2. Ensure each role has a 2026 growth ring record before year sealing
  for (const role of roles) {
    const doneGoalsCount = role.goals.filter((g: any) => g.status === "DONE").length;
    await prisma.growthRing.upsert({
      where: {
        roleId_year: {
          roleId: role.id,
          year: targetYear,
        },
      },
      update: {},
      create: {
        roleId: role.id,
        year: targetYear,
        votesLogged: doneGoalsCount,
        sealed: false,
      },
    });
  }

  // 3. Inspect unsealed rings before sealing
  const unsealedBefore = await prisma.growthRing.findMany({
    where: { year: targetYear, sealed: false },
    include: { role: { include: { user: true } } },
  });
  console.log(`Unsealed rings for ${targetYear} prior to execution: ${unsealedBefore.length}`);

  // 4. Perform year-end sealing (matching MCP simulate_growth_ring_seal & cron job)
  const sealTimestamp = new Date();
  const sealResult = await prisma.growthRing.updateMany({
    where: {
      year: targetYear,
      sealed: false,
    },
    data: {
      sealed: true,
      sealedAt: sealTimestamp,
    },
  });

  console.log(`\n✅ Successfully sealed ${sealResult.count} growth ring row(s) (constellations closed) for year ${targetYear}.\n`);

  // 5. Query and display the verified sealed growth rings
  const sealedRings = await prisma.growthRing.findMany({
    where: { year: targetYear },
    include: {
      role: {
        include: {
          user: true,
        },
      },
    },
    orderBy: [
      { role: { user: { email: "asc" } } },
      { role: { domain: "asc" } },
      { role: { label: "asc" } },
    ],
  });

  console.log(`=== Sealed Growth Ring Rows (constellations) Summary (Year ${targetYear}) ===`);
  console.table(
    sealedRings.map((ring: any) => ({
      User: ring.role.user.email,
      Domain: ring.role.domain,
      Role: ring.role.label,
      Year: ring.year,
      Votes: ring.votesLogged,
      Sealed: ring.sealed,
      "Sealed At": ring.sealedAt ? ring.sealedAt.toISOString() : "N/A",
    }))
  );

  return sealedRings;
}

simulateSeal2026()
  .catch((err) => {
    console.error("Simulation failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
