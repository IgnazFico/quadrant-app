"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { domainColor } from "../../lib/domainColors";
import { useAuthStore } from "../../store/authStore";
import { decryptField, fromBase64 } from "../../lib/crypto";
import { useSearchParams } from "next/navigation";
import "./yearreview.css";

const VOTES_PER_RING_VISUAL = 24; // same visual-only target used on the profile page

type RoleStat = {
  roleId: string;
  label: string;
  domain: string;
  [k: string]: any;
} | null;
type YearReview = {
  year: number;
  momentum: {
    totalGoals: number;
    completedGoals: number;
    completionRate: number;
    activeDays: number;
    busiestMonth: string | null;
    firstCompleted: { title: string; date: string } | null;
    mostRecentCompleted: { title: string; date: string } | null;
  };
  roleInsights: {
    mostImproved: RoleStat;
    mostConsistent: RoleStat;
    longestHeld: RoleStat;
    quietest: RoleStat;
    newThisYear: { roleId: string; label: string; domain: string }[];
  };
  integrity: {
    reflectedCount: number;
    carriedCount: number;
    cancelledCount: number;
  };
  identity: { title: string; domainCounts: Record<string, number> };
  rings: {
    roleId: string;
    label: string;
    domain: string;
    votesLogged: number;
    sealed: boolean;
  }[];
  missionStatement: {
    signedName: string;
    signedAt: string;
    contentEncrypted: string;
  } | null;
};

const CHAPTERS = [
  { id: "momentum", label: "Momentum" },
  { id: "roles", label: "Roles" },
  { id: "integrity", label: "Honesty" },
  { id: "mission", label: "Mission" },
  { id: "identity", label: "Identity" },
  { id: "rings", label: "Rings" },
  { id: "close", label: "Next year" },
];

export function YearInReviewPage() {
  const searchParams = useSearchParams();
  const [year, setYear] = useState(() => {
    const fromQuery = parseInt(searchParams.get("year") ?? "", 10);
    return Number.isNaN(fromQuery) ? new Date().getFullYear() - 1 : fromQuery;
  });
  const [data, setData] = useState<YearReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [statementSnippet, setStatementSnippet] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [activeChapter, setActiveChapter] = useState("momentum");
  const masterKey = useAuthStore((s) => s.masterKey);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const registerSection = useCallback((id: string, el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setStatementSnippet(null);
      const res = await fetch(`/api/year-review?year=${year}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const body: YearReview = await res.json();
      setData(body);

      if (body.missionStatement && masterKey) {
        try {
          const full = await decryptField(
            await fromBase64(body.missionStatement.contentEncrypted),
            masterKey,
          );
          setStatementSnippet(
            full.length > 220 ? full.slice(0, 220).trim() + "\u2026" : full,
          );
        } catch {
          setStatementSnippet(null);
        }
      }
      setLoading(false);
    })();
  }, [year, masterKey]);

  // scroll-reveal + active chapter tracking
  useEffect(() => {
    const revealEls = document.querySelectorAll(".yr-reveal");
    const revealIo = new IntersectionObserver(
      (entries) =>
        entries.forEach(
          (e) => e.isIntersecting && e.target.classList.add("in"),
        ),
      { threshold: 0.15 },
    );
    revealEls.forEach((el) => revealIo.observe(el));

    const chapterEls = CHAPTERS.map((c) => sectionRefs.current[c.id]).filter(
      Boolean,
    ) as HTMLElement[];
    const chapterIo = new IntersectionObserver(
      (entries) =>
        entries.forEach(
          (e) => e.isIntersecting && setActiveChapter(e.target.id),
        ),
      { threshold: 0.5 },
    );
    chapterEls.forEach((el) => chapterIo.observe(el));

    return () => {
      revealIo.disconnect();
      chapterIo.disconnect();
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#9CA3AF]">
        Putting your year together...
      </div>
    );
  }

  if (!data || data.momentum.totalGoals === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-8 text-center">
        <YearSwitcher year={year} setYear={setYear} />
        <p className="mt-4 font-serif text-xl font-semibold text-[#1F2937]">
          Nothing here yet for {year}
        </p>
        <p className="max-w-[32ch] text-sm text-[#6B7280]">
          Once you&apos;ve set and completed some goals in {year}, this page
          fills in on its own.
        </p>
      </div>
    );
  }

  const {
    momentum,
    roleInsights,
    integrity,
    identity,
    rings,
    missionStatement,
  } = data;

  return (
    <div className="flex justify-center bg-[#FFF9F2] pb-16">
      <div className="w-full max-w-[460px]">
        <nav className="yr-chapter-nav">
          {CHAPTERS.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className={`yr-chip ${activeChapter === c.id ? "active" : ""}`}
            >
              {c.label}
            </a>
          ))}
        </nav>

        {/* HERO */}
        <section className="px-[22px] pb-10 pt-14 text-center">
          <div className="mx-auto mb-5 grid h-[52px] w-[52px] grid-cols-2 grid-rows-2 gap-[5px]">
            <span className="rounded-[9px] bg-[#F3F4F6]" />
            <span className="rounded-[9px] bg-[#F97316]" />
            <span className="rounded-[9px] bg-[#F3F4F6]" />
            <span className="rounded-[9px] bg-[#F3F4F6]" />
          </div>
          <YearSwitcher year={year} setYear={setYear} />
          <h1 className="mb-3.5 mt-4 font-serif text-[34px] font-bold leading-tight text-[#1F2937]">
            {year}, in Quadrant
          </h1>
          <p className="mx-auto max-w-[32ch] text-sm leading-relaxed text-[#6B7280]">
            A quiet record of who you&apos;ve been becoming this year &mdash;
            not for anyone else to see, just for you to notice.
          </p>
          <p className="mt-10 font-mono text-[10.5px] text-[#C9CBCF]">
            Scroll whenever you&apos;re ready &mdash; come back to any part,
            anytime
          </p>
        </section>

        {/* MOMENTUM */}
        <Chapter
          id="momentum"
          registerSection={registerSection}
          n={1}
          title="The shape of your year"
          sub="Before the roles and the reasons — just the raw numbers."
        >
          <div className="grid grid-cols-2 gap-2.5">
            <StatCard
              num={momentum.completedGoals}
              label={`goals completed of ${momentum.totalGoals} set`}
            />
            <StatCard
              num={`${momentum.completionRate}%`}
              label="completion rate this year"
            />
            <div className="col-span-2 flex items-center justify-between rounded-xl border border-[#ECE8DF] bg-white p-4">
              <div>
                <div className="font-serif text-[26px] font-semibold">
                  {momentum.activeDays}
                </div>
                <div className="mt-1 text-[11.5px] text-[#9CA3AF]">
                  separate days you showed up
                </div>
              </div>
              <div className="text-right">
                <div className="font-serif text-[26px] font-semibold">
                  {momentum.busiestMonth ?? "\u2014"}
                </div>
                <div className="mt-1 text-[11.5px] text-[#9CA3AF]">
                  your busiest month
                </div>
              </div>
            </div>
          </div>

          {(momentum.firstCompleted || momentum.mostRecentCompleted) && (
            <div className="mt-2.5 flex gap-2.5">
              {momentum.firstCompleted && (
                <Bookend
                  tag="First completed"
                  title={momentum.firstCompleted.title}
                />
              )}
              {momentum.mostRecentCompleted && (
                <Bookend
                  tag="Most recent"
                  title={momentum.mostRecentCompleted.title}
                />
              )}
            </div>
          )}
        </Chapter>

        {/* ROLES */}
        <Chapter
          id="roles"
          registerSection={registerSection}
          n={2}
          title="Where the effort actually went"
          sub="Not every role grows at the same pace — here's how this year broke down."
        >
          {roleInsights.mostImproved ? (
            <RoleCard
              kicker="Most improved"
              domain={roleInsights.mostImproved.domain}
              name={roleInsights.mostImproved.label}
              desc={`Completion rate climbed from ${roleInsights.mostImproved.before}% to ${roleInsights.mostImproved.after}% across the year — the biggest jump of any role.`}
            />
          ) : (
            <EmptyRoleNote text="Not enough spread across the year yet to call a most-improved role." />
          )}

          {roleInsights.mostConsistent ? (
            <RoleCard
              kicker="Most consistent"
              domain={roleInsights.mostConsistent.domain}
              name={roleInsights.mostConsistent.label}
              desc={`Held a ${roleInsights.mostConsistent.completionRate}% completion rate across ${roleInsights.mostConsistent.goalCount} goals — steady, not spiky.`}
            />
          ) : (
            <EmptyRoleNote text="No role has enough goals yet to measure consistency against." />
          )}

          {roleInsights.longestHeld && (
            <RoleCard
              kicker="Longest held"
              domain={roleInsights.longestHeld.domain}
              name={roleInsights.longestHeld.label}
              desc={`Year ${roleInsights.longestHeld.tenureYears} in this role — the longest-running identity in your Quadrant so far.`}
            />
          )}

          {roleInsights.quietest && (
            <RoleCard
              kicker="Still finding its rhythm"
              domain={roleInsights.quietest.domain}
              name={roleInsights.quietest.label}
              desc={`Only ${roleInsights.quietest.goalCount} goal${roleInsights.quietest.goalCount === 1 ? "" : "s"} set this year — worth some attention next year, no judgment either way.`}
              muted
            />
          )}

          {roleInsights.newThisYear.length > 0 && (
            <>
              <p className="mt-6 font-mono text-[11px] uppercase tracking-wide text-[#F97316]">
                New this year
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {roleInsights.newThisYear.map((r) => (
                  <span
                    key={r.roleId}
                    className="flex items-center gap-1.5 rounded-full border border-[#ECE8DF] bg-white px-3 py-1.5 text-xs font-medium"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: domainColor(r.domain) }}
                    />
                    {r.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </Chapter>

        {/* INTEGRITY */}
        <Chapter
          id="integrity"
          registerSection={registerSection}
          n={3}
          title="The honest parts count too"
          sub="A record of the truth-telling, not just the wins."
        >
          <div className="rounded-xl border border-[#ECE8DF] bg-white p-[18px]">
            <div className="font-serif text-[28px] font-semibold">
              {integrity.reflectedCount}
            </div>
            <p className="mt-1 text-[12.5px] text-[#6B7280]">
              times you told yourself the real reason something didn&apos;t
              happen, instead of just letting it disappear.
            </p>
          </div>

          {integrity.reflectedCount > 0 && (
            <div className="mt-2.5 rounded-xl border border-[#ECE8DF] bg-white p-[18px]">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-wide text-[#9CA3AF]">
                What happened after
              </p>
              <div className="mb-2 flex h-[9px] overflow-hidden rounded-[5px] bg-[#F3F4F6]">
                <div
                  style={{
                    width: `${(integrity.carriedCount / integrity.reflectedCount) * 100}%`,
                    background: "#F97316",
                  }}
                />
                <div
                  style={{
                    width: `${(integrity.cancelledCount / integrity.reflectedCount) * 100}%`,
                    background: "#E5E1D8",
                  }}
                />
              </div>
              <div className="flex gap-3.5 text-[11.5px] text-[#6B7280]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#F97316]" />
                  {integrity.carriedCount} carried forward
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#E5E1D8]" />
                  {integrity.cancelledCount} let go
                </span>
              </div>
            </div>
          )}
        </Chapter>

        {/* MISSION */}
        <Chapter
          id="mission"
          registerSection={registerSection}
          n={4}
          title="Did it match what you wrote?"
          sub="Your mission statement, next to how this year actually went."
        >
          {statementSnippet ? (
            <>
              <div className="relative rounded-[4px] border border-[#ECE8DF] bg-white p-[26px]">
                <div className="pointer-events-none absolute inset-[9px] rounded-sm border border-[#F1EEE7]" />
                <p className="font-serif text-base italic leading-[1.7] text-[#1F2937]">
                  &ldquo;{statementSnippet}&rdquo;
                </p>
              </div>
              <p className="mt-3.5 text-[12.5px] leading-relaxed text-[#9CA3AF]">
                Alongside it: {momentum.completedGoals} goals completed and{" "}
                {integrity.reflectedCount} honest reflections this year. Only
                you can say whether the two actually line up.
              </p>
            </>
          ) : missionStatement ? (
            <p className="rounded-xl border border-dashed border-[#E5E1D8] bg-white p-4 text-sm text-[#C9CBCF]">
              You&apos;ve signed a mission statement, but it couldn&apos;t be
              decrypted this session.
            </p>
          ) : (
            <p className="rounded-xl border border-dashed border-[#E5E1D8] bg-white p-4 text-sm text-[#9CA3AF]">
              No mission statement signed yet.
            </p>
          )}
        </Chapter>

        {/* IDENTITY */}
        <Chapter
          id="identity"
          registerSection={registerSection}
          n={5}
          title="In a phrase"
          sub="Based on where your goals actually landed this year, not where you meant them to."
        >
          <div className="rounded-2xl border border-[#ECE8DF] bg-white px-5 py-[30px] text-center">
            <div className="mb-2.5 font-serif text-xl font-semibold text-[#1F2937]">
              {identity.title}
            </div>
            <p className="mx-auto max-w-[34ch] text-[13px] leading-relaxed text-[#6B7280]">
              Drawn from which domains your completed goals leaned into most
              this year.
            </p>
          </div>
        </Chapter>

        {/* RINGS */}
        <Chapter
          id="rings"
          registerSection={registerSection}
          n={6}
          title="Your rings, together"
          sub="Every role's growth ring, side by side — the closest thing to a portrait of your year."
        >
          <div className="flex items-center justify-center py-5">
            <RingPortrait rings={rings} />
          </div>
        </Chapter>

        {/* CLOSE */}
        <Chapter
          id="close"
          registerSection={registerSection}
          n={7}
          title="Taking this into next year"
          sub="What's carrying forward, and one thing worth sitting with."
        >
          {integrity.carriedCount > 0 && (
            <div className="mb-2.5 rounded-2xl bg-[#F3F4F6] p-[18px]">
              <p className="text-[13.5px] font-semibold">
                {integrity.carriedCount} goal
                {integrity.carriedCount === 1 ? "" : "s"} carried into next year
              </p>
              <p className="mt-0.5 text-[11.5px] text-[#9CA3AF]">
                Reflected on honestly, then chosen again.
              </p>
            </div>
          )}
          {roleInsights.quietest && (
            <div className="mb-2.5 rounded-2xl bg-[#F3F4F6] p-[18px]">
              <p className="text-[13.5px] font-semibold">
                Your {roleInsights.quietest.label} role is due some attention
              </p>
              <p className="mt-0.5 text-[11.5px] text-[#9CA3AF]">
                The quietest role this year — worth a fresh goal whenever feels
                right.
              </p>
            </div>
          )}

          <div className="mt-9 border-t border-dashed border-[#E5E1D8] pt-9">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-[#F97316]">
              Optional
            </p>
            <p className="mb-4 text-xs leading-relaxed text-[#9CA3AF]">
              Everything above is just for you. If there&apos;s one piece
              you&apos;d actually want to share, this is the only screen built
              with that in mind.
            </p>
            <button
              onClick={() => setShareOpen((s) => !s)}
              className="w-full rounded-[10px] border border-[#E5E1D8] bg-white py-3 text-sm font-semibold text-[#1F2937] hover:bg-[#F3F4F6]"
            >
              Preview a shareable card
            </button>

            {shareOpen && (
              <div className="mt-4 rounded-2xl bg-[#1F2937] p-[26px] text-center text-white">
                <div className="mx-auto mb-3.5 grid h-[26px] w-[26px] grid-cols-2 grid-rows-2 gap-[3px]">
                  <span className="rounded bg-white/15" />
                  <span className="rounded bg-[#FACC15]" />
                  <span className="rounded bg-white/15" />
                  <span className="rounded bg-white/15" />
                </div>
                <h3 className="mb-1.5 font-serif text-lg font-semibold">
                  {identity.title}
                </h3>
                <p className="text-xs text-white/60">
                  {momentum.completedGoals} goals completed &middot;{" "}
                  {momentum.activeDays} days shown up &middot; {year}
                </p>
                <button className="mt-4 w-full rounded-[9px] bg-[#F97316] py-2.5 text-[13px] font-semibold text-white">
                  Download image
                </button>
              </div>
            )}
          </div>
        </Chapter>
      </div>
    </div>
  );
}

function YearSwitcher({
  year,
  setYear,
}: {
  year: number;
  setYear: (y: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={() => setYear(year - 1)}
        className="rounded-md border border-[#E5E1D8] bg-white p-1 text-[#6B7280] hover:bg-[#F3F4F6]"
        aria-label="Previous year"
      >
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span className="font-mono text-[11px] text-[#9CA3AF]">{year}</span>
      <button
        onClick={() => setYear(year + 1)}
        disabled={year >= new Date().getFullYear()}
        className="rounded-md border border-[#E5E1D8] bg-white p-1 text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-30"
        aria-label="Next year"
      >
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}

function Chapter({
  id,
  registerSection,
  n,
  title,
  sub,
  children,
}: {
  id: string;
  registerSection: (id: string, el: HTMLElement | null) => void;
  n: number;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      ref={(el) => {
        registerSection(id, el);
      }}
      className="yr-reveal scroll-mt-14 px-[22px] py-10"
    >
      <p className="mb-2.5 font-mono text-[11px] uppercase tracking-wide text-[#F97316]">
        Chapter {n}
      </p>
      <h1 className="mb-3 font-serif text-[26px] font-semibold leading-tight text-[#1F2937]">
        {title}
      </h1>
      <p className="mb-6 max-w-[38ch] text-[13.5px] leading-relaxed text-[#6B7280]">
        {sub}
      </p>
      {children}
    </section>
  );
}

function StatCard({ num, label }: { num: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl border border-[#ECE8DF] bg-white p-4">
      <div className="font-serif text-[26px] font-semibold text-[#1F2937]">
        {num}
      </div>
      <div className="mt-1 text-[11.5px] leading-tight text-[#9CA3AF]">
        {label}
      </div>
    </div>
  );
}

function Bookend({ tag, title }: { tag: string; title: string }) {
  return (
    <div className="flex-1 rounded-xl border border-[#ECE8DF] bg-white p-3.5">
      <div className="font-mono text-[9.5px] uppercase text-[#C9CBCF]">
        {tag}
      </div>
      <div className="mt-1 text-[13px] font-semibold">{title}</div>
    </div>
  );
}

function RoleCard({
  kicker,
  domain,
  name,
  desc,
  muted,
}: {
  kicker: string;
  domain: string;
  name: string;
  desc: string;
  muted?: boolean;
}) {
  const color = muted ? "#9CA3AF" : domainColor(domain);
  return (
    <div
      className="mb-3 rounded-xl border border-[#ECE8DF] bg-white p-4"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <p
        className="mb-1.5 font-mono text-[10px] uppercase tracking-wide"
        style={{ color }}
      >
        {kicker}
      </p>
      <p className="mb-1 font-serif text-[17px] font-semibold text-[#1F2937]">
        {name}
      </p>
      <p className="text-[12.5px] leading-relaxed text-[#6B7280]">{desc}</p>
    </div>
  );
}

function EmptyRoleNote({ text }: { text: string }) {
  return (
    <p className="mb-3 rounded-xl border border-dashed border-[#E5E1D8] bg-white p-4 text-[12.5px] text-[#C9CBCF]">
      {text}
    </p>
  );
}

function RingPortrait({ rings }: { rings: YearReview["rings"] }) {
  if (rings.length === 0)
    return <p className="text-sm text-[#C9CBCF]">No roles yet to show here.</p>;

  const gap = 14;
  const baseRadius = 20;
  const strokeWidth = 8;
  const outer = baseRadius + rings.length * gap + strokeWidth;
  const size = outer * 2 + 20;

  return (
    <svg
      viewBox={`${-outer - 10} ${-outer - 10} ${size} ${size}`}
      width={Math.min(size, 280)}
      height={Math.min(size, 280)}
    >
      {rings.map((r, i) => {
        const radius = baseRadius + i * gap;
        const c = 2 * Math.PI * radius;
        const progress = r.sealed
          ? 1
          : Math.min(r.votesLogged / VOTES_PER_RING_VISUAL, 1);
        const offset = c * (1 - progress);
        return (
          <g key={r.roleId}>
            <circle
              r={radius}
              fill="none"
              stroke="#F3F4F6"
              strokeWidth={strokeWidth}
            />
            <circle
              r={radius}
              fill="none"
              stroke={domainColor(r.domain)}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              transform="rotate(-90)"
            />
          </g>
        );
      })}
      <g transform="translate(-11,-11)">
        <rect x="0" y="0" width="10" height="10" rx="2" fill="#F3F4F6" />
        <rect x="12" y="0" width="10" height="10" rx="2" fill="#F97316" />
        <rect x="0" y="12" width="10" height="10" rx="2" fill="#F3F4F6" />
        <rect x="12" y="12" width="10" height="10" rx="2" fill="#F3F4F6" />
      </g>
    </svg>
  );
}
