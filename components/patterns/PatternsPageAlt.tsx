"use client";

import { useEffect, useRef, useState } from "react";
import { CARD_ORDER, renderPatternCard, type PatternsData } from "./cardContent";

/**
 * ALTERNATIVE to PatternsPage.tsx — only reach for this if native
 * scroll-snap proves unreliable on a real target device (older Safari
 * versions and some in-app WebViews have historically had partial or
 * buggy scroll-snap support; dynamic mobile viewport height changing as
 * browser chrome shows/hides has also caused snap misalignment in the
 * wild). This version doesn't use scroll-snap or overflow-scroll at all.
 *
 * How it works: all cards are stacked in the same position (absolute,
 * inset-0). Only ONE index is "current." Moving between cards is just a
 * CSS transform (translateY) on a wrapper, animated with a plain CSS
 * transition — so the motion itself is still 100% CSS, only the
 * "which index is active" bookkeeping is JS. This can never leak an
 * adjacent card because there's no scrollable overflow to misjudge —
 * the wrapper is exactly one viewport-minus-nav tall, always.
 *
 * Advancing is triggered by wheel/touch gestures and the same side dots.
 * It's self-sufficient (fetches its own data), so swapping it in for
 * PatternsPage in app/(app)/patterns/page.tsx is a one-line import change
 * — no other wiring needed.
 */
const NAV_CLEARANCE = "64px";

export function PatternsPageAlt() {
  const [data, setData] = useState<PatternsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const wheelLock = useRef(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/patterns");
      if (res.ok) setData(await res.json());
      setLoading(false);
    })();
  }, []);

  function go(delta: number) {
    setIndex((i) => Math.min(Math.max(i + delta, 0), CARD_ORDER.length - 1));
  }

  function onWheel(e: React.WheelEvent) {
    if (wheelLock.current) return;
    if (Math.abs(e.deltaY) < 12) return;
    wheelLock.current = true;
    go(e.deltaY > 0 ? 1 : -1);
    setTimeout(() => { wheelLock.current = false; }, 550); // matches the CSS transition duration below
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(delta) > 50) go(delta > 0 ? 1 : -1);
    touchStartY.current = null;
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
        <div
          className="fixed left-1/2 top-0 w-full max-w-[440px] -translate-x-1/2 overflow-hidden"
          style={{ bottom: `calc(${NAV_CLEARANCE} + env(safe-area-inset-bottom))` }}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="h-full w-full transition-transform duration-500 ease-out"
            style={{ transform: `translateY(-${index * 100}%)` }}
          >
            {CARD_ORDER.map((id) => (
              <div key={id} className="flex h-full w-full flex-col p-6" style={{ background: cardBg(id) }}>
                <Brand />
                {renderPatternCard(id, data)}
              </div>
            ))}
          </div>
        </div>

        <div className="fixed right-3.5 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
          {CARD_ORDER.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to ${CARD_ORDER[i]}`}
              className={`rounded-full transition-all ${
                index === i ? "h-4 w-1.5 bg-[#F97316]" : "h-1.5 w-1.5 bg-[#E5E1D8]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function cardBg(id: string) {
  const theme: Record<string, string> = {
    rhythm: "#FFF7DB", presence: "#FBE9E6", balance: "#E7F8ED", style: "#FFE9D6", honesty: "#EAF0FB",
  };
  return theme[id];
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
