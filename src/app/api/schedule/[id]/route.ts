import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

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
});

/** Editing only ever changes role/goal/title — the day, hour, and isPriority
 *  of a block are fixed by which cell it was created in, matching the
 *  prototype's behavior (the sheet never moves a block to a new cell). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;
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

  const block = await prisma.scheduleBlock.update({
    where: { id },
    data: parsed.data,
    include: { role: true },
  });

  return NextResponse.json({ block });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;
  const { id } = await params;

  const owned = await loadOwnedBlock(id, userId);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.scheduleBlock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
