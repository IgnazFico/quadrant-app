import { YearInReviewPage } from "../../../../../../components/yearreview/YearInReviewPage";
import { YearReviewClosed } from "../../../../../../components/yearreview/YearReviewClosed";
import { isRecapWindowOpenOnServer } from "../../../../../../lib/yearRecapWindow";

// The answer depends on today's date, so this page is never prerendered.
export const dynamic = "force-dynamic";

/**
 * WO-033 (D-039 C): outside Dec 20 to 31 (Asia/Jakarta, server clock) the
 * ceremony is not rendered, for any `?year=`; the closed screen is.
 */
export default function YearReview() {
  if (!isRecapWindowOpenOnServer()) return <YearReviewClosed />;
  return <YearInReviewPage />;
}
