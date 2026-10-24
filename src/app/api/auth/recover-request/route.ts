import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { emailSchema } from "../../../../../lib/validators";
import { generateRecoveryVerificationToken } from "../../../../../lib/recoveryToken";
import { isMailConfigured, sendMail } from "../../../../../lib/mail";
import { checkRateLimit } from "../../../../../lib/rateLimit";

/**
 * POST /api/auth/recover-request
 *
 * Starts the recovery proof-of-control step: emails a 6-digit code and returns
 * a signed 15-minute ticket. The ticket does NOT contain the code
 * (lib/recoveryToken.ts); /api/auth/recover needs both.
 *
 * The response never contains the code in production. `devCode` exists only
 * when NODE_ENV is not "production" AND no mail is configured, so it cannot be
 * switched on by an environment variable in a deployed environment.
 *
 * Mail not configured in production: no ticket is issued for anyone, and
 * /api/auth/recover then behaves as REQUIRE_RECOVERY_TOKEN decides (unchanged).
 *
 * Anti-enumeration: unknown and known emails get the same response shape.
 */
export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = emailSchema.safeParse(json.email);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const email = parsed.data;

    // Stops mail-bombing one address. Same answer whether or not it exists.
    const limit = await checkRateLimit(`recover-request:${email.toLowerCase()}`, {
      intervalMs: 10 * 60 * 1000,
      maxRequests: 3,
    });
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.reset) } },
      );
    }

    const mailOn = isMailConfigured();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    if (!mailOn) {
      const dev =
        process.env.NODE_ENV !== "production" && user
          ? generateRecoveryVerificationToken(email, user.passwordHash)
          : null;
      return NextResponse.json({
        ok: true,
        ...(dev ? { token: dev.token, devCode: dev.code } : {}),
      });
    }

    if (!user) {
      // Looks like a real ticket, can never be completed (nobody gets a code).
      const fake = generateRecoveryVerificationToken(email, "no-such-account");
      return NextResponse.json({ ok: true, token: fake.token });
    }

    const { token, code } = generateRecoveryVerificationToken(
      email,
      user.passwordHash,
    );
    const sent = await sendMail({
      to: email,
      subject: "Your Quadrant Account Recovery Verification Code",
      text: `Your recovery verification code is: ${code}. This code expires in 15 minutes.`,
    });
    if (!sent.ok) {
      // The user would be asked for a code that never arrives. Say so.
      return NextResponse.json(
        {
          error: "We couldn't send the verification email. Please try again.",
          code: "send_failed",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, token });
  } catch (err) {
    console.error("Error handling recover-request:", (err as Error)?.name);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
