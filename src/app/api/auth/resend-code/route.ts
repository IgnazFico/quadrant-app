import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { emailSchema } from "../../../../../lib/validators";
import { isMailConfigured } from "../../../../../lib/mail";
import { OTP, issueCode } from "../../../../../lib/emailOtp";

const bodySchema = z.object({ email: emailSchema });

/**
 * POST /api/auth/resend-code   { email }
 *
 * Sends a new code to an account that is still unverified. A new code replaces
 * the old one. Limits: one send per 60 s and 5 per hour per account.
 *
 * Unknown email or an already verified account get the same `{ ok: true }`
 * as a real send, so this cannot be used to list accounts. Only an account
 * that is genuinely waiting for a code can see the cooldown (429).
 */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (!isMailConfigured()) {
    return NextResponse.json(
      { error: "Sending email is temporarily unavailable.", code: "mail_unavailable" },
      { status: 503 },
    );
  }

  const generic = { ok: true, retryAfter: Math.ceil(OTP.cooldownMs / 1000) };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!user || user.emailVerifiedAt) return NextResponse.json(generic);

  let issued;
  try {
    issued = await issueCode({ id: user.id, email: user.email });
  } catch {
    return NextResponse.json(
      { error: "Sending email is temporarily unavailable.", code: "mail_unavailable" },
      { status: 503 },
    );
  }

  if (issued.ok) return NextResponse.json({ ok: true, retryAfter: issued.retryAfter });

  if (issued.reason === "cooldown" || issued.reason === "cap") {
    return NextResponse.json(
      {
        error:
          issued.reason === "cooldown"
            ? `Please wait ${issued.retryAfter} seconds before asking for another code.`
            : "Too many codes requested. Please try again later.",
        code: issued.reason,
        retryAfter: issued.retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(issued.retryAfter) } },
    );
  }
  return NextResponse.json(
    { error: "We couldn't send the verification email. Please try again.", code: "send_failed" },
    { status: issued.reason === "not_configured" ? 503 : 502 },
  );
}
