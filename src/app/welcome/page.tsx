"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Storage } from "@/lib/client/storage";
import { Logo } from "@/components/Branding";
import { ArrowRight, CheckCircle2, Moon, Target, LayoutDashboard } from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    const pid = Storage.getCurrentProfileId();
    const existing = Storage.getProfiles();
    
    // Check if Telegram user is available
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      if (tg.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        setName(user.first_name + (user.last_name ? ` ${user.last_name}` : ""));
      }
    }

    if (pid && existing.find(p => p.id === pid)) {
      const profile = existing.find(p => p.id === pid);
      if (profile?.onboardingCompleted) {
        router.push("/home");
      }
    }
  }, [router]);

  const handleStart = () => {
    if (!name.trim()) return;
    setLoading(true);
    
    const pid = Storage.getCurrentProfileId() || Math.random().toString(36).substring(2, 15);
    const p = {
      id: pid,
      name: name.trim(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      onboardingCompleted: false,
      createdAt: new Date()
    };
    
    // @ts-ignore
    Storage.saveProfile(p);
    Storage.setCurrentProfileId(p.id);
    router.push("/onboarding");
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col bg-brand-dark overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-silver rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-smoky rounded-full blur-[120px]" />
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 max-w-lg mx-auto w-full">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <Logo size={120} className="mx-auto mb-8" />
          
          <h1 className="text-4xl font-bold text-brand-light tracking-tight mb-4 leading-tight">
            Hayotingizni, <br/>
            <span className="text-brand-silver italic">tartibga soling.</span>
          </h1>
          
          <p className="text-brand-silver/80 text-lg mb-12 max-w-[280px] mx-auto leading-relaxed">
            Maqsadlar, vazifalar va uyqu rejimini boshqarish uchun shaxsiy tizim.
          </p>
        </motion.div>

        <motion.div 
          className="w-full space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <div className="grid grid-cols-1 gap-4 mb-8">
            {[
              { icon: LayoutDashboard, title: "Aqlli Dashboard", desc: "Sizga moslashtirilgan kunlik ko'rinish" },
              { icon: Moon, title: "Uyqu Nazorati", desc: "Sifatli uyqu va tartibli rejim" },
              { icon: Target, title: "Haqiqiy Maqsadlar", desc: "Natijaga asoslangan taraqqiyot" }
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 glass-panel">
                <div className="w-10 h-10 rounded-xl bg-brand-silver/20 flex items-center justify-center text-brand-silver">
                  <f.icon size={20} />
                </div>
                <div>
                  <h3 className="text-brand-light font-medium text-sm">{f.title}</h3>
                  <p className="text-brand-silver/60 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="relative">
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ismingiz yoki nikingiz"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-brand-light placeholder:text-brand-silver/40 focus:outline-none focus:border-brand-silver/50 transition-colors"
              />
            </div>

            <button 
              onClick={handleStart}
              disabled={loading || !name.trim()}
              className="w-full btn-primary h-14 group text-lg"
            >
              {loading ? "Yuklanmoqda..." : "Boshlash"}
              <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>

        <p className="mt-8 text-brand-silver/40 text-xs text-center px-8 leading-relaxed">
          Tizim sizning ma'lumotlaringizni xavfsiz va shaxsiy saqlaydi.
        </p>
      </main>
    </div>
  );
}
