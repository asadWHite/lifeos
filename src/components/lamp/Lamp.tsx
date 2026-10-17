"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Check, Clock, X, AlarmClock } from "lucide-react";
import { LampSVG } from "./LampSVG";
import {
  Storage,
  nextFireTime,
  fmtDuration,
  type ScheduledGoalRow,
  type GoalRow,
  type LampReminderState,
} from "@/lib/client/storage";

const SNOOZE_MIN = 10;

/* ─── Status indicator dot ─── */
function StatusDot({ state }: { state: LampReminderState }) {
  const colors: Record<LampReminderState, string> = {
    idle: "rgba(173,169,150,0.4)",
    upcoming: "#C8943E",
    active: "#FF633C",
    snoozed: "#C8943E",
    completed: "#3F8065",
    missed: "#C65B55",
  };
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: colors[state],
      boxShadow: state === "active" ? `0 0 10px ${colors.active}` : "none",
    }} />
  );
}

export function LampComponent({ profileId }: { profileId: string }) {
  const [sg, setSg] = useState<ScheduledGoalRow | null>(null);
  const [goal, setGoal] = useState<GoalRow | null>(null);
  const [state, setState] = useState<LampReminderState>("idle");
  const didActivate = useRef(false);
  const [, forceUpdate] = useState(0);

  const check = useCallback(() => {
    const all = Storage.getScheduledGoals()
      .filter(s => s.profileId === profileId && s.state !== "completed" && s.state !== "missed")
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    const current = all[0] ?? null;
    setSg(current);

    if (!current) {
      setGoal(null); setState("idle"); didActivate.current = false; return;
    }

    const g = Storage.getGoals().find(x => x.id === current.goalId) ?? null;
    setGoal(g);

    const fire = nextFireTime(current);
    if (!fire) { setState("missed"); return; }

    const diffMin = (fire.getTime() - Date.now()) / 60000;

    if (diffMin <= 0) {
      if (!didActivate.current && current.state !== "active") {
        Storage.saveScheduledGoal({ ...current, state: "active" });
        didActivate.current = true;
      }
      setState("active");
    } else if (diffMin <= 15) {
      setState("upcoming"); didActivate.current = false;
    } else {
      setState("idle"); didActivate.current = false;
    }
  }, [profileId]);

  useEffect(() => {
    check();
    const t = setInterval(() => { forceUpdate(n => n + 1); check(); }, 15000);
    const vis = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [check]);

  function complete() {
    if (!sg) return;
    Storage.saveScheduledGoal({ ...sg, state: "completed", completedAt: new Date().toISOString() });
    // Check achievements
    Storage.checkAndUnlockAchievements(profileId);
    didActivate.current = false; check();
  }
  function snooze() {
    if (!sg) return;
    Storage.saveScheduledGoal({ ...sg, state: "snoozed", snoozeUntil: new Date(Date.now() + SNOOZE_MIN * 60000).toISOString() });
    didActivate.current = false; check();
  }
  function dismiss() {
    if (!sg) return;
    Storage.saveScheduledGoal({ ...sg, state: "missed", missedAt: new Date().toISOString() });
    didActivate.current = false; check();
  }

  const isLit = state === "active";
  const fire = sg ? nextFireTime(sg) : null;

  return (
    <div style={{ width: "100%" }}>
      {/* ── Lamp SVG scene ── */}
      <div
        className="lamp-scene"
        style={{ borderRadius: 24, width: "100%", position: "relative", overflow: "hidden" }}
      >
        <LampSVG
          lit={isLit}
          goalText={isLit ? (goal?.title ?? undefined) : undefined}
          duration={isLit ? (sg?.duration ?? null) : null}
        />

        {/* Upcoming info overlay (before activation) */}
        {!isLit && sg && fire && (
          <div
            className="anim-fade-in"
            style={{
              position: "absolute", top: 20, left: 24, zIndex: 10,
              pointerEvents: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <StatusDot state={state} />
              <span className="t-label" style={{ color: "rgba(173,169,150,0.6)" }}>
                {state === "snoozed" ? "ERTELANGAN" : state === "upcoming" ? "YAQINLASHMOQDA" : "KEYINGI"}
              </span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#F2F2F2", lineHeight: 1 }}>
              {fire.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            {goal && (
              <div style={{ marginTop: 6, fontSize: "0.85rem", color: "#ADA996", maxWidth: 220 }}>
                {goal.title}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!sg && (
          <div style={{
            position: "absolute", bottom: 24, left: 0, right: 0,
            textAlign: "center", pointerEvents: "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <AlarmClock size={14} style={{ color: "rgba(173,169,150,0.4)" }} />
              <span style={{ fontSize: "0.75rem", color: "rgba(173,169,150,0.45)", fontStyle: "italic" }}>
                Maqsad qo&apos;shing va vaqt belgilang — lamp yonadi
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Action buttons (Stage D) ── */}
      {isLit && (
        <div
          className="anim-fade-up anim-d1000"
          style={{
            display: "flex", gap: 10, justifyContent: "center",
            marginTop: 16, flexWrap: "wrap",
          }}
        >
          <button
            onClick={complete}
            className="btn btn-success btn-sm"
            style={{ minWidth: 110 }}
          >
            <Check size={15} /> Bajarildi
          </button>
          <button
            onClick={snooze}
            className="btn btn-ghost btn-sm"
            style={{ minWidth: 110 }}
          >
            <Clock size={15} /> {SNOOZE_MIN} daqiqa
          </button>
          <button
            onClick={dismiss}
            className="btn btn-ghost btn-sm btn-icon"
            aria-label="Yopish"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
