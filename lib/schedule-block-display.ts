import { getRunForBlock } from "@/lib/station-runs";
import type { Order, ScheduleBlock, StationJobRun } from "@/types";

export type ScheduleBlockProductionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "blocked";

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
  {
    value: "blocked",
    label: "Blocked",
    hint: "Issue or hold — needs attention before continuing",
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
  if (run?.status === "cancelled") return "blocked";

  const order = orders.find((entry) => entry.id === block.orderId);
  const job = order?.jobs.find((entry) => entry.id === block.jobId);
  const imprint = job?.imprints.find((entry) => entry.id === block.imprintId);
  const workflow = imprint?.workflow;

  if (workflow?.status === "completed") return "completed";
  if (workflow?.status === "blocked" || workflow?.onHold) return "blocked";
  if (workflow?.status === "in_progress") return "in_progress";
  return "scheduled";
}

export const COMPLETED_EVENT_CLASSES = [
  "bg-emerald-50/90",
  "border-emerald-300",
  "text-emerald-950",
] as const;

export const STATUS_EVENT_CLASSES: Record<
  ScheduleBlockProductionStatus,
  readonly string[]
> = {
  scheduled: ["bg-blue-50/90", "border-blue-300", "text-blue-950"],
  in_progress: ["bg-amber-50/90", "border-amber-300", "text-amber-950"],
  completed: COMPLETED_EVENT_CLASSES,
  blocked: ["bg-red-50/90", "border-red-300", "text-red-950"],
};

/** Shared inner padding for timeline / grid schedule chips */
export const SCHEDULE_CHIP_BOX_PADDING = "pl-2 pr-1.5 pt-2 pb-1";

export const PRODUCTION_STATUS_FLAG: Record<
  ScheduleBlockProductionStatus,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Scheduled",
    className: "bg-white/80 text-[#2c6ecb] ring-1 ring-[#2c6ecb]/20",
  },
  in_progress: {
    label: "In progress",
    className: "bg-white/80 text-[#b98900] ring-1 ring-[#f0d9a8]/80",
  },
  completed: {
    label: "Completed",
    className: "bg-white/80 text-emerald-800 ring-1 ring-emerald-300/60",
  },
  blocked: {
    label: "Blocked",
    className: "bg-white/80 text-red-800 ring-1 ring-red-300/60",
  },
};

export const CALENDAR_STATUS_LEGEND: {
  status: ScheduleBlockProductionStatus;
  label: string;
  swatchClass: string;
}[] = [
  {
    status: "scheduled",
    label: "Scheduled",
    swatchClass: "bg-blue-100 border-blue-300",
  },
  {
    status: "in_progress",
    label: "In progress",
    swatchClass: "bg-amber-100 border-amber-300",
  },
  {
    status: "completed",
    label: "Completed",
    swatchClass: "bg-emerald-100 border-emerald-300",
  },
  {
    status: "blocked",
    label: "Blocked",
    swatchClass: "bg-red-100 border-red-300",
  },
];
