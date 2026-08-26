import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { emailSchema } from "../../../../../lib/validators";

/** GET /api/auth/recover-challenge?email=... — same idea as login-challenge, but for the recovery code path. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email") ?? "";

  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data },
    include: { authKey: true },
  });

  if (!user || !user.authKey) {
    return NextResponse.json({ error: "No account found" }, { status: 404 });
  }

  return NextResponse.json({
    saltRecovery: Buffer.from(user.authKey.saltRecovery).toString("base64"),
    wrappedKeyRecovery: Buffer.from(user.authKey.wrappedKeyRecovery).toString(
      "base64",
    ),
  });
}
