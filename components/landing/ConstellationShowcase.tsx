"use client";

// GROWTH-RING-REDESIGN: landing-page constellation demo, replacing the
// interactive growth ring. It renders the real <YearBadge> so the landing page
// draws exactly what the app draws.
//
// Copy rules (same as the year ceremony, see tests/year-review-ceremony.spec.ts):
// it measures showing up, never a rate. No "%", no "out of", no targets, no
// "hard"/"lean"/"missed" months. A quiet month is just a quiet dot.
//
// Motion: YearBadge draws every star into one shared <path>, so CSS can't
// transition a single star. Instead the month's count is tweened in JS
// (requestAnimationFrame) and fed to the badge as a fractional value. The
// star then grows and drifts outward continuously, and the other stars ease
// in if the role's peak moves. The first star of a month (quiet -> lit) also
// crossfades from the old badge, so the new line segment and the pulse moving
// to the next month fade in rather than pop. A soft bloom marks the star.
// Reduced motion skips all of it.

import { useEffect, useMemo, useRef, useState } from "react";
import { YearBadge } from "../constellation/YearBadge";
import { describeYear, jitter, orbitStars } from "../constellation/geometry";
import { constellationTint } from "../../lib/domainColors";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Fixed demo month (October) so server and client render the same SVG.
const DEMO_MONTH = 9;
const MAX_IN_MONTH = 8;
const BADGE_SIZE = 210;
const TWEEN_MS = 950;
// Same orbit as YearBadge at size >= 48, so the bloom lands on the star.
const BADGE_BASE = 34;
const BADGE_AMP = 12;

type Tween = {
  roleId: string;
  from: number;
  to: number;
  /**
   * "in": the month had no star (quiet -> lit); "out": it goes back to quiet.
   * Either way the shape itself changes (line segment, pulse), so the badge
   * crossfades with a static layer instead of snapping.
   */
  fade: "in" | "out" | null;
  /** Badge months before the change (static layer for a fade-in). */
  before: number[];
  start: number;
  /** When the current fade began; carried over when clicks chain. */
  fadeStart: number;
  /**
   * Lowest count drawn during a fade: a quarter of the peak puts the star
   * exactly on the orbit, where the quiet dot sits, so it rises from (or
   * settles into) that dot instead of jumping inside the orbit.
   */
  floor: number;
  key: number;
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
// Gentle overshoot so the star settles instead of stopping dead.
const easeOutBack = (x: number) => {
  const c1 = 1.2;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

type DemoRole = {
  id: string;
  label: string;
  domain: string;
  months: number[];
};

const INITIAL: DemoRole[] = [
  { id: "founder", label: "Founder", domain: "career", months: [3, 5, 2, 0, 4, 6, 3, 1, 4, 2, 0, 0] },
  { id: "athlete", label: "Athlete", domain: "health", months: [6, 4, 5, 3, 0, 2, 5, 6, 4, 1, 0, 0] },
  { id: "sibling", label: "Sibling", domain: "relationships", months: [1, 0, 2, 1, 1, 0, 3, 2, 0, 0, 0, 0] },
];

// Deterministic faint star field for the panel backdrop.
// Rounded so server and client markup always match.
const round = (n: number) => Math.round(n * 10) / 10;
const FIELD = Array.from({ length: 34 }, (_, i) => ({
  x: round(50 + jitter(7, i) * 100),
  y: round(50 + jitter(13, i) * 100),
  size: round(1.5 + (jitter(21, i) + 0.5) * 2),
  o: round(0.25 + (jitter(29, i) + 0.5) * 0.45),
}));

export function ConstellationShowcase() {
  const [roles, setRoles] = useState<DemoRole[]>(INITIAL);
  const [activeId, setActiveId] = useState<string>("founder");
  const [sealed, setSealed] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [tween, setTween] = useState<Tween | null>(null);
  const [progress, setProgress] = useState(1);
  const flashTimer = useRef<number | null>(null);

  // Drive the tween; a new click restarts it from wherever the star is now.
  useEffect(() => {
    if (!tween) return;
    let raf = 0;
    const step = (now: number) => {
      const p = clamp01((now - tween.start) / TWEEN_MS);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(step);
      else setTween(null);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [tween]);

  useEffect(
    () => () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    },
    [],
  );

  const active = roles.find((r) => r.id === activeId) ?? roles[0];
  const tint = constellationTint(active.domain);
  const peakOf = (months: number[]) => Math.max(1, ...months);
  const thisMonth = active.months[DEMO_MONTH];

  /** The month's count as currently drawn (fractional while tweening). */
  function animatedValue(t: Tween, p: number) {
    // Fading stars never touch zero: a zero count would snap the star back
    // onto the orbit as a quiet dot mid-animation. No overshoot for them either.
    const e = t.fade ? easeOutCubic(p) : easeOutBack(p);
    const v = t.from + (t.to - t.from) * e;
    return t.fade ? Math.max(t.floor, v) : Math.max(0, v);
  }

  /** Months as drawn right now for a role. */
  function shown(r: DemoRole): number[] {
    if (!tween || tween.roleId !== r.id) return r.months;
    const m = [...r.months];
    m[DEMO_MONTH] = animatedValue(tween, progress);
    return m;
  }

  const activeShown = shown(active);
  const activeTween = tween && tween.roleId === active.id ? tween : null;
  // Opacity of the animated badge; the static layer gets the rest.
  const fadeElapsed = activeTween
    ? activeTween.start - activeTween.fadeStart + progress * TWEEN_MS
    : 0;
  const animOpacity =
    activeTween?.fade === "in"
      ? easeOutCubic(clamp01((fadeElapsed / TWEEN_MS) * 1.6))
      : activeTween?.fade === "out"
        ? 1 - easeOutCubic(clamp01((progress - 0.25) / 0.75))
        : 1;
  const staticMonths =
    activeTween?.fade === "in" ? activeTween.before : activeTween?.fade === "out" ? active.months : null;
  const bloomStar =
    activeTween && activeTween.to > activeTween.from
      ? orbitStars(activeShown, peakOf(activeShown), BADGE_BASE, BADGE_AMP)[DEMO_MONTH]
      : null;
  const bloom = bloomStar
    ? { p: easeOutCubic(progress), fade: Math.pow(1 - progress, 1.5) }
    : null;

  const message = useMemo(() => {
    if (flash) return flash;
    if (sealed) return `December 31. ${active.label}'s year closed into a shape of its own.`;
    if (thisMonth === 0)
      return `${MONTHS[DEMO_MONTH]} is quiet so far, and that's fine. Its star is waiting.`;
    return `${thisMonth} ${thisMonth === 1 ? "goal" : "goals"} finished in ${MONTHS[DEMO_MONTH]}.`;
  }, [flash, sealed, active.label, thisMonth]);

  function finishGoal() {
    const wasFull = thisMonth >= MAX_IN_MONTH;
    const to = wasFull
      ? INITIAL.find((i) => i.id === active.id)!.months[DEMO_MONTH]
      : thisMonth + 1;

    if (!prefersReducedMotion()) {
      // Start from what's on screen, so rapid clicks chain smoothly.
      const from = activeTween ? animatedValue(activeTween, progress) : thisMonth;
      const now = performance.now();
      // A click during a fade-in keeps fading from where it is, no restart.
      const continuing = activeTween?.fade === "in" && to > 0;
      const fade = continuing ? "in" : from === 0 && to > 0 ? "in" : to === 0 && from > 0 ? "out" : null;
      const others = active.months.filter((_, j) => j !== DEMO_MONTH);
      const onOrbit = Math.max(1, ...others) / 4;
      const floor = fade === "in" ? Math.min(to, onOrbit) : fade === "out" ? Math.min(from, onOrbit) : 0;
      setProgress(0);
      setTween({
        roleId: active.id,
        from: fade === "in" ? Math.max(from, floor) : from,
        to,
        fade,
        floor,
        before: continuing ? activeTween.before : activeShown,
        start: now,
        fadeStart: continuing ? activeTween.fadeStart : now,
        key: (tween?.key ?? 0) + 1,
      });
    }

    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== active.id) return r;
        const months = [...r.months];
        months[DEMO_MONTH] = to;
        return { ...r, months };
      }),
    );
    setFlash(
      wasFull
        ? "Demo reset. In the app, every finished goal stays."
        : thisMonth === 0
          ? `A new star lit up for ${MONTHS[DEMO_MONTH]}.`
          : `${MONTHS[DEMO_MONTH]}'s star grew brighter.`,
    );
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 1800);
  }

  return (
    <div
      data-testid="constellation-showcase"
      className="relative overflow-hidden rounded-3xl border border-[#E8DFCF] p-6 shadow-sm sm:p-10"
      style={{
        background:
          "radial-gradient(120% 90% at 50% 0%, #FDFBF7 0%, #FAF7F2 55%, #F5EEE3 100%)",
      }}
    >
      {/* Backdrop star field, echoing the year ceremony */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {FIELD.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-[#C9B79C]"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, opacity: s.o }}
          />
        ))}
      </div>

      <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
        <div className="max-w-md">
          <span className="rounded-md bg-[#FBF1E3] px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-[#B45309]">
            Feature 02
          </span>
          <h3 className="mt-2.5 font-serif text-2xl font-bold tracking-tight text-[#2B2420] sm:text-3xl">
            Your Year, Written in Stars
          </h3>
          <p className="mt-2.5 text-sm leading-relaxed text-[#5E5247]">
            Each role gets twelve stars, one for every month. Finish a goal and
            that month&apos;s star lights up. Fuller months sit further out and
            sparkle. A quiet month is just a quiet dot, never a broken chain.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#5E5247]">
            Stars are sized against your own busiest month, not a target. On
            December 31 the year joins into a constellation no one else has.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={finishGoal}
              disabled={sealed}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-xs font-bold text-white shadow-sm transition-all hover:shadow active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: tint }}
            >
              <span>+ Finish a goal</span>
              <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">{active.label}</span>
            </button>
            <button
              type="button"
              onClick={() => setSealed((s) => !s)}
              aria-pressed={sealed}
              className="rounded-xl border border-[#D9CDB8] bg-white/80 px-4 py-2.5 font-mono text-xs font-bold text-[#5E5247] transition-colors hover:border-[#B3A796] hover:bg-white"
            >
              {sealed ? "↺ Back to October" : "Skip to Dec 31"}
            </button>
          </div>
        </div>

        {/* THE FEATURE EXAMPLE UI (Interactive constellation) */}
        <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-[#E8DFCF] bg-white/70 p-6 shadow-sm backdrop-blur-[2px]">
          <div className="flex w-full items-center justify-between font-mono text-[10px] font-bold uppercase tracking-wider text-[#8C7F72]">
            <span>{active.label} &bull; 2026</span>
            <span>{sealed ? "Year closed" : `Now: ${MONTHS[DEMO_MONTH]}`}</span>
          </div>

          <div
            className="relative my-2"
            style={{ width: BADGE_SIZE, height: BADGE_SIZE }}
            data-testid="constellation-demo"
          >
            {staticMonths && (
              <div className="absolute inset-0" style={{ opacity: 1 - animOpacity }} aria-hidden="true">
                <YearBadge
                  months={staticMonths}
                  peak={peakOf(staticMonths)}
                  tint={tint}
                  size={BADGE_SIZE}
                  sealed={sealed}
                  currentMonth={DEMO_MONTH}
                />
              </div>
            )}
            <div className="absolute inset-0" style={{ opacity: animOpacity }}>
              <YearBadge
                months={activeShown}
                peak={peakOf(activeShown)}
                tint={tint}
                size={BADGE_SIZE}
                sealed={sealed}
                currentMonth={DEMO_MONTH}
                label={active.label}
              />
            </div>
            {bloomStar && bloom && (
              <svg
                key={activeTween?.key}
                viewBox="-100 -100 200 200"
                width={BADGE_SIZE}
                height={BADGE_SIZE}
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
              >
                <circle
                  cx={bloomStar.x}
                  cy={bloomStar.y}
                  r={5 + 15 * bloom.p}
                  fill={tint}
                  fillOpacity={0.22 * bloom.fade}
                />
                <circle
                  cx={bloomStar.x}
                  cy={bloomStar.y}
                  r={4 + 22 * bloom.p}
                  fill="none"
                  stroke={tint}
                  strokeOpacity={0.5 * bloom.fade}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}
          </div>

          <p className="font-serif text-base font-semibold text-[#2B2420]">
            Showed up in {active.months.filter((c) => c > 0).length}{" "}
            {active.months.filter((c) => c > 0).length === 1 ? "month" : "months"}
          </p>

          <div
            aria-live="polite"
            className={`mt-3 w-full rounded-lg border px-3 py-1.5 text-center font-mono text-[10.5px] transition-colors duration-300 ${
              flash
                ? "border-[#E9C99B] bg-[#FFF8EE] text-[#92400E]"
                : "border-[#EEE6D8] bg-white/80 text-[#8C7F72]"
            }`}
          >
            {message}
          </div>

          {/* Role switcher: each chip is that role's own small badge.
              All or nothing: each chip is a size container, and the label +
              month count only appear once the chip is wide enough to show
              them in full: badge 34 + gap 8 + text ~48 = 90px, cut at 96px
              (6rem) for headroom. Measured: every phone width (content
              37-73px) gets badges only; tablet/desktop (109px) the full text. Below
              that the chip is the badge alone, centred, never a cut-off
              word. The badge's own aria-label ("Founder: showed up in 9
              months") names the button either way. */}
          <div className="mt-4 grid w-full grid-cols-3 gap-2" role="group" aria-label="Roles">
            {roles.map((r) => {
              const on = r.id === active.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setActiveId(r.id)}
                  onMouseEnter={() => setActiveId(r.id)}
                  title={`${r.label}: ${describeYear(r.months)}`}
                  className={`@container rounded-xl border px-2 py-1.5 text-left transition-all ${
                    on
                      ? "border-[#D9CDB8] bg-white shadow-xs"
                      : "border-transparent hover:border-[#EEE6D8] hover:bg-white/60"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2 @min-[6rem]:justify-start">
                  <YearBadge
                    months={shown(r)}
                    peak={peakOf(shown(r))}
                    tint={constellationTint(r.domain)}
                    size={34}
                    sealed={sealed}
                    currentMonth={DEMO_MONTH}
                    label={r.label}
                  />
                  <span aria-hidden="true" className="hidden whitespace-nowrap @min-[6rem]:block">
                    <span className="block text-xs font-semibold text-[#2B2420]">{r.label}</span>
                    <span className="block font-mono text-[9px] text-[#8C7F72]">
                      {describeYear(r.months).replace("showed up in ", "")}
                    </span>
                  </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
