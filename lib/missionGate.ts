import { prisma } from "./prisma";

/** Upserts today's activity row for this user. Safe to call multiple times a day. */
export async function recordActivityToday(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Verify the user still exists before writing — prevents FK violations
  // from stale JWTs after database resets.
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  try {
    await prisma.activityDay.createMany({
      data: [{ userId, date: today }],
      skipDuplicates: true,
    });
  } catch (err) {
    // Defensive: if a stale userId somehow slips past the check above
    // (e.g. race condition or DB replication lag), swallow the FK error
    // so the ping endpoint still returns 200 and the app stays usable.
    if (err instanceof Error && err.message.includes("ForeignKeyConstraintViolation")) {
      return;
    }
    throw err;
  }
}

export async function getActiveDayCount(userId: string): Promise<number> {
  return prisma.activityDay.count({ where: { userId } });
}

export async function hasWrittenMissionStatement(
  userId: string,
): Promise<boolean> {
  const count = await prisma.missionStatement.count({ where: { userId } });
  return count > 0;
}

/**
 * The mission statement becomes required once the user has opened the app
 * on 7 separate calendar days (not necessarily consecutive) and hasn't
 * written one yet. Practically, this means it appears the NEXT time they
 * open the app after the 7th day is logged — i.e. "day 8" of usage.
 */
export async function getMissionGateStatus(userId: string) {
  const [activeDayCount, alreadyWritten] = await Promise.all([
    getActiveDayCount(userId),
    hasWrittenMissionStatement(userId),
  ]);

  return {
    activeDayCount,
    required: activeDayCount >= 7 && !alreadyWritten,
  };
}
