import { prisma } from "./prisma";

/**
 * Carries goals into another week (weekly review, POST /api/review/complete).
 *
 * WO-029: titles are ciphertext the server cannot read or compare, so the copy
 * is made byte for byte (`title` is passed through, never opened) and each copy
 * remembers its source in goals.carriedFromId, which is UNIQUE. That makes the
 * operation idempotent: a second run for the same source goals (a retry, a
 * double click, two simultaneous requests) inserts nothing, because
 * `skipDuplicates` skips rows that violate the unique index. Returns how many
 * goals were actually created.
 *
 * Previously this compared titles, which no longer works: the same text sealed
 * twice gives different bytes.
 */
export async function carryGoalsForward(
  toCarry: { id: string; roleId: string; title: Uint8Array<ArrayBuffer> }[],
  targetWeek: Date,
): Promise<number> {
  if (toCarry.length === 0) return 0;
  const created = await prisma.goal.createMany({
    data: toCarry.map((g) => ({
      roleId: g.roleId,
      title: g.title,
      weekStart: targetWeek,
      carriedFromId: g.id,
    })),
    skipDuplicates: true,
  });
  return created.count;
}
