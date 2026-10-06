import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth";
import { ActivityPinger } from "../../../components/mission/ActivityPinger";
import { AppShell } from "../../../components/nav/AppShell";
import { RecapPrompt } from "../../../components/yearreview/RecapPrompt";

/**
 * Shell for every signed-in route. Auth only: the gates live in nested
 * layouts, positioned by route group so a gate never runs on the route it
 * redirects to:
 *
 *   (app)/layout.tsx                      auth + chrome           (this file)
 *   (app)/mission-statement               no gates
 *   (app)/(mission)/layout.tsx            mission-statement gate
 *   (app)/(mission)/weekly-review         mission gate only
 *   (app)/(mission)/(review)/layout.tsx   weekly-review gate
 *   (app)/(mission)/(review)/*            both gates
 *
 * Do NOT gate here on the request path (the old `x-pathname` header from
 * src/proxy.ts). This layout is shared by the gate and its redirect target,
 * and the App Router does not re-render a shared layout on client navigation,
 * so a path-based redirect here works off whatever request last rendered it.
 * That setup (redirect() in a layout whose own subtree contains the target)
 * produced the endless GET /weekly-review?_rsc=... loop on a blank page.
 * With each gate in a layout that sits only above the pages it guards, a gate
 * can never fire on its own target, and no pathname is needed at all.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <>
      <ActivityPinger />
      <AppShell email={session.user.email ?? ""}>{children}</AppShell>
      <RecapPrompt />
    </>
  );
}
