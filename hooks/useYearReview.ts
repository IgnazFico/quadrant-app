"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { decryptField, fromBase64 } from "../lib/crypto";

/**
 * One role's year. GROWTH-RING-REDESIGN: data shape used by the ceremony's
 * constellation visuals. `months` is goals finished in each month (a count of
 * showing up, never a rate) and `peak` is this role's own busiest month, which
 * stars are sized against.
 */
export type CeremonyRing = {
  roleId: string;
  label: string;
  domain: string;
  months: number[];
  peak: number;
  votesLogged: number;
  sealed: boolean;
  newThisYear: boolean;
};

/** Mirrors the return value of lib/yearReview.ts (dates arrive as ISO strings). */
export type YearReview = {
  year: number;
  momentum: {
    totalGoals: number;
    completedGoals: number;
    activeDays: number;
    weeksPlanned: number;
    busiestMonth: string | null;
    firstCompleted: { title: string; date: string } | null;
  };
  integrity: {
    reflectedCount: number;
    carriedCount: number;
    cancelledCount: number;
  };
  identity: { title: string | null; domainCounts: Record<string, number> };
  rings: CeremonyRing[];
  missionStatement: {
    signedName: string;
    signedAt: string;
    contentEncrypted: string;
  } | null;
};

/**
 * Fetches one year's review for the ceremony at /year-review and decrypts
 * the mission statement snippet client-side (zero-knowledge: the server
 * only ever holds ciphertext).
 */
export function useYearReview(year: number) {
  const [data, setData] = useState<YearReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [statementSnippet, setStatementSnippet] = useState<string | null>(null);
  const masterKey = useAuthStore((s) => s.masterKey);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/year-review?year=${year}`);
      if (cancelled) return;
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const body: YearReview = await res.json();

      let snippet: string | null = null;
      if (body.missionStatement && masterKey) {
        try {
          const full = await decryptField(
            await fromBase64(body.missionStatement.contentEncrypted),
            masterKey,
          );
          snippet = full.length > 220 ? full.slice(0, 220).trim() + "\u2026" : full;
        } catch {
          snippet = null;
        }
      }
      if (cancelled) return;
      setData(body);
      setStatementSnippet(snippet);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [year, masterKey]);

  return { data, loading, statementSnippet };
}
