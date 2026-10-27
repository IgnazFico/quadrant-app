/**
 * lib/sealedFields.ts — BROWSER half of the sealed fields (WO-029, D-066).
 *
 * goals.title, schedule_blocks.title and roles.label are sealed here with the
 * master key before they leave the tab, and opened here after they arrive.
 * The server half (size bounds, base64, serializers) is lib/sealed.ts, which
 * must never import libsodium. This file must never be imported by an API
 * route or a server component (same rule as lib/crypto.ts).
 *
 * Rows that cannot be opened (a row written before this change, a wrong key,
 * or a tab with no key) never throw: they show a fixed placeholder, and the
 * placeholder is never written back to the server (see isUnreadable).
 */

import { decryptField, encryptField, fromBase64, toBase64 } from "./crypto";
import { domainLabel } from "./domains";

/** Shown instead of a goal or schedule title that cannot be opened. */
export const UNREADABLE_TITLE = "Can't open this entry";

/** Same wording the reflection form uses; shown when a write needs the key and the tab has none. */
export const LOCKED_MESSAGE =
  "Your session key isn't available in this tab, so this can't be saved. Sign in again to unlock your entries.";
export const LOCKED_CODE = "KEY_MISSING";

export function isUnreadable(text: string): boolean {
  return text === UNREADABLE_TITLE;
}

/** Seals `text` for the wire: base64 of nonce + XSalsa20-Poly1305 ciphertext. */
export async function sealText(text: string, masterKey: Uint8Array): Promise<string> {
  return toBase64(await encryptField(text, masterKey));
}

/** Opens a sealed field, or returns null (no key, wrong key, or not ciphertext). */
export async function openText(
  sealed: string,
  masterKey: Uint8Array | null,
): Promise<string | null> {
  if (!masterKey || typeof sealed !== "string" || sealed === "") return null;
  try {
    return await decryptField(await fromBase64(sealed), masterKey);
  } catch {
    return null;
  }
}

type Key = Uint8Array | null;

/** A goal (or anything with a sealed `title`) with the title opened. */
export async function openTitle<T extends { title: string }>(item: T, key: Key): Promise<T> {
  return { ...item, title: (await openText(item.title, key)) ?? UNREADABLE_TITLE };
}

/** A role (or role summary) with the label opened; falls back to its domain name. */
export async function openLabel<T extends { label: string; domain: string }>(
  item: T,
  key: Key,
): Promise<T> {
  return { ...item, label: (await openText(item.label, key)) ?? domainLabel(item.domain) };
}

/** A schedule block with its own title and its role's label opened. */
export async function openBlock<
  T extends { title: string; role: { label: string; domain: string } },
>(block: T, key: Key): Promise<T> {
  const [withTitle, role] = await Promise.all([openTitle(block, key), openLabel(block.role, key)]);
  return { ...withTitle, role };
}

/** Roles that carry their goals (GET /api/goals, GET /api/review). */
export async function openRolesWithGoals<
  G extends { title: string },
  R extends { label: string; domain: string; goals: G[] },
>(roles: R[], key: Key): Promise<R[]> {
  return Promise.all(
    roles.map(async (r) => {
      const [role, goals] = await Promise.all([
        openLabel(r, key),
        Promise.all(r.goals.map((g) => openTitle(g, key))),
      ]);
      return { ...role, goals };
    }),
  );
}

/** GET /api/patterns: the Balance card names roles. */
export async function openPatterns<
  P extends { balance: { roles: { label: string; domain: string }[] } },
>(data: P, key: Key): Promise<P> {
  const roles = await Promise.all(data.balance.roles.map((r) => openLabel(r, key)));
  return { ...data, balance: { ...data.balance, roles } };
}

/** GET /api/year-review: role names and the first finished goal. */
export async function openYearReview<
  Y extends {
    momentum: { firstCompleted: { title: string; date: string } | null };
    rings: { label: string; domain: string }[];
  },
>(data: Y, key: Key): Promise<Y> {
  const [rings, firstCompleted] = await Promise.all([
    Promise.all(data.rings.map((r) => openLabel(r, key))),
    data.momentum.firstCompleted
      ? openTitle(data.momentum.firstCompleted, key)
      : Promise.resolve(null),
  ]);
  return { ...data, rings, momentum: { ...data.momentum, firstCompleted } };
}
