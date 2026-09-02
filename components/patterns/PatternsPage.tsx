"use client";

import { useEffect, useRef, useState } from "react";
import { CARD_ORDER, CARD_THEME, renderPatternCard, type PatternsData } from "./cardContent";

/**
 * Approximate rendered height of the global <BottomNav /> (pt-2.5 + 19px
 * icon + gap + label line + pb-2.5, rounded up for breathing room). The
 * scroll region below is sized to the viewport MINUS this, so a card at
 * height:100% of that region can never be partially hidden behind the
 * nav — that's what "no leakage" actually depends on, not the snap
 * behavior itself.
 */
const NAV_CLEARANCE = "64px";

export function PatternsPage() {
  const [data, setData] = useState<PatternsData | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const [visible, setVisible] = useState<Set<number>>(new Set([0]));
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/patterns");
      if (res.ok) setData(await res.json());
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!data) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = cardRefs.current.indexOf(entry.target as HTMLElement);
          if (idx === -1) return;
          if (entry.isIntersecting) {
            setVisible((prev) => new Set(prev).add(idx));
            if (entry.intersectionRatio > 0.6) setActiveIndex(idx);
          }
        });
      },
      { root: containerRef.current, threshold: [0.6] }
    );
    cardRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [data]);

  function goTo(i: number) {
    cardRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[#9CA3AF]">Gathering your patterns...</div>;
  }
  if (!data) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[#9CA3AF]">Couldn&apos;t load this right now.</div>;
  }

  return (
    <div className="flex justify-center bg-[#FFF9F2]">
      <div className="w-full max-w-[440px]">
        {/*
          Fixed, viewport-anchored scroll region — NOT normal document
          flow. top:0 and bottom:NAV_CLEARANCE together define its exact
          height, so "100%" on each card below is unambiguous and can
          never include any sliver of the next card or the bottom nav.
        */}
        <div
          ref={containerRef}
          className="fixed left-1/2 top-0 w-full max-w-[440px] -translate-x-1/2 snap-y snap-mandatory overflow-y-auto"
          style={{ bottom: `calc(${NAV_CLEARANCE} + env(safe-area-inset-bottom))` }}
        >
          {CARD_ORDER.map((id, i) => (
            <section
              key={id}
              ref={(el) => { cardRefs.current[i] = el; }}
              className="h-full w-full snap-start"
              style={{ background: CARD_THEME[id] }}
            >
              <div
                className={`flex h-full w-full flex-col p-6 transition-all duration-500 ease-out ${
                  visible.has(i) ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.97] opacity-0"
                }`}
              >
                <Brand />
                {renderPatternCard(id, data)}
              </div>
            </section>
          ))}
        </div>

        {/* side dots */}
        <div className="fixed right-3.5 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
          {CARD_ORDER.map((id, i) => (
            <button
              key={id}
              onClick={() => goTo(i)}
              aria-label={`Go to ${id}`}
              className={`rounded-full transition-all ${
                activeIndex === i ? "h-4 w-1.5 bg-[#F97316]" : "h-1.5 w-1.5 bg-[#E5E1D8]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="mb-5 flex items-center gap-2">
      <div className="grid h-4 w-4 grid-cols-2 grid-rows-2 gap-[2px]">
        <span className="rounded-[2px] bg-white/50" />
        <span className="rounded-[2px] bg-[#F97316]" />
        <span className="rounded-[2px] bg-white/50" />
        <span className="rounded-[2px] bg-white/50" />
      </div>
      <span className="font-serif text-[13px] font-semibold text-black/35">Quadrant &middot; Patterns</span>
    </div>
  );
}
