import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { getMissionGateStatus } from "../../../../lib/missionGate";

/**
 * Mission-statement gate. Wraps every signed-in route except
 * /mission-statement itself, so it can redirect there without a path check.
 * See src/app/(app)/layout.tsx for the full gate layout.
 */
export default async function MissionGateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const gate = await getMissionGateStatus(session.user.id);
  if (gate.required) redirect("/mission-statement");

  return children;
}
