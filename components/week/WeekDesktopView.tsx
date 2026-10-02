"use client";

import { useState } from "react";
import { domainColor } from "../../lib/domainColors";
import { domainLabel } from "../../lib/domains";
import { dayKey } from "../../lib/week";
import type { WeekData, Role, Goal, ScheduleBlock } from "../../hooks/useWeek";
import {
  ANYTIME_LIMIT_MESSAGE,
  ANYTIME_LIMIT_REACHED,
  ANYTIME_PER_DAY,
} from "../../lib/scheduleRules";
import { showToast } from "../../store/toastStore";

const DAY_NAMES_LONG = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function fmtShort(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const DAY_ABBR_UTC = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Compact "Tue 9a" / "Thu" label for a goal's scheduled block. */
function scheduledLabel(b: ScheduleBlock) {
  const [y, m, d] = b.day.slice(0, 10).split("-").map(Number);
  const day = DAY_ABBR_UTC[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  if (b.hour == null) return day;
  const h12 = b.hour % 12 === 0 ? 12 : b.hour % 12;
  return `${day} ${h12}${b.hour >= 12 ? "p" : "a"}`;
}

function fmtTime(hour: number | null) {
  if (hour == null) return "Anytime";
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${period}`;
}

type ModalState = {
  id: string | null;
  roleId: string;
  goalId: string;
  title: string;
  dayIndex: number;
  hour: string; // "" = no fixed time (priority)
};

/**
 * Desktop split-view: roles/goals on the left, the 7-day board on the
 * right. The board is one column per day (not the prototype's day rows):
 * a busy day grows its own column instead of pushing every other day down,
 * and columns past COLUMN_CAP blocks collapse behind "+N more". Drag a goal's
 * grip handle onto a day to schedule it — this always creates a NEW
 * schedule block for that day (never moves an existing one), matching
 * PATCH /api/schedule/[id].
 *
 * One place per goal: a goal has at most one schedule block (DB UNIQUE on
 * schedule_blocks.goalId). Dragging a block — or the grip of a goal that's
 * already scheduled — onto another day MOVES that block (keeping its
 * time); only an unscheduled goal opens the create modal. The edit modal
 * can change day and time.
 */
export function WeekDesktopView({ week }: { week: WeekData }) {
  const {
    days,
    todayKey,
    roles,
    blocks,
    loading,
    error,
    blocksForDay,
    blockForGoal,
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
    goToPreviousWeek,
    goToNextWeek,
  } = week;

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  // Days the user has expanded past the per-column cap (see DayColumn).
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  const totalGoals = roles.reduce((a, r) => a + r.goals.length, 0);
  const doneGoals = roles.reduce(
    (a, r) => a + r.goals.filter((g) => g.status === "DONE").length,
    0,
  );
  const totalBlocks = days.reduce((a, _, i) => a + blocksForDay(i).length, 0);
  const todayIndex = days.findIndex((d) => dayKey(d) === todayKey);

  function toggleCollapse(roleId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  function toggleExpandedDay(dayIndex: number) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayIndex)) next.delete(dayIndex);
      else next.add(dayIndex);
      return next;
    });
  }

  function dayIndexOf(block: ScheduleBlock) {
    return days.findIndex((d) => dayKey(d) === block.day.slice(0, 10));
  }

  function openCreateModal(dayIndex: number, opts: { roleId?: string; goalId?: string } = {}) {
    // A goal has one place in the week: if it's already scheduled, edit that.
    const existing = opts.goalId ? blockForGoal(opts.goalId) : null;
    if (existing) {
      openEditModal(existing, Math.max(0, dayIndexOf(existing)));
      return;
    }
    const goal = opts.goalId
      ? roles.flatMap((r) => r.goals.map((g) => ({ ...g, roleId: r.id }))).find((g) => g.id === opts.goalId)
      : null;
    setModal({
      id: null,
      roleId: goal?.roleId ?? opts.roleId ?? roles[0]?.id ?? "",
      goalId: opts.goalId ?? "",
      title: "",
      dayIndex,
      hour: "",
    });
    setModalError(null);
  }

  function openEditModal(block: ScheduleBlock, dayIndex: number) {
    setModal({
      id: block.id,
      roleId: block.roleId,
      goalId: block.goalId ?? "",
      title: block.title,
      dayIndex,
      hour: block.hour != null ? String(block.hour).padStart(2, "0") + ":00" : "",
    });
    setModalError(null);
  }

  /** Anytime-limit refusals are a toast; anything else stays inline. */
  function reportSaveError(result: { error: string; code?: string }) {
    if (result.code === ANYTIME_LIMIT_REACHED) showToast(ANYTIME_LIMIT_MESSAGE);
    else setModalError(result.error);
  }

  async function saveModal() {
    if (!modal) return;
    const role = roles.find((r) => r.id === modal.roleId);
    const goal = role?.goals.find((g) => g.id === modal.goalId);
    const title = goal ? goal.title : modal.title.trim();
    if (!title) {
      setModalError("Give this block a short description, or pick one of the goals.");
      return;
    }
    const hour = modal.hour ? Number(modal.hour.split(":")[0]) : null;

    // Anytime cap (lib/scheduleRules.ts). Only checked when this save would
    // take a new Anytime slot; the server enforces the same rule.
    const editing = modal.id ? blocks.find((b) => b.id === modal.id) : null;
    const staysAnytimeInPlace =
      !!editing && editing.isPriority && dayIndexOf(editing) === modal.dayIndex;
    if (hour === null && !staysAnytimeInPlace && !canAddAnytime(modal.dayIndex, modal.id)) {
      showToast(ANYTIME_LIMIT_MESSAGE);
      return;
    }

    if (modal.id) {
      const result = await updateBlock(modal.id, {
        roleId: modal.roleId,
        goalId: goal ? goal.id : null,
        title,
        day: days[modal.dayIndex],
        hour,
      });
      if (!result.ok) {
        reportSaveError(result);
        return;
      }
    } else {
      const result = await createBlock({
        roleId: modal.roleId,
        goalId: goal ? goal.id : null,
        title,
        day: days[modal.dayIndex],
        hour,
        isPriority: hour == null,
      });
      if (!result.ok) {
        reportSaveError(result);
        return;
      }
    }
    setModal(null);
    setModalError(null);
  }

  async function deleteModalBlock() {
    if (!modal?.id) return;
    await deleteBlock(modal.id);
    setModal(null);
  }

  // ---------- Drag & drop ----------
  // Payload is "goal:<id>" (a goal's grip) or "block:<id>" (a scheduled
  // card). A scheduled goal's grip carries its block, so both paths move
  // the one existing block; only an unscheduled goal opens the modal.
  function onGoalDragStart(e: React.DragEvent, goalId: string) {
    const existing = blockForGoal(goalId);
    if (existing) {
      onBlockDragStart(e, existing.id);
      return;
    }
    e.dataTransfer.setData("text/plain", `goal:${goalId}`);
    e.dataTransfer.effectAllowed = "copyMove";
  }
  function onBlockDragStart(e: React.DragEvent, blockId: string) {
    e.dataTransfer.setData("text/plain", `block:${blockId}`);
    e.dataTransfer.effectAllowed = "move";
    setDraggingBlockId(blockId);
  }
  function onDragEnd() {
    setDraggingBlockId(null);
    setDragOverDay(null);
  }
  function onDayDragOver(e: React.DragEvent, dayIndex: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggingBlockId ? "move" : "copy";
    setDragOverDay(dayIndex);
  }
  async function onDayDrop(e: React.DragEvent, dayIndex: number) {
    e.preventDefault();
    setDragOverDay(null);
    setDraggingBlockId(null);
    const [kind, id] = e.dataTransfer.getData("text/plain").split(":");
    if (!id) return;
    setBoardError(null);
    if (kind === "block") {
      const b = blocks.find((x) => x.id === id);
      if (b?.isPriority && dayIndexOf(b) !== dayIndex && !canAddAnytime(dayIndex, id)) {
        showToast(ANYTIME_LIMIT_MESSAGE);
        return;
      }
      const result = await moveBlock(id, dayIndex);
      if (!result.ok) {
        if (result.code === ANYTIME_LIMIT_REACHED) showToast(ANYTIME_LIMIT_MESSAGE);
        else setBoardError(result.error);
      }
    } else if (kind === "goal") {
      openCreateModal(dayIndex, { goalId: id });
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-[#9CA3AF]">
        Loading your week...
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-[1600px] px-6 pb-20 pt-[34px] lg:px-8 2xl:px-10">
        <header className="mb-[26px] flex flex-wrap items-end justify-between gap-6 border-b border-[#ECE8DF] pb-[22px]">
          <div>
            <div className="inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
              <b className="rounded border border-[#FED7AA] bg-[#FFF7ED] px-1.5 py-0.5 text-[#C2410C]">A-01</b>
              <button
                onClick={goToPreviousWeek}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-[#ECE8DF] bg-white text-[#6B7280] hover:bg-[#F3F4F6]"
                aria-label="Previous week"
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span>Week of {fmtShort(days[0])} – {fmtShort(days[6])}</span>
              <button
                onClick={goToNextWeek}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-[#ECE8DF] bg-white text-[#6B7280] hover:bg-[#F3F4F6]"
                aria-label="Next week"
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
            <h1 className="my-3 font-serif text-[40px] font-semibold leading-[1.1] tracking-[-0.015em] text-[#1F2937]">
              This week
            </h1>
            <p className="max-w-[580px] text-[15px] text-[#6B7280]">
              Your roles, their goals, and where each day fits in. Drag a goal
              onto a day to give it a place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Stat value={`${doneGoals}/${totalGoals}`} label="Goals done" />
            <Stat value={String(totalBlocks)} label="Blocks placed" />
            <Stat value={String(roles.length)} label="Roles in play" />
          </div>
        </header>

        {(error || boardError) && (
          <p className="mb-5 rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">
            {error ?? boardError}
          </p>
        )}

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-5 2xl:grid-cols-[300px_minmax(0,1fr)] 2xl:gap-6">
          {/* ---------- Left: roles + goals ---------- */}
          <section aria-label="Goals by role" className="sticky top-[84px] max-xl:static">
            <div className="mb-3.5 flex items-baseline justify-between">
              <h2 className="font-serif text-xl font-semibold text-[#1F2937]">
                Goals by role
              </h2>
              <span className="font-mono text-[11px] text-[#9CA3AF]">
                {doneGoals} of {totalGoals} done
              </span>
            </div>

            {roles.map((role) => {
              const color = domainColor(role.domain);
              const isCollapsed = collapsed.has(role.id);
              const doneCount = role.goals.filter((g) => g.status === "DONE").length;
              return (
                <div
                  key={role.id}
                  className="mb-2.5 overflow-hidden rounded-[10px] border-l-[3px] bg-[#F3F4F6]"
                  style={{ borderColor: color }}
                >
                  <button
                    onClick={() => toggleCollapse(role.id)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left"
                  >
                    <span className="min-w-0 truncate text-[14.5px] font-semibold text-[#1F2937]" title={role.label}>
                      {role.label}
                    </span>
                    <span className="min-w-0 shrink-[100] truncate whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.06em]" style={{ color }}>
                      {domainLabel(role.domain)}
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-[#9CA3AF]">
                      {doneCount}/{role.goals.length}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="#9CA3AF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`shrink-0 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {!isCollapsed && (
                    <div className="px-3 pb-3">
                      {role.goals.length === 0 && (
                        <p className="px-0.5 pb-2 text-[12.5px] text-[#8A8579]">
                          No goals for this role yet this week.
                        </p>
                      )}
                      {role.goals.map((g) => (
                        <GoalRow
                          key={g.id}
                          goal={g}
                          onDragStart={(e) => onGoalDragStart(e, g.id)}
                          onToggle={() => toggleGoal(g, role.id)}
                          onEdit={(title) => editGoalTitleLocal(g.id, role.id, title)}
                          onCommit={(title) => commitGoalTitle(g.id, title)}
                          scheduled={blockForGoal(g.id)}
                          onSchedule={() =>
                            openCreateModal(todayIndex >= 0 ? todayIndex : 0, {
                              roleId: role.id,
                              goalId: g.id,
                            })
                          }
                          onDragEnd={onDragEnd}
                          onDelete={() => deleteGoal(g.id, role.id)}
                        />
                      ))}
                      <AddGoalRow onAdd={(title) => void addGoal(role.id, title)} />
                    </div>
                  )}
                </div>
              );
            })}
            <p className="mt-3 flex items-center gap-1.5 text-xs text-[#8A8579]">
              <svg viewBox="0 0 24 24" width="12" height="14" fill="currentColor">
                <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
                <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
                <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
              </svg>
              Drag a goal onto a day to schedule it. Drag a scheduled block to move it.
            </p>
          </section>

          {/* ---------- Right: the day board (one column per day) ---------- */}
          <section aria-label="Week schedule" className="min-w-0 rounded-2xl border border-[#ECE8DF] bg-white p-3 2xl:p-4">
            <div className="mb-3.5 flex items-baseline justify-between px-1">
              <h2 className="font-serif text-xl font-semibold text-[#1F2937]">
                The week ahead
              </h2>
              <span className="font-mono text-[11px] text-[#9CA3AF]">
                {totalBlocks} block{totalBlocks === 1 ? "" : "s"} ·{" "}
                {todayIndex >= 0 ? blocksForDay(todayIndex).length : 0} today
              </span>
            </div>

            <div className="overflow-x-auto">
              <div className="grid min-w-[760px] grid-cols-7 overflow-hidden rounded-xl border border-[#ECE8DF]">
                {days.map((d, i) => (
                  <DayColumn
                    key={i}
                    date={d}
                    dayIndex={i}
                    blocks={blocksForDay(i)}
                    isToday={i === todayIndex}
                    isPast={todayIndex >= 0 && i < todayIndex}
                    isOver={dragOverDay === i}
                    expanded={expandedDays.has(i)}
                    onToggleExpanded={() => toggleExpandedDay(i)}
                    onDragOver={(e) => onDayDragOver(e, i)}
                    onDragLeave={() => setDragOverDay((cur) => (cur === i ? null : cur))}
                    onDrop={(e) => onDayDrop(e, i)}
                    onOpenBlock={(b) => openEditModal(b, i)}
                    onBlockDragStart={onBlockDragStart}
                    onDragEnd={onDragEnd}
                    draggingBlockId={draggingBlockId}
                    anytimeFull={!canAddAnytime(i)}
                    onAdd={() => openCreateModal(i)}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      {modal && (
        <BlockModal
          modal={modal}
          roles={roles}
          days={days}
          blockForGoal={blockForGoal}
          anytimeFull={
            !canAddAnytime(modal.dayIndex, modal.id) &&
            // an Anytime block staying on its own day keeps its slot
            !(
              modal.id &&
              blocks.some((b) => b.id === modal.id && b.isPriority && dayIndexOf(b) === modal.dayIndex)
            )
          }
          error={modalError}
          onChange={setModal}
          onClose={() => setModal(null)}
          onSave={saveModal}
          onDelete={modal.id ? deleteModalBlock : undefined}
        />
      )}
    </div>
  );
}

const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Timed blocks shown in a column before it collapses behind "+N more".
 * Keeps one heavy day from stretching the whole board (every column shares
 * the row height). Anytime items sit above and are never collapsed — there
 * are at most ANYTIME_PER_DAY of them.
 */
const COLUMN_CAP = 5;

function DayColumn({
  date,
  dayIndex,
  blocks,
  isToday,
  isPast,
  isOver,
  expanded,
  onToggleExpanded,
  onDragOver,
  onDragLeave,
  onDrop,
  onOpenBlock,
  onBlockDragStart,
  onDragEnd,
  draggingBlockId,
  anytimeFull,
  onAdd,
}: {
  date: Date;
  dayIndex: number;
  blocks: ScheduleBlock[];
  isToday: boolean;
  isPast: boolean;
  isOver: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onOpenBlock: (b: ScheduleBlock) => void;
  onBlockDragStart: (e: React.DragEvent, blockId: string) => void;
  onDragEnd: () => void;
  draggingBlockId: string | null;
  /** This day already holds ANYTIME_PER_DAY Anytime items. */
  anytimeFull: boolean;
  onAdd: () => void;
}) {
  // Anytime (no hour) on top, then timed blocks by hour.
  const anytime = blocks.filter((b) => b.hour == null);
  const timed = blocks
    .filter((b) => b.hour != null)
    .sort((a, b) => (a.hour as number) - (b.hour as number));
  const overflow = timed.length > COLUMN_CAP;
  // When collapsed, show CAP-1 cards so the "+N more" row takes the last slot.
  const visibleTimed = overflow && !expanded ? timed.slice(0, COLUMN_CAP - 1) : timed;
  const hidden = timed.length - visibleTimed.length;

  const card = (b: ScheduleBlock) => (
    <BlockCard
      key={b.id}
      block={b}
      muted={isPast}
      dragging={draggingBlockId === b.id}
      onOpen={() => onOpenBlock(b)}
      onDragStart={(e) => onBlockDragStart(e, b.id)}
      onDragEnd={onDragEnd}
    />
  );

  return (
    <div
      role="group"
      aria-label={`${DAY_NAMES_LONG[dayIndex]} ${fmtShort(date)}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative flex min-w-0 flex-col border-[#F1EEE7] transition-colors [&:not(:first-child)]:border-l ${
        isOver
          ? "bg-[#FFF7ED] shadow-[inset_0_0_0_2px_#F97316]"
          : isToday
            ? "bg-[#FFFBF7]"
            : isPast
              ? "bg-[#FCFBF8]"
              : "bg-white"
      }`}
    >
      {isToday && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-[#F97316]" />}

      <div className="flex items-end justify-between gap-1 border-b border-[#F1EEE7] px-2.5 pb-2 pt-2.5">
        <div className="min-w-0">
          <div
            className={`font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${
              isToday ? "text-[#C2410C]" : isPast ? "text-[#C9CBCF]" : "text-[#9CA3AF]"
            }`}
          >
            {isToday ? "Today" : DAY_NAMES_SHORT[dayIndex]}
          </div>
          <div
            className={`font-serif text-[22px] font-semibold leading-none ${
              isToday ? "text-[#C2410C]" : isPast ? "text-[#B7B2A7]" : "text-[#1F2937]"
            }`}
          >
            {date.getUTCDate()}
          </div>
        </div>
        {blocks.length > 0 && (
          <span className="font-mono text-[10.5px] text-[#B7B2A7]">{blocks.length}</span>
        )}
      </div>

      <div className="flex min-h-[260px] flex-1 flex-col gap-1.5 p-1.5">
        {anytime.length > 0 && (
          <>
            <div className="flex items-center justify-between px-1 pt-0.5">
              <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
                Anytime
              </span>
              <span
                title={
                  anytimeFull
                    ? `This day holds the maximum of ${ANYTIME_PER_DAY} Anytime items`
                    : `${anytime.length} of ${ANYTIME_PER_DAY} Anytime slots used`
                }
                className={`font-mono text-[9.5px] ${anytimeFull ? "text-[#C2410C]" : "text-[#B7B2A7]"}`}
              >
                {anytime.length}/{ANYTIME_PER_DAY}
              </span>
            </div>
            {anytime.map(card)}
            {timed.length > 0 && (
              <div role="separator" aria-hidden="true" className="mx-1 my-0.5 border-t border-dashed border-[#E5E1D8]" />
            )}
          </>
        )}

        {visibleTimed.map(card)}

        {overflow && (
          <button
            onClick={onToggleExpanded}
            className="rounded-md px-2 py-1 text-left font-mono text-[10.5px] text-[#8A8579] hover:bg-[#F3EEE6] hover:text-[#1F2937]"
          >
            {expanded ? "Show less" : `+${hidden} more`}
          </button>
        )}

        {blocks.length === 0 && isToday && (
          <p className="px-1.5 py-1 text-[11.5px] leading-snug text-[#B7B2A7]">
            Nothing yet. Pull a goal in.
          </p>
        )}

        <button
          onClick={onAdd}
          title={`Add to ${DAY_NAMES_LONG[dayIndex]}`}
          className="mt-auto rounded-md border border-dashed border-transparent px-2 py-1.5 text-left text-[11.5px] text-[#B7B2A7] transition-colors hover:border-[#D6D2C8] hover:bg-[#FAF8F5] hover:text-[#8A8579]"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

function BlockCard({
  block,
  muted,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  block: ScheduleBlock;
  muted: boolean;
  dragging: boolean;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <button
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      title={`${block.title} · ${block.role.label} — drag to another day to move it`}
      className={`w-full cursor-grab rounded-md border border-[#ECE8DF] border-l-[3px] bg-white px-2 py-1.5 text-left transition-shadow hover:shadow-[0_2px_8px_rgba(31,41,55,0.08)] active:cursor-grabbing ${
        dragging ? "opacity-40" : muted ? "opacity-70 hover:opacity-100" : ""
      }`}
      style={{ borderLeftColor: domainColor(block.role.domain) }}
    >
      <div className="font-mono text-[10px] text-[#6B7280]">{fmtTime(block.hour)}</div>
      <div className="my-0.5 line-clamp-3 text-[12.5px] font-medium leading-snug text-[#1F2937] wrap-anywhere">
        {block.title}
      </div>
      <div className="truncate font-mono text-[9px] uppercase tracking-[0.05em] text-[#9CA3AF]">
        {block.role.label}
        {block.goalId ? " · goal" : ""}
      </div>
    </button>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-[110px] rounded-xl border border-[#ECE8DF] bg-white px-4 py-2.5">
      <div className="font-serif text-[26px] font-semibold leading-[1.15] text-[#1F2937]">
        {value}
      </div>
      <div className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[#9CA3AF]">
        {label}
      </div>
    </div>
  );
}

function GoalRow({
  goal,
  onDragStart,
  onToggle,
  onEdit,
  onCommit,
  scheduled,
  onSchedule,
  onDragEnd,
  onDelete,
}: {
  goal: Goal;
  onDragStart: (e: React.DragEvent) => void;
  onToggle: () => void;
  onEdit: (title: string) => void;
  onCommit: (title: string) => void;
  /** The goal's one block, if it has a place in the week already. */
  scheduled: ScheduleBlock | null;
  onSchedule: () => void;
  onDragEnd: () => void;
  onDelete: () => void;
}) {
  const done = goal.status === "DONE";
  const when = scheduled ? scheduledLabel(scheduled) : null;
  return (
    <div className="mb-1.5 flex items-center gap-1.5 rounded-lg bg-white py-1.5 pl-1 pr-1.5">
      <span
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        title={scheduled ? "Drag onto another day to move it" : "Drag onto a day"}
        className="grid shrink-0 cursor-grab place-items-center p-1 text-[#D6D2C8] hover:text-[#9CA3AF] active:cursor-grabbing"
      >
        <svg viewBox="0 0 24 24" width="12" height="14" fill="currentColor">
          <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
          <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
          <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
        </svg>
      </span>
      <button
        onClick={onToggle}
        aria-pressed={done}
        className={`flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] ${
          done ? "border-[#22C55E] bg-[#22C55E]" : "border-[#D6D2C8] bg-white"
        }`}
      >
        {done && (
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <input
        value={goal.title}
        title={goal.title}
        onChange={(e) => onEdit(e.target.value)}
        onBlur={(e) => onCommit(e.target.value)}
        className={`min-w-0 flex-1 truncate bg-transparent p-0.5 text-[13.5px] ${
          done ? "text-[#B3AFA6] line-through" : "text-[#1F2937]"
        }`}
      />
      {when ? (
        <button
          onClick={onSchedule}
          aria-label={`Scheduled ${when} — reschedule`}
          title="Scheduled — click to change day or time"
          className="shrink-0 whitespace-nowrap rounded-md bg-[#FFF7ED] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#C2410C] hover:bg-[#FFEDD5]"
        >
          {when}
        </button>
      ) : (
        <button onClick={onSchedule} aria-label="Schedule it" title="Schedule it" className="shrink-0 p-0.5 text-[#C9CBCF] hover:text-[#F97316]">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
          </svg>
        </button>
      )}
      <button onClick={onDelete} aria-label="Remove goal" title="Remove" className="shrink-0 p-0.5 text-[#C9CBCF] hover:text-[#E15656]">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6 6 18" /><path d="M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function AddGoalRow({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");
  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  }
  return (
    <div className="mt-2 flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Add a goal for this role..."
        className="flex-1 rounded-lg border border-dashed border-[#D6D2C8] bg-transparent px-2.5 py-2 text-[13px] focus:border-solid focus:border-[#F97316] focus:outline-none"
      />
      <button
        onClick={submit}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F97316] text-white hover:bg-[#EA6A0C]"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14" /><path d="M5 12h14" />
        </svg>
      </button>
    </div>
  );
}

function BlockModal({
  modal,
  roles,
  days,
  blockForGoal,
  anytimeFull,
  error,
  onChange,
  onClose,
  onSave,
  onDelete,
}: {
  modal: ModalState;
  roles: Role[];
  days: Date[];
  blockForGoal: (goalId: string) => ScheduleBlock | null;
  /** The chosen day has no Anytime slot left for this block. */
  anytimeFull: boolean;
  error: string | null;
  onChange: (m: ModalState) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
}) {
  const role = roles.find((r) => r.id === modal.roleId);
  // One place per goal: hide goals that already have a block elsewhere
  // (the goal this block already holds stays selectable).
  const goals =
    role?.goals.filter((g) => {
      if (g.id === modal.goalId) return true;
      if (g.status === "DONE") return false;
      const b = blockForGoal(g.id);
      return !b || b.id === modal.id;
    }) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(31,41,55,0.3)] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex w-full max-w-[460px] flex-col gap-3 rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(31,41,55,0.22)]">
        <div>
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
            {modal.id ? "Edit time block" : "Schedule a goal"}
          </div>
          <h3 className="mt-1 font-serif text-[22px] font-semibold text-[#1F2937]">
            {modal.id ? "Move or adjust this block" : "Give it a place in the week"}
          </h3>
        </div>

        <div>
          <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.06em] text-[#9CA3AF]">
            Role
          </label>
          <select
            value={modal.roleId}
            onChange={(e) => onChange({ ...modal, roleId: e.target.value, goalId: "" })}
            className="w-full rounded-lg border border-[#E5E1D8] bg-[#FCFBF8] px-3 py-2.5 text-sm"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} — {domainLabel(r.domain)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.06em] text-[#9CA3AF]">
            Goal
          </label>
          <select
            value={modal.goalId}
            onChange={(e) => onChange({ ...modal, goalId: e.target.value })}
            className="w-full rounded-lg border border-[#E5E1D8] bg-[#FCFBF8] px-3 py-2.5 text-sm"
          >
            <option value="">Something else...</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>

        {!modal.goalId && (
          <div>
            <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.06em] text-[#9CA3AF]">
              Describe it
            </label>
            <input
              value={modal.title}
              onChange={(e) => onChange({ ...modal, title: e.target.value })}
              placeholder="Describe it"
              className="w-full rounded-lg border border-[#E5E1D8] bg-[#FCFBF8] px-3 py-2.5 text-sm"
            />
          </div>
        )}

        <div className="grid grid-cols-[1.4fr_1fr] gap-2.5">
          <div>
            <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.06em] text-[#9CA3AF]">
              Day
            </label>
            <select
              value={modal.dayIndex}
              onChange={(e) => onChange({ ...modal, dayIndex: Number(e.target.value) })}
              className="w-full rounded-lg border border-[#E5E1D8] bg-[#FCFBF8] px-3 py-2.5 text-sm"
            >
              {DAY_NAMES_LONG.map((d, i) => (
                <option key={d} value={i}>
                  {d} · {fmtShort(days[i])}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.06em] text-[#9CA3AF]">
              Time{" "}
              <span className="normal-case tracking-normal">
                {anytimeFull ? "(required)" : "(optional)"}
              </span>
            </label>
            <input
              type="time"
              value={modal.hour}
              onChange={(e) => onChange({ ...modal, hour: e.target.value })}
              className="w-full rounded-lg border border-[#E5E1D8] bg-[#FCFBF8] px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">{error}</p>
        )}

        <div className="mt-1.5 flex items-center gap-2">
          {onDelete && (
            <button
              onClick={onDelete}
              className="rounded-lg bg-[#FDECEC] px-3.5 py-2.5 text-sm font-semibold text-[#C0392B] hover:bg-[#FADADA]"
            >
              Remove
            </button>
          )}
          <span className="flex-1" />
          <button
            onClick={onClose}
            className="rounded-lg border border-[#E5E1D8] bg-white px-4 py-2.5 text-sm font-semibold text-[#1F2937] hover:bg-[#FCFBF8]"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="rounded-lg bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#EA6A0C]"
          >
            {modal.id ? "Save" : "Add to week"}
          </button>
        </div>
      </div>
    </div>
  );
}
