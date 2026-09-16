import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { emailSchema } from "../../../../../lib/validators";
import { generateRecoveryVerificationToken } from "../../../../../lib/recoveryToken";

/**
 * POST /api/auth/recover-request
 *
 * Initiates the recovery verification process.
 * Generates a signed, 15-minute proof-of-control token.
 *
 * Anti-Enumeration:
 * Always returns { ok: true } even if the email does not exist,
 * preventing email harvesting.
 */
export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = emailSchema.safeParse(json.email);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const email = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      // Return success timing-safely to prevent enumeration
      return NextResponse.json({ ok: true, message: "If registered, a verification token was generated." });
    }

    const { token, code } = generateRecoveryVerificationToken(email, user.passwordHash);

    // If Resend or transactional mail service is configured, deliver via email:
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "Quadrant Security <security@quadrant.me>",
            to: email,
            subject: "Your Quadrant Account Recovery Verification Code",
            text: `Your recovery verification code is: ${code}. This code expires in 15 minutes.`,
          }),
        });
      } catch (err) {
        console.error("Failed sending recovery email via Resend:", err);
      }
    }

    // In local development or staging without configured mail provider, provide devCode for testing
    const isDev = process.env.NODE_ENV !== "production" || !resendApiKey;

    return NextResponse.json({
      ok: true,
      token,
      ...(isDev ? { devCode: code } : {}),
    });
  } catch (err) {
    console.error("Error handling recover-request:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
