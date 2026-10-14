import { Plus, Sprout } from "lucide-react";
import { requireOnboarded } from "@/server/session";
import { listGoalsWithTasks } from "@/server/data";
import { computeGoalProgress, categoryLabel } from "@/lib/goals";
import { todayInTz } from "@/lib/time";
import { EmptyState } from "@/components/ui";
import { GoalCard, type GoalCardModel } from "@/components/goals/GoalCard";
import { NewGoalButton } from "@/components/goals/NewGoalButton";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const session = await requireOnboarded();
  const tz = session.profile.timezone;
  const today = todayInTz(tz);
  const rows = await listGoalsWithTasks(session.profile.id);

  const models: Array<{ goal: GoalCardModel; tasks: Parameters<typeof GoalCard>[0]["tasks"] }> =
    rows.map((g) => {
      const progress = computeGoalProgress(g, g.tasks);
      return {
        goal: {
          id: g.id,
          title: g.title,
          description: g.description,
          category: g.category,
          categoryLabel: categoryLabel(g.category),
          targetDate: g.targetDate,
          status: g.status,
          source: g.source,
          metricTarget: g.metricTarget,
          metricUnit: g.metricUnit,
          metricProgress: g.metricProgress,
          percent: progress.percent,
          explanation: progress.explanation,
        },
        tasks: g.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          notes: t.notes,
          dueDate: t.dueDate,
          priority: t.priority,
          durationMinutes: t.durationMinutes,
          status: t.status,
          source: t.source,
          goalId: t.goalId,
        })),
      };
    });

  const active = models.filter((m) => m.goal.status === "active" || m.goal.status === "completed");
  const archived = models.filter((m) => m.goal.status === "archived");

  return (
    <div className="animate-rise">
      <div className="flex items-start justify-between gap-4">
        <header>
          <h1 className="text-[26px] font-bold tracking-tight text-ink">Goals</h1>
          <p className="mt-1 text-[14px] text-ink2">
            Bigger things you&rsquo;re moving toward — measured by real progress only.
          </p>
        </header>
        <NewGoalButton />
      </div>

      <div className="mt-7 space-y-4">
        {models.length === 0 && (
          <div className="card">
            <EmptyState
              icon={Sprout}
              title="No goals yet"
              body="Create a goal — like learning a language, finishing a project, or building a sleep routine — then break it into small tasks. Progress comes from tasks you actually complete or targets you log."
              action={<NewGoalButton primary size="lg" label={<><Plus size={16} /> Create your first goal</>} />}
            />
          </div>
        )}
        {active.map((m) => (
          <GoalCard key={m.goal.id} goal={m.goal} tasks={m.tasks} todayIso={today} />
        ))}
      </div>

      {archived.length > 0 && (
        <div className="mt-10">
          <h2 className="text-[15px] font-bold text-ink2">Archived</h2>
          <div className="mt-3 space-y-4">
            {archived.map((m) => (
              <GoalCard key={m.goal.id} goal={m.goal} tasks={m.tasks} todayIso={today} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
