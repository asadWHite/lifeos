import type { ReactNode } from "react";
import { requireOnboarded } from "@/server/session";
import { listGoalsWithTasks } from "@/server/data";
import { AppShell } from "@/components/shell/AppShell";

/** Protected application area: requires a profile with completed onboarding. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireOnboarded();
  const goalRows = await listGoalsWithTasks(session.profile.id);
  const goalOptions = goalRows
    .filter((g) => g.status === "active")
    .map((g) => ({ id: g.id, title: g.title }));

  return (
    <AppShell name={session.profile.name} goals={goalOptions}>
      {children}
    </AppShell>
  );
}
