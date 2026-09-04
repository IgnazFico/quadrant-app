"use client";

import { useState } from "react";

export function ParadigmComparison() {
  const [brokenHovered, setBrokenHovered] = useState(false);
  const [quadrantHovered, setQuadrantHovered] = useState(false);

  return (
    <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-2">
      {/* 
        CONTAINER 1: THE BROKEN CONVENTIONAL WAY
        Visually styled like a fracturing, over-burdened system buckling under strain.
        On hover: Fractures deepen, tasks misalign and shudder, overload warning flashes.
      */}
      <div
        onMouseEnter={() => setBrokenHovered(true)}
        onMouseLeave={() => setBrokenHovered(false)}
        className={`relative overflow-hidden rounded-3xl border-2 p-7 transition-all duration-500 sm:p-9 ${
          brokenHovered
            ? "border-rose-400/90 bg-rose-50/70 shadow-2xl shadow-rose-900/10 -translate-y-1"
            : "border-rose-200/80 bg-rose-50/35 shadow-xs"
        }`}
        style={{
          clipPath: brokenHovered
            ? "polygon(0% 0%, 98% 1%, 100% 97%, 1% 100%)"
            : "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          transition: "clip-path 0.4s ease, border-color 0.4s ease, transform 0.4s ease",
        }}
      >
        {/* Subtle Jagged Fracture Line Overlay (Reveals stress crack on hover) */}
        <div
          className={`pointer-events-none absolute -right-6 top-8 h-32 w-32 rotate-45 border-l-2 border-t-2 border-rose-300/40 transition-opacity duration-300 ${
            brokenHovered ? "opacity-100 scale-105" : "opacity-0 scale-95"
          }`}
        />

        {/* System Overload Status Bar */}
        <div className="flex items-center justify-between border-b border-rose-200/70 pb-3.5">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                brokenHovered ? "bg-rose-600 animate-ping" : "bg-rose-400"
              }`}
            />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-rose-800">
              {brokenHovered ? "CRITICAL: SYSTEM BUCKLING UNDER LOAD" : "SYSTEM: OVERLOADED"}
            </span>
          </div>
          <span className="rounded bg-rose-200/60 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-800">
            {brokenHovered ? "CAPACITY: 180%" : "FLAT INBOX"}
          </span>
        </div>

        {/* Header */}
        <div className="mt-5">
          <h3 className="font-serif text-2xl font-bold tracking-tight text-rose-950">
            The Broken Conventional Way
          </h3>
          <p className="mt-1 text-xs text-rose-800/80">
            Single linear task inboxes with zero boundaries crumble the moment urgent noise hits.
          </p>
        </div>

        {/* Fracturing Misaligned Task Items */}
        <div className="mt-6 space-y-3.5">
          {/* Task 1: Tilted left */}
          <div
            className={`rounded-xl border border-rose-200 bg-white/80 p-3.5 shadow-xs transition-transform duration-300 ${
              brokenHovered ? "-rotate-1 -translate-x-1 border-rose-300 bg-white" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase text-rose-500">CHAOTIC TO-DO LIST</span>
              <span className="font-mono text-[9px] text-rose-400">UNPRIORITIZED</span>
            </div>
            <p className="mt-1 text-xs font-semibold text-gray-900">
              Laundry &bull; Fix car &bull; Finish graduation thesis &bull; Answer 84 emails
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              When everything is urgent, the brain defaults to low-value chores while the master goals drown.
            </p>
          </div>

          {/* Task 2: Tilted right */}
          <div
            className={`rounded-xl border border-rose-200 bg-white/80 p-3.5 shadow-xs transition-transform duration-300 delay-75 ${
              brokenHovered ? "rotate-1 translate-x-1.5 border-rose-300 bg-white" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase text-rose-500">GAMIFIED STREAK RESET</span>
              <span className="rounded bg-rose-100 px-1.5 py-0.2 font-mono text-[9px] font-bold text-rose-700">
                DAY 0 RESET
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-gray-900">
              40 days of hard discipline wiped out by one sick Tuesday.
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Binary gamification triggers perfectionist guilt and makes users abandon the app entirely.
            </p>
          </div>

          {/* Task 3: Collapsed bottom block */}
          <div
            className={`rounded-xl border border-rose-200 bg-white/80 p-3.5 shadow-xs transition-transform duration-300 delay-150 ${
              brokenHovered ? "-rotate-[0.5deg] translate-y-1 border-rose-300 bg-white" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase text-rose-500">REACTIVE CALENDAR TETRIS</span>
              <span className="font-mono text-[9px] text-rose-400">EXHAUSTED</span>
            </div>
            <p className="mt-1 text-xs font-semibold text-gray-900">
              Whoever pings loudest on Slack owns 100% of your day.
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              You collapse at 6:00 PM having lived entirely for other people&apos;s urgent emergencies.
            </p>
          </div>
        </div>

        {/* Bottom Failure Notice */}
        <div className="mt-5 border-t border-rose-200/60 pt-3 text-center">
          <p className="font-mono text-[10.5px] font-semibold text-rose-700">
            {brokenHovered
              ? "⚠️ RESULT: COGNITIVE OVERLOAD & CHRONIC BURNOUT"
              : "Hover to see how the conventional model fractures"}
          </p>
        </div>
      </div>

      {/* 
        CONTAINER 2: THE QUADRANT ARCHITECTURE
        Visually styled like an engineered, modular architectural foundation.
        Corner alignment brackets [┌ ┐ └ ┘], interlocking modular beams.
        On hover: The modular pieces smoothly lock into alignment, structural glow lines illuminate.
      */}
      <div
        onMouseEnter={() => setQuadrantHovered(true)}
        onMouseLeave={() => setQuadrantHovered(false)}
        className={`relative overflow-hidden rounded-3xl border-2 p-7 transition-all duration-500 sm:p-9 ${
          quadrantHovered
            ? "border-[#F97316] bg-gradient-to-br from-[#FFFDF9] via-[#FFFBF5] to-[#FFF4E5] shadow-2xl shadow-orange-500/15 -translate-y-1.5"
            : "border-[#FED7AA] bg-gradient-to-br from-[#FFFDF9] to-[#FFF8EE] shadow-sm"
        }`}
      >
        {/* Architectural Blueprint Alignment Brackets */}
        <div className="pointer-events-none absolute left-3.5 top-3.5 font-mono text-[10px] font-bold text-[#F97316]/40 select-none">
          ┌
        </div>
        <div className="pointer-events-none absolute right-3.5 top-3.5 font-mono text-[10px] font-bold text-[#F97316]/40 select-none">
          ┐
        </div>
        <div className="pointer-events-none absolute bottom-3.5 left-3.5 font-mono text-[10px] font-bold text-[#F97316]/40 select-none">
          └
        </div>
        <div className="pointer-events-none absolute bottom-3.5 right-3.5 font-mono text-[10px] font-bold text-[#F97316]/40 select-none">
          ┘
        </div>

        {/* Structural Blueprint Status Bar */}
        <div className="flex items-center justify-between border-b border-[#FDBA74]/40 pb-3.5">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full bg-[#F97316] ${
                quadrantHovered ? "ring-4 ring-orange-300/40" : ""
              }`}
            />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#9A3412]">
              {quadrantHovered ? "ARCHITECTURE: INTERLOCKED & GROUNDED" : "STRUCTURE: 6 LOAD-BEARING DOMAINS"}
            </span>
          </div>
          <span className="rounded bg-[#FED7AA]/60 px-2 py-0.5 font-mono text-[10px] font-bold text-[#9A3412]">
            BALANCED
          </span>
        </div>

        {/* Header */}
        <div className="mt-5">
          <h3 className="font-serif text-2xl font-bold tracking-tight text-[#1F2937]">
            The Quadrant Architecture
          </h3>
          <p className="mt-1 text-xs text-[#6B7280]">
            Engineered modular foundations that distribute your life&apos;s weight evenly across all roles.
          </p>
        </div>

        {/* Interlocking Modular Architectural Beams */}
        <div className="mt-6 space-y-3.5">
          {/* Beam 1: Identity Roles */}
          <div
            className={`rounded-xl border bg-white/95 p-3.5 shadow-xs transition-all duration-300 ${
              quadrantHovered
                ? "border-blue-400 translate-x-1 shadow-md shadow-blue-500/10"
                : "border-[#E5E7EB]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase text-blue-600">
                PILLAR 01 &bull; 6 IDENTITY ROLES
              </span>
              <span className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-blue-700">
                BALANCED
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-gray-900">
              Scholar &bull; Athlete &bull; Sibling &bull; Creator &bull; Confidant &bull; Leader
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              You choose 2–3 Big Rocks per role every Monday morning. Each dimension of who you are gets a voice.
            </p>
          </div>

          {/* Beam 2: Cumulative Growth Rings */}
          <div
            className={`rounded-xl border bg-white/95 p-3.5 shadow-xs transition-all duration-300 delay-75 ${
              quadrantHovered
                ? "border-amber-400 translate-x-1 shadow-md shadow-amber-500/10"
                : "border-[#E5E7EB]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase text-amber-600">
                PILLAR 02 &bull; CUMULATIVE GROWTH RINGS
              </span>
              <span className="rounded bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-700">
                NO RESETS
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-gray-900">
              Grow like a tree. Every completed goal logs a permanent vote.
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              No broken streaks. Your annual growth rings seal every December 31 into an unshakeable identity record.
            </p>
          </div>

          {/* Beam 3: Covey Quad II Foundation */}
          <div
            className={`rounded-xl border bg-white/95 p-3.5 shadow-xs transition-all duration-300 delay-150 ${
              quadrantHovered
                ? "border-orange-400 translate-x-1 shadow-md shadow-orange-500/10"
                : "border-[#E5E7EB]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase text-[#EA580C]">
                PILLAR 03 &bull; COVEY QUADRANT II PLANNING
              </span>
              <span className="rounded bg-orange-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#EA580C]">
                PROTECTED
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-gray-900">
              Important, non-urgent Big Rocks scheduled before reactive noise hits.
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Client-side encrypted with Argon2id + Libsodium. Your sacred space, completely private from advertisers.
            </p>
          </div>
        </div>

        {/* Bottom Architectural Stability Notice */}
        <div className="mt-5 border-t border-[#FDBA74]/40 pt-3 text-center">
          <p className="font-mono text-[10.5px] font-semibold text-[#C2410C]">
            {quadrantHovered
              ? "✓ RESULT: SUSTAINABLE MASTERY & GENUINE LIFE BALANCE"
              : "Hover to see how the architecture pieces together"}
          </p>
        </div>
      </div>
    </div>
  );
}
