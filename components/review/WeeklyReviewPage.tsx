"use client";

import { useCallback, useEffect, useState } from "react";
import { domainColor } from "../../lib/domainColors";
import { addDays, startOfWeek } from "../../lib/week";
import { useAuthStore } from "../../store/authStore";
import {
  decryptField,
  encryptField,
  fromBase64,
  toBase64,
} from "../../lib/crypto";

type Choice = "CARRY" | "CANCEL";
type ReviewEntry = {
  id: string;
  choice: Choice;
  reasonEncrypted: string;
  reason?: string;
};
type Goal = {
  id: string;
  title: string;
  status: "IN_PROGRESS" | "DONE" | "MISSED";
  carryForward: boolean;
  reviewEntry: ReviewEntry | null;
};
type Role = { id: string; label: string; domain: string; goals: Goal[] };

export function WeeklyReviewPage() {
  const [weekStart, setWeekStart] = useState(() => addDays(startOfWeek(), -7));
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetGoal, setSheetGoal] = useState<{
    roleId: string;
    goal: Goal;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const masterKey = useAuthStore((s) => s.masterKey);

  const load = useCallback(
    async (ws: Date) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/review?weekStart=${ws.toISOString().slice(0, 10)}`,
        );
        const body = await res.json();
        const withReasons: Role[] = await Promise.all(
          body.roles.map(async (r: Role) => ({
            ...r,
            goals: await Promise.all(
              r.goals.map(async (g) => {
                if (!g.reviewEntry || !masterKey) return g;
                try {
                  const reason = await decryptField(
                    await fromBase64(g.reviewEntry.reasonEncrypted),
                    masterKey,
                  );
                  return { ...g, reviewEntry: { ...g.reviewEntry, reason } };
                } catch {
                  return g;
                }
              }),
            ),
          })),
        );
        setRoles(withReasons);
      } catch {
        setError("Couldn't load that week — try refreshing.");
      } finally {
        setLoading(false);
      }
    },
    [masterKey],
  );

  useEffect(() => {
    load(weekStart);
  }, [weekStart, load]);

  const allGoals = roles.flatMap((r) => r.goals);
  const doneCount = allGoals.filter((g) => g.status === "DONE").length;
  const totalCount = allGoals.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  const unresolvedMissed = allGoals.filter(
    (g) => g.status !== "DONE" && !g.reviewEntry,
  );
  const canFinish = totalCount > 0 && unresolvedMissed.length === 0;

  async function toggleCarry(roleId: string, goal: Goal) {
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

  async function submitReflection(reason: string, choice: Choice) {
    if (!sheetGoal || !masterKey) return;
    const { roleId, goal } = sheetGoal;

    const reasonEncrypted = await toBase64(
      await encryptField(reason, masterKey),
    );
    const res = await fetch("/api/review/reflect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId: goal.id, reasonEncrypted, choice }),
    });
    if (!res.ok) return;
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
    setSheetGoal(null);
  }

  async function completeReview() {
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
    const { carriedCount } = await res.json();
    setToast(
      `Review complete — ${carriedCount} goal${carriedCount === 1 ? "" : "s"} carried into next week`,
    );
    setTimeout(() => setToast(null), 3200);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#9CA3AF]">
        Loading that week...
      </div>
    );
  }

  return (
    <div className="flex justify-center bg-[#FFF9F2] px-[18px] pb-24 pt-5">
      <div className="w-full max-w-[440px]">
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
          <span className="font-mono text-[11px] text-[#9CA3AF]">
            {weekStart.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}{" "}
            &ndash;{" "}
            {addDays(weekStart, 6).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        <h1 className="mb-1 font-serif text-2xl font-semibold text-[#1F2937]">
          Weekly review
        </h1>
        <p className="mb-5 text-[13px] text-[#6B7280]">
          See what got done, what didn&apos;t, and decide what happens next.
        </p>

        {!masterKey && (
          <p className="mb-4 rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">
            Your session key isn&apos;t available — log in again to reflect on
            missed goals.
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">
            {error}
          </p>
        )}

        {totalCount === 0 ? (
          <p className="rounded-xl border border-[#ECE8DF] bg-white px-4 py-6 text-center text-sm text-[#9CA3AF]">
            No goals were set that week.
          </p>
        ) : (
          <>
            <div className="mb-5 rounded-[14px] border border-[#ECE8DF] bg-white p-4">
              <div className="mb-2.5 flex items-baseline justify-between">
                <span className="font-serif text-[22px] font-semibold text-[#1F2937]">
                  {doneCount} of {totalCount} done
                </span>
                <span className="font-mono text-xs text-[#9CA3AF]">{pct}%</span>
              </div>
              <div className="mb-2.5 flex h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
                <div className="bg-[#22C55E]" style={{ width: `${pct}%` }} />
                <div
                  className="bg-[#FB923C]"
                  style={{ width: `${100 - pct}%` }}
                />
              </div>
              <div className="flex gap-4 text-xs text-[#6B7280]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                  Done
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#FB923C]" />
                  Missed
                </span>
              </div>
            </div>

            {roles.map((role) => (
              <div
                key={role.id}
                className="mb-3 rounded-[10px] border-l-[3px] bg-[#F3F4F6] p-3"
                style={{ borderColor: domainColor(role.domain) }}
              >
                <p className="mb-2 pl-0.5 text-[13.5px] font-semibold text-[#1F2937]">
                  {role.label}
                </p>
                {role.goals.map((g) => (
                  <GoalRow
                    key={g.id}
                    goal={g}
                    onToggleCarry={() => toggleCarry(role.id, g)}
                    onReflect={() => setSheetGoal({ roleId: role.id, goal: g })}
                  />
                ))}
              </div>
            ))}

            <button
              disabled={!canFinish}
              onClick={completeReview}
              className="mt-2 w-full rounded-[11px] bg-[#F97316] py-3.5 text-sm font-semibold text-white hover:bg-[#EA6A0C] disabled:bg-[#F0D9C6]"
            >
              Complete review
            </button>
            <p className="mt-2 text-center text-[11.5px] text-[#9CA3AF]">
              {canFinish
                ? "All missed goals reflected on — ready to close out the week"
                : "Reflect on every missed goal to finish your review"}
            </p>
          </>
        )}
      </div>

      {sheetGoal && (
        <ReflectSheet
          goal={sheetGoal.goal}
          disabled={!masterKey}
          onClose={() => setSheetGoal(null)}
          onSubmit={submitReflection}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-lg bg-[#1F2937] px-4 py-2.5 text-sm text-white">
          {toast}
        </div>
      )}
    </div>
  );
}

function GoalRow({
  goal,
  onToggleCarry,
  onReflect,
}: {
  goal: Goal;
  onToggleCarry: () => void;
  onReflect: () => void;
}) {
  if (goal.status === "DONE") {
    return (
      <div className="mb-1.5 flex items-center gap-2.5 rounded-lg bg-white px-2.5 py-2.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#22C55E]">
          <svg
            viewBox="0 0 24 24"
            width="11"
            height="11"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <span className="flex-1 text-[13.5px] font-medium text-[#1F2937]">
          {goal.title}
        </span>
        <button
          onClick={onToggleCarry}
          className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[11px] font-semibold ${
            goal.carryForward
              ? "border-[#F97316] bg-[#F97316] text-white"
              : "border-[#E5E1D8] bg-white text-[#6B7280]"
          }`}
        >
          {goal.carryForward ? "\u2713 Repeating" : "Repeat next week"}
        </button>
      </div>
    );
  }

  if (!goal.reviewEntry) {
    return (
      <div className="mb-1.5 flex items-center gap-2.5 rounded-lg bg-white px-2.5 py-2.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-[#FB923C] bg-[#FFEFDD]">
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="#FB923C"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <line x1="6" y1="12" x2="18" y2="12" />
          </svg>
        </span>
        <div className="flex-1">
          <div className="text-[13.5px] font-medium text-[#1F2937]">
            {goal.title}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-[#FB923C]">
            <span className="h-[5px] w-[5px] rounded-full bg-[#FB923C]" />
            Needs a reason before it can move on
          </div>
        </div>
        <button
          onClick={onReflect}
          className="shrink-0 whitespace-nowrap rounded-full border border-[#FB923C] px-2.5 py-1.5 text-[11px] font-semibold text-[#FB923C] hover:bg-[#FFF3E7]"
        >
          Reflect
        </button>
      </div>
    );
  }

  const carried = goal.reviewEntry.choice === "CARRY";
  return (
    <div className="mb-1.5 flex items-center gap-2.5 rounded-lg bg-white px-2.5 py-2.5">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${carried ? "bg-[#FFF1E4]" : "bg-[#F3F4F6]"}`}
      >
        {carried ? (
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="#F97316"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="#9CA3AF"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18" />
            <path d="M6 6l12 12" />
          </svg>
        )}
      </span>
      <div className="flex-1">
        <div className="text-[13.5px] font-medium text-[#1F2937]">
          {goal.title}
        </div>
        <div className="mt-0.5 text-[11.5px] italic text-[#9CA3AF]">
          &ldquo;{goal.reviewEntry.reason ?? "..."}&rdquo; &mdash;{" "}
          {carried ? "carried to next week" : "cancelled"}{" "}
          <button
            onClick={onReflect}
            className="not-italic font-semibold text-[#F97316]"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

function ReflectSheet({
  goal,
  disabled,
  onClose,
  onSubmit,
}: {
  goal: Goal;
  disabled: boolean;
  onClose: () => void;
  onSubmit: (reason: string, choice: Choice) => void;
}) {
  const [reason, setReason] = useState(goal.reviewEntry?.reason ?? "");
  const filled = reason.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-[rgba(31,41,55,0.35)]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] rounded-t-[20px] bg-white px-5 pb-7 pt-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3.5 h-1 w-9 rounded-full bg-[#E5E1D8]" />
        <p className="mb-0.5 font-serif text-[17px] font-semibold text-[#1F2937]">
          What got in the way?
        </p>
        <p className="mb-4 text-[12.5px] text-[#9CA3AF]">{goal.title}</p>

        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={disabled}
          placeholder="Be honest — this is just for you to see the pattern..."
          className="min-h-[84px] w-full resize-none rounded-lg border border-[#E5E1D8] bg-[#FCFBF8] px-3 py-2.5 text-sm text-[#1F2937] outline-none focus:border-[#FB923C]"
        />
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#9CA3AF]">
          A quick, honest reason here — no judgment, just data you can actually
          use.
        </p>

        <div className="mt-4 flex gap-2.5">
          <button
            disabled={!filled || disabled}
            onClick={() => onSubmit(reason.trim(), "CANCEL")}
            className="flex-1 rounded-lg bg-[#F3F4F6] py-2.5 text-sm font-semibold text-[#6B7280] disabled:opacity-40"
          >
            Cancel goal
          </button>
          <button
            disabled={!filled || disabled}
            onClick={() => onSubmit(reason.trim(), "CARRY")}
            className="flex-1 rounded-lg bg-[#F97316] py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Carry to next week
          </button>
        </div>
      </div>
    </div>
  );
}
