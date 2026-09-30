"use client";

/**
 * The year-end ceremony engine: one scene at a time, user-paced.
 * Ported from the Ceremony() engine in web-prototype/year-review.js.
 *
 * All scenes are rendered once by React (content stays declarative);
 * this component then drives them imperatively with class toggles, so
 * moving between scenes never re-renders the tree:
 *   .yc-active / .yc-leaving / .yc-from-above / .yc-to-below  on scenes
 *   .yc-shown                                                 on lines
 *   .yc-instant                                               skip transitions
 *
 * Input: click/tap anywhere, ArrowRight/Down/PageDown/Space/Enter,
 * wheel, swipe. Back: ArrowLeft/Up/PageUp, wheel up, swipe down.
 * Pressing forward while a scene is still appearing shows it in full.
 */
import { useEffect, useRef } from "react";
import { CeremonyAtmosphere, type AtmosphereHandle } from "./CeremonyAtmosphere";
import type { SceneDef } from "./scenes";

const STAGGER = 1100;
const CLOSE_FADE_MS = 2600;

export function YearCeremony({
  scenes,
  onLeave,
  onClosed,
}: {
  scenes: SceneDef[];
  /** "Leave for now" */
  onLeave: () => void;
  /** after "Close the year" has faded out */
  onClosed: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const atmosRef = useRef<AtmosphereHandle>(null);
  const onClosedRef = useRef(onClosed);

  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const hint = hintRef.current;
    if (!root || !stage || !hint) return;

    const els = Array.from(stage.querySelectorAll<HTMLElement>(":scope > .yc-scene"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let idx = -1;
    let current: HTMLElement | null = null;
    let timers: number[] = [];
    let revealing = false;
    let lock = false;
    let advances = 0;
    let closing = false;
    let dead = false;
    const leaveTimers = new Map<HTMLElement, number>();
    const misc: number[] = [];

    const clearTimers = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    const setHint = (on: boolean) => hint.classList.toggle("yc-on", on);

    els.forEach((el) => {
      el.inert = true;
    });

    function countUp(el: HTMLElement) {
      const to = Number(el.dataset.count);
      const dur = Math.min(2400, 900 + to * 7);
      const t0 = performance.now();
      const step = (now: number) => {
        if (dead || el.closest(".yc-instant")) {
          el.textContent = String(to);
          return;
        }
        const p = Math.min(1, (now - t0) / dur);
        el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    function show(line: HTMLElement, animate: boolean) {
      line.classList.add("yc-shown");
      line.querySelectorAll<HTMLElement>("[data-count]").forEach((c) => {
        if (animate) countUp(c);
        else c.textContent = c.dataset.count ?? "";
      });
    }

    function reveal(el: HTMLElement, instant: boolean) {
      clearTimers();
      const lines = Array.from(el.querySelectorAll<HTMLElement>(".yc-line"));
      if (instant || reduce) {
        el.classList.add("yc-instant");
        lines.forEach((l) => show(l, false));
        revealing = false;
        return;
      }
      revealing = true;
      const s = scenes[idx];
      const stagger = s.stagger ?? STAGGER;
      let t = 450;
      lines.forEach((l, i) => {
        if (i > 0) t += stagger;
        t += Number(l.dataset.pause || 0);
        later(() => show(l, true), t);
      });
      if (s.burstAt) later(() => atmosRef.current?.burst(), s.burstAt);
      later(() => {
        revealing = false;
        // A quiet nudge only early on, and only if they seem to be waiting
        if (!s.final && idx > 0 && advances < 3) later(() => setHint(true), 2600);
      }, t + 900);
    }

    function go(to: number, dir: 1 | -1 = 1, instant = false) {
      if (to < 0 || to >= els.length || to === idx) return;
      setHint(false);

      const prev = current;
      if (prev) {
        prev.classList.remove("yc-active");
        prev.classList.add("yc-leaving");
        if (dir < 0) prev.classList.add("yc-to-below");
        prev.inert = true;
        leaveTimers.set(
          prev,
          window.setTimeout(() => prev.classList.remove("yc-leaving", "yc-to-below"), 800),
        );
      }

      idx = to;
      const el = els[idx];
      current = el;
      clearTimeout(leaveTimers.get(el));

      // Reset the scene to its "not yet shown" state without animating the reset
      el.classList.add("yc-instant");
      el.classList.remove("yc-leaving", "yc-to-below", "yc-active");
      el.classList.toggle("yc-from-above", dir < 0);
      el.querySelectorAll(".yc-line").forEach((l) => l.classList.remove("yc-shown"));
      el.querySelectorAll<HTMLElement>("[data-count]").forEach((c) => {
        c.textContent = "0";
      });
      el.scrollTop = 0;
      void el.offsetWidth; // commit the reset before transitions come back
      el.classList.remove("yc-instant");
      el.inert = false;

      const s = scenes[idx];
      atmosRef.current?.set(els.length > 1 ? idx / (els.length - 1) : 1, s.tint, !!s.final);

      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (dead || current !== el) return;
          el.classList.add("yc-active");
          reveal(el, instant);
          el.querySelector<HTMLElement>('[tabindex="-1"]')?.focus({ preventScroll: true });
        }),
      );
    }

    function next() {
      if (lock || closing || !current) return;
      if (revealing) {
        reveal(current, true);
        return;
      }
      if (idx < els.length - 1) {
        advances++;
        go(idx + 1, 1);
        lock = true;
        misc.push(window.setTimeout(() => (lock = false), 500));
      }
    }

    function prev() {
      if (lock || closing || idx <= 0) return;
      // Going back shows the earlier scene whole; no need to wait through it twice
      go(idx - 1, -1, true);
      lock = true;
      misc.push(window.setTimeout(() => (lock = false), 500));
    }

    function closeYear() {
      if (closing) return;
      closing = true;
      clearTimers();
      setHint(false);
      atmosRef.current?.burst();
      root!.classList.add("yc-closing-out");
      misc.push(window.setTimeout(() => onClosedRef.current(), CLOSE_FADE_MS));
    }

    const finalScrollable = () =>
      !!current && !!scenes[idx]?.final && current.scrollHeight > current.clientHeight + 4;

    // ---------- input ----------
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const act = target.closest<HTMLElement>("[data-action]");
      if (act) {
        if (act.dataset.action === "next") next();
        else if (act.dataset.action === "close") closeYear();
        return;
      }
      if (target.closest("button, a, summary, details, select, input, label, #yc-share-card")) return;
      next();
    };

    const onKey = (e: KeyboardEvent) => {
      if (closing) return;
      const target = e.target as HTMLElement;
      if (!root.contains(target) && target !== document.body) return;
      const onControl = target.closest("button, a, summary, select, input, textarea");
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
          e.preventDefault();
          next();
          break;
        case " ":
        case "Enter":
          if (onControl) return; // let buttons do their own thing
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          if (scenes[idx]?.final && current && current.scrollTop > 0 && e.key !== "ArrowLeft") return;
          e.preventDefault();
          prev();
          break;
      }
    };

    let wheelAcc = 0;
    let wheelLock = false;
    const onWheel = (e: WheelEvent) => {
      if (closing) return;
      // Let the closing scene's back matter scroll; only step back from its very top
      if (finalScrollable() && !(e.deltaY < 0 && current!.scrollTop <= 0)) return;
      if (wheelLock) return;
      wheelAcc += e.deltaY;
      if (Math.abs(wheelAcc) < 40) return;
      wheelLock = true;
      if (wheelAcc > 0) next();
      else prev();
      wheelAcc = 0;
      misc.push(window.setTimeout(() => (wheelLock = false), 1100));
    };

    let touchY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchY == null) return;
      const dy = e.changedTouches[0].clientY - touchY;
      touchY = null;
      if (finalScrollable()) return;
      if (dy < -50) next();
      else if (dy > 50) prev();
    };

    stage.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    root.addEventListener("wheel", onWheel, { passive: true });
    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchend", onTouchEnd, { passive: true });

    go(0);

    return () => {
      dead = true;
      clearTimers();
      misc.forEach(clearTimeout);
      leaveTimers.forEach((t) => clearTimeout(t));
      stage.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      root.removeEventListener("wheel", onWheel);
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchend", onTouchEnd);
    };
  }, [scenes]);

  return (
    <div ref={rootRef} className="yc-root">
      <CeremonyAtmosphere ref={atmosRef} />

      <button type="button" className="yc-leave" onClick={onLeave}>
        Leave for now
      </button>

      <div ref={stageRef} className="yc-stage" role="region" aria-label="Your year in Quadrant">
        {scenes.map((s) => (
          <section key={s.id} className="yc-scene" data-scene={s.id} aria-roledescription="scene">
            <div className="yc-inner">{s.node}</div>
          </section>
        ))}
      </div>

      <p ref={hintRef} className="yc-hint" aria-hidden="true">
        Tap, click, or press &rarr; to continue
      </p>
    </div>
  );
}
