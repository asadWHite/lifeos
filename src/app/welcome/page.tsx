"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Moon, Target, Zap } from "lucide-react";
import { Storage, generateId } from "@/lib/client/storage";

export default function WelcomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [error, setError]         = useState("");
  const [profiles, setProfiles]   = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setMounted(true);
    const pid = Storage.getCurrentProfileId();
    const all = Storage.getProfiles();
    setProfiles(all.map(p => ({ id: p.id, firstName: p.firstName, lastName: p.lastName })));
    if (pid) {
      const p = all.find(x => x.id === pid);
      if (p?.onboardingCompleted) router.replace("/today");
    }
  }, [router]);

  function create() {
    if (!firstName.trim()) { setError("Ismingizni kiriting"); return; }
    const id = generateId();
    Storage.saveProfile({ id, firstName: firstName.trim(), lastName: lastName.trim(), nickname: null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", onboardingCompleted: false, createdAt: new Date().toISOString() });
    Storage.setCurrentProfileId(id);
    router.replace("/onboarding");
  }

  function openProfile(id: string) {
    Storage.setCurrentProfileId(id);
    router.replace("/today");
  }

  if (!mounted) return null;

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(160deg, #151B23 0%, #202833 50%, #1A2030 100%)", display: "flex", flexDirection: "column" }}>
      {/* Hero */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        {/* Logo */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: 24, background: "rgba(255,99,60,0.15)", border: "1px solid rgba(255,99,60,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <span style={{ fontSize: 36 }}>💡</span>
          </div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, color: "#F2F2F2", letterSpacing: "-0.04em", margin: 0 }}>LifeOS</h1>
          <p style={{ color: "#ADA996", marginTop: 8, fontSize: "1rem", lineHeight: 1.5, maxWidth: 280, textAlign: "center" }}>
            Hayotingizni tartibga soling — maqsadlar, uyqu, vazifalar
          </p>
        </div>

        {/* Features */}
        <div style={{ display: "grid", gap: 12, marginBottom: 36, width: "100%", maxWidth: 320 }}>
          {[
            { icon: Target, text: "Maqsadlar va lamp xotirlatgich" },
            { icon: Moon,   text: "Uyqu nazorati va statistika" },
            { icon: Zap,    text: "Odatlar va achievement'lar" },
          ].map(f => (
            <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
              <f.icon size={18} style={{ color: "#FF633C", flexShrink: 0 }} />
              <span style={{ fontSize: "0.875rem", color: "#ADA996" }}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Existing profiles */}
        {profiles.length > 0 && (
          <div style={{ width: "100%", maxWidth: 320, marginBottom: 20 }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(173,169,150,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Mavjud profil</p>
            {profiles.map(p => (
              <button key={p.id} onClick={() => openProfile(p.id)} style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, display: "flex", alignItems: "center", gap: 12, marginBottom: 8, cursor: "pointer" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FF633C", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: "0.9rem" }}>
                  {p.firstName[0]?.toUpperCase()}
                </div>
                <div style={{ textAlign: "left" }}>
                  <p style={{ color: "#F2F2F2", fontWeight: 600, fontSize: "0.9rem", margin: 0 }}>{p.firstName} {p.lastName}</p>
                  <p style={{ color: "#ADA996", fontSize: "0.75rem", margin: 0 }}>Davom etish</p>
                </div>
                <ArrowRight size={16} style={{ color: "#ADA996", marginLeft: "auto" }} />
              </button>
            ))}
          </div>
        )}

        {/* Create form */}
        <div style={{ width: "100%", maxWidth: 320 }}>
          {profiles.length > 0 && <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(173,169,150,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Yangi profil</p>}
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={firstName} onChange={e => { setFirstName(e.target.value); setError(""); }} placeholder="Ism *" onKeyDown={e => e.key === "Enter" && create()} maxLength={30} style={{ flex: 1, padding: "12px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, color: "#F2F2F2", fontSize: 16, outline: "none" }} />
            <input value={lastName}  onChange={e => setLastName(e.target.value)}  placeholder="Familiya" maxLength={30} style={{ flex: 1, padding: "12px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, color: "#F2F2F2", fontSize: 16, outline: "none" }} />
          </div>
          {error && <p style={{ color: "#C65B55", fontSize: "0.8rem", marginBottom: 8 }}>{error}</p>}
          <button onClick={create} style={{ width: "100%", padding: "14px", background: "#FF633C", border: "none", borderRadius: 14, color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 20px rgba(255,99,60,0.4)" }}>
            Boshlash <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
