// Single place that decides which database a local command talks to.
//
//   .env          production values (DATABASE_URL / DIRECT_URL = prod) + shared secrets
//   .env.staging  staging overrides (DATABASE_URL / DIRECT_URL, or STAGING_* names)
//
// loadEnv("staging") = .env with .env.staging layered on top, DB URLs from .env.staging.
// loadEnv("prod")    = .env only.
//
// In CI there is no .env.staging: the workflow already exports staging
// DATABASE_URL / DIRECT_URL, so staging falls back to process.env.
// Either way, a staging target that resolves to the production host throws.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "dotenv";

export const PROD_HOST_PATTERN = /ep-weathered-snow-/;
export const STAGING_HOST_PATTERN = /ep-sweet-shape-/;

export const hostOf = (url) => (url && (url.match(/@([^/:?]+)/) || [])[1]) || "(none)";

function readEnvFile(root, name) {
  const p = join(root, name);
  return existsSync(p) ? parse(readFileSync(p)) : null;
}

/**
 * Resolve the full env for a target without touching process.env.
 * @param {"staging" | "prod"} target
 * @param {{ root?: string }} [opts]
 * @returns {Record<string, string>}
 */
export function resolveEnv(target, { root = process.cwd() } = {}) {
  if (target !== "staging" && target !== "prod") {
    throw new Error(`env target must be "staging" or "prod", got ${JSON.stringify(target)}`);
  }
  const base = readEnvFile(root, ".env") ?? {};

  if (target === "prod") {
    const out = { ...base };
    if (!out.DATABASE_URL) throw new Error("prod: DATABASE_URL missing from .env");
    out.DIRECT_URL ||= out.DATABASE_URL;
    return out;
  }

  const staging = readEnvFile(root, ".env.staging");
  let out;
  if (staging) {
    out = { ...base, ...staging };
    out.DATABASE_URL = staging.DATABASE_URL || staging.STAGING_DATABASE_URL;
    out.DIRECT_URL = staging.DIRECT_URL || staging.STAGING_DIRECT_URL || out.DATABASE_URL;
    if (!out.DATABASE_URL) {
      throw new Error(".env.staging: set DATABASE_URL (or STAGING_DATABASE_URL)");
    }
  } else if (process.env.CI) {
    out = { ...base };
    out.DATABASE_URL = process.env.DATABASE_URL;
    out.DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!out.DATABASE_URL) throw new Error("CI: DATABASE_URL is not set");
  } else {
    throw new Error("staging: .env.staging not found in " + root);
  }
  // Never let a stale STAGING_* from .env leak through alongside the real values.
  delete out.STAGING_DATABASE_URL;
  delete out.STAGING_DIRECT_URL;

  for (const k of ["DATABASE_URL", "DIRECT_URL"]) {
    if (PROD_HOST_PATTERN.test(out[k])) {
      throw new Error(`refusing: staging ${k} points at the production host (${hostOf(out[k])})`);
    }
  }
  return out;
}

/**
 * Resolve a target and write it into process.env (overriding what is there).
 * Call before anything imports lib/prisma, which reads DATABASE_URL at import time.
 */
export function loadEnv(target, opts) {
  const env = resolveEnv(target, opts);
  for (const [k, v] of Object.entries(env)) if (v !== undefined) process.env[k] = v;
  if (!opts?.quiet) console.error(`[env] ${target}: ${hostOf(env.DATABASE_URL)}`);
  return env;
}
