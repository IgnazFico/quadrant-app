"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
};

function getNotificationIcon(type: string) {
  switch (type) {
    case "MORNING_FOCUS":
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        </span>
      );
    case "SUNDAY_RESET":
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-orange-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </span>
      );
    case "SEVEN_DAY_MILESTONE":
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </span>
      );
    case "ROLE_MILESTONE":
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-50 text-purple-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="12" cy="12" r="1" />
          </svg>
        </span>
      );
    case "MONTHLY_CHECKIN":
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" />
          </svg>
        </span>
      );
    case "YEAR_END_REVIEW":
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </span>
      );
    case "BACKUP_KEY":
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </span>
      );
    default:
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-stone-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </span>
      );
  }
}

function formatRelativeTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [seedingType, setSeedingType] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh periodically every 90 seconds
    const interval = setInterval(fetchNotifications, 90000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleManualSeed = async (type: string) => {
    try {
      setSeedingType(type);
      const res = await fetch("/api/notifications/test-seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        await fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to seed notification:", err);
    } finally {
      setSeedingType(null);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        data-testid="notification-bell-btn"
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-full p-2 text-[#4B5563] transition-colors hover:bg-[#F3EFEA] hover:text-[#1F2937] focus:outline-hidden"
        aria-label="Notifications"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F97316] px-1 font-mono text-[10px] font-bold text-white shadow-xs animate-in zoom-in"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {open && (
        <div
          data-testid="notification-dropdown"
          className="absolute right-0 z-50 mt-2 w-84 sm:w-96 rounded-2xl border border-[#ECE8DF] bg-white p-3 shadow-xl shadow-black/5 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#ECE8DF]/80 pb-2.5 px-1">
            <div className="flex items-center gap-2">
              <span className="font-serif text-sm font-semibold text-[#1F2937]">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#FFF0E0] px-2 py-0.5 text-[11px] font-medium text-[#C2410C]">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                data-testid="mark-all-read-btn"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-[#F97316] hover:text-[#C2410C] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#ECE8DF]/50 py-1">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8A857B]">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8A857B]">
                All caught up. No notifications yet.
              </div>
            ) : (
              notifications.map((item) => {
                const CardContent = (
                  <div
                    data-testid={`notification-item-${item.id}`}
                    onClick={() => {
                      if (!item.read) handleMarkAsRead(item.id);
                    }}
                    className={`group flex items-start gap-3 rounded-xl p-2.5 transition-colors cursor-pointer ${
                      item.read
                        ? "opacity-75 hover:bg-[#FAF7F2]"
                        : "bg-[#FFFBF7] hover:bg-[#FFF5EB]"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {getNotificationIcon(item.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs font-semibold ${
                            item.read ? "text-[#4B5563]" : "text-[#1F2937]"
                          }`}
                        >
                          {item.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-[#9CA3AF]">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B7280]">
                        {item.message}
                      </p>
                    </div>
                    {!item.read && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F97316]" />
                    )}
                  </div>
                );

                return item.link ? (
                  <Link
                    key={item.id}
                    href={item.link}
                    onClick={() => setOpen(false)}
                    className="block"
                  >
                    {CardContent}
                  </Link>
                ) : (
                  <div key={item.id}>{CardContent}</div>
                );
              })
            )}
          </div>

          {/* Developer / Manual Verification Bar */}
          <div className="mt-2 border-t border-[#ECE8DF]/80 pt-2 px-1">
            <details className="group">
              <summary className="cursor-pointer text-[10px] font-mono font-medium text-[#8A857B] hover:text-[#1F2937]">
                ⚡ Manual Test Generator
              </summary>
              <div className="mt-2 flex flex-wrap gap-1.5 pb-1">
                {[
                  { type: "MORNING_FOCUS", label: "Morning Focus" },
                  { type: "SUNDAY_RESET", label: "Sunday Reset" },
                  { type: "SEVEN_DAY_MILESTONE", label: "7-Day Milestone" },
                  { type: "ROLE_MILESTONE", label: "Role Milestone" },
                  { type: "MONTHLY_CHECKIN", label: "Monthly Check-in" },
                  { type: "YEAR_END_REVIEW", label: "Year-End Review" },
                  { type: "BACKUP_KEY", label: "Backup Key" },
                ].map((btn) => (
                  <button
                    key={btn.type}
                    type="button"
                    data-testid={`test-trigger-${btn.type}`}
                    disabled={seedingType === btn.type}
                    onClick={() => handleManualSeed(btn.type)}
                    className="rounded-md border border-[#ECE8DF] bg-[#FAF7F2] px-2 py-1 text-[10px] font-medium text-[#4B5563] hover:border-[#F97316]/50 hover:bg-[#FFF5EB] hover:text-[#C2410C] transition-all disabled:opacity-50"
                  >
                    +{btn.label}
                  </button>
                ))}
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
