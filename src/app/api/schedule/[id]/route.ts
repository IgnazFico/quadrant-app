import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { parseDayKey } from "../../../../../lib/week";
import {
  anytimeDayFull,
  anytimeLimitReached,
  goalAlreadyScheduled,
  isAnytimeLimitError,
  isUniqueViolation,
  loadOwnedGoal,
} from "../../../../../lib/scheduleGoal";

async function loadOwnedBlock(id: string, userId: string) {
  const block = await prisma.scheduleBlock.findUnique({
    where: { id },
    include: { role: true },
  });
  if (!block || block.role.userId !== userId) return null;
  return block;
}

const patchSchema = z.object({
  roleId: z.string().uuid().optional(),
  goalId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(140).optional(),
  /** Move the block: "YYYY-MM-DD". */
  day: z.string().optional(),
  /** Move the block in time: 0–23, or null for "anytime" (a day priority).
   *  isPriority is derived from this, never sent separately. */
  hour: z.number().int().min(0).max(23).nullable().optional(),
});

/**
 * Edit or move a block. A goal has exactly one block (goalId is UNIQUE),
 * so rescheduling a goal — dragging it to another day, changing its time
 * — is always this PATCH, never a second POST.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  const owned = await loadOwnedBlock(id, userId);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.roleId && parsed.data.roleId !== owned.roleId) {
    const role = await prisma.role.findUnique({
      where: { id: parsed.data.roleId },
    });
    if (!role || role.userId !== userId) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
  }

  const { day, hour, ...rest } = parsed.data;

  if (rest.goalId && rest.goalId !== owned.goalId) {
    const goal = await loadOwnedGoal(rest.goalId, userId);
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }
    const other = await prisma.scheduleBlock.findUnique({
      where: { goalId: rest.goalId },
    });
    if (other && other.id !== id) return goalAlreadyScheduled(other);
  }

  const data: {
    roleId?: string;
    goalId?: string | null;
    title?: string;
    day?: Date;
    hour?: number | null;
    isPriority?: boolean;
  } = { ...rest };
  if (day !== undefined) data.day = parseDayKey(day);
  if (hour !== undefined) {
    data.hour = hour;
    data.isPriority = hour === null;
  }

  // Becoming Anytime, or an Anytime block landing on another day, takes a
  // slot on the target day (lib/scheduleRules.ts). Staying put never does,
  // so a day that predates the limit can still be edited and emptied.
  const nextPriority = data.isPriority ?? owned.isPriority;
  const nextDay = data.day ?? owned.day;
  const takesSlot =
    nextPriority &&
    (!owned.isPriority || nextDay.getTime() !== owned.day.getTime());
  if (takesSlot && (await anytimeDayFull(userId, nextDay, id))) {
    return anytimeLimitReached();
  }

  try {
    const block = await prisma.scheduleBlock.update({
      where: { id },
      data,
      include: { role: true },
    });
    return NextResponse.json({ block });
  } catch (e) {
    if (isUniqueViolation(e)) return goalAlreadyScheduled(null);
    if (isAnytimeLimitError(e)) return anytimeLimitReached();
    throw e;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  const owned = await loadOwnedBlock(id, userId);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.scheduleBlock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
