"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NotificationBell } from "../../../components/notifications/NotificationBell";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
};

const NOTIFICATION_CATALOG = [
  {
    type: "MORNING_FOCUS",
    title: "Morning Focus",
    sample: "You have 2 priorities scheduled for today.",
    desc: "Gentle morning reminder of scheduled Big Rocks before reactive fires start.",
    target: "/schedule",
  },
  {
    type: "SUNDAY_RESET",
    title: "Sunday Reset",
    sample: "Take 5 minutes to wrap up last week and clear your plate for tomorrow.",
    desc: "Sunday evening invitation to complete weekly review and prevent Monday gate lock.",
    target: "/weekly-review",
  },
  {
    type: "SEVEN_DAY_MILESTONE",
    title: "7-Day Milestone",
    sample: "You've used Quadrant for 7 days. You can now write your Personal Constitution.",
    desc: "Celebrates reaching 7 active days, unlocking the Personal Mission Statement.",
    target: "/mission-statement",
  },
  {
    type: "MONTHLY_CHECKIN",
    title: "Monthly Check-in",
    sample: "Your monthly summary is ready. See where your focus went this month.",
    desc: "Month-end pattern observation of role balance and presence.",
    target: "/patterns",
  },
  {
    type: "ROLE_MILESTONE",
    title: "Role Milestone",
    sample: "25 votes recorded for Craft. Great job showing up.",
    desc: "Rewards accumulated identity votes logged in annual rings.",
    target: "/goals",
  },
  {
    type: "YEAR_END_REVIEW",
    title: "Year-End Review",
    sample: "Your Year in Review is ready. See everything you built this year.",
    desc: "Opens Dec 20–31 before annual growth rings permanently seal.",
    target: "/year-review",
  },
  {
    type: "BACKUP_KEY",
    title: "Backup Key Reminder",
    sample: "Keep your account safe: don't forget to save your recovery code.",
    desc: "Ensures user has safely recorded their zero-knowledge recovery code.",
    target: "/profile",
  },
];

export default function StandaloneTestNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const triggerSeed = async (type: string) => {
    setActionStatus(`Triggering ${type}...`);
    try {
      const res = await fetch("/api/notifications/test-seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        setActionStatus(`✅ Triggered ${type}`);
        await loadNotifications();
      } else {
        setActionStatus(`❌ Error triggering ${type}`);
      }
    } catch (err) {
      setActionStatus(`❌ Error: ${err}`);
    }
    setTimeout(() => setActionStatus(null), 3000);
  };

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadNotifications();
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await loadNotifications();
  };

  const deleteNotif = async (id: string) => {
    await fetch(`/api/notifications?id=${id}`, {
      method: "DELETE",
    });
    await loadNotifications();
  };

  return (
    <div className="flex min-h-screen justify-center bg-[#FFF9F2] px-4 pb-28 pt-8 text-[#1F2937]">
      <div className="w-full max-w-[680px]">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between border-b border-[#ECE8DF] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-5 w-5 grid-cols-2 grid-rows-2 gap-[2px]">
                <span className="rounded-[2px] bg-[#F3F4F6]" />
                <span className="rounded-[2px] bg-[#F97316]" />
                <span className="rounded-[2px] bg-[#F3F4F6]" />
                <span className="rounded-[2px] bg-[#F3F4F6]" />
              </div>
              <span className="font-serif text-xl font-bold text-[#1F2937]">
                Quadrant Notifications Test Suite
              </span>
            </div>
            <p className="mt-1 text-xs text-[#6B7280]">
              Manual verification & live trigger controls
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link
              href="/login"
              className="rounded-lg border border-[#ECE8DF] bg-white px-3 py-1.5 text-xs font-medium text-[#4B5563] hover:bg-[#FAF7F2]"
            >
              Sign in
            </Link>
          </div>
        </div>

        {actionStatus && (
          <div className="mb-4 rounded-xl border border-[#F97316]/30 bg-[#FFF5EB] p-3 text-xs font-medium text-[#C2410C] animate-in fade-in">
            {actionStatus}
          </div>
        )}

        {/* Catalog triggers */}
        <section className="mb-8">
          <h2 className="mb-3 font-serif text-base font-semibold text-[#1F2937]">
            1. Trigger Notification Scenarios
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {NOTIFICATION_CATALOG.map((cat) => (
              <div
                key={cat.type}
                className="flex flex-col justify-between rounded-xl border border-[#ECE8DF] bg-white p-3.5 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1F2937]">
                      {cat.title}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-[#9CA3AF]">
                      {cat.type}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#6B7280]">{cat.desc}</p>
                  <p className="mt-2 rounded bg-[#FAF7F2] p-1.5 font-mono text-[10px] text-[#C2410C]">
                    &quot;{cat.sample}&quot;
                  </p>
                </div>
                <button
                  type="button"
                  data-testid={`manual-seed-${cat.type}`}
                  onClick={() => triggerSeed(cat.type)}
                  className="mt-3 w-full rounded-lg bg-[#FAF7F2] py-1.5 text-xs font-semibold text-[#F97316] transition-colors hover:bg-[#F97316] hover:text-white cursor-pointer"
                >
                  Trigger {cat.title}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Live inbox inspection */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-base font-semibold text-[#1F2937]">
                2. Live User Notifications Table
              </h2>
              <span className="rounded-full bg-[#FFF0E0] px-2 py-0.5 text-xs font-bold text-[#C2410C]">
                {unreadCount} unread / {notifications.length} total
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-[#F97316] hover:underline cursor-pointer"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="divide-y divide-[#ECE8DF] rounded-2xl border border-[#ECE8DF] bg-white shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#9CA3AF]">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#9CA3AF]">
                No notifications in database. Use the triggers above to test!
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start justify-between p-3.5 transition-colors ${
                    n.read ? "bg-white" : "bg-[#FFFBF7]"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1F2937]">
                        {n.title}
                      </span>
                      {!n.read && (
                        <span className="rounded bg-[#F97316]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#C2410C]">
                          NEW
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-[#9CA3AF]">
                        {new Date(n.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-[#4B5563]">{n.message}</p>
                    {n.link && (
                      <Link
                        href={n.link}
                        className="inline-block text-[11px] font-medium text-[#F97316] hover:underline"
                      >
                        Target Link: {n.link} &rarr;
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="rounded border border-[#ECE8DF] bg-[#FAF7F2] px-2 py-1 text-[11px] text-[#4B5563] hover:bg-white cursor-pointer"
                      >
                        Read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteNotif(n.id)}
                      className="rounded border border-red-100 bg-red-50/50 px-2 py-1 text-[11px] text-red-600 hover:bg-red-100 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
