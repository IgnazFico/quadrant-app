"use client";

import { useToastStore } from "../../store/toastStore";

/**
 * Renders the current toast (store/toastStore.ts). Bottom-centre; on
 * mobile it sits above the fixed BottomNav. z-[60] keeps it above modals
 * (z-50) so a message raised from inside one is still visible.
 */
export function Toaster() {
  const toast = useToastStore((s) => s.toast);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 md:bottom-8"
    >
      {toast && (
        <button
          key={toast.id}
          role="status"
          onClick={dismiss}
          className="toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl bg-[#1F2937] py-2.5 pl-3.5 pr-4 text-[13px] font-medium text-white shadow-[0_12px_32px_rgba(31,41,55,0.28)]"
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F97316]" />
          {toast.message}
        </button>
      )}
    </div>
  );
}
