"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "../avatar/Avatar";
import { AvatarEditor } from "../avatar/AvatarEditor";
import { FeaturedChips } from "./FeaturedChips";
import { LOCKED_MESSAGE } from "../../lib/sealedFields";
import type { ProfileData } from "../../hooks/useProfile";

const NEWER_CARD =
  "This card was saved by a newer version. Update the app to edit it.";
const UNREADABLE_CARD = "Your saved card cannot be read. Saving replaces it.";

/**
 * The ID card, shared by the phone page and the desktop profile column
 * (WO-140). Owns the flip, the barcode and the avatar editor; all data
 * comes from useProfile.
 */
export function ProfileCard({
  profile,
  variant,
}: {
  profile: ProfileData;
  variant: "phone" | "desktop";
}) {
  const { loading, user, roles, statementSnippet, statementMeta, card, saveCard } = profile;
  const [flipped, setFlipped] = useState(false);
  const [barcode, setBarcode] = useState<number[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    // Random on mount only: generating in the initializer would differ from the server HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBarcode(Array.from({ length: 14 }, () => 8 + Math.random() * 14));
  }, []);

  const desktop = variant === "desktop";
  const featured = roles.filter((r) => r.isFeatured).slice(0, 2);
  const currentMonth = new Date().getMonth();
  const longestYears = roles.reduce((max, r) => Math.max(max, r.tenureYears), 0);
  const identityTitle =
    featured.length > 0
      ? featured.map((r) => `${ordinal(r.tenureYears)} Year ${r.label}`).join(" \u00b7 ")
      : "Set up your featured roles";
  const av = card?.ok ? card.card.av : null;
  const name =
    card?.ok && card.card.name
      ? card.card.name
      : (user?.email.split("@")[0] ?? "Your name");
  const locked =
    card !== null && !card.ok && (card.reason === "no-key" || card.reason === "unknown-version");
  const notice =
    card !== null && !card.ok
      ? card.reason === "no-key"
        ? LOCKED_MESSAGE
        : card.reason === "unknown-version"
          ? NEWER_CARD
          : null
      : null;
  const replaceNotice =
    card !== null && !card.ok && (card.reason === "unreadable" || card.reason === "bad-codes");

  function openEditor() {
    if (!card || locked) return;
    setEditing(true);
  }

  return (
    <>
      <div className={desktop ? "mb-2" : "mb-3"} style={{ perspective: "1400px" }}>
        <div
          role="button"
          tabIndex={0}
          aria-label="Flip card"
          onClick={() => setFlipped((f) => !f)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              if (e.key === " ") e.preventDefault();
              setFlipped((f) => !f);
            }
          }}
          className="relative w-full cursor-pointer text-left"
          style={{
            ...(desktop ? { height: "258px" } : { aspectRatio: "1.586/1" }),
            transformStyle: "preserve-3d",
            transition: "transform .6s cubic-bezier(.4,.2,.2,1)",
            transform: flipped ? "rotateY(180deg)" : "none",
          }}
        >
          {/* FRONT */}
          <div
            className={`absolute inset-0 flex flex-col rounded-2xl border border-[#ECE8DF] bg-white ${
              desktop ? "p-5" : "p-4"
            }`}
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
                {user
                  ? `QD\u2013${user.email.length.toString().padStart(6, "0")}`
                  : ""}
              </span>
            </div>

            <div className="my-2 flex items-center gap-3.5">
              <div className="relative shrink-0">
                <button
                  type="button"
                  aria-label="Edit avatar"
                  disabled={!card}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditor();
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="flex h-[52px] w-[52px] items-center justify-center rounded-full"
                >
                  <Avatar codes={av} size={52} />
                </button>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#ECE8DF] bg-white text-[#9CA3AF]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="9"
                    height="9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </span>
              </div>
              <div className="min-w-0">
                <div className="mb-1 truncate border-b border-dashed border-[#E5E1D8] pb-0.5 font-serif text-base font-semibold text-[#1F2937]">
                  {name}
                </div>
                <div className="font-mono text-[10px] leading-tight text-[#F97316]">
                  {identityTitle}
                </div>
              </div>
            </div>

            <div className="mb-3 flex gap-4">
              <MetaField
                label="Member since"
                value={user ? formatMonthYear(user.createdAt) : "\u2014"}
              />
              <MetaField label="Active roles" value={String(roles.length)} />
              <MetaField
                label="Longest role"
                value={longestYears > 0 ? `${longestYears} yrs` : "\u2014"}
              />
            </div>

            <FeaturedChips featured={featured} ready={!loading} currentMonth={currentMonth} />

            {desktop && (
              <div className="absolute bottom-2.5 right-3 flex items-center gap-1 font-mono text-[8.5px] text-[#C9CBCF]">
                <svg
                  viewBox="0 0 24 24"
                  width="11"
                  height="11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-3-6.7" />
                  <polyline points="21 3 21 9 15 9" />
                </svg>
                flip
              </div>
            )}
          </div>

          {/* BACK */}
          <div
            className={`absolute inset-0 flex flex-col rounded-2xl border border-[#ECE8DF] bg-white ${
              desktop ? "p-5" : "p-4"
            }`}
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              boxShadow: "0 10px 30px -14px rgba(31,41,55,0.25)",
            }}
          >
            <div
              className={`${
                desktop ? "-mx-5 -mt-5" : "-mx-4 -mt-4"
              } mb-3.5 h-[26px] rounded-t-2xl`}
              style={{
                background:
                  "repeating-linear-gradient(135deg,#2B2620,#2B2620 6px,#3a342b 6px,#3a342b 12px)",
              }}
            />
            <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-[#B7B2A7]">
              Mission statement
            </p>

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
                {desktop
                  ? "You haven't written one yet \u2014 see the panel to the right"
                  : "You haven't written one yet \u2014 tap to start"}
              </Link>
            )}

            <div className="mt-3 flex items-end justify-between">
              <div className="w-[56%] border-t border-dashed border-[#E5E1D8] pt-1 font-mono text-[8.5px] text-[#C9CBCF]">
                {statementMeta
                  ? `Signed by ${statementMeta.signedName}`
                  : "Signature"}
              </div>
              <div className="flex h-[22px] items-end gap-[1.5px]">
                {barcode.map((h, i) => (
                  <span
                    key={i}
                    className="w-[2px] bg-[#D6D2C8]"
                    style={{ height: h }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        {!desktop && (
          <p className="mt-2 text-center text-[11px] text-[#6B7280]">
            {flipped ? "Tap the card to flip it back" : "\u21bb Tap the card to flip it"}
          </p>
        )}
      </div>

      {notice && (
        <p role="status" className="mt-2 text-[11px] text-[#9CA3AF]">
          {notice}
        </p>
      )}

      {editing && (
        <AvatarEditor
          initial={card?.ok ? card.card : { v: 1, av: null }}
          notice={replaceNotice ? UNREADABLE_CARD : undefined}
          onSave={async (next) => {
            await saveCard(next);
            setEditing(false);
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

export function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="font-mono text-[9px] text-[#B7B2A7]">
      {label}
      <b className="mt-0.5 block text-[11px] font-semibold text-[#6B7280]">
        {value}
      </b>
    </div>
  );
}

function ordinal(n: number): string {
  const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}
