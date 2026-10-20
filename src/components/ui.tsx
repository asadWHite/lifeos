"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import {
  CalendarCheck2,
  CheckCircle2,
  CheckIcon,
  ChevronDown,
  Flag,
  Flame,
  Loader2,
  Medal,
  Moon,
  Repeat,
  Sprout,
  Sun,
  Sunrise,
  Target,
  Trophy,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------------- Spinner ---------------- */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />;
}

/* ---------------- Button ---------------- */
type ButtonVariant = "primary" | "glass" | "ghost" | "danger" | "subtle";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 select-none " +
  "disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] whitespace-nowrap";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-deep shadow-[0_10px_24px_-10px_rgba(255,99,60,0.7)]",
  glass: "glass text-ink hover:border-[var(--c-line-strong)]",
  ghost: "text-sub hover:text-ink hover:bg-[var(--c-line)]",
  danger: "bg-error/15 text-bad border border-error/40 hover:bg-error/25",
  subtle: "bg-[var(--c-line)] text-ink hover:bg-[var(--c-line-strong)]",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 rounded-full text-[13px]",
  md: "h-11 px-5 rounded-full text-sm",
  lg: "h-12 px-7 rounded-full text-[15px]",
  icon: "size-10 rounded-full",
};

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

/* ---------------- Forms ---------------- */
interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
  optional?: boolean;
}

export function Field({ label, htmlFor, error, hint, children, optional }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-sub">
        {label}
        {optional && <span className="ml-1.5 text-faint">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[13px] text-bad">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full rounded-xl border border-[var(--c-line)] bg-[var(--c-raised)] px-3.5 text-[15px] text-ink " +
  "placeholder:text-faint transition-colors hover:border-[var(--c-line-strong)] " +
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-50";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, "h-11", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, "min-h-24 py-2.5", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(inputBase, "h-11 appearance-none pr-10", className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
    </div>
  );
}

/* ---------------- Toggle (real switch) ---------------- */
interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  description?: string;
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl px-1 py-2 text-left disabled:opacity-50"
    >
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-faint">{description}</span>}
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-accent" : "bg-[var(--c-line-strong)]",
        )}
        aria-hidden
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200",
            checked && "translate-x-5",
          )}
        />
      </span>
    </button>
  );
}

/* ---------------- Segmented control ---------------- */
interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
}

export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel, size = "md" }: SegmentedProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="glass inline-flex rounded-full p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full font-medium transition-all duration-150",
            size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-4 py-2 text-sm",
            value === o.value ? "bg-accent text-white shadow" : "text-sub hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Badge ---------------- */
export function Badge({ tone = "neutral", children, className }: { tone?: "neutral" | "accent" | "ok" | "warn" | "bad"; children: ReactNode; className?: string }) {
  const tones = {
    neutral: "bg-[var(--c-line)] text-sub",
    accent: "bg-accent/15 text-accent",
    ok: "bg-success/20 text-ok",
    warn: "bg-warning/20 text-warn",
    bad: "bg-error/20 text-bad",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

/* ---------------- Progress bar ---------------- */
export function ProgressBar({ value, tone = "accent", className, label }: { value: number; tone?: "accent" | "ok" | "warn"; className?: string; label?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const tones = { accent: "bg-accent", ok: "bg-success", warn: "bg-warning" } as const;
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[var(--c-line)]", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out", tones[tone])} style={{ width: `${clamped}%` }} />
    </div>
  );
}

/* ---------------- Empty state ---------------- */
export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="animate-in flex flex-col items-center rounded-3xl border border-dashed border-[var(--c-line-strong)] px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-[var(--c-line)] text-sub">
        <Icon className="size-6" aria-hidden />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-sub">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------------- Modal ---------------- */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Focus the dialog for keyboard + screen readers.
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="animate-in absolute inset-0 bg-black/55 backdrop-blur-sm" aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn("glass-strong animate-pop relative w-full rounded-3xl p-6 outline-none sm:p-7", wide ? "max-w-2xl" : "max-w-lg")}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-display text-xl font-semibold">
            {title}
          </h2>
          <button onClick={onClose} aria-label="Close dialog" className="grid size-9 shrink-0 place-items-center rounded-full text-sub transition-colors hover:bg-[var(--c-line)] hover:text-ink">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------- Confirm dialog ---------------- */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Delete",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-sub">{body}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ---------------- Toasts ---------------- */
interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: "ok" | "bad" | "info" | "celebrate";
}

const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), t.tone === "celebrate" ? 6000 : 4000);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((t) => (
          <div key={t.id} className="glass-strong animate-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl p-4">
            <span
              className={cn(
                "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
                t.tone === "ok" && "bg-success/20 text-ok",
                t.tone === "bad" && "bg-error/20 text-bad",
                t.tone === "info" && "bg-[var(--c-line)] text-sub",
                t.tone === "celebrate" && "bg-accent/15 text-accent",
              )}
            >
              {t.tone === "celebrate" ? <Trophy className="size-4" aria-hidden /> : t.tone === "bad" ? <X className="size-4" aria-hidden /> : <CheckIcon className="size-4" aria-hidden />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{t.title}</span>
              {t.body && <span className="mt-0.5 block text-[13px] text-sub">{t.body}</span>}
            </span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- Achievement icon resolver ---------------- */
const ACH_ICONS: Record<string, LucideIcon> = {
  "check-circle-2": CheckCircle2,
  zap: Zap,
  trophy: Trophy,
  flame: Flame,
  "calendar-check": CalendarCheck2,
  sprout: Sprout,
  repeat: Repeat,
  moon: Moon,
  sunrise: Sunrise,
  target: Target,
  flag: Flag,
  medal: Medal,
  sun: Sun,
};

export function AchievementIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ACH_ICONS[name] ?? Trophy;
  return <Icon className={className} aria-hidden />;
}
