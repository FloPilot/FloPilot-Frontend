"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TaskStatusBadge } from "@/components/status-badges";
import { formatDate } from "@/lib/format";
import { isTaskDueSoon } from "@/lib/production-board";
import type { Task } from "@/types";
import { cn } from "@/lib/utils";

export function ProductionListView({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-white px-6 py-14 text-center">
        <p className="text-sm text-brand-muted">
          No tasks match this department filter.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
      <div className="divide-y divide-border/60">
        {tasks.map((task) => {
          const dueSoon = isTaskDueSoon(task);
          return (
            <Link
              key={task.id}
              href={`/app/orders/${task.orderId}`}
              className="group flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5 transition-colors hover:bg-brand-primary/[0.03]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-brand-ink group-hover:text-brand-primary transition-colors">
                    {task.title}
                  </p>
                  <TaskStatusBadge status={task.status} />
                </div>
                <p className="mt-1 text-sm text-brand-muted">
                  {task.orderNumber} · {task.customerName}
                </p>
                <p className="mt-1 text-xs text-brand-muted">
                  {task.department} · {task.assignee}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={cn(
                    "text-xs text-brand-muted",
                    dueSoon && "font-medium text-amber-800"
                  )}
                >
                  Due {formatDate(task.dueDate)}
                </span>
                <ChevronRight className="size-4 text-brand-muted/50 group-hover:text-brand-primary transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
