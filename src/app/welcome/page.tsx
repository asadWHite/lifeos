"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sun, Moon, Target } from "lucide-react";
import { Storage, generateId } from "@/lib/client/storage";
import { Spinner } from "@/components/ui/index";

export default function Welcome() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [profiles, setProfiles] = useState<Array<{ id: string; name: string }>>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
    // Try Telegram user
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
      const u = (window as any).Telegram.WebApp.initDataUnsafe.user;
      setName(u.first_name + (u.last_name ? ` ${u.last_name}` : ""));
    }
    const pid = Storage.getCurrentProfileId();
    const profs = Storage.getProfiles();
    if (pid) {
      const p = profs.find(x => x.id === pid);
      if (p?.onboardingCompleted) { router.replace("/today"); return; }
    }
    setProfiles(profs.map(p => ({ id: p.id, name: p.name })));
  }, [router]);

  function create() {
    const n = name.trim();
    if (!n) { setError("Ismingizni kiriting"); return; }
    setLoading(true);
    const id = generateId();
    Storage.saveProfile({ id, name: n, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", onboardingCompleted: false, createdAt: new Date().toISOString() });
    Storage.setCurrentProfileId(id);
    router.replace("/onboarding");
  }

  function open(id: string) {
    Storage.setCurrentProfileId(id);
    router.replace("/today");
  }

  if (!mounted) return null;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "linear-gradient(160deg, #151B23 0%, #202833 55%, #2B3440 100%)" }}>
      {/* hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        {/* lamp icon */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,99,60,0.25) 0%, transparent 70%)" }} />
          <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "rgba(255,99,60,0.12)", border: "1px solid rgba(255,99,60,0.2)" }}>
            <div style={{ fontSize: 42 }}>🕯️</div>
          </div>
        </div>

        <h1 className="text-display text-[#F2F2F2] mb-4">LifeOS</h1>
        <p className="text-body text-[#ADA996] max-w-xs leading-relaxed mb-12">
          Maqsadlaringizni belgilang. Lamp ularni yoritadi. Hayotingizni tartibga soling.
        </p>

        <div className="grid grid-cols-3 gap-4 w-full max-w-sm mb-12">
          {[
            { icon: Target, label: "Maqsadlar" },
            { icon: Sun, label: "Rejalash" },
            { icon: Moon, label: "Uyqu" },
          ].map(f => (
            <div key={f.label} className="flex flex-col items-center gap-2 p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <f.icon size={22} style={{ color: "#FF633C" }} />
              <span className="text-small text-[#ADA996]">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* form */}
      <div className="px-6 pb-8 space-y-4 max-w-sm mx-auto w-full">
        {profiles.length > 0 && (
          <div className="space-y-2 mb-2">
            {profiles.map(p => (
              <button key={p.id} onClick={() => open(p.id)} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left hover:opacity-80 transition-opacity" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-[#F2F2F2] font-bold" style={{ background: "#FF633C" }}>
                  {p.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-[#F2F2F2] font-semibold">{p.name}</p>
                  <p className="text-small text-[#ADA996]">Davom etish</p>
                </div>
                <ArrowRight size={18} style={{ color: "#ADA996" }} />
              </button>
            ))}
            <div className="divider my-4 opacity-20" />
          </div>
        )}
        <input
          className="w-full text-[#F2F2F2] placeholder:text-[#ADA996] rounded-2xl px-4 py-3 outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", fontSize: 16 }}
          placeholder="Ismingiz yoki laqabingiz"
          value={name}
          onChange={e => { setName(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && create()}
          maxLength={40}
        />
        {error && <p className="text-small text-[#C65B55]">{error}</p>}
        <button
          onClick={create}
          disabled={loading || !name.trim()}
          className="w-full h-14 rounded-2xl font-bold text-white flex items-center justify-center gap-2 text-base transition-opacity disabled:opacity-50"
          style={{ background: loading ? "#666" : "#FF633C", boxShadow: "0 4px 20px rgba(255,99,60,0.35)" }}
        >
          {loading ? <Spinner size={20} /> : <>Boshlash <ArrowRight size={18} /></>}
        </button>
      </div>
    </div>
  );
}
