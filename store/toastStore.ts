import { create } from "zustand";

/**
 * Minimal app-wide toast: one message at a time, auto-dismissed.
 * Call showToast("...") from anywhere; <Toaster /> (mounted by AppShell)
 * renders it.
 */
const DURATION_MS = 3200;

type ToastState = {
  toast: { id: number; message: string } | null;
  show: (message: string) => void;
  dismiss: () => void;
};

let timer: ReturnType<typeof setTimeout> | null = null;
let seq = 0;

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  show: (message) => {
    if (timer) clearTimeout(timer);
    set({ toast: { id: ++seq, message } });
    timer = setTimeout(() => set({ toast: null }), DURATION_MS);
  },
  dismiss: () => {
    if (timer) clearTimeout(timer);
    set({ toast: null });
  },
}));

export const showToast = (message: string) => useToastStore.getState().show(message);
