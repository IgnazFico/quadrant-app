import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { startOfWeek } from "../../../../lib/week";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;
  const weekStart = startOfWeek();

  const roles = await prisma.role.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      goals: {
        where: { weekStart },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({ roles, weekStart });
}

const createSchema = z.object({
  roleId: z.string().uuid(),
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

  const goal = await prisma.goal.create({
    data: {
      roleId: role.id,
      title: parsed.data.title,
      weekStart: startOfWeek(),
    },
  });

  return NextResponse.json({ goal });
}
