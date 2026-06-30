"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  CircleDot,
  LayoutGrid,
  List,
} from "lucide-react";
import { ScheduleJobDialog } from "@/components/calendar/schedule-job-dialog";
import { ProductionListView } from "@/components/production/production-list-view";
import { ProductionPipelineBoard } from "@/components/production/production-pipeline-board";
import { ProductionEventSheet } from "@/components/tasks/production-event-sheet";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import {
  PRODUCTION_DEPARTMENTS,
  PRODUCTION_STATUS_KPI,
  countTasksByStatus,
  filterProductionTasksByDepartment,
  filterProductionTasksByStatus,
} from "@/lib/production-board";
import { collectCustomerLegend } from "@/lib/production-customer-colors";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardKpiCardClass,
  dashboardKpiTitleClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import type { TaskStatus } from "@/types";
import { cn } from "@/lib/utils";

const KPI_ICONS: Record<TaskStatus, LucideIcon> = {
  pending: CircleDot,
  in_progress: Activity,
  blocked: AlertTriangle,
  done: CheckCircle2,
};

const KPI_ORDER: TaskStatus[] = [
  "pending",
  "in_progress",
  "blocked",
  "done",
];

function StatusKpiCard({
  status,
  value,
  active,
  onClick,
}: {
  status: TaskStatus;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  const style = PRODUCTION_STATUS_KPI[status];
  const Icon = KPI_ICONS[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        dashboardKpiCardClass,
        "min-h-[128px] border text-left",
        style.surface,
        style.border,
        active && "ring-2 ring-[#2c6ecb]/25"
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            style.iconWrap
          )}
        >
          <Icon className={cn("size-3.5", style.iconColor)} strokeWidth={1.75} />
        </div>
        <p className={dashboardKpiTitleClass}>{style.label}</p>
      </div>
      <p
        className={cn(
          dashboardValueClass,
          "mt-2.5",
          style.valueColor ?? "text-[#303030]"
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs leading-snug text-[#616161]">{style.hint}</p>
    </button>
  );
}

export function ProductionView() {
  const { productionBoardTasks, scheduleBlocks, customers } = useSchedule();
  const [department, setDepartment] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [selectedEvent, setSelectedEvent] = useState<{
    orderId: string;
    jobId: string;
    imprintId: string;
  } | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const departmentTasks = useMemo(
    () => filterProductionTasksByDepartment(productionBoardTasks, department),
    [productionBoardTasks, department]
  );

  const filteredTasks = useMemo(
    () => filterProductionTasksByStatus(departmentTasks, statusFilter),
    [departmentTasks, statusFilter]
  );

  const openTasks = useMemo(
    () => filteredTasks.filter((task) => task.status !== "done"),
    [filteredTasks]
  );

  const statusCounts = useMemo(
    () => countTasksByStatus(departmentTasks),
    [departmentTasks]
  );

  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers]
  );

  const customerLegend = useMemo(
    () => collectCustomerLegend(filteredTasks, customersById),
    [filteredTasks, customersById]
  );

  const editingBlock = useMemo(() => {
    if (!selectedEvent) return undefined;
    return scheduleBlocks.find(
      (block) =>
        block.orderId === selectedEvent.orderId &&
        block.jobId === selectedEvent.jobId &&
        block.imprintId === selectedEvent.imprintId
    );
  }, [selectedEvent, scheduleBlocks]);

  const blockedCount = statusCounts.blocked;

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={dashboardSectionTitleClass}>Production</h1>
          <p className={cn("mt-1 max-w-2xl", dashboardTaskDetailClass)}>
            {blockedCount > 0
              ? `${blockedCount} event${blockedCount !== 1 ? "s" : ""} blocked — drag cards between columns or click to manage`
              : "Track every decoration event by status. Colors match customer so you can spot who is on the floor."}
          </p>
        </div>
        <Button
          className={cn(dashboardControlClass, "h-9 shrink-0")}
          nativeButton={false}
          render={<Link href="/app/calendar" />}
        >
          <Calendar className="size-3.5" />
          Shop calendar
        </Button>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KPI_ORDER.map((status) => (
          <StatusKpiCard
            key={status}
            status={status}
            value={statusCounts[status]}
            active={statusFilter === status}
            onClick={() =>
              setStatusFilter((current) =>
                current === status ? "all" : status
              )
            }
          />
        ))}
      </section>

      {customerLegend.length > 0 ? (
        <section className={cn(dashboardCardClass, "px-4 py-3 sm:px-5")}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Customers in view
            </p>
            {customerLegend.slice(0, 10).map((entry) => (
              <span
                key={entry.customerName}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#303030]"
              >
                {entry.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.logoUrl}
                    alt=""
                    className="size-4 rounded object-contain"
                  />
                ) : (
                  <span
                    className={cn("size-2 rounded-full", entry.accent.dot)}
                  />
                )}
                {entry.customerName}
              </span>
            ))}
            {customerLegend.length > 10 ? (
              <span className="text-xs text-[#616161]">
                +{customerLegend.length - 10} more
              </span>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className={cn(dashboardCardClass, "overflow-hidden")}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
          <div>
            <p className="text-[15px] font-semibold text-[#303030]">
              Production board
            </p>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              {filteredTasks.length} event
              {filteredTasks.length !== 1 ? "s" : ""}
              {statusFilter !== "all" ? ` · ${PRODUCTION_STATUS_KPI[statusFilter].label}` : ""}
              {department !== "All" ? ` · ${department}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setView("pipeline")}
              className={cn(
                dashboardControlClass,
                "h-8 gap-1.5 px-2.5 text-xs font-semibold",
                view === "pipeline" &&
                  "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
              )}
            >
              <LayoutGrid className="size-3.5" />
              Board
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                dashboardControlClass,
                "h-8 gap-1.5 px-2.5 text-xs font-semibold",
                view === "list" &&
                  "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
              )}
            >
              <List className="size-3.5" />
              List
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-2.5 sm:px-5">
          {PRODUCTION_DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              type="button"
              onClick={() => setDepartment(dept)}
              className={cn(
                dashboardControlClass,
                "h-8 px-3 text-xs font-semibold",
                department === dept
                  ? "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
                  : "text-[#303030]"
              )}
            >
              {dept}
            </button>
          ))}
          {statusFilter !== "all" ? (
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(dashboardControlClass, "h-8 text-xs text-[#616161]")}
            >
              Clear status filter
            </button>
          ) : null}
        </div>

        <div className="p-3 sm:p-4">
          {view === "pipeline" ? (
            <ProductionPipelineBoard
              tasks={filteredTasks}
              onOpenEvent={setSelectedEvent}
            />
          ) : (
            <ProductionListView
              tasks={openTasks}
              onOpenEvent={setSelectedEvent}
            />
          )}
        </div>
      </section>

      <section
        className={cn(
          dashboardCardClass,
          "flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        )}
      >
        <div>
          <p className="text-sm font-semibold text-[#303030]">
            Need to reschedule a run?
          </p>
          <p className={cn("mt-1 max-w-xl", dashboardTaskDetailClass)}>
            Machine timelines and drag-and-drop scheduling live in the shop
            calendar — same board your floor stations use.
          </p>
        </div>
        <Button
          className={cn(dashboardControlClass, "h-9 shrink-0")}
          nativeButton={false}
          render={<Link href="/app/calendar" />}
        >
          Open calendar
          <ArrowRight className="size-3.5" />
        </Button>
      </section>

      <ProductionEventSheet
        open={selectedEvent !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
        orderId={selectedEvent?.orderId ?? null}
        jobId={selectedEvent?.jobId ?? null}
        imprintId={selectedEvent?.imprintId ?? null}
        onSchedule={() => setScheduleOpen(true)}
      />

      <ScheduleJobDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        editingBlock={editingBlock}
        prefillJobKey={
          selectedEvent
            ? `${selectedEvent.orderId}::${selectedEvent.jobId}::${selectedEvent.imprintId}`
            : undefined
        }
        filterOrderId={selectedEvent?.orderId}
      />
    </main>
  );
}
