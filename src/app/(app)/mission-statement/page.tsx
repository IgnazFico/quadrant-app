import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { hasWrittenMissionStatement } from "../../../../lib/missionGate";
import { MissionStatementFlow } from "../../../../components/mission/MissionStatementFlow";

export default async function MissionStatementPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const userId = (session.user as any).id as string;

  // Already written — nothing to force here, send them back into the app.
  if (await hasWrittenMissionStatement(userId)) {
    redirect("/");
  }

  return <MissionStatementFlow />;
}
