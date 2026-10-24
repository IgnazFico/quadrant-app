/**
 * Server secret used to sign recovery tickets and to key-hash sign-up codes.
 *
 * Same lookup order as lib/auth.ts, so it is whatever Auth.js already uses.
 * There is deliberately NO fallback value: if no secret is configured we throw,
 * and the caller fails closed. Read it lazily (inside a function), never at
 * module load, so `next build` does not need the secret.
 */
export function getAppSecret(): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "No server secret configured (AUTH_SECRET, NEXTAUTH_SECRET or BETTER_AUTH_SECRET).",
    );
  }
  return secret;
}
