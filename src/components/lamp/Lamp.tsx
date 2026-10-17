"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Check, Clock, X } from "lucide-react";
import {
  Storage,
  nextFireTime,
  fmtDuration,
  type ScheduledGoalRow,
  type GoalRow,
  type LampReminderState,
} from "@/lib/client/storage";

/*
 * ════════════════════════════════════════════════════════════════════
 *  SIGNATURE LAMP SVG — Exact Reference Match
 *
 *  Reference image anatomy:
 *  - Vertical pole on the RIGHT side, going up
 *  - Curved arm from pole top bending LEFT toward the lamp head
 *  - Domed dark shade tilted down-left, opening faces down-left
 *  - Bright pale reflector interior visible inside the opening
 *  - Distinctive curved orange loop on TOP of the shade
 *  - Articulated joint where arm meets shade
 *  - Light beam projects DOWN-LEFT from the shade opening
 *
 *  Coordinate system: viewBox 0 0 600 700
 *  Pole base at bottom-right, shade at upper-left area
 * ════════════════════════════════════════════════════════════════════
 */
function LampSVG({ lit }: { lit: boolean }) {
  return (
    <svg
      viewBox="0 0 600 700"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-hidden="true"
    >
      <defs>
        {/* Shade material gradient */}
        <linearGradient id="shadeBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2A3040" />
          <stop offset="50%" stopColor="#1E2530" />
          <stop offset="100%" stopColor="#151B23" />
        </linearGradient>

        {/* Reflector interior when lit */}
        <radialGradient id="reflectorLit" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="60%" stopColor="#FFF5E6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFD9A0" stopOpacity="0.4" />
        </radialGradient>

        {/* Beam gradient — warm white fading out */}
        <radialGradient id="beamGrad" cx="30%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#FFFBF0" stopOpacity="0.6" />
          <stop offset="35%" stopColor="#FFE8C8" stopOpacity="0.25" />
          <stop offset="70%" stopColor="#FFCFA0" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#FF9040" stopOpacity="0" />
        </radialGradient>

        {/* Soft glow filter */}
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="wideGlow">
          <feGaussianBlur stdDeviation="20" />
        </filter>
      </defs>

      {/* ── LIGHT BEAM (projects down-left from shade) ── */}
      {lit && (
        <g style={{ transition: "opacity 1.2s ease" }}>
          {/* Wide ambient glow on the "floor" */}
          <ellipse
            cx="140" cy="650" rx="250" ry="60"
            fill="rgba(255,230,180,0.12)"
            filter="url(#wideGlow)"
          />
          {/* Main beam cone: originates from shade opening, fans down-left */}
          <path
            d="M255 295 L20 700 L380 700 Z"
            fill="url(#beamGrad)"
            style={{ mixBlendMode: "screen" }}
          />
          {/* Concentrated inner beam */}
          <path
            d="M255 295 L100 700 L300 700 Z"
            fill="rgba(255,251,240,0.12)"
            style={{ mixBlendMode: "screen" }}
          />
        </g>
      )}

      {/* ── VERTICAL POLE (right side) ── */}
      {/* Shadow layer */}
      <line x1="470" y1="690" x2="470" y2="220" stroke="#0D1117" strokeWidth="22" strokeLinecap="round" />
      {/* Main pole */}
      <line x1="470" y1="690" x2="470" y2="220" stroke="#1E2530" strokeWidth="16" strokeLinecap="round" />
      {/* Subtle highlight on pole */}
      <line x1="475" y1="690" x2="475" y2="220" stroke="#2A3545" strokeWidth="2" strokeLinecap="round" />

      {/* Base plate */}
      <ellipse cx="470" cy="690" rx="50" ry="10" fill="#1E2530" />
      <ellipse cx="470" cy="688" rx="45" ry="8" fill="#232B38" />

      {/* ── CURVED ARM (pole top → shade) ── */}
      <path
        d="M470 220 Q470 170 420 160 L320 150"
        stroke="#0D1117" strokeWidth="18" strokeLinecap="round" fill="none"
      />
      <path
        d="M470 220 Q470 170 420 160 L320 150"
        stroke="#1E2530" strokeWidth="12" strokeLinecap="round" fill="none"
      />
      {/* Arm highlight */}
      <path
        d="M468 220 Q468 172 418 162 L322 152"
        stroke="#2A3545" strokeWidth="1.5" strokeLinecap="round" fill="none"
      />

      {/* ── ARTICULATED JOINT ── */}
      <circle cx="320" cy="150" r="12" fill="#151B23" stroke="#2A3545" strokeWidth="2" />
      <circle cx="320" cy="150" r="5" fill="#1E2530" />

      {/* ── ORANGE LOOP (distinctive reference feature — on top) ── */}
      <path
        d="M275 115 Q290 80 305 115"
        stroke="#FF633C" strokeWidth="7" fill="none" strokeLinecap="round"
      />

      {/* ── LAMP HEAD / SHADE ── */}
      {/* The shade is tilted down-left. We rotate the shade group. */}
      <g transform="rotate(-30, 280, 200)">
        {/* Outer dome */}
        <path
          d="M210 155 C210 115 350 115 350 155 L365 240 C365 265 195 265 195 240 Z"
          fill="url(#shadeBody)"
          stroke="#151B23" strokeWidth="1.5"
        />
        {/* Shade rim — subtle metallic edge */}
        <ellipse cx="280" cy="250" rx="85" ry="16" fill="none" stroke="#3A4555" strokeWidth="1.5" />

        {/* Inner reflector (bright when lit, dark when off) */}
        <ellipse
          cx="280" cy="248" rx="75" ry="13"
          fill={lit ? "url(#reflectorLit)" : "#1A2030"}
          style={{ transition: "fill 0.8s ease" }}
        />

        {/* Glowing bulb when lit */}
        {lit && (
          <>
            <circle cx="280" cy="240" r="18" fill="#FFFBF0" opacity="0.9" filter="url(#softGlow)" />
            <circle cx="280" cy="240" r="8" fill="#FFFFFF" />
          </>
        )}

        {/* Mounting hardware on top of shade */}
        <rect x="272" y="132" width="16" height="25" rx="4" fill="#1A2030" />
      </g>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STATE MACHINE + SCHEDULER
   ═══════════════════════════════════════════════════════════════════ */

const SNOOZE_MINUTES = 10;

export function LampComponent({ profileId }: { profileId: string }) {
  const [sg, setSg] = useState<ScheduledGoalRow | null>(null);
  const [goal, setGoal] = useState<GoalRow | null>(null);
  const [state, setState] = useState<LampReminderState>("idle");
  const didActivate = useRef(false);

  const check = useCallback(() => {
    const all = Storage.getScheduledGoals()
      .filter(s => s.profileId === profileId && s.state !== "completed" && s.state !== "missed")
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    const current = all[0] ?? null;
    setSg(current);

    if (!current) { setGoal(null); setState("idle"); didActivate.current = false; return; }

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
    const t = setInterval(check, 30000);
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
      {/* ── Lamp Visual ── */}
      <div className="relative w-full" style={{ maxWidth: 440, margin: "0 auto" }}>
        <div style={{ aspectRatio: "600 / 700" }}>
          <LampSVG lit={isLit} />
        </div>

        {/* ── Goal Text (Stage C: revealed BY the light beam, down-left) ── */}
        {isLit && goal && (
          <div
            className="absolute z-20"
            style={{
              left: "5%",
              bottom: "12%",
              maxWidth: "55%",
              animation: "text-emerge 1.2s 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          >
            <p
              style={{
                fontSize: "clamp(1.3rem, 4vw, 2.2rem)",
                fontWeight: 800,
                color: "#FFFFFF",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                textShadow: "0 2px 30px rgba(255,230,180,0.4), 0 0 10px rgba(255,255,255,0.15)",
              }}
            >
              {goal.title}
            </p>
            {sg?.duration && (
              <p style={{ fontSize: "0.9rem", color: "#ADA996", marginTop: 8, fontWeight: 600 }}>
                — {fmtDuration(sg.duration)}
              </p>
            )}
          </div>
        )}

        {/* ── Upcoming indicator (before activation) ── */}
        {!isLit && sg && fire && (
          <div className="absolute top-6 left-6 z-10" style={{ opacity: 0.7 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#ADA996", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {state === "snoozed" ? "ERTELANGAN" : "KEYINGI"}
            </p>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#F2F2F2", marginTop: 2 }}>
              {fire.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
            {goal && (
              <p style={{ fontSize: 13, color: "#ADA996", marginTop: 2 }}>{goal.title}</p>
            )}
          </div>
        )}

        {/* ── No scheduled goal ── */}
        {!sg && (
          <div className="absolute top-6 left-6 z-10" style={{ opacity: 0.5 }}>
            <p style={{ fontSize: 13, color: "#ADA996", fontStyle: "italic" }}>
              Maqsad belgilang — lamp yoqiladi
            </p>
          </div>
        )}
      </div>

      {/* ── Action Buttons (Stage D) ── */}
      {isLit && (
        <div className="flex items-center justify-center gap-3 mt-6" style={{ animation: "fade-up 0.5s 1s both" }}>
          <button onClick={complete} className="btn-action" style={{ background: "rgba(63,128,101,0.2)", borderColor: "rgba(63,128,101,0.4)" }}>
            <Check size={16} className="inline mr-1.5" /> Bajarildi
          </button>
          <button onClick={snooze} className="btn-action">
            <Clock size={16} className="inline mr-1.5" /> {SNOOZE_MINUTES}m
          </button>
          <button onClick={dismiss} className="btn-action" style={{ padding: "10px 14px" }}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
