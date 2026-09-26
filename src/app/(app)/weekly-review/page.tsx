import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { WeeklyReviewPage } from "../../../../components/review/WeeklyReviewPage";

export default async function WeeklyReviewRoute() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <WeeklyReviewPage />;
}
