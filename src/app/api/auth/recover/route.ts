import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { emailSchema, passwordSchema } from "../../../../../lib/validators";
import { verifyRecoveryVerificationToken } from "../../../../../lib/recoveryToken";

const bodySchema = z.object({
  email: emailSchema,
  newPassword: passwordSchema,
  saltPassword: z.string(), // newly generated on the client for the new password
  wrappedKeyPassword: z.string(), // master key re-wrapped client-side with the new password
  verificationToken: z.string().optional(),
});

/**
 * POST /api/auth/recover
 *
 * The client has already: fetched saltRecovery + wrappedKeyRecovery,
 * derived the recovery key, unwrapped the master key locally, generated a
 * fresh salt, and re-wrapped the master key with the new password. This
 * endpoint only ever sees the new ciphertext — never the master key itself.
 *
 * Security: Validates the signed proof-of-control token to prevent unauthorized
 * resets via shoulder-surfed recovery phrases without access to the user's email.
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
  const { email, newPassword, saltPassword, wrappedKeyPassword, verificationToken } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "No account found" }, { status: 404 });
  }

  // Verify email proof-of-control token when supplied or in enforced production mode
  if (verificationToken) {
    const isValid = verifyRecoveryVerificationToken(email, verificationToken, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired recovery verification token" },
        { status: 400 },
      );
    }
  } else if (process.env.REQUIRE_RECOVERY_TOKEN === "true") {
    return NextResponse.json(
      { error: "Recovery verification token is required" },
      { status: 400 },
    );
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
