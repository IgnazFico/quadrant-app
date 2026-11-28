"use client";

import { useState } from "react";
import Link from "next/link";
import { isRecapWindowOpen } from "../../lib/yearRecapWindow";
import { NotificationBell } from "../notifications/NotificationBell";
import { FeedbackModal } from "../feedback/FeedbackModal";
import { RoleBadgeTile } from "../constellation/RoleBadgeTile";
import { useAuthStore } from "../../store/authStore";
import { signOutAction } from "../../lib/authActions";
import { ProfileCard } from "./ProfileCard";
import type { ProfileData, RoleBadge } from "../../hooks/useProfile";

export function ProfilePage({ profile }: { profile: ProfileData }) {
  const { loading, roles, toggleFeatured } = profile;
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const clearMasterKey = useAuthStore((s) => s.clearMasterKey);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#9CA3AF]">
        Loading profile...
      </div>
    );
  }

  const currentMonth = new Date().getMonth();
  // "Your year in Quadrant" is a once-a-year ceremony: only offered Dec 20 to Dec 31 (D-032).
  const showYearReview = isRecapWindowOpen();

  return (
    <div className="flex justify-center bg-[#FFF9F2] px-[18px] pb-[calc(var(--bar-clear)+24px)] pt-5">
      <div className="w-full max-w-[440px]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-serif text-[15px] font-semibold text-[#9CA3AF]">
              Quadrant
            </span>
          </div>
          <NotificationBell />
        </div>

        <h1 className="mb-6 font-serif text-2xl font-semibold text-[#1F2937]">
          Profile
        </h1>

        <ProfileCard profile={profile} variant="phone" />

        {/* ALL BADGES */}
        <section className="mt-7">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-[15px] font-semibold text-[#1F2937]">
              All role badges
            </h2>
            <span className="font-mono text-[11px] text-[#9CA3AF]">
              {roles.length} roles
            </span>
          </div>
          <p className="mb-3 text-[12px] leading-relaxed text-[#9CA3AF]">
            Each star is a month of this year. It lights up when you finish a
            goal in that role. Tap a badge to feature it on your card.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {/* GROWTH-RING-REDESIGN: role badge constellations (was ringSvg) */}
            {roles.map((r) => (
              <RoleBadgeTile
                key={r.id}
                role={r}
                currentMonth={currentMonth}
                onToggle={toggleFeatured}
              />
            ))}
            <Link
              href="/onboarding/roles"
              className="flex items-center justify-center rounded-xl border border-dashed border-[#D6D2C8] p-3 text-[11.5px] text-[#C9CBCF] hover:border-[#F97316] hover:text-[#F97316]"
            >
              + add role
            </Link>
          </div>
        </section>
        {showYearReview && (
          <Link
            href="/year-review"
            className="mt-4 flex w-full items-center justify-between rounded-xl border border-[#ECE8DF] bg-white px-4 py-3.5 text-sm font-semibold text-[#1F2937] hover:bg-[#F3F4F6]"
          >
            Your year in Quadrant
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="#9CA3AF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        )}

        <button
          type="button"
          onClick={() => setShowFeedbackModal(true)}
          className={`${showYearReview ? "mt-3" : "mt-4"} flex w-full items-center justify-between rounded-xl border border-[#ECE8DF] bg-white px-4 py-3.5 text-sm font-semibold text-[#1F2937] transition hover:bg-[#F3F4F6]`}
        >
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#F97316]" />
            Beta Feedback & Friction Report
          </span>
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="#9CA3AF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
        />

        <form action={signOutAction} onSubmit={() => clearMasterKey()} className="mt-3">
          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-xl border border-[#ECE8DF] bg-white px-4 py-3.5 text-sm font-semibold text-[#C0392B] transition hover:bg-[#FDECEC]"
          >
            Log out
          </button>
        </form>

        <div className="mt-4 flex gap-2 rounded-lg bg-[#F3F4F6] px-3 py-2.5 text-[11px] leading-relaxed text-[#9CA3AF]">
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            className="mt-0.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            Tap a badge below to feature it on the card front (up to 2). Each
            star is a month of this year, and it brightens as you finish goals.
          </span>
        </div>
      </div>
    </div>
  );
}

export type { RoleBadge };

