import { cn } from "@/lib/utils";
import type { ArtworkFile } from "@/types";

export function ArtworkStatusBadge({
  status,
  className,
}: {
  status: ArtworkFile["status"];
  className?: string;
}) {
  const styles =
    status === "approved"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : status === "revision_requested"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : "bg-slate-100 text-slate-700 border-border";

  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
        styles,
        className
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
