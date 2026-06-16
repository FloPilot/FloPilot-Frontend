"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, GripVertical, UserRound } from "lucide-react";
import { formatDate } from "@/lib/format";
import { isTaskDueSoon } from "@/lib/production-board";
import type { Task } from "@/types";
import { cn } from "@/lib/utils";

export function ProductionTaskCard({
  task,
  isOverlay,
}: {
  task: Task;
  isOverlay?: boolean;
}) {
  const dueSoon = isTaskDueSoon(task);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { task },
      disabled: isOverlay,
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <article
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? undefined : style}
      className={cn(
        "group w-full rounded-xl border bg-white shadow-sm transition-shadow",
        isOverlay
          ? "border-brand-primary/30 shadow-lg ring-2 ring-brand-primary/15 rotate-[1deg]"
          : "border-border/70 hover:shadow-md hover:border-brand-primary/20",
        isDragging && !isOverlay && "opacity-40 shadow-none"
      )}
    >
      <div className="flex gap-2 p-3.5">
        <button
          type="button"
          className={cn(
            "mt-0.5 shrink-0 rounded-md p-0.5 text-brand-muted/70 transition-colors",
            "cursor-grab active:cursor-grabbing hover:bg-brand-primary/10 hover:text-brand-primary",
            isOverlay && "cursor-grabbing"
          )}
          aria-label={`Drag ${task.title}`}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="size-4" />
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-semibold leading-snug text-brand-ink">
              {task.title}
            </p>
            <p className="mt-1 text-xs text-brand-muted truncate">
              {task.orderNumber} · {task.customerName}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-brand-muted">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-surface px-2 py-0.5 font-medium text-brand-ink/80">
              {task.department}
            </span>
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3" />
              {task.assignee}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1",
                dueSoon && "font-medium text-amber-800"
              )}
            >
              <CalendarDays className="size-3" />
              Due {formatDate(task.dueDate)}
            </span>
          </div>

          <Link
            href={`/app/orders/${task.orderId}`}
            className="inline-flex text-xs font-medium text-brand-primary hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            View order →
          </Link>
        </div>
      </div>
    </article>
  );
}
