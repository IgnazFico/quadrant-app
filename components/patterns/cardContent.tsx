export type PatternsData = {
  year: number;
  month: number;
  rhythm: {
    weekday: { label: string; count: number }[];
    daypart: { morning: number; afternoon: number; evening: number } | null;
  };
  presence: { activeDaysCount: number; heatmap: { date: string; active: boolean }[] };
  balance: {
    roles: { roleId: string; label: string; domain: string; completed: number; share: number }[];
    rolesWithActivity: number;
    totalRoles: number;
  };
  style: { scheduledPct: number; flexiblePct: number; linkedPct: number; standalonePct: number } | null;
  honesty: { reflectedCount: number; carriedCount: number; cancelledCount: number };
};

export const CARD_ORDER = ["rhythm", "presence", "balance", "style", "honesty"] as const;

export const CARD_THEME: Record<(typeof CARD_ORDER)[number], string> = {
  rhythm: "#FFF7DB",
  presence: "#FBE9E6",
  balance: "#E7F8ED",
  style: "#FFE9D6",
  honesty: "#EAF0FB",
};

const ROLE_BLOB_COLORS = ["#F97316", "#1E3A8A", "#22C55E", "#FB923C", "#B4432A"];

function expandDay(short: string) {
  const map: Record<string, string> = {
    Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday",
    Thu: "Thursday", Fri: "Friday", Sat: "Saturday",
  };
  return map[short] ?? short;
}
function topDaypart(d: { morning: number; afternoon: number; evening: number }) {
  return (Object.entries(d) as [string, number][]).sort((a, b) => b[1] - a[1])[0][0];
}

export function renderPatternCard(id: string, data: PatternsData): React.ReactNode {
  if (id === "rhythm") {
    const maxCount = Math.max(1, ...data.rhythm.weekday.map((w) => w.count));
    const busiest = [...data.rhythm.weekday].sort((a, b) => b.count - a.count)[0];
    return (
      <>
        <Icon color="#B98900">
          <circle cx="12" cy="12" r="5" /><path d="M12 1v3M12 20v3M4.2 4.2l2 2M17.8 17.8l2 2M1 12h3M20 12h3M4.2 19.8l2-2M17.8 6.2l2-2" />
        </Icon>
        <Eyebrow color="#B98900">Rhythm</Eyebrow>
        <Title color="#5C4A00">
          {busiest && busiest.count > 0 ? `${expandDay(busiest.label)}s are usually where things come together.` : "Not enough finished goals yet to see a shape here."}
        </Title>

        <div className="mt-1.5 mb-3.5 flex h-[88px] items-end gap-1.5">
          {data.rhythm.weekday.map((w) => (
            <div key={w.label} className="flex h-full flex-1 flex-col items-center justify-end">
              <div
                className="w-full max-w-[22px] rounded-[11px]"
                style={{
                  height: `${Math.max((w.count / maxCount) * 100, 5)}%`,
                  background: w.label === busiest?.label && w.count > 0 ? "#F97316" : "rgba(255,255,255,.55)",
                }}
              />
              <span className="mt-2 text-[9.5px] font-semibold" style={{ color: "#5C4A00", opacity: 0.5 }}>{w.label[0]}</span>
            </div>
          ))}
        </div>
        <Caption color="#8A7000">
          {data.rhythm.daypart ? `Most of your scheduled goals land in the ${topDaypart(data.rhythm.daypart)}.` : "Nothing scheduled to a specific time yet this month."}
        </Caption>
      </>
    );
  }

  if (id === "presence") {
    return (
      <>
        <Icon color="#B4432A">
          <path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 5a5.5 5.5 0 0 1 9.5 7c-2.5 4.65-9.5 9-9.5 9z" />
        </Icon>
        <Eyebrow color="#B4432A">Presence</Eyebrow>
        <div className="mb-1.5 font-serif text-[46px] font-bold leading-none" style={{ color: "#8A331F" }}>{data.presence.activeDaysCount}</div>
        <p className="mb-4.5 text-[13px] font-medium" style={{ color: "#A6482E" }}>separate days you opened Quadrant this month.</p>

        <div className="mb-4 grid grid-cols-7 gap-1.5">
          {data.presence.heatmap.map((d) => (
            <div key={d.date} className="aspect-square rounded-[7px]" style={{ background: d.active ? "rgba(180,67,42,.75)" : "rgba(180,67,42,.12)" }} />
          ))}
        </div>
        <Caption color="#A6482E">A quiet record of when you showed up — nothing more.</Caption>
      </>
    );
  }

  if (id === "balance") {
    return (
      <>
        <Icon color="#1F8A46">
          <path d="M12 3v18M5 8l-3 6a4 4 0 0 0 6 0zM19 8l3 6a4 4 0 0 1-6 0zM5 8h14M12 3l-4 5h8z" />
        </Icon>
        <Eyebrow color="#1F8A46">Balance</Eyebrow>
        <Title color="#175E33">Where your finished goals actually landed.</Title>

        <div className="flex-1">
          {data.balance.roles.length === 0 ? (
            <p className="text-[13px]" style={{ color: "#3E7A57" }}>No completed goals yet this month.</p>
          ) : (
            data.balance.roles.slice(0, 4).map((r, i) => (
              <div key={r.roleId} className="mb-3.5 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] font-serif text-sm font-bold text-white" style={{ background: ROLE_BLOB_COLORS[i % ROLE_BLOB_COLORS.length] }}>
                  {r.share}
                </div>
                <div>
                  <div className="text-[13.5px] font-semibold" style={{ color: "#175E33" }}>{r.label}</div>
                  <div className="text-[11.5px]" style={{ color: "#1F8A46", opacity: 0.7 }}>{r.share}% of goals done</div>
                </div>
              </div>
            ))
          )}
        </div>
        <Caption color="#3E7A57">
          {data.balance.rolesWithActivity} of your {data.balance.totalRoles} roles saw at least one finished goal this month.
        </Caption>
      </>
    );
  }

  if (id === "style") {
    return (
      <>
        <Icon color="#B5560B">
          <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
        </Icon>
        <Eyebrow color="#B5560B">Style</Eyebrow>
        {data.style ? (
          <>
            <Title color="#7A3B0F">
              You lean toward {data.style.scheduledPct >= 50 ? "planning things at a set time" : "keeping things flexible"}.
            </Title>
            <SplitStat label="Fixed time vs. left flexible" left={data.style.scheduledPct} leftColor="#F97316" leftLabel="Scheduled" rightLabel="Left open" textColor="#8A5220" />
            <SplitStat label="Tied to a goal vs. standalone" left={data.style.linkedPct} leftColor="#1E3A8A" leftLabel="Linked to a goal" rightLabel="Standalone" textColor="#8A5220" />
          </>
        ) : (
          <p className="text-[13px]" style={{ color: "#8A5220" }}>Nothing scheduled yet this month.</p>
        )}
      </>
    );
  }

  // honesty
  const h = data.honesty;
  const carryShare = h.reflectedCount ? Math.round((h.carriedCount / h.reflectedCount) * 100) : 0;
  return (
    <>
      <Icon color="#2C4A9E">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.6z" />
      </Icon>
      <Eyebrow color="#2C4A9E">Honesty</Eyebrow>
      <div className="mb-1.5 font-serif text-[46px] font-bold leading-none" style={{ color: "#1F3A7A" }}>{h.reflectedCount}</div>
      <p className="mb-5 text-[13px] font-medium" style={{ color: "#3C579C" }}>honest reflections this month &mdash; the truth-telling counts too.</p>
      {h.reflectedCount > 0 && (
        <SplitStat left={carryShare} leftColor="#2C4A9E" leftLabel={`${h.carriedCount} carried forward`} rightLabel={`${h.cancelledCount} let go`} textColor="#3C579C" />
      )}
    </>
  );
}

function Icon({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" className="mb-4" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
function Eyebrow({ color, children }: { color: string; children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide" style={{ color }}>{children}</p>;
}
function Title({ color, children }: { color: string; children: React.ReactNode }) {
  return <p className="mb-5 max-w-[22ch] font-serif text-[21px] font-semibold leading-tight" style={{ color }}>{children}</p>;
}
function Caption({ color, children }: { color: string; children: React.ReactNode }) {
  return <p className="mt-auto max-w-[32ch] pt-4 text-[13.5px] leading-relaxed" style={{ color, opacity: 0.85 }}>{children}</p>;
}
function SplitStat({
  label, left, leftColor, leftLabel, rightLabel, textColor,
}: { label?: string; left: number; leftColor: string; leftLabel: string; rightLabel: string; textColor: string }) {
  return (
    <div className="mb-5">
      {label && <p className="mb-1 text-xs font-semibold" style={{ color: textColor }}>{label}</p>}
      <div className="mb-2.5 flex h-[22px] overflow-hidden rounded-[11px]">
        <div style={{ width: `${left}%`, background: leftColor }} />
        <div style={{ width: `${100 - left}%`, background: "rgba(255,255,255,.6)" }} />
      </div>
      <div className="flex gap-3.5 text-xs" style={{ color: textColor, opacity: 0.85 }}>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: leftColor }} />{leftLabel}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-white" />{rightLabel}</span>
      </div>
    </div>
  );
}
