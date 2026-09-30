"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  startOfWeek,
  startOfDay,
  addDays,
  dayKey,
  toDateKey,
} from "../lib/week";

export type GoalStatus = "IN_PROGRESS" | "DONE" | "MISSED";

export type Goal = {
  id: string;
  title: string;
  status: GoalStatus;
  carryForward: boolean;
};

export type Role = { id: string; label: string; domain: string; goals: Goal[] };

export type ScheduleBlock = {
  id: string;
  day: string; // ISO date string (YYYY-MM-DD or full ISO — always sliced to 10 chars)
  hour: number | null;
  isPriority: boolean;
  title: string;
  roleId: string;
  goalId: string | null;
  role: { id: string; label: string; domain: string };
};

type CreateBlockInput = {
  roleId: string;
  goalId: string | null;
  title: string;
  day: Date;
  hour: number | null;
  isPriority: boolean;
};

type MutationResult =
  | { ok: true; block: ScheduleBlock }
  | { ok: false; error: string };

/**
 * Shared data + mutation logic for a week of roles/goals + schedule blocks.
 *
 * Extracted from WeeklyGoalsPage.tsx and WeeklySchedulePage.tsx so both the
 * existing mobile pages and any new desktop layout consume one source of
 * truth instead of duplicating fetch/mutation logic. UI state (which role is
 * expanded, which form/sheet is open) stays in each component — this hook
 * only owns server data and the calls that mutate it.
 */
export function useWeek(initialWeekStart?: Date) {
  const [weekStart, setWeekStart] = useState(
    () => initialWeekStart ?? startOfWeek(),
  );
  const [roles, setRoles] = useState<Role[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const todayKey = toDateKey(new Date());

  const load = useCallback(async (ws: Date) => {
    setLoading(true);
    setError(null);
    try {
      const [goalsRes, weekRes] = await Promise.all([
        fetch(`/api/goals?weekStart=${dayKey(ws)}`),
        fetch(`/api/schedule/week?weekStart=${dayKey(ws)}`),
      ]);
      if (!goalsRes.ok || !weekRes.ok) throw new Error();
      const goalsBody = await goalsRes.json();
      const weekBody = await weekRes.json();
      setRoles(goalsBody.roles);
      setBlocks(weekBody.blocks);
    } catch {
      setError("Couldn't load your week — try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(weekStart);
  }, [weekStart, load]);

  const goToPreviousWeek = useCallback(
    () => setWeekStart((w) => addDays(w, -7)),
    [],
  );
  const goToNextWeek = useCallback(
    () => setWeekStart((w) => addDays(w, 7)),
    [],
  );
  const goToWeek = useCallback((d: Date) => setWeekStart(startOfWeek(d)), []);

  // ---------- Derived lookups (by day index within `days`) ----------
  const blocksForDay = useCallback(
    (dayIndex: number) => {
      const key = dayKey(days[dayIndex]);
      return blocks.filter((b) => b.day.slice(0, 10) === key);
    },
    [blocks, days],
  );
  const timedBlockFor = useCallback(
    (dayIndex: number, hour: number) => {
      const key = dayKey(days[dayIndex]);
      return (
        blocks.find(
          (b) => !b.isPriority && b.hour === hour && b.day.slice(0, 10) === key,
        ) ?? null
      );
    },
    [blocks, days],
  );
  const prioritiesFor = useCallback(
    (dayIndex: number) => {
      const key = dayKey(days[dayIndex]);
      return blocks.filter((b) => b.isPriority && b.day.slice(0, 10) === key);
    },
    [blocks, days],
  );
  // Today's non-priority agenda, sorted by hour — what the mobile "Today"
  // section on the goals page shows. Derived client-side from the week's
  // blocks instead of a separate /api/schedule (today-only) fetch.
  const todayBlocks = useMemo(
    () =>
      blocks
        .filter((b) => !b.isPriority && b.day.slice(0, 10) === todayKey)
        .sort((a, b) => (a.hour ?? 99) - (b.hour ?? 99)),
    [blocks, todayKey],
  );

  // ---------- Goal mutations ----------
  const toggleGoal = useCallback(async (goal: Goal, roleId: string) => {
    const nextStatus: GoalStatus =
      goal.status === "DONE" ? "IN_PROGRESS" : "DONE";
    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId
          ? {
              ...r,
              goals: r.goals.map((g) =>
                g.id === goal.id ? { ...g, status: nextStatus } : g,
              ),
            }
          : r,
      ),
    );
    await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
  }, []);

  /** Local-only update, e.g. on every keystroke — call commitGoalTitle to persist. */
  const editGoalTitleLocal = useCallback(
    (goalId: string, roleId: string, title: string) => {
      setRoles((prev) =>
        prev.map((r) =>
          r.id === roleId
            ? {
                ...r,
                goals: r.goals.map((g) =>
                  g.id === goalId ? { ...g, title } : g,
                ),
              }
            : r,
        ),
      );
    },
    [],
  );

  const commitGoalTitle = useCallback(async (goalId: string, title: string) => {
    await fetch(`/api/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  }, []);

  const deleteGoal = useCallback(async (goalId: string, roleId: string) => {
    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId
          ? { ...r, goals: r.goals.filter((g) => g.id !== goalId) }
          : r,
      ),
    );
    setBlocks((prev) => prev.filter((b) => b.goalId !== goalId));
    await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
  }, []);

  const addGoal = useCallback(
    async (roleId: string, title: string): Promise<Goal | null> => {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId, title, weekStart: dayKey(weekStart) }),
      });
      if (!res.ok) return null;
      const { goal } = await res.json();
      setRoles((prev) =>
        prev.map((r) =>
          r.id === roleId ? { ...r, goals: [...r.goals, goal] } : r,
        ),
      );
      return goal;
    },
    [weekStart],
  );

  // ---------- Schedule block mutations ----------
  const createBlock = useCallback(
    async (input: CreateBlockInput): Promise<MutationResult> => {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: input.roleId,
          goalId: input.goalId,
          title: input.title,
          day: dayKey(input.day),
          hour: input.isPriority ? null : input.hour,
          isPriority: input.isPriority,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return {
          ok: false,
          error: body.error ?? "Couldn't save the schedule block.",
        };
      }
      const { block } = await res.json();
      setBlocks((prev) => [...prev, block]);
      return { ok: true, block };
    },
    [],
  );

  const updateBlock = useCallback(
    async (
      id: string,
      data: { roleId?: string; goalId?: string | null; title?: string },
    ): Promise<MutationResult> => {
      const res = await fetch(`/api/schedule/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, error: body.error ?? "Couldn't save the block." };
      }
      const { block } = await res.json();
      setBlocks((prev) => prev.map((b) => (b.id === block.id ? block : b)));
      return { ok: true, block };
    },
    [],
  );

  const deleteBlock = useCallback(async (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    await fetch(`/api/schedule/${id}`, { method: "DELETE" });
  }, []);

  /** Convenience for "schedule this goal/title for today at this hour" —
   *  the one write path the mobile goals page needs, using `startOfDay()`
   *  the same way the original page did. */
  const scheduleForToday = useCallback(
    (input: Omit<CreateBlockInput, "day" | "isPriority">) =>
      createBlock({ ...input, day: startOfDay(), isPriority: false }),
    [createBlock],
  );

  return {
    weekStart,
    days,
    todayKey,
    roles,
    blocks,
    todayBlocks,
    loading,
    error,
    goToPreviousWeek,
    goToNextWeek,
    goToWeek,
    blocksForDay,
    timedBlockFor,
    prioritiesFor,
    toggleGoal,
    editGoalTitleLocal,
    commitGoalTitle,
    deleteGoal,
    addGoal,
    createBlock,
    updateBlock,
    deleteBlock,
    scheduleForToday,
    reload: () => load(weekStart),
  };
}

/** The shape `useWeek()` returns — pass this down as a `week` prop so a
 *  mobile and a desktop view of the same route can share one data owner
 *  instead of each calling useWeek() (and double-fetching / drifting out
 *  of sync with each other) themselves. */
export type WeekData = ReturnType<typeof useWeek>;
