"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, ChevronRight, GripVertical, UserRound } from "lucide-react";
import { CustomerBrandMark } from "@/components/customers/customer-brand-mark";
import { useSchedule } from "@/components/providers/schedule-provider";
import {
  dashboardControlClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import { getCustomerAccent } from "@/lib/production-customer-colors";
import {
  PRODUCTION_STATUS_BADGE,
  isTaskDueSoon,
} from "@/lib/production-board";
import type { Task } from "@/types";
import { cn } from "@/lib/utils";

export function ProductionTaskCard({
  task,
  isOverlay,
  onOpen,
}: {
  task: Task;
  isOverlay?: boolean;
  onOpen?: () => void;
}) {
  const { getCustomerById } = useSchedule();
  const customer = task.customerId
    ? getCustomerById(task.customerId)
    : undefined;
  const dueSoon = isTaskDueSoon(task);
  const badge = PRODUCTION_STATUS_BADGE[task.status];
  const accent = getCustomerAccent(
    task.customerId,
    task.orderId,
    customer?.accentColorKey
  );
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
        "group relative w-full overflow-hidden rounded-lg border border-[#e3e3e3] bg-white shadow-[0_1px_0_rgba(26,26,26,0.04),0_1px_2px_rgba(26,26,26,0.05)] transition-[border-color,box-shadow,background-color]",
        isOverlay
          ? "border-[#c5d9f8] shadow-lg ring-2 ring-[#2c6ecb]/15"
          : "hover:border-[#c9cccf] hover:shadow-md",
        isDragging && !isOverlay && "opacity-40"
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-1", accent.cap)}
      />

      <div className="flex gap-2.5 p-3 pl-4">
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
          <div className="flex flex-wrap items-center gap-2">
            {onOpen ? (
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
            ) : (
              <p className={dashboardTaskTitleClass}>{task.title}</p>
            )}
            <span
              className={cn(
                "rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                badge.className
              )}
            >
              {badge.label}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5">
              <CustomerBrandMark
                company={task.customerName}
                logoUrl={customer?.logoUrl}
                accentColorKey={customer?.accentColorKey}
                customerId={task.customerId}
                fallbackKey={task.orderId}
                size="xs"
              />
              <span className="text-[12px] font-semibold text-[#303030]">
                {task.customerName}
              </span>
            </span>
            <span className="rounded-sm bg-[#f1f1f1] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#303030]">
              {task.orderNumber}
            </span>
          </div>

          {task.phase ? (
            <p className={cn("mt-1.5 line-clamp-2", dashboardTaskDetailClass)}>
              {task.phase}
            </p>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] text-[#616161]">
            <span className="rounded-sm border border-[#e3e3e3] bg-[#fafafa] px-1.5 py-0.5 font-semibold text-[#303030]">
              {task.department}
            </span>
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3" />
              {task.assignee}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1",
                dueSoon && "font-semibold text-[#b98900]"
              )}
            >
              <CalendarDays className="size-3" />
              Due {formatDate(task.dueDate)}
            </span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {onOpen ? (
              <button
                type="button"
                onClick={onOpen}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2c6ecb] hover:underline"
              >
                Manage
                <ChevronRight className="size-3.5" />
              </button>
            ) : null}
            <Link
              href={`/app/orders/${task.orderId}`}
              className="text-xs font-medium text-[#616161] hover:text-[#2c6ecb] hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              Open order
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
