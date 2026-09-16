import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

const bodySchema = z.object({
  contentEncrypted: z.string().min(1), // base64 ciphertext, encrypted client-side
  signedName: z.string().min(1).max(120),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existingCount = await prisma.missionStatement.count({
    where: { userId },
  });

  const created = await prisma.missionStatement.create({
    data: {
      userId,
      contentEncrypted: Buffer.from(parsed.data.contentEncrypted, "base64"),
      signedName: parsed.data.signedName,
      version: existingCount + 1,
    },
  });

  return NextResponse.json({ id: created.id, version: created.version });
}
