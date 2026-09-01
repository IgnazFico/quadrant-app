import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { castVote, retractVote } from "../../../../../lib/growthRing";

async function loadOwnedGoal(id: string, userId: string) {
  const goal = await prisma.goal.findUnique({
    where: { id },
    include: { role: true },
  });
  if (!goal || goal.role.userId !== userId) return null;
  return goal;
}

const patchSchema = z.object({
  title: z.string().min(1).max(140).optional(),
  status: z.enum(["IN_PROGRESS", "DONE", "MISSED"]).optional(),
  carryForward: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const owned = await loadOwnedGoal(params.id, userId);
  if (!owned)
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const goal = await prisma.goal.update({
    where: { id: params.id },
    data: parsed.data,
  });

  // Cast or retract a growth-ring vote based on the actual before/after
  // transition — not just "is it DONE now", which would let someone farm
  // votes by re-saving an already-done goal.
  const wasDone = owned.status === "DONE";
  const isDoneNow = goal.status === "DONE";
  if (!wasDone && isDoneNow) {
    await castVote(owned.roleId);
  } else if (wasDone && !isDoneNow) {
    await retractVote(owned.roleId);
  }

  return NextResponse.json({ goal });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const owned = await loadOwnedGoal(params.id, userId);
  if (!owned)
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  // A DONE goal being deleted still had its vote cast — retract it first
  // so deleting a completed goal can't leave a phantom vote behind.
  if (owned.status === "DONE") {
    await retractVote(owned.roleId);
  }

  await prisma.goal.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
