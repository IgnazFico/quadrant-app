import { redirect } from "next/navigation";
import { auth } from "../../../../../lib/auth";
import { ReflectPage } from "../../../../../components/reflect/ReflectPage";

export default async function WeeklyReviewRoute() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <ReflectPage variant="review" />;
}
