import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { emailSchema, passwordSchema } from "../../../../../lib/validators";
import { isMailConfigured } from "../../../../../lib/mail";
import { cooldownRemaining, issueCode } from "../../../../../lib/emailOtp";

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

const UNAVAILABLE = {
  error: "Sign-up is temporarily unavailable. Please try again later.",
  code: "mail_unavailable",
};
const SEND_FAILED = {
  error: "We couldn't send the verification email. Please try again.",
  code: "send_failed",
};

function hasServerSecret(): boolean {
  return Boolean(
    process.env.AUTH_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      process.env.BETTER_AUTH_SECRET,
  );
}

/**
 * POST /api/auth/register
 *
 * Creates an UNVERIFIED account and emails a one-time code (WO-012, D-024).
 * The account cannot sign in until /api/auth/verify-email accepts the code.
 *
 * Fails closed: with no mail configuration nothing is created, and no code
 * is ever returned in a response.
 *
 * Verified account with this email -> 409, as before (this still tells a
 * visitor that the address is registered; kept on purpose, see the WO-012
 * report).
 * UNVERIFIED account with this email -> this request takes the sign-up over
 * (new password and keys, new code). Nobody has ever signed in to it, so there
 * is no data to protect, and whoever cannot read the mailbox can never verify.
 */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
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

  if (!isMailConfigured() || !hasServerSecret()) {
    return NextResponse.json(UNAVAILABLE, { status: 503 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.emailVerifiedAt) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  if (existing) {
    const wait = await cooldownRemaining(existing.id);
    if (wait > 0) {
      return NextResponse.json(
        {
          error: `Please wait ${wait} seconds before asking for another code.`,
          code: "cooldown",
          retryAfter: wait,
        },
        { status: 429, headers: { "Retry-After": String(wait) } },
      );
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const keys = {
    saltPassword: Buffer.from(saltPassword, "base64"),
    saltRecovery: Buffer.from(saltRecovery, "base64"),
    wrappedKeyPassword: Buffer.from(wrappedKeyPassword, "base64"),
    wrappedKeyRecovery: Buffer.from(wrappedKeyRecovery, "base64"),
  };

  let user: { id: string; email: string };
  if (existing) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: existing.id }, data: { passwordHash } }),
      prisma.authKey.upsert({
        where: { userId: existing.id },
        create: { userId: existing.id, ...keys },
        update: { ...keys, recoveryKeyIssuedAt: new Date() },
      }),
    ]);
    user = { id: existing.id, email: existing.email };
  } else {
    try {
      user = await prisma.user.create({
        data: { email, passwordHash, authKey: { create: keys } },
        select: { id: true, email: true },
      });
    } catch {
      // Lost a race with a parallel sign-up for the same address.
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }
  }

  const issued = await issueCode(user);
  if (!issued.ok) {
    if (!existing) {
      // Never leave an account whose owner was not sent a code.
      await prisma.user.deleteMany({
        where: { id: user.id, emailVerifiedAt: null },
      });
    }
    if (issued.reason === "cooldown" || issued.reason === "cap") {
      return NextResponse.json(
        {
          error: "Too many codes requested. Please try again later.",
          code: issued.reason,
          retryAfter: issued.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(issued.retryAfter) } },
      );
    }
    const notConfigured = issued.reason === "not_configured";
    return NextResponse.json(notConfigured ? UNAVAILABLE : SEND_FAILED, {
      status: notConfigured ? 503 : 502,
    });
  }

  return NextResponse.json({
    ok: true,
    verificationRequired: true,
    retryAfter: issued.retryAfter,
  });
}
