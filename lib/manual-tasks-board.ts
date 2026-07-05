import type { ManualTask, ManualTaskPriority, ManualTaskStatus } from "@/lib/api";

export const MANUAL_TASK_COLUMN_DROP_PREFIX = "manual-task-status:";

export const MANUAL_TASK_PIPELINE_COLUMNS: {
  status: ManualTaskStatus;
  label: string;
  hint: string;
  headerClass: string;
  bodyClass: string;
  dotClass: string;
  countClass: string;
}[] = [
  {
    status: "todo",
    label: "To do",
    hint: "Not started yet",
    headerClass: "text-[#616161]",
    bodyClass: "border-[#e3e3e3] bg-[#f6f6f7]",
    dotClass: "bg-[#8a8a8a]",
    countClass: "border-[#e3e3e3] bg-white text-[#616161]",
  },
  {
    status: "in_progress",
    label: "In progress",
    hint: "Someone is working on it",
    headerClass: "text-[#2c6ecb]",
    bodyClass: "border-[#c4d7f2] bg-[#f4f7fd]",
    dotClass: "bg-[#2c6ecb]",
    countClass: "border-[#c5d9f8] bg-white text-[#2c6ecb]",
  },
  {
    status: "blocked",
    label: "Blocked",
    hint: "Waiting on a decision",
    headerClass: "text-[#8a6116]",
    bodyClass: "border-[#f0d9a8] bg-[#fff8eb]",
    dotClass: "bg-[#b98900]",
    countClass: "border-[#f0d9a8] bg-white text-[#8a6116]",
  },
  {
    status: "done",
    label: "Done",
    hint: "Completed",
    headerClass: "text-[#0d5c2e]",
    bodyClass: "border-[#86d4a8] bg-[#e8f5ee]",
    dotClass: "bg-[#108043]",
    countClass: "border-[#86d4a8] bg-white text-[#0d5c2e]",
  },
];

export const MANUAL_TASK_STATUS_META: Record<
  ManualTaskStatus,
  { label: string; badge: string; dot: string }
> = {
  todo: {
    label: "To do",
    badge: "border-[#e3e3e3] bg-[#f6f6f7] text-[#616161]",
    dot: "bg-[#8a8a8a]",
  },
  in_progress: {
    label: "In progress",
    badge: "border-[#c4d7f2] bg-[#f4f7fd] text-[#2c6ecb]",
    dot: "bg-[#2c6ecb]",
  },
  blocked: {
    label: "Blocked",
    badge: "border-[#f5b5b5] bg-[#fff1f1] text-[#8f1f1f]",
    dot: "bg-[#d72c2c]",
  },
  done: {
    label: "Done",
    badge: "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]",
    dot: "bg-[#0d8a45]",
  },
};

export const MANUAL_TASK_PRIORITY_META: Record<
  ManualTaskPriority,
  { label: string; badge: string }
> = {
  low: { label: "Low", badge: "border-[#e3e3e3] bg-[#f6f6f7] text-[#8a8a8a]" },
  normal: {
    label: "Normal",
    badge: "border-[#e3e3e3] bg-white text-[#616161]",
  },
  high: {
    label: "High",
    badge: "border-[#f0d9a8] bg-[#fff8eb] text-[#8a6116]",
  },
  urgent: {
    label: "Urgent",
    badge: "border-[#f5b5b5] bg-[#fff1f1] text-[#8f1f1f]",
  },
};

export const MANUAL_TASK_STATUS_ORDER: ManualTaskStatus[] = [
  "todo",
  "in_progress",
  "blocked",
  "done",
];

export const MANUAL_TASK_PRIORITY_ORDER: ManualTaskPriority[] = [
  "urgent",
  "high",
  "normal",
  "low",
];

export function manualTaskColumnDropId(status: ManualTaskStatus): string {
  return `${MANUAL_TASK_COLUMN_DROP_PREFIX}${status}`;
}

export function parseManualTaskColumnDropId(
  id: string | number | undefined
): ManualTaskStatus | null {
  if (typeof id !== "string") return null;
  if (!id.startsWith(MANUAL_TASK_COLUMN_DROP_PREFIX)) return null;
  const status = id.slice(
    MANUAL_TASK_COLUMN_DROP_PREFIX.length
  ) as ManualTaskStatus;
  if (MANUAL_TASK_STATUS_ORDER.includes(status)) return status;
  return null;
}

export function countManualTasksByStatus(
  tasks: ManualTask[]
): Record<ManualTaskStatus, number> {
  return {
    todo: tasks.filter((task) => task.status === "todo").length,
    in_progress: tasks.filter((task) => task.status === "in_progress").length,
    blocked: tasks.filter((task) => task.status === "blocked").length,
    done: tasks.filter((task) => task.status === "done").length,
  };
}

export function isManualTaskOverdue(task: ManualTask): boolean {
  if (!task.dueDate || task.status === "done") return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function isManualTaskDueSoon(task: ManualTask, withinDays = 2): boolean {
  if (!task.dueDate || task.status === "done") return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= withinDays && diffDays >= 0;
}
