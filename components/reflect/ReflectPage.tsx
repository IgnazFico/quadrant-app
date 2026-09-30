"use client";

import { useReview } from "../../hooks/useReview";
import { usePatterns } from "../../hooks/usePatterns";
import { WeeklyReviewPage } from "../review/WeeklyReviewPage";
import { PatternsPage } from "../patterns/PatternsPage";
import { ReflectDesktopView } from "./ReflectDesktopView";

/**
 * Shared entry point for both the /weekly-review and /patterns routes.
 *
 * Owns single useReview()/usePatterns() calls so the mobile pages and the
 * desktop merged view never double-fetch or drift out of sync — same
 * precedent as components/week/WeekPage.tsx for the Week (goals+schedule)
 * pair.
 *
 * Below md, renders whichever mobile page matches the current route
 * (`variant`) — pixel-identical to the pre-existing mobile experience
 * (full-bleed review sheet, or full-bleed swipe-carousel patterns). At md
 * and above, renders one merged desktop view (review + patterns side by
 * side) regardless of which of the two routes was visited, matching
 * web-prototype/app.js's pageReflect() ("Reflect" = review + patterns).
 */
export function ReflectPage({ variant }: { variant: "review" | "patterns" }) {
  const review = useReview();
  const patterns = usePatterns();

  return (
    <>
      <div className="md:hidden">
        {variant === "review" ? (
          <WeeklyReviewPage review={review} />
        ) : (
          <PatternsPage patterns={patterns} />
        )}
      </div>
      <div className="hidden md:block">
        <ReflectDesktopView review={review} patterns={patterns} />
      </div>
    </>
  );
}
