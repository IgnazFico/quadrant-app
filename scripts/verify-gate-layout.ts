// Structural guard for the weekly-review / mission gates (no server needed).
//
// Gates must sit in route-group layouts that wrap ONLY the pages they guard,
// never in a layout shared with their redirect target. A redirect() in a
// shared layout (the old (app)/layout.tsx + x-pathname design) caused an
// endless GET /weekly-review?_rsc=... loop on a blank page.
//   npx tsx scripts/verify-gate-layout.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const app = join(process.cwd(), "src/app/(app)");
let failures = 0;
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures++;
};
// Code only: comments may explain the history and mention the old names.
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const read = (p: string) => stripComments(readFileSync(join(app, p), "utf8"));

const root = read("layout.tsx");
check("(app)/layout.tsx has no gate redirects", !/redirect\(\s*["']\/(weekly-review|mission-statement)/.test(root));
check("(app)/layout.tsx does not read x-pathname", !/x-pathname/.test(root));
check("proxy does not set x-pathname", !/x-pathname/.test(stripComments(readFileSync("src/proxy.ts", "utf8"))));

check("/mission-statement is outside the mission gate", existsSync(join(app, "mission-statement/page.tsx")));
check("mission gate layout redirects to /mission-statement", /redirect\(\s*["']\/mission-statement/.test(read("(mission)/layout.tsx")));

check("/weekly-review is inside the mission gate only", existsSync(join(app, "(mission)/weekly-review/page.tsx")));
check("review gate layout redirects to /weekly-review", /redirect\(\s*["']\/weekly-review/.test(read("(mission)/(review)/layout.tsx")));

for (const r of ["goals", "schedule", "patterns", "profile", "year-review", "onboarding/roles"]) {
  check(`/${r} is behind both gates`, existsSync(join(app, "(mission)/(review)", r, "page.tsx")));
  check(`/${r} is not also a direct (app) child`, !existsSync(join(app, r, "page.tsx")));
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
