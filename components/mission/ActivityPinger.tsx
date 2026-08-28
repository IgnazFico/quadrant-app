"use client";

import { useEffect } from "react";

export function ActivityPinger() {
  useEffect(() => {
    fetch("/api/activity/ping", { method: "POST" }).catch(() => {
      // Non-critical — a missed ping just means this day isn't counted.
      // No need to surface this to the user.
    });
  }, []);

  return null;
}
