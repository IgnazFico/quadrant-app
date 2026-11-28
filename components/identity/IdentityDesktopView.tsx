"use client";

import Link from "next/link";
import { isRecapWindowOpen } from "../../lib/yearRecapWindow";
import { RoleBadgeTile } from "../constellation/RoleBadgeTile";
import type { ProfileData } from "../../hooks/useProfile";
import { ProfileCard } from "../profile/ProfileCard";

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
  const { loading, roles, toggleFeatured } = profile;
  const currentMonth = new Date().getMonth();
  // "Your year in Quadrant" is a once-a-year ceremony: only offered Dec 20 to Dec 31 (D-032).
  const showYearReview = isRecapWindowOpen();

  if (loading) {
    return (
      <section className="rounded-2xl border border-[#ECE8DF] bg-white p-5">
        <p className="text-sm text-[#9CA3AF]">Loading profile...</p>
      </section>
    );
  }

  return (
    <section aria-label="Profile">
      {/* ID CARD */}
      <ProfileCard profile={profile} variant="desktop" />

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

      {showYearReview && (
        <Link
          href="/year-review"
          className="mt-4 flex w-full items-center justify-between rounded-xl border border-[#ECE8DF] bg-white px-4 py-3.5 text-sm font-semibold text-[#1F2937] hover:bg-[#F3F4F6]"
        >
          Your year in Quadrant
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      )}
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

