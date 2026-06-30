"use client";

import { ChevronRight } from "lucide-react";
import { CustomerBrandMark } from "@/components/customers/customer-brand-mark";
import { useSchedule } from "@/components/providers/schedule-provider";
import {
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

export function ProductionListView({
  tasks,
  onOpenEvent,
}: {
  tasks: Task[];
  onOpenEvent?: (event: {
    orderId: string;
    jobId: string;
    imprintId: string;
  }) => void;
}) {
  const { getCustomerById } = useSchedule();

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-6 py-14 text-center">
        <p className={dashboardTaskDetailClass}>
          No production events match this filter.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => {
        const customer = task.customerId
          ? getCustomerById(task.customerId)
          : undefined;
        const dueSoon = isTaskDueSoon(task);
        const canOpen = Boolean(task.productionEvent && onOpenEvent);
        const badge = PRODUCTION_STATUS_BADGE[task.status];
        const accent = getCustomerAccent(
          task.customerId,
          task.orderId,
          customer?.accentColorKey
        );

        return (
          <li key={task.id}>
            <button
              type="button"
              disabled={!canOpen}
              onClick={() => {
                if (!task.productionEvent || !onOpenEvent) return;
                onOpenEvent({
                  orderId: task.orderId,
                  jobId: task.productionEvent.jobId,
                  imprintId: task.productionEvent.imprintId,
                });
              }}
              className={cn(
                "group flex w-full overflow-hidden rounded-lg border bg-white text-left shadow-[0_1px_0_rgba(26,26,26,0.04),0_1px_2px_rgba(26,26,26,0.05)] transition-colors",
                accent.border,
                canOpen && "hover:bg-[#f6f6f7]",
                !canOpen && "cursor-default"
              )}
            >
              <div className={cn("w-1 shrink-0 self-stretch", accent.cap)} />
              <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5">
                <CustomerBrandMark
                  company={task.customerName}
                  logoUrl={customer?.logoUrl}
                  accentColorKey={customer?.accentColorKey}
                  customerId={task.customerId}
                  fallbackKey={task.orderId}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={cn(
                        dashboardTaskTitleClass,
                        canOpen && "group-hover:text-[#2c6ecb]"
                      )}
                    >
                      {task.title}
                    </p>
                    <span
                      className={cn(
                        "rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        badge.className
                      )}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[#303030]">
                      {task.customerName}
                    </span>
                    <span className="text-xs text-[#616161]">
                      {task.orderNumber} · {task.department}
                    </span>
                  </div>
                  {task.phase ? (
                    <p className={cn("mt-1", dashboardTaskDetailClass)}>
                      {task.phase}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={cn(
                      "text-xs text-[#616161]",
                      dueSoon && "font-semibold text-[#b98900]"
                    )}
                  >
                    Due {formatDate(task.dueDate)}
                  </span>
                  {canOpen ? (
                    <ChevronRight className="size-4 text-[#616161] opacity-60 group-hover:opacity-100" />
                  ) : null}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
