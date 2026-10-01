import { cn } from "@/lib/utils";
import {
  ARTWORK_STATUS_LABELS,
  ARTWORK_STATUS_SHORT_LABELS,
} from "@/lib/artwork-status";
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
  size = "default",
}: {
  status: ArtworkFile["status"];
  className?: string;
  /** Tighter badge + short label for narrow sidebars / dense lists. */
  size?: "default" | "sm";
}) {
  const config = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  const compact = size === "sm";
  const fullLabel = ARTWORK_STATUS_LABELS[status] ?? status;
  const label = compact
    ? (ARTWORK_STATUS_SHORT_LABELS[status] ?? fullLabel)
    : fullLabel;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-md font-medium leading-none",
        compact
          ? "gap-1 px-1.5 py-0.5 text-[10px]"
          : "gap-1.5 px-2 py-0.5 text-[12px]",
        config.wrap,
        className
      )}
      title={fullLabel}
    >
      <span
        aria-hidden
        className={cn(
          "shrink-0 rounded-full",
          compact ? "size-1" : "size-1.5",
          config.hollow ? "border-2 bg-transparent" : "",
          config.dot
        )}
      />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}
