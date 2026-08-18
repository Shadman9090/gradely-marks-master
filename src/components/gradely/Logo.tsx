import { Link } from "@tanstack/react-router";
import iconAsset from "@/assets/gradely-icon.png.asset.json";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5">
      <img
        src={iconAsset.url}
        alt="Gradely"
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 object-contain"
      />
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
