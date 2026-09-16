import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { emailSchema } from "../../../../../lib/validators";
import { getSyntheticLoginChallenge } from "../../../../../lib/syntheticAuth";

/**
 * GET /api/auth/login-challenge?email=...
 *
 * Returns the (non-secret) salt and the still-encrypted wrapped key.
 * Both are useless without the user's password, so it's safe to return
 * them before authentication succeeds.
 *
 * Account Enumeration Protection:
 * For unknown or unregistered emails, returns a deterministic synthetic salt
 * and wrapped key blob, ensuring the response status (200), timing, and shape
 * remain indistinguishable from registered accounts.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email") ?? "";

  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data },
    include: {
      authKey: true,
      _count: { select: { roles: true } },
    },
  });

  if (!user || !user.authKey) {
    return NextResponse.json(getSyntheticLoginChallenge(parsed.data));
  }

  return NextResponse.json({
    saltPassword: Buffer.from(user.authKey.saltPassword).toString("base64"),
    wrappedKeyPassword: Buffer.from(user.authKey.wrappedKeyPassword).toString(
      "base64",
    ),
    isNewUser: user._count.roles === 0,
  });
}
