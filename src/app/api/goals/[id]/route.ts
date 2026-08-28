import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

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

  // Any ScheduleBlock referencing this goal keeps its title and just loses
  // the link (onDelete: SetNull in the schema) — deleting a goal shouldn't
  // silently erase someone's calendar history.
  await prisma.goal.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
