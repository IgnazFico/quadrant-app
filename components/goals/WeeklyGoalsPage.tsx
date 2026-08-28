"use client";

import { useEffect, useState, useCallback } from "react";
import { domainColor } from "../../lib/domainColors";

type GoalStatus = "IN_PROGRESS" | "DONE" | "MISSED";
type Goal = {
  id: string;
  title: string;
  status: GoalStatus;
  carryForward: boolean;
};
type Role = { id: string; label: string; domain: string; goals: Goal[] };
type Block = {
  id: string;
  hour: number;
  title: string;
  roleId: string;
  goalId: string | null;
  role: Role;
};

function formatHour(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${period}`;
}

export function WeeklyGoalsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [openRoleId, setOpenRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formRoleId, setFormRoleId] = useState("");
  const [formGoalId, setFormGoalId] = useState<string>("");
  const [formCustomTitle, setFormCustomTitle] = useState("");
  const [formTime, setFormTime] = useState("09:00");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [goalsRes, scheduleRes] = await Promise.all([
        fetch("/api/goals"),
        fetch("/api/schedule"),
      ]);
      if (!goalsRes.ok || !scheduleRes.ok) throw new Error();
      const goalsBody = await goalsRes.json();
      const scheduleBody = await scheduleRes.json();
      setRoles(goalsBody.roles);
      setBlocks(scheduleBody.blocks);
      if (!openRoleId && goalsBody.roles[0])
        setOpenRoleId(goalsBody.roles[0].id);
    } catch {
      setError("Couldn't load your week — try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [openRoleId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleGoal(goal: Goal, roleId: string) {
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
  }

  async function editGoalTitle(goalId: string, roleId: string, title: string) {
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
  }

  async function commitGoalTitle(goalId: string, title: string) {
    await fetch(`/api/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  }

  async function deleteGoal(goalId: string, roleId: string) {
    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId
          ? { ...r, goals: r.goals.filter((g) => g.id !== goalId) }
          : r,
      ),
    );
    setBlocks((prev) => prev.filter((b) => b.goalId !== goalId));
    await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
  }

  async function addGoal(roleId: string, title: string) {
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId, title }),
    });
    if (!res.ok) return;
    const { goal } = await res.json();
    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId ? { ...r, goals: [...r.goals, goal] } : r,
      ),
    );
  }

  async function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    await fetch(`/api/schedule/${id}`, { method: "DELETE" });
  }

  function openScheduleForm(roleId: string, goalId?: string) {
    setFormRoleId(roleId);
    setFormGoalId(goalId ?? "");
    setFormOpen(true);
  }

  async function submitScheduleForm() {
    const role = roles.find((r) => r.id === formRoleId);
    if (!role) return;
    const goal = role.goals.find((g) => g.id === formGoalId);
    const title = goal ? goal.title : formCustomTitle.trim();
    if (!title) return;

    const [h] = formTime.split(":").map(Number);
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleId: role.id,
        goalId: goal ? goal.id : null,
        hour: h,
        title,
      }),
    });
    if (!res.ok) return;
    const { block } = await res.json();
    setBlocks((prev) => [...prev, block].sort((a, b) => a.hour - b.hour));
    setFormOpen(false);
    setFormCustomTitle("");
  }

  const totalGoals = roles.reduce((a, r) => a + r.goals.length, 0);
  const doneGoals = roles.reduce(
    (a, r) => a + r.goals.filter((g) => g.status === "DONE").length,
    0,
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#9CA3AF]">
        Loading your week...
      </div>
    );
  }

  return (
    <div className="flex justify-center bg-[#FFF9F2] px-[18px] pb-24 pt-5">
      <div className="w-full max-w-[420px]">
        <div className="mb-5 flex items-center justify-between">
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
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        <h1 className="mb-1 font-serif text-2xl font-semibold text-[#1F2937]">
          This week
        </h1>
        <p className="mb-6 text-[13px] text-[#6B7280]">
          Your roles, their goals, and where today fits in.
        </p>

        {error && (
          <p className="mb-4 rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">
            {error}
          </p>
        )}

        {/* TODAY */}
        <section className="mb-7">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-base font-semibold text-[#1F2937]">
              Today
            </h2>
            <span className="font-mono text-[11px] text-[#9CA3AF]">
              {blocks.length > 0 ? `${blocks.length} scheduled` : ""}
            </span>
          </div>

          <div className="rounded-[14px] bg-[#F3F4F6] px-3.5 pb-1.5 pt-3.5">
            {blocks.length === 0 ? (
              <p className="px-1 pb-3.5 text-[13px] text-[#9CA3AF]">
                Nothing scheduled yet — pull a goal into today below.
              </p>
            ) : (
              blocks.map((b) => (
                <div key={b.id} className="mb-3 flex gap-2.5">
                  <span className="w-11 shrink-0 pt-0.5 font-mono text-[11px] text-[#6B7280]">
                    {formatHour(b.hour)}
                  </span>
                  <div
                    className="flex flex-1 items-center justify-between gap-2 rounded-lg border-l-[3px] bg-white px-3 py-2.5"
                    style={{ borderColor: domainColor(b.role.domain) }}
                  >
                    <div>
                      <div className="text-[13.5px] font-medium text-[#1F2937]">
                        {b.title}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-[#9CA3AF]">
                        {b.role.label}
                      </div>
                    </div>
                    <button
                      onClick={() => removeBlock(b.id)}
                      className="text-[#C9CBCF] hover:text-[#9CA3AF]"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="15"
                        height="15"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M18 6 6 18" />
                        <path d="M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {!formOpen ? (
            <button
              onClick={() => openScheduleForm(roles[0]?.id ?? "")}
              className="mt-2.5 w-full rounded-lg border border-dashed border-[#D8D3C8] py-2.5 text-xs font-medium text-[#8A8579] hover:bg-[#EFEBE1]"
            >
              + Schedule something today
            </button>
          ) : (
            <div className="mt-2.5 flex flex-col gap-2 rounded-lg bg-white p-3">
              <div className="flex gap-2">
                <select
                  value={formRoleId}
                  onChange={(e) => {
                    setFormRoleId(e.target.value);
                    setFormGoalId("");
                  }}
                  className="flex-1 rounded-md border border-[#E5E1D8] bg-[#FCFBF8] px-2 py-2 text-[13px]"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="w-28 rounded-md border border-[#E5E1D8] bg-[#FCFBF8] px-2 py-2 text-[13px]"
                />
              </div>
              <select
                value={formGoalId}
                onChange={(e) => setFormGoalId(e.target.value)}
                className="rounded-md border border-[#E5E1D8] bg-[#FCFBF8] px-2 py-2 text-[13px]"
              >
                <option value="">Something else...</option>
                {roles
                  .find((r) => r.id === formRoleId)
                  ?.goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
              </select>
              {!formGoalId && (
                <input
                  type="text"
                  placeholder="Describe it"
                  value={formCustomTitle}
                  onChange={(e) => setFormCustomTitle(e.target.value)}
                  className="rounded-md border border-[#E5E1D8] bg-[#FCFBF8] px-2 py-2 text-[13px]"
                />
              )}
              <button
                onClick={submitScheduleForm}
                className="self-end rounded-md bg-[#F97316] px-4 py-2 text-xs font-semibold text-white hover:bg-[#EA6A0C]"
              >
                Add to today
              </button>
            </div>
          )}
        </section>

        {/* WEEKLY GOALS */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-base font-semibold text-[#1F2937]">
              Weekly goals by role
            </h2>
            <span className="font-mono text-[11px] text-[#9CA3AF]">
              {doneGoals} of {totalGoals} done
            </span>
          </div>

          {roles.map((role) => {
            const open = role.id === openRoleId;
            const color = domainColor(role.domain);
            return (
              <div
                key={role.id}
                className="mb-2.5 overflow-hidden rounded-[10px] border-l-[3px] bg-[#F3F4F6]"
                style={{ borderColor: color }}
              >
                <button
                  onClick={() => setOpenRoleId(open ? null : role.id)}
                  className="flex w-full items-center justify-between px-3.5 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[14.5px] font-semibold text-[#1F2937]">
                      {role.label}
                    </span>
                    <span className="font-mono text-[11px] text-[#9CA3AF]">
                      {role.goals.filter((g) => g.status === "DONE").length}/
                      {role.goals.length}
                    </span>
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {open && (
                  <div className="px-3.5 pb-3.5">
                    {role.goals.map((g) => (
                      <div
                        key={g.id}
                        className="mb-1.5 flex items-center gap-2 rounded-lg bg-white py-2 pl-2.5 pr-2"
                      >
                        <button
                          onClick={() => toggleGoal(g, role.id)}
                          className={`flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] ${
                            g.status === "DONE"
                              ? "border-[#22C55E] bg-[#22C55E]"
                              : "border-[#D6D2C8] bg-white"
                          }`}
                        >
                          {g.status === "DONE" && (
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
                          )}
                        </button>
                        <input
                          value={g.title}
                          onChange={(e) =>
                            editGoalTitle(g.id, role.id, e.target.value)
                          }
                          onBlur={(e) => commitGoalTitle(g.id, e.target.value)}
                          className={`flex-1 bg-transparent p-0.5 text-[13.5px] ${
                            g.status === "DONE"
                              ? "text-[#B3AFA6] line-through"
                              : "text-[#1F2937]"
                          }`}
                        />
                        <button
                          onClick={() => openScheduleForm(role.id, g.id)}
                          className="shrink-0 p-0.5 text-[#C9CBCF] hover:text-[#F97316]"
                          aria-label="Add to today"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="15"
                            height="15"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="9" />
                            <polyline points="12 7 12 12 15 14" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteGoal(g.id, role.id)}
                          className="shrink-0 p-0.5 text-[#C9CBCF] hover:text-[#E15656]"
                          aria-label="Delete goal"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="15"
                            height="15"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <path d="M18 6 6 18" />
                            <path d="M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <AddGoalRow onAdd={(title) => addGoal(role.id, title)} />
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>
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
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
