import type { ReactNode } from "react";

/**
 * The four phone-bar icons, outline (idle) and filled (selected), in ONE
 * file so a later swap is one edit (WO-022 / NB-4, icons from WO-023, D-048).
 *
 * Copied exactly from outputs/WO-021-navbar-design-v2.md §9 MUST WORK 1.
 * Each is drawn inside a 24 x 24 viewBox; the caller supplies the <svg>.
 *   - Outline: fill none, stroke currentColor, stroke-width 2, round caps/joins.
 *   - Filled:  fill currentColor, same stroke. A path with className "cut" is
 *     drawn with the pill colour as stroke and no fill (see bottomNav.css).
 * Every icon must keep at least a 2 px inset inside its 24 px box in the
 * filled state (checked by tests/navbar-v2.spec.ts, item h).
 */
export type NavIconKey = "goals" | "schedule" | "patterns" | "profile";

const patterns = (
  <>
    <rect x="3.5" y="8" width="3.6" height="12" rx="1.7" />
    <rect x="10.2" y="12.5" width="3.6" height="7.5" rx="1.7" />
    <rect x="16.9" y="4.5" width="3.6" height="15.5" rx="1.7" />
  </>
);

const profile = (
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21v-1a5.5 5.5 0 0 1 5.5-5.5h4a5.5 5.5 0 0 1 5.5 5.5v1z" />
  </>
);

export const NAV_ICONS: Record<NavIconKey, { outline: ReactNode; filled: ReactNode }> = {
  goals: {
    outline: (
      <>
        <rect x="5" y="4.5" width="14" height="16" rx="2.5" />
        <path d="M9 4.5V3.5h6v1" />
        <path d="M8.8 12.7l2.2 2.2 4.2-4.6" />
      </>
    ),
    filled: (
      <>
        <rect x="5" y="4.5" width="14" height="16" rx="2.5" />
        <path d="M9 4.5V3.5h6v1" />
        <path className="cut" d="M8.8 12.7l2.2 2.2 4.2-4.6" />
      </>
    ),
  },
  schedule: {
    outline: (
      <>
        <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </>
    ),
    filled: (
      <>
        <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
        <path d="M8 3v4M16 3v4" />
        <path className="cut" d="M3.5 10h17" />
      </>
    ),
  },
  patterns: { outline: patterns, filled: patterns },
  profile: { outline: profile, filled: profile },
};
