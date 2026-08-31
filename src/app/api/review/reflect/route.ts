import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

const bodySchema = z.object({
  goalId: z.string().uuid(),
  reasonEncrypted: z.string().min(1), // base64 ciphertext — never plaintext here
  choice: z.enum(["CARRY", "CANCEL"]),
});

/**
 * POST /api/review/reflect
 *
 * This is the server-side half of the "no cancel or carry without a
 * reason" rule. The client already disables the buttons until the
 * textarea has text, but this endpoint independently refuses an empty
 * ciphertext too — a client-side gate alone isn't a real gate.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const goal = await prisma.goal.findUnique({
    where: { id: parsed.data.goalId },
    include: { role: true },
  });
  if (!goal || goal.role.userId !== userId) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const [updatedGoal, reviewEntry] = await prisma.$transaction([
    prisma.goal.update({ where: { id: goal.id }, data: { status: "MISSED" } }),
    prisma.reviewEntry.upsert({
      where: { goalId: goal.id },
      update: {
        reasonEncrypted: Buffer.from(parsed.data.reasonEncrypted, "base64"),
        choice: parsed.data.choice,
        resolvedAt: new Date(),
      },
      create: {
        goalId: goal.id,
        reasonEncrypted: Buffer.from(parsed.data.reasonEncrypted, "base64"),
        choice: parsed.data.choice,
      },
    }),
  ]);

  return NextResponse.json({
    goal: updatedGoal,
    reviewEntry: {
      id: reviewEntry.id,
      choice: reviewEntry.choice,
      reasonEncrypted: Buffer.from(reviewEntry.reasonEncrypted).toString(
        "base64",
      ),
    },
  });
}
