"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  {
    href: "/goals",
    label: "This week",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
      </svg>
    ),
  },
  {
    href: "/schedule",
    label: "Schedule",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18" />
      </svg>
    ),
  },
  {
    href: "/patterns",
    label: "Patterns",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
];

/**
 * IMPORTANT: every internal link here uses next/link's <Link>, never <a href>.
 * <a href> forces a full document reload, which wipes the Zustand
 * masterKey (it's deliberately in-memory only — see store/authStore.ts).
 * <Link> does a client-side transition and keeps the store intact.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-10 flex w-full max-w-[440px] -translate-x-1/2 gap-1 border-t border-[#ECE8DF] bg-white px-2 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5">
      {ITEMS.map((item) => {
        const active =
          pathname === item.href ||
          pathname?.startsWith(item.href + "/") ||
          (item.href === "/patterns" && (pathname === "/review" || pathname?.startsWith("/review/")));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-[3px] py-1 text-[10px] font-medium ${
              active ? "text-[#F97316]" : "text-[#B7B2A7]"
            }`}
          >
            <span className="h-[19px] w-[19px]">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
