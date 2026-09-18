import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../lib/auth";

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

    // Structured server log for observability & alert monitoring
    console.log("[BETA_FEEDBACK]", {
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      userEmail: session.user.email,
      category,
      message,
      metadata: metadata || {},
    });

    return NextResponse.json({
      ok: true,
      message: "Thank you for helping shape Quadrant.",
    });
  } catch (err: any) {
    console.error("Error processing feedback:", err);
    return NextResponse.json(
      { error: "Failed to submit feedback. Please try again or email support@quadrant.me." },
      { status: 500 },
    );
  }
}
