"use client";

// GROWTH-RING-REDESIGN: the year-in-review sky, replacing RingPortrait.
// Each role gets a quadrant; picking a year lights it up across all of them.
import { useState } from "react";
import { constellationTint } from "../../lib/domainColors";
import type { RoleConstellation } from "../../types/constellation";
import { RoleSky } from "./RoleSky";

type Props = {
  sky: RoleConstellation[];
  /** The year being reviewed; starts lit. */
  year: number;
  currentYear: number;
  currentMonth: number;
};

export function YourSky({ sky, year, currentYear, currentMonth }: Props) {
  const [selected, setSelected] = useState(year);

  if (sky.length === 0) {
    return <p className="text-sm text-[#C9CBCF]">No roles yet to show here.</p>;
  }

  const allYears = Array.from(
    new Set(sky.flatMap((r) => r.years.map((y) => y.year))),
  ).sort((a, b) => a - b);
  const chips: { label: string; value: number }[] = [
    { label: "All", value: 0 },
    ...allYears.map((y) => ({ label: String(y), value: y })),
  ];
  const rows = Math.ceil(sky.length / 2);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div
        className="flex max-w-full gap-1.5 overflow-x-auto pb-1"
        role="group"
        aria-label="Year to light up"
      >
        {chips.map((c) => {
          const on = c.value === selected;
          return (
            <button
              key={c.value}
              type="button"
              aria-pressed={on}
              onClick={() => setSelected(c.value)}
              className={`h-10 min-w-[48px] shrink-0 rounded-full border px-3 font-mono text-[11px] ${
                on
                  ? "border-[#2B1B0E] bg-[#2B1B0E] text-[#FAF7F2]"
                  : "border-[#E5DDCE] bg-white text-[#1F2937]"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="relative grid w-full grid-cols-2">
        {sky.map((r, i) => {
          const lastRow = Math.floor(i / 2) === rows - 1;
          return (
            <div
              key={r.roleId}
              className={`flex flex-col items-center gap-2 px-2 py-4 ${
                i % 2 === 0 ? "border-r" : ""
              } ${lastRow ? "" : "border-b"} border-[#E4DCCB]`}
            >
              <RoleSky
                years={r.years}
                tint={constellationTint(r.domain)}
                size={170}
                selectedYear={selected}
                currentYear={currentYear}
                currentMonth={currentMonth}
                label={r.label}
                background="#FFF9F2"
              />
              <div className="text-center">
                <div className="font-serif text-[15px] font-semibold leading-tight text-[#1F2937]">
                  {r.label}
                </div>
                <div className="mt-1 font-mono text-[9.5px] uppercase tracking-wide text-[#9CA3AF]">
                  {r.domain}
                  {r.years[0] ? ` · since ${r.years[0].year}` : ""}
                </div>
              </div>
            </div>
          );
        })}
        {sky.length === 4 && (
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 grid-cols-2 grid-rows-2 gap-[3px] bg-[#FFF9F2] p-1.5"
          >
            <span className="h-2.5 w-2.5 rounded-[3px] bg-[#E9E2D4]" />
            <span className="h-2.5 w-2.5 rounded-[3px] bg-[#F97316]" />
            <span className="h-2.5 w-2.5 rounded-[3px] bg-[#E9E2D4]" />
            <span className="h-2.5 w-2.5 rounded-[3px] bg-[#E9E2D4]" />
          </div>
        )}
      </div>
    </div>
  );
}
