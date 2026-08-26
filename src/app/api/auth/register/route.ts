import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { emailSchema, passwordSchema } from "../../../../../lib/validators";

const bodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  // All of the below are base64-encoded ciphertext or public (non-secret) salts.
  // The server never sees the master key or any derived key in plaintext.
  saltPassword: z.string(),
  saltRecovery: z.string(),
  wrappedKeyPassword: z.string(),
  wrappedKeyRecovery: z.string(),
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }
  const {
    email,
    password,
    saltPassword,
    saltRecovery,
    wrappedKeyPassword,
    wrappedKeyRecovery,
  } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      authKey: {
        create: {
          saltPassword: Buffer.from(saltPassword, "base64"),
          saltRecovery: Buffer.from(saltRecovery, "base64"),
          wrappedKeyPassword: Buffer.from(wrappedKeyPassword, "base64"),
          wrappedKeyRecovery: Buffer.from(wrappedKeyRecovery, "base64"),
        },
      },
    },
  });

  return NextResponse.json({ ok: true });
}
