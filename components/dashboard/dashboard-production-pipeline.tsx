"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, LayoutGrid } from "lucide-react";
import { OrderStatusBadge } from "@/components/status-badges";
import {
  dashboardCardClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import type {
  ActiveProductionOrder,
  ProductionPipelineSnapshot,
} from "@/lib/dashboard-production";
import { PRODUCTION_PIPELINE_COLUMNS } from "@/lib/production-board";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";

const STATUS_BADGE: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  in_progress: {
    label: "In progress",
    className: "bg-[#ebf4ff] text-[#2c6ecb]",
  },
  blocked: {
    label: "Blocked",
    className: "bg-[#fff5ea] text-[#b98900]",
  },
  pending: {
    label: "Queued",
    className: "bg-[#f1f1f1] text-[#616161]",
  },
  done: {
    label: "Done",
    className: "bg-[#e3f1df] text-[#108043]",
  },
};

const DASHBOARD_PIPELINE_COLUMNS = PRODUCTION_PIPELINE_COLUMNS.filter(
  (column) => column.status !== "done"
);

function PipelineStatusStrip({
  counts,
}: {
  counts: Record<TaskStatus, number>;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-[#ebebeb] bg-[#fafafa] px-3 py-3 sm:px-4">
      {DASHBOARD_PIPELINE_COLUMNS.map((column) => (
        <div
          key={column.status}
          className={cn(
            "rounded-lg border px-2.5 py-2 text-center",
            column.bodyClass
          )}
        >
          <div className="flex items-center justify-center gap-1.5">
            <span className={cn("size-2 rounded-full", column.dotClass)} />
            <span className={cn("text-[11px] font-semibold", column.headerClass)}>
              {column.label}
            </span>
          </div>
          <p className="mt-1 text-lg font-semibold tabular-nums text-[#303030]">
            {counts[column.status]}
          </p>
        </div>
      ))}
    </div>
  );
}

function PipelineTaskRow({ task }: { task: Task }) {
  const badge = STATUS_BADGE[task.status];

  return (
    <Link
      href={`/app/orders/${task.orderId}`}
      className={cn(
        dashboardInsetSurfaceClass,
        "group flex items-start gap-3 px-3.5 py-3 transition-[border-color,background-color] hover:border-[#c9cccf] hover:bg-[#fafafa]"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={dashboardTaskTitleClass}>{task.title}</p>
          <span
            className={cn(
              "rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              badge.className
            )}
          >
            {badge.label}
          </span>
        </div>
        <p className={cn("mt-1", dashboardTaskDetailClass)}>
          {task.orderNumber} · {task.customerName} · {task.department}
        </p>
      </div>
      <ChevronRight className="mt-1 size-4 shrink-0 text-[#616161] opacity-60 group-hover:opacity-100" />
    </Link>
  );
}

function ActiveOrderRow({ order }: { order: ActiveProductionOrder }) {
  const taskHint =
    order.openDepartmentTaskCount > 0
      ? `${order.openDepartmentTaskCount} open department task${order.openDepartmentTaskCount !== 1 ? "s" : ""}`
      : order.departmentTaskCount > 0
        ? "All department tasks complete"
        : "No department tasks yet";

  return (
    <Link
      href={`/app/orders/${order.id}`}
      className={cn(
        dashboardInsetSurfaceClass,
        "group flex items-center gap-3 px-3.5 py-3 transition-[border-color,background-color] hover:border-[#c9cccf] hover:bg-[#fafafa]"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={dashboardTaskTitleClass}>{order.number}</p>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className={cn("mt-1", dashboardTaskDetailClass)}>
          {order.company} · {taskHint}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-[#616161] opacity-60 group-hover:opacity-100" />
    </Link>
  );
}

export function DashboardProductionPipeline({
  snapshot,
  upcomingEvents,
  className,
}: {
  snapshot: ProductionPipelineSnapshot;
  upcomingEvents: number;
  className?: string;
}) {
  const { openTasks, statusCounts, activeOrders } = snapshot;
  const preview = openTasks.slice(0, 6);
  const showActiveOrders = preview.length === 0 && activeOrders.length > 0;

  return (
    <section
      className={cn(
        dashboardCardClass,
        "flex min-h-[280px] flex-col overflow-hidden",
        className
      )}
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3 sm:px-5">
        <div className="flex items-start gap-2">
          <LayoutGrid className="mt-0.5 size-4 text-[#616161]" strokeWidth={1.75} />
          <div>
            <p className="text-sm font-semibold text-[#303030]">
              Production pipeline
            </p>
            <p className="mt-0.5 text-xs text-[#616161]">
              Production events — same data as Tasks and the pipeline board
            </p>
          </div>
        </div>
        <Link
          href="/app/production"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline"
        >
          Open board
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <PipelineStatusStrip counts={statusCounts} />

      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
        {preview.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {preview.map((task) => (
              <li key={task.id}>
                <PipelineTaskRow task={task} />
              </li>
            ))}
          </ul>
        ) : showActiveOrders ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="rounded-lg border border-[#e3e3e3] bg-[#fafafa] px-3.5 py-3 text-xs leading-relaxed text-[#616161]">
              <p className="font-semibold text-[#303030]">
                Active orders — no department tasks yet
              </p>
              <p className="mt-1">
                <span className="font-medium text-[#303030]">Shop floor</span>{" "}
                shows today&apos;s calendar runs. This panel tracks the same{" "}
                <span className="font-medium text-[#303030]">
                  production events
                </span>{" "}
                as Tasks — drag on the Production tab to update status.
              </p>
              {upcomingEvents > 0 ? (
                <p className="mt-2">
                  You have {upcomingEvents} production event
                  {upcomingEvents !== 1 ? "s" : ""} scheduled — add department
                  tasks on each order when the shop is ready to work them.
                </p>
              ) : null}
            </div>
            <ul className="flex flex-col gap-2">
              {activeOrders.slice(0, 5).map((order) => (
                <li key={order.id}>
                  <ActiveOrderRow order={order} />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-2 py-6 text-center">
            <p className="text-sm font-semibold text-[#303030]">
              No active production work
            </p>
            <p className={cn("mt-1 max-w-xs", dashboardTaskDetailClass)}>
              When orders enter production, department tasks appear here.
              Calendar events show on Shop floor.
            </p>
            <Link
              href="/app/production"
              className="mt-4 text-xs font-semibold text-brand-primary hover:underline"
            >
              Open production board
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
