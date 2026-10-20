import { cn } from "@/components/ui";

/* Lightweight, fully responsive bar visualisation (no heavy charting dep).
 * Always paired with an accessible text summary so the data is available
 * without reading the visual chart. Empty series render an honest state. */

export interface BarDatum {
  label: string;
  sublabel?: string;
  value: number;
  secondary?: number; // e.g. totals behind the primary value
  tone?: "accent" | "ok" | "warn" | "bad" | "muted";
}

export function BarsChart({
  data,
  max,
  unit,
  ariaLabel,
  emptyLabel = "No data for this period yet.",
}: {
  data: BarDatum[];
  max?: number;
  unit?: string;
  ariaLabel: string;
  emptyLabel?: string;
}) {
  const peak = max ?? Math.max(1, ...data.map((d) => Math.max(d.value, d.secondary ?? 0)));
  const hasAny = data.some((d) => d.value > 0 || (d.secondary ?? 0) > 0);

  if (!hasAny) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--c-line-strong)] px-4 py-8 text-center text-[13px] text-faint">
        {emptyLabel}
      </p>
    );
  }

  const tones: Record<NonNullable<BarDatum["tone"]>, string> = {
    accent: "bg-accent",
    ok: "bg-success",
    warn: "bg-warning",
    bad: "bg-error",
    muted: "bg-[var(--c-line-strong)]",
  };

  return (
    <div>
      <div role="img" aria-label={ariaLabel} className="flex h-36 items-end gap-2 sm:gap-3">
        {data.map((d, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="relative flex h-28 w-full items-end justify-center">
              {d.secondary != null && d.secondary > 0 && (
                <span
                  aria-hidden
                  className="absolute bottom-0 w-full max-w-10 rounded-t-md bg-[var(--c-line)]"
                  style={{ height: `${(d.secondary / peak) * 100}%` }}
                />
              )}
              <span
                aria-hidden
                className={cn("relative w-full max-w-10 rounded-t-md transition-[height] duration-500 ease-out", tones[d.tone ?? "accent"])}
                style={{ height: `${Math.max(d.value > 0 ? 3 : 0, (d.value / peak) * 100)}%` }}
                title={`${d.label}: ${d.value}${unit ?? ""}`}
              />
            </div>
            <div className="text-center">
              <span className="block text-[11px] font-semibold text-sub">{d.label}</span>
              {d.sublabel && <span className="block text-[10px] tabular-nums text-faint">{d.sublabel}</span>}
            </div>
          </div>
        ))}
      </div>
      {/* Accessible chart summary */}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <th scope="row">{d.label}</th>
              <td>{d.value}{unit ?? ""}{d.secondary != null ? ` of ${d.secondary}${unit ?? ""}` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
