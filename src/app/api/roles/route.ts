import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

const createRolesSchema = z.object({
  roles: z
    .array(
      z.object({
        domain: z.string().min(1).max(30),
        label: z.string().min(1).max(60),
      }),
    )
    .min(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  const roles = await prisma.role.findMany({
    where: { userId },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ roles });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  const json = await req.json();
  const parsed = createRolesSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const created = await prisma.$transaction(
    parsed.data.roles.map((r) =>
      prisma.role.create({
        data: {
          userId,
          domain: r.domain,
          label: r.label,
        },
      }),
    ),
  );

  return NextResponse.json({ roles: created });
}
