"use client";
// WO-092 PROTOTYPE (proto/presence-gather, never merged). Demo state lives in this browser tab only.
import { useState } from "react";
import { PresenceGather } from "../../../../components/patterns/PresenceGather";

const NOW = { year: 2026, month: 11, days: 30 };
const PAST = { year: 2026, month: 10, count: 22 };

export default function Page() {
  // days[k] = day of month of the k-th star; day = demo "today"; from = stars before the last change
  const [s, setS] = useState({ days: [] as number[], day: 0, from: 0, note: "" });
  const [past, setPast] = useState(false);
  const full = s.day >= NOW.days;
  const add = () => setS((p) => ({ days: [...p.days, p.day + 1], day: p.day + 1, from: p.days.length, note: "" }));
  const skip = (n: number) => setS((p) => {
    const day = Math.min(NOW.days, p.day + n);
    const q = day - p.day;
    return { ...p, day, from: p.days.length, note: `${q} quiet ${q === 1 ? "day" : "days"} passed. Nothing to catch up on.` };
  });
  const fill = () => setS((p) => ({ days: Array.from({ length: NOW.days }, (_, i) => i + 1), day: NOW.days, from: p.days.length, note: "" }));
  const reset = () => { setS({ days: [], day: 0, from: 0, note: "" }); setPast(false); };
  const btn = "min-h-11 rounded-xl border border-[#B4432A]/40 bg-white px-3 text-sm font-semibold text-[#8A331F] disabled:opacity-40";
  return (
    <main className="mx-auto max-w-[420px] p-4">
      <div className="mb-3 rounded-xl bg-[#1F1F1F] p-2 text-center text-[11px] font-bold tracking-wide text-white">
        PROTOTYPE · DEMO CONTROL · NOT PART OF THE APP · NO REAL DATA
      </div>
      <section className="rounded-[28px] p-5" style={{ background: "#FBE9E6" }}>
        <div className="mb-3 flex items-center justify-between text-[11px] font-bold tracking-widest" style={{ color: "#B4432A" }}>
          <span>PRESENCE</span><span>{past ? "OCT 2026" : "NOV 2026"}</span>
        </div>
        {past
          ? <PresenceGather year={PAST.year} month={PAST.month} count={PAST.count} labels={Array.from({ length: PAST.count }, (_, i) => `Oct ${i + 1}`)} current={false} />
          : <PresenceGather year={NOW.year} month={NOW.month} count={s.days.length} labels={s.days.map((d) => `Nov ${d}`)} from={s.from} current />}
        <p className="mt-3 text-center text-xs" style={{ color: "#A6482E" }}>A quiet record of when you showed up — nothing more.</p>
      </section>
      <section className="mt-4 rounded-2xl border border-dashed border-neutral-400 p-3">
        <p className="mb-2 text-xs font-semibold text-neutral-600">
          {past ? "Viewing a past month (no twinkle)." : `Demo day ${s.day}. `}
          <span aria-live="polite">{!past && s.note}</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button className={btn} disabled={past || full} onClick={add}>Open a day</button>
          <button className={btn} disabled={past || full} onClick={() => skip(3)}>Skip 3 days</button>
          <button className={btn} disabled={past || full} onClick={() => skip(7)}>Skip 7 days</button>
          <button className={btn} disabled={past || full} onClick={fill}>Fill the month</button>
          <button className={btn} onClick={() => setPast((v) => !v)}>{past ? "Back to this month" : "Show past month"}</button>
          <button className={btn} onClick={reset}>Reset demo</button>
        </div>
      </section>
    </main>
  );
}
