import { getRunForBlock } from "@/lib/station-runs";
import type { Order, ScheduleBlock, StationJobRun } from "@/types";

export type ScheduleBlockProductionStatus =
  | "scheduled"
  | "in_progress"
  | "completed";

export const CALENDAR_EVENT_STATUS_OPTIONS: {
  value: ScheduleBlockProductionStatus;
  label: string;
  hint: string;
}[] = [
  {
    value: "scheduled",
    label: "Scheduled",
    hint: "On the calendar — not started yet",
  },
  {
    value: "in_progress",
    label: "In progress",
    hint: "Production has started on the floor",
  },
  {
    value: "completed",
    label: "Completed",
    hint: "This event is finished",
  },
];

export function formatScheduleBlockOrderLine(block: ScheduleBlock): string {
  const custom = block.customLabel?.trim();
  if (custom) return `${block.orderNumber} — ${custom}`;
  return block.orderNumber;
}

export function resolveScheduleBlockProductionStatus(
  block: ScheduleBlock,
  jobRuns: StationJobRun[],
  orders: Order[]
): ScheduleBlockProductionStatus {
  const run = getRunForBlock(jobRuns, block.id);
  if (run?.status === "finished") return "completed";
  if (run?.status === "running" || run?.status === "paused") {
    return "in_progress";
  }

  const order = orders.find((entry) => entry.id === block.orderId);
  const job = order?.jobs.find((entry) => entry.id === block.jobId);
  const imprint = job?.imprints.find((entry) => entry.id === block.imprintId);

  if (imprint?.workflow?.status === "completed") return "completed";
  if (imprint?.workflow?.status === "in_progress") return "in_progress";
  return "scheduled";
}

export const COMPLETED_EVENT_CLASSES = [
  "bg-emerald-50/90",
  "border-emerald-300",
  "text-emerald-950",
] as const;

/** Shared inner padding for timeline / grid schedule chips */
export const SCHEDULE_CHIP_BOX_PADDING = "pl-2 pr-1.5 pt-2 pb-1";

export const PRODUCTION_STATUS_FLAG: Record<
  ScheduleBlockProductionStatus,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Scheduled",
    className:
      "bg-white/75 text-[#2c6ecb] ring-1 ring-[#2c6ecb]/15",
  },
  in_progress: {
    label: "In progress",
    className:
      "bg-[#fff5ea] text-[#b98900] ring-1 ring-[#f0d9a8]/80",
  },
  completed: {
    label: "Completed",
    className:
      "bg-emerald-200/90 text-emerald-950 ring-1 ring-emerald-400/50",
  },
};
