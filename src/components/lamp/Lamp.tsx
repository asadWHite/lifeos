"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, Clock, RotateCcw, X } from "lucide-react";
import {
  Storage,
  generateId,
  nextFireTime,
  fmtDuration,
  type ScheduledGoalRow,
  type GoalRow,
  type LampReminderState,
} from "@/lib/client/storage";

/* ─── SVG Lamp visual ────────────────────────────────────────────────── */
function LampSVG({ lit, size = 220 }: { lit: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.4}
      viewBox="0 0 220 308"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* ── Light beam (SVG gradient cone) ── */}
      {lit && (
        <defs>
          <radialGradient id="beamGrad" cx="50%" cy="0%" r="100%">
            <stop offset="0%" stopColor="#FFB16A" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#FF633C" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FF633C" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFB16A" stopOpacity="1" />
            <stop offset="100%" stopColor="#FFB16A" stopOpacity="0" />
          </radialGradient>
        </defs>
      )}

      {/* Beam */}
      {lit && (
        <polygon
          points="110,80 20,308 200,308"
          fill="url(#beamGrad)"
          style={{ transition: "opacity 1.2s ease" }}
          className="animate-beam"
        />
      )}

      {/* Arm from pole to head */}
      {/* Vertical pole */}
      <rect x="105" y="170" width="10" height="130" rx="5" fill="#2B3440" />
      {/* Base */}
      <rect x="70" y="292" width="80" height="16" rx="8" fill="#2B3440" />

      {/* Arm */}
      <line x1="110" y1="170" x2="110" y2="90" stroke="#2B3440" strokeWidth="9" strokeLinecap="round" />
      <line x1="110" y1="90" x2="152" y2="68" stroke="#2B3440" strokeWidth="9" strokeLinecap="round" />

      {/* Head housing */}
      <ellipse cx="152" cy="68" rx="28" ry="12" fill="#202833" />
      <path d="M124 68 Q152 110 180 68" fill="#202833" stroke="#2B3440" strokeWidth="1.5" />

      {/* Rim highlight */}
      <ellipse
        cx="152" cy="68" rx="28" ry="12"
        fill="none"
        stroke={lit ? "#FFB16A" : "#3A4455"}
        strokeWidth="1.5"
        style={{ transition: "stroke 0.8s ease" }}
      />

      {/* Light source */}
      <circle
        cx="152" cy="72"
        r={lit ? "11" : "8"}
        fill={lit ? "#FFB16A" : "#2B3440"}
        style={{ transition: "fill 0.8s ease, r 0.8s ease" }}
      />
      {lit && (
        <circle cx="152" cy="72" r="18" fill="url(#glowGrad)" className="animate-glow" />
      )}
    </svg>
  );
}

/* ─── State machine helpers ──────────────────────────────────────────── */
const SNOOZE_MINUTES = 10;

function resolveCurrentState(sg: ScheduledGoalRow): LampReminderState {
  if (sg.state === "completed") return "completed";
  if (sg.state === "snoozed") {
    if (sg.snoozeUntil && new Date(sg.snoozeUntil) <= new Date()) return "active";
    return "snoozed";
  }
  const fire = nextFireTime(sg);
  if (!fire) return "missed";
  const minsUntil = (fire.getTime() - Date.now()) / 60000;
  if (minsUntil <= 0) return "active";
  if (minsUntil <= 15) return "upcoming";
  return "idle";
}

/* ─── Main Lamp component ────────────────────────────────────────────── */
export function LampComponent({ profileId }: { profileId: string }) {
  const [sg, setSg] = useState<ScheduledGoalRow | null>(null);
  const [goal, setGoal] = useState<GoalRow | null>(null);
  const [lampState, setLampState] = useState<LampReminderState>("idle");
  const [tick, setTick] = useState(0); // forces re-check every minute

  const reload = useCallback(() => {
    const scheduled = Storage.getScheduledGoals()
      .filter(s => s.profileId === profileId && s.state !== "completed")
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    const active = scheduled[0] ?? null;
    setSg(active);
    if (active) {
      const g = Storage.getGoals().find(x => x.id === active.goalId) ?? null;
      setGoal(g);
      setLampState(resolveCurrentState(active));
    } else {
      setGoal(null);
      setLampState("idle");
    }
  }, [profileId]);

  useEffect(() => { reload(); }, [reload, tick]);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30000);
    const onVis = () => { if (document.visibilityState === "visible") setTick(n => n + 1); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  /* actions */
  function complete() {
    if (!sg) return;
    Storage.saveScheduledGoal({ ...sg, state: "completed", completedAt: new Date().toISOString() });
    // Update goal progress
    const g = Storage.getGoals().find(x => x.id === sg.goalId);
    if (g && g.metricTarget) {
      Storage.saveGoal({ ...g, metricProgress: Math.min(g.metricTarget, g.metricProgress + 1) });
    }
    reload();
  }

  function snooze() {
    if (!sg) return;
    const until = new Date(Date.now() + SNOOZE_MINUTES * 60000).toISOString();
    Storage.saveScheduledGoal({ ...sg, state: "snoozed", snoozeUntil: until });
    reload();
  }

  function dismiss() {
    if (!sg) return;
    Storage.saveScheduledGoal({ ...sg, state: "missed", missedAt: new Date().toISOString() });
    reload();
  }

  const lit = lampState === "active" || lampState === "upcoming";
  const fire = sg ? nextFireTime(sg) : null;

  return (
    <div className="flex flex-col items-center select-none">
      {/* Lamp visual */}
      <div className="relative" style={{ width: 220, height: 308 }}>
        {/* Ambient glow when lit */}
        {lit && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 70% 25%, rgba(255,177,106,0.22) 0%, transparent 65%)",
              transition: "opacity 1.2s ease",
            }}
          />
        )}
        <LampSVG lit={lit} />
      </div>

      {/* Text area */}
      <div className="text-center mt-6 px-4 min-h-[100px] flex flex-col items-center justify-center">
        {lampState === "active" && goal && (
          <div className="animate-text-reveal space-y-1">
            <p className="text-label text-[#FF633C] mb-2">HOZIR VAQTI</p>
            <p className="text-h2 text-[#F2F2F2] leading-snug max-w-[260px]">{goal.title}</p>
            {sg?.duration && (
              <p className="text-body text-[#ADA996] mt-1">{fmtDuration(sg.duration)}</p>
            )}
          </div>
        )}

        {lampState === "upcoming" && goal && fire && (
          <div className="animate-fade-up space-y-1">
            <p className="text-label text-[#C8943E] mb-2">YAQINLASHMOQDA</p>
            <p className="text-h3 text-[#F2F2F2]">{goal.title}</p>
            <p className="text-body text-[#ADA996] flex items-center gap-1.5 justify-center">
              <Clock size={14} />
              {fire.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        )}

        {(lampState === "idle" || lampState === "snoozed") && (
          <div className="space-y-1">
            {sg && goal && fire && (
              <>
                <p className="text-label text-[#ADA996]">{lampState === "snoozed" ? "ERTELANMOQDA" : "KEYINGI MAQSAD"}</p>
                <p className="text-body text-[#F2F2F2] font-semibold">{goal.title}</p>
                <p className="text-small text-[#ADA996] flex items-center gap-1.5 justify-center">
                  <Clock size={12} />
                  {fire.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  {lampState === "snoozed" && " · Ertelandi"}
                </p>
              </>
            )}
            {!sg && (
              <p className="text-body text-[#ADA996]">Maqsad belgilang — lamp yoqiladi</p>
            )}
          </div>
        )}

        {lampState === "missed" && goal && (
          <div className="space-y-1 animate-fade-up">
            <p className="text-label text-[#C65B55]">O&apos;TKAZIB YUBORILDI</p>
            <p className="text-body text-[#ADA996]">{goal.title}</p>
          </div>
        )}
      </div>

      {/* Action buttons when active */}
      {lampState === "active" && (
        <div className="flex gap-3 mt-6 animate-fade-up delay-700">
          <button onClick={snooze} className="btn btn-ghost btn-sm">
            <Clock size={15} /> {SNOOZE_MINUTES}m ertelash
          </button>
          <button onClick={complete} className="btn btn-lamp btn-sm">
            <Check size={15} /> Bajarildi
          </button>
          <button onClick={dismiss} className="w-9 h-9 flex items-center justify-center rounded-full text-[#ADA996] hover:text-[#F2F2F2]">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Snoozed actions */}
      {lampState === "snoozed" && (
        <div className="flex gap-3 mt-6 animate-fade-up">
          <button onClick={complete} className="btn btn-ghost btn-sm">
            <Check size={15} /> Bajarildi
          </button>
          <button onClick={() => { if (sg) { Storage.saveScheduledGoal({ ...sg, state: "idle", snoozeUntil: null }); reload(); } }} className="btn btn-ghost btn-sm">
            <RotateCcw size={15} /> Bekor qilish
          </button>
        </div>
      )}
    </div>
  );
}
