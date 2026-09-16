import crypto from "crypto";

const FAKE_SALT_SECRET =
  process.env.FAKE_SALT_SECRET ||
  process.env.AUTH_SECRET ||
  "quadrant-default-synthetic-salt-secret";

const FAKE_KEY_SECRET =
  process.env.FAKE_KEY_SECRET ||
  process.env.AUTH_SECRET ||
  "quadrant-default-synthetic-key-secret";

/**
 * Generates a deterministic, synthetic 16-byte salt for non-existent emails.
 * Uses HMAC-SHA256 of the normalized email so repeated requests return identical salts,
 * preventing account enumeration timing and behavioral analysis.
 */
export function getSyntheticSalt(email: string, domain: string = "password"): string {
  const hmac = crypto.createHmac("sha256", FAKE_SALT_SECRET);
  hmac.update(`${email.trim().toLowerCase()}:${domain}:salt`);
  return hmac.digest().subarray(0, 16).toString("base64");
}

/**
 * Generates a deterministic, synthetic 72-byte wrapped key blob for non-existent emails.
 * 72 bytes matches standard Libsodium secretbox:
 * - 24 bytes nonce
 * - 32 bytes master key
 * - 16 bytes Poly1305 MAC tag
 *
 * When the client passes this to sodium.crypto_secretbox_open_easy, it will fail MAC verification
 * and report invalid credentials, exactly like a genuine account with an incorrect password.
 */
export function getSyntheticWrappedKey(email: string, domain: string = "password"): string {
  const normalized = email.trim().toLowerCase();
  const chunk1 = crypto
    .createHmac("sha256", FAKE_KEY_SECRET)
    .update(`${normalized}:${domain}:chunk1`)
    .digest(); // 32 bytes
  const chunk2 = crypto
    .createHmac("sha256", FAKE_KEY_SECRET)
    .update(`${normalized}:${domain}:chunk2`)
    .digest(); // 32 bytes
  const chunk3 = crypto
    .createHmac("sha256", FAKE_KEY_SECRET)
    .update(`${normalized}:${domain}:chunk3`)
    .digest()
    .subarray(0, 8); // 8 bytes

  const synthetic72Bytes = Buffer.concat([chunk1, chunk2, chunk3]);
  return synthetic72Bytes.toString("base64");
}

export function getSyntheticLoginChallenge(email: string) {
  return {
    saltPassword: getSyntheticSalt(email, "password"),
    wrappedKeyPassword: getSyntheticWrappedKey(email, "password"),
    isNewUser: false,
  };
}

export function getSyntheticRecoveryChallenge(email: string) {
  return {
    saltRecovery: getSyntheticSalt(email, "recovery"),
    wrappedKeyRecovery: getSyntheticWrappedKey(email, "recovery"),
  };
}
