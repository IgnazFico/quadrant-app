"use client";

import { domainColor } from "../../lib/domainColors";
import type { ReviewData } from "../../hooks/useReview";
import type { PatternsState } from "../../hooks/usePatterns";
import { GoalRow, ReflectSheet } from "../review/WeeklyReviewPage";
import { CARD_ORDER, CARD_THEME, renderPatternCard } from "../patterns/cardContent";

/**
 * Desktop merged "Reflect" view — Weekly review + Patterns side by side,
 * matching web-prototype/app.js's pageReflect() (.reflect-layout: two
 * columns, gap 24px) rather than the mobile app's two separate routes
 * (/weekly-review full-bleed sheet, /patterns full-bleed swipe carousel).
 *
 * Mirrors the Week page's precedent (components/week/WeekPage.tsx +
 * WeekDesktopView.tsx): mobile JSX is untouched and unmerged (zero
 * regression risk), desktop gets the true prototype merge, both driven
 * by the same shared hooks (useReview/usePatterns) so there is exactly
 * one fetch of each regardless of which mobile route is open.
 */
export function ReflectDesktopView({
  review,
  patterns,
}: {
  review: ReviewData;
  patterns: PatternsState;
}) {
  return (
    <div className="mx-auto grid max-w-[1180px] grid-cols-2 items-start gap-6 px-8 py-8">
      <ReviewPanel review={review} />
      <PatternsPanel patterns={patterns} />
    </div>
  );
}

function ReviewPanel({ review }: { review: ReviewData }) {
  const {
    weekStart,
    roles,
    loading,
    error,
    masterKey,
    activeReflect,
    doneCount,
    totalCount,
    pct,
    canFinish,
    toggleCarry,
    startReflect,
    cancelReflect,
    submitReflection,
    completeReview,
  } = review;

  const weekEnd = weekStart ? new Date(weekStart.getTime() + 6 * 86400000) : null;
  const allGoals = roles.flatMap((r) => r.goals);
  const missedCount = allGoals.filter((g) => g.status !== "DONE").length;
  const reflectedCount = allGoals.filter(
    (g) => g.status !== "DONE" && g.reviewEntry,
  ).length;

  if (loading || !weekStart) {
    return (
      <section className="rounded-2xl border border-[#ECE8DF] bg-white p-5">
        <p className="text-sm text-[#9CA3AF]">Loading that week...</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#ECE8DF] bg-white p-5" aria-label="Weekly review">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            Week of {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" – "}
            {weekEnd?.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
          <h2 className="mt-1 font-serif text-xl font-semibold text-[#1F2937]">
            Weekly review
          </h2>
        </div>
        {totalCount > 0 && (
          <span className="whitespace-nowrap text-xs text-[#9CA3AF]">
            {reflectedCount} of {missedCount} reflected
          </span>
        )}
      </div>

      {!masterKey && (
        <p className="mb-3.5 rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">
          Your session key isn&apos;t available — log in again to reflect on
          missed goals.
        </p>
      )}
      {error && (
        <p className="mb-3.5 rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">
          {error}
        </p>
      )}

      {totalCount === 0 ? (
        <p className="rounded-xl border border-[#ECE8DF] bg-[#FCFBF8] px-4 py-6 text-center text-sm text-[#9CA3AF]">
          No goals were set that week.
        </p>
      ) : (
        <>
          <div className="mb-1.5 flex h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
            <div className="bg-[#F97316]" style={{ width: `${missedCount ? Math.round((reflectedCount / missedCount) * 100) : 100}%` }} />
          </div>
          <div className="mb-3 text-[11px] text-[#9CA3AF]">{doneCount} of {totalCount} done ({pct}%)</div>

          {roles.map((role) => {
            const goals = role.goals;
            if (!goals.length) return null;
            return (
              <div
                key={role.id}
                className="mb-3 border-l-[3px] pl-3.5"
                style={{ borderColor: domainColor(role.domain) }}
              >
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[13.5px] font-semibold text-[#1F2937]">
                    {role.label}
                  </span>
                  <span className="text-[11px] text-[#9CA3AF]">
                    {goals.filter((g) => g.status === "DONE").length} of {goals.length} done
                  </span>
                </div>
                {goals.map((g) => (
                  <GoalRow
                    key={g.id}
                    goal={g}
                    onToggleCarry={() => toggleCarry(role.id, g)}
                    onReflect={() => startReflect(role.id, g)}
                  />
                ))}
              </div>
            );
          })}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#ECE8DF] pt-3.5">
            <span className="min-w-[180px] flex-1 text-[12.5px] text-[#6B7280]">
              {canFinish
                ? "All missed goals reflected on — ready to close out the week."
                : "Reflect on every missed goal to finish your review."}
            </span>
            <button
              disabled={!canFinish}
              onClick={completeReview}
              className="whitespace-nowrap rounded-lg bg-[#F97316] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#EA6A0C] disabled:bg-[#F0D9C6]"
            >
              Close out the week &rarr;
            </button>
          </div>
        </>
      )}

      {activeReflect && (
        <ReflectSheet
          goal={activeReflect.goal}
          disabled={!masterKey}
          onClose={cancelReflect}
          onSubmit={submitReflection}
        />
      )}
    </section>
  );
}

function PatternsPanel({ patterns }: { patterns: PatternsState }) {
  const { data, loading } = patterns;

  if (loading) {
    return (
      <section className="rounded-2xl border border-[#ECE8DF] bg-white p-5">
        <p className="text-sm text-[#9CA3AF]">Gathering your patterns...</p>
      </section>
    );
  }
  if (!data) {
    return (
      <section className="rounded-2xl border border-[#ECE8DF] bg-white p-5">
        <p className="text-sm text-[#9CA3AF]">Couldn&apos;t load this right now.</p>
      </section>
    );
  }

  return (
    <section aria-label="Patterns">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold text-[#1F2937]">Patterns</h2>
        <span className="whitespace-nowrap text-xs text-[#9CA3AF]">
          This month &middot; updates as you go
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {CARD_ORDER.map((id) => (
          <div
            key={id}
            className={`flex min-h-[220px] flex-col gap-2.5 rounded-2xl p-5 ${
              id === "rhythm" ? "col-span-2" : ""
            }`}
            style={{ background: CARD_THEME[id] }}
          >
            {renderPatternCard(id, data)}
          </div>
        ))}
      </div>
    </section>
  );
}
