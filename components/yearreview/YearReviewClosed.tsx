import Link from "next/link";
import { CeremonyAtmosphere } from "./ceremony/CeremonyAtmosphere";
import "./ceremony/ceremony.css";

/**
 * Shown at /year-review outside the Dec 20 to 31 window (WO-033, D-039 C).
 * Same quiet look as the ceremony's own empty states. No ceremony data.
 */
export function YearReviewClosed() {
  return (
    <div className="yc-root" data-testid="year-review-closed">
      <CeremonyAtmosphere />
      <div className="yc-quiet-state">
        <p className="yc-year-name">Opens December 20.</p>
        <p className="yc-soft">
          Your year in Quadrant is here from December 20 to 31. Come back then.
        </p>
        <Link href="/goals" className="yc-quiet underline">
          Back to your week
        </Link>
      </div>
    </div>
  );
}
