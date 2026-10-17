"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Clock, Target, AlarmClock } from "lucide-react";
import {
  Storage, generateId, todayDate, fmtDuration, nextFireTime,
  ensureMonthlyChallenge, computeStreak, defaultPrefs,
  type TaskRow, type GoalRow, type SleepSessionRow, type PreferencesRow,
} from "@/lib/client/storage";
import { LampComponent } from "@/components/lamp/Lamp";
import { TaskRow as TaskRowComp } from "@/components/tasks/TaskRow";
import { TaskSheet } from "@/components/tasks/TaskSheet";
import { Modal, Field, FieldError } from "@/components/ui/index";

/* ─── Unified Goal + Schedule modal ─── */
function NewGoalModal({ open, onClose, profileId, onSaved }: { open: boolean; onClose: () => void; profileId: string; onSaved: () => void; }) {
  const [title, setTitle]    = useState("");
  const [time, setTime]      = useState("");
  const [duration, setDur]   = useState("20");
  const [repeat, setRepeat]  = useState<"once"|"daily">("once");
  const [error, setError]    = useState("");

  useEffect(() => { if (open) { setTitle(""); setTime(""); setDur("20"); setError(""); } }, [open]);

  function save() {
    if (!title.trim()) { setError("Maqsad nomini kiriting"); return; }
    const gid = generateId();
    Storage.saveGoal({ id: gid, profileId, title: title.trim(), description: null, category: "personal", targetDate: null, status: "active", metricTarget: null, metricUnit: null, metricProgress: 0, source: "user", createdAt: new Date().toISOString() });
    if (time) {
      const today = todayDate();
      const [h, m] = time.split(":").map(Number);
      const fire = new Date(`${today}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`);
      if (fire.getTime() <= Date.now()) fire.setDate(fire.getDate() + 1);
      Storage.saveScheduledGoal({ id: generateId(), profileId, goalId: gid, scheduledAt: fire.toISOString(), duration: Number(duration) || 20, repeat, repeatDays: [], state: "idle", snoozeUntil: null, completedAt: null, missedAt: null, note: null, createdAt: new Date().toISOString() });
    }
    onSaved(); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Yangi maqsad" size="sm">
      <div className="space-y-4">
        <Field label="Maqsad nomi" htmlFor="ng-t">
          <input id="ng-t" className="input" autoFocus placeholder="Masalan: Kitob o'qish, Sport..." value={title} onChange={e => { setTitle(e.target.value); setError(""); }} />
          <FieldError>{error}</FieldError>
        </Field>
        <Field label="Lamp vaqti (ixtiyoriy)" htmlFor="ng-time" hint="Belgilasangiz — lamp o'sha vaqtda yonadi">
          <input id="ng-time" type="time" className="input" value={time} onChange={e => setTime(e.target.value)} />
        </Field>
        {time && (
          <>
            <Field label="Davomiylik" htmlFor="ng-dur">
              <select id="ng-dur" className="input" value={duration} onChange={e => setDur(e.target.value)}>
                {[5,10,15,20,25,30,45,60,90,120].map(v => <option key={v} value={v}>{v < 60 ? `${v} daqiqa` : `${v/60} soat`}</option>)}
              </select>
            </Field>
            <Field label="Takrorlash">
              <div style={{ display: "flex", gap: 8 }}>
                {(["once","daily"] as const).map(r => (
                  <button key={r} onClick={() => setRepeat(r)} className={`btn btn-sm flex-1 ${repeat===r?"btn-primary":"btn-ghost"}`}>{r==="once"?"Bir marta":"Har kuni"}</button>
                ))}
              </div>
            </Field>
          </>
        )}
        <button className="btn btn-primary w-full btn-lg" onClick={save}>
          {time ? "Saqlash + Lamp rejalashtirish" : "Saqlash"}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Streak mini component ─── */
function StreakCard({ profileId }: { profileId: string }) {
  const streak = computeStreak(profileId);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: streak > 0 ? "rgba(255,99,60,0.08)" : "var(--surface2)", borderRadius: 14, border: `1px solid ${streak > 0 ? "rgba(255,99,60,0.2)" : "var(--border)"}` }}>
      <span style={{ fontSize: "1.6rem" }}>🔥</span>
      <div>
        <p style={{ fontWeight: 800, fontSize: "1.2rem", color: streak > 0 ? "var(--lamp-orange)" : "var(--ink2)" }}>{streak} kun</p>
        <p className="t-xs" style={{ color: "var(--ink2)" }}>Ketma-ket streak</p>
      </div>
    </div>
  );
}

/* ─── Today Page ─── */
export default function TodayPage() {
  const router = useRouter();
  const [mounted, setMounted]       = useState(false);
  const [pid, setPid]               = useState<string | null>(null);
  const [profile, setProfile]       = useState<any>(null);
  const [tasks, setTasks]           = useState<TaskRow[]>([]);
  const [goals, setGoals]           = useState<GoalRow[]>([]);
  const [lastSleep, setLastSleep]   = useState<SleepSessionRow | null>(null);
  const [showGoal, setShowGoal]     = useState(false);
  const [showTask, setShowTask]     = useState(false);

  const reload = useCallback(() => {
    const id = Storage.getCurrentProfileId(); if (!id) return;
    const p = Storage.getProfile(id); if (!p) return;
    const today = todayDate();
    const all   = Storage.getTasks(id);
    const sleeps = Storage.getSleeps(id).filter(s => s.endedAt).sort((a,b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    setPid(id); setProfile(p);
    setTasks(all.filter(t => t.dueDate === today));
    setGoals(Storage.getGoals(id).filter(g => g.status === "active"));
    setLastSleep(sleeps[0] ?? null);
    ensureMonthlyChallenge(id);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setMounted(true);
    const id = Storage.getCurrentProfileId();
    if (!id || !Storage.getProfile(id)) { router.replace("/welcome"); return; }
    reload();
  }, [router, reload]);

  if (!mounted || !profile) return null;

  const today     = todayDate();
  const openTasks = tasks.filter(t => t.status !== "done");
  const doneTasks = tasks.filter(t => t.status === "done");
  const h = new Date().getHours();
  const greeting = h < 5 ? "Xayrli tun" : h < 12 ? "Xayrli tong" : h < 18 ? "Xayrli kun" : "Xayrli oqshom";

  // Next scheduled goal info
  const upcomingSchedule = Storage.getScheduledGoals(pid ?? "")
    .filter(s => s.state !== "completed" && s.state !== "missed")
    .sort((a,b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
  const upcomingGoal = upcomingSchedule ? goals.find(g => g.id === upcomingSchedule.goalId) : null;
  const upcomingFire = upcomingSchedule ? nextFireTime(upcomingSchedule) : null;

  return (
    <div className="pb-nav" style={{ background: "var(--bg)", minHeight: "100dvh" }}>
      {/* ═══ LAMP SCENE (dark navy) ═══ */}
      <section style={{ padding: "16px 12px 8px" }}>
        <div style={{ borderRadius: 24, overflow: "hidden", background: "#151B23", position: "relative" }}>
          {/* Header */}
          <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10 }}>
            <div>
              <p className="t-label" style={{ color: "rgba(173,169,150,0.5)", marginBottom: 2 }}>LIFEOS</p>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#F2F2F2", margin: 0 }}>
                {greeting}, {profile.firstName}
              </h1>
            </div>
            <button onClick={() => setShowGoal(true)} style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#F2F2F2" }}>
              <Plus size={20} />
            </button>
          </div>

          {/* Lamp */}
          <div style={{ padding: "0 12px 12px" }}>
            {pid && <LampComponent profileId={pid} />}
          </div>
        </div>
      </section>

      {/* ═══ CONTENT (warm greige) ═══ */}
      <section style={{ padding: "12px", maxWidth: 680, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          {/* Streak */}
          {pid && <StreakCard profileId={pid} />}
          {/* Sleep */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)" }}>
            <span style={{ fontSize: "1.5rem" }}>😴</span>
            <div>
              <p style={{ fontWeight: 800, fontSize: "1.1rem" }}>{lastSleep?.durationMinutes ? fmtDuration(lastSleep.durationMinutes) : "—"}</p>
              <p className="t-xs" style={{ color: "var(--ink2)" }}>Kecha uyqu</p>
            </div>
          </div>
        </div>

        {/* Today Tasks */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 16px 8px" }}>
            <h2 className="t-h3">Bugungi vazifalar</h2>
            <button onClick={() => setShowTask(true)} className="btn btn-ghost btn-sm"><Plus size={15} /></button>
          </div>
          {tasks.length === 0 ? (
            <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--ink2)" }}>
              <p className="t-sm">Hozircha vazifa yo'q. Qo'shing!</p>
            </div>
          ) : (
            <div style={{ padding: "0 0 8px" }}>
              {openTasks.map(t => <TaskRowComp key={t.id} task={t} onChanged={reload} />)}
              {doneTasks.length > 0 && (
                <div style={{ borderTop: "1px solid var(--border)", opacity: 0.5 }}>
                  {doneTasks.map(t => <TaskRowComp key={t.id} task={t} onChanged={reload} />)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Goals quick view */}
        {goals.length > 0 && (
          <div className="card">
            <div style={{ padding: "16px 16px 8px" }}>
              <h2 className="t-h3">Faol maqsadlar</h2>
            </div>
            <div style={{ padding: "0 0 12px" }}>
              {goals.slice(0, 4).map(g => {
                const sch = Storage.getScheduledGoals(pid ?? "").find(s => s.goalId === g.id && s.state !== "completed" && s.state !== "missed");
                const fire = sch ? nextFireTime(sch) : null;
                return (
                  <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Target size={15} style={{ color: "var(--ink2)" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.875rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.title}</p>
                      {fire && (
                        <p className="t-xs" style={{ color: "var(--lamp-orange)", display: "flex", alignItems: "center", gap: 4 }}>
                          <AlarmClock size={11} /> {fire.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {sch?.duration && ` · ${fmtDuration(sch.duration)}`}
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

      {pid && <NewGoalModal open={showGoal} onClose={() => setShowGoal(false)} profileId={pid} onSaved={reload} />}
      <TaskSheet open={showTask} onClose={() => setShowTask(false)} onAdded={reload} goals={goals.map(g => ({ id: g.id, title: g.title }))} />
    </div>
  );
}
