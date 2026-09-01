import { prisma } from "./prisma";

function currentYear(): number {
  return new Date().getFullYear();
}

/** Finds or lazily creates this role's ring for the current year. */
async function getOrCreateCurrentRing(roleId: string) {
  const year = currentYear();
  return prisma.growthRing.upsert({
    where: { roleId_year: { roleId, year } },
    update: {},
    create: { roleId, year },
  });
}

/**
 * Casts one vote toward a role's current-year ring. Called exactly once,
 * at the moment a goal transitions INTO the DONE status — not on every
 * PATCH that happens to touch an already-done goal.
 */
export async function castVote(roleId: string) {
  const ring = await getOrCreateCurrentRing(roleId);
  if (ring.sealed) return ring; // a sealed ring is a closed record — never mutated again
  return prisma.growthRing.update({
    where: { id: ring.id },
    data: { votesLogged: { increment: 1 } },
  });
}

/**
 * Retracts a vote — called when a DONE goal is unmarked. This is what
 * stops someone from farming votes by toggling a goal on and off
 * repeatedly. Floors at 0, never goes negative.
 */
export async function retractVote(roleId: string) {
  const ring = await getOrCreateCurrentRing(roleId);
  if (ring.sealed || ring.votesLogged <= 0) return ring;
  return prisma.growthRing.update({
    where: { id: ring.id },
    data: { votesLogged: { decrement: 1 } },
  });
}

/**
 * Seals every unsealed ring from a year that has already ended. Safe to
 * run more than once, and safe to run late — it only ever touches rows
 * where `year < currentYear`, so it can never seal the current,
 * still-in-progress ring no matter when it actually fires.
 */
export async function sealPastYearRings(): Promise<number> {
  const result = await prisma.growthRing.updateMany({
    where: { year: { lt: currentYear() }, sealed: false },
    data: { sealed: true, sealedAt: new Date() },
  });
  return result.count;
}
