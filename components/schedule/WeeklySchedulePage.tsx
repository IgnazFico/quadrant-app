"use client";

import { Fragment, useEffect, useMemo, useState, useCallback } from "react";
import { domainColor } from "../../lib/domainColors";
import { startOfWeek, addDays } from "../../lib/week";
import { NotificationBell } from "../notifications/NotificationBell";
import "./schedule.css";

type Goal = { id: string; title: string };
type Role = { id: string; label: string; domain: string; goals: Goal[] };
type Block = {
  id: string;
  day: string;
  hour: number | null;
  isPriority: boolean;
  title: string;
  roleId: string;
  goalId: string | null;
  role: { id: string; label: string; domain: string };
};

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6..21
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtHour(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}
function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

type SheetState =
  | { mode: "block"; dayIndex: number; hour: number; existing: Block | null }
  | { mode: "priority"; dayIndex: number; existing: Block | null };

export function WeeklySchedulePage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek());
  const [roles, setRoles] = useState<Role[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<SheetState | null>(null);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const todayKey = dayKey(new Date());

  const load = useCallback(async (ws: Date) => {
    setLoading(true);
    try {
      const [goalsRes, weekRes] = await Promise.all([
        fetch("/api/goals"),
        fetch(`/api/schedule/week?weekStart=${ws.toISOString().slice(0, 10)}`),
      ]);
      const goalsBody = await goalsRes.json();
      const weekBody = await weekRes.json();
      setRoles(goalsBody.roles);
      setBlocks(weekBody.blocks);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(weekStart);
  }, [weekStart, load]);

  function blocksFor(dayIndex: number, hour: number) {
    const key = dayKey(days[dayIndex]);
    return (
      blocks.find(
        (b) => !b.isPriority && b.hour === hour && b.day.slice(0, 10) === key,
      ) ?? null
    );
  }
  function prioritiesFor(dayIndex: number) {
    const key = dayKey(days[dayIndex]);
    return blocks.filter((b) => b.isPriority && b.day.slice(0, 10) === key);
  }

  function openBlockCell(dayIndex: number, hour: number) {
    setSheet({
      mode: "block",
      dayIndex,
      hour,
      existing: blocksFor(dayIndex, hour),
    });
  }
  function openPriority(dayIndex: number, existing: Block | null = null) {
    setSheet({ mode: "priority", dayIndex, existing });
  }

  async function saveSheet(
    roleId: string,
    goalId: string | null,
    title: string,
  ) {
    if (!sheet) return;
    if (sheet.existing) {
      const res = await fetch(`/api/schedule/${sheet.existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId, goalId, title }),
      });
      if (res.ok) {
        const { block } = await res.json();
        setBlocks((prev) => prev.map((b) => (b.id === block.id ? block : b)));
      }
    } else {
      const day = dayKey(days[sheet.dayIndex]);
      const body =
        sheet.mode === "block"
          ? { roleId, goalId, title, day, hour: sheet.hour, isPriority: false }
          : { roleId, goalId, title, day, isPriority: true };
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const { block } = await res.json();
        setBlocks((prev) => [...prev, block]);
      }
    }
    setSheet(null);
  }

  async function deleteSheet() {
    if (!sheet?.existing) return;
    const id = sheet.existing.id;
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    await fetch(`/api/schedule/${id}`, { method: "DELETE" });
    setSheet(null);
  }

  return (
    <div className="schedule-app flex justify-center bg-[#FFF9F2] px-4 pb-24 pt-5">
      <div className="w-full max-w-[500px]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-4 w-4 grid-cols-2 grid-rows-2 gap-[2px]">
              <span className="rounded-[2px] bg-[#F3F4F6]" />
              <span className="rounded-[2px] bg-[#F97316]" />
              <span className="rounded-[2px] bg-[#F3F4F6]" />
              <span className="rounded-[2px] bg-[#F3F4F6]" />
            </div>
            <span className="font-serif text-[15px] font-semibold text-[#9CA3AF]">
              Quadrant
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-[#E5E1D8] bg-white text-[#6B7280] hover:bg-[#F3F4F6]"
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="font-mono text-[11px] text-[#6B7280]">
              {days[0].toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              &ndash;{" "}
              {days[6].toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
            <button
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-[#E5E1D8] bg-white text-[#6B7280] hover:bg-[#F3F4F6]"
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <NotificationBell />
          </div>
        </div>

        <h1 className="mb-1 font-serif text-2xl font-semibold text-[#1F2937]">
          Weekly schedule
        </h1>
        <p className="mb-4 text-[13px] text-[#6B7280]">
          Tap a block to schedule a goal by the hour. Tap + above a day for
          things without a fixed time.
        </p>

        <div className="mb-3.5 flex flex-wrap gap-3.5">
          {roles.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-1.5 text-[11px] text-[#6B7280]"
            >
              <span
                className="h-2 w-2 rounded-sm"
                style={{ background: domainColor(r.domain) }}
              />
              {r.label}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-[#9CA3AF]">
            Loading your week...
          </div>
        ) : (
          <div className="schedule-scroll">
            <div
              className="sgrid"
              style={{
                gridTemplateRows: `var(--head-h) minmax(56px,auto) repeat(${HOURS.length}, 52px)`,
              }}
            >
              <div className="corner" />

              {days.map((d, i) => (
                <div
                  key={i}
                  className={`day-head ${dayKey(d) === todayKey ? "today" : ""}`}
                  style={{ gridColumn: i + 2 }}
                >
                  <span className="dname">{DAY_NAMES[i]}</span>
                  <span className="dnum">{d.getDate()}</span>
                </div>
              ))}

              {days.map((_, i) => (
                <div
                  key={i}
                  className="priorities-cell"
                  style={{ gridColumn: i + 2 }}
                >
                  {prioritiesFor(i).map((p) => (
                    <div
                      key={p.id}
                      className="priority-chip"
                      style={{ ["--dot" as any]: domainColor(p.role.domain) }}
                      onClick={() => openPriority(i, p)}
                    >
                      <span>{p.title}</span>
                    </div>
                  ))}
                  <button
                    className="priority-add"
                    onClick={() => openPriority(i)}
                  >
                    + priority
                  </button>
                </div>
              ))}

              {HOURS.map((h, rIdx) => (
                <Fragment key={`row-${h}`}>
                  <div
                    key={`t${h}`}
                    className="time-label"
                    style={{ gridRow: rIdx + 3 }}
                  >
                    {fmtHour(h)}
                  </div>
                  {days.map((d, i) => {
                    const block = blocksFor(i, h);
                    return (
                      <div
                        key={`${h}-${i}`}
                        className={`hour-cell ${dayKey(d) === todayKey ? "today-col" : ""}`}
                        style={{ gridColumn: i + 2, gridRow: rIdx + 3 }}
                        onClick={() => openBlockCell(i, h)}
                      >
                        {block && (
                          <div
                            className="hblock"
                            style={{
                              ["--dot" as any]: domainColor(block.role.domain),
                              ["--blockbg" as any]:
                                domainColor(block.role.domain) + "1A",
                            }}
                          >
                            {block.title}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      {sheet && (
        <ScheduleSheet
          sheet={sheet}
          dayLabel={days[sheet.dayIndex].toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
          roles={roles}
          onClose={() => setSheet(null)}
          onSave={saveSheet}
          onDelete={sheet.existing ? deleteSheet : undefined}
        />
      )}
    </div>
  );
}

function ScheduleSheet({
  sheet,
  dayLabel,
  roles,
  onClose,
  onSave,
  onDelete,
}: {
  sheet: SheetState;
  dayLabel: string;
  roles: Role[];
  onClose: () => void;
  onSave: (roleId: string, goalId: string | null, title: string) => void;
  onDelete?: () => void;
}) {
  const existing = sheet.existing;
  const [roleId, setRoleId] = useState(existing?.roleId ?? roles[0]?.id ?? "");
  const [goalId, setGoalId] = useState<string>(existing?.goalId ?? "");
  const [customTitle, setCustomTitle] = useState(
    existing && !existing.goalId ? existing.title : "",
  );

  const role = roles.find((r) => r.id === roleId);
  const usingCustom = goalId === "";

  function submit() {
    const goal = role?.goals.find((g) => g.id === goalId);
    const title = goal ? goal.title : customTitle.trim();
    if (!title || !roleId) return;
    onSave(roleId, goal ? goal.id : null, title);
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-[rgba(31,41,55,0.35)]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] rounded-t-[20px] bg-white px-5 pb-7 pt-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3.5 h-1 w-9 rounded-full bg-[#E5E1D8]" />
        <p className="mb-0.5 font-serif text-[17px] font-semibold text-[#1F2937]">
          {sheet.mode === "block"
            ? existing
              ? "Edit time block"
              : "Schedule a goal"
            : existing
              ? "Edit priority"
              : "Add a day priority"}
        </p>
        <p className="mb-4 font-mono text-xs text-[#9CA3AF]">
          {dayLabel} &middot;{" "}
          {sheet.mode === "block" ? fmtHourLabel(sheet.hour) : "no fixed time"}
        </p>

        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-[#9CA3AF]">
          Role
        </label>
        <select
          value={roleId}
          onChange={(e) => {
            setRoleId(e.target.value);
            setGoalId("");
          }}
          className="mb-3 w-full rounded-lg border border-[#E5E1D8] bg-[#FCFBF8] px-3 py-2.5 text-sm"
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>

        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-[#9CA3AF]">
          Goal
        </label>
        <select
          value={goalId}
          onChange={(e) => setGoalId(e.target.value)}
          className="mb-3 w-full rounded-lg border border-[#E5E1D8] bg-[#FCFBF8] px-3 py-2.5 text-sm"
        >
          <option value="">Something else...</option>
          {role?.goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>

        {usingCustom && (
          <>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-[#9CA3AF]">
              Describe it
            </label>
            <input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Call the dentist"
              className="mb-3 w-full rounded-lg border border-[#E5E1D8] bg-[#FCFBF8] px-3 py-2.5 text-sm"
            />
          </>
        )}

        <div className="mt-3 flex gap-2.5">
          {onDelete && (
            <button
              onClick={onDelete}
              className="shrink-0 rounded-lg bg-[#FDECEC] px-3.5 py-2.5 text-sm font-semibold text-[#C0392B] hover:bg-[#FADADA]"
            >
              Remove
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-[#F3F4F6] py-2.5 text-sm font-semibold text-[#1F2937] hover:bg-[#EAE7DF]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex-1 rounded-lg bg-[#F97316] py-2.5 text-sm font-semibold text-white hover:bg-[#EA6A0C]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtHourLabel(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}
