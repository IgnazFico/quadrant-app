"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_ICONS, type NavIconKey } from "./navIcons";
import "./bottomNav.css";

/**
 * Phone bottom bar v2 (WO-022 / NB-4; design WO-021 v2, approved D-048).
 * Icons only: every tab keeps its name as aria-label. Height is the one
 * shared --bar-h in globals.css. Icons live in ./navIcons.tsx.
 * Visuals and motion: ./bottomNav.css.
 */
const ITEMS: { href: string; label: string; icon: NavIconKey }[] = [
  { href: "/goals", label: "This week", icon: "goals" },
  { href: "/schedule", label: "Schedule", icon: "schedule" },
  { href: "/patterns", label: "Patterns", icon: "patterns" },
  { href: "/profile", label: "Profile", icon: "profile" },
];

function isActive(href: string, pathname: string | null) {
  return (
    pathname === href ||
    !!pathname?.startsWith(href + "/") ||
    (href === "/patterns" && (pathname === "/review" || !!pathname?.startsWith("/review/")))
  );
}

/**
 * IMPORTANT: every internal link here uses next/link's <Link>, never <a href>.
 * <a href> forces a full document reload, which wipes the Zustand
 * masterKey (it's deliberately in-memory only — see store/authStore.ts).
 * <Link> does a client-side transition and keeps the store intact.
 */
export function BottomNav() {
  const pathname = usePathname();
  // The bar answers the tap at once instead of waiting for the new page
  // (pathname changes only when it is ready). A pending tap only counts while
  // the path is still the one it was made on, so it clears itself when the
  // route changes; the timer is a safeguard if the navigation never lands.
  const [pending, setPending] = useState<{ href: string; from: string | null } | null>(null);
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setPending(null), 3000);
    return () => clearTimeout(t);
  }, [pending]);

  const pendingHref = pending && pending.from === pathname ? pending.href : null;
  const activeIndex = ITEMS.findIndex((item) =>
    pendingHref ? item.href === pendingHref : isActive(item.href, pathname),
  );

  return (
    <nav className="bn fixed" aria-label="Main">
      <div className="bn-row">
        <span
          aria-hidden="true"
          className="bn-pill"
          data-testid="bn-pill"
          style={{
            transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
            opacity: activeIndex < 0 ? 0 : 1,
          }}
        />
        {ITEMS.map((item, i) => {
          const selected = i === activeIndex;
          const icons = NAV_ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={selected ? "page" : undefined}
              data-selected={selected}
              onClick={() => setPending({ href: item.href, from: pathname })}
              className="bn-tab"
            >
              <span className="bn-ic">
                <svg className="bn-off" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  {icons.outline}
                </svg>
                <svg className="bn-on" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  {icons.filled}
                </svg>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
