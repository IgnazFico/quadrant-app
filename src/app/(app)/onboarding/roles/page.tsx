import { redirect } from "next/navigation";
import { auth } from "../../../../../lib/auth";
import { RoleOnboarding } from "../../../../../components/onboarding/RoleOnboarding";

export default async function RoleOnboardingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return <RoleOnboarding />;
}
