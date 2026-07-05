import { cn } from "@/lib/utils";
import type { ScanStatus } from "@/hooks/use-document-polling";

const map: Record<string, { label: string; cls: string }> = {
  queued: { label: "Queued", cls: "bg-slate-100 text-slate-700" },
  processing: { label: "Processing", cls: "bg-blue-100 text-blue-700 animate-pulse" },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-700" },
  failed: { label: "Failed", cls: "bg-red-100 text-red-700" },
  none: { label: "Not started", cls: "bg-slate-100 text-slate-500" },
};

export function StatusBadge({ status }: { status: ScanStatus | string | null | undefined }) {
  const key = (status ?? "none") as keyof typeof map;
  const info = map[key] ?? map.none;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        info.cls,
      )}
    >
      {info.label}
    </span>
  );
}
