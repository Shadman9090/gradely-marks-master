export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="soft-in flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <span className="pulse-soft flex h-10 w-10 items-center justify-center rounded-md bg-primary font-serif text-lg font-bold text-primary-foreground">
        G
      </span>
      <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className="h-0.5 w-24 overflow-hidden rounded-full bg-muted">
        <span className="pulse-soft block h-full w-full bg-primary/70" />
      </span>
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <PageLoader />
    </div>
  );
}
