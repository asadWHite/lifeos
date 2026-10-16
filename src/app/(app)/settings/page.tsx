"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Moon, 
  Sun, 
  Laptop, 
  Bell, 
  Globe, 
  ShieldCheck, 
  LogOut, 
  ChevronRight,
  Download,
  Trash2,
  Sliders
} from "lucide-react";
import { Storage } from "@/lib/client/storage";
import { memoryFacts } from "@/lib/personalization";
import { SectionHeader } from "@/components/ui";
import { ProfileForm, SleepForm, AppearanceForm } from "@/components/settings/SettingsForms";

export default function SettingsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const pid = Storage.getCurrentProfileId();
    if (!pid) return;
    const profile = Storage.getProfile(pid);
    const prefs = Storage.getPrefs(pid);
    if (!profile || !prefs) return;
    setData({ profile, prefs });
  }, []);

  const handleLogout = () => {
    Storage.setCurrentProfileId(null);
    router.push("/welcome");
  };

  const handleReset = () => {
    if (confirm("Hamma ma'lumotlarni o'chirishga ishonchingiz komilmi?")) {
      const pid = Storage.getCurrentProfileId();
      if (pid) Storage.deleteProfile(pid);
      Storage.setCurrentProfileId(null);
      router.push("/welcome");
    }
  };

  if (!data) return null;
  const { profile, prefs } = data;

  const facts = memoryFacts({
    ...prefs,
    ageGroup: prefs.ageGroup, lifeStage: prefs.lifeStage,
  });

  return (
    <div className="p-6 space-y-8 animate-fade pb-24">
      <header>
        <h1 className="text-3xl font-extrabold text-ink tracking-tight italic">Sozlamalar</h1>
        <p className="text-ink-muted text-sm mt-1 leading-relaxed">Shaxsiy profil va tizim sozlamalari.</p>
      </header>

      <div className="space-y-6">
        {/* User Card */}
        <section className="metallic-card p-6 bg-brand-dark border-white/5 flex items-center gap-5 shadow-metallic">
           <div className="w-16 h-16 rounded-[24px] bg-brand-silver/20 flex items-center justify-center text-brand-silver font-black text-2xl">
              {profile.name.charAt(0)}
           </div>
           <div>
              <h2 className="text-xl font-bold text-brand-light">{profile.name}</h2>
              <p className="text-xs text-brand-silver/50 font-bold uppercase tracking-widest">{profile.timezone}</p>
           </div>
        </section>

        {/* Profile Settings */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-ink-muted uppercase tracking-[0.2em] px-2">Profil va Ma'lumotlar</h3>
          <div className="metallic-card bg-surface overflow-hidden divide-y divide-border">
             <div className="p-5"><ProfileForm name={profile.name} timezone={profile.timezone} /></div>
             <div className="p-5"><SleepForm targetMinutes={prefs.sleepTargetMinutes} wakeTime={prefs.wakeTime} bedtime={prefs.bedtime} phoneBeforeBed={prefs.phoneBeforeBed} /></div>
          </div>
        </section>

        {/* Appearance */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-ink-muted uppercase tracking-[0.2em] px-2">Tizim ko'rinishi</h3>
          <div className="metallic-card bg-surface p-5">
             <AppearanceForm theme={prefs.theme} />
          </div>
        </section>

        {/* Telegram Section */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-ink-muted uppercase tracking-[0.2em] px-2">Telegram va Bot</h3>
          <div className="metallic-card bg-surface p-5 space-y-4">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                   <Bell size={20} />
                </div>
                <div className="flex-1">
                   <p className="text-sm font-bold text-ink">Eslatmalar</p>
                   <p className="text-[10px] text-ink-muted font-bold uppercase tracking-tighter">Telegram orqali xabarnomalar</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${prefs.reminderEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                   {prefs.reminderEnabled ? 'Yoqilgan' : 'O\'chirilgan'}
                </div>
             </div>
             <p className="text-[10px] text-ink-muted leading-relaxed italic border-t border-border pt-4">
                Hozirda ilova local-storage rejimida ishlamoqda. Bot xabarnomalari uchun server bilan sinxronizatsiya talab qilinadi.
             </p>
          </div>
        </section>

        {/* Facts List */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-ink-muted uppercase tracking-[0.2em] px-2">LifeOS siz haqida nima biladi?</h3>
          <div className="metallic-card bg-surface p-5">
             <div className="grid grid-cols-1 gap-4">
                {facts.length > 0 ? facts.map((f, i) => (
                  <div key={i} className="flex justify-between items-start gap-4">
                     <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest shrink-0">{f.label}</span>
                     <span className="text-xs font-bold text-ink text-right">{f.value}</span>
                  </div>
                )) : <p className="text-xs text-ink-muted italic">Hali ma'lumotlar yo'q</p>}
             </div>
             <div className="mt-6 pt-4 border-t border-border flex justify-center">
                <button className="text-[10px] font-black text-brand-silver uppercase tracking-widest hover:text-brand-dark transition-colors" onClick={() => router.push('/onboarding')}>Onboardingni qaytadan o'tish</button>
             </div>
          </div>
        </section>

        {/* Data Actions */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-ink-muted uppercase tracking-[0.2em] px-2">Xavfsizlik</h3>
          <div className="metallic-card bg-surface overflow-hidden flex flex-col divide-y divide-border">
             <button className="p-5 flex items-center justify-between text-left hover:bg-brand-light/20 transition-all group">
                <div className="flex items-center gap-4">
                   <Download size={18} className="text-brand-silver" />
                   <span className="text-sm font-bold text-ink">Ma'lumotlarni yuklab olish (JSON)</span>
                </div>
                <ChevronRight size={16} className="text-border group-hover:text-brand-silver" />
             </button>
             <button onClick={handleLogout} className="p-5 flex items-center justify-between text-left hover:bg-brand-light/20 transition-all group">
                <div className="flex items-center gap-4">
                   <LogOut size={18} className="text-brand-silver" />
                   <span className="text-sm font-bold text-ink">Profilni almashtirish</span>
                </div>
                <ChevronRight size={16} className="text-border group-hover:text-brand-silver" />
             </button>
             <button onClick={handleReset} className="p-5 flex items-center justify-between text-left hover:bg-red-50 transition-all group">
                <div className="flex items-center gap-4">
                   <Trash2 size={18} className="text-red-400" />
                   <span className="text-sm font-bold text-red-500">Profilni butunlay o'chirish</span>
                </div>
                <ChevronRight size={16} className="text-red-200 group-hover:text-red-400" />
             </button>
          </div>
        </section>
      </div>

      <div className="pt-8 text-center space-y-4">
         <p className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.4em]">LifeOS Version 1.0</p>
         <div className="w-1.5 h-1.5 rounded-full bg-brand-silver mx-auto opacity-20" />
      </div>
    </div>
  );
}
