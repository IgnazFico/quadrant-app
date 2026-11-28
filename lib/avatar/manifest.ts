/**
 * lib/avatar/manifest.ts — every avatar piece (WO-140, Card C2).
 *
 * The renderer draws these by layer inside a 100x100 circle clip; each piece is
 * one line of static SVG markup (see lib/avatar/ART-FORMAT.md). Code 0 in every
 * piece group means "none", and a face code of 0 means the silhouette: no base
 * and no face pieces. Hiding is data, not code: a shown piece lists the group
 * names or piece ids it removes from the drawing.
 */
import { type AvatarCodes } from "./types";
import baseShoulders from "./art/base-shoulders";
import baseEars from "./art/base-ears";
import face1 from "./art/face-1";
import face2 from "./art/face-2";
import face3 from "./art/face-3";
import face4 from "./art/face-4";
import eyes1 from "./art/eyes-1";
import eyes2 from "./art/eyes-2";
import eyes3 from "./art/eyes-3";
import eyes4 from "./art/eyes-4";
import brows1 from "./art/brows-1";
import brows2 from "./art/brows-2";
import brows3 from "./art/brows-3";
import nose1 from "./art/nose-1";
import nose2 from "./art/nose-2";
import nose3 from "./art/nose-3";
import mouth1 from "./art/mouth-1";
import mouth2 from "./art/mouth-2";
import mouth3 from "./art/mouth-3";
import mouth4 from "./art/mouth-4";
import hair1Back from "./art/hair-1-back";
import hair1Front from "./art/hair-1-front";
import hair2Back from "./art/hair-2-back";
import hair2Front from "./art/hair-2-front";
import hair3Back from "./art/hair-3-back";
import hair3Front from "./art/hair-3-front";
import hair4Back from "./art/hair-4-back";
import hair4Front from "./art/hair-4-front";
import hair5Back from "./art/hair-5-back";
import hair5Front from "./art/hair-5-front";
import hair6Back from "./art/hair-6-back";
import hair6Front from "./art/hair-6-front";
import hair7Back from "./art/hair-7-back";
import hair7Front from "./art/hair-7-front";
import hair8Back from "./art/hair-8-back";
import hair8Front from "./art/hair-8-front";
import hair9Back from "./art/hair-9-back";
import hair9Front from "./art/hair-9-front";
import hair10Back from "./art/hair-10-back";
import hair10Front from "./art/hair-10-front";
import cover1Back from "./art/cover-1-back";
import cover1Front from "./art/cover-1-front";
import cover2Back from "./art/cover-2-back";
import cover2Front from "./art/cover-2-front";
import cover3Back from "./art/cover-3-back";
import cover3Front from "./art/cover-3-front";
import facial1 from "./art/facial-1";
import facial2 from "./art/facial-2";
import facial3 from "./art/facial-3";
import extra1 from "./art/extra-1";
import extra2 from "./art/extra-2";
import extra3 from "./art/extra-3";
import extra4 from "./art/extra-4";
import extra5 from "./art/extra-5";

export type Piece = {
  id: string;
  group: "base" | "face" | "eyes" | "brows" | "nose" | "mouth" | "hair" | "cover" | "facial" | "extra";
  code: number;
  layer: number;
  part?: "front" | "back";
  placeholder: boolean;
  hides: string[];
  svg: string;
};

export const SKIN = [
  "#F7E3D3", "#F1CFAE", "#E8BE9C", "#D9A276", "#C98F6B",
  "#B07850", "#9A6A4E", "#7A4A2D", "#5E3B2A", "#3F2618",
];

export const HAIR_COLORS = [
  "#1F1A17", "#3B2A20", "#6B4A32", "#8C3F23",
  "#B5523B", "#C9A062", "#9A9A98", "#E6E2DA",
];

export const FABRIC_COLORS = [
  "#1E3A8A", "#D9845A", "#6E9F7A", "#D8B65A",
  "#2B2620", "#B7B2A7", "#8C3F55", "#F1EEE7",
];

export const PIECES: Piece[] = [
  { id: "base-shoulders", group: "base", code: 0, layer: 20, placeholder: false, hides: [], svg: baseShoulders },
  { id: "base-ears", group: "base", code: 0, layer: 30, placeholder: false, hides: [], svg: baseEars },
  { id: "face-1", group: "face", code: 1, layer: 40, placeholder: false, hides: [], svg: face1 },
  { id: "face-2", group: "face", code: 2, layer: 40, placeholder: false, hides: [], svg: face2 },
  { id: "face-3", group: "face", code: 3, layer: 40, placeholder: false, hides: [], svg: face3 },
  { id: "face-4", group: "face", code: 4, layer: 40, placeholder: false, hides: [], svg: face4 },
  { id: "eyes-1", group: "eyes", code: 1, layer: 60, placeholder: false, hides: [], svg: eyes1 },
  { id: "eyes-2", group: "eyes", code: 2, layer: 60, placeholder: false, hides: [], svg: eyes2 },
  { id: "eyes-3", group: "eyes", code: 3, layer: 60, placeholder: false, hides: [], svg: eyes3 },
  { id: "eyes-4", group: "eyes", code: 4, layer: 60, placeholder: false, hides: [], svg: eyes4 },
  { id: "brows-1", group: "brows", code: 1, layer: 65, placeholder: false, hides: [], svg: brows1 },
  { id: "brows-2", group: "brows", code: 2, layer: 65, placeholder: false, hides: [], svg: brows2 },
  { id: "brows-3", group: "brows", code: 3, layer: 65, placeholder: false, hides: [], svg: brows3 },
  { id: "nose-1", group: "nose", code: 1, layer: 55, placeholder: false, hides: [], svg: nose1 },
  { id: "nose-2", group: "nose", code: 2, layer: 55, placeholder: false, hides: [], svg: nose2 },
  { id: "nose-3", group: "nose", code: 3, layer: 55, placeholder: false, hides: [], svg: nose3 },
  { id: "mouth-1", group: "mouth", code: 1, layer: 50, placeholder: false, hides: [], svg: mouth1 },
  { id: "mouth-2", group: "mouth", code: 2, layer: 50, placeholder: false, hides: [], svg: mouth2 },
  { id: "mouth-3", group: "mouth", code: 3, layer: 50, placeholder: false, hides: [], svg: mouth3 },
  { id: "mouth-4", group: "mouth", code: 4, layer: 50, placeholder: false, hides: [], svg: mouth4 },
  { id: "hair-1-back", group: "hair", code: 1, layer: 10, part: "back", placeholder: false, hides: [], svg: hair1Back },
  { id: "hair-1-front", group: "hair", code: 1, layer: 70, part: "front", placeholder: false, hides: [], svg: hair1Front },
  { id: "hair-2-back", group: "hair", code: 2, layer: 10, part: "back", placeholder: false, hides: [], svg: hair2Back },
  { id: "hair-2-front", group: "hair", code: 2, layer: 70, part: "front", placeholder: false, hides: [], svg: hair2Front },
  { id: "hair-3-back", group: "hair", code: 3, layer: 10, part: "back", placeholder: false, hides: [], svg: hair3Back },
  { id: "hair-3-front", group: "hair", code: 3, layer: 70, part: "front", placeholder: false, hides: [], svg: hair3Front },
  { id: "hair-4-back", group: "hair", code: 4, layer: 10, part: "back", placeholder: false, hides: [], svg: hair4Back },
  { id: "hair-4-front", group: "hair", code: 4, layer: 70, part: "front", placeholder: false, hides: [], svg: hair4Front },
  { id: "hair-5-back", group: "hair", code: 5, layer: 10, part: "back", placeholder: false, hides: [], svg: hair5Back },
  { id: "hair-5-front", group: "hair", code: 5, layer: 70, part: "front", placeholder: false, hides: [], svg: hair5Front },
  { id: "hair-6-back", group: "hair", code: 6, layer: 10, part: "back", placeholder: false, hides: [], svg: hair6Back },
  { id: "hair-6-front", group: "hair", code: 6, layer: 70, part: "front", placeholder: false, hides: [], svg: hair6Front },
  { id: "hair-7-back", group: "hair", code: 7, layer: 10, part: "back", placeholder: false, hides: [], svg: hair7Back },
  { id: "hair-7-front", group: "hair", code: 7, layer: 70, part: "front", placeholder: false, hides: [], svg: hair7Front },
  { id: "hair-8-back", group: "hair", code: 8, layer: 10, part: "back", placeholder: false, hides: [], svg: hair8Back },
  { id: "hair-8-front", group: "hair", code: 8, layer: 70, part: "front", placeholder: false, hides: [], svg: hair8Front },
  { id: "hair-9-back", group: "hair", code: 9, layer: 10, part: "back", placeholder: false, hides: [], svg: hair9Back },
  { id: "hair-9-front", group: "hair", code: 9, layer: 70, part: "front", placeholder: false, hides: [], svg: hair9Front },
  { id: "hair-10-back", group: "hair", code: 10, layer: 10, part: "back", placeholder: false, hides: [], svg: hair10Back },
  { id: "hair-10-front", group: "hair", code: 10, layer: 70, part: "front", placeholder: false, hides: [], svg: hair10Front },
  { id: "cover-1-back", group: "cover", code: 1, layer: 15, part: "back", placeholder: false, hides: ["hair","base-ears","extra-3"], svg: cover1Back },
  { id: "cover-1-front", group: "cover", code: 1, layer: 75, part: "front", placeholder: false, hides: ["hair","base-ears","extra-3"], svg: cover1Front },
  { id: "cover-2-back", group: "cover", code: 2, layer: 15, part: "back", placeholder: false, hides: ["hair"], svg: cover2Back },
  { id: "cover-2-front", group: "cover", code: 2, layer: 75, part: "front", placeholder: false, hides: ["hair"], svg: cover2Front },
  { id: "cover-3-back", group: "cover", code: 3, layer: 15, part: "back", placeholder: false, hides: ["hair"], svg: cover3Back },
  { id: "cover-3-front", group: "cover", code: 3, layer: 75, part: "front", placeholder: false, hides: ["hair"], svg: cover3Front },
  { id: "facial-1", group: "facial", code: 1, layer: 45, placeholder: false, hides: [], svg: facial1 },
  { id: "facial-2", group: "facial", code: 2, layer: 45, placeholder: false, hides: [], svg: facial2 },
  { id: "facial-3", group: "facial", code: 3, layer: 45, placeholder: false, hides: [], svg: facial3 },
  { id: "extra-1", group: "extra", code: 1, layer: 80, placeholder: false, hides: [], svg: extra1 },
  { id: "extra-2", group: "extra", code: 2, layer: 80, placeholder: false, hides: [], svg: extra2 },
  { id: "extra-3", group: "extra", code: 3, layer: 80, placeholder: false, hides: [], svg: extra3 },
  { id: "extra-4", group: "extra", code: 4, layer: 80, placeholder: false, hides: [], svg: extra4 },
  { id: "extra-5", group: "extra", code: 5, layer: 80, placeholder: false, hides: [], svg: extra5 },
];

/** Highest code in a group, derived from the pieces themselves. */
export function maxCode(group: Piece["group"]): number {
  return PIECES.reduce((max, p) => (p.group === group && p.code > max ? p.code : max), 0);
}

/** The pieces to draw for these codes: hidden ones removed, layer ascending. */
export function piecesFor(codes: AvatarCodes): Piece[] {
  const drawn = PIECES.filter((p) =>
    p.group === "base" ? codes.face > 0 : p.code === codes[p.group],
  );
  const hidden = new Set(drawn.flatMap((p) => p.hides));
  return drawn
    .filter((p) => !hidden.has(p.group) && !hidden.has(p.id))
    .sort((a, b) => a.layer - b.layer);
}
