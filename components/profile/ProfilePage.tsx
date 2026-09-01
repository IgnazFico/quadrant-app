"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { domainColor } from "../../lib/domainColors";
import { useAuthStore } from "../../store/authStore";
import { decryptField, fromBase64 } from "../../lib/crypto";

type Ring = { year: number; votesLogged: number; sealed: boolean } | null;
type RoleBadge = {
  id: string;
  label: string;
  domain: string;
  isFeatured: boolean;
  tenureYears: number;
  ring: Ring;
};

// Purely a visual fill target so the ring reads as "making progress" —
// sealing itself is time-based (year boundary), never vote-count-based.
// See lib/growthRing.ts.
const VOTES_PER_RING_VISUAL = 24;

function ringSvg(color: string, progress: number, size: number) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#F3F4F6"
        strokeWidth="3"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </svg>
  );
}

export function ProfilePage() {
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string; createdAt: string } | null>(
    null,
  );
  const [roles, setRoles] = useState<RoleBadge[]>([]);
  const [statementSnippet, setStatementSnippet] = useState<string | null>(null);
  const [statementMeta, setStatementMeta] = useState<{
    signedName: string;
    signedAt: string;
  } | null>(null);
  const [barcode, setBarcode] = useState<number[]>([]);
  const masterKey = useAuthStore((s) => s.masterKey);

  useEffect(() => {
    setBarcode(Array.from({ length: 14 }, () => 8 + Math.random() * 14));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/profile");
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const body = await res.json();
      setUser(body.user);
      setRoles(body.roles);

      if (body.missionStatement) {
        setStatementMeta({
          signedName: body.missionStatement.signedName,
          signedAt: body.missionStatement.signedAt,
        });
        if (masterKey) {
          try {
            const full = await decryptField(
              await fromBase64(body.missionStatement.contentEncrypted),
              masterKey,
            );
            setStatementSnippet(
              full.length > 140 ? full.slice(0, 140).trim() + "\u2026" : full,
            );
          } catch {
            setStatementSnippet(null);
          }
        }
      }
      setLoading(false);
    })();
  }, [masterKey]);

  async function toggleFeatured(role: RoleBadge) {
    const currentlyFeatured = roles.filter((r) => r.isFeatured);
    if (!role.isFeatured && currentlyFeatured.length >= 2) return; // cap at 2, matching the prototype

    const next = !role.isFeatured;
    setRoles((prev) =>
      prev.map((r) => (r.id === role.id ? { ...r, isFeatured: next } : r)),
    );
    await fetch(`/api/roles/${role.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: next }),
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#9CA3AF]">
        Loading profile...
      </div>
    );
  }

  const featured = roles.filter((r) => r.isFeatured).slice(0, 2);
  const longestYears = roles.reduce(
    (max, r) => Math.max(max, r.tenureYears),
    0,
  );
  const identityTitle =
    featured.length > 0
      ? featured
          .map((r) => `${ordinal(r.tenureYears)} Year ${r.label}`)
          .join(" \u00b7 ")
      : "Set up your featured roles";

  return (
    <div className="flex justify-center bg-[#FFF9F2] px-[18px] pb-24 pt-5">
      <div className="w-full max-w-[440px]">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-4 w-4 grid-cols-2 grid-rows-2 gap-[2px]">
            <span className="rounded-[2px] bg-[#F3F4F6]" />
            <span className="rounded-[2px] bg-[#F97316]" />
            <span className="rounded-[2px] bg-[#F3F4F6]" />
            <span className="rounded-[2px] bg-[#F3F4F6]" />
          </div>
          <span className="font-serif text-[15px] font-semibold text-[#9CA3AF]">
            Quadrant
          </span>
        </div>

        <h1 className="mb-1 font-serif text-2xl font-semibold text-[#1F2937]">
          Profile
        </h1>
        <p className="mb-6 text-[13px] text-[#6B7280]">
          Tap the card to flip it.
        </p>

        {/* ID CARD */}
        <div className="mb-3" style={{ perspective: "1400px" }}>
          <button
            onClick={() => setFlipped((f) => !f)}
            className="relative w-full text-left"
            style={{
              aspectRatio: "1.586/1",
              transformStyle: "preserve-3d",
              transition: "transform .6s cubic-bezier(.4,.2,.2,1)",
              transform: flipped ? "rotateY(180deg)" : "none",
            }}
          >
            {/* FRONT */}
            <div
              className="absolute inset-0 flex flex-col rounded-2xl border border-[#ECE8DF] bg-white p-4"
              style={{
                backfaceVisibility: "hidden",
                boxShadow: "0 10px 30px -14px rgba(31,41,55,0.25)",
              }}
            >
              <div className="mb-auto flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="grid h-3.5 w-3.5 grid-cols-2 grid-rows-2 gap-[1.5px]">
                    <span className="rounded-[1.5px] bg-[#F3F4F6]" />
                    <span className="rounded-[1.5px] bg-[#F97316]" />
                    <span className="rounded-[1.5px] bg-[#F3F4F6]" />
                    <span className="rounded-[1.5px] bg-[#F3F4F6]" />
                  </div>
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
                <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-[#D6D2C8] bg-[#F3F4F6] text-[#C9CBCF]">
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
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
                <MetaField
                  label="Member since"
                  value={user ? formatMonthYear(user.createdAt) : "\u2014"}
                />
                <MetaField label="Active roles" value={String(roles.length)} />
                <MetaField
                  label="Longest streak"
                  value={longestYears > 0 ? `${longestYears} yrs` : "\u2014"}
                />
              </div>

              <div className="mt-auto flex gap-2.5">
                {featured.length === 0 ? (
                  <p className="text-[11px] text-[#C9CBCF]">
                    Feature up to 2 roles below
                  </p>
                ) : (
                  featured.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-1 items-center gap-1.5 rounded-lg bg-[#F3F4F6] px-2.5 py-1.5"
                    >
                      <div className="shrink-0">
                        {ringSvg(
                          domainColor(r.domain),
                          ringProgress(r.ring),
                          22,
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[10.5px] font-semibold leading-tight">
                          {r.label}
                        </div>
                        <div className="font-mono text-[8.5px] text-[#9CA3AF]">
                          Year {r.tenureYears}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

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
            </div>

            {/* BACK */}
            <div
              className="absolute inset-0 flex flex-col rounded-2xl border border-[#ECE8DF] bg-white p-4"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                boxShadow: "0 10px 30px -14px rgba(31,41,55,0.25)",
              }}
            >
              <div
                className="-mx-4 -mt-4 mb-3.5 h-[26px] rounded-t-2xl"
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
                  You haven&apos;t written one yet &mdash; tap to start
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
          </button>
        </div>

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
          <div className="grid grid-cols-2 gap-2.5">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => toggleFeatured(r)}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left ${
                  r.isFeatured
                    ? "border-[#F97316] bg-[#FFF7EA]"
                    : "border-[#ECE8DF] bg-white"
                }`}
              >
                {ringSvg(domainColor(r.domain), ringProgress(r.ring), 30)}
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-semibold text-[#1F2937]">
                    {r.label}
                  </div>
                  <div className="font-mono text-[9.5px] text-[#9CA3AF]">
                    Year {r.tenureYears}
                  </div>
                </div>
              </button>
            ))}
            <Link
              href="/onboarding/roles"
              className="flex items-center justify-center rounded-xl border border-dashed border-[#D6D2C8] p-3 text-[11.5px] text-[#C9CBCF] hover:border-[#F97316] hover:text-[#F97316]"
            >
              + add role
            </Link>
          </div>
        </section>
        <Link
          href="/year-review"
          className="mt-4 flex items-center justify-between rounded-xl border border-[#ECE8DF] bg-white px-4 py-3.5 text-sm font-semibold text-[#1F2937] hover:bg-[#F3F4F6]"
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
            Tap a badge below to feature it on the card front (up to 2). Ring
            progress fills as goals are completed this year.
          </span>
        </div>
      </div>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="font-mono text-[9px] text-[#B7B2A7]">
      {label}
      <b className="mt-0.5 block text-[11px] font-semibold text-[#6B7280]">
        {value}
      </b>
    </div>
  );
}

function ringProgress(ring: Ring): number {
  if (!ring) return 0;
  if (ring.sealed) return 1;
  return Math.min(ring.votesLogged / VOTES_PER_RING_VISUAL, 1);
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
