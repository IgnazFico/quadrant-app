"use client";

import { useEffect, useState } from "react";
import type { Role } from "./useWeek";

export type WeekSnapshot = {
  /** Monday of the current week (UTC midnight), as the server resolved it. */
  weekStart: Date | null;
  roles: Role[];
  loading: boolean;
};

/**
 * Read-only fetch of the CURRENT week's roles + goals (GET /api/goals).
 *
 * For surfaces that only need to show the week, like the desktop Reflect
 * page's "this week so far" rail, not edit it. Lighter than useWeek(),
 * which also loads schedule blocks and owns every mutation.
 */
export function useWeekSnapshot(): WeekSnapshot {
  const [state, setState] = useState<WeekSnapshot>({
    weekStart: null,
    roles: [],
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/goals");
        if (!res.ok) throw new Error();
        const body = await res.json();
        if (!cancelled) {
          setState({
            weekStart: new Date(body.weekStart),
            roles: body.roles ?? [],
            loading: false,
          });
        }
      } catch {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
