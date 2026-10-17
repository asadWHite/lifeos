"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Moon, CheckCircle2, ArrowUpRight, Clock, Target } from "lucide-react";
import { Storage, generateId, todayDate, fmtDuration, nextFireTime, type TaskRow, type GoalRow, type SleepSessionRow } from "@/lib/client/storage";
import { LampComponent } from "@/components/lamp/Lamp";
import { TaskRow as TaskRowComponent } from "@/components/tasks/TaskRow";
import { TaskSheet } from "@/components/tasks/TaskSheet";
import { Modal, Field, FieldError } from "@/components/ui/index";
import Link from "next/link";

/* ─── Goal + Time Modal (unified — no separate "lamp schedule") ─── */
function GoalModal({ open, onClose, profileId, onSaved }: {
  open: boolean; onClose: () => void; profileId: string; onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("20");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setTitle(""); setTime(""); setDuration("20"); setError(""); }
  }, [open]);

  function save() {
    if (!title.trim()) { setError("Maqsad nomini kiriting"); return; }

    const goalId = generateId();
    const now = new Date().toISOString();
    
    // Save goal
    Storage.saveGoal({
      id: goalId, profileId, title: title.trim(),
      description: null, category: "personal",
      targetDate: null, status: "active",
      metricTarget: null, metricUnit: null, metricProgress: 0,
      source: "user", createdAt: now,
    });

    // If time is set — create a scheduled reminder so lamp fires
    if (time) {
      const today = todayDate();
      const [h, m] = time.split(":").map(Number);
      const scheduled = new Date(`${today}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`);
      
      // If time already passed today, schedule for tomorrow
      if (scheduled.getTime() <= Date.now()) {
        scheduled.setDate(scheduled.getDate() + 1);
      }

      Storage.saveScheduledGoal({
        id: generateId(), profileId, goalId,
        scheduledAt: scheduled.toISOString(),
        duration: Number(duration) || 20,
        repeat: "once", repeatDays: [],
        state: "idle", snoozeUntil: null,
        completedAt: null, missedAt: null, note: null,
        createdAt: now,
      });
    }

    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Yangi maqsad" size="sm">
      <div className="space-y-5">
        <Field label="Nima qilmoqchisiz?" htmlFor="g-title">
          <input
            id="g-title" className="input" autoFocus
            placeholder="Masalan: Kitob o'qish, Sport, Dars..."
            value={title}
            onChange={e => { setTitle(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && save()}
          />
          <FieldError>{error}</FieldError>
        </Field>

        <Field label="Qachon eslatilsin? (ixtiyoriy)" htmlFor="g-time" hint="Vaqt belgilanganida lamp o'sha paytda yonadi">
          <input
            id="g-time" type="time" className="input"
            value={time}
            onChange={e => setTime(e.target.value)}
          />
        </Field>

        {time && (
          <Field label="Qancha vaqt?" htmlFor="g-dur">
            <select id="g-dur" className="input" value={duration} onChange={e => setDuration(e.target.value)}>
              <option value="5">5 daqiqa</option>
              <option value="10">10 daqiqa</option>
              <option value="15">15 daqiqa</option>
              <option value="20">20 daqiqa</option>
              <option value="25">25 daqiqa</option>
              <option value="30">30 daqiqa</option>
              <option value="45">45 daqiqa</option>
              <option value="60">1 soat</option>
              <option value="90">1.5 soat</option>
              <option value="120">2 soat</option>
            </select>
          </Field>
        )}

        <button onClick={save} className="btn btn-primary w-full btn-lg">
          {time ? "Saqlash va lamp rejalashtirish" : "Saqlash"}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Today Page ─── */
export default function TodayPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pid, setPid] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [lastSleep, setLastSleep] = useState<SleepSessionRow | null>(null);
  const [showGoal, setShowGoal] = useState(false);
  const [showTask, setShowTask] = useState(false);

  const reload = useCallback(() => {
    const id = Storage.getCurrentProfileId();
    if (!id) return;
    const p = Storage.getProfile(id);
    if (!p) return;
    const today = todayDate();
    setPid(id);
    setProfile(p);
    setTasks(Storage.getTasks().filter(t => t.profileId === id && t.dueDate === today));
    setGoals(Storage.getGoals().filter(g => g.profileId === id && g.status === "active"));
    const sleeps = Storage.getSleeps().filter(s => s.profileId === id && s.endedAt)
      .sort((a,b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    setLastSleep(sleeps[0] ?? null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setMounted(true);
    const id = Storage.getCurrentProfileId();
    if (!id || !Storage.getProfile(id)) { router.replace("/welcome"); return; }
    reload();
  }, [router, reload]);

  if (!mounted || !profile) return null;

  const openTasks = tasks.filter(t => t.status !== "done");
  const doneTasks = tasks.filter(t => t.status === "done");
  const h = new Date().getHours();
  const greeting = h < 5 ? "Tun" : h < 12 ? "Xayrli tong" : h < 18 ? "Xayrli kun" : "Xayrli oqshom";

  return (
    <div className="min-h-screen pb-24 overflow-x-hidden bg-[var(--c-bg)]">
      {/* ═══ LAMP SCENE ═══ */}
      <section className="px-3 pt-3 sm:px-4 sm:pt-4">
        <div style={{
          borderRadius: 24,
          background: "#151B23",
          padding: "20px 16px 8px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Header inside scene */}
          <div className="flex justify-between items-start mb-3 relative z-10">
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(173,169,150,0.4)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                LifeOS
              </p>
              <h1 style={{ fontSize: "clamp(1.2rem, 4vw, 1.6rem)", fontWeight: 800, color: "#F2F2F2", marginTop: 2 }}>
                {greeting}, {profile.name.split(" ")[0]}
              </h1>
            </div>
            <button
              onClick={() => setShowGoal(true)}
              style={{
                width: 44, height: 44, borderRadius: 14,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#F2F2F2",
              }}
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Lamp */}
          {pid && <LampComponent profileId={pid} />}
        </div>
      </section>

      {/* ═══ CONTENT (greige aesthetic) ═══ */}
      <section className="px-4 mt-6 space-y-5 max-w-2xl mx-auto">
        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/progress" className="card text-center py-4 hover:shadow-md transition-shadow">
            <Target size={18} style={{ margin: "0 auto 6px", color: "#ADA996" }} />
            <p style={{ fontSize: 22, fontWeight: 800, color: "var(--c-ink)" }}>{goals.length}</p>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#ADA996", letterSpacing: "0.08em", textTransform: "uppercase" }}>Maqsad</p>
          </Link>
          <Link href="/plan" className="card text-center py-4 hover:shadow-md transition-shadow">
            <CheckCircle2 size={18} style={{ margin: "0 auto 6px", color: "#ADA996" }} />
            <p style={{ fontSize: 22, fontWeight: 800, color: "var(--c-ink)" }}>{doneTasks.length}/{tasks.length}</p>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#ADA996", letterSpacing: "0.08em", textTransform: "uppercase" }}>Bugun</p>
          </Link>
          <Link href="/sleep" className="card text-center py-4 hover:shadow-md transition-shadow">
            <Moon size={18} style={{ margin: "0 auto 6px", color: "#ADA996" }} />
            <p style={{ fontSize: 22, fontWeight: 800, color: "var(--c-ink)" }}>
              {lastSleep ? `${Math.floor(lastSleep.durationMinutes! / 60)}h` : "—"}
            </p>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#ADA996", letterSpacing: "0.08em", textTransform: "uppercase" }}>Uyqu</p>
          </Link>
        </div>

        {/* Tasks */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Bugungi vazifalar</h2>
            <button onClick={() => setShowTask(true)} className="btn btn-sm btn-ghost">
              <Plus size={15} /> Qo&apos;shish
            </button>
          </div>

          {openTasks.length === 0 && doneTasks.length === 0 ? (
            <div className="py-8 text-center" style={{ color: "#ADA996" }}>
              <CheckCircle2 size={28} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
              <p style={{ fontSize: 13 }}>Hozircha vazifalar yo&apos;q</p>
            </div>
          ) : (
            <div className="-mx-5">
              {openTasks.map(t => <TaskRowComponent key={t.id} task={t} onChanged={reload} />)}
              {doneTasks.length > 0 && (
                <div style={{ borderTop: "1px solid var(--c-border)", opacity: 0.5 }}>
                  {doneTasks.map(t => <TaskRowComponent key={t.id} task={t} onChanged={reload} />)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Goals */}
        {goals.length > 0 && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Faol maqsadlar</h2>
              <Link href="/progress" style={{ fontSize: 12, fontWeight: 700, color: "#ADA996" }}>Hammasi</Link>
            </div>
            <div className="space-y-3">
              {goals.slice(0, 3).map(g => {
                // Find scheduled time for this goal
                const schedule = Storage.getScheduledGoals().find(s => s.goalId === g.id && s.state !== "completed" && s.state !== "missed");
                const fireTime = schedule ? nextFireTime(schedule) : null;
                return (
                  <div key={g.id} className="flex items-center gap-3 py-2">
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--c-surface2, #E6E3DA)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Target size={16} style={{ color: "#ADA996" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 14, fontWeight: 600 }} className="truncate">{g.title}</p>
                      {fireTime && (
                        <p style={{ fontSize: 11, color: "#FF633C", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={11} />
                          {fireTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {schedule?.duration && ` · ${fmtDuration(schedule.duration)}`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Modals */}
      {pid && <GoalModal open={showGoal} onClose={() => setShowGoal(false)} profileId={pid} onSaved={reload} />}
      <TaskSheet open={showTask} onClose={() => setShowTask(false)} onAdded={reload} goals={goals} />
    </div>
  );
}
