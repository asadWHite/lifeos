"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Loader2, X, type LucideIcon } from "lucide-react";

export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <Loader2
      size={size}
      className={`animate-spin-slow text-current ${className}`}
      aria-label="Loading"
    />
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle ? <p className="caption mt-0.5">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-6" : "py-12"} px-4`}>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sunken text-ink3">
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <p className="mt-3 text-[14px] font-semibold text-ink">{title}</p>
      {body ? <p className="mt-1 max-w-xs caption">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Dot({ tone = "accent", size = 8 }: { tone?: "accent" | "amber" | "red" | "gray" | "info"; size?: number }) {
  const color =
    tone === "accent"
      ? "bg-accent"
      : tone === "amber"
        ? "bg-amber"
        : tone === "red"
          ? "bg-red"
          : tone === "info"
            ? "bg-info"
            : "bg-ink3";
  return <span aria-hidden className={`inline-block rounded-full ${color}`} style={{ width: size, height: size }} />;
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "green" | "amber" | "red" | "gray" | "blue";
  children: ReactNode;
}) {
  const styles =
    tone === "green"
      ? "bg-accent-soft text-accent-ink"
      : tone === "amber"
        ? "bg-amber-soft text-amber"
        : tone === "red"
          ? "bg-red-soft text-red"
          : tone === "blue"
            ? "bg-info-soft text-info"
            : "bg-sunken text-ink2";
  return <span className={`badge ${styles}`}>{children}</span>;
}

export function ProgressBar({
  percent,
  tone = "accent",
  height = 6,
}: {
  percent: number | null;
  tone?: "accent" | "amber" | "red";
  height?: number;
}) {
  const bar =
    tone === "accent" ? "bg-accent" : tone === "amber" ? "bg-amber" : "bg-red";
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-sunken"
      style={{ height }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent ?? 0}
    >
      <div
        className={`h-full rounded-full ${bar} transition-[width] duration-500 ease-out`}
        style={{ width: `${percent ?? 0}%` }}
      />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[28px] w-[48px] shrink-0 rounded-full transition-colors duration-200 ${
        checked ? "bg-accent" : "bg-line-strong"
      } disabled:opacity-50`}
    >
      <span
        className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[23px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const first = panelRef.current?.querySelector<HTMLElement>("input, textarea, select, button:not([aria-label='Close'])");
    first?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/25 animate-fade" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center md:p-6">
        <div
          ref={panelRef}
          className={`animate-pop card w-full rounded-b-none rounded-t-2xl p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-pop md:rounded-2xl md:p-6 md:pb-6 ${
            wide ? "md:max-w-2xl" : "md:max-w-md"
          } max-h-[85dvh] overflow-y-auto`}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="section-title">{title}</h3>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Inline confirm pattern — avoids modal-overload for deletes. */
export function ConfirmInline({
  message = "Delete this?",
  onConfirm,
  onCancel,
  busy = false,
}: {
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 animate-fade">
      <span className="text-[13px] font-medium text-red">{message}</span>
      <button className="btn btn-sm bg-red-soft text-red disabled:opacity-50" onClick={onConfirm} disabled={busy}>
        {busy ? <Spinner size={13} /> : "Delete"}
      </button>
      <button className="btn btn-sm btn-ghost" onClick={onCancel} disabled={busy}>
        Cancel
      </button>
    </div>
  );
}

export function FieldError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-2 text-[13px] font-medium text-red">
      {children}
    </p>
  );
}
