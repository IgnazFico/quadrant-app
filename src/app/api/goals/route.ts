import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { startOfWeek } from "../../../../lib/week";

const createGoalSchema = z.object({
  roleId: z.string().uuid(),
  title: z.string().min(1).max(140),
  weekStart: z.string().optional(),
});

/**
 * GET /api/goals?weekStart=YYYY-MM-DD
 * Returns roles for the logged in user with their goals for the requested week (defaults to startOfWeek()).
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const url = new URL(req.url);
  const param = url.searchParams.get("weekStart");
  const targetWeek = param ? startOfWeek(new Date(param)) : startOfWeek();

  const roles = await prisma.role.findMany({
    where: { userId },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "asc" }],
    include: {
      goals: {
        where: { weekStart: targetWeek },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({ roles, weekStart: targetWeek });
}

/**
 * POST /api/goals
 * Creates a new weekly goal associated with a role.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const json = await req.json();
  const parsed = createGoalSchema.safeParse(json);
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

  const weekStart = parsed.data.weekStart
    ? startOfWeek(new Date(parsed.data.weekStart))
    : startOfWeek();

  const goal = await prisma.goal.create({
    data: {
      roleId: role.id,
      title: parsed.data.title,
      weekStart,
    },
  });

  return NextResponse.json({ goal }, { status: 201 });
}
