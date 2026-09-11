import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import {
  evaluateNotificationsForUser,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../../../../lib/notifications";

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

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Run calm evaluation first to detect any new milestones or schedule focus
  try {
    await evaluateNotificationsForUser(userId);
  } catch (err) {
    console.error("Failed evaluating notifications:", err);
  }

  const data = await getUserNotifications(userId);
  return NextResponse.json(data);
}

const patchSchema = z.object({
  id: z.string().optional(),
  all: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (parsed.data.all) {
    await markAllNotificationsRead(userId);
    return NextResponse.json({ success: true, markedAll: true });
  }

  if (parsed.data.id) {
    await markNotificationRead(userId, parsed.data.id);
    return NextResponse.json({ success: true, id: parsed.data.id });
  }

  return NextResponse.json({ error: "Specify id or all: true" }, { status: 400 });
}

export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing notification id" }, { status: 400 });
  }

  await deleteNotification(userId, id);
  return NextResponse.json({ success: true, deleted: id });
}
