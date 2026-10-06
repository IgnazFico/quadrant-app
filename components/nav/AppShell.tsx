"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import { signOutAction } from "../../lib/authActions";
import { NotificationBell } from "../notifications/NotificationBell";
import { BottomNav } from "./BottomNav";
import { Toaster } from "../toast/Toaster";
import { QuadrantMark } from "../brand/QuadrantMark";

/**
 * App chrome for every (app) route.
 *
 * Below md: unchanged mobile experience — page content + the fixed
 * BottomNav. Nothing here adds styling at that size. The BottomNav wrapper
 * uses `hidden max-md:block` rather than `md:hidden` on purpose: the
 * desktop specs assert the single `.md:hidden` element (the mobile page
 * variant) is hidden, and a second match would be a strict-mode violation.
 *
 * md and up: one sticky top bar instead of the prototype's 256px sidebar.
 * Primary nav is only two destinations (Week, Reflect), which reads as
 * empty in a full-height column, so they sit as a segmented switcher in
 * the centre of the bar:
 *   [brand]        [ Week | Reflect ]        [date] [bell] | [avatar email] [⎋]
 * Identity (/profile) is reached from the account chip, not the switcher.
 * Year in review is deliberately not in the nav — it's a once-a-year
 * ceremony reached from the Identity page, RecapPrompt and the
 * YEAR_END_REVIEW notification.
 *
 * Focused flows (mission statement wizard, role onboarding, year-end
 * ceremony) render full-bleed with no chrome. The ceremony is
 * position:fixed anyway.
 *
 * The bar is ~61px tall (py-3 + 36px controls + 1px border);
 * WeekDesktopView's sticky roles column (top-[84px]) sits below it.
 *
 * IMPORTANT: internal links use next/link <Link>, never <a href> — a full
 * reload would drop the in-memory masterKey (see store/authStore.ts).
 */

const FOCUSED_ROUTES = ["/mission-statement", "/onboarding", "/year-review"];

const NAV = [
  { href: "/goals", label: "Week", match: ["/goals", "/schedule"] },
  // /patterns and /weekly-review render the same merged desktop view; when
  // a review is due the layout gate redirects to /weekly-review anyway.
  { href: "/patterns", label: "Reflect", match: ["/weekly-review", "/patterns", "/review"] },
];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const focused = FOCUSED_ROUTES.some((r) => matches(pathname, r));

  if (focused) {
    return (
      <>
        {children}
        <div className="hidden max-md:block">
          <BottomNav />
        </div>
        <Toaster />
      </>
    );
  }

  return (
    <>
      <div className="md:min-h-screen md:bg-[#FAF7F2] md:[background-image:linear-gradient(rgba(236,232,223,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(236,232,223,0.5)_1px,transparent_1px)] md:[background-position:-1px_-1px] md:[background-size:32px_32px]">
        <TopBar pathname={pathname} email={email} />
        <main className="min-w-0">{children}</main>
      </div>

      <div className="hidden max-md:block">
        <BottomNav />
      </div>
      <Toaster />
    </>
  );
}

function TopBar({ pathname, email }: { pathname: string; email: string }) {
  const clearMasterKey = useAuthStore((s) => s.clearMasterKey);
  const initials = (email.split("@")[0] || "Q").slice(0, 2).toUpperCase();
  const onProfile = matches(pathname, "/profile");

  return (
    <header className="sticky top-0 z-20 hidden grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-[#ECE8DF] bg-[rgba(250,247,242,0.9)] px-6 py-3 backdrop-blur-sm md:grid lg:px-10">
      {/* Left: brand */}
      <Link
        href="/goals"
        className="inline-flex items-center gap-2.5 justify-self-start font-serif text-[19px] font-bold tracking-[-0.01em] text-[#1F2937]"
      >
        <QuadrantMark size={24} />
        Quadrant
      </Link>

      {/* Centre: primary switcher */}
      <nav
        aria-label="Main"
        className="flex items-center gap-0.5 rounded-xl border border-[#ECE8DF] bg-[#F3EEE6] p-[3px]"
      >
        {NAV.map((item) => {
          const active = item.match.some((m) => matches(pathname, m));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-[30px] min-w-[104px] items-center justify-center rounded-[9px] px-4 text-[13.5px] font-semibold transition-colors ${
                active
                  ? "bg-white text-[#1F2937] shadow-[0_0_0_1px_#ECE8DF,0_2px_6px_rgba(31,41,55,0.06)]"
                  : "text-[#6B7280] hover:text-[#1F2937]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Right: date, bell, account (→ Identity), sign out */}
      <div className="flex min-w-0 items-center gap-3 justify-self-end">
        <span
          className="hidden font-mono text-[11px] font-medium text-[#9CA3AF] xl:inline"
          suppressHydrationWarning
        >
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </span>
        <NotificationBell />
        <span aria-hidden="true" className="h-6 w-px flex-none bg-[#ECE8DF]" />
        <Link
          href="/profile"
          aria-current={onProfile ? "page" : undefined}
          aria-label={`Identity — ${email}`}
          title="Identity — profile and mission"
          className={`flex h-9 min-w-0 items-center gap-2 rounded-[10px] p-1 transition-colors lg:pr-3 ${
            onProfile
              ? "bg-white shadow-[0_0_0_1px_#ECE8DF,0_2px_6px_rgba(31,41,55,0.06)]"
              : "hover:bg-[#F6F0E6]"
          }`}
        >
          <span
            className={`grid h-7 w-7 flex-none place-items-center rounded-full bg-[#FFF0E0] font-mono text-[11px] font-semibold text-[#C2410C] ${
              onProfile ? "shadow-[0_0_0_1.5px_#F97316]" : "shadow-[0_0_0_1px_rgba(249,115,22,0.2)]"
            }`}
          >
            {initials}
          </span>
          <span
            className={`hidden max-w-[180px] truncate text-[12.5px] lg:block ${
              onProfile ? "font-semibold text-[#1F2937]" : "text-[#4B5563]"
            }`}
          >
            {email}
          </span>
        </Link>
        <form action={signOutAction} onSubmit={() => clearMasterKey()}>
          <button
            type="submit"
            aria-label="Sign out"
            title="Sign out"
            className="grid h-9 w-9 place-items-center rounded-[10px] text-[#9CA3AF] transition-colors hover:bg-[#FFF7ED] hover:text-[#F97316]"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </form>
      </div>
    </header>
  );
}
