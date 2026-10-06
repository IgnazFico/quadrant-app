import { redirect } from "next/navigation";
import { auth } from "../../../../../lib/auth";
import { getWeeklyReviewGateStatus } from "../../../../../lib/weeklyReviewGate";

/**
 * Weekly-review gate. Wraps every signed-in route except /weekly-review and
 * /mission-statement, so it can redirect to /weekly-review without a path
 * check. The mission gate (parent layout) has already run.
 * See src/app/(app)/layout.tsx for the full gate layout.
 */
export default async function ReviewGateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const gate = await getWeeklyReviewGateStatus(session.user.id);
  if (gate.required) redirect("/weekly-review");

  return children;
}
