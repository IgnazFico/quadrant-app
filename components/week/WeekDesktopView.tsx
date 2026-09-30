"use client";

import { useState } from "react";
import { domainColor } from "../../lib/domainColors";
import { domainLabel } from "../../lib/domains";
import { dayKey } from "../../lib/week";
import { NotificationBell } from "../notifications/NotificationBell";
import type { WeekData, Role, Goal, ScheduleBlock } from "../../hooks/useWeek";

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
 * right, matching web-prototype/index.html's "Week" page. Drag a goal's
 * grip handle onto a day to schedule it — this always creates a NEW
 * schedule block for that day (never moves an existing one), matching
 * both the prototype's behavior and PATCH /api/schedule/[id], which
 * intentionally never changes a block's day/hour.
 */
export function WeekDesktopView({ week }: { week: WeekData }) {
  const {
    days,
    todayKey,
    roles,
    loading,
    error,
    blocksForDay,
    toggleGoal,
    editGoalTitleLocal,
    commitGoalTitle,
    deleteGoal,
    addGoal,
    createBlock,
    updateBlock,
    deleteBlock,
    goToPreviousWeek,
    goToNextWeek,
  } = week;

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

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

  function openCreateModal(dayIndex: number, opts: { roleId?: string; goalId?: string } = {}) {
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

    if (modal.id) {
      const result = await updateBlock(modal.id, {
        roleId: modal.roleId,
        goalId: goal ? goal.id : null,
        title,
      });
      if (!result.ok) {
        setModalError(result.error);
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
        setModalError(result.error);
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

  // ---------- Drag a goal's grip onto a day column ----------
  function onGoalDragStart(e: React.DragEvent, goalId: string) {
    e.dataTransfer.setData("text/plain", goalId);
    e.dataTransfer.effectAllowed = "copy";
  }
  function onDayDragOver(e: React.DragEvent, dayIndex: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverDay(dayIndex);
  }
  function onDayDrop(e: React.DragEvent, dayIndex: number) {
    e.preventDefault();
    setDragOverDay(null);
    const goalId = e.dataTransfer.getData("text/plain");
    if (goalId) openCreateModal(dayIndex, { goalId });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#9CA3AF]">
        Loading your week...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[#ECE8DF] bg-[rgba(250,247,242,0.9)] px-10 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="grid h-6 w-6 grid-cols-2 grid-rows-2 gap-[2.5px] rounded-[5px] bg-[#FFF0E0] p-1 shadow-[0_0_0_1px_rgba(249,115,22,0.2)]">
            <span className="rounded-[1.5px] bg-[#E5E7EB]" />
            <span className="rounded-[1.5px] bg-[#F97316]" />
            <span className="rounded-[1.5px] bg-[#E5E7EB]" />
            <span className="rounded-[1.5px] bg-[#E5E7EB]" />
          </div>
          <span className="font-serif text-[19px] font-bold tracking-[-0.01em] text-[#1F2937]">
            Quadrant
          </span>
        </div>
        <div className="flex items-center gap-3.5">
          <button
            onClick={goToPreviousWeek}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#ECE8DF] bg-white text-[#6B7280] hover:bg-[#F3F4F6]"
            aria-label="Previous week"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="font-mono text-[11px] text-[#9CA3AF]">
            {fmtShort(days[0])} &ndash; {fmtShort(days[6])}
          </span>
          <button
            onClick={goToNextWeek}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#ECE8DF] bg-white text-[#6B7280] hover:bg-[#F3F4F6]"
            aria-label="Next week"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <NotificationBell />
        </div>
      </div>

      <div className="mx-auto max-w-[1320px] px-10 pb-20 pt-[34px]">
        <header className="mb-[26px] flex flex-wrap items-end justify-between gap-6 border-b border-[#ECE8DF] pb-[22px]">
          <div>
            <div className="inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
              <b className="rounded border border-[#FED7AA] bg-[#FFF7ED] px-1.5 py-0.5 text-[#C2410C]">A-01</b>
              <span>Week of {fmtShort(days[0])} – {fmtShort(days[6])}</span>
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

        {error && (
          <p className="mb-5 rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">
            {error}
          </p>
        )}

        <div className="grid grid-cols-[370px_minmax(0,1fr)] items-start gap-6 xl:grid-cols-[370px_minmax(0,1fr)] max-xl:grid-cols-1">
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
                    <span className="text-[14.5px] font-semibold text-[#1F2937]">
                      {role.label}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.06em]" style={{ color }}>
                      {domainLabel(role.domain)}
                    </span>
                    <span className="ml-auto font-mono text-[11px] text-[#9CA3AF]">
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
                          onSchedule={() =>
                            openCreateModal(todayIndex >= 0 ? todayIndex : 0, {
                              roleId: role.id,
                              goalId: g.id,
                            })
                          }
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
              Drag a goal onto a day, or use the clock to schedule it.
            </p>
          </section>

          {/* ---------- Right: the day board ---------- */}
          <section aria-label="Week schedule" className="rounded-2xl border border-[#ECE8DF] bg-white p-5">
            <div className="mb-3.5 flex items-baseline justify-between">
              <h2 className="font-serif text-xl font-semibold text-[#1F2937]">
                The week ahead
              </h2>
              <span className="font-mono text-[11px] text-[#9CA3AF]">
                {totalBlocks} block{totalBlocks === 1 ? "" : "s"} ·{" "}
                {todayIndex >= 0 ? blocksForDay(todayIndex).length : 0} today
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {days.map((d, i) => {
                const blocks = blocksForDay(i).sort(
                  (a, b) => (a.hour ?? 99) - (b.hour ?? 99),
                );
                const isToday = i === todayIndex;
                const isPast = todayIndex >= 0 && i < todayIndex;
                const isOver = dragOverDay === i;
                return (
                  <div
                    key={i}
                    onDragOver={(e) => onDayDragOver(e, i)}
                    onDragLeave={() => setDragOverDay((cur) => (cur === i ? null : cur))}
                    onDrop={(e) => onDayDrop(e, i)}
                    className={`grid min-h-[64px] grid-cols-[92px_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border p-2.5 transition-colors ${
                      isOver
                        ? "border-[#F97316] bg-[#FFF7ED] shadow-[0_0_0_3px_rgba(249,115,22,0.12)]"
                        : isToday
                          ? "border-[#FED7AA] bg-white shadow-[0_0_0_3px_rgba(249,115,22,0.08)]"
                          : isPast
                            ? "border-[#ECE8DF] bg-transparent"
                            : "border-[#ECE8DF] bg-[#FAF8F5]"
                    }`}
                  >
                    <div className="flex h-full flex-col border-r border-[#ECE8DF] py-1 pr-3">
                      <span className={`font-serif text-base font-semibold ${isToday ? "text-[#C2410C]" : "text-[#1F2937]"}`}>
                        {isToday ? "Today" : DAY_NAMES_LONG[i]}
                      </span>
                      <span className="font-mono text-[10.5px] text-[#9CA3AF]">{fmtShort(d)}</span>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] content-start gap-2">
                      {blocks.length === 0 ? (
                        <p className="py-2 px-0.5 text-[12.5px] text-[#B7B2A7]">
                          {isToday
                            ? "Nothing scheduled yet — pull a goal into today."
                            : isPast
                              ? "Nothing placed."
                              : "Open"}
                        </p>
                      ) : (
                        blocks.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => openEditModal(b, i)}
                            className="w-full rounded-lg border border-[#ECE8DF] border-l-[3px] bg-white px-2.5 py-1.5 text-left transition-transform hover:translate-x-0.5 hover:shadow-[0_2px_8px_rgba(31,41,55,0.06)]"
                            style={{ borderLeftColor: domainColor(b.role.domain) }}
                          >
                            <div className="font-mono text-[10.5px] text-[#6B7280]">
                              {fmtTime(b.hour)}
                            </div>
                            <div className="my-0.5 overflow-wrap-anywhere text-[13px] font-medium leading-tight text-[#1F2937]">
                              {b.title}
                            </div>
                            <div className="font-mono text-[9.5px] uppercase tracking-[0.05em] text-[#9CA3AF]">
                              {b.role.label}{b.goalId ? " · goal" : ""}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    <button
                      onClick={() => openCreateModal(i)}
                      className="self-center whitespace-nowrap rounded-lg border border-dashed border-[#D6D2C8] px-2.5 py-1.5 text-xs text-[#8A8579] hover:bg-[#EFEBE1]"
                    >
                      + Add
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {modal && (
        <BlockModal
          modal={modal}
          roles={roles}
          days={days}
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
  onSchedule,
  onDelete,
}: {
  goal: Goal;
  onDragStart: (e: React.DragEvent) => void;
  onToggle: () => void;
  onEdit: (title: string) => void;
  onCommit: (title: string) => void;
  onSchedule: () => void;
  onDelete: () => void;
}) {
  const done = goal.status === "DONE";
  return (
    <div className="mb-1.5 flex items-center gap-1.5 rounded-lg bg-white py-1.5 pl-1 pr-1.5">
      <span
        draggable
        onDragStart={onDragStart}
        title="Drag onto a day"
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
        onChange={(e) => onEdit(e.target.value)}
        onBlur={(e) => onCommit(e.target.value)}
        className={`flex-1 bg-transparent p-0.5 text-[13.5px] ${
          done ? "text-[#B3AFA6] line-through" : "text-[#1F2937]"
        }`}
      />
      <button onClick={onSchedule} aria-label="Schedule it" title="Schedule it" className="shrink-0 p-0.5 text-[#C9CBCF] hover:text-[#F97316]">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
        </svg>
      </button>
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
  error,
  onChange,
  onClose,
  onSave,
  onDelete,
}: {
  modal: ModalState;
  roles: Role[];
  days: Date[];
  error: string | null;
  onChange: (m: ModalState) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
}) {
  const role = roles.find((r) => r.id === modal.roleId);
  const goals = role?.goals.filter((g) => g.status !== "DONE" || g.id === modal.goalId) ?? [];

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
            {modal.id ? "Adjust this block" : "Give it a place in the week"}
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
              disabled={!!modal.id}
              className="w-full rounded-lg border border-[#E5E1D8] bg-[#FCFBF8] px-3 py-2.5 text-sm disabled:opacity-60"
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
              Time <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="time"
              value={modal.hour}
              onChange={(e) => onChange({ ...modal, hour: e.target.value })}
              disabled={!!modal.id}
              className="w-full rounded-lg border border-[#E5E1D8] bg-[#FCFBF8] px-3 py-2.5 text-sm disabled:opacity-60"
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
