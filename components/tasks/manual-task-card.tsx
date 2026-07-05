"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, ChevronRight, GripVertical, UserRound } from "lucide-react";
import {
  dashboardControlClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import {
  MANUAL_TASK_PRIORITY_META,
  isManualTaskDueSoon,
  isManualTaskOverdue,
} from "@/lib/manual-tasks-board";
import type { ManualTask } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ManualTaskCard({
  task,
  assigneeName,
  isOverlay,
  onOpen,
}: {
  task: ManualTask;
  assigneeName: string;
  isOverlay?: boolean;
  onOpen?: () => void;
}) {
  const dueSoon = isManualTaskDueSoon(task);
  const overdue = isManualTaskOverdue(task);
  const priority = MANUAL_TASK_PRIORITY_META[task.priority];

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
        "group relative w-full overflow-hidden rounded-lg border border-[#e3e3e3] bg-white shadow-[0_1px_0_rgba(26,26,26,0.04),0_1px_2px_rgba(26,26,26,0.05)] transition-[border-color,box-shadow]",
        isOverlay
          ? "border-[#c5d9f8] shadow-lg ring-2 ring-[#2c6ecb]/15"
          : "hover:border-[#c9cccf] hover:shadow-md",
        isDragging && !isOverlay && "opacity-40"
      )}
    >
      <div className="flex gap-2.5 p-3">
        <button
          type="button"
          className={cn(
            dashboardControlClass,
            "mt-0.5 h-7 w-7 shrink-0 justify-center p-0 text-[#616161]",
            "cursor-grab active:cursor-grabbing hover:text-[#303030]",
            isOverlay && "cursor-grabbing"
          )}
          aria-label={`Drag ${task.title}`}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="size-3.5" strokeWidth={1.75} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <button
              type="button"
              onClick={onOpen}
              className={cn(
                dashboardTaskTitleClass,
                "text-left hover:text-[#2c6ecb]"
              )}
            >
              {task.title}
            </button>
            {task.priority !== "normal" ? (
              <span
                className={cn(
                  "rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  priority.badge
                )}
              >
                {priority.label}
              </span>
            ) : null}
          </div>

          {task.description ? (
            <p className={cn("mt-1.5 line-clamp-2", dashboardTaskDetailClass)}>
              {task.description}
            </p>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] text-[#616161]">
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3" />
              {assigneeName || "Unassigned"}
            </span>
            {task.dueDate ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  overdue && "font-semibold text-[#8f1f1f]",
                  !overdue && dueSoon && "font-semibold text-[#8a6116]"
                )}
              >
                <CalendarDays className="size-3" />
                Due {formatDate(task.dueDate)}
              </span>
            ) : null}
            {(task.comments?.length ?? 0) > 0 ? (
              <span className="rounded-sm bg-[#f1f1f1] px-1.5 py-0.5 font-medium text-[#303030]">
                {task.comments.length} update
                {task.comments.length !== 1 ? "s" : ""}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onOpen}
            className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[#2c6ecb] hover:underline"
          >
            Open task
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
