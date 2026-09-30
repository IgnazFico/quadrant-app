"use client";

/**
 * Background layer for the year-end ceremony: dawn-to-dusk sky, drifting
 * warm light, a tree cross-section that gains rings as the user moves
 * through the year, rising embers (one <canvas>), vignette and grain.
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

const WOOD_RINGS = 30;

/**
 * GROWTH-RING-REDESIGN (background motif): irregular tree-ring paths.
 * Deterministic (seeded), so server and client agree and every visit
 * shows the same "trunk".
 */
function buildWoodRings() {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
  const f = (v: number) => v.toFixed(1);
  const smoothClosed = (p: [number, number][]) => {
    const n = p.length;
    let d = `M${f(p[0][0])} ${f(p[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d + "Z";
  };

  const paths: { d: string; late: boolean }[] = [];
  let r = 9;
  for (let k = 0; k < WOOD_RINGS; k++) {
    r += 8 + rnd() * 10 + k * 0.3;
    const pts: [number, number][] = [];
    const N = 64;
    for (let j = 0; j < N; j++) {
      const a = (j / N) * Math.PI * 2;
      const wob =
        1 +
        0.035 * Math.sin(2 * a + ph[0]) +
        0.022 * Math.sin(3 * a + ph[1] + k * 0.15) +
        0.012 * Math.sin(5 * a + ph[2] + k * 0.4) +
        (rnd() - 0.5) * 0.006;
      pts.push([r * wob * Math.cos(a), r * wob * Math.sin(a)]);
    }
    paths.push({ d: smoothClosed(pts), late: k % 5 === 4 });
  }
  const rMax = Math.ceil(r * 1.07);
  return { paths, viewBox: `${-rMax} ${-rMax} ${rMax * 2} ${rMax * 2}` };
}

export function CeremonyAtmosphere({ ref }: { ref?: Ref<AtmosphereHandle> }) {
  const skyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wood = useMemo(() => buildWoodRings(), []);
  const [shownRings, setShownRings] = useState(4);
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
      setShownRings(Math.round(4 + progress * (WOOD_RINGS - 4)));
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
      {/* GROWTH-RING-REDESIGN (background motif): tree cross-section */}
      <div className="yc-wood">
        <svg viewBox={wood.viewBox} preserveAspectRatio="xMidYMid meet">
          <circle r={5} className="yc-pith" />
          {wood.paths.map((p, i) => (
            <path
              key={i}
              d={p.d}
              pathLength={1}
              className={`${p.late ? "yc-late" : ""} ${i < shownRings ? "yc-on" : ""}`}
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
