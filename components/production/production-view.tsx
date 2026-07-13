"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Factory,
  LayoutGrid,
  List,
  Play,
  Warehouse,
} from "lucide-react";
import { ScheduleJobDialog } from "@/components/calendar/schedule-job-dialog";
import {
  ProductionFloorFeed,
  ProductionRunningStrip,
  type FloorGroupMode,
} from "@/components/production/production-floor-feed";
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
  buildProductionFloorOverview,
  type ProductionFloorEvent,
} from "@/lib/production-floor-overview";
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

type MainTab = "floor" | "workflow";

const WORKFLOW_KPI_ICONS: Record<TaskStatus, LucideIcon> = {
  pending: CircleDot,
  in_progress: Activity,
  blocked: AlertTriangle,
  done: CheckCircle2,
};

const WORKFLOW_KPI_ORDER: TaskStatus[] = [
  "pending",
  "in_progress",
  "blocked",
  "done",
];

function FloorKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  surface,
  border,
  iconWrap,
  iconColor,
  valueColor,
}: {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  surface: string;
  border: string;
  iconWrap: string;
  iconColor: string;
  valueColor?: string;
}) {
  return (
    <div
      className={cn(
        dashboardKpiCardClass,
        "min-h-[120px] border text-left",
        surface,
        border
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            iconWrap
          )}
        >
          <Icon className={cn("size-3.5", iconColor)} strokeWidth={1.75} />
        </div>
        <p className={dashboardKpiTitleClass}>{label}</p>
      </div>
      <p
        className={cn(
          dashboardValueClass,
          "mt-2.5",
          valueColor ?? "text-[#303030]"
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs leading-snug text-[#616161]">{hint}</p>
    </div>
  );
}

function WorkflowStatusKpiCard({
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
  const Icon = WORKFLOW_KPI_ICONS[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        dashboardKpiCardClass,
        "min-h-[114px] border text-left",
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
          "mt-2.5 text-[1.5rem]",
          style.valueColor ?? "text-[#303030]"
        )}
      >
        {value}
      </p>
    </button>
  );
}

export function ProductionView() {
  const {
    productionBoardTasks,
    scheduleBlocks,
    activeScheduleBlocks,
    customers,
    machines,
    jobRuns,
    activeOrders,
  } = useSchedule();

  const [mainTab, setMainTab] = useState<MainTab>("floor");
  const [groupMode, setGroupMode] = useState<FloorGroupMode>("day");
  const [machineFilter, setMachineFilter] = useState<string | "all">("all");
  const [department, setDepartment] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [workflowView, setWorkflowView] = useState<"pipeline" | "list">(
    "pipeline"
  );
  const [selectedEvent, setSelectedEvent] = useState<{
    orderId: string;
    jobId: string;
    imprintId: string;
  } | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const floor = useMemo(
    () =>
      buildProductionFloorOverview({
        machines,
        scheduleBlocks: activeScheduleBlocks,
        jobRuns,
        orders: activeOrders,
      }),
    [machines, activeScheduleBlocks, jobRuns, activeOrders]
  );

  const activeMachines = useMemo(
    () =>
      machines
        .filter((machine) => machine.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [machines]
  );

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

  const openFloorEvent = (event: ProductionFloorEvent) => {
    const block = scheduleBlocks.find(
      (entry) => entry.id === event.scheduleBlockId
    );
    if (!block) return;
    setSelectedEvent({
      orderId: block.orderId,
      jobId: block.jobId,
      imprintId: block.imprintId,
    });
  };

  const subtitle =
    floor.metrics.runningNow > 0
      ? `${floor.metrics.runningNow} live on the floor · ${floor.metrics.scheduledToday} on calendar today`
      : floor.metrics.scheduledToday > 0
        ? `${floor.metrics.scheduledToday} event${floor.metrics.scheduledToday !== 1 ? "s" : ""} on machines today`
        : "See what’s running and what’s next across your production machines.";

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={dashboardSectionTitleClass}>Production</h1>
          <p className={cn("mt-1 max-w-2xl", dashboardTaskDetailClass)}>
            {subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={cn(
              "flex gap-1 rounded-lg border border-[#e3e3e3] bg-white p-1",
              "shadow-[0_1px_0_rgba(26,26,26,0.05),0_2px_4px_rgba(26,26,26,0.08)]"
            )}
          >
            {(
              [
                { id: "floor", label: "Floor", icon: Factory },
                { id: "workflow", label: "Workflow", icon: LayoutGrid },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMainTab(tab.id)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold transition-colors",
                    mainTab === tab.id
                      ? "bg-[#f0f5ff] text-[#2c6ecb]"
                      : "text-[#616161] hover:text-[#303030]"
                  )}
                >
                  <Icon className="size-3.5" />
                  {tab.label}
                </button>
              );
            })}
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
      </div>

      {mainTab === "floor" ? (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <FloorKpiCard
              label="Running now"
              value={floor.metrics.runningNow}
              hint={
                floor.metrics.machinesBusy > 0
                  ? `${floor.metrics.machinesBusy} machine${floor.metrics.machinesBusy !== 1 ? "s" : ""} live`
                  : "Nothing marked running yet"
              }
              icon={Play}
              surface="bg-[#f1f8f0]"
              border="border-[#b8ddb0]"
              iconWrap="bg-[#e3f1df]"
              iconColor="text-[#108043]"
              valueColor="text-[#108043]"
            />
            <FloorKpiCard
              label="On calendar today"
              value={floor.metrics.scheduledToday}
              hint="Scheduled machine events today"
              icon={CalendarClock}
              surface="bg-[#f0f5ff]"
              border="border-[#c5d9f8]"
              iconWrap="bg-[#ebf4ff]"
              iconColor="text-[#2c6ecb]"
            />
            <FloorKpiCard
              label="Next 7 days"
              value={floor.metrics.upcomingWeek}
              hint="Upcoming + live events in view"
              icon={Warehouse}
              surface="bg-[#f6f6f7]"
              border="border-[#e3e3e3]"
              iconWrap="bg-[#f1f1f1]"
              iconColor="text-[#616161]"
            />
            <FloorKpiCard
              label="Needs scheduling"
              value={floor.metrics.needsSchedule}
              hint="Approved orders still missing a machine slot"
              icon={AlertTriangle}
              surface={
                floor.metrics.needsSchedule > 0 ? "bg-[#fff8e6]" : "bg-[#f6f6f7]"
              }
              border={
                floor.metrics.needsSchedule > 0
                  ? "border-[#f0d9a8]"
                  : "border-[#e3e3e3]"
              }
              iconWrap={
                floor.metrics.needsSchedule > 0 ? "bg-[#fcf1cd]" : "bg-[#f1f1f1]"
              }
              iconColor={
                floor.metrics.needsSchedule > 0
                  ? "text-[#b98900]"
                  : "text-[#616161]"
              }
              valueColor={
                floor.metrics.needsSchedule > 0
                  ? "text-[#916a00]"
                  : "text-[#303030]"
              }
            />
          </section>

          <ProductionRunningStrip
            events={floor.runningNow}
            onSelectEvent={openFloorEvent}
          />

          <section className={cn(dashboardCardClass, "overflow-hidden")}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
              <div>
                <p className="text-[15px] font-semibold text-[#303030]">
                  Machine events
                </p>
                <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                  What’s booked on the floor over the next week — sorted for a
                  quick scan
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setGroupMode("day")}
                  className={cn(
                    dashboardControlClass,
                    "h-8 gap-1.5 px-2.5 text-xs font-semibold",
                    groupMode === "day" &&
                      "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
                  )}
                >
                  By day
                </button>
                <button
                  type="button"
                  onClick={() => setGroupMode("machine")}
                  className={cn(
                    dashboardControlClass,
                    "h-8 gap-1.5 px-2.5 text-xs font-semibold",
                    groupMode === "machine" &&
                      "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
                  )}
                >
                  By machine
                </button>
              </div>
            </div>

            {activeMachines.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-2.5 sm:px-5">
                <button
                  type="button"
                  onClick={() => setMachineFilter("all")}
                  className={cn(
                    dashboardControlClass,
                    "h-8 px-3 text-xs font-semibold",
                    machineFilter === "all"
                      ? "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
                      : "text-[#303030]"
                  )}
                >
                  All machines
                </button>
                {activeMachines.map((machine) => (
                  <button
                    key={machine.id}
                    type="button"
                    onClick={() =>
                      setMachineFilter((current) =>
                        current === machine.id ? "all" : machine.id
                      )
                    }
                    className={cn(
                      dashboardControlClass,
                      "h-8 px-3 text-xs font-semibold",
                      machineFilter === machine.id
                        ? "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
                        : "text-[#303030]"
                    )}
                  >
                    {machine.name}
                  </button>
                ))}
              </div>
            ) : null}

            <ProductionFloorFeed
              mode={groupMode}
              byDay={floor.byDay}
              byMachine={floor.byMachine}
              machineFilter={machineFilter}
              onSelectEvent={openFloorEvent}
            />
          </section>

          {floor.metrics.needsSchedule > 0 ? (
            <section
              className={cn(
                dashboardCardClass,
                "flex flex-col gap-3 border-[#f0d9a8] bg-[#fffdf6] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              )}
            >
              <div>
                <p className="text-sm font-semibold text-[#916a00]">
                  {floor.metrics.needsSchedule} order
                  {floor.metrics.needsSchedule !== 1 ? "s" : ""} still need a
                  machine slot
                </p>
                <p className={cn("mt-1 max-w-xl", dashboardTaskDetailClass)}>
                  Approved decoration events without a calendar booking won’t
                  show on the floor until they’re scheduled.
                </p>
              </div>
              <Button
                className={cn(dashboardControlClass, "h-9 shrink-0")}
                nativeButton={false}
                render={<Link href="/app/calendar" />}
              >
                Schedule on calendar
              </Button>
            </section>
          ) : null}
        </>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {WORKFLOW_KPI_ORDER.map((status) => (
              <WorkflowStatusKpiCard
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
                  Workflow board
                </p>
                <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                  Track decoration events by prep status — drag between columns
                  or open to manage
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setWorkflowView("pipeline")}
                  className={cn(
                    dashboardControlClass,
                    "h-8 gap-1.5 px-2.5 text-xs font-semibold",
                    workflowView === "pipeline" &&
                      "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
                  )}
                >
                  <LayoutGrid className="size-3.5" />
                  Board
                </button>
                <button
                  type="button"
                  onClick={() => setWorkflowView("list")}
                  className={cn(
                    dashboardControlClass,
                    "h-8 gap-1.5 px-2.5 text-xs font-semibold",
                    workflowView === "list" &&
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
                  className={cn(
                    dashboardControlClass,
                    "h-8 text-xs text-[#616161]"
                  )}
                >
                  Clear status filter
                </button>
              ) : null}
            </div>

            <div className="p-3 sm:p-4">
              {workflowView === "pipeline" ? (
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
        </>
      )}

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
