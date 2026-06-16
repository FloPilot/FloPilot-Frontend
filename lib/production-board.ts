import type { Task, TaskStatus } from "@/types";

export const PRODUCTION_COLUMN_DROP_PREFIX = "production-status:";

export const PRODUCTION_PIPELINE_COLUMNS: {
  status: TaskStatus;
  label: string;
  hint: string;
  headerClass: string;
  bodyClass: string;
  dotClass: string;
}[] = [
  {
    status: "pending",
    label: "Queued",
    hint: "Ready to start",
    headerClass: "text-brand-muted",
    bodyClass: "bg-brand-surface/80 border-border/60",
    dotClass: "bg-brand-muted/60",
  },
  {
    status: "in_progress",
    label: "In progress",
    hint: "On the floor now",
    headerClass: "text-brand-primary",
    bodyClass: "bg-brand-primary/[0.04] border-brand-primary/15",
    dotClass: "bg-brand-primary",
  },
  {
    status: "blocked",
    label: "Blocked",
    hint: "Waiting on something",
    headerClass: "text-amber-800",
    bodyClass: "bg-amber-50/50 border-amber-200/70",
    dotClass: "bg-amber-500",
  },
  {
    status: "done",
    label: "Done",
    hint: "Completed this week",
    headerClass: "text-emerald-700",
    bodyClass: "bg-emerald-50/40 border-emerald-200/60",
    dotClass: "bg-emerald-500",
  },
];

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
