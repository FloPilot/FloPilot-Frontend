import type { Task, TaskStatus } from "@/types";

export const PRODUCTION_COLUMN_DROP_PREFIX = "production-status:";

export const PRODUCTION_PIPELINE_COLUMNS: {
  status: TaskStatus;
  label: string;
  hint: string;
  headerClass: string;
  bodyClass: string;
  dotClass: string;
  countClass: string;
}[] = [
  {
    status: "pending",
    label: "Queued",
    hint: "Needs attention",
    headerClass: "text-[#2c6ecb]",
    bodyClass: "border-[#c4d7f2] bg-[#f4f7fd]",
    dotClass: "bg-[#2c6ecb]",
    countClass: "border-[#c5d9f8] bg-white text-[#2c6ecb]",
  },
  {
    status: "in_progress",
    label: "In progress",
    hint: "Assigned or on floor",
    headerClass: "text-[#0d5c2e]",
    bodyClass: "border-[#86d4a8] bg-[#e8f5ee]",
    dotClass: "bg-[#108043]",
    countClass: "border-[#86d4a8] bg-white text-[#0d5c2e]",
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
    headerClass: "text-[#616161]",
    bodyClass: "border-[#e3e3e3] bg-[#f6f6f7]",
    dotClass: "bg-[#8a8a8a]",
    countClass: "border-[#e3e3e3] bg-white text-[#616161]",
  },
];

export const PRODUCTION_STATUS_KPI: Record<
  TaskStatus,
  {
    label: string;
    hint: string;
    surface: string;
    border: string;
    iconWrap: string;
    iconColor: string;
    valueColor?: string;
  }
> = {
  pending: {
    label: "Queued",
    hint: "Needs attention or scheduled",
    surface: "bg-[#f0f5ff]",
    border: "border-[#c5d9f8]",
    iconWrap: "bg-[#ebf4ff]",
    iconColor: "text-[#2c6ecb]",
    valueColor: "text-[#303030]",
  },
  in_progress: {
    label: "In progress",
    hint: "Assigned, prepping, or on floor",
    surface: "bg-[#e8f5ee]",
    border: "border-[#86d4a8]",
    iconWrap: "bg-[#d4eddf]",
    iconColor: "text-[#0d5c2e]",
    valueColor: "text-[#0d5c2e]",
  },
  blocked: {
    label: "Blocked",
    hint: "On hold or stuck",
    surface: "bg-[#fff8f0]",
    border: "border-[#f0d9b8]",
    iconWrap: "bg-[#fff5ea]",
    iconColor: "text-[#b98900]",
    valueColor: "text-[#303030]",
  },
  done: {
    label: "Done",
    hint: "Completed events",
    surface: "bg-[#f1f8f0]",
    border: "border-[#b8ddb0]",
    iconWrap: "bg-[#e3f1df]",
    iconColor: "text-[#108043]",
    valueColor: "text-[#303030]",
  },
};

export const PRODUCTION_STATUS_BADGE: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  pending: { label: "Queued", className: "bg-[#ebf4ff] text-[#2c6ecb]" },
  in_progress: {
    label: "In progress",
    className: "bg-[#d4eddf] text-[#0d5c2e]",
  },
  blocked: { label: "Blocked", className: "bg-[#fff5ea] text-[#b98900]" },
  done: { label: "Done", className: "bg-[#e3f1df] text-[#108043]" },
};

export const PRODUCTION_DEPARTMENTS = [
  "All",
  "Art Department",
  "Screen Prep",
  "Press Floor",
  "Embroidery",
  "QC & Packing",
  "Shipping",
] as const;

export function productionColumnDropId(status: TaskStatus): string {
  return `${PRODUCTION_COLUMN_DROP_PREFIX}${status}`;
}

export function parseProductionColumnDropId(
  id: string | number | undefined
): TaskStatus | null {
  if (typeof id !== "string") return null;
  if (!id.startsWith(PRODUCTION_COLUMN_DROP_PREFIX)) return null;
  const status = id.slice(PRODUCTION_COLUMN_DROP_PREFIX.length) as TaskStatus;
  if (
    status === "pending" ||
    status === "in_progress" ||
    status === "blocked" ||
    status === "done"
  ) {
    return status;
  }
  return null;
}

export function filterProductionTasksByStatus(
  tasks: Task[],
  status: TaskStatus | "all"
): Task[] {
  if (status === "all") return tasks;
  return tasks.filter((task) => task.status === status);
}

export function filterProductionTasksByDepartment(
  tasks: Task[],
  department: string
): Task[] {
  if (department === "All") return tasks;
  return tasks.filter((task) => task.department === department);
}

export function countTasksByStatus(tasks: Task[]): Record<TaskStatus, number> {
  return {
    pending: tasks.filter((task) => task.status === "pending").length,
    in_progress: tasks.filter((task) => task.status === "in_progress").length,
    blocked: tasks.filter((task) => task.status === "blocked").length,
    done: tasks.filter((task) => task.status === "done").length,
  };
}

export function isTaskDueSoon(task: Task, withinDays = 2): boolean {
  const due = new Date(`${task.dueDate}T12:00:00`);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= withinDays && task.status !== "done";
}
