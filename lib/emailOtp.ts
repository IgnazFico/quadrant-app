/**
 * Email one-time code (OTP) for sign-up (WO-012, D-024).
 *
 * - 6 digits from a cryptographic generator (crypto.randomInt), never Math.random.
 * - Only a keyed hash (HMAC-SHA256 with the server secret, bound to the user id)
 *   is stored. The code itself is never stored, logged or returned.
 * - 10 minutes to live, 5 attempts per code, single use, 60 s between sends,
 *   5 sends per hour per account.
 *
 * Nothing here touches key material, salts or user content. The zero-knowledge
 * design is unchanged: this only proves control of the email address.
 */
import crypto from "crypto";
import { prisma } from "./prisma";
import { getAppSecret } from "./appSecret";
import { sendMail } from "./mail";

export const OTP = {
  length: 6,
  ttlMs: 10 * 60 * 1000,
  maxAttempts: 5,
  cooldownMs: 60 * 1000,
  maxSendsPerWindow: 5,
  windowMs: 60 * 60 * 1000,
} as const;

export function generateCode(): string {
  // randomInt is uniform and CSPRNG-backed. Pad so leading zeros are possible.
  return crypto.randomInt(0, 10 ** OTP.length).toString().padStart(OTP.length, "0");
}

export function hashCode(userId: string, code: string): string {
  return crypto
    .createHmac("sha256", getAppSecret())
    .update(`email-otp:${userId}:${code}`)
    .digest("hex");
}

function hashesEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export type IssueResult =
  | { ok: true; retryAfter: number }
  | { ok: false; reason: "cooldown" | "cap"; retryAfter: number }
  | { ok: false; reason: "not_configured" | "send_failed" };

/** Seconds until a new code may be sent for this user; 0 when allowed now. */
export async function cooldownRemaining(userId: string, now = new Date()): Promise<number> {
  const row = await prisma.emailVerification.findUnique({ where: { userId } });
  if (!row) return 0;
  const ms = row.sentAt.getTime() + OTP.cooldownMs - now.getTime();
  return ms > 0 ? Math.ceil(ms / 1000) : 0;
}

/**
 * Create a fresh code for the user (replacing any older one) and email it.
 * Enforces the resend cooldown and the hourly cap. If the mail cannot be sent
 * the new code is discarded, so nothing the user cannot read is left pending.
 */
export async function issueCode(
  user: { id: string; email: string },
  now = new Date(),
): Promise<IssueResult> {
  const row = await prisma.emailVerification.findUnique({ where: { userId: user.id } });

  let sendCount = 1;
  let sendWindowStart = now;
  if (row) {
    const sinceSent = now.getTime() - row.sentAt.getTime();
    if (sinceSent < OTP.cooldownMs) {
      return { ok: false, reason: "cooldown", retryAfter: Math.ceil((OTP.cooldownMs - sinceSent) / 1000) };
    }
    const windowAge = now.getTime() - row.sendWindowStart.getTime();
    if (windowAge < OTP.windowMs) {
      if (row.sendCount >= OTP.maxSendsPerWindow) {
        return { ok: false, reason: "cap", retryAfter: Math.ceil((OTP.windowMs - windowAge) / 1000) };
      }
      sendCount = row.sendCount + 1;
      sendWindowStart = row.sendWindowStart;
    }
  }

  const code = generateCode();
  const data = {
    codeHash: hashCode(user.id, code),
    expiresAt: new Date(now.getTime() + OTP.ttlMs),
    attempts: 0,
    sentAt: now,
    sendCount,
    sendWindowStart,
  };

  // Claim the send atomically so two parallel requests cannot both pass the cooldown.
  if (row) {
    const claimed = await prisma.emailVerification.updateMany({
      where: { id: row.id, sentAt: row.sentAt },
      data,
    });
    if (claimed.count !== 1) {
      return { ok: false, reason: "cooldown", retryAfter: Math.ceil(OTP.cooldownMs / 1000) };
    }
  } else {
    try {
      await prisma.emailVerification.create({ data: { userId: user.id, ...data } });
    } catch {
      return { ok: false, reason: "cooldown", retryAfter: Math.ceil(OTP.cooldownMs / 1000) };
    }
  }

  const sent = await sendMail({
    to: user.email,
    subject: "Your Quadrant verification code",
    text:
      `Your Quadrant verification code is ${code}.\n\n` +
      `It expires in ${OTP.ttlMs / 60000} minutes and works once. ` +
      `If you didn't create a Quadrant account, you can ignore this email.`,
  });
  if (!sent.ok) {
    await prisma.emailVerification.deleteMany({ where: { userId: user.id } });
    return { ok: false, reason: sent.reason === "not_configured" ? "not_configured" : "send_failed" };
  }
  return { ok: true, retryAfter: Math.ceil(OTP.cooldownMs / 1000) };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "wrong_code"; attemptsLeft: number }
  | { ok: false; reason: "expired" | "locked" };

/**
 * Check a code. Unknown email, already-verified account and "no code pending"
 * all answer `expired`, so the answer does not reveal whether an account exists.
 */
export async function verifyCode(email: string, code: string, now = new Date()): Promise<VerifyResult> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerifiedAt: true },
  });
  if (!user || user.emailVerifiedAt) return { ok: false, reason: "expired" };

  const row = await prisma.emailVerification.findUnique({ where: { userId: user.id } });
  if (!row) return { ok: false, reason: "expired" };

  if (row.expiresAt.getTime() <= now.getTime()) {
    await prisma.emailVerification.deleteMany({ where: { id: row.id } });
    return { ok: false, reason: "expired" };
  }

  // Count the attempt first and atomically; a parallel burst cannot exceed the limit.
  const counted = await prisma.emailVerification.updateMany({
    where: { id: row.id, attempts: { lt: OTP.maxAttempts } },
    data: { attempts: { increment: 1 } },
  });
  if (counted.count !== 1) return { ok: false, reason: "locked" };

  const candidate = hashCode(user.id, code);
  if (!hashesEqual(candidate, row.codeHash)) {
    const attemptsLeft = Math.max(0, OTP.maxAttempts - (row.attempts + 1));
    return attemptsLeft === 0
      ? { ok: false, reason: "locked" }
      : { ok: false, reason: "wrong_code", attemptsLeft };
  }

  // Single use: only the request that deletes the row may verify the account.
  const verified = await prisma.$transaction(async (tx) => {
    const del = await tx.emailVerification.deleteMany({
      where: { id: row.id, codeHash: row.codeHash },
    });
    if (del.count !== 1) return false;
    await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: now } });
    return true;
  });
  return verified ? { ok: true } : { ok: false, reason: "expired" };
}
