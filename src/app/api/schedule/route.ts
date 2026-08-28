import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { startOfDay } from "../../../../lib/week";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const blocks = await prisma.scheduleBlock.findMany({
    where: { day: startOfDay(), role: { userId } },
    include: { role: true },
    orderBy: { hour: "asc" },
  });

  return NextResponse.json({ blocks });
}

const createSchema = z.object({
  roleId: z.string().uuid(),
  goalId: z.string().uuid().nullable().optional(),
  hour: z.number().int().min(0).max(23),
  title: z.string().min(1).max(140),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const json = await req.json();
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const role = await prisma.role.findUnique({
    where: { id: parsed.data.roleId },
  });
  if (!role || role.userId !== userId) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const block = await prisma.scheduleBlock.create({
    data: {
      roleId: role.id,
      goalId: parsed.data.goalId ?? null,
      day: startOfDay(),
      hour: parsed.data.hour,
      isPriority: false,
      title: parsed.data.title,
    },
    include: { role: true },
  });

  return NextResponse.json({ block });
}
