import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { emailSchema } from "../../../../../lib/validators";

/**
 * GET /api/auth/login-challenge?email=...
 *
 * Returns the (non-secret) salt and the still-encrypted wrapped key.
 * Both are useless without the user's password, so it's safe to return
 * them before authentication succeeds.
 *
 * NOTE: as written this reveals whether an email is registered (a 404 vs
 * a 200). For production, return a deterministic fake salt/blob for
 * unknown emails instead, so the response shape can't be used to enumerate
 * accounts.
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
    return NextResponse.json({ error: "No account found" }, { status: 404 });
  }

  return NextResponse.json({
    saltPassword: Buffer.from(user.authKey.saltPassword).toString("base64"),
    wrappedKeyPassword: Buffer.from(user.authKey.wrappedKeyPassword).toString(
      "base64",
    ),
    isNewUser: user._count.roles === 0,
  });
}
