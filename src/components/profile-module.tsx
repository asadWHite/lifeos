"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BellRing, LogOut, MoonStar, Sun, UserRound } from "lucide-react";
import { api } from "@/lib/client-api";
import { firebaseSignOut } from "@/lib/firebase";
import { Button, Field, Input, Select, Toggle, cn, useToast } from "@/components/ui";
import { displayName } from "@/lib/personalize";
import {
  HABIT_FOCUS_OPTIONS,
  INTEREST_OPTIONS,
  LIFE_SITUATIONS,
  RESPONSIBILITY_OPTIONS,
} from "@/lib/validation";

const TIMEZONES = [
  "Asia/Tashkent", "Asia/Almaty", "Asia/Dubai", "Europe/Moscow", "Europe/Istanbul",
  "Europe/Berlin", "Europe/London", "America/New_York", "America/Chicago",
  "America/Los_Angeles", "Asia/Seoul", "Asia/Tokyo", "Australia/Sydney",
];
const SITUATION_LABELS: Record<string, string> = {
  school_student: "School student", university_student: "University student", working_adult: "Working adult",
  self_employed: "Self-employed", multiple: "Juggling responsibilities", other: "Something else",
};
const RESP_LABELS: Record<string, string> = {
  school: "School", university: "University", work: "Work", study: "Study", family: "Family", fitness: "Fitness", projects: "Projects", other: "Other",
};
const INTEREST_LABELS: Record<string, string> = {
  education: "Education", languages: "Languages", health: "Health", sleep: "Sleep", productivity: "Productivity",
  growth: "Growth", work: "Work", creative: "Creative", social: "Social", habits: "Habits",
};
const HABIT_LABELS: Record<string, string> = {
  sleep: "Consistent sleep", study: "Regular study", exercise: "Exercise", reading: "Reading",
  planning: "Planning", less_phone: "Less phone", projects: "Projects",
};

interface ProfileUser {
  email: string; name: string; nickname: string; dob: string; timezone: string; theme: string;
  image: string | null; viaGoogle: boolean; createdAt: string;
  remindersEnabled: boolean; reminderStyle: string; planningStyle: string;
  lifeSituation: string | null; responsibilities: string[]; interests: string[]; habitFocus: string[];
  wakeTime: string; bedTime: string; phoneBeforeBed: string; phoneAfterWake: string;
}

function Section({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="text-sm font-semibold">{title}</h2>
      {desc && <p className="mt-0.5 text-[13px] text-faint">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
        selected ? "border-accent/60 bg-accent/12 text-accent" : "border-[var(--c-line)] text-sub hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function ProfileModule({ user }: { user: ProfileUser }) {
  const router = useRouter();
  const { push } = useToast();

  // personal info
  const [name, setName] = useState(user.name);
  const [nickname, setNickname] = useState(user.nickname);
  const [dob, setDob] = useState(user.dob);
  const [timezone, setTimezone] = useState(user.timezone);

  // answers
  const [lifeSituation, setLifeSituation] = useState(user.lifeSituation);
  const [responsibilities, setResponsibilities] = useState<string[]>(user.responsibilities);
  const [interests, setInterests] = useState<string[]>(user.interests);
  const [habitFocus, setHabitFocus] = useState<string[]>(user.habitFocus);
  const [wakeTime, setWakeTime] = useState(user.wakeTime);
  const [bedTime, setBedTime] = useState(user.bedTime);
  const [phoneBeforeBed, setPhoneBeforeBed] = useState(user.phoneBeforeBed);
  const [phoneAfterWake, setPhoneAfterWake] = useState(user.phoneAfterWake);

  // prefs
  const [theme, setTheme] = useState(user.theme);
  const [reminderStyle, setReminderStyle] = useState(user.reminderStyle);
  const [planningStyle, setPlanningStyle] = useState(user.planningStyle);
  const [remindersEnabled, setRemindersEnabled] = useState(user.remindersEnabled);
  const [notifNote, setNotifNote] = useState<string | null>(null);

  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function save(key: string, payload: Record<string, unknown>, confirm: string): Promise<boolean> {
    if (pendingKey) return false;
    setPendingKey(key);
    const res = await api("/api/profile", "PATCH", payload);
    setPendingKey(null);
    if (!res.ok) {
      push({ title: "Couldn't save", body: res.error ?? "Settings were not changed.", tone: "bad" });
      return false;
    }
    push({ title: confirm, tone: "ok" }); // only after real persistence
    router.refresh();
    return true;
  }

  function toggleIn(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  async function applyTheme(next: string) {
    setTheme(next); // optimistic visual; persistence confirmed (or reverted) below
    document.documentElement.dataset.theme = next;
    document.cookie = `lifeos_theme=${next}; path=/; max-age=31536000; samesite=lax`;
    const ok = await save("theme", { theme: next }, next === "dark" ? "Dark theme saved" : "Light theme saved");
    if (!ok) {
      setTheme(theme);
      document.documentElement.dataset.theme = theme;
      document.cookie = `lifeos_theme=${theme}; path=/; max-age=31536000; samesite=lax`;
    }
  }

  async function toggleReminders(next: boolean) {
    if (next) {
      if (typeof Notification === "undefined") {
        setNotifNote("This browser doesn't support notifications — in-app reminders will be used while LifeOS is open.");
        setRemindersEnabled(true);
        await save("reminders", { remindersEnabled: true }, "In-app reminders enabled");
        return;
      }
      let perm = Notification.permission;
      if (perm === "default") {
        try { perm = await Notification.requestPermission(); } catch { /* older browsers */ }
      }
      if (perm === "denied") {
        setNotifNote("Browser notifications are blocked for this site. Enable them in your browser's site settings to receive alerts; in-app reminders will still fire while LifeOS is open.");
        setRemindersEnabled(true);
        await save("reminders", { remindersEnabled: true }, "In-app reminders enabled");
        return;
      }
      setNotifNote("Browser notifications enabled. Reminders fire while LifeOS is open; closed-browser delivery requires push infrastructure (see README).");
      setRemindersEnabled(true);
      await save("reminders", { remindersEnabled: true }, "Reminders enabled");
    } else {
      setRemindersEnabled(false);
      setNotifNote(null);
      await save("reminders", { remindersEnabled: false }, "Reminders disabled");
    }
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    await firebaseSignOut(); // also end the Firebase session (best-effort)
    const res = await api("/api/auth/signout", "POST");
    if (!res.ok) {
      setSigningOut(false);
      push({ title: "Couldn't sign out", body: res.error ?? undefined, tone: "bad" });
      return;
    }
    router.push("/sign-in");
    router.refresh();
  }

  const memberSince = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(user.createdAt));

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-center gap-4">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- external OAuth avatar
          <img src={user.image} alt="" className="size-16 rounded-2xl object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="grid size-16 place-items-center rounded-2xl bg-accent/15 text-accent"><UserRound className="size-8" aria-hidden /></span>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-display text-[1.75rem] font-semibold">{displayName(user)}</h1>
          <p className="truncate text-sm text-sub">{user.email}</p>
          <p className="mt-0.5 text-[12px] text-faint">Member since {memberSince}{user.viaGoogle ? " · Google account" : " · Email account"}</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal info */}
        <Section title="Personal information" desc="Displayed across LifeOS. Only your name is required.">
          <form
            className="grid gap-4"
            onSubmit={async (e: FormEvent) => {
              e.preventDefault();
              if (!name.trim()) return push({ title: "Name can't be empty", tone: "bad" });
              await save("personal", { name: name.trim(), nickname: nickname.trim() || null, dob: dob || null, timezone }, "Profile saved");
            }}
          >
            <Field label="Full name" htmlFor="pf-name"><Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nickname" htmlFor="pf-nick" optional><Input id="pf-nick" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40} /></Field>
              <Field label="Date of birth" htmlFor="pf-dob" optional><Input id="pf-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} /></Field>
            </div>
            <Field label="Timezone" htmlFor="pf-tz" hint="Your Today page, timeline and reminders follow this.">
              <Select id="pf-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {[...new Set([timezone, ...TIMEZONES])].map((tz) => <option key={tz} value={tz}>{tz.replace("_", " ")}</option>)}
              </Select>
            </Field>
            <Button type="submit" loading={pendingKey === "personal"} className="justify-self-start">Save personal info</Button>
          </form>
        </Section>

        {/* Preferences */}
        <Section title="Preferences" desc="Every switch here changes real behavior.">
          <div className="grid gap-5">
            <div>
              <p className="text-[13px] font-medium text-sub">Appearance</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["dark", "light"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={theme === t}
                    onClick={() => theme !== t && applyTheme(t)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-2xl border p-3.5 text-sm font-medium transition-colors",
                      theme === t ? "border-accent/60 bg-accent/10 text-ink" : "border-[var(--c-line)] text-sub hover:text-ink",
                    )}
                  >
                    {t === "dark" ? <MoonStar className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
                    {t === "dark" ? "Deep navy" : "Warm ivory"}
                  </button>
                ))}
              </div>
            </div>

            <Toggle
              checked={remindersEnabled}
              onChange={toggleReminders}
              label="Activity reminders"
              description="At task start times (10 min early for the firm style)."
            />
            {notifNote && <p className="rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-warn">{notifNote}</p>}

            <form
              className="grid gap-4"
              onSubmit={async (e: FormEvent) => {
                e.preventDefault();
                await save("prefs", { reminderStyle, planningStyle }, "Preferences saved");
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Reminder style" htmlFor="pf-rs">
                  <Select id="pf-rs" value={reminderStyle} onChange={(e) => setReminderStyle(e.target.value)}>
                    <option value="gentle">Gentle nudges</option>
                    <option value="firm">Direct and firm</option>
                    <option value="minimal">Minimal</option>
                  </Select>
                </Field>
                <Field label="Planning style" htmlFor="pf-ps">
                  <Select id="pf-ps" value={planningStyle} onChange={(e) => setPlanningStyle(e.target.value)}>
                    <option value="structured">Structured</option>
                    <option value="balanced">Balanced</option>
                    <option value="flexible">Flexible</option>
                  </Select>
                </Field>
              </div>
              <Button type="submit" loading={pendingKey === "prefs"} className="justify-self-start">Save preferences</Button>
            </form>
          </div>
        </Section>
      </div>

      {/* Onboarding answers */}
      <Section title="Your life setup" desc="The answers LifeOS uses for personalization — edit anytime.">
        <form
          className="grid gap-5"
          onSubmit={async (e: FormEvent) => {
            e.preventDefault();
            if (!lifeSituation) return push({ title: "Pick a life situation before saving", tone: "bad" });
            await save("setup", {
              lifeSituation, responsibilities, interests, habitFocus,
              wakeTime: wakeTime || null, bedTime: bedTime || null,
              phoneBeforeBed: phoneBeforeBed || null, phoneAfterWake: phoneAfterWake || null,
            }, "Life setup saved");
          }}
        >
          <Field label="Life situation" htmlFor="pf-ls">
            <Select id="pf-ls" value={lifeSituation ?? ""} onChange={(e) => setLifeSituation(e.target.value)}>
              {!lifeSituation && <option value="">Choose…</option>}
              {LIFE_SITUATIONS.map((s) => <option key={s} value={s}>{SITUATION_LABELS[s]}</option>)}
            </Select>
          </Field>
          <Field label="Weekly responsibilities">
            <div className="flex flex-wrap gap-2">
              {RESPONSIBILITY_OPTIONS.map((r) => <Chip key={r} selected={responsibilities.includes(r)} onClick={() => toggleIn(responsibilities, setResponsibilities, r)}>{RESP_LABELS[r]}</Chip>)}
            </div>
          </Field>
          <Field label="Interests">
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((i) => <Chip key={i} selected={interests.includes(i)} onClick={() => toggleIn(interests, setInterests, i)}>{INTEREST_LABELS[i]}</Chip>)}
            </div>
          </Field>
          <Field label="Routines to build">
            <div className="flex flex-wrap gap-2">
              {HABIT_FOCUS_OPTIONS.map((h) => <Chip key={h} selected={habitFocus.includes(h)} onClick={() => toggleIn(habitFocus, setHabitFocus, h)}>{HABIT_LABELS[h]}</Chip>)}
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Usual wake-up" htmlFor="pf-wake"><Input id="pf-wake" type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} /></Field>
            <Field label="Preferred bedtime" htmlFor="pf-bed"><Input id="pf-bed" type="time" value={bedTime} onChange={(e) => setBedTime(e.target.value)} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone before bed" htmlFor="pf-pb">
              <Select id="pf-pb" value={phoneBeforeBed} onChange={(e) => setPhoneBeforeBed(e.target.value)}>
                <option value="">Not set</option>
                <option value="none">Phone away</option>
                <option value="under_30">Under 30 minutes</option>
                <option value="over_30">More than 30 minutes</option>
                <option value="until_sleep">Until falling asleep</option>
              </Select>
            </Field>
            <Field label="Phone after waking" htmlFor="pf-pa">
              <Select id="pf-pa" value={phoneAfterWake} onChange={(e) => setPhoneAfterWake(e.target.value)}>
                <option value="">Not set</option>
                <option value="none">Not first thing</option>
                <option value="within_10">Within 10 minutes</option>
                <option value="immediately">First thing</option>
              </Select>
            </Field>
          </div>
          <Button type="submit" loading={pendingKey === "setup"} className="justify-self-start">Save life setup</Button>
        </form>
      </Section>

      {/* Account */}
      <Section title="Account">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-[13px] text-faint">
            {user.viaGoogle ? (
              <p>Signed in with Google. Your password is never touched by LifeOS.</p>
            ) : (
              <p>Email account — your password is stored only as a secure hash. Google sign-in runs through Firebase Authentication.</p>
            )}
          </div>
          <Button variant="danger" onClick={signOut} loading={signingOut}>
            <LogOut className="size-4" aria-hidden /> Sign out
          </Button>
        </div>
      </Section>

      {/* Reminders diagnostic */}
      <p className="flex items-start gap-2 text-[12px] leading-relaxed text-faint">
        <BellRing className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Honest reminder scope: reminders fire while LifeOS is open (toast or browser notification). Delivering push notifications with the app fully closed needs a service worker, push subscription and a server scheduler — documented in the README, not faked here.
      </p>
    </div>
  );
}
