import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth";
import { getMissionGateStatus } from "../../../lib/missionGate";
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

  const userId = (session.user as any).id as string;
  const gate = await getMissionGateStatus(userId);

  if (gate.required) {
    redirect("/mission-statement");
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
