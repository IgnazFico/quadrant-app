// Run any command with the env of a target database.
//   node scripts/with-env.mjs staging next dev -H 0.0.0.0
//   node scripts/with-env.mjs staging npx prisma migrate status
//   node scripts/with-env.mjs prod    npx prisma migrate deploy
// Values set here win over .env: Next.js and dotenv never override variables
// that already exist in process.env.
import { spawn } from "node:child_process";
import { resolveEnv, hostOf } from "./lib/env.mjs";

const [target, ...cmd] = process.argv.slice(2);
if (!cmd.length) {
  console.error("usage: node scripts/with-env.mjs staging|prod <command...>");
  process.exit(2);
}
const env = resolveEnv(target);
console.error(`[with-env] ${target}: ${hostOf(env.DATABASE_URL)}  ->  ${cmd.join(" ")}`);

// A shell is needed to resolve npx/next .cmd shims on Windows; quote args so
// ones with spaces or quotes survive the join.
const q = (a) => (/^[\w@%+=:,./\\-]+$/.test(a) ? a : `"${a.replace(/(["\\])/g, "\\$1")}"`);
const child = spawn(cmd.map(q).join(" "), {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ...env, QUADRANT_ENV: target },
});
child.on("exit", (code, signal) => process.exit(signal ? 1 : code ?? 1));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
