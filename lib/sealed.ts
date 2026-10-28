/**
 * lib/sealed.ts — SERVER-SAFE helpers for the three fields the browser seals
 * before they are sent (WO-029, D-066):
 *
 *   goals.title · schedule_blocks.title · roles.label
 *
 * The server never opens these. It stores the bytes it is given, returns the
 * bytes it stored, and bounds their size. Nothing here imports libsodium
 * (lib/crypto.ts stays browser-only); the browser half is lib/sealedFields.ts.
 *
 * On the wire the three fields keep their old names (`title`, `label`) but hold
 * BASE64 CIPHERTEXT, not text. In the database they are `bytea`.
 *
 * What the server can and cannot check: size and base64 only. It cannot tell
 * ciphertext from text a modified client chose to send (same as
 * review_entries.reasonEncrypted today).
 */

import { z } from "zod";

/** crypto_secretbox: 24-byte nonce + 16-byte MAC around the plaintext (lib/crypto.ts seal()). */
export const SEALED_OVERHEAD = 40;
/** Largest UTF-8 size of one UTF-16 code unit is 3 bytes (a surrogate pair is 4 bytes for 2 units). */
const MAX_BYTES_PER_UNIT = 3;

export const GOAL_TITLE_MAX = 140;
export const SCHEDULE_TITLE_MAX = 140;
export const ROLE_LABEL_MAX = 60;

/** Largest ciphertext the server accepts for a field that holds at most `maxChars` characters. */
export function sealedMaxBytes(maxChars: number): number {
  return maxChars * MAX_BYTES_PER_UNIT + SEALED_OVERHEAD;
}

/** Smallest valid ciphertext: nonce + MAC + one plaintext byte. */
export const SEALED_MIN_BYTES = SEALED_OVERHEAD + 1;

/** Standard base64 with padding, as lib/crypto.ts toBase64 writes it. */
export function isCanonicalBase64(s: string): boolean {
  return /^[A-Za-z0-9+/]*={0,2}$/.test(s) && s.length % 4 === 0;
}

/**
 * zod schema for one sealed field: a base64 string that decodes to between
 * SEALED_MIN_BYTES and sealedMaxBytes(maxChars) bytes. Parses to a Buffer
 * ready for Prisma.
 */
export function sealedField(maxChars: number) {
  const maxBytes = sealedMaxBytes(maxChars);
  return z
    .string()
    // base64 grows 4/3: reject oversize strings before decoding them.
    .max(Math.ceil(maxBytes / 3) * 4)
    .refine(isCanonicalBase64, { message: "Expected base64 ciphertext" })
    .transform((s) => Buffer.from(s, "base64"))
    .refine((b) => b.length >= SEALED_MIN_BYTES && b.length <= maxBytes, {
      message: `Ciphertext must be ${SEALED_MIN_BYTES} to ${maxBytes} bytes`,
    });
}

export const goalTitleSchema = sealedField(GOAL_TITLE_MAX);
export const scheduleTitleSchema = sealedField(SCHEDULE_TITLE_MAX);
export const roleLabelSchema = sealedField(ROLE_LABEL_MAX);
export const SIGNED_NAME_MAX = 120;
export const signedNameSchema = sealedField(SIGNED_NAME_MAX);

/** Bytes (Prisma Bytes, Buffer or Uint8Array) -> base64 for JSON. */
export function toWire(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

// ---- Response serializers ---------------------------------------------------
// A Prisma Bytes value JSON-encodes as {"type":"Buffer","data":[...]}. Every
// route that returns a role, goal or schedule block must go through one of
// these so the three fields leave as base64. scripts/verify-sealed-fields.ts
// checks the shapes.

type WithLabel = { label: Uint8Array };
type WithTitle = { title: Uint8Array };

export function serializeRole<T extends WithLabel>(r: T) {
  return { ...r, label: toWire(r.label) };
}

export function serializeGoal<T extends WithTitle>(g: T) {
  return { ...g, title: toWire(g.title) };
}

export function serializeBlock<T extends WithTitle & { role?: WithLabel | null }>(b: T) {
  return {
    ...b,
    title: toWire(b.title),
    ...(b.role ? { role: serializeRole(b.role) } : {}),
  };
}
