"use client";

import { Fragment, useState } from "react";
import { domainColor } from "../../lib/domainColors";
import { dayKey } from "../../lib/week";
import { NotificationBell } from "../notifications/NotificationBell";
import type { WeekData, Role, ScheduleBlock } from "../../hooks/useWeek";
import { ANYTIME_LIMIT_MESSAGE, ANYTIME_LIMIT_REACHED } from "../../lib/scheduleRules";
import { showToast } from "../../store/toastStore";
import "./schedule.css";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6..21
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtHour(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}

type SheetState =
  | { mode: "block"; dayIndex: number; hour: number; existing: ScheduleBlock | null }
  | { mode: "priority"; dayIndex: number; existing: ScheduleBlock | null };

/** `week` is owned by a parent (see components/week/WeekPage.tsx) so the
 *  mobile and desktop views of the same route share one fetch/mutation
 *  source instead of each calling useWeek() independently. */
export function WeeklySchedulePage({ week }: { week: WeekData }) {
  const {
    days,
    todayKey,
    roles,
    loading,
    timedBlockFor,
    prioritiesFor,
    createBlock,
    updateBlock,
    deleteBlock,
    blockForGoal,
    canAddAnytime,
    goToPreviousWeek,
    goToNextWeek,
  } = week;

  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);

  function openBlockCell(dayIndex: number, hour: number) {
    setSheetError(null);
    setSheet({
      mode: "block",
      dayIndex,
      hour,
      existing: timedBlockFor(dayIndex, hour),
    });
  }
  function openPriority(dayIndex: number, existing: ScheduleBlock | null = null) {
    setSheetError(null);
    setSheet({ mode: "priority", dayIndex, existing });
  }

  async function saveSheet(
    roleId: string,
    goalId: string | null,
    title: string,
  ) {
    if (!sheet) return;
    let result;
    if (sheet.existing) {
      result = await updateBlock(sheet.existing.id, { roleId, goalId, title });
    } else if (sheet.mode === "block") {
      result = await createBlock({
        roleId,
        goalId,
        title,
        day: days[sheet.dayIndex],
        hour: sheet.hour,
        isPriority: false,
      });
    } else {
      result = await createBlock({
        roleId,
        goalId,
        title,
        day: days[sheet.dayIndex],
        hour: null,
        isPriority: true,
      });
    }
    if (!result.ok) {
      if (result.code === ANYTIME_LIMIT_REACHED) showToast(ANYTIME_LIMIT_MESSAGE);
      else setSheetError(result.error);
      return;
    }
    setSheet(null);
    setSheetError(null);
  }

  async function deleteSheet() {
    if (!sheet?.existing) return;
    await deleteBlock(sheet.existing.id);
    setSheet(null);
  }

  return (
    <div className="schedule-app flex justify-center bg-[#FFF9F2] px-4 pb-24 pt-5">
      <div className="w-full max-w-[500px]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-serif text-[15px] font-semibold text-[#9CA3AF]">
              Quadrant
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousWeek}
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
              onClick={goToNextWeek}
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
                  {/* At most ANYTIME_PER_DAY per day (lib/scheduleRules.ts). */}
                  {canAddAnytime(i) && (
                    <button
                      className="priority-add"
                      onClick={() => openPriority(i)}
                    >
                      + priority
                    </button>
                  )}
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
                    const block = timedBlockFor(i, h);
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
          onClose={() => {
            setSheet(null);
            setSheetError(null);
          }}
          onSave={saveSheet}
          onDelete={sheet.existing ? deleteSheet : undefined}
          blockForGoal={blockForGoal}
          error={sheetError}
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
  blockForGoal,
  error,
}: {
  sheet: SheetState;
  dayLabel: string;
  roles: Role[];
  onClose: () => void;
  onSave: (roleId: string, goalId: string | null, title: string) => void;
  onDelete?: () => void;
  blockForGoal: (goalId: string) => ScheduleBlock | null;
  error: string | null;
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
          {role?.goals
            // One place per goal: hide goals scheduled elsewhere.
            .filter((g) => {
              const b = blockForGoal(g.id);
              return !b || b.id === existing?.id;
            })
            .map((g) => (
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

        {error && (
          <p className="mb-2 rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">
            {error}
          </p>
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
