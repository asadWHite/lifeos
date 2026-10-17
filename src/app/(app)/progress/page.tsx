"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trophy, Target, Archive, Pencil, Trash2 } from "lucide-react";
import {
  Storage, generateId, computeStreak, ensureMonthlyChallenge,
  ACHIEVEMENT_DEFS, type GoalRow, type AchievementRow, type MonthlyChallenge,
} from "@/lib/client/storage";
import { Modal, Field, FieldError } from "@/components/ui/index";

/* ─── Achievement badge ─── */
function AchievementBadge({ def, earned }: { def: typeof ACHIEVEMENT_DEFS[0]; earned?: AchievementRow }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", opacity: earned ? 1 : 0.45 }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: earned ? "rgba(255,99,60,0.12)" : "var(--surface2)", border: `1px solid ${earned ? "rgba(255,99,60,0.25)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
        {def.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "0.875rem", fontWeight: 700 }}>{def.name}</p>
        <p className="t-xs" style={{ color: "var(--ink2)" }}>{earned ? `Olindi: ${new Date(earned.earnedAt).toLocaleDateString("uz-UZ")}` : def.rule}</p>
      </div>
      {earned && <Trophy size={16} style={{ color: "var(--lamp-orange)", flexShrink: 0 }} />}
    </div>
  );
}

/* ─── Streak 10-day card ─── */
function TenDayStreak({ profileId }: { profileId: string }) {
  const streak = computeStreak(profileId);
  const days = Math.min(streak, 10);
  return (
    <div className="card-dark" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <p className="t-label" style={{ color: "#ADA996", marginBottom: 4 }}>10 KUNLIK STREAK</p>
          <p style={{ fontSize: "2rem", fontWeight: 800, color: "#F2F2F2", lineHeight: 1 }}>{streak}</p>
          <p className="t-xs" style={{ color: "#ADA996", marginTop: 2 }}>ketma-ket kun</p>
        </div>
        <div style={{ fontSize: "2.5rem" }}>🔥</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 4 }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{ height: 6, borderRadius: 3, background: i < days ? "var(--lamp-orange)" : "rgba(255,255,255,0.1)", transition: "background 0.3s" }} />
        ))}
      </div>
      <p className="t-xs" style={{ color: "#ADA996", marginTop: 8 }}>{days}/10 — {days >= 10 ? "Bajarildi! 🏆" : `${10 - days} kun qoldi`}</p>
    </div>
  );
}

/* ─── Monthly challenge ─── */
function MonthlyChallengeCard({ profileId }: { profileId: string }) {
  const challenge = ensureMonthlyChallenge(profileId);
  const d = new Date();
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const remaining = daysInMonth - d.getDate();
  const pct = Math.round((challenge.completedDays.length / challenge.targetDays) * 100);
  const months = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentyabr","Oktyabr","Noyabr","Dekabr"];

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <p className="t-label" style={{ color: "var(--ink2)", marginBottom: 4 }}>{months[challenge.month - 1].toUpperCase()} {challenge.year}</p>
          <p style={{ fontSize: "1.1rem", fontWeight: 700 }}>{challenge.completedDays.length} / {challenge.targetDays} kun</p>
        </div>
        <span style={{ fontSize: "1.5rem" }}>📅</span>
      </div>
      <div style={{ height: 8, background: "var(--surface2)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "var(--success)" : "var(--lamp-orange)", borderRadius: 4, transition: "width 0.5s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <p className="t-xs" style={{ color: "var(--ink2)" }}>{remaining} kun qoldi</p>
        <p className="t-xs" style={{ color: "var(--ink2)" }}>{pct}%</p>
      </div>
      {challenge.won && <p style={{ marginTop: 8, color: "var(--success)", fontWeight: 700, fontSize: "0.875rem" }}>🏆 Bajarildi!</p>}
    </div>
  );
}

/* ─── Goal modal ─── */
function GoalModal({ open, onClose, goal, profileId, onSaved }: { open: boolean; onClose: () => void; goal?: GoalRow; profileId: string; onSaved: () => void; }) {
  const [title, setTitle]   = useState(goal?.title ?? "");
  const [desc, setDesc]     = useState(goal?.description ?? "");
  const [target, setTarget] = useState(goal?.metricTarget?.toString() ?? "");
  const [unit, setUnit]     = useState(goal?.metricUnit ?? "");
  const [error, setError]   = useState("");
  useEffect(() => { if (open) { setTitle(goal?.title ?? ""); setDesc(goal?.description ?? ""); setTarget(goal?.metricTarget?.toString() ?? ""); setUnit(goal?.metricUnit ?? ""); setError(""); } }, [open, goal]);
  function save() {
    if (!title.trim()) { setError("Nom kiriting"); return; }
    const data: GoalRow = { id: goal?.id ?? generateId(), profileId, title: title.trim(), description: desc.trim() || null, category: "personal", targetDate: null, status: goal?.status ?? "active", metricTarget: target ? Number(target) : null, metricUnit: unit.trim() || null, metricProgress: goal?.metricProgress ?? 0, source: "user", createdAt: goal?.createdAt ?? new Date().toISOString() };
    Storage.saveGoal(data); onSaved(); onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title={goal ? "Maqsadni tahrirlash" : "Yangi maqsad"} size="md">
      <div className="space-y-4">
        <Field label="Nomi" htmlFor="gm-t"><input id="gm-t" className="input" autoFocus value={title} onChange={e => { setTitle(e.target.value); setError(""); }} /><FieldError>{error}</FieldError></Field>
        <Field label="Tavsif (ixtiyoriy)" htmlFor="gm-d"><textarea id="gm-d" className="input" rows={2} value={desc} onChange={e => setDesc(e.target.value)} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Maqsad raqami" htmlFor="gm-mt"><input id="gm-mt" type="number" className="input" placeholder="20" value={target} onChange={e => setTarget(e.target.value)} /></Field>
          <Field label="Birlik" htmlFor="gm-mu"><input id="gm-mu" className="input" placeholder="kitob, km..." value={unit} onChange={e => setUnit(e.target.value)} /></Field>
        </div>
        <button className="btn btn-primary w-full btn-lg" onClick={save}>Saqlash</button>
      </div>
    </Modal>
  );
}

/* ─── Progress Page ─── */
export default function ProgressPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pid, setPid]         = useState<string | null>(null);
  const [goals, setGoals]     = useState<GoalRow[]>([]);
  const [achievements, setAch] = useState<AchievementRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<GoalRow | undefined>();
  const [tab, setTab]         = useState<"goals" | "achievements" | "history">("goals");

  const reload = useCallback(() => {
    const id = Storage.getCurrentProfileId(); if (!id) return;
    setPid(id);
    setGoals(Storage.getGoals(id));
    setAch(Storage.getAchievements(id));
    Storage.checkAndUnlockAchievements(id);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setMounted(true);
    const id = Storage.getCurrentProfileId();
    if (!id || !Storage.getProfile(id)) { router.replace("/welcome"); return; }
    setPid(id); setGoals(Storage.getGoals(id)); setAch(Storage.getAchievements(id));
    Storage.checkAndUnlockAchievements(id);
  }, [router, reload]);

  if (!mounted) return null;

  const activeGoals    = goals.filter(g => g.status === "active");
  const completedGoals = goals.filter(g => g.status === "completed" || g.status === "archived");

  return (
    <div className="pb-nav" style={{ background: "var(--bg)", minHeight: "100dvh" }}>
      <div style={{ padding: "48px 12px 0", maxWidth: 680, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
          <div><h1 className="t-h1">Taraqqiyot</h1><p style={{ color: "var(--ink2)", fontSize: "0.875rem", marginTop: 4 }}>Maqsadlar, achievement&apos;lar, statistika</p></div>
          {tab === "goals" && <button onClick={() => setShowAdd(true)} className="btn btn-ghost btn-sm"><Plus size={15} /> Maqsad</button>}
        </div>

        {pid && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <TenDayStreak profileId={pid} />
            <MonthlyChallengeCard profileId={pid} />
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "var(--surface2)", padding: 4, borderRadius: 14 }}>
          {(["goals","achievements","history"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px", borderRadius: 10, fontWeight: 650, fontSize: "0.8rem", background: tab===t ? "var(--surface)" : "transparent", color: tab===t ? "var(--ink)" : "var(--ink2)", boxShadow: tab===t ? "var(--shadow-sm)" : "none", transition: "all 0.2s", border: "none", cursor: "pointer" }}>
              {t==="goals"?"Maqsadlar":t==="achievements"?"Achievem.":"Tarix"}
            </button>
          ))}
        </div>

        {/* Goals tab */}
        {tab === "goals" && (
          <div className="space-y-3">
            {activeGoals.length === 0 && <div className="card" style={{ textAlign: "center", padding: "32px 16px", color: "var(--ink2)" }}><Target size={32} style={{ margin: "0 auto 8px", opacity: 0.3 }} /><p className="t-sm">Hali maqsad yo'q</p></div>}
            {activeGoals.map(g => {
              const pct = g.metricTarget ? Math.round(g.metricProgress / g.metricTarget * 100) : null;
              return (
                <div key={g.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700 }}>{g.title}</p>
                      {g.description && <p className="t-sm" style={{ color: "var(--ink2)", marginTop: 2 }}>{g.description}</p>}
                      {pct !== null && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span className="t-xs" style={{ color: "var(--ink2)" }}>{g.metricProgress}/{g.metricTarget} {g.metricUnit}</span>
                            <span className="t-xs" style={{ color: "var(--ink2)" }}>{pct}%</span>
                          </div>
                          <div style={{ height: 4, background: "var(--surface2)", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: "var(--lamp-orange)", borderRadius: 2, transition: "width 0.5s" }} />
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => { Storage.saveGoal({ ...g, metricProgress: Math.max(0, g.metricProgress - 1) }); reload(); }}>−1</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => { Storage.saveGoal({ ...g, metricProgress: Math.min(g.metricTarget!, g.metricProgress + 1) }); reload(); }}>+1</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => { Storage.saveGoal({ ...g, metricProgress: Math.min(g.metricTarget!, g.metricProgress + 5) }); reload(); }}>+5</button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn-icon" style={{ width: 30, height: 30 }} onClick={() => setEditing(g)}><Pencil size={13} /></button>
                      <button className="btn-icon" style={{ width: 30, height: 30 }} onClick={() => { Storage.saveGoal({ ...g, status: "archived" }); reload(); }}><Archive size={13} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Achievements tab */}
        {tab === "achievements" && (
          <div className="card" style={{ padding: "8px 0" }}>
            {ACHIEVEMENT_DEFS.map((def, i) => {
              const earned = achievements.find(a => a.id === def.id);
              return (
                <div key={def.id} style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                  <AchievementBadge def={def} earned={earned} />
                </div>
              );
            })}
          </div>
        )}

        {/* History tab */}
        {tab === "history" && (
          <div>
            {completedGoals.length === 0 && <div className="card" style={{ textAlign: "center", padding: "32px 16px", color: "var(--ink2)" }}><p className="t-sm">Hali yakunlangan maqsad yo'q</p></div>}
            {completedGoals.map(g => (
              <div key={g.id} className="card" style={{ padding: 14, marginBottom: 8, opacity: 0.7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>{g.title}</p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="tag tag-muted">{g.status === "completed" ? "Bajarildi" : "Arxivlandi"}</span>
                    <button onClick={() => { Storage.deleteGoal(g.id); reload(); }} className="btn-icon" style={{ width: 28, height: 28, color: "var(--error)" }}><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pid && <GoalModal open={showAdd} onClose={() => setShowAdd(false)} profileId={pid} onSaved={reload} />}
      {pid && editing && <GoalModal open={!!editing} onClose={() => setEditing(undefined)} goal={editing} profileId={pid} onSaved={reload} />}
    </div>
  );
}
