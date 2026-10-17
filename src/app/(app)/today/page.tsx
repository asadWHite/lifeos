"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, CalendarPlus, ArrowRight } from "lucide-react";
import { Storage, generateId, todayDate, fmtTime, type TaskRow, type GoalRow, type SleepSessionRow } from "@/lib/client/storage";
import { LampComponent } from "@/components/lamp/Lamp";
import { ScheduleModal } from "@/components/lamp/ScheduleModal";
import { TaskRow as TaskRowComponent } from "@/components/tasks/TaskRow";
import { TaskSheet } from "@/components/tasks/TaskSheet";
import { EmptyState } from "@/components/ui/index";
import Link from "next/link";

function greeting(name: string): string {
  const h = new Date().getHours();
  const g = h < 5 ? "Yaxshi tun" : h < 12 ? "Xayrli tong" : h < 18 ? "Xayrli kun" : "Xayrli oqshom";
  return `${g}, ${name}!`;
}

function fmtDateLong() {
  return new Date().toLocaleDateString("uz-UZ", { weekday: "long", day: "numeric", month: "long" });
}

export default function TodayPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pid, setPid] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [lastSleep, setLastSleep] = useState<SleepSessionRow | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showTask, setShowTask] = useState(false);

  const reload = useCallback(() => {
    const id = Storage.getCurrentProfileId();
    if (!id) return;
    const p = Storage.getProfile(id);
    if (!p) return;
    setPid(id);
    setProfile(p);
    const today = todayDate();
    setTasks(Storage.getTasks().filter(t => t.profileId === id && t.dueDate === today));
    setGoals(Storage.getGoals().filter(g => g.profileId === id && g.status === "active"));
    const sleeps = Storage.getSleeps().filter(s => s.profileId === id && s.endedAt).sort((a,b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    setLastSleep(sleeps[0] ?? null);
  }, []);

  useEffect(() => {
    setMounted(true);
    const id = Storage.getCurrentProfileId();
    if (!id || !Storage.getProfile(id)) { router.replace("/welcome"); return; }
    if (!Storage.getProfile(id)!.onboardingCompleted) { router.replace("/onboarding"); return; }
    reload();
  }, [router, reload]);

  if (!mounted || !profile) return null;

  const openTasks  = tasks.filter(t => t.status !== "done");
  const doneTasks  = tasks.filter(t => t.status === "done");
  const today = todayDate();

  return (
    <div className="min-h-dvh" style={{ background: "linear-gradient(180deg, #151B23 0%, #202833 40%, var(--c-bg) 70%)" }}>
      {/* ── Header ─────────────────────────── */}
      <div className="px-5 pt-12 pb-4">
        <p className="text-small text-[#ADA996] capitalize">{fmtDateLong()}</p>
        <h1 className="text-h1 text-[#F2F2F2] mt-1">{greeting(profile.name.split(" ")[0])}</h1>
      </div>

      {/* ── Lamp scene ──────────────────────── */}
      <div className="px-4 py-4 flex flex-col items-center">
        {pid && <LampComponent profileId={pid} />}
        <button
          onClick={() => setShowSchedule(true)}
          className="mt-4 flex items-center gap-2 text-small text-[#ADA996] hover:text-[#FF633C] transition-colors"
        >
          <CalendarPlus size={15} /> Lamp rejasi qo&apos;shish
        </button>
      </div>

      {/* ── Content cards ───────────────────── */}
      <div className="px-4 space-y-4 pb-6">
        {/* Sleep summary */}
        {lastSleep && (
          <Link href="/sleep" className="card flex items-center justify-between hover:opacity-80 transition-opacity">
            <div>
              <p className="text-label text-[var(--c-ink2)] mb-0.5">KECHA UYQU</p>
              <p className="text-h3">
                {(() => {
                  const m = lastSleep.durationMinutes ?? 0;
                  const h = Math.floor(m / 60); const min = m % 60;
                  return h > 0 ? `${h}h ${min}m` : `${min}m`;
                })()}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[var(--c-ink2)]">
              <span className="text-small">Ko&apos;proq</span>
              <ArrowRight size={15} />
            </div>
          </Link>
        )}

        {/* Today's tasks */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-h3">Bugungi vazifalar</h2>
              {doneTasks.length > 0 && (
                <p className="text-small text-[var(--c-ink2)]">{doneTasks.length}/{tasks.length} bajarildi</p>
              )}
            </div>
            <button onClick={() => setShowTask(true)} className="btn btn-sm btn-ghost">
              <Plus size={16} /> Qo&apos;shish
            </button>
          </div>

          {openTasks.length === 0 && doneTasks.length === 0 && (
            <EmptyState
              icon={Plus}
              title="Bugungi reja bo'sh"
              body="Vazifa qo'shing va kunni rejalashtiring"
              action={<button onClick={() => setShowTask(true)} className="btn btn-primary btn-sm">Vazifa qo&apos;shish</button>}
            />
          )}

          <div className="-mx-4">
            {openTasks.map(t => (
              <TaskRowComponent key={t.id} task={t} onChanged={reload} />
            ))}
            {doneTasks.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[var(--c-border)]">
                {doneTasks.map(t => (
                  <TaskRowComponent key={t.id} task={t} onChanged={reload} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Goals quick view */}
        {goals.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-h3">Faol maqsadlar</h2>
              <Link href="/progress" className="text-small text-[#FF633C]">Hammasi</Link>
            </div>
            <div className="space-y-3">
              {goals.slice(0, 3).map(g => {
                const pct = g.metricTarget ? Math.round((g.metricProgress / g.metricTarget) * 100) : null;
                return (
                  <div key={g.id}>
                    <div className="flex justify-between mb-1">
                      <p className="text-body font-medium">{g.title}</p>
                      {pct !== null && <p className="text-small text-[var(--c-ink2)]">{pct}%</p>}
                    </div>
                    {pct !== null && (
                      <div className="h-1.5 rounded-full bg-[var(--c-surface2)] overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#FF633C" }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {pid && (
        <ScheduleModal
          open={showSchedule}
          onClose={() => setShowSchedule(false)}
          goals={goals}
          profileId={pid}
          onSaved={reload}
        />
      )}
      <TaskSheet open={showTask} onClose={() => setShowTask(false)} onAdded={reload} goals={goals} />
    </div>
  );
}
