import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { startOfWeek } from "../../../../lib/week";
import { goalTitleSchema, serializeGoal, serializeRole } from "../../../../lib/sealed";

const createGoalSchema = z.object({
  roleId: z.string().uuid(),
  // Base64 ciphertext sealed in the browser (WO-029). The 140-character limit
  // is enforced by the browser; the server bounds the size (lib/sealed.ts).
  title: goalTitleSchema,
  weekStart: z.string().optional(),
});

/**
 * GET /api/goals?weekStart=YYYY-MM-DD
 * Returns roles for the logged in user with their goals for the requested week (defaults to startOfWeek()).
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

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

  // role.label and goal.title are ciphertext: they leave as base64 and are
  // opened in the browser (lib/sealedFields.ts).
  return NextResponse.json({
    roles: roles.map((r) => ({
      ...serializeRole(r),
      goals: r.goals.map(serializeGoal),
    })),
    weekStart: targetWeek,
  });
}

/**
 * POST /api/goals
 * Creates a new weekly goal associated with a role.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

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

  return NextResponse.json({ goal: serializeGoal(goal) }, { status: 201 });
}
