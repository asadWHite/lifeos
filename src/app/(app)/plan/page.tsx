"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, CheckCircle2, Clock, CalendarDays } from "lucide-react";
import {
  Storage, todayDate,
  type TaskRow, type GoalRow, type HabitRow, type HabitLogRow
} from "@/lib/client/storage";
import { TaskRow as TaskRowComp } from "@/components/tasks/TaskRow";
import { InlineTaskAdd } from "@/components/tasks/InlineTaskAdd";
import { TaskSheet } from "@/components/tasks/TaskSheet";
import { EmptyState } from "@/components/ui/index";
import { HabitList } from "@/components/habits/HabitList";

export default function PlanPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pid, setPid] = useState<string | null>(null);
  const [tab, setTab] = useState<"tasks" | "habits">("tasks");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLogRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const today = todayDate();

  const reload = useCallback(() => {
    const id = Storage.getCurrentProfileId();
    if (!id) return;
    
    const allTasks = Storage.getTasks().filter(t => t.profileId === id);
    const allGoals = Storage.getGoals().filter(g => g.profileId === id && g.status === "active");
    const allHabits = Storage.getHabits().filter(h => h.profileId === id && h.status === "active");
    const allLogs = Storage.getHabitLogs().filter(l => 
      allHabits.some(h => h.id === l.habitId) && l.date === today
    );

    setPid(id);
    setTasks(allTasks);
    setGoals(allGoals);
    setHabits(allHabits);
    setHabitLogs(allLogs);
  }, [today]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setMounted(true);
    const id = Storage.getCurrentProfileId();
    if (!id || !Storage.getProfile(id)) { router.replace("/welcome"); return; }
    reload();
  }, [router, reload]);

  if (!mounted) return null;

  const overdue   = tasks.filter(t => t.status !== "done" && t.dueDate && t.dueDate < today);
  const todayOpen = tasks.filter(t => t.status !== "done" && t.dueDate === today);
  const todayDone = tasks.filter(t => t.status === "done"  && t.dueDate === today);
  const upcoming  = tasks.filter(t => t.status !== "done" && t.dueDate && t.dueDate > today)
                         .sort((a,b) => (a.dueDate ?? "") > (b.dueDate ?? "") ? 1 : -1);
  const goalMap = Object.fromEntries(goals.map(g => [g.id, g.title]));

  return (
    <div className="min-h-dvh bg-[var(--c-bg)] page-enter">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-h1">Reja</h1>
        <p className="text-body text-[var(--c-ink2)] mt-1">Vazifalar va odatlar</p>
      </div>

      <div className="flex px-4 gap-2 mb-4">
        {(["tasks","habits"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-small font-semibold transition-all ${tab===t?"bg-[var(--c-ink)] text-[var(--c-bg)]":"bg-[var(--c-surface)] text-[var(--c-ink2)]"}`}>
            {t === "tasks" ? "Vazifalar" : "Odatlar"}
          </button>
        ))}
      </div>

      {tab === "tasks" && (
        <div className="px-4 space-y-4">
          <InlineTaskAdd dueDate={today} onAdded={reload} />

          {overdue.length > 0 && (
            <div>
              <p className="text-label text-[#C65B55] px-1 mb-2">KECHIKKAN</p>
              <div className="card divide-y divide-[var(--c-border)]">
                {overdue.map(t => <TaskRowComp key={t.id} task={t} onChanged={reload} goalTitle={t.goalId ? goalMap[t.goalId] : undefined} />)}
              </div>
            </div>
          )}

          {todayOpen.length > 0 && (
            <div>
              <p className="text-label text-[var(--c-ink2)] px-1 mb-2">BUGUN</p>
              <div className="card divide-y divide-[var(--c-border)]">
                {todayOpen.map(t => <TaskRowComp key={t.id} task={t} onChanged={reload} goalTitle={t.goalId ? goalMap[t.goalId] : undefined} />)}
              </div>
            </div>
          )}

          {todayOpen.length === 0 && overdue.length === 0 && (
            <EmptyState icon={CheckCircle2} title="Bugun hammasi tartibda" body="Yangi vazifa qo'shing yoki kelayotgan kunlarni rejalashtiring" action={<button onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm">Vazifa qo'shish</button>} />
          )}

          {todayDone.length > 0 && (
            <div>
              <p className="text-label text-[#3F8065] px-1 mb-2">BAJARILDI</p>
              <div className="card divide-y divide-[var(--c-border)] opacity-60">
                {todayDone.map(t => <TaskRowComp key={t.id} task={t} onChanged={reload} />)}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <p className="text-label text-[var(--c-ink2)] px-1 mb-2">KEYINGI KUNLAR</p>
              <div className="card divide-y divide-[var(--c-border)]">
                {upcoming.slice(0,5).map(t => <TaskRowComp key={t.id} task={t} onChanged={reload} goalTitle={t.goalId ? goalMap[t.goalId] : undefined} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "habits" && pid && (
        <div className="px-4">
          <HabitList profileId={pid} habits={habits} logs={habitLogs} today={today} onChanged={reload} />
        </div>
      )}

      <TaskSheet open={showAdd} onClose={() => setShowAdd(false)} onAdded={reload} goals={goals} />
    </div>
  );
}
