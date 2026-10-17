"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Target, Check, Archive, Pencil, Trash2 } from "lucide-react";
import { Storage, generateId, fmtDuration, type GoalRow, type ScheduledGoalRow } from "@/lib/client/storage";
import { ProgressRing, Modal, Field, EmptyState } from "@/components/ui/index";

/* Goal form */
function GoalModal({ open, onClose, goal, profileId, onSaved }: {
  open: boolean; onClose: () => void; goal?: GoalRow; profileId: string; onSaved: () => void;
}) {
  const [title, setTitle] = useState(goal?.title ?? "");
  const [desc, setDesc] = useState(goal?.description ?? "");
  const [target, setTarget] = useState(goal?.metricTarget ?? "");
  const [unit, setUnit] = useState(goal?.metricUnit ?? "");
  const [error, setError] = useState("");

  function save() {
    if (!title.trim()) { setError("Maqsad nomini kiriting"); return; }
    const metricTarget = target !== "" ? Number(target) : null;
    if (goal) {
      Storage.saveGoal({ ...goal, title: title.trim(), description: desc.trim() || null, metricTarget, metricUnit: unit.trim() || null });
    } else {
      Storage.saveGoal({
        id: generateId(), profileId, title: title.trim(), description: desc.trim() || null,
        category: "personal", targetDate: null, status: "active",
        metricTarget, metricUnit: unit.trim() || null, metricProgress: 0,
        source: "user", createdAt: new Date().toISOString(),
      });
    }
    onSaved(); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={goal ? "Maqsadni tahrirlash" : "Yangi maqsad"} size="md">
      <div className="space-y-4">
        <Field label="Maqsad" htmlFor="g-title">
          <input id="g-title" className="input" autoFocus placeholder="Nima qilmoqchisiz?" value={title} onChange={e => { setTitle(e.target.value); setError(""); }} />
          {error && <p className="text-small text-[#C65B55] mt-1">{error}</p>}
        </Field>
        <Field label="Tavsif (ixtiyoriy)" htmlFor="g-desc">
          <textarea id="g-desc" className="input" rows={2} placeholder="Maqsad haqida batafsil..." value={desc} onChange={e => setDesc(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Maqsad raqami" htmlFor="g-target">
            <input id="g-target" type="number" className="input" placeholder="20" value={target} onChange={e => setTarget(e.target.value ? Number(e.target.value) : "")} />
          </Field>
          <Field label="Birlik" htmlFor="g-unit">
            <input id="g-unit" className="input" placeholder="kitob, kun..." value={unit} onChange={e => setUnit(e.target.value)} />
          </Field>
        </div>
        <button onClick={save} className="btn btn-primary w-full btn-lg">Saqlash</button>
      </div>
    </Modal>
  );
}

export default function ProgressPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pid, setPid] = useState<string | null>(null);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledGoalRow[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<GoalRow | undefined>();
  const [showEdit, setShowEdit] = useState(false);
  const [tab, setTab] = useState<"active"|"completed"|"reminders">("active");

  function reload() {
    const id = Storage.getCurrentProfileId();
    if (!id) return;
    setPid(id);
    setGoals(Storage.getGoals().filter(g => g.profileId === id));
    setScheduled(Storage.getScheduledGoals().filter(s => s.profileId === id));
    setTasks(Storage.getTasks().filter(t => t.profileId === id));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setMounted(true);
    const id = Storage.getCurrentProfileId();
    if (!id || !Storage.getProfile(id)) { router.replace("/welcome"); return; }
    setPid(id);
    setGoals(Storage.getGoals().filter(g => g.profileId === id));
    setScheduled(Storage.getScheduledGoals().filter(s => s.profileId === id));
    setTasks(Storage.getTasks().filter(t => t.profileId === id));
  }, [router]);

  if (!mounted) return null;

  const active = goals.filter(g => g.status === "active");
  const completed = goals.filter(g => g.status !== "active");

  const completedThisWeek = tasks.filter((t: any) => {
    if (t.status !== "done" || !t.completedAt) return false;
    const d = new Date(t.completedAt);
    const now = new Date();
    return (now.getTime() - d.getTime()) < 7 * 86400000;
  }).length;

  return (
    <div className="min-h-dvh bg-[var(--c-bg)] page-enter">
      <div className="px-5 pt-12 pb-4 flex items-end justify-between">
        <div>
          <h1 className="text-h1">Taraqqiyot</h1>
          <p className="text-body text-[var(--c-ink2)] mt-1">Maqsadlar va natijalar</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-sm btn-ghost">
          <Plus size={16} /> Maqsad
        </button>
      </div>

      {/* Quick stats */}
      <div className="px-4 grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Faol", val: active.length, color: "#FF633C" },
          { label: "Bajarildi (bu hafta)", val: completedThisWeek, color: "#3F8065" },
          { label: "Lamp eslatma", val: scheduled.filter(s => s.state !== "completed").length, color: "#C8943E" },
        ].map(s => (
          <div key={s.label} className="card text-center py-3">
            <p className="text-display" style={{ color: s.color, fontSize: "1.75rem" }}>{s.val}</p>
            <p className="text-small text-[var(--c-ink2)]" style={{ fontSize: "10px", lineHeight: 1.3 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-2 mb-4">
        {(["active","completed","reminders"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-small font-semibold transition-all ${tab===t?"bg-[var(--c-ink)] text-[var(--c-bg)]":"bg-[var(--c-surface)] text-[var(--c-ink2)]"}`}>
            {t === "active" ? "Faol" : t === "completed" ? "Bajarilgan" : "Lamp"}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3">
        {tab === "active" && (
          <>
            {active.length === 0 && (
              <EmptyState icon={Target} title="Hali maqsad yo'apos;q" body="Birinchi maqsadingizni yarating va lamp rejasini sozlang" action={<button onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm">Maqsad qo'apos;shish</button>} />
            )}
            {active.map(g => {
              const pct = g.metricTarget ? Math.round((g.metricProgress / g.metricTarget) * 100) : null;
              const linkedTasks = tasks.filter((t: any) => t.goalId === g.id);
              const taskPct = linkedTasks.length > 0 ? Math.round(linkedTasks.filter((t: any) => t.status === "done").length / linkedTasks.length * 100) : null;
              const displayPct = pct ?? taskPct;

              return (
                <div key={g.id} className="card">
                  <div className="flex items-start gap-4">
                    <ProgressRing percent={displayPct ?? 0} size={52} />
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold">{g.title}</p>
                      {g.description && <p className="text-small text-[var(--c-ink2)] mt-0.5">{g.description}</p>}
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {g.metricTarget && (
                          <span className="text-small text-[var(--c-ink2)]">{g.metricProgress}/{g.metricTarget} {g.metricUnit}</span>
                        )}
                        {linkedTasks.length > 0 && (
                          <span className="text-small text-[var(--c-ink2)]">{linkedTasks.filter((t:any)=>t.status==="done").length}/{linkedTasks.length} vazifa</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(g); setShowEdit(true); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--c-surface2)] text-[var(--c-ink2)]"><Pencil size={14}/></button>
                      <button onClick={() => { Storage.saveGoal({...g,status:"archived"}); reload(); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--c-surface2)] text-[var(--c-ink2)]"><Archive size={14}/></button>
                    </div>
                  </div>
                  {/* metric progress controls */}
                  {g.metricTarget && (
                    <div className="mt-3 flex gap-2 items-center">
                      <button onClick={() => { Storage.saveGoal({...g,metricProgress:Math.max(0,g.metricProgress-1)}); reload(); }} className="btn btn-sm btn-ghost">−1</button>
                      <div className="flex-1 h-2 bg-[var(--c-surface2)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${pct??0}%`,background:"#FF633C"}}/>
                      </div>
                      <button onClick={() => { const np=Math.min(g.metricTarget!,g.metricProgress+1); Storage.saveGoal({...g,metricProgress:np,status:np>=g.metricTarget!?"archived":g.status}); reload(); }} className="btn btn-sm btn-ghost">+1</button>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {tab === "completed" && (
          <>
            {completed.length === 0 && <EmptyState icon={Check} title="Hali bajarilgan maqsad yo'apos;q" body="Faol maqsad yarating va uni bajarishga harakat qiling" />}
            {completed.map(g => (
              <div key={g.id} className="card flex items-center gap-4 opacity-70">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:g.status==="archived"?"var(--c-surface2)":"rgba(63,128,101,0.15)"}}>
                  {g.status === "archived" ? <Archive size={18} style={{color:"var(--c-ink2)"}}/> : <Check size={18} style={{color:"#3F8065"}}/>}
                </div>
                <div className="flex-1"><p className="text-body font-semibold">{g.title}</p><p className="text-small text-[var(--c-ink2)]">{g.status === "archived" ? "Arxivlangan" : "Bajarilgan"}</p></div>
                <button onClick={() => { Storage.deleteGoal(g.id); reload(); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--c-surface2)] text-[#C65B55]"><Trash2 size={14}/></button>
              </div>
            ))}
          </>
        )}

        {tab === "reminders" && (
          <>
            {scheduled.length === 0 && <EmptyState icon={Target} title="Lamp rejalari yo'apos;q" body="Bugun ekranida lamp rejasini qo'apos;shing" />}
            {scheduled.map(s => {
              const g = goals.find(x => x.id === s.goalId);
              const fire = s.state !== "completed" ? (() => { try { return new Date(s.scheduledAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}); } catch { return "—"; } })() : null;
              const stateColors: Record<string, string> = { idle:"#ADA996",upcoming:"#C8943E",active:"#FF633C",snoozed:"#C8943E",completed:"#3F8065",missed:"#C65B55" };
              return (
                <div key={s.id} className="card flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:stateColors[s.state]??stateColors.idle}}/>
                  <div className="flex-1">
                    <p className="text-body font-semibold">{g?.title ?? "Maqsad o'apos;chirilgan"}</p>
                    <p className="text-small text-[var(--c-ink2)]">{fire ?? "Bajarildi"} · {fmtDuration(s.duration)} · {s.repeat==="once"?"Bir marta":s.repeat==="daily"?"Har kuni":"Ish kunlari"}</p>
                  </div>
                  <button onClick={() => { Storage.deleteScheduledGoal(s.id); reload(); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--c-surface2)] text-[#C65B55]"><Trash2 size={14}/></button>
                </div>
              );
            })}
          </>
        )}
      </div>

      {pid && <GoalModal open={showAdd} onClose={() => setShowAdd(false)} profileId={pid} onSaved={reload} />}
      {pid && editing && <GoalModal open={showEdit} onClose={() => { setShowEdit(false); setEditing(undefined); }} goal={editing} profileId={pid} onSaved={reload} />}
    </div>
  );
}
