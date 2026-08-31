import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { startOfDay } from "../../../../lib/week";

/**
 * GET /api/schedule — today's agenda only (used by the weekly goals page).
 * For a full week's grid, use GET /api/schedule/week instead.
 */
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

const createSchema = z
  .object({
    roleId: z.string().uuid(),
    goalId: z.string().uuid().nullable().optional(),
    day: z.string().optional(), // ISO date string; defaults to today
    hour: z.number().int().min(0).max(23).nullable().optional(),
    isPriority: z.boolean().optional().default(false),
    title: z.string().min(1).max(140),
  })
  .refine((data) => (data.isPriority ? data.hour == null : data.hour != null), {
    message: "A timed block needs an hour; a priority item must not have one",
    path: ["hour"],
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

  const day = parsed.data.day
    ? startOfDay(new Date(parsed.data.day))
    : startOfDay();

  const block = await prisma.scheduleBlock.create({
    data: {
      roleId: role.id,
      goalId: parsed.data.goalId ?? null,
      day,
      hour: parsed.data.isPriority ? null : (parsed.data.hour ?? null),
      isPriority: parsed.data.isPriority,
      title: parsed.data.title,
    },
    include: { role: true },
  });

  return NextResponse.json({ block });
}
