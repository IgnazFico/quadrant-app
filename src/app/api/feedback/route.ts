import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../lib/auth";
import { sendMail } from "../../../../lib/mail";

const feedbackSchema = z.object({
  category: z.enum(["idea", "friction", "bug"]),
  message: z
    .string()
    .min(3, "Please enter at least 3 characters")
    .max(2000, "Feedback must be under 2000 characters"),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required to submit feedback" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }

    const { category, message, metadata } = parsed.data;

    // WO-052 (D-111 C): feedback goes to the team by email. Text and sender email are never logged (D-085).
    // Metadata is client-controlled: keep only a short pathname.
    const path = typeof metadata?.pathname === "string" ? metadata.pathname.slice(0, 200) : "";
    const to = process.env.FEEDBACK_TO_EMAIL;
    const sent = to
      ? await sendMail({
          to,
          subject: `[Quadrant feedback] ${category}`,
          text: `Category: ${category}\nPage: ${path || "-"}\nUser ID: ${session.user.id}\n\n${message}`,
        })
      : { ok: false as const };
    if (!sent.ok) {
      return NextResponse.json(
        { error: "We couldn't send your feedback. Your text is still here, please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Thank you for helping shape Quadrant.",
    });
  } catch (err: any) {
    // Name only: an error object could carry the request text.
    console.error("Error processing feedback:", err?.name);
    return NextResponse.json(
      { error: "Failed to submit feedback. Please try again." },
      { status: 500 },
    );
  }
}
