import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { roleLabelSchema, serializeRole } from "../../../../../lib/sealed";

const patchSchema = z.object({
  isFeatured: z.boolean().optional(),
  label: roleLabelSchema.optional(), // base64 ciphertext (WO-029)
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role || role.userId !== userId) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.role.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ role: serializeRole(updated) });
}
