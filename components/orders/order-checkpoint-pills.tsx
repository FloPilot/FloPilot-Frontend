import type {
  CheckpointRollupStatus,
  OrderCheckpoint,
} from "@/lib/order-list-summary";
import {
  COMPLETED_LABEL,
  PARTIALLY_SCHEDULED_LABEL,
  READY_FOR_SCHEDULING_LABEL,
  SCHEDULED_LABEL,
} from "@/lib/terminology";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "warning" | "attention" | "success" | "critical";

const TONE_STYLES: Record<
  BadgeTone,
  { wrap: string; dot: string; hollow?: boolean }
> = {
  neutral: {
    wrap: "bg-[#f1f1f1] text-[#616161]",
    dot: "bg-current",
  },
  warning: {
    wrap: "bg-[#ffef9d] text-[#4a3800]",
    dot: "border-current",
    hollow: true,
  },
  attention: {
    wrap: "bg-[#fff1d6] text-[#8a6116]",
    dot: "border-current",
    hollow: true,
  },
  success: {
    wrap: "bg-[#e8f5ee] text-[#0d5c2e]",
    dot: "bg-current",
  },
  critical: {
    wrap: "bg-[#fde2e2] text-[#8f1f1f]",
    dot: "border-current",
    hollow: true,
  },
};

function toneForStatus(status: CheckpointRollupStatus): BadgeTone {
  switch (status) {
    case "done":
      return "success";
    case "in_progress":
      return "attention";
    case "pending":
      return "warning";
    case "blocked":
      return "critical";
    default:
      return "neutral";
  }
}

function labelForCheckpoint(checkpoint: OrderCheckpoint): string {
  const { key, status } = checkpoint;

  if (status === "blocked") return "Blocked";

  if (key === "artwork") {
    if (status === "done") return "Approved";
    if (status === "in_progress" && checkpoint.detail.includes("/")) {
      return `${checkpoint.detail} proofs`;
    }
    if (checkpoint.detail.includes("/")) {
      return `${checkpoint.detail} proofs`;
    }
    if (status === "in_progress") return "Partial";
    return "Not approved";
  }

  if (key === "ink") {
    if (status === "done") return "Ready";
    if (status === "in_progress") return "Partial";
    return "Not Ready";
  }

  if (key === "screens") {
    if (status === "done") return "Ready";
    if (status === "in_progress") return "Partial";
    return "Pending";
  }

  if (key === "screen_files") {
    if (status === "done") return "Uploaded";
    return "Not uploaded";
  }

  if (key === "blanks") {
    if (status === "done") return "Received";
    if (status === "in_progress") return "Partial";
    if (checkpoint.detail.toLowerCase().includes("missing")) return "Missing";
    return "Waiting";
  }

  if (key === "dtf_transfers") {
    if (status === "done") return "Received";
    if (status === "in_progress") return "Partial";
    return "Waiting";
  }

  if (key === "blank_source") {
    if (status === "done") return checkpoint.detail || "Set";
    return "Not set";
  }

  if (key === "materials") {
    if (status === "done") return "Received";
    if (status === "in_progress") return "Partial";
    return "Waiting";
  }

  if (key === "prep") {
    if (status === "done") return "Ready";
    if (status === "in_progress") return "In progress";
    return "Not ready";
  }

  if (key === "scheduled") {
    if (status === "done") return SCHEDULED_LABEL;
    if (status === "in_progress") return PARTIALLY_SCHEDULED_LABEL;
    return READY_FOR_SCHEDULING_LABEL;
  }

  if (key === "floor") {
    if (status === "done") return COMPLETED_LABEL;
    if (status === "in_progress") return "Running";
    return "Not started";
  }

  return status === "done" ? "Done" : "Pending";
}

export function CheckpointStatusBadge({
  checkpoint,
  className,
  compact = false,
}: {
  checkpoint?: OrderCheckpoint;
  className?: string;
  compact?: boolean;
}) {
  if (!checkpoint || checkpoint.status === "not_applicable") {
    return (
      <span
        className={cn(
          "inline-flex text-[#c9c9c9]",
          compact ? "text-[11px]" : "text-[13px] text-[#8a8a8a]",
          className
        )}
      >
        —
      </span>
    );
  }

  const tone = toneForStatus(checkpoint.status);
  const style = TONE_STYLES[tone];
  const label = labelForCheckpoint(checkpoint);

  return (
    <span
      title={`${checkpoint.label}: ${checkpoint.title}`}
      className={cn(
        "inline-flex max-w-full items-center rounded-md font-medium leading-none",
        compact
          ? "gap-1 px-1.5 py-0.5 text-[11px] whitespace-nowrap"
          : "gap-1.5 rounded-lg px-2 py-0.5 text-[12px]",
        style.wrap,
        className
      )}
    >
      <span
        className={cn(
          "shrink-0 rounded-full",
          compact ? "size-1.5" : "size-2",
          style.hollow ? "border-2 bg-transparent" : compact ? "size-1.5" : "size-1.5",
          style.dot
        )}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function findCheckpoint(
  checkpoints: OrderCheckpoint[],
  key: OrderCheckpoint["key"]
): OrderCheckpoint | undefined {
  return checkpoints.find((checkpoint) => checkpoint.key === key);
}
