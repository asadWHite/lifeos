"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Download, Trash2, Moon, Sun, Laptop, Bell, ChevronRight } from "lucide-react";
import { Storage, computeStreak, ACHIEVEMENT_DEFS } from "@/lib/client/storage";
import { Modal, Field, Toggle } from "@/components/ui/index";

export default function ProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [prefs, setPrefs]     = useState<any>(null);
  const [pid, setPid]         = useState<string | null>(null);
  const [editFn, setEditFn]   = useState("");
  const [editLn, setEditLn]   = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [theme, setTheme]     = useState("system");
  const [confirmDel, setCDel] = useState(false);

  const load = useCallback(() => {
    const id = Storage.getCurrentProfileId(); if (!id) return;
    const p = Storage.getProfile(id); const pr = Storage.getPrefs(id);
    if (p) { setProfile(p); setEditFn(p.firstName); setEditLn(p.lastName || ""); }
    if (pr) { setPrefs(pr); setTheme(pr.theme); }
    setPid(id);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setMounted(true);
    const id = Storage.getCurrentProfileId();
    if (!id || !Storage.getProfile(id)) { router.replace("/welcome"); return; }
    load();
  }, [router, load]);

  function saveName() {
    if (!pid || !profile || !editFn.trim()) return;
    Storage.saveProfile({ ...profile, firstName: editFn.trim(), lastName: editLn.trim() });
    setShowEdit(false); load();
  }

  function applyTheme(t: string) {
    setTheme(t);
    if (!pid) return;
    const pr = Storage.getPrefs(pid);
    Storage.savePrefs({ ...pr, theme: t, updatedAt: new Date().toISOString() });
    try {
      localStorage.setItem("lifeos_theme", t);
      const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    } catch {}
  }

  function exportData() {
    if (!pid) return;
    const data = { exportedAt: new Date().toISOString(), profile: Storage.getProfile(pid), prefs: Storage.getPrefs(pid), tasks: Storage.getTasks(pid), goals: Storage.getGoals(pid), sleep: Storage.getSleeps(pid), habits: Storage.getHabits(pid), achievements: Storage.getAchievements(pid) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "lifeos-export.json"; a.click(); URL.revokeObjectURL(url);
  }

  function deleteProfile() {
    if (!pid) return;
    Storage.deleteProfile(pid); Storage.setCurrentProfileId(null); router.replace("/welcome");
  }

  if (!mounted || !profile) return null;

  const streak    = pid ? computeStreak(pid) : 0;
  const earned    = pid ? Storage.getAchievements(pid) : [];
  const initials  = (profile.firstName[0] || "?").toUpperCase() + (profile.lastName?.[0] || "").toUpperCase();

  return (
    <div className="pb-nav" style={{ background: "var(--bg)", minHeight: "100dvh" }}>
      <div style={{ padding: "48px 12px 0", maxWidth: 640, margin: "0 auto" }}>
        <h1 className="t-h1" style={{ marginBottom: 24 }}>Profil</h1>

        {/* Avatar & name */}
        <div className="card-dark" style={{ padding: 24, display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--lamp-orange)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.4rem", color: "#fff", flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: "1.2rem", color: "#F2F2F2" }}>{profile.firstName} {profile.lastName}</p>
            <p className="t-sm" style={{ color: "#ADA996" }}>{profile.timezone}</p>
          </div>
          <button onClick={() => setShowEdit(true)} className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>Tahrir</button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div className="card" style={{ textAlign: "center", padding: "14px 8px" }}>
            <p style={{ fontWeight: 800, fontSize: "1.5rem", color: "var(--lamp-orange)" }}>🔥 {streak}</p>
            <p className="t-xs" style={{ color: "var(--ink2)" }}>Streak</p>
          </div>
          <div className="card" style={{ textAlign: "center", padding: "14px 8px" }}>
            <p style={{ fontWeight: 800, fontSize: "1.5rem" }}>🏆 {earned.length}</p>
            <p className="t-xs" style={{ color: "var(--ink2)" }}>Achievement</p>
          </div>
          <div className="card" style={{ textAlign: "center", padding: "14px 8px" }}>
            <p style={{ fontWeight: 800, fontSize: "1.5rem" }}>{pid ? Storage.getGoals(pid).filter(g => g.status === "completed").length : 0} 🎯</p>
            <p className="t-xs" style={{ color: "var(--ink2)" }}>Maqsad</p>
          </div>
        </div>

        {/* Theme */}
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <p className="t-label" style={{ color: "var(--ink2)", marginBottom: 12 }}>KO'RINISH</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[{id:"light",Icon:Sun,label:"Yorug'"},{id:"dark",Icon:Moon,label:"To'q"},{id:"system",Icon:Laptop,label:"Tizim"}].map(o => (
              <button key={o.id} onClick={() => applyTheme(o.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 8px", borderRadius: 12, border: `1px solid ${theme===o.id?"var(--lamp-orange)":"var(--border)"}`, background: theme===o.id?"rgba(255,99,60,0.08)":"var(--surface2)", cursor: "pointer", transition: "all 0.2s" }}>
                <o.Icon size={18} style={{ color: theme===o.id?"var(--lamp-orange)":"var(--ink2)" }} />
                <span className="t-xs" style={{ color: theme===o.id?"var(--lamp-orange)":"var(--ink2)", fontWeight: theme===o.id?700:500 }}>{o.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Achievements preview */}
        {earned.length > 0 && (
          <div className="card" style={{ padding: "12px 16px", marginBottom: 12 }}>
            <p className="t-label" style={{ color: "var(--ink2)", marginBottom: 10 }}>ACHIEVEMENT'LAR ({earned.length}/{ACHIEVEMENT_DEFS.length})</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {earned.map(a => {
                const def = ACHIEVEMENT_DEFS.find(d => d.id === a.id);
                return def ? <span key={a.id} title={def.name} style={{ fontSize: "1.5rem" }}>{def.icon}</span> : null;
              })}
            </div>
          </div>
        )}

        {/* Data actions */}
        <div className="card" style={{ padding: "4px 0", marginBottom: 12 }}>
          {[
            { label: "Ma'lumotlarni eksport qilish", Icon: Download, action: exportData },
            { label: "Chiqish", Icon: LogOut, action: () => { Storage.setCurrentProfileId(null); router.replace("/welcome"); } },
          ].map(a => (
            <button key={a.label} onClick={a.action} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderTop: "1px solid var(--border)", background: "none", cursor: "pointer", textAlign: "left" }}>
              <a.Icon size={18} style={{ color: "var(--ink2)", flexShrink: 0 }} />
              <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{a.label}</span>
              <ChevronRight size={15} style={{ color: "var(--ink2)", marginLeft: "auto" }} />
            </button>
          ))}
          <button onClick={() => setCDel(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderTop: "1px solid var(--border)", background: "none", cursor: "pointer", textAlign: "left" }}>
            <Trash2 size={18} style={{ color: "var(--error)", flexShrink: 0 }} />
            <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--error)" }}>Profilni o'chirish</span>
          </button>
        </div>

        <p className="t-xs" style={{ color: "var(--ink2)", textAlign: "center", padding: "8px 0 24px" }}>
          Ma'lumotlar faqat ushbu qurilmada saqlanadi — hech qanday bulut sinxronizatsiyasi yo'q.
        </p>
      </div>

      {/* Edit name modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Ismni tahrirlash" size="sm">
        <div className="space-y-4">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Ism" htmlFor="pf-fn"><input id="pf-fn" className="input" autoFocus value={editFn} onChange={e => setEditFn(e.target.value)} /></Field>
            <Field label="Familiya" htmlFor="pf-ln"><input id="pf-ln" className="input" value={editLn} onChange={e => setEditLn(e.target.value)} /></Field>
          </div>
          <button className="btn btn-primary w-full btn-lg" onClick={saveName}>Saqlash</button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={confirmDel} onClose={() => setCDel(false)} title="Profilni o'chirish" size="sm">
        <p className="t-body" style={{ color: "var(--ink2)", marginBottom: 20 }}>Barcha ma'lumotlar o'chiriladi. Bu amalni qaytarib bo'lmaydi.</p>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => setCDel(false)} className="btn btn-ghost flex-1">Bekor</button>
          <button onClick={deleteProfile} className="btn flex-1" style={{ background: "var(--error)", color: "#fff" }}>O'chirish</button>
        </div>
      </Modal>
    </div>
  );
}
