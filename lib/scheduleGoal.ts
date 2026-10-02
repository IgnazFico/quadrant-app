import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import {
  ANYTIME_LIMIT_MESSAGE,
  ANYTIME_LIMIT_REACHED,
  ANYTIME_PER_DAY,
} from "./scheduleRules";

export { ANYTIME_LIMIT_REACHED };

/**
 * One-place-per-goal rule for schedule blocks.
 *
 * schedule_blocks.goalId is UNIQUE: a goal is scheduled in at most one
 * place. Rescheduling it is a PATCH of that block's day/hour, never a new
 * block. These helpers keep the POST/PATCH routes' responses consistent.
 */

export const GOAL_ALREADY_SCHEDULED = "GOAL_ALREADY_SCHEDULED";

export async function loadOwnedGoal(goalId: string, userId: string) {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { role: true },
  });
  if (!goal || goal.role.userId !== userId) return null;
  return goal;
}

/** 409 with the existing block's id so the client can open/move it instead. */
export function goalAlreadyScheduled(existing: { id: string } | null) {
  return NextResponse.json(
    {
      error: "This goal already has a place in your week. Move that block instead.",
      code: GOAL_ALREADY_SCHEDULED,
      blockId: existing?.id ?? null,
    },
    { status: 409 },
  );
}

/**
 * True when `day` already holds ANYTIME_PER_DAY Anytime blocks for this
 * user (ignoring `excludeBlockId`, the block being moved/edited).
 */
export async function anytimeDayFull(
  userId: string,
  day: Date,
  excludeBlockId?: string,
): Promise<boolean> {
  const n = await prisma.scheduleBlock.count({
    where: {
      day,
      isPriority: true,
      role: { userId },
      ...(excludeBlockId ? { id: { not: excludeBlockId } } : {}),
    },
  });
  return n >= ANYTIME_PER_DAY;
}

export function anytimeLimitReached() {
  return NextResponse.json(
    { error: ANYTIME_LIMIT_MESSAGE, code: ANYTIME_LIMIT_REACHED },
    { status: 409 },
  );
}

/** The DB trigger's RAISE (safety net for races the route check can't see). */
export function isAnytimeLimitError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes(ANYTIME_LIMIT_REACHED);
}

/** Prisma unique-constraint violation (P2002). */
export function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: unknown }).code === "P2002"
  );
}
