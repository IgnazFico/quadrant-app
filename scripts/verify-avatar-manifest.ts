// WO-140 Card C2: the avatar manifest and the 54 placeholder art files
// (lib/avatar/manifest.ts, lib/avatar/art/*.ts), no database, no network.
//
//   npx tsx scripts/verify-avatar-manifest.ts            (placeholders allowed)
//   npx tsx scripts/verify-avatar-manifest.ts --release  (fails while any placeholder remains)
//
// Covers: 54 unique pieces; every art file exists, is non-empty, is exactly one
// `export default "...";` line and matches the manifest string; per-group code
// ranges equal CODE_RANGES (and the swatch arrays match skin/hairColor/fabric);
// every code 1..max has a piece; hides entries resolve; piecesFor draws nothing
// for blank codes, sorts by layer and applies hides generically; SR-6: the art
// text is static markup only, proven by an injection test per forbidden pattern.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FABRIC_COLORS,
  HAIR_COLORS,
  PIECES,
  SKIN,
  maxCode,
  piecesFor,
  type Piece,
} from "../lib/avatar/manifest";
import { CODE_RANGES, type AvatarCodes } from "../lib/avatar/types";

const ART_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "avatar", "art");
const GROUPS: Piece["group"][] = [
  "base", "face", "eyes", "brows", "nose", "mouth",
  "hair", "cover", "facial", "extra",
];
const CODE_GROUPS = GROUPS.filter((g) => g !== "base"); // groups with a CODE_RANGES entry

// SR-6: art files hold static markup only. Every entry is a substring or a
// regex; an injection test below proves each one fires.
const FORBIDDEN: [string, RegExp][] = [
  ["<script", /<script/i],
  ["on* attribute", /\son[a-z]+\s*=/i],
  ["href", /href/i],
  ["url(", /url\(/i],
  ["http", /http/i],
  ["<image", /<image/i],
  ["<foreignObject", /<foreignobject/i],
  ["@import", /@import/i],
  ["<style", /<style/i],
  ["javascript:", /javascript:/i],
  ["data:", /data:/i],
];
// Exactly one line: `export default "<markup>";` — no double quotes or
// backslashes inside the markup, nothing before or after.
const FILE_FORMAT = /^export default "([^"\\]*)";\r?\n?$/;

/** Violations in one art file's text: format, then every forbidden pattern. */
export function checkArtText(text: string): string[] {
  const out: string[] = [];
  if (!FILE_FORMAT.test(text)) out.push("format: not one `export default \"...\";` line");
  for (const [name, re] of FORBIDDEN) if (re.test(text)) out.push(`forbidden: ${name}`);
  return out;
}

let checks = 0;
let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  checks++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
};

const codes = (over: Partial<AvatarCodes> = {}): AvatarCodes => ({
  face: 0, skin: 0, eyes: 0, brows: 0, nose: 0, mouth: 0,
  hair: 0, hairColor: 0, cover: 0, fabric: 0, facial: 0, extra: 0, ...over,
});
const maxAll = (): AvatarCodes =>
  Object.fromEntries(
    CODE_GROUPS.map((g) => [g, CODE_RANGES[g as keyof typeof CODE_RANGES]]),
  ) as AvatarCodes;

function main() {
  // ---- the roster ----
  check("exactly 54 pieces", PIECES.length === 54, `got ${PIECES.length}`);
  const ids = new Set(PIECES.map((p) => p.id));
  check("piece ids unique", ids.size === PIECES.length, `${ids.size} unique`);
  const EXPECT_LAYER: Record<string, number> = {
    "base-shoulders": 20, "base-ears": 30, face: 40, facial: 45, mouth: 50,
    nose: 55, eyes: 60, brows: 65, extra: 80,
  };
  const wantLayer = (p: Piece) =>
    EXPECT_LAYER[p.id] ?? EXPECT_LAYER[p.group] ??
    (p.group === "hair" ? (p.part === "back" ? 10 : 70) : p.group === "cover" ? (p.part === "back" ? 15 : 75) : -1);
  const badLayer = PIECES.filter((p) => p.layer !== wantLayer(p));
  check("every piece sits on its layer", badLayer.length === 0, badLayer.map((p) => p.id).join(","));

  // ---- art files ----
  const missing: string[] = [];
  const empty: string[] = [];
  const wrongFormat: string[] = [];
  const mismatch: string[] = [];
  const violations: string[] = [];
  let filesRead = 0;
  for (const p of PIECES) {
    const file = join(ART_DIR, `${p.id}.ts`);
    if (!existsSync(file)) { missing.push(p.id); continue; }
    const text = readFileSync(file, "utf8");
    filesRead++;
    if (text.trim() === "") { empty.push(p.id); continue; }
    const v = checkArtText(text);
    if (v.length) violations.push(`${p.id}: ${v.join("; ")}`);
    const m = FILE_FORMAT.exec(text);
    if (!m) { wrongFormat.push(p.id); continue; }
    if (m[1] !== p.svg) mismatch.push(p.id);
  }
  check("every art file exists", missing.length === 0, missing.join(","));
  check("no empty art files", empty.length === 0, empty.join(","));
  check("every art file is one export default line", wrongFormat.length === 0, wrongFormat.join(","));
  check("art file markup equals the manifest string", mismatch.length === 0, mismatch.join(","));
  check("0 art files with SR-6 violations", violations.length === 0, violations.join(" | "));

  // ---- code ranges ----
  for (const g of CODE_GROUPS) {
    const want = CODE_RANGES[g as keyof typeof CODE_RANGES];
    check(`maxCode(${g}) === ${want}`, maxCode(g as Piece["group"]) === want, `got ${maxCode(g as Piece["group"])}`);
  }
  check("SKIN has 10 swatches", SKIN.length === CODE_RANGES.skin + 1, `${SKIN.length}`);
  check("HAIR_COLORS has 8 swatches", HAIR_COLORS.length === CODE_RANGES.hairColor + 1, `${HAIR_COLORS.length}`);
  check("FABRIC_COLORS has 8 swatches", FABRIC_COLORS.length === CODE_RANGES.fabric + 1, `${FABRIC_COLORS.length}`);

  const gaps: string[] = [];
  for (const g of CODE_GROUPS) {
    for (let c = 1; c <= CODE_RANGES[g as keyof typeof CODE_RANGES]; c++) {
      if (!PIECES.some((p) => p.group === g && p.code === c)) gaps.push(`${g}:${c}`);
    }
  }
  check("every code 1..max has a piece", gaps.length === 0, gaps.join(","));
  check("base pieces are code 0", PIECES.filter((p) => p.group === "base").every((p) => p.code === 0));

  // ---- hides ----
  const hideBad: string[] = [];
  for (const p of PIECES) {
    for (const h of p.hides) {
      if (!GROUPS.includes(h as Piece["group"]) && !ids.has(h)) hideBad.push(`${p.id}->${h}`);
    }
  }
  check("hides entries resolve to a group or a piece id", hideBad.length === 0, hideBad.join(","));

  // ---- piecesFor ----
  check("piecesFor(blank) is empty", piecesFor(codes()).length === 0);

  const sorted = (list: Piece[]) => list.every((p, i) => i === 0 || list[i - 1].layer <= p.layer);
  const hidden = (list: Piece[]) => {
    const kill = new Set<string>();
    for (const p of list) for (const h of p.hides) kill.add(h);
    return list.filter((p) => kill.has(p.group) || kill.has(p.id));
  };

  const hijab = piecesFor(codes({ ...maxAll(), cover: 1, extra: 3 }));
  check("hijab list is layer-sorted", hijab.length > 0 && sorted(hijab), `${hijab.length} pieces`);
  check("hijab draws its own front and back", hijab.some((p) => p.id === "cover-1-front") && hijab.some((p) => p.id === "cover-1-back"));
  check("hijab removes hair", !hijab.some((p) => p.group === "hair"));
  check("hijab removes base-ears", !hijab.some((p) => p.id === "base-ears"));
  check("hijab removes extra-3", !hijab.some((p) => p.id === "extra-3"));
  check("hijab keeps the face", hijab.some((p) => p.id === "face-4"));
  const hijabGlasses = piecesFor(codes({ ...maxAll(), cover: 1, extra: 1 }));
  check("hijab keeps glasses", hijabGlasses.some((p) => p.id === "extra-1"));
  check("hijab leaves no hidden piece in the list", hidden(hijab).length === 0, hidden(hijab).map((p) => p.id).join(","));

  const all = piecesFor(maxAll());
  check("piecesFor(all-max) is layer-sorted", all.length > 0 && sorted(all), `${all.length} pieces`);
  check("piecesFor(all-max) leaves no hidden piece", hidden(all).length === 0, hidden(all).map((p) => p.id).join(","));
  check("bald codes draw no hair, no cover", piecesFor(codes({ face: 1, hair: 0, cover: 0 })).every((p) => p.group !== "hair" && p.group !== "cover"));

  // ---- SR-6 injection test: one assertion per forbidden pattern ----
  const good = PIECES[0].svg;
  check("clean markup has no violations", checkArtText(`export default "${good}";`).length === 0);
  const LITERAL: Record<string, string> = {
    "<script": "<script>",
    "on* attribute": ` onload="x"`,
    href: " href=\"#\"",
    "url(": "url(#a)",
    http: "http://x",
    "<image": "<image/>",
    "<foreignObject": "<foreignObject>",
    "@import": "@import x",
    "<style": "<style>",
    "javascript:": "javascript:alert(1)",
    "data:": "data:text/html",
  };
  for (const [name] of FORBIDDEN) {
    check(`SR-6 flags ${name}`, checkArtText(`export default "${good}${LITERAL[name]}";`).length > 0);
  }
  check("SR-6 flags a broken one-line format", checkArtText(`export default "${good}";\nexport const x = 1;`).length > 0);

  // ---- --release ----
  if (process.argv.includes("--release")) {
    const placeholders = PIECES.filter((p) => p.placeholder);
    check("no placeholders left (--release)", placeholders.length === 0, `${placeholders.length} placeholder piece(s): ${placeholders.map((p) => p.id).slice(0, 5).join(",")}${placeholders.length > 5 ? ",..." : ""}`);
  }

  if (failures) {
    console.error(`\n${failures} of ${checks} check(s) failed (${filesRead} art files read)`);
    process.exit(1);
  }
  console.log(`\nAll ${checks} checks passed`);
}

main();
