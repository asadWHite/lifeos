"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Download, Trash2, Moon, Sun, Laptop, Bell, ChevronRight } from "lucide-react";
import { Storage } from "@/lib/client/storage";
import { Modal, Field, Toggle } from "@/components/ui/index";

export default function ProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [prefs, setPrefs] = useState<any>(null);
  const [pid, setPid] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [theme, setTheme] = useState("system");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => {
    const id = Storage.getCurrentProfileId();
    if (!id) return;
    const p = Storage.getProfile(id);
    const pr = Storage.getPrefs(id);
    if (p) { setProfile(p); setEditName(p.name); }
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
    if (!pid || !profile || !editName.trim()) return;
    Storage.saveProfile({ ...profile, name: editName.trim() });
    setShowNameEdit(false);
    load();
  }

  function applyTheme(t: string) {
    setTheme(t);
    if (!pid) return;
    const pr = Storage.getPrefs(pid);
    Storage.savePrefs({ ...pr, theme: t, updatedAt: new Date().toISOString() });
    try {
      localStorage.setItem("lifeos_theme", t);
      if (t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
    } catch {}
  }

  function toggleReminder() {
    if (!pid) return;
    const pr = Storage.getPrefs(pid);
    Storage.savePrefs({ ...pr, reminderEnabled: !pr.reminderEnabled, updatedAt: new Date().toISOString() });
    load();
  }

  function exportData() {
    if (!pid) return;
    const data = {
      exportedAt: new Date().toISOString(),
      profile: Storage.getProfile(pid),
      prefs: Storage.getPrefs(pid),
      tasks: Storage.getTasks().filter(t => t.profileId === pid),
      goals: Storage.getGoals().filter(g => g.profileId === pid),
      sleep: Storage.getSleeps().filter(s => s.profileId === pid),
      checkins: Storage.getCheckins().filter(c => c.profileId === pid),
      habits: Storage.getHabits().filter(h => h.profileId === pid),
      scheduled: Storage.getScheduledGoals().filter(s => s.profileId === pid),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "lifeos-export.json"; a.click();
    URL.revokeObjectURL(url);
  }

  function deleteProfile() {
    if (!pid) return;
    Storage.deleteProfile(pid);
    Storage.setCurrentProfileId(null);
    router.replace("/welcome");
  }

  if (!mounted || !profile) return null;

  return (
    <div className="min-h-dvh bg-[var(--c-bg)] page-enter">
      <div className="px-5 pt-12 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ background: "#FF633C" }}>
            {profile.name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-h1">{profile.name}</h1>
            <p className="text-small text-[var(--c-ink2)]">{profile.timezone}</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        <div className="card space-y-1 divide-y divide-[var(--c-border)]">
          <div className="py-1">
            <p className="text-label text-[var(--c-ink2)] mb-2">PROFIL</p>
          </div>
          <button onClick={() => setShowNameEdit(true)} className="w-full flex items-center justify-between py-3 text-left">
            <div>
              <p className="text-body font-medium">Ism</p>
              <p className="text-small text-[var(--c-ink2)]">{profile.name}</p>
            </div>
            <ChevronRight size={16} className="text-[var(--c-ink2)]" />
          </button>
          <button onClick={() => router.replace("/onboarding")} className="w-full flex items-center justify-between py-3 text-left">
            <p className="text-body font-medium">Onboardingni qayta o'tish</p>
            <ChevronRight size={16} className="text-[var(--c-ink2)]" />
          </button>
        </div>

        <div className="card space-y-3">
          <p className="text-label text-[var(--c-ink2)]">KO'RINISH</p>
          <div className="grid grid-cols-3 gap-2">
            {[{id:"light",icon:Sun,label:"Yorug'"},{id:"dark",icon:Moon,label:"To'q"},{id:"system",icon:Laptop,label:"Tizim"}].map(o => (
              <button key={o.id} onClick={() => applyTheme(o.id)} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${theme===o.id?"border-[var(--c-ink)] bg-[var(--c-ink)] text-[var(--c-bg)]":"border-[var(--c-border)] text-[var(--c-ink2)]"}`}>
                <o.icon size={18} />
                <span className="text-small">{o.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-[var(--c-ink2)]" />
            <div>
              <p className="text-body font-medium">Eslatmalar</p>
              <p className="text-small text-[var(--c-ink2)]">Lamp bildirishnomalari</p>
            </div>
          </div>
          <Toggle on={prefs?.reminderEnabled ?? true} onToggle={toggleReminder} label="Eslatmalar" />
        </div>

        <div className="card space-y-1 divide-y divide-[var(--c-border)]">
          <div className="py-1">
            <p className="text-label text-[var(--c-ink2)] mb-2">MA'LUMOTLAR</p>
          </div>
          <button onClick={exportData} className="w-full flex items-center gap-3 py-3 text-left">
            <Download size={18} className="text-[var(--c-ink2)]" />
            <p className="text-body font-medium">Eksport qilish (JSON)</p>
          </button>
          <button onClick={() => { Storage.setCurrentProfileId(null); router.replace("/welcome"); }} className="w-full flex items-center gap-3 py-3 text-left">
            <LogOut size={18} className="text-[var(--c-ink2)]" />
            <p className="text-body font-medium">Chiqish</p>
          </button>
          <button onClick={() => setConfirmDelete(true)} className="w-full flex items-center gap-3 py-3 text-left">
            <Trash2 size={18} style={{ color: "#C65B55" }} />
            <p className="text-body font-medium" style={{ color: "#C65B55" }}>Profilni o'chirish</p>
          </button>
        </div>

        <div className="card">
          <p className="text-label text-[var(--c-ink2)] mb-2">MA'LUMOT</p>
          <p className="text-small text-[var(--c-ink2)] leading-relaxed">
            LifeOS sizning ma'lumotlaringizni faqat ushbu qurilmaning xotirasida saqlaydi. Hech qanday server yoki bulut sinxronizatsiyasi yo'q.
          </p>
        </div>
      </div>

      <Modal open={showNameEdit} onClose={() => setShowNameEdit(false)} title="Ismni tahrirlash" size="sm">
        <div className="space-y-4">
          <Field label="Ism" htmlFor="pn-name">
            <input id="pn-name" className="input" autoFocus value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveName()} maxLength={40} />
          </Field>
          <button onClick={saveName} className="btn btn-primary w-full btn-lg">Saqlash</button>
        </div>
      </Modal>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Profilni o'chirish" size="sm">
        <div className="space-y-4">
          <p className="text-body text-[var(--c-ink2)]">Barcha ma'lumotlar butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(false)} className="btn btn-ghost flex-1">Bekor</button>
            <button onClick={deleteProfile} className="btn flex-1" style={{background:"#C65B55",color:"#fff"}}>O'chirish</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
