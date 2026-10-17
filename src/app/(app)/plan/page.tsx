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
    setPid(id);
    setTasks(Storage.getTasks().filter(t => t.profileId === id));
    setGoals(Storage.getGoals().filter(g => g.profileId === id && g.status === "active"));
    setHabits(Storage.getHabits().filter(h => h.profileId === id && h.status === "active"));
    setHabitLogs(Storage.getHabitLogs().filter(l =>
      habits.some(h => h.id === l.habitId) && l.date === today
    ));
  }, [today, habits]);

  useEffect(() => {
    setMounted(true);
    const id = Storage.getCurrentProfileId();
    if (!id || !Storage.getProfile(id)) { router.replace("/welcome"); return; }
    const pid2 = id;
    setPid(pid2);
    setTasks(Storage.getTasks().filter(t => t.profileId === pid2));
    setGoals(Storage.getGoals().filter(g => g.profileId === pid2 && g.status === "active"));
    const h = Storage.getHabits().filter(h => h.profileId === pid2 && h.status === "active");
    setHabits(h);
    setHabitLogs(Storage.getHabitLogs().filter(l => h.some(x => x.id === l.habitId) && l.date === today));
  }, [router, today]);

  if (!mounted) return null;

  const overdue   = tasks.filter(t => t.status !== "done" && t.dueDate && t.dueDate < today);
  const todayOpen = tasks.filter(t => t.status !== "done" && t.dueDate === today);
  const todayDone = tasks.filter(t => t.status === "done"  && t.dueDate === today);
  const upcoming  = tasks.filter(t => t.status !== "done" && t.dueDate && t.dueDate > today)
                         .sort((a,b) => a.dueDate! > b.dueDate! ? 1 : -1);
  const goalMap = Object.fromEntries(goals.map(g => [g.id, g.title]));

  return (
    <div className="min-h-dvh bg-[var(--c-bg)] page-enter">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-h1">Reja</h1>
        <p className="text-body text-[var(--c-ink2)] mt-1">Vazifalar va odatlar</p>
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-2 mb-4">
        {(["tasks","habits"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-small font-semibold transition-all ${tab===t?"bg-[var(--c-ink)] text-[var(--c-bg)]":"bg-[var(--c-surface)] text-[var(--c-ink2)]"}`}>
            {t === "tasks" ? "Vazifalar" : "Odatlar"}
          </button>
        ))}
      </div>

      {tab === "tasks" && (
        <div className="px-4 space-y-4">
          <InlineTaskAdd dueDate={today} onAdded={() => { const id=Storage.getCurrentProfileId(); if(id) setTasks(Storage.getTasks().filter(t=>t.profileId===id)); }} />

          {overdue.length > 0 && (
            <div>
              <p className="text-label text-[#C65B55] px-1 mb-2">KECHIKKAN</p>
              <div className="card divide-y divide-[var(--c-border)] -py-3">
                {overdue.map(t => <TaskRowComp key={t.id} task={t} onChanged={() => { const id=Storage.getCurrentProfileId(); if(id) setTasks(Storage.getTasks().filter(x=>x.profileId===id)); }} goalTitle={t.goalId ? goalMap[t.goalId] : undefined} />)}
              </div>
            </div>
          )}

          {todayOpen.length > 0 && (
            <div>
              <p className="text-label text-[var(--c-ink2)] px-1 mb-2">BUGUN</p>
              <div className="card divide-y divide-[var(--c-border)] -py-3">
                {todayOpen.map(t => <TaskRowComp key={t.id} task={t} onChanged={() => { const id=Storage.getCurrentProfileId(); if(id) setTasks(Storage.getTasks().filter(x=>x.profileId===id)); }} goalTitle={t.goalId ? goalMap[t.goalId] : undefined} />)}
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
                {todayDone.map(t => <TaskRowComp key={t.id} task={t} onChanged={() => { const id=Storage.getCurrentProfileId(); if(id) setTasks(Storage.getTasks().filter(x=>x.profileId===id)); }} />)}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <p className="text-label text-[var(--c-ink2)] px-1 mb-2">KEYINGI KUNLAR</p>
              <div className="card divide-y divide-[var(--c-border)] -py-3">
                {upcoming.slice(0,5).map(t => <TaskRowComp key={t.id} task={t} onChanged={() => { const id=Storage.getCurrentProfileId(); if(id) setTasks(Storage.getTasks().filter(x=>x.profileId===id)); }} goalTitle={t.goalId ? goalMap[t.goalId] : undefined} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "habits" && pid && (
        <div className="px-4">
          <HabitList profileId={pid} habits={habits} logs={habitLogs} today={today} onChanged={() => {
            const h = Storage.getHabits().filter(h => h.profileId === pid && h.status === "active");
            setHabits(h);
            setHabitLogs(Storage.getHabitLogs().filter(l => h.some(x=>x.id===l.habitId) && l.date===today));
          }} />
        </div>
      )}

      <TaskSheet open={showAdd} onClose={() => setShowAdd(false)} onAdded={() => { const id=Storage.getCurrentProfileId(); if(id) setTasks(Storage.getTasks().filter(t=>t.profileId===id)); }} goals={goals} />
    </div>
  );
}
