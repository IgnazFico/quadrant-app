"use client";

import { useProfile } from "../../hooks/useProfile";
import { ProfilePage } from "../profile/ProfilePage";
import { IdentityDesktopView } from "./IdentityDesktopView";

/**
 * Shared entry point for the /profile route.
 *
 * Owns a single useProfile() call so the mobile page and the desktop
 * merged view never double-fetch or drift out of sync — same precedent
 * as WeekPage.tsx and ReflectPage.tsx.
 *
 * Below md, renders the pre-existing mobile ProfilePage (ID card +
 * badges, full-bleed, flip-to-see-mission-snippet). At md and above,
 * renders the merged desktop view (ID card + badges next to a full
 * Mission statement panel) matching web-prototype/app.js's
 * pageIdentity() ("Identity" = Profile + Mission statement).
 *
 * Unlike Week and Reflect, there is only one mobile route feeding this
 * (/profile) — Mission statement itself stays a separate full-page flow
 * at /mission-statement on both breakpoints (see IdentityDesktopView.tsx
 * for why that wasn't folded inline).
 */
export function IdentityPage() {
  const profile = useProfile();

  return (
    <>
      <div className="md:hidden">
        <ProfilePage profile={profile} />
      </div>
      <div className="hidden md:block">
        <IdentityDesktopView profile={profile} />
      </div>
    </>
  );
}
