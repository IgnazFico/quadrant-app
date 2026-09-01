"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { isRecapWindowOpen } from "../../lib/yearRecapWindow";

function dismissedKey(year: number) {
  return `quadrant:recap-dismissed:${year}`;
}

/**
 * Unlike the mission-statement gate, this is deliberately NOT a hard
 * redirect — it's a small dismissible card that floats above the bottom
 * nav. It only decides whether to appear; it never prevents navigating
 * anywhere else in the app. Dismissal state lives in plain localStorage,
 * not the Zustand store — this is non-sensitive UI preference, not key
 * material, so it's fine for it to persist across sessions (unlike
 * masterKey, which must never be persisted).
 */
export function RecapPrompt() {
  const pathname = usePathname();
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    const now = new Date();
    if (!isRecapWindowOpen(now)) return;
    if (pathname?.startsWith("/year-review")) return; // already there, no need to nudge

    const y = now.getFullYear();
    if (typeof window !== "undefined" && localStorage.getItem(dismissedKey(y)))
      return;

    setYear(y);
  }, [pathname]);

  function dismiss() {
    if (year !== null) localStorage.setItem(dismissedKey(year), "1");
    setYear(null);
  }

  if (year === null) return null;

  return (
    <div className="fixed inset-x-0 bottom-[76px] z-20 flex justify-center px-4">
      <div className="flex w-full max-w-[420px] items-center gap-3 rounded-2xl border border-[#ECE8DF] bg-white p-3.5 shadow-[0_10px_30px_-10px_rgba(31,41,55,0.25)]">
        <div className="grid h-9 w-9 shrink-0 grid-cols-2 grid-rows-2 gap-[3px] rounded-lg bg-[#FFF1E4] p-1.5">
          <span className="rounded-[2px] bg-white/60" />
          <span className="rounded-[2px] bg-[#F97316]" />
          <span className="rounded-[2px] bg-white/60" />
          <span className="rounded-[2px] bg-white/60" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-[#1F2937]">
            Your year in Quadrant is nearly written
          </p>
          <p className="text-[11px] text-[#9CA3AF]">
            A quiet look back at {year}, whenever you&apos;re ready.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Link
            href={`/year-review?year=${year}`}
            onClick={dismiss}
            className="rounded-lg bg-[#F97316] px-3 py-1.5 text-center text-[11px] font-semibold text-white hover:bg-[#EA6A0C]"
          >
            View
          </Link>
          <button
            onClick={dismiss}
            className="text-[10.5px] text-[#C9CBCF] hover:text-[#9CA3AF]"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
