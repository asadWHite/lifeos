import { redirect } from "next/navigation";
import { getSession } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Root() {
  const session = await getSession();
  if (!session) redirect("/welcome");
  if (!session.profile.onboardingCompleted) redirect("/onboarding");
  redirect("/home");
}
