"use client";

import { LOCKED_MESSAGE } from "../../lib/sealedFields";

/**
 * Shown on the Week pages when this tab has no master key (WO-029, D-066).
 * Goal titles, schedule titles and role names are sealed with that key, so
 * without it they show a placeholder and cannot be created or renamed.
 * Same idea as the "session key isn't available" note on the weekly review.
 */
export function LockedNote({ className = "" }: { className?: string }) {
  return (
    <p
      role="status"
      data-testid="locked-note"
      className={`rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B] ${className}`}
    >
      {LOCKED_MESSAGE}
    </p>
  );
}
