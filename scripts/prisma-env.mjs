// Run a prisma CLI command against staging or prod without touching .env.
//   node scripts/prisma-env.mjs staging|prod <prisma args...>
// Staging values come from .env.staging, prod from .env (see scripts/lib/env.mjs).
// prisma.config.ts reads DIRECT_URL || DATABASE_URL after dotenv loads, and
// dotenv does not override variables that are already set, so these win.
import { spawnSync } from "node:child_process";
import { resolveEnv, hostOf } from "./lib/env.mjs";

const [target, ...args] = process.argv.slice(2);
const env = resolveEnv(target);
console.log(`[prisma-env] ${target}: ${hostOf(env.DIRECT_URL)}`);
const r = spawnSync("npx", ["prisma", ...args], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ...env, QUADRANT_ENV: target },
});
process.exit(r.status ?? 1);
