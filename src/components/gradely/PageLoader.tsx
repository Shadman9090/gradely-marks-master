import fullLogo from "@/assets/gradely-full.png.asset.json";

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="soft-in relative flex min-h-[40vh] flex-col items-center justify-center gap-3 overflow-hidden rounded-lg">
      <BackdropMarks />
      <img
        src={fullLogo.url}
        alt="Gradely"
        className="pulse-soft h-auto w-[min(72vw,320px)] max-w-full object-contain"
      />
      <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className="h-0.5 w-24 overflow-hidden rounded-full bg-muted">
        <span className="pulse-soft block h-full w-full bg-primary/70" />
      </span>
    </div>
  );
}

function BackdropMarks() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full text-primary/10"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 600 400"
      fill="none"
    >
      <path d="M0 300 L150 240 L300 280 L450 200 L600 250" stroke="currentColor" strokeWidth="1" />
      <path d="M0 120 L180 160 L360 90 L600 140" stroke="currentColor" strokeWidth="1" />
      <circle cx="150" cy="240" r="3" fill="currentColor" />
      <circle cx="300" cy="280" r="3" fill="currentColor" />
      <circle cx="450" cy="200" r="3" fill="currentColor" />
      <circle cx="360" cy="90" r="3" fill="currentColor" />
      <rect x="60" y="60" width="70" height="90" rx="6" stroke="currentColor" strokeWidth="1" />
      <rect x="470" y="270" width="70" height="90" rx="6" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function FullPageLoader() {
  return (
    <div className="brand-canvas brand-grid flex min-h-screen items-center justify-center">
      <PageLoader />
    </div>
  );
}
