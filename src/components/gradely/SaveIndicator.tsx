import { Check, CloudUpload, Loader2 } from "lucide-react";

export type SaveState = "idle" | "dirty" | "saving" | "saved";

export function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const map = {
    dirty: {
      icon: <CloudUpload className="h-3.5 w-3.5" />,
      label: "Unsaved changes",
      cls: "text-warning",
    },
    saving: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      label: "Saving…",
      cls: "text-muted-foreground",
    },
    saved: { icon: <Check className="h-3.5 w-3.5" />, label: "Saved", cls: "text-success" },
  } as const;
  const it = map[state];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${it.cls}`}>
      {it.icon}
      {it.label}
    </span>
  );
}
