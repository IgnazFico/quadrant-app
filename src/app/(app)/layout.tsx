import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "../../../lib/auth";
import { getMissionGateStatus } from "../../../lib/missionGate";
import { getWeeklyReviewGateStatus } from "../../../lib/weeklyReviewGate";
import { ActivityPinger } from "../../../components/mission/ActivityPinger";
import { BottomNav } from "../../../components/nav/BottomNav";
import { RecapPrompt } from "../../../components/yearreview/RecapPrompt";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  const gate = await getMissionGateStatus(userId);
  if (gate.required && pathname !== "/mission-statement") {
    redirect("/mission-statement");
  }

  const reviewGate = await getWeeklyReviewGateStatus(userId);
  if (
    reviewGate.required &&
    pathname !== "/weekly-review" &&
    pathname !== "/mission-statement"
  ) {
    redirect("/weekly-review");
  }

  return (
    <>
      <ActivityPinger />
      {children}
      <RecapPrompt />
      <BottomNav />
    </>
  );
}
