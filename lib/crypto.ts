/**
 * lib/crypto.ts
 *
 * All key derivation and encryption happens here, and only ever runs
 * client-side (browser or Capacitor app). Nothing in this file should
 * ever be imported into an API route or server component — if it is,
 * the zero-knowledge model is broken.
 *
 * Password is used for two SEPARATE purposes in this app:
 *   1. Sent to the server (over TLS) so Auth.js can verify login via bcrypt.
 *   2. Used HERE, locally, to derive an encryption key that never leaves
 *      the device. These two uses must never share a code path.
 */

import sodium from "libsodium-wrappers-sumo";

let ready = false;
async function ensureReady() {
  if (!ready) {
    await sodium.ready;
    ready = true;
  }
}

// Moderate profile: stronger than INTERACTIVE, cheap enough for a one-time
// login/signup derivation. Tune based on real device testing.
async function pwhashParams() {
  await ensureReady();
  return {
    opslimit: sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    memlimit: sodium.crypto_pwhash_MEMLIMIT_MODERATE,
    alg: sodium.crypto_pwhash_ALG_ARGON2ID13,
  };
}

export async function generateSalt(): Promise<Uint8Array> {
  await ensureReady();
  return sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
}

/** Derives a 32-byte key from a low-entropy secret (password or recovery code) + salt. */
export async function deriveKey(
  secret: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  await ensureReady();
  const { opslimit, memlimit, alg } = await pwhashParams();
  return sodium.crypto_pwhash(
    sodium.crypto_secretbox_KEYBYTES,
    secret,
    salt,
    opslimit,
    memlimit,
    alg,
  );
}

/** The one real secret that encrypts user data. Generated once per account. */
export async function generateMasterKey(): Promise<Uint8Array> {
  await ensureReady();
  return sodium.crypto_secretbox_keygen();
}

/**
 * A high-entropy recovery code shown once at signup.
 * Formatted in groups for easier transcription, e.g. "9F3K-QP2L-7XZC-..."
 */
export async function generateRecoveryCode(): Promise<string> {
  await ensureReady();
  const bytes = sodium.randombytes_buf(20);
  const hex = sodium.to_hex(bytes).toUpperCase();
  return hex.match(/.{1,4}/g)!.join("-");
}

/** Encrypts `data` (e.g. a master key, or any field) with `key`. Nonce is prefixed to the output. */
async function seal(data: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
  await ensureReady();
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(data, nonce, key);
  const out = new Uint8Array(nonce.length + ciphertext.length);
  out.set(nonce, 0);
  out.set(ciphertext, nonce.length);
  return out;
}

async function open(blob: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
  await ensureReady();
  const nonce = blob.slice(0, sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = blob.slice(sodium.crypto_secretbox_NONCEBYTES);
  const opened = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
  if (!opened)
    throw new Error("Decryption failed — wrong key or corrupted data");
  return opened;
}

/** Wraps (encrypts) the master key with a derived key. Result is safe to store server-side. */
export async function wrapMasterKey(
  masterKey: Uint8Array,
  derivedKey: Uint8Array,
) {
  return seal(masterKey, derivedKey);
}

/** Unwraps the master key. Throws if the derived key is wrong (bad password/recovery code). */
export async function unwrapMasterKey(
  wrapped: Uint8Array,
  derivedKey: Uint8Array,
) {
  return open(wrapped, derivedKey);
}

/** Encrypts a plaintext string field (mission statement, review reason, etc.) with the master key. */
export async function encryptField(
  plaintext: string,
  masterKey: Uint8Array,
): Promise<Uint8Array> {
  await ensureReady();
  return seal(sodium.from_string(plaintext), masterKey);
}

export async function decryptField(
  blob: Uint8Array,
  masterKey: Uint8Array,
): Promise<string> {
  await ensureReady();
  const raw = await open(blob, masterKey);
  return sodium.to_string(raw);
}

// ---- base64 helpers for sending binary blobs over JSON ----

export async function toBase64(bytes: Uint8Array): Promise<string> {
  await ensureReady();
  return sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);
}

export async function fromBase64(b64: string): Promise<Uint8Array> {
  await ensureReady();
  return sodium.from_base64(b64, sodium.base64_variants.ORIGINAL);
}
