import { create } from "zustand";

/**
 * Minimal app-wide toast: one message at a time, auto-dismissed.
 * Call showToast("...") from anywhere; <Toaster /> (mounted by AppShell)
 * renders it.
 */
const DURATION_MS = 3200;
const LEAVE_MS = 200; // matches --m-sheet-out in globals.css

type ToastState = {
  toast: { id: number; message: string; leaving?: boolean } | null;
  show: (message: string) => void;
  dismiss: () => void;
};

let timer: ReturnType<typeof setTimeout> | null = null;
let seq = 0;

export const useToastStore = create<ToastState>((set, get) => {
  // Fade out for LEAVE_MS, then clear. Reduced motion clears at once.
  const leave = () => {
    const t = get().toast;
    if (!t || t.leaving) return;
    if (timer) clearTimeout(timer);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return set({ toast: null });
    set({ toast: { ...t, leaving: true } });
    timer = setTimeout(() => set({ toast: null }), LEAVE_MS);
  };
  return {
    toast: null,
    show: (message) => {
      if (timer) clearTimeout(timer);
      set({ toast: { id: ++seq, message } });
      timer = setTimeout(leave, DURATION_MS);
    },
    dismiss: leave,
  };
});

export const showToast = (message: string) => useToastStore.getState().show(message);
