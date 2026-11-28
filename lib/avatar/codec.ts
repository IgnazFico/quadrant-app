/**
 * lib/avatar/codec.ts — BROWSER half of the avatar card (WO-140, Card C1).
 *
 * encodeCard seals the whole { v: 1, name?, av } JSON with the master key
 * before it leaves the tab (SR-1); the server never sees name or codes.
 * decodeCard opens it and NEVER throws (SR-7): every failure is a reason the
 * UI can render. Must never be imported by an API route or a server component.
 */

import { openText, sealText } from "../sealedFields";
import {
  CODE_RANGES,
  NAME_MAX,
  type AvatarCodes,
  type CardData,
  type DecodeResult,
} from "./types";

const KEYS = Object.keys(CODE_RANGES) as (keyof AvatarCodes)[];

/** Integer inside 0..max for every group, all 12 keys, no extras. */
export function validCodes(a: AvatarCodes): boolean {
  if (typeof a !== "object" || a === null || Array.isArray(a)) return false;
  if (Object.keys(a).length !== KEYS.length) return false;
  return KEYS.every((k) => {
    const v = (a as Record<string, unknown>)[k];
    return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= CODE_RANGES[k];
  });
}

export function blankAvatar(): AvatarCodes {
  return Object.fromEntries(KEYS.map((k) => [k, 0])) as AvatarCodes;
}

/** Every group uniform over its full range, 0 included (K5). */
export function shuffleAvatar(rand: () => number = Math.random): AvatarCodes {
  const out = {} as AvatarCodes;
  for (const k of KEYS) {
    out[k] = Math.min(CODE_RANGES[k], Math.floor(rand() * (CODE_RANGES[k] + 1)));
  }
  return out;
}

export async function encodeCard(card: CardData, masterKey: Uint8Array): Promise<string> {
  return sealText(JSON.stringify(card), masterKey);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export async function decodeCard(
  sealed: string | null,
  masterKey: Uint8Array | null,
): Promise<DecodeResult> {
  try {
    if (!masterKey) return { ok: false, reason: "no-key" };
    if (sealed === null || sealed === "") return { ok: true, card: { v: 1, av: null } };

    const text = await openText(sealed, masterKey);
    if (text === null) return { ok: false, reason: "unreadable" };

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return { ok: false, reason: "unreadable" };
    }
    if (!isPlainObject(raw)) return { ok: false, reason: "unreadable" };

    const { v } = raw;
    if (v === undefined) return { ok: false, reason: "unreadable" };
    if (v !== 1) return { ok: false, reason: "unknown-version" };

    const av = raw.av;
    if (av !== null && !validCodes(av as AvatarCodes)) return { ok: false, reason: "bad-codes" };

    const name = raw.name;
    // Count characters as code points so an emoji name is 1, not 2.
    if (name !== undefined && (typeof name !== "string" || [...name].length > NAME_MAX)) {
      return { ok: false, reason: "bad-codes" };
    }

    const card: CardData = { v: 1, av: av as AvatarCodes | null };
    if (name !== undefined) card.name = name as string;
    return { ok: true, card };
  } catch {
    return { ok: false, reason: "unreadable" };
  }
}
