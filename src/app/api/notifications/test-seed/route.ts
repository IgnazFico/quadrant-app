import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { seedManualNotification } from "../../../../../lib/notifications";
import { NotificationType } from "@prisma/client";

const seedSchema = z.object({
  type: z.nativeEnum(NotificationType),
  message: z.string().optional(),
});

async function getUserId(): Promise<string | null> {
  const session = await auth();
  if (session?.user) {
    return (session.user as any).id as string;
  }
  if (process.env.NODE_ENV !== "production") {
    const devUser = await prisma.user.findFirst();
    if (devUser) return devUser.id;
  }
  return null;
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = seedSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid notification type", details: parsed.error },
      { status: 400 }
    );
  }

  const notification = await seedManualNotification(
    userId,
    parsed.data.type,
    parsed.data.message
  );

  return NextResponse.json({ success: true, notification });
}
