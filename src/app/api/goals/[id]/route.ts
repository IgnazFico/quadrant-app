import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { castVote, retractVote } from "../../../../../lib/growthRing";

async function loadOwnedGoal(id: string, userId: string) {
  const goal = await prisma.goal.findUnique({ where: { id }, include: { role: true } });
  if (!goal || goal.role.userId !== userId) return null;
  return goal;
}

const patchSchema = z.object({
  title: z.string().min(1).max(140).optional(),
  status: z.enum(["IN_PROGRESS", "DONE", "MISSED"]).optional(),
  carryForward: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;
  const { id } = await params;

  const owned = await loadOwnedGoal(id, userId);
  if (!owned) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const wasDone = owned.status === "DONE";
  const willBeDone = (parsed.data.status ?? owned.status) === "DONE";

  // completedAt is server-managed, not client-settable — it's derived
  // from the same transition the vote logic already checks below.
  const data: typeof parsed.data & { completedAt?: Date | null } = { ...parsed.data };
  if (!wasDone && willBeDone) data.completedAt = new Date();
  else if (wasDone && !willBeDone) data.completedAt = null;

  const goal = await prisma.goal.update({ where: { id }, data });

  if (!wasDone && willBeDone) {
    await castVote(owned.roleId);
  } else if (wasDone && !willBeDone) {
    await retractVote(owned.roleId);
  }

  return NextResponse.json({ goal });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;
  const { id } = await params;

  const owned = await loadOwnedGoal(id, userId);
  if (!owned) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  if (owned.status === "DONE") {
    await retractVote(owned.roleId);
  }

  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
