"use client";

import { useWeek } from "../../hooks/useWeek";
import { WeeklyGoalsPage } from "../goals/WeeklyGoalsPage";
import { WeeklySchedulePage } from "../schedule/WeeklySchedulePage";
import { WeekDesktopView } from "./WeekDesktopView";

/**
 * Shared entry point for both the /goals and /schedule routes.
 *
 * Owns a single `useWeek()` call so the mobile view and the desktop
 * split-view never double-fetch or drift out of sync — both render off the
 * same in-memory roles/goals/blocks and the same mutation functions.
 *
 * Below the md breakpoint, renders whichever mobile page matches the
 * current route (`variant`) — pixel-identical to the pre-existing mobile
 * experience. At md and above, renders one merged desktop split-view
 * regardless of which of the two routes was visited, since on desktop
 * "the week" is one screen (goals + schedule side by side), matching the
 * web-prototype's Week page.
 */
export function WeekPage({ variant }: { variant: "goals" | "schedule" }) {
  const week = useWeek();

  return (
    <>
      <div className="md:hidden">
        {variant === "goals" ? (
          <WeeklyGoalsPage week={week} />
        ) : (
          <WeeklySchedulePage week={week} />
        )}
      </div>
      <div className="hidden md:block">
        <WeekDesktopView week={week} />
      </div>
    </>
  );
}
