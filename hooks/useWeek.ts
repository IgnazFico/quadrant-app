"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  startOfWeek,
  startOfDay,
  addDays,
  dayKey,
  toDateKey,
} from "../lib/week";
import { ANYTIME_PER_DAY } from "../lib/scheduleRules";
import { useAuthStore } from "../store/authStore";
import { showToast } from "../store/toastStore";
import {
  LOCKED_CODE,
  LOCKED_MESSAGE,
  isUnreadable,
  openBlock,
  openRolesWithGoals,
  sealText,
} from "../lib/sealedFields";
import { GOAL_TITLE_MAX, SCHEDULE_TITLE_MAX } from "../lib/sealed";

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
  | { ok: false; error: string; code?: string; existingBlockId?: string | null };

type UpdateBlockInput = {
  roleId?: string;
  goalId?: string | null;
  title?: string;
  /** Move to this day of the visible week. */
  day?: Date;
  /** Move to this hour; null = anytime (day priority). */
  hour?: number | null;
};

function errorMessage(body: { error?: unknown }, fallback: string): string {
  return typeof body.error === "string" ? body.error : fallback;
}

/** Which week the Week pages show: the ongoing one, or the one being planned. */
export type WeekView = "this" | "next";

/**
 * Shared data + mutation logic for a week of roles/goals + schedule blocks.
 *
 * Extracted from WeeklyGoalsPage.tsx and WeeklySchedulePage.tsx so both the
 * existing mobile pages and any new desktop layout consume one source of
 * truth instead of duplicating fetch/mutation logic. UI state (which role is
 * expanded, which form/sheet is open) stays in each component — this hook
 * only owns server data and the calls that mutate it.
 *
 * Only two weeks are reachable: the current one and the next one. That is
 * Covey's Habit 3 weekly organizing: "look at the week ahead" (often on
 * Sunday) and set roles, goals and a schedule for the next seven days. There
 * is no browsing back (past weeks belong to the weekly review) or further
 * ahead. See WeekToggle.tsx.
 *
 * The choice lives in the URL (`?week=next`), so /goals and /schedule agree
 * and the Sunday review can link straight to planning. replaceState, not
 * push: switching isn't a navigation worth a Back step.
 */
export function useWeek() {
  const searchParams = useSearchParams();
  const view: WeekView = searchParams.get("week") === "next" ? "next" : "this";
  const setView = useCallback((v: WeekView) => {
    const url = new URL(window.location.href);
    if (v === "next") url.searchParams.set("week", "next");
    else url.searchParams.delete("week");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, []);
  // Recomputed per render so the page follows the calendar if it's left
  // open across midnight on Sunday; only re-fetches when the key changes.
  const thisWeekKey = dayKey(startOfWeek());
  const weekStart = useMemo(() => {
    const thisWeek = new Date(`${thisWeekKey}T00:00:00.000Z`);
    return view === "next" ? addDays(thisWeek, 7) : thisWeek;
  }, [thisWeekKey, view]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  // WO-029: goal titles, schedule titles and role labels are sealed with the
  // master key. No key in this tab means they cannot be opened or saved.
  const masterKey = useAuthStore((s) => s.masterKey);
  const keyRef = useRef(masterKey);
  const blocksRef = useRef<ScheduleBlock[]>([]);
  // Refs are written in an effect, not during render. Declared before the load
  // effect below, so on a key change the ref is current before load() reads it.
  useEffect(() => {
    keyRef.current = masterKey;
    blocksRef.current = blocks;
  }, [masterKey, blocks]);
  const [loading, setLoading] = useState(true);
  /** False until the first week has loaded; lets views keep their header
   *  (and the week toggle) on screen while switching weeks. */
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const todayKey = toDateKey(new Date());

  // Switching This week / Next week fires a second load while the first may
  // still be in flight; only the latest request may write state.
  const latestLoad = useRef(0);
  const load = useCallback(async (ws: Date) => {
    const id = ++latestLoad.current;
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
      if (id !== latestLoad.current) return;
      const key = keyRef.current;
      const [openRoles, openBlocks] = await Promise.all([
        openRolesWithGoals<Goal, Role>(goalsBody.roles, key),
        Promise.all((weekBody.blocks as ScheduleBlock[]).map((b) => openBlock(b, key))),
      ]);
      if (id !== latestLoad.current) return;
      setRoles(openRoles);
      setBlocks(openBlocks);
    } catch {
      if (id !== latestLoad.current) return;
      setError("Couldn't load your week — try refreshing.");
    } finally {
      if (id === latestLoad.current) {
        setLoading(false);
        setLoadedOnce(true);
      }
    }
  }, []);

  // Reload when the key appears or changes too (sign-in in this tab), so
  // placeholders turn into text without a manual refresh.
  useEffect(() => {
    load(weekStart);
  }, [weekStart, load, masterKey]);

  // ---------- Derived lookups (by day index within `days`) ----------
  const blocksForDay = useCallback(
    (dayIndex: number) => {
      const key = dayKey(days[dayIndex]);
      return blocks.filter((b) => b.day.slice(0, 10) === key);
    },
    [blocks, days],
  );
  /** A goal has at most one block (schedule_blocks.goalId is UNIQUE). */
  const blockForGoal = useCallback(
    (goalId: string) => blocks.find((b) => b.goalId === goalId) ?? null,
    [blocks],
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
  /** True when `dayIndex` can take another Anytime item (lib/scheduleRules.ts).
   *  Pass the block being edited/moved so it doesn't count against itself. */
  const canAddAnytime = useCallback(
    (dayIndex: number, excludeBlockId?: string | null) => {
      const key = dayKey(days[dayIndex]);
      const n = blocks.filter(
        (b) => b.isPriority && b.day.slice(0, 10) === key && b.id !== excludeBlockId,
      ).length;
      return n < ANYTIME_PER_DAY;
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

  const commitGoalTitle = useCallback(
    async (goalId: string, title: string) => {
      const text = title.trim();
      // Never write the placeholder (or an empty box) back over a real title.
      if (!text || isUnreadable(text)) {
        void load(weekStart);
        return;
      }
      const key = keyRef.current;
      if (!key) {
        showToast(LOCKED_MESSAGE);
        void load(weekStart);
        return;
      }
      if (text.length > GOAL_TITLE_MAX) {
        showToast(`Goal titles can be up to ${GOAL_TITLE_MAX} characters.`);
        void load(weekStart);
        return;
      }
      await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: await sealText(text, key) }),
      });
    },
    [load, weekStart],
  );

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
      const text = title.trim();
      const key = keyRef.current;
      if (!key) {
        showToast(LOCKED_MESSAGE);
        return null;
      }
      if (!text || isUnreadable(text)) return null;
      if (text.length > GOAL_TITLE_MAX) {
        showToast(`Goal titles can be up to ${GOAL_TITLE_MAX} characters.`);
        return null;
      }
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId,
          title: await sealText(text, key),
          weekStart: dayKey(weekStart),
        }),
      });
      if (!res.ok) return null;
      const body = await res.json();
      // The server returns the ciphertext it stored; the text is what we sent.
      const goal: Goal = { ...body.goal, title: text };
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
      const key = keyRef.current;
      if (!key) return { ok: false, error: LOCKED_MESSAGE, code: LOCKED_CODE };
      const text = input.title.trim();
      if (!text || isUnreadable(text)) {
        return { ok: false, error: "Give this block a short description." };
      }
      if (text.length > SCHEDULE_TITLE_MAX) {
        return {
          ok: false,
          error: `Schedule titles can be up to ${SCHEDULE_TITLE_MAX} characters.`,
        };
      }
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: input.roleId,
          goalId: input.goalId,
          title: await sealText(text, key),
          day: dayKey(input.day),
          hour: input.isPriority ? null : input.hour,
          isPriority: input.isPriority,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return {
          ok: false,
          error: errorMessage(body, "Couldn't save the schedule block."),
          code: typeof body.code === "string" ? body.code : undefined,
          existingBlockId: body.blockId ?? null,
        };
      }
      const body = await res.json();
      const block = await openBlock<ScheduleBlock>(body.block, key);
      setBlocks((prev) => [...prev, block]);
      return { ok: true, block };
    },
    [],
  );

  const updateBlock = useCallback(
    async (id: string, data: UpdateBlockInput): Promise<MutationResult> => {
      const { day, title, ...rest } = data;
      const key = keyRef.current;
      let sealedTitle: string | undefined;
      if (title !== undefined) {
        // Only a title change needs the key; moving a block does not.
        if (!key) return { ok: false, error: LOCKED_MESSAGE, code: LOCKED_CODE };
        const text = title.trim();
        if (!text || isUnreadable(text)) {
          return { ok: false, error: "Give this block a short description." };
        }
        if (text.length > SCHEDULE_TITLE_MAX) {
          return {
            ok: false,
            error: `Schedule titles can be up to ${SCHEDULE_TITLE_MAX} characters.`,
          };
        }
        sealedTitle = await sealText(text, key);
      }
      const res = await fetch(`/api/schedule/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rest,
          ...(sealedTitle !== undefined ? { title: sealedTitle } : {}),
          ...(day !== undefined ? { day: dayKey(day) } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return {
          ok: false,
          error: errorMessage(body, "Couldn't save the block."),
          code: typeof body.code === "string" ? body.code : undefined,
          existingBlockId: body.blockId ?? null,
        };
      }
      const body = await res.json();
      const opened = await openBlock<ScheduleBlock>(body.block, key);
      // Keep text we already hold when the request did not change it, so a
      // move in a tab without the key does not blank titles.
      const before = blocksRef.current.find((b) => b.id === opened.id);
      const block: ScheduleBlock = before
        ? {
            ...opened,
            title: title !== undefined ? title.trim() : before.title,
            role:
              data.roleId && data.roleId !== before.roleId
                ? opened.role
                : before.role,
          }
        : opened;
      setBlocks((prev) => prev.map((b) => (b.id === block.id ? block : b)));
      return { ok: true, block };
    },
    [],
  );

  /** Drag-to-reschedule: moves a block to another day of this week,
   *  keeping its time. Optimistic; rolls back if the server refuses. */
  const moveBlock = useCallback(
    async (id: string, dayIndex: number): Promise<MutationResult> => {
      const target = days[dayIndex];
      const before = blocks.find((b) => b.id === id);
      if (!before) return { ok: false, error: "That block is gone — try refreshing." };
      if (before.day.slice(0, 10) === dayKey(target)) return { ok: true, block: before };

      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, day: dayKey(target) } : b)),
      );
      const result = await updateBlock(id, { day: target });
      if (!result.ok) {
        setBlocks((prev) => prev.map((b) => (b.id === id ? before : b)));
      }
      return result;
    },
    [blocks, days, updateBlock],
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
    view,
    setView,
    days,
    todayKey,
    roles,
    blocks,
    todayBlocks,
    loading,
    loadedOnce,
    error,
    /** True when this tab has no master key: titles show placeholders and cannot be saved. */
    locked: !masterKey,
    blocksForDay,
    blockForGoal,
    timedBlockFor,
    prioritiesFor,
    canAddAnytime,
    toggleGoal,
    editGoalTitleLocal,
    commitGoalTitle,
    deleteGoal,
    addGoal,
    createBlock,
    updateBlock,
    moveBlock,
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
