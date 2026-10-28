"use client";

import { useEffect, useState } from "react";
import type { PatternsData } from "../components/patterns/cardContent";
import { useAuthStore } from "../store/authStore";
import { openPatterns } from "../lib/sealedFields";
import { cardMonth, shouldSplit, type PatternCardId } from "../lib/patternsSplit";
import { patternsDefaultMonth, type YearMonth } from "../lib/week";

export type PatternsState = {
  /** Data for the user's current calendar month (null while loading or on error). */
  current: PatternsData | null;
  /** Previous month, fetched only inside the early-month window. */
  previous: PatternsData | null;
  /**
   * True while Rhythm, Balance and Honesty show the previous month and
   * Presence and Style the current one (see lib/patternsSplit.ts).
   */
  split: boolean;
  /** Local day of the current month on which the split ends. */
  switchDay: number;
  currentMonth: YearMonth;
  previousMonth: YearMonth;
  loading: boolean;
  /** The data a card should render. */
  dataFor: (id: PatternCardId) => PatternsData | null;
};

async function fetchMonth(
  { year, month }: YearMonth,
  masterKey: Uint8Array | null,
): Promise<PatternsData | null> {
  try {
    // Local month + IANA timezone: the API's defaults come from the server
    // clock (UTC on Vercel), which lags UTC+ users, and the timezone decides
    // which weekday a finished goal counts on.
    const qs = new URLSearchParams({
      year: String(year),
      month: String(month),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    const res = await fetch(`/api/patterns?${qs}`);
    // WO-029: the Balance card's role names arrive sealed.
    return res.ok ? await openPatterns<PatternsData>(await res.json(), masterKey) : null;
  } catch {
    return null; // the views show "Couldn't load this right now."
  }
}

/**
 * Patterns data. One instance per page, owned by ReflectPage and shared by
 * the mobile Patterns page and the desktop Reflect view.
 *
 * Always fetches the current month. Inside the early-month window (day 1 to
 * the day before patternsDefaultMonth().switchDay) it also fetches the
 * previous month, and splits if that month has any goals. Decided once at
 * mount, so the page never flips months mid-session; there is no month
 * navigation.
 */
export function usePatterns(): PatternsState {
  const [def] = useState(() => patternsDefaultMonth());
  const masterKey = useAuthStore((s) => s.masterKey);
  const previousMonth = def.initial;
  const [result, setResult] = useState<{ current: PatternsData | null; previous: PatternsData | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [current, previous] = await Promise.all([
        fetchMonth(def.current, masterKey),
        def.fallback ? fetchMonth(def.initial, masterKey) : Promise.resolve(null),
      ]);
      if (!cancelled) setResult({ current, previous });
    })();
    return () => {
      cancelled = true;
    };
  }, [def, masterKey]);

  const current = result?.current ?? null;
  const previous = result?.previous ?? null;
  const split = !!current && shouldSplit(def.fallback, previous?.goalCount);

  return {
    current,
    previous: split ? previous : null,
    split,
    switchDay: def.switchDay,
    currentMonth: def.current,
    previousMonth,
    loading: result === null,
    dataFor: (id) => (cardMonth(id, split) === "previous" ? previous : current),
  };
}
