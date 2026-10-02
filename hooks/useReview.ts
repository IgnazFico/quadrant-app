"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addDays, startOfWeek } from "../lib/week";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../store/authStore";
import {
  decryptField,
  encryptField,
  fromBase64,
  toBase64,
} from "../lib/crypto";

export type Choice = "CARRY" | "CANCEL";
export type ReviewEntry = {
  id: string;
  choice: Choice;
  reasonEncrypted: string;
  reason?: string;
};
export type ReviewGoal = {
  id: string;
  title: string;
  status: "IN_PROGRESS" | "DONE" | "MISSED";
  carryForward: boolean;
  reviewEntry: ReviewEntry | null;
};
export type ReviewRole = { id: string; label: string; domain: string; goals: ReviewGoal[] };

export type ReviewData = ReturnType<typeof useReview>;

/**
 * Shared data/mutation hook for the "Reflect" surface (weekly review half).
 * Extracted from WeeklyReviewPage.tsx so the mobile page and the desktop
 * split-view (components/reflect/ReflectDesktopView.tsx) share one fetch
 * and one set of mutation functions instead of double-fetching or
 * drifting out of sync — same pattern as hooks/useWeek.ts for goals+schedule.
 */
export function useReview() {
  const router = useRouter();
  // Null means "not yet resolved" — the initial load asks the server for
  // the correct default (the OLDEST unresolved past week, matching the
  // layout's gate) instead of assuming "last week", since a user can be
  // behind on more than one week. See lib/weeklyReviewGate.ts.
  const [weekStart, setWeekStartState] = useState<Date | null>(null);
  const [fetchedWeekStart, setFetchedWeekStart] = useState<string | null>(null);
  const [roles, setRoles] = useState<ReviewRole[]>([]);
  // True while some past week still needs reflecting (server's gate check).
  // Null until the first load answers.
  const [due, setDue] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeReflect, setActiveReflect] = useState<{
    roleId: string;
    goal: ReviewGoal;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [weekOptions, setWeekOptions] = useState<{ value: string; label: string }[]>([]);
  const masterKey = useAuthStore((s) => s.masterKey);
  const masterKeyRef = useRef(masterKey);
  masterKeyRef.current = masterKey;

  function setWeekStart(d: Date) {
    setWeekStartState(d);
  }

  // Build a list of recent weeks for the dropdown selector
  useEffect(() => {
    const options: { value: string; label: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const ws = addDays(startOfWeek(), -i * 7);
      const we = addDays(ws, 6);
      options.push({
        value: ws.toISOString().slice(0, 10),
        label: `${ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${we.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      });
    }
    setWeekOptions(options);
  }, []);

  const load = useCallback(
    async (ws: Date | null) => {
      setLoading(true);
      setError(null);
      try {
        const qs = ws ? `?weekStart=${ws.toISOString().slice(0, 10)}` : "";
        const res = await fetch(`/api/review${qs}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const body = await res.json();
        // The server may have resolved a different week than requested
        // (e.g. the initial no-param load); always sync local state to
        // what was actually returned so the dropdown/arrows and the next
        // fetch-dedup key agree with the data on screen.
        const resolvedWeekStart = new Date(body.weekStart);
        setWeekStartState(resolvedWeekStart);
        setFetchedWeekStart(resolvedWeekStart.toISOString().slice(0, 10));
        setDue(Boolean(body.due));
        const withReasons: ReviewRole[] = await Promise.all(
          body.roles.map(async (r: ReviewRole) => {
            const goalsWithReasons = await Promise.all(
              r.goals.map(async (g) => {
                if (!g.reviewEntry || !masterKeyRef.current) return g;
                try {
                  const reason = await decryptField(
                    await fromBase64(g.reviewEntry.reasonEncrypted),
                    masterKeyRef.current,
                  );
                  return { ...g, reviewEntry: { ...g.reviewEntry, reason } };
                } catch {
                  return g;
                }
              }),
            );
            return { ...r, goals: goalsWithReasons };
          }),
        );
        setRoles(withReasons);
      } catch {
        setError("Couldn't load that week — try refreshing.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Initial load: no param, let the server pick the correct default week.
  useEffect(() => {
    load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subsequent loads: user explicitly changed the week (arrows/dropdown).
  useEffect(() => {
    if (!weekStart) return;
    const key = weekStart.toISOString().slice(0, 10);
    if (key === fetchedWeekStart) return;
    load(weekStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const goToPreviousWeek = () => {
    if (!weekStart) return;
    setWeekStart(addDays(weekStart, -7));
  };

  const goToNextWeek = () => {
    if (!weekStart) return;
    const next = addDays(weekStart, 7);
    if (next <= startOfWeek()) {
      setWeekStart(next);
    }
  };

  const allGoals = roles.flatMap((r) => r.goals);
  const doneCount = allGoals.filter((g) => g.status === "DONE").length;
  const totalCount = allGoals.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  const unresolvedMissed = allGoals.filter(
    (g) => g.status !== "DONE" && !g.reviewEntry,
  );
  const canFinish = totalCount > 0 && unresolvedMissed.length === 0;

  async function toggleCarry(roleId: string, goal: ReviewGoal) {
    const next = !goal.carryForward;
    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId
          ? {
              ...r,
              goals: r.goals.map((g) =>
                g.id === goal.id ? { ...g, carryForward: next } : g,
              ),
            }
          : r,
      ),
    );
    await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carryForward: next }),
    });
  }

  function startReflect(roleId: string, goal: ReviewGoal) {
    setActiveReflect({ roleId, goal });
  }

  function cancelReflect() {
    setActiveReflect(null);
  }

  async function submitReflection(reason: string, choice: Choice) {
    if (!activeReflect || !masterKey) return { ok: false as const };
    const { roleId, goal } = activeReflect;

    const reasonEncrypted = await toBase64(
      await encryptField(reason, masterKey),
    );
    const res = await fetch("/api/review/reflect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId: goal.id, reasonEncrypted, choice }),
    });
    if (!res.ok) return { ok: false as const };
    const body = await res.json();

    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId
          ? {
              ...r,
              goals: r.goals.map((g) =>
                g.id === goal.id
                  ? {
                      ...g,
                      status: "MISSED",
                      reviewEntry: {
                        id: body.reviewEntry.id,
                        choice,
                        reasonEncrypted: body.reviewEntry.reasonEncrypted,
                        reason,
                      },
                    }
                  : g,
              ),
            }
          : r,
      ),
    );
    setActiveReflect(null);
    return { ok: true as const };
  }

  async function completeReview() {
    if (!weekStart) return;
    const res = await fetch("/api/review/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart: weekStart.toISOString().slice(0, 10) }),
    });
    if (!res.ok) {
      setError(
        "Every missed goal needs a reflection before this can be completed.",
      );
      return;
    }
    const { carriedCount, nextUnreviewedWeekStart } = await res.json();
    // The server just accepted this week as complete, so it can never be the
    // next outstanding week. If it is, the gate and this page disagree about
    // what the week contains; advancing "in place" would reload the same week
    // forever. Stop and say so instead of looping.
    const doneKey = weekStart.toISOString().slice(0, 10);
    if (
      nextUnreviewedWeekStart &&
      new Date(nextUnreviewedWeekStart).toISOString().slice(0, 10) === doneKey
    ) {
      setError("This week still shows as open. Refresh the page; if it persists, let us know.");
      return;
    }
    setToast(
      `Review complete — ${carriedCount} goal${carriedCount === 1 ? "" : "s"} carried into next week`,
    );
    setTimeout(() => {
      setToast(null);
      if (nextUnreviewedWeekStart) {
        // Another past week still needs review — the layout's gate would
        // otherwise redirect straight back here the moment we navigate
        // away, since it checks ALL past weeks, not just this one. Advance
        // in place instead of leaving, avoiding the push+refresh race that
        // caused the redirect loop / blank page.
        const next = new Date(nextUnreviewedWeekStart);
        setFetchedWeekStart(null);
        setWeekStart(next);
      } else {
        router.push("/goals");
        router.refresh();
      }
    }, 1500);
  }

  return {
    weekStart,
    due,
    weekOptions,
    roles,
    loading,
    error,
    toast,
    masterKey,
    activeReflect,
    allGoals,
    doneCount,
    totalCount,
    pct,
    canFinish,
    goToPreviousWeek,
    goToNextWeek,
    setWeekStart,
    toggleCarry,
    startReflect,
    cancelReflect,
    submitReflection,
    completeReview,
  };
}
