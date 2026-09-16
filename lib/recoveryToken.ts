import crypto from "crypto";

const TOKEN_SECRET =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "quadrant-recovery-token-default-secret";

// 15 minutes expiration window
const TOKEN_TTL_MS = 15 * 60 * 1000;

interface RecoveryTokenPayload {
  email: string;
  expiresAt: number;
  hash: string;
}

/**
 * Generates a signed, tamper-proof recovery verification token.
 * Incorporates a hash of the user's current password hash so that once
 * the password is reset, the token becomes immediately invalidated.
 */
export function generateRecoveryVerificationToken(
  email: string,
  userPasswordHash: string,
): { token: string; code: string } {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const normalizedEmail = email.trim().toLowerCase();

  // 6-digit numeric verification code for email delivery
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(`${normalizedEmail}:${userPasswordHash}:${expiresAt}:${code}`)
    .digest("hex");

  const payload: RecoveryTokenPayload = {
    email: normalizedEmail,
    expiresAt,
    hash: signature,
  };

  const serialized = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const fullToken = `${serialized}.${code}`;

  return { token: fullToken, code };
}

/**
 * Verifies that a recovery token is genuine, non-expired, and matches the account.
 */
export function verifyRecoveryVerificationToken(
  email: string,
  tokenWithCode: string,
  userPasswordHash: string,
): boolean {
  try {
    const parts = tokenWithCode.split(".");
    if (parts.length !== 2) return false;

    const [serialized, code] = parts;
    const jsonStr = Buffer.from(serialized, "base64url").toString("utf8");
    const payload: RecoveryTokenPayload = JSON.parse(jsonStr);

    if (payload.email !== email.trim().toLowerCase()) return false;
    if (Date.now() > payload.expiresAt) return false;

    const expectedSignature = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(`${payload.email}:${userPasswordHash}:${payload.expiresAt}:${code}`)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(payload.hash, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );
  } catch {
    return false;
  }
}
