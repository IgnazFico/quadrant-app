/**
 * lib/avatar/types.ts — the avatar card contract (WO-140, Card C1).
 *
 * One card is one sealed JSON blob: { v: 1, name?, av }. In the database it is
 * users.cardSealed (bytea); the server stores the bytes only (lib/sealed.ts).
 * Safe to import on the server: no libsodium here.
 */

export type AvatarCodes = {
  face: number; skin: number; eyes: number; brows: number; nose: number; mouth: number;
  hair: number; hairColor: number; cover: number; fabric: number; facial: number; extra: number;
};
export type CardData = { v: 1; name?: string; av: AvatarCodes | null };
export type DecodeResult =
  | { ok: true; card: CardData }
  | { ok: false; reason: "no-key" | "unreadable" | "unknown-version" | "bad-codes" };
export const NAME_MAX = 30;

/**
 * Largest allowed code per group (inclusive; 0 = none/silhouette for the
 * piece groups, a swatch index for the colour groups). A later card (C2)
 * moves these into a manifest; the codec reads this constant for now.
 */
export const CODE_RANGES = {
  face: 4, skin: 9, eyes: 4, brows: 3, nose: 3, mouth: 4,
  hair: 10, hairColor: 7, cover: 3, fabric: 7, facial: 3, extra: 5,
} as const satisfies Record<keyof AvatarCodes, number>;
