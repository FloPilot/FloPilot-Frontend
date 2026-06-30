import { cn } from "@/lib/utils";
import type { ArtworkFile } from "@/types";

const STATUS_STYLES: Record<
  ArtworkFile["status"],
  { wrap: string; dot: string; hollow: boolean; label: string }
> = {
  approved: {
    wrap: "bg-[#e8f5ee] text-[#0d5c2e]",
    dot: "bg-current",
    hollow: false,
    label: "Approved",
  },
  revision_requested: {
    wrap: "bg-[#fff1d6] text-[#8a6116]",
    dot: "border-current",
    hollow: true,
    label: "Revision",
  },
  pending: {
    wrap: "bg-[#ffef9d] text-[#4a3800]",
    dot: "border-current",
    hollow: true,
    label: "Pending",
  },
};

export function ArtworkStatusBadge({
  status,
  className,
}: {
  status: ArtworkFile["status"];
  className?: string;
}) {
  const config = STATUS_STYLES[status];

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
      {config.label}
    </span>
  );
}
