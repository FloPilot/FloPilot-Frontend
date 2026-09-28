import { cn } from "@/lib/utils";
import { ARTWORK_STATUS_LABELS } from "@/lib/artwork-status";
import type { ArtworkFile } from "@/types";

const STATUS_STYLES: Record<
  ArtworkFile["status"],
  { wrap: string; dot: string; hollow: boolean }
> = {
  approved: {
    wrap: "bg-[#e8f5ee] text-[#0d5c2e]",
    dot: "bg-current",
    hollow: false,
  },
  art_ready: {
    wrap: "bg-[#e8f1ff] text-[#1f4b99]",
    dot: "bg-current",
    hollow: false,
  },
  with_art: {
    wrap: "bg-[#eef2ff] text-[#3b4cca]",
    dot: "border-current",
    hollow: true,
  },
  revision_requested: {
    wrap: "bg-[#fff1d6] text-[#8a6116]",
    dot: "border-current",
    hollow: true,
  },
  pending: {
    wrap: "bg-[#ffef9d] text-[#4a3800]",
    dot: "border-current",
    hollow: true,
  },
};

export function ArtworkStatusBadge({
  status,
  className,
}: {
  status: ArtworkFile["status"];
  className?: string;
}) {
  const config = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  const label = ARTWORK_STATUS_LABELS[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium leading-none",
        config.wrap,
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          config.hollow ? "border-2 bg-transparent" : "",
          config.dot
        )}
      />
      {label}
    </span>
  );
}
