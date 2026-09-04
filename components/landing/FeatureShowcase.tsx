"use client";

import { useState } from "react";

export function FeatureShowcase() {
  // Feature 1 State: Active selected role & completed goals
  const [activeRoleId, setActiveRoleId] = useState<string>("career");
  const [completedGoals, setCompletedGoals] = useState<Record<string, boolean>>({
    health: true,
  });

  function toggleGoal(id: string) {
    setCompletedGoals((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Feature 2 State: Interactive votes on Growth Ring
  const [votes, setVotes] = useState<number>(18);
  const [isSimulatingVote, setIsSimulatingVote] = useState<boolean>(false);

  function addSimulatedVote() {
    setIsSimulatingVote(true);
    setVotes((v) => (v >= 24 ? 18 : v + 1));
    setTimeout(() => setIsSimulatingVote(false), 800);
  }

  // Feature 3 State: Sunday Review interactive decision
  const [reviewChoice, setReviewChoice] = useState<"IDLE" | "CARRY" | "CANCEL">("IDLE");

  return (
    <div className="mt-12 space-y-12">
      {/* 
        FEATURE 01: ROLE ARCHITECTURE
        Outer container is calm, stable, and un-distorted.
        Interaction is 100% focused on the role blocks and domain balance gauge.
      */}
      <div className="rounded-3xl border border-[#ECE8DF] bg-white/90 p-6 shadow-sm sm:p-10">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-md">
            <span className="rounded-md bg-[#EFF6FF] px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-[#2563EB]">
              Feature 01
            </span>
            <h3 className="mt-2.5 font-serif text-2xl font-bold tracking-tight text-[#1F2937] sm:text-3xl">
              Role Architecture
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-[#6B7280]">
              Assign your energy across your whole self. When you schedule for your health, mind, and relationships with the same gravity as your work, balance stops being accidental.
            </p>
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
              <div className="flex items-center justify-between font-mono text-[11px] font-semibold text-blue-900">
                <span>Active Domain:</span>
                <span className="uppercase text-blue-700">{activeRoleId}</span>
              </div>
              <p className="mt-1 text-xs text-blue-800/80">
                Tap or hover each role on the right to see how Quadrant balances your life.
              </p>
            </div>
          </div>

          {/* THE FEATURE EXAMPLE UI (Interactive Role Blocks) */}
          <div className="w-full max-w-md space-y-3">
            {/* Career Role Block */}
            <div
              onMouseEnter={() => setActiveRoleId("career")}
              onClick={() => setActiveRoleId("career")}
              className={`group flex cursor-pointer items-center justify-between rounded-xl border-l-4 bg-white p-3.5 shadow-sm transition-all duration-300 ${
                activeRoleId === "career"
                  ? "border-blue-600 ring-2 ring-blue-500/20 shadow-md translate-x-1"
                  : "border-blue-300 hover:border-blue-500 hover:translate-x-0.5"
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGoal("career");
                  }}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    completedGoals.career
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 hover:border-blue-500"
                  }`}
                  aria-label="Toggle career goal"
                >
                  {completedGoals.career && <span className="text-xs font-bold">&#10003;</span>}
                </button>
                <div>
                  <span className="font-mono text-[10px] font-bold text-blue-600">
                    CAREER // FOUNDER
                  </span>
                  <p
                    className={`text-sm font-semibold transition-colors ${
                      completedGoals.career ? "text-gray-400 line-through" : "text-[#1F2937]"
                    }`}
                  >
                    Ship zero-knowledge auth v2
                  </p>
                </div>
              </div>
              <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-700">
                Quad II
              </span>
            </div>

            {/* Health Role Block */}
            <div
              onMouseEnter={() => setActiveRoleId("health")}
              onClick={() => setActiveRoleId("health")}
              className={`group flex cursor-pointer items-center justify-between rounded-xl border-l-4 bg-white p-3.5 shadow-sm transition-all duration-300 ${
                activeRoleId === "health"
                  ? "border-emerald-600 ring-2 ring-emerald-500/20 shadow-md translate-x-1"
                  : "border-emerald-300 hover:border-emerald-500 hover:translate-x-0.5"
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGoal("health");
                  }}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    completedGoals.health
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-gray-300 hover:border-emerald-500"
                  }`}
                  aria-label="Toggle health goal"
                >
                  {completedGoals.health && <span className="text-xs font-bold">&#10003;</span>}
                </button>
                <div>
                  <span className="font-mono text-[10px] font-bold text-emerald-600">
                    HEALTH // ATHLETE
                  </span>
                  <p
                    className={`text-sm font-semibold transition-colors ${
                      completedGoals.health ? "text-gray-400 line-through" : "text-[#1F2937]"
                    }`}
                  >
                    3x Zone-2 Run (45 min)
                  </p>
                </div>
              </div>
              <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
                {completedGoals.health ? "Vote Logged ✓" : "Vote +1"}
              </span>
            </div>

            {/* Relationships Role Block */}
            <div
              onMouseEnter={() => setActiveRoleId("relationships")}
              onClick={() => setActiveRoleId("relationships")}
              className={`group flex cursor-pointer items-center justify-between rounded-xl border-l-4 bg-white p-3.5 shadow-sm transition-all duration-300 ${
                activeRoleId === "relationships"
                  ? "border-orange-600 ring-2 ring-orange-500/20 shadow-md translate-x-1"
                  : "border-orange-300 hover:border-orange-500 hover:translate-x-0.5"
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGoal("relationships");
                  }}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    completedGoals.relationships
                      ? "border-orange-600 bg-orange-600 text-white"
                      : "border-gray-300 hover:border-orange-500"
                  }`}
                  aria-label="Toggle relationships goal"
                >
                  {completedGoals.relationships && <span className="text-xs font-bold">&#10003;</span>}
                </button>
                <div>
                  <span className="font-mono text-[10px] font-bold text-orange-600">
                    RELATIONSHIPS // SIBLING
                  </span>
                  <p
                    className={`text-sm font-semibold transition-colors ${
                      completedGoals.relationships
                        ? "text-gray-400 line-through"
                        : "text-[#1F2937]"
                    }`}
                  >
                    Sunday dinner & phone call
                  </p>
                </div>
              </div>
              <span className="rounded bg-orange-50 px-2 py-0.5 font-mono text-[10px] font-bold text-orange-700">
                Priority
              </span>
            </div>

            {/* Live Domain Energy Meter */}
            <div className="rounded-lg bg-[#FAF8F5] p-2.5">
              <div className="flex justify-between font-mono text-[10px] text-gray-500">
                <span>3 Roles Covered This Week</span>
                <span className="font-semibold text-[#1F2937]">100% Balanced</span>
              </div>
              <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div className="w-1/3 bg-blue-500 transition-all duration-500" />
                <div className="w-1/3 bg-emerald-500 transition-all duration-500" />
                <div className="w-1/3 bg-orange-500 transition-all duration-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 
        FEATURE 02: CUMULATIVE ANNUAL GROWTH RINGS
        Outer container is calm, stable, and un-distorted.
        Interaction is 100% focused on the interactive Growth Ring console.
      */}
      <div className="rounded-3xl border border-[#ECE8DF] bg-white/90 p-6 shadow-sm sm:p-10">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-md">
            <span className="rounded-md bg-[#FFF7ED] px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-[#EA580C]">
              Feature 02
            </span>
            <h3 className="mt-2.5 font-serif text-2xl font-bold tracking-tight text-[#1F2937] sm:text-3xl">
              Cumulative Annual Growth Rings
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-[#6B7280]">
              A tree records rainy seasons and dry seasons alike. It never resets to zero. Your completed goals deposit votes toward your annual growth rings, sealed every December 31 into an indelible identity record.
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={addSimulatedVote}
                className="inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 font-mono text-xs font-bold text-white shadow-sm transition-all hover:bg-[#C2410C] hover:shadow active:scale-95"
              >
                <span>+ Simulate Goal Completion</span>
                <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">Vote +1</span>
              </button>
            </div>
          </div>

          {/* THE FEATURE EXAMPLE UI (Interactive Ring Console) */}
          <div className="flex w-full max-w-md flex-col items-center justify-center rounded-2xl border border-[#FED7AA]/70 bg-gradient-to-br from-[#FFFDF9] to-[#FFF7ED] p-6 shadow-sm">
            <div className="flex items-center gap-6">
              {/* Dynamic Conic Ring */}
              <div
                className={`relative flex h-28 w-28 items-center justify-center rounded-full p-[4px] shadow-inner transition-transform duration-500 ${
                  isSimulatingVote ? "scale-110 rotate-6" : ""
                }`}
                style={{
                  background: `conic-gradient(#F97316 0deg, #F97316 ${
                    (votes / 24) * 360
                  }deg, #F3F4F6 ${(votes / 24) * 360}deg, #F3F4F6 360deg)`,
                  transition: "background 0.4s ease, transform 0.3s ease",
                }}
              >
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white shadow-xs">
                  <span className="font-serif text-xl font-black text-[#1F2937]">2026</span>
                  <span className="font-mono text-[9px] font-bold text-[#EA580C]">
                    {votes} VOTES
                  </span>
                </div>
              </div>

              {/* Ring Metadata Details */}
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-[#EA580C]">
                  <span className="h-2 w-2 rounded-full bg-[#EA580C] animate-pulse" />
                  <span>RINGS STATUS: ACTIVE</span>
                </div>
                <div className="font-serif text-lg font-bold text-[#1F2937]">
                  Founder &bull; Year 3
                </div>
                <div className="text-xs text-[#6B7280]">
                  <strong className="text-[#1F2937]">{votes} permanent votes</strong> logged.
                </div>
                <div className="mt-1 font-mono text-[9.5px] text-[#9CA3AF]">
                  Seals Dec 31 &bull; Never resets to zero
                </div>
              </div>
            </div>

            {/* Live Vote Log Banner */}
            <div className="mt-4 w-full rounded-lg border border-orange-200/80 bg-white/90 px-3 py-1.5 text-center font-mono text-[10.5px] text-[#EA580C]">
              {isSimulatingVote
                ? "🎉 +1 Vote Cast! Tree ring permanently expanded."
                : "Tap '+ Simulate Goal Completion' to test vote logging."}
            </div>
          </div>
        </div>
      </div>

      {/* 
        FEATURE 03: THE HONEST SUNDAY REVIEW
        Outer container is calm, stable, and un-distorted.
        Interaction is 100% focused on the interactive Sunday reflection decision.
      */}
      <div className="rounded-3xl border border-[#ECE8DF] bg-white/90 p-6 shadow-sm sm:p-10">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-md">
            <span className="rounded-md bg-[#F0FDF4] px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-[#16A34A]">
              Feature 03
            </span>
            <h3 className="mt-2.5 font-serif text-2xl font-bold tracking-tight text-[#1F2937] sm:text-3xl">
              The Honest Sunday Review
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-[#6B7280]">
              Missed a goal? Good. Life happens. On Sunday, Quadrant prompts a brief reflection: Was it unrealistic? Did emergencies hit? You choose to Carry or Cancel without guilt or red warning bells.
            </p>
            <p className="mt-3 font-mono text-xs text-[#16A34A]">
              &rarr; Test both choices below to experience guilt-free weekly closure.
            </p>
          </div>

          {/* THE FEATURE EXAMPLE UI (Interactive Reflection Decision Modal) */}
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300">
            {reviewChoice === "IDLE" && (
              <>
                <div className="border-b border-gray-100 pb-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase text-[#9CA3AF]">
                      SUNDAY REFLECTION RITUAL
                    </span>
                    <span className="rounded bg-amber-50 px-2 py-0.5 font-mono text-[10px] text-amber-700">
                      Uncompleted
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-[#1F2937]">
                    Goal: Complete thesis chapter 4
                  </p>
                </div>

                <div className="my-3 rounded-lg bg-[#FAF8F5] p-3 text-left">
                  <span className="font-mono text-[9px] uppercase text-gray-400">
                    Your Honest Reason (Encrypted):
                  </span>
                  <p className="mt-0.5 text-xs italic text-[#4B5563]">
                    &ldquo;Flu on Thursday; shifted focus to resting so I could show up healthy on Monday.&rdquo;
                  </p>
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setReviewChoice("CANCEL")}
                    className="flex-1 rounded-xl bg-gray-100 py-2.5 text-center font-mono text-xs font-bold text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    CANCEL WITHOUT GUILT
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewChoice("CARRY")}
                    className="flex-1 rounded-xl bg-[#F97316] py-2.5 text-center font-mono text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#EA6A0C]"
                  >
                    CARRY TO NEXT WEEK
                  </button>
                </div>
              </>
            )}

            {reviewChoice === "CARRY" && (
              <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-4 text-center">
                <span className="rounded-full bg-orange-200 px-2.5 py-0.5 font-mono text-[10px] font-bold text-orange-800">
                  ACTION: CARRIED FORWARD
                </span>
                <p className="mt-2 text-sm font-bold text-[#1F2937]">
                  Rolled into Next Week&apos;s Big Rocks
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  Clean slate. No streak broken. The honest reflection was saved as valuable wisdom.
                </p>
                <button
                  type="button"
                  onClick={() => setReviewChoice("IDLE")}
                  className="mt-3 font-mono text-[10.5px] font-semibold text-[#EA580C] underline underline-offset-2 hover:text-[#9A3412]"
                >
                  ↻ Try another decision
                </button>
              </div>
            )}

            {reviewChoice === "CANCEL" && (
              <div className="rounded-xl border border-gray-200 bg-gray-50/90 p-4 text-center">
                <span className="rounded-full bg-gray-200 px-2.5 py-0.5 font-mono text-[10px] font-bold text-gray-700">
                  ACTION: CANCELLED PEACEFULLY
                </span>
                <p className="mt-2 text-sm font-bold text-[#1F2937]">
                  Removed Without Penalty
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  Priorities evolve. Energy reclaimed for what matters now. Zero shame, zero guilt.
                </p>
                <button
                  type="button"
                  onClick={() => setReviewChoice("IDLE")}
                  className="mt-3 font-mono text-[10.5px] font-semibold text-gray-700 underline underline-offset-2 hover:text-black"
                >
                  ↻ Try another decision
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
