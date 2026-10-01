"use client";

/**
 * Background layer for the year-end ceremony: dawn-to-dusk sky, drifting
 * warm light, a field of stars that fills in as the user moves through the
 * year, rising embers (one <canvas>), vignette and grain.
 *
 * Driven imperatively by YearCeremony through the handle (set / burst) so
 * scene changes never re-render the scene tree. Stops its animation loop
 * entirely when the user prefers reduced motion.
 */
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";

export type AtmosphereHandle = {
  /** progress 0..1 through the ceremony; tint = current role colour; final = closing scene */
  set: (progress: number, tint: string | undefined, final: boolean) => void;
  /** a ring of embers released from the centre (year ring closing / "Close the year") */
  burst: () => void;
};

type Particle = {
  x: number; y: number; z: number; s: number; vy: number;
  sway: number; ph: number; a: number; burst: boolean;
};

const STAR_COUNT = 150;

/**
 * GROWTH-RING-REDESIGN (background motif): a field of stars, replacing the old
 * tree cross-section. Deterministic (seeded), so server and client agree and
 * every visit shows the same sky. Stars are ordered from the centre outward so
 * the field grows as the ceremony advances, and a few bright ones are joined
 * to a neighbour by a faint line, like the constellations in the scenes.
 */
function buildStarField() {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rMax = 300;
  const f = (v: number) => v.toFixed(1);

  const stars: { x: number; y: number; r: number; bright: boolean; d: number }[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * rMax; // even spread across the disc
    stars.push({
      x: d * Math.cos(a),
      y: d * Math.sin(a),
      r: 0.5 + rnd() * 0.9,
      bright: rnd() < 0.14,
      d,
    });
  }
  stars.sort((p, q) => p.d - q.d);

  const links: { d: string; i: number }[] = [];
  stars.forEach((st, i) => {
    if (!st.bright) return;
    let best = -1;
    let bestD = 75;
    for (let j = 0; j < i; j++) {
      const dd = Math.hypot(st.x - stars[j].x, st.y - stars[j].y);
      if (dd < bestD) {
        bestD = dd;
        best = j;
      }
    }
    if (best >= 0) {
      links.push({ d: `M${f(stars[best].x)} ${f(stars[best].y)}L${f(st.x)} ${f(st.y)}`, i });
    }
  });

  const half = Math.ceil(rMax * 1.07);
  return { stars, links, viewBox: `${-half} ${-half} ${half * 2} ${half * 2}` };
}

export function CeremonyAtmosphere({ ref }: { ref?: Ref<AtmosphereHandle> }) {
  const skyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const field = useMemo(() => buildStarField(), []);
  const [shownStars, setShownStars] = useState(10);
  const [golden, setGolden] = useState(false);

  // Read by the animation loop without re-subscribing it.
  const warmRef = useRef(0.12);
  const finalRef = useRef(false);
  const burstRef = useRef<() => void>(() => {});

  useImperativeHandle(ref, () => ({
    set(progress, tint, final) {
      const warm = 0.12 + 0.88 * progress;
      warmRef.current = warm;
      finalRef.current = final;
      const sky = skyRef.current;
      if (sky) {
        sky.style.setProperty("--yc-warm", warm.toFixed(3));
        sky.style.setProperty("--yc-tint", tint || "#F97316");
      }
      setGolden(final);
      setShownStars(Math.round(10 + progress * (STAR_COUNT - 10)));
    },
    burst() {
      burstRef.current();
    },
  }), []);

  useEffect(() => {
    const sky = skyRef.current;
    const canvas = canvasRef.current;
    if (!sky || !canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 64;
    const sctx = sprite.getContext("2d");
    if (sctx) {
      const g = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255, 222, 170, 1)");
      g.addColorStop(0.22, "rgba(251, 146, 60, 0.9)");
      g.addColorStop(0.55, "rgba(249, 115, 22, 0.28)");
      g.addColorStop(1, "rgba(249, 115, 22, 0)");
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, 64, 64);
    }

    let W = 0, H = 0, raf = 0, last = 0;
    const parts: Particle[] = [];
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const target = () =>
      Math.round((W * H / 1e6) * (10 + warmRef.current * 38) * (finalRef.current ? 1.35 : 1));
    const spawn = (fromBottom: boolean): Particle => {
      const z = 0.35 + Math.random() * 0.65; // depth: near embers are bigger and faster
      return {
        z,
        x: Math.random() * W,
        y: fromBottom ? H + 10 + Math.random() * 60 : Math.random() * H,
        s: (1.4 + Math.random() * 2.6) * z,
        vy: (7 + Math.random() * 14) * z,
        sway: 6 + Math.random() * 18,
        ph: Math.random() * Math.PI * 2,
        a: 0.25 + Math.random() * 0.45,
        burst: false,
      };
    };
    burstRef.current = () => {
      const cx = W / 2, cy = H * 0.42, R = Math.min(W, H) * 0.19;
      for (let i = 0; i < 44; i++) {
        const a = (i / 44) * Math.PI * 2 + Math.random() * 0.2;
        const p = spawn(false);
        p.x = cx + Math.cos(a) * R;
        p.y = cy + Math.sin(a) * R;
        p.z = 0.8 + Math.random() * 0.2;
        p.s = 2 + Math.random() * 2.4;
        p.vy = 16 + Math.random() * 30;
        p.a = 0.55 + Math.random() * 0.35;
        p.burst = true;
        parts.push(p);
      }
    };

    // Pointer parallax, eased
    let tx = 0, ty = 0, px = 0, py = 0;
    const onPointer = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;

      px += (tx - px) * 0.035;
      py += (ty - py) * 0.035;
      sky.style.setProperty("--yc-px", px.toFixed(3));
      sky.style.setProperty("--yc-py", py.toFixed(3));

      let ambient = 0;
      for (const p of parts) if (!p.burst) ambient++;
      if (ambient < target() && Math.random() < 0.5) parts.push(spawn(true));

      ctx.clearRect(0, 0, W, H);
      const t = now / 1000;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.y -= p.vy * dt;
        p.x += Math.sin(t * 0.5 + p.ph) * p.sway * dt * 0.5;
        if (p.y < -20) {
          if (p.burst || parts.length > target()) parts.splice(i, 1);
          else parts[i] = spawn(true);
          continue;
        }
        const flicker = 0.72 + 0.28 * Math.sin(t * 2.4 + p.ph * 3);
        const edge = Math.min(1, p.y / (H * 0.28)) * Math.min(1, (H - p.y + 60) / 120);
        ctx.globalAlpha = Math.max(0, p.a * flicker * edge);
        const size = p.s * 4;
        ctx.drawImage(sprite, p.x - px * 28 * p.z - size / 2, p.y - py * 22 * p.z - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    };

    resize();
    for (let i = 0; i < 12; i++) parts.push(spawn(false));
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      burstRef.current = () => {};
    };
  }, []);

  return (
    <div ref={skyRef} className={`yc-sky ${golden ? "yc-golden" : ""}`} aria-hidden="true">
      <div className="yc-sky-dusk" />
      <div className="yc-orb yc-orb-a" />
      <div className="yc-orb yc-orb-b" />
      <div className="yc-orb yc-orb-c" />
      {/* GROWTH-RING-REDESIGN (background motif): star field (was a tree cross-section) */}
      <div className="yc-stars">
        <svg viewBox={field.viewBox} preserveAspectRatio="xMidYMid meet">
          {field.links.map((l) => (
            <path key={l.i} d={l.d} className={`yc-link ${l.i < shownStars ? "yc-on" : ""}`} />
          ))}
          {field.stars.map((st, i) => (
            <circle
              key={i}
              cx={+st.x.toFixed(1)}
              cy={+st.y.toFixed(1)}
              r={+st.r.toFixed(2)}
              className={`${st.bright ? "yc-bright" : ""} ${i < shownStars ? "yc-on" : ""}`}
            />
          ))}
        </svg>
      </div>
      <canvas ref={canvasRef} className="yc-motes" />
      <div className="yc-vignette" />
      <div className="yc-grain" />
    </div>
  );
}
