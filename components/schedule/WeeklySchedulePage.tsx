"use client";

import { useEffect, useRef, useState } from "react";
import { domainColor } from "../../lib/domainColors";
import { dayKey } from "../../lib/week";
import { NotificationBell } from "../notifications/NotificationBell";
import { WeekToggle, weekRangeLabel } from "../week/WeekToggle";
import type { WeekData, Role, ScheduleBlock } from "../../hooks/useWeek";
import { ANYTIME_LIMIT_MESSAGE, ANYTIME_LIMIT_REACHED } from "../../lib/scheduleRules";
import {
  defaultAddHour,
  distinctFirst,
  fmtLongDay,
  fmtMonthDay,
  freeHours,
  openingHour,
  resolveSelectedKey,
} from "../../lib/scheduleDayView";
import { showToast } from "../../store/toastStore";
import "./schedule.css";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6..21
const ROW_H = 56; // px, keep equal to --row-h in schedule.css
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function fmtHour(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}

type SheetState =
  | { mode: "block"; dayIndex: number; hour: number; existing: ScheduleBlock | null }
  | { mode: "priority"; dayIndex: number; existing: ScheduleBlock | null };

/** Phone layout of /schedule (below md): a week strip that always shows all
 *  seven days, then one day's timeline at full width. The page shows the
 *  same data and opens the same sheets as before; only the layout changed
 *  (WO-015). The desktop view is WeekDesktopView and does not use this file.
 *
 *  `week` is owned by a parent (see components/week/WeekPage.tsx) so the
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
    blocksForDay,
    createBlock,
    updateBlock,
    deleteBlock,
    blockForGoal,
    canAddAnytime,
    view,
    setView,
  } = week;

  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  // Derived, not stored: a pick from the other week falls back to the
  // default (today, or Monday of next week) without an effect.
  const dayKeys = days.map(dayKey);
  const selectedKey = resolveSelectedKey(pickedKey, dayKeys, todayKey);
  const selIndex = dayKeys.indexOf(selectedKey);
  const isToday = selectedKey === todayKey;

  const timedHours = HOURS.filter((h) => timedBlockFor(selIndex, h));
  const priorities = prioritiesFor(selIndex);
  const dayIsEmpty = timedHours.length === 0 && priorities.length === 0;
  const firstBlockHour = timedHours.length ? timedHours[0] : null;

  // Which hour is at the top of the timeline; read when "Add" is tapped.
  const scroller = useRef<HTMLDivElement>(null);
  const topHour = useRef(HOURS[0]);
  const openedFor = useRef("");

  // Opening position: when a day is shown (first load, another day, the
  // other week), scroll once to the hour chosen by openingHour(). Editing a
  // block on the same day does not move the timeline.
  useEffect(() => {
    if (loading) {
      openedFor.current = "";
      return;
    }
    if (openedFor.current === selectedKey) return;
    openedFor.current = selectedKey;
    const el = scroller.current;
    if (!el) return;
    const hour = openingHour({
      isToday,
      nowHour: new Date().getHours(),
      firstBlockHour,
      firstHour: HOURS[0],
      lastHour: HOURS[HOURS.length - 1],
    });
    el.scrollTop = (hour - HOURS[0]) * ROW_H;
    topHour.current = hour;
  }, [loading, selectedKey, isToday, firstBlockHour]);

  function onTimelineScroll() {
    const el = scroller.current;
    if (el) topHour.current = HOURS[0] + Math.round(el.scrollTop / ROW_H);
  }

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
  /** "Add on <day>": the first free hour just below the top of the view. */
  function addOnSelectedDay() {
    const hour = defaultAddHour(freeHours(HOURS, timedHours), topHour.current);
    if (hour !== null) openBlockCell(selIndex, hour);
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

  const selDay = days[selIndex];
  const dayFull = freeHours(HOURS, timedHours).length === 0;

  return (
    <div
      className="schedule-app mx-auto flex w-full max-w-[500px] flex-col bg-[#FFF9F2] px-3 pt-3"
      data-testid="schedule-phone"
    >
      {/* One slim row: which week, its dates, notifications. */}
      <div className="flex h-11 flex-none items-center gap-2">
        <WeekToggle
          view={view}
          onChange={(v) => {
            setPickedKey(null); // a new week always opens on its default day
            setView(v);
          }}
          size="sm"
        />
        <span className="min-w-0 flex-1 truncate text-right font-mono text-[11px] text-[#9CA3AF]">
          {weekRangeLabel(days)}
        </span>
        <NotificationBell />
      </div>

      {/* The whole week, always. Equal-width chips, 44 px or more to tap. */}
      <div
        className="mt-1 grid flex-none grid-cols-7 gap-1"
        role="group"
        aria-label="Day of the week"
        data-testid="day-strip"
      >
        {days.map((d, i) => {
          const key = dayKeys[i];
          const selected = key === selectedKey;
          const today = key === todayKey;
          const dots = distinctFirst(
            blocksForDay(i).map((b) => domainColor(b.role.domain)),
            3,
          );
          return (
            <button
              key={key}
              type="button"
              onClick={() => setPickedKey(key)}
              aria-pressed={selected}
              aria-current={today ? "date" : undefined}
              aria-label={fmtLongDay(d)}
              data-testid={`day-chip-${key}`}
              className={`day-chip ${selected ? "is-selected" : ""} ${today ? "is-today" : ""}`}
            >
              <span className="day-chip-letter" aria-hidden="true">
                {DAY_LETTERS[i]}
              </span>
              <span className="day-chip-num" aria-hidden="true">
                {d.getUTCDate()}
              </span>
              <span className="day-chip-dots" aria-hidden="true">
                {dots.map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {/* The selected day's title, and the role colours (one tap). */}
      <div className="mt-2 flex flex-none items-center justify-between gap-2">
        <h1 className="min-w-0 truncate font-serif text-[17px] font-semibold text-[#1F2937]">
          {fmtLongDay(selDay)}
        </h1>
        <button
          type="button"
          onClick={() => setLegendOpen((o) => !o)}
          aria-expanded={legendOpen}
          aria-controls="role-legend"
          aria-label="Role colours"
          data-testid="legend-toggle"
          className="legend-toggle"
        >
          <span className="flex gap-0.5" aria-hidden="true">
            {roles.slice(0, 4).map((r) => (
              <span
                key={r.id}
                className="h-2 w-2 rounded-sm"
                style={{ background: domainColor(r.domain) }}
              />
            ))}
          </span>
          Roles
        </button>
      </div>
      {legendOpen && (
        <div
          id="role-legend"
          className="mt-1 flex flex-none flex-wrap gap-x-3.5 gap-y-1"
          data-testid="role-legend"
        >
          {roles.map((r) => (
            <div key={r.id} className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
              <span
                className="h-2 w-2 rounded-sm"
                style={{ background: domainColor(r.domain) }}
              />
              {r.label}
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* Things without a fixed time for this day (limit: scheduleRules). */}
          <div className="mt-2 flex flex-none gap-2" data-testid="day-priorities">
            {priorities.map((p) => (
              <button
                key={p.id}
                type="button"
                className="priority-chip"
                style={{ ["--dot" as string]: domainColor(p.role.domain) }}
                onClick={() => openPriority(selIndex, p)}
              >
                <span>{p.title}</span>
              </button>
            ))}
            {canAddAnytime(selIndex) && (
              <button
                type="button"
                className="priority-add"
                onClick={() => openPriority(selIndex)}
              >
                + priority
              </button>
            )}
          </div>

          {/* Shown only while the day is empty. */}
          {dayIsEmpty && (
            <p className="mt-1.5 flex-none text-[12px] leading-snug text-[#8A8579]" data-testid="empty-hint">
              {view === "next"
                ? "Planning the week ahead. Give what matters a place before the week fills up."
                : "Tap an hour to schedule a goal. Tap + priority for things without a fixed time."}
            </p>
          )}
        </>
      )}

      {/* The day. Fills the rest of the screen and scrolls on its own. */}
      <div className="day-frame mt-2" data-testid="day-timeline">
        {loading ? (
          <div className="py-10 text-center text-sm text-[#9CA3AF]">
            Loading your week...
          </div>
        ) : (
          <div ref={scroller} onScroll={onTimelineScroll} className="day-scroll">
            {HOURS.map((h) => {
              const block = timedBlockFor(selIndex, h);
              return (
                <button
                  key={h}
                  type="button"
                  className="hour-row"
                  onClick={() => openBlockCell(selIndex, h)}
                  aria-label={
                    block
                      ? `${fmtHour(h)}, ${block.title}. Edit`
                      : `${fmtHour(h)}, free. Schedule a goal`
                  }
                  data-testid={`hour-${h}`}
                >
                  <span className="hour-label" aria-hidden="true">
                    {fmtHour(h)}
                  </span>
                  <span className="hour-lane" aria-hidden="true">
                    {block && (
                      <span
                        className="hblock"
                        style={{
                          ["--dot" as string]: domainColor(block.role.domain),
                          ["--blockbg" as string]: domainColor(block.role.domain) + "1A",
                        }}
                      >
                        <span className="hblock-title">{block.title}</span>
                        <span className="hblock-role">{block.role.label}</span>
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
            <div className="day-scroll-end" />
          </div>
        )}
      </div>

      {/* One clear add action for the selected day. */}
      {!loading && (
        <button
          type="button"
          onClick={addOnSelectedDay}
          disabled={dayFull}
          data-testid="add-on-day"
          className="add-pill"
        >
          <span>Add on {fmtMonthDay(selDay)}</span>
          <span className="font-mono text-lg leading-none" aria-hidden="true">
            +
          </span>
        </button>
      )}

      {sheet && (
        <ScheduleSheet
          sheet={sheet}
          dayLabel={days[sheet.dayIndex].toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
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
