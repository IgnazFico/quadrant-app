import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth";
import { getMissionGateStatus } from "../../../lib/missionGate";
import { ActivityPinger } from "../../../components/mission/ActivityPinger";
import { BottomNav } from "../../../components/nav/BottomNav";

/**
 * Every route under app/(app)/... passes through here first. If the
 * mission statement is required and hasn't been written, this redirects
 * before any other page renders.
 *
 * BottomNav is rendered ONCE here, not inside individual pages — since
 * Next.js layouts persist across client-side navigations within the same
 * segment, the nav itself never remounts when moving between /goals,
 * /schedule, /review, and /profile. Combined with using <Link> instead of
 * <a href> everywhere (see BottomNav.tsx), this means the in-memory
 * masterKey survives normal navigation around the app.
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
      <BottomNav />
    </>
  );
}
