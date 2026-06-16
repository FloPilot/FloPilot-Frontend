import type { StationJobRunStatus } from "@/types";
import { STATION_RUN_STATUS_LABELS } from "@/lib/station-runs";
import { cn } from "@/lib/utils";

const styles: Record<StationJobRunStatus, string> = {
  upcoming: "bg-slate-100 text-slate-700 border-slate-200",
  running: "bg-emerald-50 text-emerald-800 border-emerald-200",
  paused: "bg-amber-50 text-amber-900 border-amber-200",
  finished: "bg-sky-50 text-sky-800 border-sky-200",
  cancelled: "bg-red-50 text-red-800 border-red-200",
};

export function StationRunStatusBadge({
  status,
  className,
}: {
  status: StationJobRunStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
        styles[status],
        className
      )}
    >
      {STATION_RUN_STATUS_LABELS[status]}
    </span>
  );
}
