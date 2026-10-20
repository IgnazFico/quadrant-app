import crypto from "crypto";
import { getAppSecret } from "./appSecret";

// 15 minutes expiration window
const TOKEN_TTL_MS = 15 * 60 * 1000;

interface RecoveryTokenPayload {
  email: string;
  expiresAt: number;
  hash: string;
}

function sign(
  email: string,
  userPasswordHash: string,
  expiresAt: number,
  code: string,
): string {
  // The secret is read here, per call, and has NO fallback value: with no
  // server secret configured this throws and the caller fails closed.
  return crypto
    .createHmac("sha256", getAppSecret())
    .update(`${email}:${userPasswordHash}:${expiresAt}:${code}`)
    .digest("hex");
}

/**
 * Generates a signed recovery ticket plus a 6-digit code.
 *
 * The ticket goes to the browser. The code goes ONLY into the email. The
 * ticket does not contain the code, so holding the ticket proves nothing:
 * /api/auth/recover needs ticket AND code, and only someone who can read the
 * mailbox has the code. The signature also covers a hash of the user's current
 * password hash, so once the password is reset the ticket stops working.
 */
export function generateRecoveryVerificationToken(
  email: string,
  userPasswordHash: string,
): { token: string; code: string } {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const normalizedEmail = email.trim().toLowerCase();

  // Cryptographically secure, uniform 6 digits (WO-012: was Math.random).
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

  const payload: RecoveryTokenPayload = {
    email: normalizedEmail,
    expiresAt,
    hash: sign(normalizedEmail, userPasswordHash, expiresAt, code),
  };

  return {
    token: Buffer.from(JSON.stringify(payload)).toString("base64url"),
    code,
  };
}

/**
 * Verifies ticket + emailed code: genuine, non-expired, same account.
 */
export function verifyRecoveryVerificationToken(
  email: string,
  token: string,
  code: string,
  userPasswordHash: string,
): boolean {
  try {
    if (!/^\d{6}$/.test(code)) return false;
    const jsonStr = Buffer.from(token, "base64url").toString("utf8");
    const payload: RecoveryTokenPayload = JSON.parse(jsonStr);

    const normalizedEmail = email.trim().toLowerCase();
    if (payload.email !== normalizedEmail) return false;
    if (Date.now() > payload.expiresAt) return false;

    const expected = Buffer.from(
      sign(payload.email, userPasswordHash, payload.expiresAt, code),
      "hex",
    );
    const given = Buffer.from(payload.hash, "hex");
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  } catch {
    return false;
  }
}
