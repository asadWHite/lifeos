"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Check, Clock, X, CalendarPlus } from "lucide-react";
import Image from "next/image";
import {
  Storage,
  nextFireTime,
  fmtDuration,
  type ScheduledGoalRow,
  type GoalRow,
  type LampReminderState,
} from "@/lib/client/storage";

const SNOOZE_MINUTES = 10;

export function LampComponent({ profileId }: { profileId: string }) {
  const [sg, setSg] = useState<ScheduledGoalRow | null>(null);
  const [goal, setGoal] = useState<GoalRow | null>(null);
  const [state, setState] = useState<LampReminderState>("idle");
  const didActivate = useRef(false);
  const [, setTick] = useState(0);

  const check = useCallback(() => {
    const all = Storage.getScheduledGoals()
      .filter(s => s.profileId === profileId && s.state !== "completed" && s.state !== "missed")
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    const current = all[0] ?? null;
    setSg(current);

    if (!current) {
      setGoal(null);
      setState("idle");
      didActivate.current = false;
      return;
    }

    const g = Storage.getGoals().find(x => x.id === current.goalId) ?? null;
    setGoal(g);

    const fire = nextFireTime(current);
    if (!fire) { setState("missed"); return; }

    const diff = (fire.getTime() - Date.now()) / 60000;

    if (diff <= 0) {
      if (!didActivate.current && current.state !== "active") {
        Storage.saveScheduledGoal({ ...current, state: "active" });
        didActivate.current = true;
      }
      setState("active");
    } else if (diff <= 15) {
      setState("upcoming");
      didActivate.current = false;
    } else {
      setState("idle");
      didActivate.current = false;
    }
  }, [profileId]);

  useEffect(() => {
    check();
    const t = setInterval(() => { setTick(n => n + 1); check(); }, 15000);
    const vis = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [check]);

  function complete() {
    if (!sg) return;
    Storage.saveScheduledGoal({ ...sg, state: "completed", completedAt: new Date().toISOString() });
    didActivate.current = false;
    check();
  }
  function snooze() {
    if (!sg) return;
    Storage.saveScheduledGoal({ ...sg, state: "snoozed", snoozeUntil: new Date(Date.now() + SNOOZE_MINUTES * 60000).toISOString() });
    didActivate.current = false;
    check();
  }
  function dismiss() {
    if (!sg) return;
    Storage.saveScheduledGoal({ ...sg, state: "missed", missedAt: new Date().toISOString() });
    didActivate.current = false;
    check();
  }

  const isLit = state === "active";
  const fire = sg ? nextFireTime(sg) : null;

  return (
    <div className="w-full relative">
      {/* ═══ LAMP SCENE ═══ */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          borderRadius: 24,
          background: "radial-gradient(ellipse at 55% 35%, #232B38 0%, #151B23 65%)",
          aspectRatio: "4 / 3",
          maxWidth: 560,
          margin: "0 auto",
        }}
      >
        {/* Diagonal subtle panels (reference background) */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "linear-gradient(155deg, transparent 40%, rgba(43,52,64,0.4) 40%, rgba(43,52,64,0.4) 55%, transparent 55%)",
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "linear-gradient(155deg, transparent 55%, rgba(43,52,64,0.25) 55%, rgba(43,52,64,0.25) 70%, transparent 70%)",
        }} />

        {/* ── LIGHT BEAM (when active) ── */}
        {isLit && (
          <div className="absolute inset-0 pointer-events-none z-[1]" style={{
            animation: "beam-strike 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}>
            {/* Main warm beam cone from shade opening area */}
            <div style={{
              position: "absolute",
              top: "30%",
              left: "15%",
              width: "55%",
              height: "75%",
              background: "radial-gradient(ellipse at 60% 0%, rgba(255,251,240,0.35) 0%, rgba(255,200,140,0.12) 40%, transparent 70%)",
              mixBlendMode: "screen",
            }} />
            {/* Floor glow */}
            <div style={{
              position: "absolute",
              bottom: 0,
              left: "5%",
              width: "60%",
              height: "30%",
              background: "radial-gradient(ellipse at 50% 100%, rgba(255,230,180,0.2) 0%, transparent 70%)",
            }} />
          </div>
        )}

        {/* ── LAMP IMAGE ── */}
        <div className="absolute inset-0 flex items-center justify-center z-[2]">
          <div className="relative" style={{ width: "85%", height: "85%" }}>
            <Image
              src="/images/lamp.png"
              alt="LifeOS Lamp"
              fill
              style={{ objectFit: "contain", objectPosition: "center" }}
              priority
              sizes="(max-width: 600px) 90vw, 500px"
            />
          </div>
        </div>

        {/* ── GOAL TEXT (appears IN the beam area when active) ── */}
        {isLit && goal && (
          <div
            className="absolute z-[5]"
            style={{
              left: "6%",
              bottom: "10%",
              maxWidth: "50%",
              animation: "text-emerge 1s 0.6s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
            <p style={{
              fontSize: "clamp(1.2rem, 4.5vw, 2rem)",
              fontWeight: 800,
              color: "#FFFFFF",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              textShadow: "0 2px 24px rgba(255,230,180,0.5), 0 0 8px rgba(255,255,255,0.2)",
            }}>
              {goal.title}
            </p>
            {sg?.duration && (
              <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginTop: 6, fontWeight: 600 }}>
                — {fmtDuration(sg.duration)}
              </p>
            )}
          </div>
        )}

        {/* ── UPCOMING INFO (before activation) ── */}
        {!isLit && sg && fire && (
          <div className="absolute z-[5] top-5 left-5" style={{ opacity: 0.8 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#ADA996", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {state === "snoozed" ? "ERTELANGAN" : "KEYINGI MAQSAD"}
            </p>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#F2F2F2", marginTop: 2 }}>
              {fire.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
            {goal && (
              <p style={{ fontSize: 13, color: "#ADA996", marginTop: 4, maxWidth: 200 }}>{goal.title}</p>
            )}
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!sg && (
          <div className="absolute z-[5] bottom-6 left-6 right-6 text-center">
            <p style={{ fontSize: 13, color: "rgba(173,169,150,0.5)", fontStyle: "italic" }}>
              Maqsad qo&apos;shing va vaqt belgilang — lamp o&apos;sha vaqtda yonadi
            </p>
          </div>
        )}
      </div>

      {/* ═══ ACTION BUTTONS (Stage D — below the scene) ═══ */}
      {isLit && (
        <div className="flex items-center justify-center gap-3 mt-5" style={{ animation: "fade-up 0.5s 1.2s both" }}>
          <button onClick={complete} className="btn-action" style={{ background: "rgba(63,128,101,0.25)", borderColor: "rgba(63,128,101,0.5)" }}>
            <Check size={16} className="inline mr-1.5" /> Bajarildi
          </button>
          <button onClick={snooze} className="btn-action">
            <Clock size={16} className="inline mr-1.5" /> {SNOOZE_MINUTES} daqiqa
          </button>
          <button onClick={dismiss} className="btn-action" style={{ padding: "10px 14px" }}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
