"use client";

import Link from "next/link";
import { BRAND_CLAY } from "../brand/QuadrantMark";

/**
 * Quadrant's one segmented control. Used for the web nav (Week / Reflect)
 * and the This week / Next week toggle, so every switcher in the app moves
 * and reads the same way.
 *
 * Anatomy
 *   track   warm linen, inset shadow: a groove the thumb sits in, not a flat fill
 *   thumb   one white piece that SLIDES to the active segment (transform only,
 *           so it stays on the GPU), with a soft lift shadow
 *   labels  sit above the thumb; inactive ones are muted, not grey-on-grey
 *
 * Segments are equal width (grid auto-cols-fr), so the thumb is exactly
 * 1/N of the track and moves by translateX(index * 100%), no measuring.
 *
 * `signature` (web nav only): the thumb carries a 2x2 quadrant glyph with the
 * top-right cell in clay, the same Quadrant II quarter that is clay in the
 * logo. It rides with the thumb, so the active destination is marked as "the
 * quadrant that matters". Use it once per screen. (A clay corner arc was
 * tried first and read as a loading spinner.)
 *
 * Items with `href` render as <Link aria-current="page"> (navigation);
 * without, as <button aria-pressed> (state). Never <a href>: a full reload
 * drops the in-memory masterKey (store/authStore.ts).
 */
export type SegmentItem<V extends string> = {
  value: V;
  label: string;
  href?: string;
};

// pad = track padding in px; the thumb is inset by exactly this on every side.
const SIZES = {
  sm: { pad: 3, track: "h-8 rounded-[10px]", radius: "rounded-[7px]", label: "px-3 text-[12px]" },
  md: { pad: 3, track: "h-9 rounded-[11px]", radius: "rounded-[8px]", label: "px-3.5 text-[12.5px]" },
  lg: { pad: 4, track: "h-10 rounded-[13px]", radius: "rounded-[9px]", label: "min-w-[116px] px-5 text-[13.5px]" },
} as const;

export function SegmentedToggle<V extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  size = "md",
  signature = false,
  as = "group",
}: {
  items: SegmentItem<V>[];
  /** Active value; null shows no thumb (e.g. on a page outside the nav). */
  value: V | null;
  onChange?: (v: V) => void;
  ariaLabel: string;
  size?: keyof typeof SIZES;
  signature?: boolean;
  /** "nav" renders a <nav> landmark; otherwise a role=group. */
  as?: "group" | "nav";
}) {
  const s = SIZES[size];
  const index = items.findIndex((i) => i.value === value);
  const Container = as === "nav" ? "nav" : "div";

  return (
    <Container
      aria-label={ariaLabel}
      role={as === "nav" ? undefined : "group"}
      className={`relative inline-grid grid-flow-col auto-cols-fr border border-[#E7E0D3] bg-[#F1EBE1] shadow-[inset_0_1px_2px_rgba(46,42,38,0.08)] ${s.track}`}
      style={{ padding: s.pad }}
    >
      {/* Thumb: one grid cell of the padded area, sliding cell to cell. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute ${s.radius} bg-white shadow-[0_0_0_1px_rgba(46,42,38,0.06),0_1px_2px_rgba(46,42,38,0.08),0_4px_10px_-2px_rgba(46,42,38,0.10)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none`}
        style={{
          top: s.pad,
          bottom: s.pad,
          left: s.pad,
          width: `calc((100% - ${2 * s.pad}px) / ${items.length})`,
          transform: `translateX(${Math.max(index, 0) * 100}%)`,
          opacity: index < 0 ? 0 : 1,
        }}
      >
        {signature && <QuadrantGlyph />}
      </span>

      {items.map((item, i) => {
        const active = i === index;
        const cls = `relative z-[1] flex h-full items-center justify-center whitespace-nowrap ${s.radius} font-sans font-semibold tracking-[-0.005em] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#F97316]/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[#F1EBE1] ${s.label} ${
          active ? "text-[#1F2937]" : "text-[#8A8579] hover:text-[#4B5563]"
        }`;
        return item.href ? (
          <Link key={item.value} href={item.href} aria-current={active ? "page" : undefined} className={cls}>
            {item.label}
          </Link>
        ) : (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange?.(item.value)}
            className={cls}
          >
            {item.label}
          </button>
        );
      })}
    </Container>
  );
}

/**
 * 2x2 quadrant glyph, top-right cell in clay: the brand mark reduced to its
 * idea. Sits at the thumb's leading edge, vertically centred. Decorative.
 */
function QuadrantGlyph() {
  return (
    <svg
      viewBox="0 0 10 10"
      width="10"
      height="10"
      className="absolute left-3 top-1/2 -translate-y-1/2"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="4.2" height="4.2" rx="1.1" fill="#D9D1C3" />
      <rect x="5.8" y="0" width="4.2" height="4.2" rx="1.1" fill={BRAND_CLAY} />
      <rect x="0" y="5.8" width="4.2" height="4.2" rx="1.1" fill="#D9D1C3" />
      <rect x="5.8" y="5.8" width="4.2" height="4.2" rx="1.1" fill="#D9D1C3" />
    </svg>
  );
}
