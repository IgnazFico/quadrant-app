"use client";

import Link from "next/link";
import { useState } from "react";
import { domainColor } from "../../lib/domainColors";
import { addDays, startOfWeek } from "../../lib/week";
import type { ReviewData, ReviewGoal, ReviewRole } from "../../hooks/useReview";
import type { PatternsState } from "../../hooks/usePatterns";
import type { WeekSnapshot } from "../../hooks/useWeekSnapshot";
import type { Role } from "../../hooks/useWeek";
import { GoalRow, ReflectSheet } from "../review/WeeklyReviewPage";
import { CARD_ORDER, CARD_THEME, renderPatternCard } from "../patterns/cardContent";

/**
 * Desktop "Reflect": a page header, then a review rail on the left and the
 * patterns grid on the right.
 *
 * Layout. The old 50/50 split left one column mostly empty whenever the
 * week had few goals. The review is a list, so it gets a fixed-width
 * sticky rail like Week's goals column. Patterns are cards, so they take
 * the remaining width as a responsive grid:
 *   - below xl: rail on top, patterns below
 *   - xl+: rail 360px (380px at 2xl) | patterns
 *   - patterns: as many >=290px columns as fit, Rhythm spanning 2. That's
 *     3 columns from ~1440px, so the 5 cards fill two even rows.
 * Cards size to their content (no fixed min-height); grid rows stretch so
 * the cards in a row match.
 *
 * The review rail has two states, driven by `review.due` (the layout gate's
 * own check, returned by GET /api/review):
 *   - due: a past week has unresolved goals, so the real review renders
 *     (reflect on missed goals, close out the week)
 *   - not due (most of the week): "This week so far". It shows a read-only
 *     preview of the current week's goals, when the review opens, and last
 *     week's closed review as a summary with an expandable look-back.
 *     Nothing here is editable; the week is edited on Week.
 *
 * Mobile (/weekly-review, /patterns) is untouched; see ReflectPage.tsx.
 */
export function ReflectDesktopView({
  review,
  patterns,
  thisWeek,
}: {
  review: ReviewData;
  patterns: PatternsState;
  thisWeek: WeekSnapshot;
}) {
  const goals = thisWeek.roles.flatMap((r) => r.goals);
  const done = goals.filter((g) => g.status === "DONE").length;
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-[1600px] px-6 pb-20 pt-[34px] lg:px-8 2xl:px-10">
      <header className="mb-[26px] flex flex-wrap items-end justify-between gap-6 border-b border-[#ECE8DF] pb-[22px]">
        <div>
          <div className="inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
            <b className="rounded border border-[#FED7AA] bg-[#FFF7ED] px-1.5 py-0.5 text-[#C2410C]">B-01</b>
            <span>{monthLabel}</span>
          </div>
          <h1 className="my-3 font-serif text-[40px] font-semibold leading-[1.1] tracking-[-0.015em] text-[#1F2937]">
            Reflect
          </h1>
          <p className="max-w-[580px] text-[15px] text-[#6B7280]">
            What happened, and what it&apos;s teaching you. The review opens each
            Monday for the week that just ended. Patterns update as you go.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Stat value={thisWeek.loading ? "–" : `${done}/${goals.length}`} label="Done this week" />
          <Stat
            value={patterns.data ? String(patterns.data.presence.activeDaysCount) : "–"}
            label="Days present"
          />
          <Stat
            value={patterns.data ? String(patterns.data.honesty.reflectedCount) : "–"}
            label="Reflections"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-[84px]">
          {review.due ? (
            <ReviewPanel review={review} />
          ) : (
            <BetweenReviewsPanel review={review} thisWeek={thisWeek} />
          )}
        </div>
        <PatternsPanel patterns={patterns} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bits

/** Week keys are UTC midnight; format in UTC so the label never slips a day. */
function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-[110px] rounded-xl border border-[#ECE8DF] bg-white px-4 py-2.5">
      <div className="font-serif text-[26px] font-semibold leading-[1.15] text-[#1F2937]">{value}</div>
      <div className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[#9CA3AF]">{label}</div>
    </div>
  );
}

function RailShell({
  eyebrow,
  aside,
  children,
}: {
  eyebrow: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#ECE8DF] bg-white p-5" aria-label="Weekly review">
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
            {eyebrow}
          </div>
          <h2 className="mt-1 font-serif text-xl font-semibold text-[#1F2937]">Weekly review</h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Bar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
      <div style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Due: the real review (same behaviour as before, in the narrower rail)

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

  if (loading || !weekStart) {
    return (
      <RailShell eyebrow="Loading">
        <p className="text-sm text-[#9CA3AF]">Loading that week...</p>
      </RailShell>
    );
  }

  const allGoals = roles.flatMap((r) => r.goals);
  const missedCount = allGoals.filter((g) => g.status !== "DONE").length;
  const reflectedCount = allGoals.filter((g) => g.status !== "DONE" && g.reviewEntry).length;

  return (
    <RailShell
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F97316]" aria-hidden="true" />
          <span className="text-[#C2410C]">Due now</span>
          <span>· {fmt(weekStart)} – {fmt(addDays(weekStart, 6))}</span>
        </span>
      }
      aside={
        totalCount > 0 ? (
          <span className="mt-0.5 whitespace-nowrap font-mono text-[11px] text-[#9CA3AF]">
            {reflectedCount}/{missedCount} reflected
          </span>
        ) : null
      }
    >
      {!masterKey && (
        <p className="mb-3.5 rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">
          Your session key isn&apos;t available — log in again to reflect on missed goals.
        </p>
      )}
      {error && (
        <p className="mb-3.5 rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">{error}</p>
      )}

      {totalCount === 0 ? (
        <p className="rounded-xl border border-[#ECE8DF] bg-[#FCFBF8] px-4 py-6 text-center text-sm text-[#9CA3AF]">
          No goals were set that week.
        </p>
      ) : (
        <>
          <div className="mb-1.5">
            <Bar value={reflectedCount} total={missedCount} color="#F97316" />
          </div>
          <div className="mb-3.5 text-[11px] text-[#9CA3AF]">
            {doneCount} of {totalCount} done ({pct}%)
          </div>

          {roles.map((role) =>
            role.goals.length ? (
              <div key={role.id} className="mb-3 border-l-[3px] pl-3" style={{ borderColor: domainColor(role.domain) }}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13.5px] font-semibold text-[#1F2937]">{role.label}</span>
                  <span className="shrink-0 font-mono text-[11px] text-[#9CA3AF]">
                    {role.goals.filter((g) => g.status === "DONE").length}/{role.goals.length}
                  </span>
                </div>
                {role.goals.map((g) => (
                  <GoalRow
                    key={g.id}
                    goal={g}
                    onToggleCarry={() => toggleCarry(role.id, g)}
                    onReflect={() => startReflect(role.id, g)}
                  />
                ))}
              </div>
            ) : null,
          )}

          <div className="mt-3 flex flex-col gap-2.5 border-t border-[#ECE8DF] pt-3.5">
            <span className="text-[12.5px] text-[#6B7280]">
              {canFinish
                ? "Every missed goal has a reflection. Ready to close out the week."
                : "Reflect on every missed goal to finish your review."}
            </span>
            <button
              disabled={!canFinish}
              onClick={completeReview}
              className="self-start whitespace-nowrap rounded-lg bg-[#F97316] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#EA6A0C] disabled:bg-[#F0D9C6]"
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
    </RailShell>
  );
}

// ---------------------------------------------------------------------------
// Not due: this week so far + last week's closed review

function BetweenReviewsPanel({
  review,
  thisWeek,
}: {
  review: ReviewData;
  thisWeek: WeekSnapshot;
}) {
  const weekStart = thisWeek.weekStart ?? startOfWeek();
  const opensOn = addDays(weekStart, 7);
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const daysLeft = Math.max(0, Math.round((opensOn.getTime() - todayUTC) / 86400000));
  const roles = thisWeek.roles.filter((r) => r.goals.length > 0);
  const goals = roles.flatMap((r) => r.goals);
  const done = goals.filter((g) => g.status === "DONE").length;
  const open = goals.length - done;

  return (
    <RailShell
      eyebrow={`This week so far · ${fmt(weekStart)} – ${fmt(addDays(weekStart, 6))}`}
      aside={
        goals.length > 0 ? (
          <span className="mt-0.5 whitespace-nowrap font-mono text-[11px] text-[#9CA3AF]">
            {done}/{goals.length} done
          </span>
        ) : null
      }
    >
      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#FED7AA] bg-[#FFF7ED] px-3 py-2.5">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#C2410C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-px shrink-0">
          <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
        <div className="min-w-0 text-[12.5px] leading-snug">
          <b className="font-semibold text-[#C2410C]">
            Review opens{" "}
            {opensOn.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}
          </b>
          <span className="text-[#9CA3AF]">
            {" · "}
            {daysLeft === 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`}
          </span>
          <div className="mt-0.5 text-[11.5px] text-[#8A8579]">
            {open > 0
              ? "Anything still open then gets a short, honest reflection."
              : goals.length > 0
                ? "Everything's done so far."
                : "Nothing to review yet."}
          </div>
        </div>
      </div>

      {thisWeek.loading ? (
        <p className="text-sm text-[#9CA3AF]">Loading this week...</p>
      ) : goals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#D6D2C8] px-4 py-5 text-center">
          <p className="text-[13px] text-[#8A8579]">No goals set for this week yet.</p>
          <Link href="/goals" className="mt-1.5 inline-block text-[12.5px] font-semibold text-[#F97316] hover:text-[#EA6A0C]">
            Plan your week &rarr;
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-3.5">
            <Bar value={done} total={goals.length} color="#22C55E" />
          </div>
          {roles.map((role) => (
            <PreviewRole key={role.id} role={role} />
          ))}
          <Link href="/goals" className="inline-block text-[12.5px] font-semibold text-[#F97316] hover:text-[#EA6A0C]">
            Open this week &rarr;
          </Link>
        </>
      )}

      <LastWeek review={review} />
    </RailShell>
  );
}

function PreviewRole({ role }: { role: Role }) {
  const done = role.goals.filter((g) => g.status === "DONE").length;
  return (
    <div className="mb-3 border-l-[3px] pl-3" style={{ borderColor: domainColor(role.domain) }}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="truncate text-[13px] font-semibold text-[#1F2937]">{role.label}</span>
        <span className="shrink-0 font-mono text-[11px] text-[#9CA3AF]">
          {done}/{role.goals.length}
        </span>
      </div>
      <ul className="flex flex-col gap-0.5">
        {role.goals.map((g) => {
          const isDone = g.status === "DONE";
          return (
            <li key={g.id} className="flex items-center gap-2 py-0.5">
              {isDone ? (
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#22C55E]" aria-label="Done">
                  <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              ) : (
                <span className="h-4 w-4 shrink-0 rounded-full border-[1.5px] border-[#D6D2C8]" aria-label="Open" />
              )}
              <span title={g.title} className={`min-w-0 truncate text-[13px] ${isDone ? "text-[#9CA3AF]" : "text-[#1F2937]"}`}>
                {g.title}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LastWeek({ review }: { review: ReviewData }) {
  const [open, setOpen] = useState(false);
  const { weekStart, roles, loading } = review;

  if (loading || !weekStart) return null;

  const goals = roles.flatMap((r) => r.goals);
  const done = goals.filter((g) => g.status === "DONE").length;
  const carried = goals.filter((g) => g.reviewEntry?.choice === "CARRY").length;
  const letGo = goals.filter((g) => g.reviewEntry?.choice === "CANCEL").length;
  const repeating = goals.filter((g) => g.status === "DONE" && g.carryForward).length;

  return (
    <div className="mt-4 border-t border-[#ECE8DF] pt-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
          Last week · {fmt(weekStart)} – {fmt(addDays(weekStart, 6))}
        </span>
        {goals.length > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10.5px] font-medium text-[#16A34A]">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Reviewed
          </span>
        )}
      </div>

      {goals.length === 0 ? (
        <p className="mt-1.5 text-[12.5px] text-[#8A8579]">No goals were set last week.</p>
      ) : (
        <>
          <p className="mt-1.5 text-[12.5px] text-[#4B5563]">
            {done} of {goals.length} done
            {carried > 0 && <> · {carried} carried</>}
            {letGo > 0 && <> · {letGo} let go</>}
            {repeating > 0 && <> · {repeating} repeating</>}
          </p>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-[#8A8579] hover:text-[#1F2937]"
          >
            {open ? "Hide" : "Look back"}
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={open ? "rotate-180" : ""} aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {open && (
            <div className="mt-2.5 flex flex-col gap-2.5">
              {roles
                .filter((r) => r.goals.length)
                .map((r) => (
                  <LookBackRole key={r.id} role={r} />
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LookBackRole({ role }: { role: ReviewRole }) {
  return (
    <div className="border-l-[3px] pl-3" style={{ borderColor: domainColor(role.domain) }}>
      <div className="mb-1 truncate text-[12.5px] font-semibold text-[#1F2937]">{role.label}</div>
      {role.goals.map((g) => (
        <LookBackGoal key={g.id} goal={g} />
      ))}
    </div>
  );
}

function LookBackGoal({ goal }: { goal: ReviewGoal }) {
  const tag =
    goal.status === "DONE"
      ? { text: goal.carryForward ? "Done · repeating" : "Done", cls: "bg-[#E7F8ED] text-[#15803D]" }
      : goal.reviewEntry?.choice === "CARRY"
        ? { text: "Carried", cls: "bg-[#FFF7ED] text-[#C2410C]" }
        : goal.reviewEntry?.choice === "CANCEL"
          ? { text: "Let go", cls: "bg-[#F3F4F6] text-[#6B7280]" }
          : { text: "Open", cls: "bg-[#F3F4F6] text-[#6B7280]" };
  return (
    <div className="py-1">
      <div className="flex items-center gap-2">
        <span title={goal.title} className="min-w-0 flex-1 truncate text-[12.5px] text-[#4B5563]">
          {goal.title}
        </span>
        <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.04em] ${tag.cls}`}>
          {tag.text}
        </span>
      </div>
      {/* The user's own reason, decrypted client-side (as on the review page). */}
      {goal.reviewEntry?.reason && (
        <p className="mt-0.5 line-clamp-2 text-[11.5px] italic leading-snug text-[#8A8579]">
          &ldquo;{goal.reviewEntry.reason}&rdquo;
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Patterns

function PatternsPanel({ patterns }: { patterns: PatternsState }) {
  const { data, loading } = patterns;

  return (
    <section aria-label="Patterns" className="min-w-0">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold text-[#1F2937]">Patterns</h2>
        <span className="whitespace-nowrap font-mono text-[11px] text-[#9CA3AF]">
          This month · updates as you go
        </span>
      </div>

      {loading ? (
        <p className="rounded-2xl border border-[#ECE8DF] bg-white p-5 text-sm text-[#9CA3AF]">
          Gathering your patterns...
        </p>
      ) : !data ? (
        <p className="rounded-2xl border border-[#ECE8DF] bg-white p-5 text-sm text-[#9CA3AF]">
          Couldn&apos;t load this right now.
        </p>
      ) : (
        // auto-fill: as many >=290px columns as fit (2 at ~1280, 3 from
        // ~1440), Rhythm spans 2. `fill` lets each card's content use the
        // height the row gives it (see renderPatternCard).
        <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-3">
          {CARD_ORDER.map((id) => (
            <div
              key={id}
              className={`flex flex-col gap-2.5 rounded-2xl p-5 ${id === "rhythm" ? "col-span-2" : ""}`}
              style={{ background: CARD_THEME[id] }}
            >
              {renderPatternCard(id, data, { fill: true })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
