"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { decryptField, fromBase64 } from "../lib/crypto";

// GROWTH-RING-REDESIGN: was `Ring = { year, votesLogged, sealed }`. The badge now
// draws this year's constellation: goals finished per month, sized against the
// role's own busiest month (`peak`).
export type RoleConstellation = {
  year: number;
  months: number[];
  sealed: boolean;
  peak: number;
};
export type RoleBadge = {
  id: string;
  label: string;
  domain: string;
  isFeatured: boolean;
  tenureYears: number;
  constellation: RoleConstellation;
};
export type ProfileUser = { email: string; createdAt: string };
export type StatementMeta = { signedName: string; signedAt: string };

export type ProfileData = ReturnType<typeof useProfile>;

/**
 * Shared data/mutation hook for the "Identity" surface (profile half —
 * ID card + role badges + mission statement). Extracted from
 * ProfilePage.tsx so the mobile page and the desktop merged view
 * (components/identity/IdentityDesktopView.tsx) share one fetch instead
 * of double-fetching or drifting out of sync — same precedent as
 * hooks/useWeek.ts and hooks/useReview.ts.
 */
export function useProfile() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [roles, setRoles] = useState<RoleBadge[]>([]);
  const [statementSnippet, setStatementSnippet] = useState<string | null>(null);
  const [statementFull, setStatementFull] = useState<string | null>(null);
  const [statementMeta, setStatementMeta] = useState<StatementMeta | null>(null);
  const masterKey = useAuthStore((s) => s.masterKey);

  const load = useCallback(async () => {
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
          setStatementFull(full);
          setStatementSnippet(
            full.length > 140 ? full.slice(0, 140).trim() + "\u2026" : full,
          );
        } catch {
          setStatementFull(null);
          setStatementSnippet(null);
        }
      }
    } else {
      setStatementMeta(null);
      setStatementFull(null);
      setStatementSnippet(null);
    }
    setLoading(false);
  }, [masterKey]);

  useEffect(() => {
    load();
  }, [load]);

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

  return {
    loading,
    user,
    roles,
    statementSnippet,
    statementFull,
    statementMeta,
    masterKey,
    toggleFeatured,
    refetch: load,
  };
}
