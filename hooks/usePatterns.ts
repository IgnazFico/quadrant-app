"use client";

import { useEffect, useState } from "react";
import type { PatternsData } from "../components/patterns/cardContent";

export type PatternsState = {
  data: PatternsData | null;
  loading: boolean;
};

/**
 * Thin fetch hook for /api/patterns, used by the Reflect desktop split-view
 * (components/reflect/ReflectDesktopView.tsx). The existing mobile
 * PatternsPage.tsx keeps its own self-contained fetch untouched — this
 * hook only exists so the desktop view doesn't need to duplicate that
 * fetch/loading logic inline.
 */
export function usePatterns(): PatternsState {
  const [data, setData] = useState<PatternsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/patterns");
        if (res.ok && !cancelled) setData(await res.json());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}
