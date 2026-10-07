"use client";

import { useSyncExternalStore } from "react";
import type { PatternsState } from "../../hooks/usePatterns";
import type { YearMonth } from "../../lib/week";

export function monthName({ year, month }: YearMonth, opts: { withYear?: boolean } = {}) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    ...(opts.withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

/** "Monday, Oct 12": the day the current month takes over. */
function switchDate({ year, month }: YearMonth, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Explains the early-month split: Rhythm, Balance and Honesty still show the
 * previous month, Presence and Style are already the current one. Renders
 * nothing outside the split.
 *
 * One plain headline ("Some cards are still showing September.") plus one
 * reason line, in a tinted callout so it reads as a notice, not a caption.
 *   - "panel" (desktop Reflect): orange callout above the grid, with a legend
 *     mapping each month to its cards.
 *   - "card" (mobile carousel): compact callout on the first card. Every card
 *     also carries a month pill (renderPatternCard showMonth), so the legend
 *     is left out to keep the first card from overflowing short screens.
 *
 * Dismissable (×). Remembered per month in localStorage, so it returns at the
 * next month's split. The per-card month pills stay regardless.
 */
export function SplitNote({
  patterns,
  tone = "panel",
}: {
  patterns: PatternsState;
  tone?: "panel" | "card";
}) {
  const { split, previousMonth, currentMonth, switchDay } = patterns;
  const key = dismissKey(currentMonth);
  const dismissed = useSyncExternalStore(
    subscribeDismiss,
    () => readDismissed(key),
    () => false,
  );
  if (!split || dismissed) return null;
  const prev = monthName(previousMonth);
  const cur = monthName(currentMonth);
  const headline = `Some cards are still showing ${prev}.`;
  const reason = `Rhythm, Balance and Honesty count whole weeks, so they move to ${cur} on ${switchDate(currentMonth, switchDay)}.`;
  const close = <DismissButton onClick={() => dismiss(key)} />;

  if (tone === "card") {
    return (
      <div role="note" className="flex gap-2.5 rounded-xl bg-white/75 py-2.5 pl-3.5 pr-1.5 shadow-sm ring-1 ring-black/5">
        <CalendarIcon className="mt-px h-4 w-4 shrink-0 text-[#C2410C]" />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold leading-snug text-[#1F2937]">{headline}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-[#4B5563]">{reason}</p>
        </div>
        {close}
      </div>
    );
  }

  return (
    <div role="note" className="flex gap-3 rounded-xl border border-[#FED7AA] bg-[#FFF7ED] py-3.5 pl-4 pr-2">
      <CalendarIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#C2410C]" />
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-semibold leading-snug text-[#1F2937]">{headline}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-[#4B5563]">{reason}</p>
        <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-[#6B7280]">
          <span className="inline-flex items-center gap-2">
            <MonthPill>{prev}</MonthPill>
            Rhythm &middot; Balance &middot; Honesty
          </span>
          <span className="inline-flex items-center gap-2">
            <MonthPill>{cur}</MonthPill>
            Presence &middot; Style
          </span>
        </div>
      </div>
      {close}
    </div>
  );
}

/*
 * Dismissal is remembered per split window (keyed by the month taking over),
 * so closing it in October hides it until November's split. localStorage, not
 * the DB: it's a UI hint, nothing to sync. Both mounted views (mobile and
 * desktop) read the same key and hear the same event, so they hide together.
 */
const DISMISS_EVENT = "quadrant:split-note-dismissed";
/** Fallback when localStorage is blocked (e.g. some private modes): hides for this page session. */
const dismissedInMemory = new Set<string>();

function dismissKey({ year, month }: YearMonth) {
  return `quadrant.splitNote.dismissed.${year}-${String(month).padStart(2, "0")}`;
}

function readDismissed(key: string) {
  if (dismissedInMemory.has(key)) return true;
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function dismiss(key: string) {
  dismissedInMemory.add(key);
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* storage blocked: the in-memory set still hides it until reload */
  }
  window.dispatchEvent(new Event(DISMISS_EVENT));
}

function subscribeDismiss(onChange: () => void) {
  window.addEventListener(DISMISS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(DISMISS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function DismissButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Dismiss this note"
      title="Got it"
      className="-mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-black/5 hover:text-[#4B5563] focus-visible:outline-2 focus-visible:outline-[#F97316]"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

function MonthPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#FED7AA] bg-white px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#C2410C]">
      {children}
    </span>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}
