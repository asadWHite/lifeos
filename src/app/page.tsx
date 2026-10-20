import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  redirect(user.onboardingCompleted ? "/today" : "/onboarding");
}
