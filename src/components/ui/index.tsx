"use client";

import { type ReactNode } from "react";
import { Loader2, X } from "lucide-react";

/* ─── Spinner ─── */
export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin text-current ${className}`} aria-label="Yuklanmoqda" />;
}

/* ─── Toggle ─── */
export function Toggle({
  on, onToggle, label, disabled = false
}: { on: boolean; onToggle: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onToggle(!on)}
      className={`toggle-track ${on ? "on" : ""}`}
    >
      <span className="toggle-thumb" />
    </button>
  );
}

/* ─── Modal / Sheet ─── */
export function Modal({
  open, onClose, title, children, size = "md"
}: {
  open: boolean; onClose: () => void; title: string; children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  if (!open) return null;
  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      aria-modal="true" role="dialog" aria-label={title}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${widths[size]} bg-[var(--c-surface)] border border-[var(--c-border)] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-fade-up max-h-[92dvh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 sticky top-0 bg-[var(--c-surface)] border-b border-[var(--c-border)] z-10 rounded-t-3xl">
          <h2 className="text-h2">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--c-surface2)] text-[var(--c-ink2)]">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 pb-8 pt-4">{children}</div>
      </div>
    </div>
  );
}

/* ─── Empty state ─── */
export function EmptyState({
  icon: Icon, title, body, action
}: {
  icon: React.ElementType; title: string; body?: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-2xl bg-[var(--c-surface2)] flex items-center justify-center text-[var(--c-ink2)] mb-4">
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <p className="text-h3 mb-1">{title}</p>
      {body && <p className="text-small text-[var(--c-ink2)] max-w-xs">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ─── Progress ring ─── */
export function ProgressRing({ percent, size = 56, stroke = 4, color = "#FF633C", bg = "rgba(0,0,0,0.08)" }: {
  percent: number; size?: number; stroke?: number; color?: string; bg?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, percent)) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="progress-ring" aria-hidden>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
    </svg>
  );
}

/* ─── Field / input wrappers ─── */
export function Field({ label, htmlFor, children, hint }: {
  label: string; htmlFor?: string; children: ReactNode; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      {htmlFor
        ? <label htmlFor={htmlFor} className="text-label text-[var(--c-ink2)] block">{label}</label>
        : <p className="text-label text-[var(--c-ink2)]">{label}</p>}
      {children}
      {hint && <p className="text-small text-[var(--c-ink2)] opacity-70">{hint}</p>}
    </div>
  );
}

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return <p className="text-small text-[#C65B55] mt-1">{children}</p>;
}

/* ─── Chip/pill select ─── */
export function Chip({ selected, onClick, children }: {
  selected?: boolean; onClick?: () => void; children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-small font-semibold border transition-all select-none ${
        selected
          ? "bg-[var(--c-ink)] text-[var(--c-bg)] border-[var(--c-ink)]"
          : "bg-[var(--c-surface)] text-[var(--c-ink2)] border-[var(--c-border)] hover:border-[var(--c-ink2)]"
      }`}
    >
      {children}
    </button>
  );
}
