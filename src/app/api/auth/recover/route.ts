import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { emailSchema, passwordSchema } from "../../../../../lib/validators";

const bodySchema = z.object({
  email: emailSchema,
  newPassword: passwordSchema,
  saltPassword: z.string(), // newly generated on the client for the new password
  wrappedKeyPassword: z.string(), // master key re-wrapped client-side with the new password
});

/**
 * POST /api/auth/recover
 *
 * The client has already: fetched saltRecovery + wrappedKeyRecovery,
 * derived the recovery key, unwrapped the master key locally, generated a
 * fresh salt, and re-wrapped the master key with the new password. This
 * endpoint only ever sees the new ciphertext — never the master key itself.
 *
 * Production note: this should require a short-lived, single-use token
 * (e.g. emailed) proving control of the account, rather than trusting
 * email + recovery code alone over a bare POST.
 */
export async function POST(req: Request) {
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }
  const { email, newPassword, saltPassword, wrappedKeyPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "No account found" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.authKey.update({
      where: { userId: user.id },
      data: {
        saltPassword: Buffer.from(saltPassword, "base64"),
        wrappedKeyPassword: Buffer.from(wrappedKeyPassword, "base64"),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
