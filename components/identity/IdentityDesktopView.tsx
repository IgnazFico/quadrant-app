"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { constellationTint } from "../../lib/domainColors";
import { YearBadge } from "../constellation/YearBadge";
import { RoleBadgeTile } from "../constellation/RoleBadgeTile";
import type { ProfileData } from "../../hooks/useProfile";
import { MetaField } from "../profile/ProfilePage";

/**
 * Desktop merged "Identity" view — Profile (ID card + role badges) next to
 * a Mission statement panel, matching web-prototype/app.js's pageIdentity()
 * (.identity-layout: 410px fixed left column + flexible right column,
 * gap 28px).
 *
 * The mission statement itself is still authored through the existing
 * full-page wizard at /mission-statement (components/mission/
 * MissionStatementFlow.tsx) rather than rebuilt inline here — that flow is
 * a deliberate one-time, focused ritual (7-day milestone framing, 4
 * questions, sign) and squeezing it into a side panel would undercut that.
 * This panel shows the DOCUMENT view (matching the prototype's
 * missionPanel() "already signed" branch) or a CTA into the wizard.
 *
 * Same precedent as WeekDesktopView.tsx / ReflectDesktopView.tsx: mobile
 * JSX untouched, desktop gets the true prototype merge, both driven by
 * the same shared hook (useProfile) so there is exactly one fetch
 * regardless of which mobile route (/profile) loaded it.
 */
export function IdentityDesktopView({ profile }: { profile: ProfileData }) {
  return (
    <div className="mx-auto grid max-w-[1180px] grid-cols-[410px_minmax(0,1fr)] items-start gap-7 px-8 py-8">
      <ProfileColumn profile={profile} />
      <MissionPanel profile={profile} />
    </div>
  );
}

function ProfileColumn({ profile }: { profile: ProfileData }) {
  const { loading, user, roles, statementSnippet, statementMeta, toggleFeatured } = profile;
  const [flipped, setFlipped] = useState(false);
  const [barcode, setBarcode] = useState<number[]>([]);
  const currentMonth = new Date().getMonth();

  useEffect(() => {
    setBarcode(Array.from({ length: 14 }, () => 8 + Math.random() * 14));
  }, []);

  if (loading) {
    return (
      <section className="rounded-2xl border border-[#ECE8DF] bg-white p-5">
        <p className="text-sm text-[#9CA3AF]">Loading profile...</p>
      </section>
    );
  }

  const featured = roles.filter((r) => r.isFeatured).slice(0, 2);
  const longestYears = roles.reduce((max, r) => Math.max(max, r.tenureYears), 0);
  const identityTitle =
    featured.length > 0
      ? featured.map((r) => `${ordinal(r.tenureYears)} Year ${r.label}`).join(" \u00b7 ")
      : "Set up your featured roles";

  return (
    <section aria-label="Profile">
      {/* ID CARD */}
      <div className="mb-2" style={{ perspective: "1400px" }}>
        <button
          onClick={() => setFlipped((f) => !f)}
          className="relative w-full text-left"
          style={{
            height: "258px",
            transformStyle: "preserve-3d",
            transition: "transform .6s cubic-bezier(.4,.2,.2,1)",
            transform: flipped ? "rotateY(180deg)" : "none",
          }}
        >
          {/* FRONT */}
          <div
            className="absolute inset-0 flex flex-col rounded-2xl border border-[#ECE8DF] bg-white p-5"
            style={{
              backfaceVisibility: "hidden",
              boxShadow: "0 10px 30px -14px rgba(31,41,55,0.25)",
            }}
          >
            <div className="mb-auto flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9.5px] uppercase tracking-wide text-[#9CA3AF]">
                  Quadrant ID
                </span>
              </div>
              <span className="font-mono text-[9.5px] text-[#C9CBCF]">
                {user ? `QD\u2013${user.email.length.toString().padStart(6, "0")}` : ""}
              </span>
            </div>

            <div className="my-2 flex items-center gap-3.5">
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-[#D6D2C8] bg-[#F3F4F6] text-[#C9CBCF]">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="mb-1 border-b border-dashed border-[#E5E1D8] pb-0.5 font-serif text-base font-semibold text-[#1F2937]">
                  {user?.email.split("@")[0] ?? "Your name"}
                </div>
                <div className="font-mono text-[10px] leading-tight text-[#F97316]">
                  {identityTitle}
                </div>
              </div>
            </div>

            <div className="mb-3 flex gap-4">
              <MetaField label="Member since" value={user ? formatMonthYear(user.createdAt) : "\u2014"} />
              <MetaField label="Active roles" value={String(roles.length)} />
              <MetaField label="Longest role" value={longestYears > 0 ? `${longestYears} yrs` : "\u2014"} />
            </div>

            <div className="mt-auto flex gap-2.5">
              {featured.length === 0 ? (
                <p className="text-[11px] text-[#C9CBCF]">Feature up to 2 roles below</p>
              ) : (
                featured.map((r) => (
                  <div key={r.id} className="flex flex-1 items-center gap-1.5 rounded-lg bg-[#F3F4F6] px-2.5 py-1.5">
                    {/* GROWTH-RING-REDESIGN: featured-role constellation on the ID card (was ringSvg) */}
                    <div className="shrink-0">
                      <YearBadge
                        months={r.constellation.months}
                        peak={r.constellation.peak}
                        tint={constellationTint(r.domain)}
                        size={34}
                        sealed={r.constellation.sealed}
                        currentMonth={currentMonth}
                        label={r.label}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[10.5px] font-semibold leading-tight">{r.label}</div>
                      <div className="font-mono text-[8.5px] text-[#9CA3AF]">Year {r.tenureYears}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="absolute bottom-2.5 right-3 flex items-center gap-1 font-mono text-[8.5px] text-[#C9CBCF]">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-3-6.7" />
                <polyline points="21 3 21 9 15 9" />
              </svg>
              flip
            </div>
          </div>

          {/* BACK */}
          <div
            className="absolute inset-0 flex flex-col rounded-2xl border border-[#ECE8DF] bg-white p-5"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              boxShadow: "0 10px 30px -14px rgba(31,41,55,0.25)",
            }}
          >
            <div
              className="-mx-5 -mt-5 mb-3.5 h-[26px] rounded-t-2xl"
              style={{ background: "repeating-linear-gradient(135deg,#2B2620,#2B2620 6px,#3a342b 6px,#3a342b 12px)" }}
            />
            <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-[#B7B2A7]">Mission statement</p>
            {statementSnippet ? (
              <div className="flex-1 rounded-lg border border-dashed border-[#E5E1D8] p-2.5 font-serif text-[12px] italic leading-relaxed text-[#4B5563]">
                &ldquo;{statementSnippet}&rdquo;
              </div>
            ) : statementMeta ? (
              <div className="flex-1 rounded-lg border border-dashed border-[#E5E1D8] p-2.5 text-[11px] text-[#C9CBCF]">
                Signed, but couldn&apos;t be decrypted this session.
              </div>
            ) : (
              <Link
                href="/mission-statement"
                className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[#E5E1D8] p-2.5 text-center text-[11px] text-[#9CA3AF] hover:border-[#F97316] hover:text-[#F97316]"
              >
                You haven&apos;t written one yet &mdash; see the panel to the right
              </Link>
            )}
            <div className="mt-3 flex items-end justify-between">
              <div className="w-[56%] border-t border-dashed border-[#E5E1D8] pt-1 font-mono text-[8.5px] text-[#C9CBCF]">
                {statementMeta ? `Signed by ${statementMeta.signedName}` : "Signature"}
              </div>
              <div className="flex h-[22px] items-end gap-[1.5px]">
                {barcode.map((h, i) => (
                  <span key={i} className="w-[2px] bg-[#D6D2C8]" style={{ height: h }} />
                ))}
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* ROLE BADGES */}
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-serif text-[15px] font-semibold text-[#1F2937]">Role badges</h2>
        <Link href="/onboarding/roles" className="text-xs font-semibold text-[#F97316] hover:text-[#EA6A0C]">
          Edit roles &rarr;
        </Link>
      </div>
      <p className="mb-3 text-[12px] text-[#9CA3AF]">
        Each star is a month of this year. It lights up when you finish a goal in that role, and fuller months reach further out. Click a badge to feature it on the card (up to 2).
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {/* GROWTH-RING-REDESIGN: role badge constellations (was ringSvg) */}
        {roles.map((r) => (
          <RoleBadgeTile key={r.id} role={r} currentMonth={currentMonth} onToggle={toggleFeatured} />
        ))}
        <Link
          href="/onboarding/roles"
          className="flex items-center justify-center rounded-xl border border-dashed border-[#D6D2C8] p-3 text-[11.5px] text-[#C9CBCF] hover:border-[#F97316] hover:text-[#F97316]"
        >
          + add role
        </Link>
      </div>

      <Link
        href="/year-review"
        className="mt-4 flex w-full items-center justify-between rounded-xl border border-[#ECE8DF] bg-white px-4 py-3.5 text-sm font-semibold text-[#1F2937] hover:bg-[#F3F4F6]"
      >
        Your year in Quadrant
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </section>
  );
}

function MissionPanel({ profile }: { profile: ProfileData }) {
  const { loading, statementFull, statementMeta } = profile;

  if (loading) {
    return (
      <section className="rounded-2xl border border-[#ECE8DF] bg-white p-5">
        <p className="text-sm text-[#9CA3AF]">Loading...</p>
      </section>
    );
  }

  if (statementFull && statementMeta) {
    return (
      <section aria-label="Mission statement" className="rounded-2xl border border-[#ECE8DF] bg-white p-7">
        <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-[#F97316]">
          Mission statement
        </p>
        <h2 className="mb-5 font-serif text-xl font-semibold text-[#1F2937]">
          The words you chose.
        </h2>
        <p className="mb-6 font-serif text-[16px] italic leading-relaxed text-[#1F2937]">
          &ldquo;{statementFull}&rdquo;
        </p>
        <div className="flex items-end justify-between border-t border-[#ECE8DF] pt-4">
          <div>
            <div className="text-[11px] text-[#9CA3AF]">Signed by</div>
            <div className="font-serif text-base text-[#1F2937]">{statementMeta.signedName}</div>
          </div>
          <div className="text-right">
            <div className="text-[11.5px] text-[#9CA3AF]">
              {new Date(statementMeta.signedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <Link href="/mission-statement" className="mt-1.5 inline-block text-xs font-semibold text-[#F97316] hover:text-[#EA6A0C]">
              Revise statement
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Mission statement" className="rounded-2xl border border-[#ECE8DF] bg-white p-7">
      <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-[#F97316]">
        Seven days in
      </p>
      <h2 className="mb-4 font-serif text-xl font-semibold leading-snug text-[#1F2937]">
        You&apos;ve shown up for seven days. Let&apos;s write down why.
      </h2>
      <p className="mb-6 max-w-[46ch] text-[13.5px] leading-relaxed text-[#6B7280]">
        Four questions, a few honest words each. Quadrant assembles them into a
        statement you can sign — and revise whenever you grow.
      </p>
      <Link
        href="/mission-statement"
        className="inline-block rounded-lg bg-[#F97316] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#EA6A0C]"
      >
        Begin &rarr;
      </Link>
    </section>
  );
}

function ordinal(n: number): string {
  const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
