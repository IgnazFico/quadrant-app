// WO-140 Card C1: the avatar card codec contract (lib/avatar/*), no database,
// no network.
//
//   npx tsx scripts/verify-avatar-codec.ts
//
// Covers: round trip through real sealing; decode never throws and returns the
// SR-7 reason for each bad input; validCodes rejects each broken shape;
// shuffleAvatar is uniform over every group's full range (0..max, 0 included).
import { generateMasterKey } from "../lib/crypto";
import { sealText } from "../lib/sealedFields";
import { blankAvatar, decodeCard, encodeCard, shuffleAvatar, validCodes } from "../lib/avatar/codec";
import { CODE_RANGES, NAME_MAX, type AvatarCodes } from "../lib/avatar/types";

let checks = 0;
let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  checks++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
};

const KEYS = Object.keys(CODE_RANGES) as (keyof AvatarCodes)[];

/** xorshift32: a seeded rand so the uniformity check is repeatable. */
function seededRand(seed = 2463534242) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

async function main() {
  const key = await generateMasterKey();
  const otherKey = await generateMasterKey();
  const sealJson = (v: unknown) => sealText(JSON.stringify(v), key);

  const sample: AvatarCodes = {
    face: 4, skin: 10, eyes: 4, brows: 3, nose: 3, mouth: 4,
    hair: 10, hairColor: 8, cover: 3, fabric: 8, facial: 3, extra: 5,
  };

  // ---- round trips ----
  const withName = await encodeCard({ v: 1, name: "Naz", av: sample }, key);
  const back = await decodeCard(withName, key);
  check("round trip keeps name and every code",
    back.ok && back.card.name === "Naz" && JSON.stringify(back.card.av) === JSON.stringify(sample));

  const noAv = await decodeCard(await encodeCard({ v: 1, av: null }, key), key);
  check("round trip with av:null",
    noAv.ok && noAv.card.av === null && noAv.card.v === 1 && !("name" in noAv.card));

  // ---- never-built / no key ----
  const fresh = await decodeCard(null, key);
  check("null sealed with a key decodes to a never-built card",
    fresh.ok && fresh.card.v === 1 && fresh.card.av === null);
  const noKey = await decodeCard(null, null);
  check("null sealed with no key -> no-key", !noKey.ok && noKey.reason === "no-key");
  const noKeyCipher = await decodeCard(withName, null);
  check("ciphertext with no key -> no-key", !noKeyCipher.ok && noKeyCipher.reason === "no-key");

  // ---- unreadable ----
  const wrongKey = await decodeCard(withName, otherKey);
  check("wrong key -> unreadable", !wrongKey.ok && wrongKey.reason === "unreadable");
  const notJson = await decodeCard(await sealText("not json {", key), key);
  check("non-JSON plaintext -> unreadable", !notJson.ok && notJson.reason === "unreadable");
  const arr = await decodeCard(await sealJson([1, 2, 3]), key);
  check("JSON array -> unreadable", !arr.ok && arr.reason === "unreadable");
  const nul = await decodeCard(await sealJson(null), key);
  check("JSON null -> unreadable", !nul.ok && nul.reason === "unreadable");
  const num = await decodeCard(await sealJson(7), key);
  check("JSON number -> unreadable", !num.ok && num.reason === "unreadable");
  const noV = await decodeCard(await sealJson({ av: null }), key);
  check("missing v -> unreadable", !noV.ok && noV.reason === "unreadable");

  // ---- unknown-version ----
  const v2 = await decodeCard(await sealJson({ v: 2, av: null }), key);
  check("v:2 -> unknown-version", !v2.ok && v2.reason === "unknown-version");
  const vStr = await decodeCard(await sealJson({ v: "1", av: null }), key);
  check("v as a string -> unknown-version", !vStr.ok && vStr.reason === "unknown-version");

  // ---- bad-codes ----
  const missingAv = await decodeCard(await sealJson({ v: 1 }), key);
  check("missing av -> bad-codes", !missingAv.ok && missingAv.reason === "bad-codes");
  const extraKey = await decodeCard(await sealJson({ v: 1, av: { ...sample, hat: 1 } }), key);
  check("extra av key -> bad-codes", !extraKey.ok && extraKey.reason === "bad-codes");
  const missingKey: Partial<AvatarCodes> = { ...sample };
  delete missingKey.face;
  const missingKeyRes = await decodeCard(await sealJson({ v: 1, av: missingKey }), key);
  check("missing av key -> bad-codes", !missingKeyRes.ok && missingKeyRes.reason === "bad-codes");
  const floatRes = await decodeCard(await sealJson({ v: 1, av: { ...sample, eyes: 1.5 } }), key);
  check("float code -> bad-codes", !floatRes.ok && floatRes.reason === "bad-codes");
  const rangeRes = await decodeCard(await sealJson({ v: 1, av: { ...sample, nose: 4 } }), key);
  check("out-of-range code -> bad-codes", !rangeRes.ok && rangeRes.reason === "bad-codes");
  const strRes = await decodeCard(await sealJson({ v: 1, av: { ...sample, mouth: "2" } }), key);
  check("string code -> bad-codes", !strRes.ok && strRes.reason === "bad-codes");

  // ---- name ----
  const nameNum = await decodeCard(await sealJson({ v: 1, name: 5, av: null }), key);
  check("name as a number -> bad-codes", !nameNum.ok && nameNum.reason === "bad-codes");
  const longName = await decodeCard(await sealJson({ v: 1, name: "字".repeat(NAME_MAX + 1), av: null }), key);
  check("name of 31 characters -> bad-codes", !longName.ok && longName.reason === "bad-codes");
  const emojiName = "😀".repeat(NAME_MAX);
  const emojiRes = await decodeCard(await sealJson({ v: 1, name: emojiName, av: null }), key);
  check("30 emoji count as 30 characters and are accepted",
    emojiRes.ok && emojiRes.card.name === emojiName);

  // ---- blankAvatar ----
  const blank = blankAvatar();
  check("blankAvatar is all zeros",
    KEYS.length === 12 && KEYS.every((k) => blank[k] === 0));
  check("blankAvatar passes validCodes", validCodes(blank));

  // ---- shuffleAvatar uniformity ----
  const RUNS = 20000;
  const rand = seededRand();
  const counts = Object.fromEntries(KEYS.map((k) => [k, new Array(CODE_RANGES[k] + 1).fill(0)])) as Record<
    keyof AvatarCodes,
    number[]
  >;
  let allValid = true;
  for (let i = 0; i < RUNS; i++) {
    const a = shuffleAvatar(rand);
    if (!validCodes(a)) allValid = false;
    for (const k of KEYS) counts[k][a[k]]++;
  }
  check(`${RUNS} shuffles always produce valid codes`, allValid);
  for (const k of KEYS) {
    const expected = RUNS / (CODE_RANGES[k] + 1);
    const worst = counts[k].reduce(
      (w, n) => Math.max(w, Math.abs(n - expected) / expected),
      0,
    );
    check(`shuffle is uniform over 0..${CODE_RANGES[k]} for ${k}`, worst <= 0.25, `worst=${(worst * 100).toFixed(1)}%`);
  }
  for (const k of ["cover", "facial", "extra"] as const) {
    const expected = RUNS / (CODE_RANGES[k] + 1);
    check(`shuffle includes 0 for ${k} at the uniform rate`,
      Math.abs(counts[k][0] - expected) / expected <= 0.25, `n=${counts[k][0]} expected=${expected}`);
  }

  // ---- validCodes rejects broken shapes ----
  check("validCodes rejects a missing key", !validCodes(missingKey as AvatarCodes));
  check("validCodes rejects an extra key", !validCodes({ ...sample, hat: 0 } as unknown as AvatarCodes));
  check("validCodes rejects a float", !validCodes({ ...sample, eyes: 1.5 }));
  check("validCodes rejects an out-of-range code", !validCodes({ ...sample, mouth: CODE_RANGES.mouth + 1 }));
  check("validCodes rejects a negative code", !validCodes({ ...sample, skin: -1 }));
  check("validCodes rejects a string code", !validCodes({ ...sample, hair: "3" } as unknown as AvatarCodes));

  if (failures) {
    console.error(`\n${failures} of ${checks} check(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${checks} checks passed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
