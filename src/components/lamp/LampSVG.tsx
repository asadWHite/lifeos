"use client";

/**
 * LifeOS Signature Lamp SVG
 *
 * Reference: Dark industrial desk lamp (Ref Image 2)
 * Anatomy (exact from reference, LEFT-side composition):
 *   - Vertical pole: RIGHT side of scene, going up
 *   - Articulated arm: curves LEFT from pole top
 *   - Dome shade: large, dark charcoal, angled DOWN-LEFT
 *   - Shade opening: faces lower-left, pale reflector inside
 *   - Orange loop: distinctive U/loop on TOP of shade housing
 *   - Beam: projects from shade opening toward lower-left
 *   - Background: deep diagonal polygon panels (navy/charcoal)
 *
 * ViewBox: 0 0 800 600 (wide scene like reference)
 * Lamp occupies right-center, text on left
 */

interface LampSVGProps {
  lit: boolean;
  goalText?: string;
  duration?: number | null;
  className?: string;
}

export function LampSVG({ lit, goalText, duration, className = "" }: LampSVGProps) {
  const beamOpacity = lit ? 1 : 0;

  return (
    <svg
      viewBox="0 0 800 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-full ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Background gradient */}
        <linearGradient id="sceneBg" x1="0" y1="0" x2="800" y2="600" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1A2030" />
          <stop offset="100%" stopColor="#111820" />
        </linearGradient>

        {/* Diagonal background panels (ref: dark angular shapes) */}
        <linearGradient id="panel1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#232E3D" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#1A2430" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="panel2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A3545" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#1A2430" stopOpacity="0.1" />
        </linearGradient>

        {/* Lamp shade gradient: dark charcoal dome */}
        <linearGradient id="shadeFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#2E3848" />
          <stop offset="40%"  stopColor="#1F2A38" />
          <stop offset="100%" stopColor="#141C28" />
        </linearGradient>

        {/* Shade inner highlight (metallic rim) */}
        <linearGradient id="shadeRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3D4D60" stopOpacity="1" />
          <stop offset="100%" stopColor="#1F2A38" stopOpacity="0" />
        </linearGradient>

        {/* Reflector interior — pale silver-white */}
        <radialGradient id="reflectorOff" cx="50%" cy="40%" r="60%">
          <stop offset="0%"  stopColor="#3A4A5E" />
          <stop offset="100%" stopColor="#252F3E" />
        </radialGradient>
        <radialGradient id="reflectorOn" cx="50%" cy="30%" r="70%">
          <stop offset="0%"  stopColor="#FFFFF8" />
          <stop offset="30%" stopColor="#FFF8EC" />
          <stop offset="70%" stopColor="#FFE8C8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFD0A0" stopOpacity="0.3" />
        </radialGradient>

        {/* Main beam: warm white cone from shade */}
        <radialGradient id="beamMain" cx="55%" cy="0%" r="100%">
          <stop offset="0%"  stopColor="#FFFBF0" stopOpacity="0.55" />
          <stop offset="25%" stopColor="#FFE8C0" stopOpacity="0.28" />
          <stop offset="55%" stopColor="#FFC880" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#FF9040" stopOpacity="0" />
        </radialGradient>

        {/* Secondary ambient wash */}
        <radialGradient id="beamAmbient" cx="50%" cy="20%" r="80%">
          <stop offset="0%"  stopColor="#FFE8C0" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#FF9040" stopOpacity="0" />
        </radialGradient>

        {/* Floor glow */}
        <radialGradient id="floorGlow" cx="35%" cy="100%" r="60%">
          <stop offset="0%"  stopColor="#FFE0B0" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#FFB060" stopOpacity="0" />
        </radialGradient>

        {/* Pole gradient */}
        <linearGradient id="poleGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor="#283242" />
          <stop offset="40%" stopColor="#1E2A38" />
          <stop offset="100%" stopColor="#141C28" />
        </linearGradient>

        {/* Bulb glow filter */}
        <filter id="bulbGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="ambientGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="25" />
        </filter>
      </defs>

      {/* ── Scene background ── */}
      <rect width="800" height="600" fill="url(#sceneBg)" />

      {/* ── Diagonal panels (reference aesthetic) ── */}
      <polygon points="0,0 520,0 320,600 0,600" fill="url(#panel1)" />
      <polygon points="520,0 800,0 800,260 620,600 320,600" fill="url(#panel2)" />

      {/* ══════════════════════════════════════════
          LIGHT BEAM  — only visible when lit
          Cone from shade opening (lower-left direction)
      ═══════════════════════════════════════════ */}
      <g opacity={beamOpacity} className={lit ? "anim-beam" : ""} style={{ transition: "opacity 1.2s ease" }}>
        {/* Ambient wash on scene */}
        <ellipse cx="260" cy="380" rx="380" ry="260" fill="url(#beamAmbient)" filter="url(#ambientGlow)" />
        {/* Main beam cone: from shade opening ~(475,285) pointing lower-left */}
        <path
          d="M475 285 L30 620 L420 620 Z"
          fill="url(#beamMain)"
          style={{ mixBlendMode: "screen" }}
        />
        {/* Tighter inner cone */}
        <path
          d="M475 285 L120 620 L340 620 Z"
          fill="rgba(255,251,240,0.14)"
          style={{ mixBlendMode: "screen" }}
        />
        {/* Floor pool */}
        <ellipse cx="220" cy="610" rx="220" ry="40" fill="url(#floorGlow)" />
      </g>

      {/* ══════════════════════════════════════════
          LAMP STRUCTURE
      ═══════════════════════════════════════════ */}

      {/* ── Vertical pole (RIGHT side) ── */}
      {/* Shadow behind pole */}
      <rect x="609" y="180" width="28" height="395" rx="14" fill="rgba(0,0,0,0.45)" />
      {/* Main pole body */}
      <rect x="608" y="178" width="24" height="395" rx="12" fill="url(#poleGrad)" />
      {/* Pole highlight */}
      <rect x="613" y="178" width="4" height="390" rx="2" fill="rgba(255,255,255,0.07)" />
      {/* Base disk */}
      <ellipse cx="620" cy="575" rx="52" ry="10" fill="#0D1520" />
      <ellipse cx="620" cy="572" rx="46" ry="8"  fill="#1A2438" />
      <ellipse cx="620" cy="570" rx="38" ry="6"  fill="#222E40" />

      {/* ── Articulated arm (pole top → shade) ── */}
      {/* Arm shadow */}
      <path d="M620 192 Q620 150 580 140 L505 138" stroke="rgba(0,0,0,0.5)" strokeWidth="18" strokeLinecap="round" fill="none" />
      {/* Arm body */}
      <path d="M620 192 Q620 150 580 140 L505 138" stroke="#1E2A3A" strokeWidth="14" strokeLinecap="round" fill="none" />
      {/* Arm highlight */}
      <path d="M620 190 Q620 152 578 143 L507 141" stroke="rgba(255,255,255,0.06)" strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* ── Shoulder joint ── */}
      <circle cx="505" cy="138" r="14" fill="#141C28" stroke="#2A3848" strokeWidth="2" />
      <circle cx="505" cy="138" r="7"  fill="#1E2A38" />
      <circle cx="505" cy="138" r="3"  fill="#2A3848" />

      {/* ── ORANGE LOOP (distinctive reference feature — on top of shade) ── */}
      {/* Loop shadow */}
      <path d="M468 118 Q482 82 496 118" stroke="rgba(0,0,0,0.6)" strokeWidth="9" fill="none" strokeLinecap="round" />
      {/* Loop body */}
      <path d="M468 118 Q482 80 496 118" stroke="#FF633C" strokeWidth="7" fill="none" strokeLinecap="round" />
      {/* Loop shine */}
      <path d="M470 118 Q483 82 495 118" stroke="rgba(255,180,140,0.4)" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* ══════════════════════════════════════════
          LAMP HEAD / SHADE
          Rotated ~-30deg, opening faces lower-left
          Shade center: ~(500, 260), opening at bottom-left
      ═══════════════════════════════════════════ */}
      <g transform="rotate(-28, 500, 260)">
        {/* Outer dome shadow */}
        <ellipse cx="500" cy="262" rx="122" ry="56" fill="rgba(0,0,0,0.5)" transform="translate(6,8)" />
        {/* Shade outer body */}
        <path
          d="M385 220 C385 175 615 175 615 220 L622 300 C622 330 378 330 378 300 Z"
          fill="url(#shadeFill)"
          stroke="#111820"
          strokeWidth="1.5"
        />
        {/* Shade top curve highlight */}
        <path
          d="M400 220 C400 192 600 192 600 220"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="2"
        />
        {/* Shade side highlight (metallic) */}
        <path
          d="M385 220 C385 175 430 172 450 175 L445 185 C428 184 395 188 395 218 Z"
          fill="rgba(255,255,255,0.05)"
        />
        {/* Shade body shadow line */}
        <path
          d="M610 222 L618 298"
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="2"
        />
        {/* Rim / opening edge */}
        <ellipse cx="500" cy="310" rx="116" ry="22" fill="none" stroke="#2A3848" strokeWidth="2" />
        <ellipse cx="500" cy="310" rx="110" ry="18" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

        {/* ── Reflector interior ── */}
        <ellipse
          cx="500"
          cy="306"
          rx="100"
          ry="17"
          fill={lit ? "url(#reflectorOn)" : "url(#reflectorOff)"}
          style={{ transition: "fill 0.8s ease" }}
        />

        {/* ── Bulb / light source ── */}
        {lit ? (
          <>
            {/* Outer glow bloom */}
            <circle cx="500" cy="300" r="40" fill="#FFE8B0" opacity="0.25" filter="url(#bulbGlow)" className="anim-lamp-on" />
            {/* Mid glow */}
            <circle cx="500" cy="300" r="20" fill="#FFF5E0" opacity="0.6" filter="url(#softGlow)" className="anim-lamp-on" />
            {/* Core bulb */}
            <circle cx="500" cy="298" r="10" fill="#FFFFFF" className="anim-lamp-on" />
          </>
        ) : (
          <circle cx="500" cy="298" r="8" fill="#1E2A38" />
        )}

        {/* Mounting bracket on top */}
        <rect x="488" y="172" width="24" height="30" rx="5" fill="#141C28" />
        <rect x="492" y="170" width="16" height="8" rx="3" fill="#1E2A38" />
      </g>

      {/* ══════════════════════════════════════════
          GOAL TEXT — appears in beam when lit
      ═══════════════════════════════════════════ */}
      {lit && goalText && (
        <foreignObject x="30" y="200" width="360" height="280" className="anim-text">
          <div
            style={{
              color: "#FFFFFF",
              fontFamily: "Inter, -apple-system, sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.3rem, 4vw, 2.1rem)",
              lineHeight: 1.15,
              letterSpacing: "-0.025em",
              textShadow: "0 2px 28px rgba(255,230,180,0.5), 0 0 10px rgba(255,255,255,0.2)",
              padding: "0 8px",
            }}
          >
            {goalText}
            {duration && (
              <div style={{
                marginTop: 10,
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "rgba(255,255,255,0.55)",
                letterSpacing: "0.01em",
              }}>
                — {Math.floor(duration / 60) > 0 ? `${Math.floor(duration / 60)}h ` : ""}{duration % 60 > 0 ? `${duration % 60}m` : ""}
              </div>
            )}
          </div>
        </foreignObject>
      )}

      {/* ══════════════════════════════════════════
          UPCOMING PREVIEW — when lamp is off but event approaching
      ═══════════════════════════════════════════ */}
    </svg>
  );
}
