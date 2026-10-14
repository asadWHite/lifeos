/** LIFEOS brand mark — calm orbital motif in a soft squircle. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-[26%]"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(145deg, #2f7a5b 0%, #20553d 100%)",
        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.25), 0 1px 2px rgba(23,36,43,0.15)",
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8.4" stroke="rgba(255,255,255,0.65)" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="3.1" fill="#ffffff" />
        <circle cx="19" cy="7.2" r="1.9" fill="rgba(255,255,255,0.9)" />
      </svg>
    </span>
  );
}

export function Wordmark({ size = 17 }: { size?: number }) {
  return (
    <span
      className="font-bold tracking-tight text-ink"
      style={{ fontSize: size, letterSpacing: "-0.03em" }}
    >
      LIFE<span className="text-accent">OS</span>
    </span>
  );
}
