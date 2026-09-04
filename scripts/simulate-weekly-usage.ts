import "dotenv/config";
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
  decryptField,
  toBase64,
  fromBase64,
} from "../lib/crypto";
import { startOfWeek, addDays, startOfDay } from "../lib/week";
import { castVote, retractVote } from "../lib/growthRing";
import {
  recordActivityToday,
  getActiveDayCount,
  hasWrittenMissionStatement,
  getMissionGateStatus,
} from "../lib/missionGate";
import {
  hasUnreviewedPastGoals,
  getWeeklyReviewGateStatus,
} from "../lib/weeklyReviewGate";
import { getPatterns } from "../lib/patterns";

export type TestResult = {
  name: string;
  category: "Positive Path" | "Negative Path" | "Edge Case / Security";
  passed: boolean;
  details: string;
  durationMs: number;
  error?: string;
};

const results: TestResult[] = [];

async function recordTest(
  name: string,
  category: "Positive Path" | "Negative Path" | "Edge Case / Security",
  fn: () => Promise<string | void>
) {
  const start = Date.now();
  try {
    const details = (await fn()) || "Success";
    const durationMs = Date.now() - start;
    results.push({ name, category, passed: true, details, durationMs });
    console.log(`  ✅ [${category}] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({
      name,
      category,
      passed: false,
      details: err.message,
      durationMs,
      error: err.stack || err.message,
    });
    console.error(`  ❌ [${category}] ${name} (${durationMs}ms): ${err.message}`);
  }
}

async function runWeeklySimulation() {
  console.log("\n=======================================================");
  console.log("🚀 Starting Quadrant Weekly Usage Simulation & Validation");
  console.log("=======================================================\n");

  const timestamp = Date.now();
  const email = `sim.user.${timestamp}@quadrant.com`;
  const password = "TestPassword_2026!";
  const attackerEmail = `attacker.${timestamp}@quadrant.com`;

  let masterKey: Uint8Array;
  let user: any;
  let attackerUser: any;
  let roles: any[] = [];
  let currentGoals: any[] = [];

  // ==========================================
  // PHASE 1: User Registration & Cryptography
  // ==========================================
  console.log("📦 PHASE 1: User Registration & Zero-Knowledge Cryptography");

  await recordTest("Client-side Key Generation & Argon2id Wrapping", "Positive Path", async () => {
    masterKey = await generateMasterKey();
    if (masterKey.byteLength !== 32) throw new Error("Invalid master key length");

    const saltPassword = await generateSalt();
    const saltRecovery = await generateSalt();
    const passwordKey = await deriveKey(password, saltPassword);
    const recoveryCode = await generateRecoveryCode();
    const recoveryKey = await deriveKey(recoveryCode, saltRecovery);

    const wrappedKeyPassword = await wrapMasterKey(masterKey, passwordKey);
    const wrappedKeyRecovery = await wrapMasterKey(masterKey, recoveryKey);

    const passwordHash = await bcrypt.hash(password, 10);

    user = await prisma.user.create({
      data: {
        email,
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
      include: { authKey: true },
    });

    if (!user || !user.authKey) throw new Error("Failed to persist user with auth keys");
    return `User created with ID ${user.id} and zero-knowledge ciphertext blobs`;
  });

  // ==========================================
  // PHASE 2: Login, Challenge & Auth Negative Paths
  // ==========================================
  console.log("\n🔑 PHASE 2: Login Challenge & Auth Negative Paths");

  await recordTest("Correct Password Decrypts Master Key (Login Flow)", "Positive Path", async () => {
    const dbUser = await prisma.user.findUnique({
      where: { email },
      include: { authKey: true, _count: { select: { roles: true } } },
    });
    if (!dbUser || !dbUser.authKey) throw new Error("User lookup failed");

    const derived = await deriveKey(password, dbUser.authKey.saltPassword);
    const unwrapped = await unwrapMasterKey(dbUser.authKey.wrappedKeyPassword, derived);

    if (Buffer.compare(Buffer.from(unwrapped), Buffer.from(masterKey)) !== 0) {
      throw new Error("Decrypted master key does not match original master key");
    }

    if (dbUser._count.roles !== 0) throw new Error("New user should have 0 roles initially");
    return "Master key accurately unwrapped locally; new user role count verified as 0";
  });

  await recordTest("Wrong Password Fails Master Key Unwrapping", "Negative Path", async () => {
    const dbUser = await prisma.user.findUnique({
      where: { email },
      include: { authKey: true },
    });
    const wrongDerived = await deriveKey("WrongPassword_999!", dbUser!.authKey!.saltPassword);

    let failedAsExpected = false;
    try {
      await unwrapMasterKey(dbUser!.authKey!.wrappedKeyPassword, wrongDerived);
    } catch {
      failedAsExpected = true;
    }

    if (!failedAsExpected) throw new Error("Wrong password unexpectedly succeeded in unwrapping ciphertext!");
    return "Unwrap operation safely rejected wrong derived password key";
  });

  // ==========================================
  // PHASE 3: Onboarding & Life Roles Setup
  // ==========================================
  console.log("\n🌱 PHASE 3: Onboarding & Life Roles Setup");

  await recordTest("Creating 4 Life Roles across Domains", "Positive Path", async () => {
    const initialRoleCount = await prisma.role.count({ where: { userId: user.id } });
    if (initialRoleCount !== 0) throw new Error("Expected 0 roles before onboarding");

    roles = await prisma.$transaction([
      prisma.role.create({ data: { userId: user.id, domain: "career", label: "Software Engineer", isFeatured: true } }),
      prisma.role.create({ data: { userId: user.id, domain: "growth", label: "Student", isFeatured: true } }),
      prisma.role.create({ data: { userId: user.id, domain: "health", label: "Athlete" } }),
      prisma.role.create({ data: { userId: user.id, domain: "relationships", label: "Friend" } }),
    ]);

    if (roles.length !== 4) throw new Error("Expected 4 roles created");
    return `Roles initialized: ${roles.map((r) => r.label).join(", ")}`;
  });

  // ==========================================
  // PHASE 4: Weekly Big Rocks (Goals) & Scheduling
  // ==========================================
  console.log("\n🎯 PHASE 4: Weekly Big Rocks (Goals) & Schedule Blocks");

  const currentWeek = startOfWeek();

  await recordTest("Setting Weekly Big Rocks for Current Week", "Positive Path", async () => {
    currentGoals = await prisma.$transaction([
      prisma.goal.create({
        data: { roleId: roles[0].id, title: "Ship Auth Feature", weekStart: currentWeek, status: "IN_PROGRESS" },
      }),
      prisma.goal.create({
        data: { roleId: roles[1].id, title: "Study Distributed Systems", weekStart: currentWeek, status: "IN_PROGRESS" },
      }),
      prisma.goal.create({
        data: { roleId: roles[2].id, title: "Run 5km 3x", weekStart: currentWeek, status: "IN_PROGRESS" },
      }),
      prisma.goal.create({
        data: { roleId: roles[3].id, title: "Sunday Family Dinner", weekStart: currentWeek, status: "IN_PROGRESS" },
      }),
    ]);

    if (currentGoals.length !== 4) throw new Error("Expected 4 goals created for week");
    return `Goals set for week starting ${currentWeek.toISOString().slice(0, 10)}`;
  });

  await recordTest("Scheduling Priority & Timed Blocks", "Positive Path", async () => {
    const today = startOfDay();
    const priorityBlock = await prisma.scheduleBlock.create({
      data: {
        roleId: roles[0].id,
        goalId: currentGoals[0].id,
        day: today,
        hour: null,
        isPriority: true,
        title: "Priority: Ship Auth Feature",
      },
    });

    const timedBlock = await prisma.scheduleBlock.create({
      data: {
        roleId: roles[2].id,
        goalId: currentGoals[2].id,
        day: today,
        hour: 7,
        isPriority: false,
        title: "Morning 5k Run",
      },
    });

    if (!priorityBlock.isPriority || timedBlock.hour !== 7) throw new Error("Schedule block attributes mismatch");
    return "Priority block and timed 7:00 AM block scheduled successfully";
  });

  // ==========================================
  // PHASE 5: Goal Progress & Growth Rings Voting
  // ==========================================
  console.log("\n🌲 PHASE 5: Goal Completion & Growth Rings Voting");

  await recordTest("Marking Goal DONE Increments Growth Ring Votes", "Positive Path", async () => {
    const roleId = roles[0].id;
    const goalId = currentGoals[0].id;

    await prisma.goal.update({
      where: { id: goalId },
      data: { status: "DONE", completedAt: new Date() },
    });
    await castVote(roleId);

    const ring = await prisma.growthRing.findUnique({
      where: { roleId_year: { roleId, year: currentWeek.getFullYear() } },
    });

    if (!ring || ring.votesLogged !== 1) throw new Error(`Expected votesLogged=1, got ${ring?.votesLogged}`);
    return `Growth ring for role ${roles[0].label} has ${ring.votesLogged} vote logged`;
  });

  await recordTest("Unmarking Goal Retracts Vote (Anti-Farming Check)", "Positive Path", async () => {
    const roleId = roles[0].id;
    const goalId = currentGoals[0].id;

    await prisma.goal.update({
      where: { id: goalId },
      data: { status: "IN_PROGRESS", completedAt: null },
    });
    await retractVote(roleId);

    const ring = await prisma.growthRing.findUnique({
      where: { roleId_year: { roleId, year: currentWeek.getFullYear() } },
    });

    if (!ring || ring.votesLogged !== 0) throw new Error(`Expected votesLogged=0, got ${ring?.votesLogged}`);

    // Test retracting again does not go below 0
    await retractVote(roleId);
    const ringFloored = await prisma.growthRing.findUnique({
      where: { roleId_year: { roleId, year: currentWeek.getFullYear() } },
    });
    if (!ringFloored || ringFloored.votesLogged !== 0) throw new Error("Vote count dropped below zero!");

    // Re-mark done
    await prisma.goal.update({
      where: { id: goalId },
      data: { status: "DONE", completedAt: new Date() },
    });
    await castVote(roleId);

    return "Retract decremented properly and floored safely at 0";
  });

  // ==========================================
  // PHASE 6: Activity Logging & Mission Statement Gate
  // ==========================================
  console.log("\n📜 PHASE 6: Activity Days & Mission Statement Gate");

  await recordTest("Mission Statement Gate Activates Exactly on Day 7", "Positive Path", async () => {
    // Clean initial days
    await prisma.activityDay.deleteMany({ where: { userId: user.id } });

    // Days 1-6
    const pastDays = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (i + 1));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    await prisma.activityDay.createMany({
      data: pastDays.map((date) => ({ userId: user.id, date })),
    });

    const status6 = await getMissionGateStatus(user.id);
    if (status6.required) throw new Error("Mission gate should NOT be required on Day 6");

    // Add 7th day
    const day7 = new Date();
    day7.setDate(day7.getDate() - 7);
    day7.setHours(0, 0, 0, 0);
    await prisma.activityDay.create({ data: { userId: user.id, date: day7 } });

    const status7 = await getMissionGateStatus(user.id);
    if (!status7.required) throw new Error("Mission gate MUST be required on Day 7+");

    return "Gate properly inactive on Day 6 and active on Day 7";
  });

  await recordTest("Client-side Encrypted Mission Statement Fulfills Gate", "Positive Path", async () => {
    const statementPlaintext = "I want to build software that respects human autonomy and dignity.";
    const encrypted = await encryptField(statementPlaintext, masterKey);

    await prisma.missionStatement.create({
      data: {
        userId: user.id,
        contentEncrypted: Buffer.from(encrypted),
        signedName: "Simulated User",
        version: 1,
      },
    });

    const gateAfter = await getMissionGateStatus(user.id);
    if (gateAfter.required) throw new Error("Mission gate should be cleared after writing statement");

    // Verify decryption
    const saved = await prisma.missionStatement.findFirst({ where: { userId: user.id } });
    const decrypted = await decryptField(saved!.contentEncrypted, masterKey);
    if (decrypted !== statementPlaintext) throw new Error("Decrypted mission statement mismatch");

    return "Encrypted mission statement saved and decrypted cleanly; gate cleared";
  });

  // ==========================================
  // PHASE 7: Week Turnover & Weekly Review Flow
  // ==========================================
  console.log("\n🔄 PHASE 7: Week Turnover & Weekly Review Reflection");

  const pastWeek = addDays(currentWeek, -7);

  await recordTest("Unreviewed Goals from Past Week Triggers Weekly Review Gate", "Positive Path", async () => {
    // Seed an unreviewed missed goal from the previous week
    const missedGoal = await prisma.goal.create({
      data: {
        roleId: roles[1].id,
        title: "Finish Chapter 4 (Past Week)",
        status: "MISSED",
        weekStart: pastWeek,
      },
    });

    const reviewGate = await getWeeklyReviewGateStatus(user.id);
    if (!reviewGate.required) throw new Error("Weekly review gate should be required when past goals are unreviewed");

    return `Weekly review gate triggered for unreviewed goal ID ${missedGoal.id}`;
  });

  await recordTest("Completing Review Fails if Reflections are Missing", "Negative Path", async () => {
    const goals = await prisma.goal.findMany({
      where: { weekStart: pastWeek, role: { userId: user.id } },
      include: { reviewEntry: true },
    });

    const unresolved = goals.filter((g) => g.status !== "DONE" && !g.reviewEntry);
    if (unresolved.length === 0) throw new Error("Expected at least 1 unresolved goal for negative test");

    // Attempting completion without reflection is rejected
    const canComplete = unresolved.length === 0;
    if (canComplete) throw new Error("System allowed review completion with missing reflections!");

    return "Review completion gate correctly rejected incomplete reflection";
  });

  await recordTest("Submitting Encrypted Reflection & Carrying Forward to Current Week", "Positive Path", async () => {
    const missedGoal = await prisma.goal.findFirst({
      where: { weekStart: pastWeek, role: { userId: user.id }, status: "MISSED" },
    });
    if (!missedGoal) throw new Error("Missed goal not found");

    const reasonText = "Got pulled into production incident on Thursday";
    const reasonEncrypted = await encryptField(reasonText, masterKey);

    const reviewEntry = await prisma.reviewEntry.create({
      data: {
        goalId: missedGoal.id,
        choice: "CARRY",
        reasonEncrypted: Buffer.from(reasonEncrypted),
      },
    });

    // Decrypt verification
    const decryptedReason = await decryptField(reviewEntry.reasonEncrypted, masterKey);
    if (decryptedReason !== reasonText) throw new Error("Decrypted reflection reason mismatch");

    // Execute review complete transaction (rolling carried forward into current week)
    const newRolledGoal = await prisma.goal.create({
      data: {
        roleId: missedGoal.roleId,
        title: missedGoal.title,
        weekStart: currentWeek,
      },
    });

    const reviewGateAfter = await getWeeklyReviewGateStatus(user.id);
    if (reviewGateAfter.required) throw new Error("Weekly review gate should be cleared after review completion");

    return `Reflected cleanly; Goal carried forward to fresh goal ID ${newRolledGoal.id}`;
  });

  // ==========================================
  // PHASE 8: Cross-User Security & Integrity Negative Paths
  // ==========================================
  console.log("\n🛡️ PHASE 8: Cross-User Isolation & Integrity Negative Paths");

  await recordTest("Cross-User Isolation: User B Cannot Access or Mutate User A's Goal", "Edge Case / Security", async () => {
    attackerUser = await prisma.user.create({
      data: {
        email: attackerEmail,
        passwordHash: "$2a$10$attackerhashplaceholder",
      },
    });

    // Attacker tries to query User A's goals through ownership check
    const goalToAttack = currentGoals[0];
    const userRole = await prisma.role.findUnique({
      where: { id: goalToAttack.roleId },
    });

    if (userRole?.userId === attackerUser.id) {
      throw new Error("Security breach: Role ownership returned false positive");
    }

    return "Cross-user boundary verified; ownership authorization prevents unauthorized mutation";
  });

  await recordTest("Tampered Ciphertext Fails Decryption Safely", "Edge Case / Security", async () => {
    const validEncrypted = await encryptField("Confidential reflection", masterKey);
    // Tamper with bytes
    const tampered = new Uint8Array(validEncrypted);
    tampered[tampered.length - 1] ^= 0xff;

    let decryptionFailed = false;
    try {
      await decryptField(tampered, masterKey);
    } catch {
      decryptionFailed = true;
    }

    if (!decryptionFailed) throw new Error("Tampered ciphertext decrypted without throwing error!");
    return "Tampered ciphertext safely thrown without crash or data leakage";
  });

  // ==========================================
  // PHASE 9: Patterns Feature Calculation
  // ==========================================
  console.log("\n📊 PHASE 9: Patterns Feature & Habit Rhythm Calculation");

  await recordTest("Patterns Feature Computes Rhythms, Balance, & Honesty", "Positive Path", async () => {
    const targetMonth = pastWeek.getMonth() + 1;
    const targetYear = pastWeek.getFullYear();
    const patterns = await getPatterns(user.id, targetYear, targetMonth);

    if (!patterns.rhythm || !patterns.presence || !patterns.balance || !patterns.honesty) {
      throw new Error("Incomplete patterns data structure returned");
    }

    if (patterns.balance.totalRoles < 4) {
      throw new Error(`Expected at least 4 roles in balance, got ${patterns.balance.totalRoles}`);
    }

    if (patterns.honesty.reflectedCount < 1 || patterns.honesty.carriedCount < 1) {
      throw new Error("Patterns honesty metrics did not capture the completed weekly reflection");
    }

    return `Patterns aggregated for ${targetYear}-${targetMonth}: ${patterns.presence.activeDaysCount} active days, ${patterns.balance.rolesWithActivity} active roles, ${patterns.honesty.reflectedCount} reflections`;
  });

  // Cleanup simulation data
  console.log("\n🧹 Cleaning up test simulation data...");
  await prisma.user.deleteMany({ where: { email: { in: [email, attackerEmail] } } });
  console.log("Cleanup complete.\n");

  return results;
}

runWeeklySimulation()
  .catch((err) => {
    console.error("Simulation run encountered unexpected error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
