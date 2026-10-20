// Starts `next start` against the STAGING database (SIT only). Same env
// resolution and production-host guard as scripts/with-env.mjs, but spawns
// node directly (no shell), so it also works without a terminal.
//   node scripts/sit/start-staging-server.mjs [port]
import { spawn } from "node:child_process";
import { resolveEnv, hostOf, STAGING_HOST_PATTERN } from "../lib/env.mjs";

const port = process.argv[2] ?? "3300";
const env = resolveEnv("staging");
const host = hostOf(env.DATABASE_URL);
if (!STAGING_HOST_PATTERN.test(host)) throw new Error(`refusing: ${host} is not the staging host`);
console.error(`[sit-server] staging db host ${host.slice(0, 15)}... port ${port}`);
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", port], {
  stdio: "inherit",
  env: { ...process.env, ...env, QUADRANT_ENV: "staging" },
});
child.on("exit", (code) => process.exit(code ?? 1));
