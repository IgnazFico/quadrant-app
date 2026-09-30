"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useYearReview } from "../../hooks/useYearReview";
import { isRecapWindowOpen } from "../../lib/yearRecapWindow";
import { buildScenes } from "./ceremony/scenes";
import { YearCeremony } from "./ceremony/YearCeremony";
import { CeremonyAtmosphere } from "./ceremony/CeremonyAtmosphere";
import "./ceremony/ceremony.css";

/**
 * /year-review: the year-end ceremony.
 *
 * Replaces the earlier chapter page and the YearReviewModal prototype.
 * A real route (linkable from the YEAR_END_REVIEW notification, the
 * RecapPrompt and Profile), full-screen, one idea per screen.
 *
 * Year: ?year=YYYY, otherwise the current year during the Dec 20–31
 * recap window, otherwise last year.
 */
function defaultYear() {
  const now = new Date();
  return isRecapWindowOpen(now) ? now.getFullYear() : now.getFullYear() - 1;
}

export function YearInReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromQuery = parseInt(searchParams.get("year") ?? "", 10);
  const year = Number.isNaN(fromQuery) ? defaultYear() : fromQuery;

  const { data, loading, statementSnippet } = useYearReview(year);
  const scenes = useMemo(
    () => (data ? buildScenes(data, statementSnippet) : []),
    [data, statementSnippet],
  );

  const leave = () => {
    if (window.history.length > 1) router.back();
    else router.push("/goals");
  };

  if (loading || !data) {
    return (
      <QuietState>
        {loading ? (
          <p className="yc-quiet">Gathering your year&hellip;</p>
        ) : (
          <>
            <p className="yc-soft">Your year couldn&rsquo;t be opened just now.</p>
            <Link href="/goals" className="yc-quiet underline">
              Back to your week
            </Link>
          </>
        )}
      </QuietState>
    );
  }

  if (data.momentum.totalGoals === 0 && data.momentum.activeDays === 0) {
    return (
      <QuietState>
        <p className="yc-year-name">{year} is still unwritten.</p>
        <p className="yc-soft">Once you&rsquo;ve spent some time here, this fills in on its own.</p>
        <Link href="/goals" className="yc-quiet underline">
          Back to your week
        </Link>
      </QuietState>
    );
  }

  return (
    <YearCeremony
      key={year}
      scenes={scenes}
      onLeave={leave}
      onClosed={() => router.push("/goals")}
    />
  );
}

function QuietState({ children }: { children: React.ReactNode }) {
  return (
    <div className="yc-root">
      <CeremonyAtmosphere />
      <div className="yc-quiet-state">{children}</div>
    </div>
  );
}
