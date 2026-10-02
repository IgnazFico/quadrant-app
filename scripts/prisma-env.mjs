// Run a prisma CLI command against staging or prod without touching .env.
// prisma.config.ts reads DIRECT_URL || DATABASE_URL after dotenv loads, and
// dotenv does not override variables that are already set, so setting them
// here wins.  Usage (from repo root): node scripts/prisma-env.mjs staging|prod <prisma args...>
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);

const [target, ...args] = process.argv.slice(2);
const pick =
  target === "staging"
    ? { DATABASE_URL: env.STAGING_DATABASE_URL, DIRECT_URL: env.STAGING_DIRECT_URL || env.STAGING_DATABASE_URL }
    : target === "prod"
      ? { DATABASE_URL: env.DATABASE_URL, DIRECT_URL: env.DIRECT_URL || env.DATABASE_URL }
      : null;
if (!pick || !pick.DATABASE_URL) throw new Error("target must be staging|prod with URLs in .env");

const host = (u) => (u.match(/@([^/:]+)/) || [])[1];
console.log(`[prisma-env] ${target}: ${host(pick.DIRECT_URL)}`);
const r = spawnSync("npx", ["prisma", ...args], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ...pick },
});
process.exit(r.status ?? 1);
