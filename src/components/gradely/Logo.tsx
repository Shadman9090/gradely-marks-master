import { Link } from "@tanstack/react-router";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-serif text-base font-bold text-primary-foreground">
        G
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight">GRADELY</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Marks management
          </span>
        </span>
      )}
    </Link>
  );
}
