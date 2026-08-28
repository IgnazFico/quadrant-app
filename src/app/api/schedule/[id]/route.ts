import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const block = await prisma.scheduleBlock.findUnique({
    where: { id: params.id },
    include: { role: true },
  });
  if (!block || block.role.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.scheduleBlock.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
