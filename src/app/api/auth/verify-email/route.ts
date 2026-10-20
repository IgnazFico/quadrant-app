import { NextResponse } from "next/server";
import { z } from "zod";
import { emailSchema } from "../../../../../lib/validators";
import { verifyCode } from "../../../../../lib/emailOtp";

const bodySchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

/**
 * POST /api/auth/verify-email   { email, code }
 *
 * Marks the account verified when the emailed code is right.
 * A wrong, expired or already-used code is rejected. After 5 wrong tries the
 * code is locked and a new one must be requested. Unknown email, an already
 * verified account and "no code pending" all answer the same `expired`.
 */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter the 6-digit code", code: "invalid_input" },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await verifyCode(parsed.data.email, parsed.data.code);
  } catch {
    return NextResponse.json(
      { error: "Verification is temporarily unavailable.", code: "unavailable" },
      { status: 503 },
    );
  }

  if (result.ok) return NextResponse.json({ ok: true });

  if (result.reason === "wrong_code") {
    return NextResponse.json(
      {
        error: `That code isn't right. ${result.attemptsLeft} ${result.attemptsLeft === 1 ? "try" : "tries"} left.`,
        code: "wrong_code",
        attemptsLeft: result.attemptsLeft,
      },
      { status: 400 },
    );
  }
  if (result.reason === "locked") {
    return NextResponse.json(
      {
        error: "Too many wrong codes. Ask for a new code to try again.",
        code: "locked",
      },
      { status: 400 },
    );
  }
  return NextResponse.json(
    {
      error: "That code has expired or was already used. Ask for a new one.",
      code: "expired",
    },
    { status: 400 },
  );
}
