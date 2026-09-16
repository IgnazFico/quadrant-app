import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import {
  generateMasterKey,
  generateSalt,
  deriveKey,
  generateRecoveryCode,
  wrapMasterKey,
  unwrapMasterKey,
  encryptField,
  toBase64,
} from "../lib/crypto";
import { startOfWeek, startOfDay } from "../lib/week";

const SEED_EMAIL = process.env.SEED_EMAIL || "ignaz.fico@quadrant.com";
const SEED_PASSWORD = process.env.SEED_PASSWORD || "Quadrant_079";

async function seedProductionUser() {
  console.log(`\n======================================================`);
  console.log(`🌱 SEEDING PRODUCTION USER & REALISTIC DATA FOR TESTING`);
  console.log(`Target Email: ${SEED_EMAIL}`);
  console.log(`======================================================\n`);

  // 1. Remove existing user if already present to guarantee clean idempotency
  const existing = await prisma.user.findUnique({
    where: { email: SEED_EMAIL },
  });
  if (existing) {
    console.log(`Found existing user for ${SEED_EMAIL}, cleaning up old records...`);
    await prisma.user.delete({ where: { email: SEED_EMAIL } });
    console.log(`Cleanup complete.`);
  }

  // 2. Generate Zero-Knowledge Cryptographic Assets
  console.log(`Generating Libsodium Zero-Knowledge Master Key & Salts...`);
  const masterKey = await generateMasterKey();
  const saltPassword = await generateSalt();
  const saltRecovery = await generateSalt();

  const passwordKey = await deriveKey(SEED_PASSWORD, saltPassword);
  const recoveryCode = await generateRecoveryCode();
  const recoveryKey = await deriveKey(recoveryCode, saltRecovery);

  const wrappedKeyPassword = await wrapMasterKey(masterKey, passwordKey);
  const wrappedKeyRecovery = await wrapMasterKey(masterKey, recoveryKey);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  // 3. Create User and AuthKey records in Neon
  console.log(`Creating User and AuthKey in Neon DB...`);
  const user = await prisma.user.create({
    data: {
      email: SEED_EMAIL,
      passwordHash,
      authKey: {
        create: {
          saltPassword: Buffer.from(saltPassword),
          saltRecovery: Buffer.from(saltRecovery),
          wrappedKeyPassword: Buffer.from(wrappedKeyPassword),
          wrappedKeyRecovery: Buffer.from(wrappedKeyRecovery),
        },
      },
    },
  });
  console.log(`  ✅ Created User: ${user.id}`);

  // 4. Create 4 Core Life Roles across Key Domains
  console.log(`Creating 4 Life Roles across Domains...`);
  const roleCareer = await prisma.role.create({
    data: {
      userId: user.id,
      domain: "career",
      label: "Software Architect",
      isFeatured: true,
    },
  });

  const roleHealth = await prisma.role.create({
    data: {
      userId: user.id,
      domain: "health",
      label: "Physical Vitality & Runner",
      isFeatured: true,
    },
  });

  const roleGrowth = await prisma.role.create({
    data: {
      userId: user.id,
      domain: "growth",
      label: "Continuous Learner",
      isFeatured: false,
    },
  });

  const roleRelationships = await prisma.role.create({
    data: {
      userId: user.id,
      domain: "relationships",
      label: "Partner & Friend",
      isFeatured: false,
    },
  });
  console.log(`  ✅ Roles created: Software Architect, Physical Vitality, Continuous Learner, Partner & Friend`);

  // 5. Create 2026 Cumulative Growth Rings
  console.log(`Creating Cumulative Annual Growth Rings for 2026...`);
  const currentYear = new Date().getFullYear();
  await prisma.growthRing.createMany({
    data: [
      { roleId: roleCareer.id, year: currentYear, votesLogged: 18, sealed: false },
      { roleId: roleHealth.id, year: currentYear, votesLogged: 24, sealed: false },
      { roleId: roleGrowth.id, year: currentYear, votesLogged: 12, sealed: false },
      { roleId: roleRelationships.id, year: currentYear, votesLogged: 15, sealed: false },
    ],
  });
  console.log(`  ✅ 2026 Growth Rings initialized with logged votes`);

  // 6. Create Big Rocks (Weekly Goals) for Current Week
  console.log(`Creating Weekly Big Rocks (Goals)...`);
  const currentWeek = startOfWeek();
  const goal1 = await prisma.goal.create({
    data: {
      roleId: roleCareer.id,
      title: "Deploy Quadrant App to Vercel & Neon PostgreSQL",
      status: "DONE",
      completedAt: new Date(),
      weekStart: currentWeek,
    },
  });

  const goal2 = await prisma.goal.create({
    data: {
      roleId: roleHealth.id,
      title: "4x 5km Zone 2 Running + Mobility Routine",
      status: "DONE",
      completedAt: new Date(),
      weekStart: currentWeek,
    },
  });

  const goal3 = await prisma.goal.create({
    data: {
      roleId: roleGrowth.id,
      title: "Deep Dive into Distributed Systems & Argon2id",
      status: "IN_PROGRESS",
      weekStart: currentWeek,
    },
  });

  const goal4 = await prisma.goal.create({
    data: {
      roleId: roleRelationships.id,
      title: "Host Sunday Family Dinner & Disconnect from Devices",
      status: "IN_PROGRESS",
      weekStart: currentWeek,
    },
  });
  console.log(`  ✅ 4 Weekly Goals created`);

  // 7. Create Schedule Blocks (Priority & Timed) for Today
  console.log(`Scheduling Priority & Timed Schedule Blocks for Today...`);
  const today = startOfDay();
  await prisma.scheduleBlock.createMany({
    data: [
      {
        roleId: roleCareer.id,
        goalId: goal1.id,
        day: today,
        hour: null,
        isPriority: true,
        title: "Priority: Production Beta Architecture Audit",
      },
      {
        roleId: roleHealth.id,
        goalId: goal2.id,
        day: today,
        hour: 7,
        isPriority: false,
        title: "Morning 5k Run (Zone 2)",
      },
      {
        roleId: roleGrowth.id,
        goalId: goal3.id,
        day: today,
        hour: 14,
        isPriority: false,
        title: "Architecture & Security Reading",
      },
    ],
  });
  console.log(`  ✅ Schedule blocks scheduled on timeline`);

  // 8. Encrypt Personal Mission Statement with User's Master Key
  console.log(`Encrypting Personal Mission Statement with Zero-Knowledge Master Key...`);
  const plaintextMission =
    "I architect systems with deep intentionality, prioritize what is essential over what is urgent, and protect the health, relationships, and craft that sustain meaningful living.";
  const encryptedMissionBytes = await encryptField(plaintextMission, masterKey);

  await prisma.missionStatement.create({
    data: {
      userId: user.id,
      contentEncrypted: Buffer.from(encryptedMissionBytes),
      signedName: "Ignaz Fico",
      version: 1,
      signedAt: new Date(),
    },
  });
  console.log(`  ✅ Zero-Knowledge Encrypted Mission Statement persisted`);

  // 9. Create 10 Activity Days (Past Days + Today)
  console.log(`Creating 10 Activity Days...`);
  const activityDates: Date[] = [];
  for (let i = 9; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    activityDates.push(d);
  }

  await prisma.activityDay.createMany({
    data: activityDates.map((date) => ({
      userId: user.id,
      date,
    })),
  });
  console.log(`  ✅ 10 Activity Days recorded (exceeds 7-day milestone gate)`);

  // 10. Create Calm Notifications
  console.log(`Creating Calm Notifications...`);
  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        type: "MORNING_FOCUS",
        title: "Morning Focus",
        message: "You have 1 priority block and 2 scheduled blocks today.",
        link: "/schedule",
        read: false,
        createdAt: new Date(),
      },
      {
        userId: user.id,
        type: "SUNDAY_RESET",
        title: "Sunday Reset Reminder",
        message: "Take 10 minutes to review your Big Rocks and realign your week.",
        link: "/weekly-review",
        read: false,
        createdAt: new Date(Date.now() - 86400000),
      },
      {
        userId: user.id,
        type: "SEVEN_DAY_MILESTONE",
        title: "7-Day Milestone Reached",
        message: "Your Personal Mission Statement has been crafted and sealed.",
        link: "/mission",
        read: true,
        createdAt: new Date(Date.now() - 172800000),
      },
    ],
  });
  console.log(`  ✅ Calm notifications created`);

  console.log(`\n======================================================`);
  console.log(`🎉 PRODUCTION DATA SEEDED SUCCESSFULLY!`);
  console.log(`------------------------------------------------------`);
  console.log(`Account Credentials:`);
  console.log(`  Email:         ${SEED_EMAIL}`);
  console.log(`  Password:      ${SEED_PASSWORD}`);
  console.log(`  Recovery Code: ${recoveryCode}`);
  console.log(`======================================================\n`);
}

seedProductionUser()
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
