"use client";

import { useState } from "react";

type StatCardProps = {
  id: string;
  tag: string;
  sourceBadge: string;
  badgeBg: string;
  badgeText: string;
  stat: string;
  statColor?: string;
  punchline: string;
  brief: string;
  fullExplanation: string;
  takeaway: string;
  takeawayColor: string;
  backBgGradient: string;
};

const STATS_DATA: StatCardProps[] = [
  {
    id: "stat-1",
    tag: "REALITY CHECK // 01",
    sourceBadge: "Handshake 2023",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-700",
    stat: "80%",
    statColor: "text-rose-600",
    punchline: "Burned out before Day 1 of work.",
    brief: "Graduating college seniors reporting chronic burnout before their career begins.",
    fullExplanation:
      "Handshake's landmark survey of the Class of 2024 revealed that 80% experienced severe burnout while still in school. Chasing endless GPA checkboxes, internship applications, and extracurricular streaks without role boundaries breaks ambition before it even starts.",
    takeaway: "Why Quadrant starts with your life roles, not a giant to-do backlog.",
    takeawayColor: "text-[#EA580C]",
    backBgGradient: "from-[#FFF7ED] via-[#FFF1E4] to-[#FFEDD5]",
  },
  {
    id: "stat-2",
    tag: "REALITY CHECK // 02",
    sourceBadge: "APA 2023",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
    stat: "46%",
    statColor: "text-[#D97706]",
    punchline: "Young adults in chronic urgency overload.",
    brief: "Gen Z adults living in persistent fatigue from reactive calendar firefighting.",
    fullExplanation:
      "The American Psychological Association (2023) discovered nearly half of Gen Z suffers from chronic mental fatigue. The primary driver is not long hours, but living in reactive mode—putting out 50 mundane Slack or email fires while high-importance personal goals starve.",
    takeaway: "Why we lock in Stephen Covey Quad II Big Rocks first every week.",
    takeawayColor: "text-[#D97706]",
    backBgGradient: "from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A]",
  },
  {
    id: "stat-3",
    tag: "CULTURAL SHIFT // 03",
    sourceBadge: "Cultural Pivot",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-800",
    stat: "2022",
    statColor: "text-[#2563EB]",
    punchline: "The 'Quiet Quitting' cultural reckoning.",
    brief: "The global moment employees realized doing more doesn't equal living well.",
    fullExplanation:
      "In 2022, tens of millions realized that donating all their discretionary energy to an urgent employer inbox while their fitness, relationships, and craft wither away isn't dedication—it's just bad math. It wasn't about quitting effort; it was about reclaiming human life.",
    takeaway: "Why Quadrant balances 6 human domains so nothing is forgotten.",
    takeawayColor: "text-[#2563EB]",
    backBgGradient: "from-[#EFF6FF] via-[#DBEAFE] to-[#BFDBFE]",
  },
  {
    id: "stat-4",
    tag: "EXECUTIVE VERDICT // 04",
    sourceBadge: "HBR 2024",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
    stat: "HBR",
    statColor: "text-[#059669]",
    punchline: "'Let's End Toxic Productivity.'",
    brief: "Harvard Business Review formally declared industrial output metrics broken.",
    fullExplanation:
      "When Harvard Business Review (2024) published 'Let's End Toxic Productivity', the corporate establishment officially conceded what Quadrant assumed from inception: treating human beings like manufacturing widgets destroys creative capacity and happiness.",
    takeaway: "Built for the post-toxic productivity era: grow like a tree.",
    takeawayColor: "text-[#059669]",
    backBgGradient: "from-[#F0FDF4] via-[#DCFCE7] to-[#BBF7D0]",
  },
];

export function EvidenceCards() {
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  function toggleCard(id: string) {
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {STATS_DATA.map((item) => {
        const isFlipped = !!flippedCards[item.id];

        return (
          <div
            key={item.id}
            onClick={() => toggleCard(item.id)}
            className="group perspective-1000 h-[340px] w-full cursor-pointer select-none"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleCard(item.id);
              }
            }}
            aria-label={`${item.punchline} - click to flip for details`}
          >
            {/* 3D Flipping Container */}
            <div
              className={`preserve-3d relative h-full w-full rounded-2xl transition-transform duration-700 ease-out group-hover:rotate-y-180 ${
                isFlipped ? "rotate-y-180" : ""
              }`}
            >
              {/* FRONT FACE */}
              <div className="backface-hidden absolute inset-0 flex flex-col justify-between rounded-2xl border border-[#E5E7EB]/90 bg-white/95 p-6 shadow-sm backdrop-blur-md transition-all duration-300 group-hover:border-[#F97316]/50 group-hover:shadow-xl">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                      {item.tag}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${item.badgeBg} ${item.badgeText}`}
                    >
                      {item.sourceBadge}
                    </span>
                  </div>

                  <div
                    className={`mt-4 font-serif text-5xl font-black tracking-tight ${
                      item.statColor ?? "text-[#1F2937]"
                    }`}
                  >
                    {item.stat}
                  </div>

                  <p className="mt-2.5 font-sans text-sm font-bold text-[#111827]">
                    {item.punchline}
                  </p>

                  <p className="mt-2 text-xs leading-relaxed text-[#6B7280]">
                    {item.brief}
                  </p>
                </div>

                <div className="border-t border-[#F3F4F6] pt-3">
                  <div className="flex items-center justify-between font-mono text-[10.5px] font-medium text-[#9CA3AF] transition-colors group-hover:text-[#EA580C]">
                    <span>↻ Flip for reality check</span>
                    <span className="text-xs">&rarr;</span>
                  </div>
                </div>
              </div>

              {/* BACK FACE */}
              <div
                className={`backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-between rounded-2xl border border-[#FDBA74]/50 bg-gradient-to-br ${item.backBgGradient} p-6 shadow-xl backdrop-blur-md`}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-black/5 pb-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                      THE DEEPER PROOF
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${item.badgeBg} ${item.badgeText}`}
                    >
                      {item.sourceBadge}
                    </span>
                  </div>

                  <p className="mt-3.5 text-xs leading-relaxed text-[#374151]">
                    {item.fullExplanation}
                  </p>
                </div>

                <div className="border-t border-black/5 pt-3">
                  <p
                    className={`font-mono text-[11px] font-semibold leading-tight ${item.takeawayColor}`}
                  >
                    &rarr; {item.takeaway}
                  </p>
                  <p className="mt-2 text-right font-mono text-[9.5px] text-[#9CA3AF]">
                    ↻ Tap to flip back
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
