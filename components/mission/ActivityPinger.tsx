"use client";

import { useEffect, useRef } from "react";
import { toDateKey } from "../../lib/week";

/**
 * Logs the user's local calendar day as an activity day.
 *
 * Pings on mount, and again when the tab regains focus / visibility or the
 * local date rolls over, so a tab left open across midnight and only
 * navigated client-side still counts the new day. Each local day is sent at
 * most once per mounted layout (retried on failure).
 */
export function ActivityPinger() {
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    function ping() {
      const day = toDateKey(new Date());
      if (lastSent.current === day) return;
      lastSent.current = day;
      fetch("/api/activity/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day }),
      })
        .then((res) => {
          if (!res.ok) lastSent.current = null;
        })
        .catch(() => {
          // Non-critical — a missed ping just means this day isn't counted.
          lastSent.current = null;
        });
    }

    function onVisible() {
      if (document.visibilityState === "visible") ping();
    }

    ping();
    window.addEventListener("focus", ping);
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(onVisible, 60_000);
    return () => {
      window.removeEventListener("focus", ping);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
