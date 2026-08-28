import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth";
import { getMissionGateStatus } from "../../../lib/missionGate";
import { ActivityPinger } from "../../../components/mission/ActivityPinger";

/**
 * Every route under app/(app)/... passes through here first. If the
 * mission statement is required and hasn't been written, this redirects
 * before any other page renders — including if the user tries to deep-link
 * directly to another route or hits browser back. There is no code path
 * in this layout that lets a required-but-unwritten state fall through.
 */
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
    </>
  );
}
