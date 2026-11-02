"use client";

import { useEffect, useState } from "react";
import type { Role } from "./useWeek";
import { useAuthStore } from "../store/authStore";
import { openRolesWithGoals } from "../lib/sealedFields";

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

  const masterKey = useAuthStore((s) => s.masterKey);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/goals");
        if (!res.ok) throw new Error();
        const body = await res.json();
        // WO-029: role labels and goal titles arrive sealed.
        const roles = await openRolesWithGoals<Role["goals"][number], Role>(
          body.roles ?? [],
          masterKey,
        );
        if (!cancelled) {
          setState({
            weekStart: new Date(body.weekStart),
            roles,
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
  }, [masterKey]);

  return state;
}
