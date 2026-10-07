import { prisma } from "./prisma";
import { NotificationType } from "@prisma/client";
import { getReviewWindow } from "./weeklyReviewGate";
import { getMissionGateStatus } from "./missionGate";
import { isRecapWindowOpen } from "./yearRecapWindow";

const SUNDAY_RESET_MESSAGE =
  "Your week is wrapping up. Take a few minutes to look back, then plan the week ahead.";
const SUNDAY_RESET_LATE =
  "Last week is ready to close out. Look back on it, then plan this week.";

/** Returns start and end of the current local day in UTC */
function getTodayBounds(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return { start, end };
}

/**
 * Evaluates the user's state and generates pending notifications
 * without spamming or violating anti-burnout principles.
 */
export async function evaluateNotificationsForUser(userId: string, timeZone?: string | null) {
  const { start: todayStart, end: todayEnd } = getTodayBounds();

  // 1. Morning Focus: If user has scheduled priority blocks today
  const scheduledCount = await prisma.scheduleBlock.count({
    where: {
      role: { userId },
      day: { gte: todayStart, lt: todayEnd },
      OR: [{ isPriority: true }, { hour: { not: null } }],
    },
  });

  if (scheduledCount > 0) {
    const existingToday = await prisma.notification.findFirst({
      where: {
        userId,
        type: NotificationType.MORNING_FOCUS,
        createdAt: { gte: todayStart },
      },
    });

    if (!existingToday) {
      await prisma.notification.create({
        data: {
          userId,
          type: NotificationType.MORNING_FOCUS,
          title: "Morning Focus",
          message: `You have ${scheduledCount} ${
            scheduledCount === 1 ? "priority" : "priorities"
          } scheduled for today.`,
          link: "/schedule",
        },
      });
    }
  }

  // 2. Sunday Reset: the review is open. With the browser timezone that
  // starts on the user's own Sunday (offered, not yet required); otherwise,
  // or if they missed Sunday, once a past week is unresolved.
  const review = await getReviewWindow(userId, timeZone);
  if (review.week) {
    // 6 days, not 7: a Sunday-morning visit must not be blocked by last
    // Sunday's afternoon notification.
    const sixDaysAgo = new Date(Date.now() - 6 * 86_400_000);

    const existingReset = await prisma.notification.findFirst({
      where: {
        userId,
        type: NotificationType.SUNDAY_RESET,
        createdAt: { gte: sixDaysAgo },
      },
    });

    if (!existingReset) {
      await prisma.notification.create({
        data: {
          userId,
          type: NotificationType.SUNDAY_RESET,
          title: "Sunday Reset",
          message: review.required ? SUNDAY_RESET_LATE : SUNDAY_RESET_MESSAGE,
          link: "/weekly-review",
        },
      });
    }
  }

  // 3. 7-Day Milestone: When 7 active days are achieved and mission statement is unlocked
  const missionGate = await getMissionGateStatus(userId);
  if (missionGate.activeDayCount >= 7 && missionGate.required) {
    const existingMilestone = await prisma.notification.findFirst({
      where: {
        userId,
        type: NotificationType.SEVEN_DAY_MILESTONE,
      },
    });

    if (!existingMilestone) {
      await prisma.notification.create({
        data: {
          userId,
          type: NotificationType.SEVEN_DAY_MILESTONE,
          title: "7-Day Milestone",
          message: "You've used Quadrant for 7 days. You can now write your Personal Constitution.",
          link: "/mission-statement",
        },
      });
    }
  }

  // 4. Role Milestone: When a role hits 25, 50, 100, etc. finished goals this year.
  // (growthRing.votesLogged is the running count; the UI no longer calls it rings.)
  const currentYear = new Date().getFullYear();
  const rings = await prisma.growthRing.findMany({
    where: {
      role: { userId },
      year: currentYear,
      votesLogged: { gte: 25 },
    },
    include: { role: true },
  });

  for (const ring of rings) {
    const milestoneTier = Math.floor(ring.votesLogged / 25) * 25;
    const existingRoleNotice = await prisma.notification.findFirst({
      where: {
        userId,
        type: NotificationType.ROLE_MILESTONE,
        title: "Role Milestone",
        // Match the legacy wording too, so users who already got the old
        // "N votes recorded" notice are not notified a second time.
        OR: [
          { message: { contains: `Showed up ${milestoneTier} times as ${ring.role.label}` } },
          { message: { contains: `${milestoneTier} votes recorded for ${ring.role.label}` } },
        ],
      },
    });

    if (!existingRoleNotice) {
      await prisma.notification.create({
        data: {
          userId,
          type: NotificationType.ROLE_MILESTONE,
          title: "Role Milestone",
          message: `Showed up ${milestoneTier} times as ${ring.role.label} this year. That counts.`,
          link: "/goals",
        },
      });
    }
  }

  // 5. Monthly Check-in: At month transitions if user has active roles
  const now = new Date();
  const isMonthBoundary = now.getDate() >= 25 || now.getDate() <= 3;
  if (isMonthBoundary) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 25);

    const existingMonthly = await prisma.notification.findFirst({
      where: {
        userId,
        type: NotificationType.MONTHLY_CHECKIN,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    if (!existingMonthly) {
      await prisma.notification.create({
        data: {
          userId,
          type: NotificationType.MONTHLY_CHECKIN,
          title: "Monthly Check-in",
          message: "Your monthly summary is ready. See where your focus went this month.",
          link: "/patterns",
        },
      });
    }
  }

  // 6. Year-End Review
  if (isRecapWindowOpen()) {
    const thisYearStart = new Date(currentYear, 0, 1);
    const existingYearEnd = await prisma.notification.findFirst({
      where: {
        userId,
        type: NotificationType.YEAR_END_REVIEW,
        createdAt: { gte: thisYearStart },
      },
    });

    if (!existingYearEnd) {
      await prisma.notification.create({
        data: {
          userId,
          type: NotificationType.YEAR_END_REVIEW,
          title: "Year-End Review",
          message: "Your Year in Review is ready. See everything you built this year.",
          link: "/year-review",
        },
      });
    }
  }

  // 7. Backup Key Reminder: Sent 24h after registration if not yet reminded
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });

  if (user) {
    const hoursSinceCreation = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation >= 24) {
      const existingBackupNotice = await prisma.notification.findFirst({
        where: {
          userId,
          type: NotificationType.BACKUP_KEY,
        },
      });

      if (!existingBackupNotice) {
        await prisma.notification.create({
          data: {
            userId,
            type: NotificationType.BACKUP_KEY,
            title: "Backup Key Reminder",
            message: "Keep your account safe: don't forget to save your recovery code.",
            link: "/profile",
          },
        });
      }
    }
  }
}

/** Fetches user notifications and computes unread count */
export async function getUserNotifications(userId: string) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.notification.count({
      where: { userId, read: false },
    }),
  ]);

  return {
    notifications,
    unreadCount,
  };
}

/** Marks a single notification as read */
export async function markNotificationRead(userId: string, notificationId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

/** Marks all notifications for a user as read */
export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

/** Deletes a single notification */
export async function deleteNotification(userId: string, notificationId: string) {
  return prisma.notification.deleteMany({
    where: { id: notificationId, userId },
  });
}

/**
 * Manually seeds a specific notification type for testing/verification.
 */
export async function seedManualNotification(
  userId: string,
  type: NotificationType,
  customMessage?: string
) {
  const templates: Record<NotificationType, { title: string; message: string; link: string }> = {
    MORNING_FOCUS: {
      title: "Morning Focus",
      message: customMessage || "You have 2 priorities scheduled for today.",
      link: "/schedule",
    },
    SUNDAY_RESET: {
      title: "Sunday Reset",
      message:
        customMessage ||
        SUNDAY_RESET_MESSAGE,
      link: "/weekly-review",
    },
    SEVEN_DAY_MILESTONE: {
      title: "7-Day Milestone",
      message:
        customMessage ||
        "You've used Quadrant for 7 days. You can now write your Personal Constitution.",
      link: "/mission-statement",
    },
    MONTHLY_CHECKIN: {
      title: "Monthly Check-in",
      message:
        customMessage ||
        "Your monthly summary is ready. See where your focus went this month.",
      link: "/patterns",
    },
    ROLE_MILESTONE: {
      title: "Role Milestone",
      message: customMessage || "Showed up 25 times as Craft this year. That counts.",
      link: "/goals",
    },
    YEAR_END_REVIEW: {
      title: "Year-End Review",
      message:
        customMessage ||
        "Your Year in Review is ready. See everything you built this year.",
      link: "/year-review",
    },
    BACKUP_KEY: {
      title: "Backup Key Reminder",
      message:
        customMessage ||
        "Keep your account safe: don't forget to save your recovery code.",
      link: "/profile",
    },
  };

  const template = templates[type];
  return prisma.notification.create({
    data: {
      userId,
      type,
      title: template.title,
      message: template.message,
      link: template.link,
    },
  });
}
