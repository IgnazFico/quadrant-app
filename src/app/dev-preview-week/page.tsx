"use client";

// TEMPORARY visual-check harness — delete before commit. 404s in production.
import { notFound, useSearchParams } from "next/navigation";
import { AppShell } from "../../../components/nav/AppShell";
import { ReflectDesktopView } from "../../../components/reflect/ReflectDesktopView";
import { addDays, startOfWeek } from "../../../lib/week";
import type { ReviewData } from "../../../hooks/useReview";
import type { PatternsData } from "../../../components/patterns/cardContent";

export default function PreviewReflect() {
  const sp = useSearchParams();
  if (process.env.NODE_ENV === "production") notFound();
  const due = sp.get("due") === "1";
  const ws = startOfWeek();
  const last = addDays(ws, -7);
  const lastRoles = [
    { id: "r1", label: "Software Architect", domain: "career", goals: [
      { id: "l1", title: "Ship the staging environment", status: "DONE", carryForward: true, reviewEntry: null },
      { id: "l2", title: "Write the ADR for the sync engine", status: due ? "IN_PROGRESS" : "MISSED", carryForward: false,
        reviewEntry: due ? null : { id: "e1", choice: "CARRY", reasonEncrypted: "", reason: "Got pulled into incident work Wednesday." } },
    ] },
    { id: "r2", label: "Physical Vitality", domain: "health", goals: [
      { id: "l3", title: "Run 5km three times", status: "DONE", carryForward: false, reviewEntry: null },
      { id: "l4", title: "Lights out by 23:00", status: "MISSED", carryForward: false,
        reviewEntry: { id: "e2", choice: "CANCEL", reasonEncrypted: "", reason: "Not realistic with the new shift." } },
    ] },
  ];
  const review = {
    weekStart: last, due, roles: lastRoles, loading: false, error: null, masterKey: new Uint8Array(1), activeReflect: null,
    doneCount: 2, totalCount: 4, pct: 50, canFinish: false,
    toggleCarry: () => {}, startReflect: () => {}, cancelReflect: () => {}, submitReflection: async () => ({ ok: true }), completeReview: async () => {},
  } as unknown as ReviewData;
  const thisWeek = { weekStart: ws, loading: false, roles: [
    { id: "r1", label: "Software Architect", domain: "career", goals: [
      { id: "g1", title: "Ship the staging environment", status: "DONE", carryForward: false },
      { id: "g2", title: "Pair with Dana on the auth refactor", status: "IN_PROGRESS", carryForward: false },
    ] },
    { id: "r2", label: "Physical Vitality", domain: "health", goals: [
      { id: "g4", title: "Run 5km three times this week", status: "IN_PROGRESS", carryForward: false },
    ] },
    { id: "r3", label: "Partner", domain: "family", goals: [
      { id: "g6", title: "Plan Saturday picnic", status: "DONE", carryForward: false },
    ] },
  ] } as never;
  const days = Array.from({ length: 31 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, "0")}`, active: i < 2 || i % 3 === 0 }));
  const data: PatternsData = {
    year: 2026, month: 10,
    rhythm: { weekday: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((label, i) => ({ label, count: [0,3,5,2,4,1,0][i] })), daypart: { morning: 50, afternoon: 30, evening: 20 } },
    presence: { activeDaysCount: 12, heatmap: days },
    balance: { roles: [{ roleId: "r1", label: "Software Architect", domain: "career", completed: 6, share: 60 }, { roleId: "r2", label: "Physical Vitality", domain: "health", completed: 4, share: 40 }], rolesWithActivity: 2, totalRoles: 3 },
    style: { scheduledPct: 70, flexiblePct: 30, linkedPct: 60, standalonePct: 40 },
    honesty: { reflectedCount: 5, carriedCount: 3, cancelledCount: 2 },
  };
  return (
    <AppShell email="ignaz@example.com">
      <ReflectDesktopView review={review} patterns={{ data, loading: false }} thisWeek={thisWeek} />
    </AppShell>
  );
}
