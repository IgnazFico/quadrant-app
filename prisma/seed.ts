/**
 * prisma/seed.ts
 *
 * Seeds the staging database with a test user (ignaz.fico@quadrant.com)
 * and enough dashboard data for the live-login Playwright test to pass.
 *
 * Usage:
 *   npm run seed
 *
 * Idempotent — safe to run multiple times (e.g. in CI before every test run).
 * On re-run:
 *   - User + auth key are created once (skipped if they exist).
 *   - Roles are created once (skipped if they exist).
 *   - Goals for the CURRENT week are recreated every run (so the playwright
 *     test always finds fresh data, even if the week rolls over between runs).
 *   - Schedule blocks for TODAY are recreated every run.
 *   - Activity day for TODAY is created once.
 *
 * Database: always STAGING.
 *   Locally  — .env.staging (via scripts/lib/env.mjs)
 *   CI       — the workflow's DATABASE_URL / DIRECT_URL (already staging)
 * Refuses to run if the resolved URL is the production host.
 *
 * Requires the Prisma client to be generated (npx prisma generate).
 */

import '../scripts/lib/use-staging.mjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import sodium from 'libsodium-wrappers-sumo';
import { startOfWeek, startOfDay } from '../lib/week';
import {
  generateSalt,
  deriveKey,
  generateMasterKey,
  wrapMasterKey,
  generateRecoveryCode,
} from '../lib/crypto';

const TEST_EMAIL = 'ignaz.fico@quadrant.com';
const TEST_PASSWORD = 'Quadrant_079';

async function main() {
  await sodium.ready;

  console.log('Connecting to database...');
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: No database URL found (expected .env.staging locally, DATABASE_URL in CI).');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const today = startOfDay(now);

    console.log(`Current week starts: ${weekStart.toISOString()}`);
    console.log(`Today:               ${today.toISOString()}`);

    // ---- User ----
    console.log(`Checking if user "${TEST_EMAIL}" exists...`);
    let user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (user) {
      console.log(`User already exists (id=${user.id}) — reusing.`);
    } else {
      console.log('Creating user + auth key...');
      const saltPassword = await generateSalt();
      const saltRecovery = await generateSalt();
      const masterKey = await generateMasterKey();
      const recoveryCode = await generateRecoveryCode();

      const derivedPassword = await deriveKey(TEST_PASSWORD, saltPassword);
      const derivedRecovery = await deriveKey(recoveryCode, saltRecovery);
      const wrappedKeyPassword = await wrapMasterKey(masterKey, derivedPassword);
      const wrappedKeyRecovery = await wrapMasterKey(masterKey, derivedRecovery);
      const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

      user = await prisma.user.create({
        data: {
          email: TEST_EMAIL,
          passwordHash,
          authKey: {
            // Prisma 7 Bytes fields are Uint8Array<ArrayBuffer>; libsodium returns
            // Uint8Array<ArrayBufferLike>. new Uint8Array() copies into a plain ArrayBuffer.
            create: {
              saltPassword: new Uint8Array(saltPassword),
              saltRecovery: new Uint8Array(saltRecovery),
              wrappedKeyPassword: new Uint8Array(wrappedKeyPassword),
              wrappedKeyRecovery: new Uint8Array(wrappedKeyRecovery),
              recoveryKeyIssuedAt: new Date(),
            },
          },
        },
      });
      console.log(`Created user id=${user.id}`);
      console.log(`Recovery Code: ${recoveryCode}`);
    }

    // ---- Roles ----
    console.log('Ensuring roles exist...');
    const roleData = [
      { domain: 'career', label: 'Software Architect', isFeatured: true },
      { domain: 'health', label: 'Physical Vitality', isFeatured: true },
    ];
    const roles = await Promise.all(
      roleData.map(async (r) => {
        const existing = await prisma.role.findFirst({
          where: { userId: user.id, label: r.label },
        });
        if (existing) return existing;
        return prisma.role.create({
          data: { userId: user.id, ...r, createdAt: now },
        });
      }),
    );
    console.log(`Roles: ${roles.map((r) => r.label).join(', ')}`);

    // ---- Goals for CURRENT week (recreated every run) ----
    console.log('(Re)creating goals for current week...');
    // Remove stale goals from prior weeks for these roles.
    await prisma.goal.deleteMany({
      where: {
        roleId: { in: roles.map((r) => r.id) },
        weekStart: { lt: weekStart },
      },
    });
    // Remove any goals for this week (so we get fresh ones).
    await prisma.goal.deleteMany({
      where: { roleId: { in: roles.map((r) => r.id) }, weekStart },
    });

    const goalData = [
      { roleId: roles[0].id, title: 'Ship the staging environment' },
      { roleId: roles[1].id, title: 'Run 5km three times this week' },
    ];
    const goals = await Promise.all(
      goalData.map((g) =>
        prisma.goal.create({
          data: { ...g, status: 'IN_PROGRESS' as const, weekStart, createdAt: now },
        }),
      ),
    );
    console.log(`Goals: ${goals.map((g) => g.title).join(', ')}`);

    // ---- Schedule blocks for TODAY (recreated every run) ----
    console.log('(Re)creating schedule blocks for today...');
    await prisma.scheduleBlock.deleteMany({
      where: { roleId: { in: roles.map((r) => r.id) }, day: today },
    });
    const blockData = [
      { roleId: roles[0].id, goalId: goals[0].id, day: today, hour: 9, title: 'Standup meeting' },
      // Standalone (no goalId): a goal has at most one block (schedule_blocks.goalId UNIQUE).
      { roleId: roles[0].id, goalId: null, day: today, hour: 14, title: 'Code review' },
      { roleId: roles[1].id, goalId: goals[1].id, day: today, hour: null, isPriority: true, title: 'Morning run' },
    ];
    await Promise.all(
      blockData.map((b) =>
        prisma.scheduleBlock.create({
          data: { ...b, isPriority: b.isPriority ?? false, createdAt: now },
        }),
      ),
    );
    console.log(`Schedule blocks: ${blockData.length}`);

    // ---- Activity day for TODAY ----
    console.log('Ensuring activity day for today...');
    await prisma.activityDay.upsert({
      where: { userId_date: { userId: user.id, date: today } },
      update: {},
      create: { userId: user.id, date: today },
    });
    console.log('Activity day OK');

    console.log('');
    console.log('========================================');
    console.log('SEED COMPLETE');
    console.log('========================================');
    console.log(`User:       ${TEST_EMAIL} / ${TEST_PASSWORD}`);
    console.log(`Week Start: ${weekStart.toISOString()}`);
    console.log(`Today:      ${today.toISOString()}`);
    console.log('========================================');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
