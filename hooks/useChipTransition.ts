"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Chips that arrive or leave after the first paint get a state: "new" (just mounted by a tap)
 * or "leaving" (kept mounted for `ms` so the exit can play). Never animates the first data.
 * Reduced motion: no state, leavers drop at once.
 * ms = --m-fast (160 ms) x --m-scale (3); keep in step with globals.css.
 */
export function useChipTransition<T extends { id: string }>(items: T[], ready: boolean, ms = 480) {
  const [fresh, setFresh] = useState<string[]>([]);
  const [gone, setGone] = useState<T[]>([]);
  const last = useRef(items);
  const seen = useRef(false);

  useEffect(() => {
    const prev = last.current;
    last.current = items;
    if (!ready || !seen.current) {
      seen.current = ready;
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ids = new Set(items.map((i) => i.id));
    const removed = prev.filter((p) => !ids.has(p.id));
    setFresh(items.filter((i) => !prev.some((p) => p.id === i.id)).map((i) => i.id));
    setGone((g) => [...g.filter((x) => !ids.has(x.id)), ...removed]);
    if (!removed.length) return;
    // No cleanup: a second removal re-runs this effect, and clearing the first timer left the first leaver stuck in `gone`, so the hint never came back.
    setTimeout(() => setGone((g) => g.filter((x) => !removed.some((r) => r.id === x.id))), ms);
  }, [items, ready, ms]);

  return [
    ...items.map((item) => ({ item, state: fresh.includes(item.id) ? "new" : "" })),
    ...gone.filter((g) => !items.some((i) => i.id === g.id)).map((item) => ({ item, state: "leaving" })),
  ] as { item: T; state: "new" | "leaving" | "" }[];
}
