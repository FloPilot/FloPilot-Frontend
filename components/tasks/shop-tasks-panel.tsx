"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Clock3,
  ExternalLink,
  Layers,
  Package,
  Palette,
  Zap,
} from "lucide-react";
import { ArtworkDetailDialog } from "@/components/artwork/artwork-detail-dialog";
import { ScheduleJobDialog } from "@/components/calendar/schedule-job-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ArtworkQueueEntry } from "@/lib/artwork-queue";
import type {
  DashboardAttentionItem,
  DashboardAttentionKind,
  DashboardLiveStats,
} from "@/lib/dashboard-insights";
import type { SchedulingQueueOrder } from "@/lib/event-basket";
import {
  buildExpandedShopTasks,
  countShopTasksByDashboardStatus,
  countShopTasksByWorkflow,
  filterShopTasks,
  SHOP_TASK_DASHBOARD_HINTS,
  SHOP_TASK_DASHBOARD_LABELS,
  SHOP_TASK_WORKFLOW_HINTS,
  SHOP_TASK_WORKFLOW_LABELS,
  SHOP_TASK_WORKFLOW_ORDER,
  type ShopTask,
  type ShopTaskDashboardStatus,
  type ShopTaskFilter,
  type ShopTaskWorkflowStatus,
} from "@/lib/shop-tasks";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardKpiCardClass,
  dashboardKpiTitleClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import { formatProductionEventsAcrossOrders } from "@/lib/terminology";
import { cn } from "@/lib/utils";
import type { Order, ScheduleBlock, StationJobRun, Task } from "@/types";
import {
  AttentionArtworkList,
  AttentionOrderList,
  AttentionScheduleList,
  ATTENTION_MODAL_COPY,
} from "@/components/tasks/shop-tasks-modals";
import { OrderScheduleSheet } from "@/components/tasks/order-schedule-sheet";
import { ProductionEventSheet } from "@/components/tasks/production-event-sheet";

const KIND_ICON: Record<
  DashboardAttentionKind | "production" | "production_event",
  LucideIcon
> = {
  schedule: CalendarPlus,
  artwork: Palette,
  approval: ClipboardList,
  rush: Zap,
  overdue: Clock3,
  ready_to_ship: Package,
  inventory: Package,
  production: ClipboardList,
  production_event: Layers,
};

type FilterCardStyle = {
  icon: LucideIcon;
  surface: string;
  border: string;
  activeRing: string;
  iconWrap: string;
  iconColor: string;
  labelColor: string;
};

const DASHBOARD_FILTER_CARD: Record<ShopTaskDashboardStatus, FilterCardStyle> =
  {
    open: {
      icon: CircleDot,
      surface: "bg-[#f0f5ff]",
      border: "border-[#c5d9f8]",
      activeRing: "ring-[#2c6ecb]/35",
      iconWrap: "bg-[#ebf4ff]",
      iconColor: "text-[#2c6ecb]",
      labelColor: "text-[#2c6ecb]",
    },
    urgent: {
      icon: AlertCircle,
      surface: "bg-[#fff4f4]",
      border: "border-[#f5c4c4]",
      activeRing: "ring-[#d82c0d]/30",
      iconWrap: "bg-[#fcebec]",
      iconColor: "text-[#d82c0d]",
      labelColor: "text-[#d82c0d]",
    },
    completed: {
      icon: CheckCircle2,
      surface: "bg-[#f1f8f0]",
      border: "border-[#b8ddb0]",
      activeRing: "ring-[#108043]/30",
      iconWrap: "bg-[#e3f1df]",
      iconColor: "text-[#108043]",
      labelColor: "text-[#108043]",
    },
  };

const WORKFLOW_FILTER_CARD: Record<ShopTaskWorkflowStatus, FilterCardStyle> = {
  urgent: DASHBOARD_FILTER_CARD.urgent,
  needs_action: DASHBOARD_FILTER_CARD.open,
  in_progress: {
    icon: Activity,
    surface: "bg-[#f0f5ff]",
    border: "border-[#c5d9f8]",
    activeRing: "ring-[#2c6ecb]/35",
    iconWrap: "bg-[#ebf4ff]",
    iconColor: "text-[#2c6ecb]",
    labelColor: "text-[#2c6ecb]",
  },
  blocked: {
    icon: AlertTriangle,
    surface: "bg-[#fff8f0]",
    border: "border-[#f0d9b8]",
    activeRing: "ring-[#b98900]/30",
    iconWrap: "bg-[#fff5ea]",
    iconColor: "text-[#b98900]",
    labelColor: "text-[#b98900]",
  },
  completed: DASHBOARD_FILTER_CARD.completed,
};

const WORKFLOW_BADGE: Record<
  ShopTaskWorkflowStatus,
  { label: string; className: string }
> = {
  urgent: { label: "Urgent", className: "bg-[#fcebec] text-[#d82c0d]" },
  needs_action: {
    label: "Needs attention",
    className: "bg-[#ebf4ff] text-[#2c6ecb]",
  },
  in_progress: {
    label: "In progress",
    className: "bg-[#ebf4ff] text-[#2c6ecb]",
  },
  blocked: { label: "Blocked", className: "bg-[#fff5ea] text-[#b98900]" },
  completed: { label: "Completed", className: "bg-[#e3f1df] text-[#108043]" },
};

function workflowIconClass(workflow: ShopTaskWorkflowStatus) {
  switch (workflow) {
    case "urgent":
      return "bg-[#fcebec] text-[#d82c0d]";
    case "blocked":
      return "bg-[#fff5ea] text-[#b98900]";
    case "in_progress":
      return "bg-[#ebf4ff] text-[#2c6ecb]";
    case "completed":
      return "bg-[#e3f1df] text-[#108043]";
    default:
      return "bg-[#ebf4ff] text-[#2c6ecb]";
  }
}

const KIND_LABEL: Record<
  DashboardAttentionKind | "production" | "production_event",
  string
> = {
  schedule: "Schedule",
  artwork: "Proof",
  approval: "Approval",
  rush: "Rush",
  overdue: "Overdue",
  ready_to_ship: "Ship",
  inventory: "Inventory",
  production: "Floor",
  production_event: "Event",
};

const KIND_BADGE_CLASS: Record<
  DashboardAttentionKind | "production" | "production_event",
  string
> = {
  schedule: "bg-[#ebf4ff] text-[#2c6ecb]",
  artwork: "bg-[#f3f0ff] text-[#6d5bd0]",
  approval: "bg-[#fff5ea] text-[#b98900]",
  rush: "bg-[#fcebec] text-[#d82c0d]",
  overdue: "bg-[#fcebec] text-[#d82c0d]",
  ready_to_ship: "bg-[#e3f1df] text-[#108043]",
  inventory: "bg-[#fff5ea] text-[#b98900]",
  production: "bg-[#f1f1f1] text-[#616161]",
  production_event: "bg-[#f3f0ff] text-[#6d5bd0]",
};

function TaskFilterCard({
  label,
  hint,
  style,
  value,
  active,
  onClick,
}: {
  label: string;
  hint: string;
  style: FilterCardStyle;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = style.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        dashboardKpiCardClass,
        "min-h-[128px] w-full border text-left",
        style.surface,
        style.border,
        active && cn("ring-2", style.activeRing)
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              style.iconWrap
            )}
          >
            <Icon className={cn("size-3.5", style.iconColor)} strokeWidth={1.75} />
          </div>
          <p className={dashboardKpiTitleClass}>{label}</p>
        </div>
        {active ? (
          <span
            className={cn(
              "rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              style.iconWrap,
              style.labelColor
            )}
          >
            Active
          </span>
        ) : null}
      </div>
      <p className={cn(dashboardValueClass, "mt-2.5")}>{value}</p>
      <p className="mt-1.5 text-xs leading-snug text-[#616161]">{hint}</p>
    </button>
  );
}

function TaskRowAction({
  kind,
}: {
  kind: "schedule" | "review" | "open";
}) {
  if (kind === "open") {
    return <ChevronRight className="size-4 shrink-0 text-[#616161]" />;
  }

  const Icon = kind === "schedule" ? CalendarPlus : Palette;
  const label = kind === "schedule" ? "Schedule" : "Review";

  return (
    <span
      className={cn(
        dashboardControlClass,
        "task-row-action h-8 shrink-0 gap-1.5 px-2.5 text-xs font-semibold text-[#303030]"
      )}
    >
      <Icon className="size-3.5 text-[#616161]" strokeWidth={1.75} />
      {label}
      <ChevronRight className="size-3.5 text-[#616161]" strokeWidth={2} />
    </span>
  );
}

function TaskRow({
  task,
  onActivate,
  layout = "dashboard",
}: {
  task: ShopTask;
  onActivate: (task: ShopTask) => void;
  layout?: "dashboard" | "page";
}) {
  const Icon = KIND_ICON[task.kind];
  const hasDirectAction =
    Boolean(task.scheduleJobKey) ||
    Boolean(task.artworkEntry) ||
    Boolean(task.attentionItem) ||
    Boolean(task.productionEvent);
  const workflowBadge = WORKFLOW_BADGE[task.workflowStatus];
  const iconClass =
    layout === "page"
      ? workflowIconClass(task.workflowStatus)
      : task.status === "urgent"
        ? "bg-[#fcebec] text-[#d82c0d]"
        : task.status === "completed"
          ? "bg-[#e3f1df] text-[#108043]"
          : "bg-[#ebf4ff] text-[#2c6ecb]";

  const content = (
    <>
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          iconClass
        )}
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={dashboardTaskTitleClass}>{task.title}</p>
          {layout === "page" ? (
            <span
              className={cn(
                "rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                workflowBadge.className
              )}
            >
              {workflowBadge.label}
            </span>
          ) : null}
          <span
            className={cn(
              "rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              KIND_BADGE_CLASS[task.kind]
            )}
          >
            {KIND_LABEL[task.kind]}
          </span>
        </div>
        {task.detail ? (
          <p className={cn("mt-1", dashboardTaskDetailClass)}>{task.detail}</p>
        ) : null}
      </div>
      <TaskRowAction
        kind={
          task.scheduleJobKey
            ? "schedule"
            : task.artworkEntry
              ? "review"
              : "open"
        }
      />
    </>
  );

  const rowClass = cn(
    "group flex w-full items-center gap-3.5 text-left transition-colors",
    layout === "page"
      ? cn(
          dashboardInsetSurfaceClass,
          "px-4 py-3.5 hover:border-[#c9cccf] hover:bg-[#fafafa] sm:px-4"
        )
      : cn(
          "border-b border-[#ebebeb] px-4 py-4 last:border-b-0 hover:bg-[#fafafa] sm:px-5",
          (task.scheduleJobKey || task.artworkEntry) &&
            "hover:[&_.task-row-action]:border-[#c9cccf] hover:[&_.task-row-action]:bg-white"
        )
  );

  if (hasDirectAction) {
    return (
      <button
        type="button"
        onClick={() => onActivate(task)}
        className={rowClass}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={task.href} className={rowClass}>
      {content}
    </Link>
  );
}

function WorkloadSummary({ tasks }: { tasks: ShopTask[] }) {
  const active = tasks.filter((task) => task.workflowStatus !== "completed");
  if (active.length === 0) return null;

  const buckets: { label: string; count: number }[] = [];
  const schedule = active.filter((t) => t.kind === "schedule").length;
  const events = active.filter((t) => t.kind === "production_event").length;
  const artwork = active.filter((t) => t.kind === "artwork").length;
  const rush = active.filter((t) => t.kind === "rush").length;
  const overdue = active.filter((t) => t.kind === "overdue").length;
  const approval = active.filter((t) => t.kind === "approval").length;
  const ship = active.filter((t) => t.kind === "ready_to_ship").length;
  const production = active.filter((t) => t.kind === "production").length;
  const inventory = active.filter((t) => t.kind === "inventory").length;

  if (schedule > 0) buckets.push({ label: "to schedule", count: schedule });
  if (events > 0) buckets.push({ label: "production events", count: events });
  if (artwork > 0) buckets.push({ label: "proofs", count: artwork });
  if (rush > 0) buckets.push({ label: "rush", count: rush });
  if (overdue > 0) buckets.push({ label: "overdue", count: overdue });
  if (approval > 0) buckets.push({ label: "approvals", count: approval });
  if (ship > 0) buckets.push({ label: "ready to ship", count: ship });
  if (production > 0) buckets.push({ label: "floor tasks", count: production });
  if (inventory > 0) buckets.push({ label: "low stock", count: inventory });

  if (buckets.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 rounded-lg border border-[#e3e3e3] bg-white px-3.5 py-2.5 text-[13px] text-[#616161] shadow-sm">
      <span className="font-semibold text-[#303030]">
        {active.length} action{active.length !== 1 ? "s" : ""}
      </span>
      <span className="text-[#8a8a8a]">·</span>
      {buckets.map((bucket, index) => (
        <span key={bucket.label}>
          {index > 0 ? <span className="text-[#8a8a8a]"> · </span> : null}
          <span className="font-medium text-[#303030]">{bucket.count}</span>{" "}
          {bucket.label}
        </span>
      ))}
    </div>
  );
}

function ListSectionHeader({
  label,
  count,
  layout = "dashboard",
}: {
  label: string;
  count: number;
  layout?: "dashboard" | "page";
}) {
  if (count === 0) return null;

  if (layout === "page") {
    return (
      <p className="px-1 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.06em] text-[#616161] first:pt-0">
        {label} · {count}
      </p>
    );
  }

  return (
    <div className="border-b border-[#ebebeb] bg-[#fafafa] px-4 py-2.5 sm:px-5">
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#616161]">
        {label} · {count}
      </p>
    </div>
  );
}

function TaskListHeader({
  totalCount,
  hiddenCount,
}: {
  totalCount: number;
  hiddenCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3 sm:px-5">
      <div>
        <p className="text-sm font-semibold text-[#303030]">Action queue</p>
        <p className="mt-0.5 text-xs text-[#616161]">
          {totalCount === 0
            ? "Nothing waiting right now"
            : "Tap a row to schedule, review, or open the order"}
        </p>
      </div>
      {hiddenCount > 0 ? (
        <Link
          href="/app/tasks"
          className="text-xs font-semibold text-brand-primary hover:underline"
        >
          +{hiddenCount} more
        </Link>
      ) : null}
    </div>
  );
}

function AttentionModalShell({
  open,
  onOpenChange,
  title,
  description,
  summary,
  footer,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  summary?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,840px)] w-[calc(100vw-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-lg border-[#e3e3e3] p-0 shadow-xl sm:max-w-5xl">
        <DialogHeader className="border-b border-[#ebebeb] bg-[#fafafa] px-6 py-5 text-left sm:px-8">
          <DialogTitle className="text-xl font-bold tracking-tight text-[#303030]">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="mt-1.5 text-sm leading-relaxed text-[#616161]">
              {description}
            </DialogDescription>
          ) : null}
          {summary ? (
            <p className="mt-3 inline-flex w-fit rounded-lg border border-[#e3e3e3] bg-white px-3.5 py-2 text-xs font-semibold text-[#303030] shadow-sm">
              {summary}
            </p>
          ) : null}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto bg-[#f6f6f7] px-6 py-5 sm:px-8 sm:py-6">
          {children}
        </div>
        {footer ? (
          <div className="flex items-center justify-between gap-3 border-t border-[#ebebeb] bg-[#fafafa] px-6 py-4 sm:px-8">
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export type ShopTasksPanelProps = {
  attentionItems: DashboardAttentionItem[];
  productionTasks: Task[];
  schedulingQueue: SchedulingQueueOrder[];
  artworkPendingEntries: ArtworkQueueEntry[];
  awaitingApprovalOrders: Order[];
  rushOrdersList: Order[];
  overdueOrders: Order[];
  readyToShipOrders: Order[];
  orders?: Order[];
  scheduleBlocks?: ScheduleBlock[];
  jobRuns?: StationJobRun[];
  stats: Pick<
    DashboardLiveStats,
    "toSchedule" | "toScheduleOrders" | "lowStockItems"
  >;
  limit?: number;
  layout?: "dashboard" | "page";
  initialFilter?: ShopTaskFilter;
  filter?: ShopTaskFilter;
  onFilterChange?: (filter: ShopTaskFilter) => void;
};

export function ShopTasksPanel({
  attentionItems,
  productionTasks,
  schedulingQueue,
  artworkPendingEntries,
  awaitingApprovalOrders,
  rushOrdersList,
  overdueOrders,
  readyToShipOrders,
  orders = [],
  scheduleBlocks = [],
  jobRuns = [],
  stats,
  limit,
  layout = "dashboard",
  initialFilter = "all",
  filter: controlledFilter,
  onFilterChange,
}: ShopTasksPanelProps) {
  const [internalFilter, setInternalFilter] =
    useState<ShopTaskFilter>(initialFilter);
  const filter = controlledFilter ?? internalFilter;

  const setFilter = (next: ShopTaskFilter) => {
    if (onFilterChange) {
      onFilterChange(next);
    } else {
      setInternalFilter(next);
    }
  };
  const [activeItem, setActiveItem] = useState<DashboardAttentionItem | null>(
    null
  );
  const [scheduleSheet, setScheduleSheet] = useState<{
    orderId: string;
    jobKey: string;
  } | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [schedulePrefill, setSchedulePrefill] = useState<{
    jobKey: string;
    orderId: string;
  }>();
  const [artworkEntry, setArtworkEntry] = useState<ArtworkQueueEntry | null>(
    null
  );
  const [productionEvent, setProductionEvent] = useState<{
    orderId: string;
    jobId: string;
    imprintId: string;
  } | null>(null);

  const allTasks = useMemo(
    () =>
      buildExpandedShopTasks({
        attentionItems,
        productionTasks,
        schedulingQueue,
        artworkPendingEntries,
        awaitingApprovalOrders,
        rushOrdersList,
        overdueOrders,
        readyToShipOrders,
        lowStockItems: stats.lowStockItems,
        orders,
        scheduleBlocks,
        jobRuns,
        includeCompleted: true,
      }),
    [
      attentionItems,
      productionTasks,
      schedulingQueue,
      artworkPendingEntries,
      awaitingApprovalOrders,
      rushOrdersList,
      overdueOrders,
      readyToShipOrders,
      stats.lowStockItems,
      orders,
      scheduleBlocks,
      jobRuns,
    ]
  );

  const dashboardCounts = useMemo(
    () => countShopTasksByDashboardStatus(allTasks),
    [allTasks]
  );
  const workflowCounts = useMemo(
    () => countShopTasksByWorkflow(allTasks),
    [allTasks]
  );

  const filteredTasks = useMemo(
    () => filterShopTasks(allTasks, filter, layout),
    [allTasks, filter, layout]
  );

  const visibleTasks = useMemo(() => {
    return limit ? filteredTasks.slice(0, limit) : filteredTasks;
  }, [filteredTasks, limit]);

  const hiddenCount = limit
    ? Math.max(0, filteredTasks.length - limit)
    : 0;

  const urgentVisible = visibleTasks.filter(
    (task) => task.workflowStatus === "urgent"
  );
  const openVisible = visibleTasks.filter((task) => task.status === "open");
  const completedVisible = visibleTasks.filter(
    (task) => task.workflowStatus === "completed"
  );

  const workflowSections = useMemo(() => {
    return SHOP_TASK_WORKFLOW_ORDER.map((status) => ({
      status,
      label: SHOP_TASK_WORKFLOW_LABELS[status],
      tasks: visibleTasks.filter((task) => task.workflowStatus === status),
    }));
  }, [visibleTasks]);

  const openScheduleFor = (jobKey: string, orderId: string) => {
    setSchedulePrefill({ jobKey, orderId });
    setScheduleDialogOpen(true);
  };

  const openOrderScheduleSheet = (orderId: string, jobKey?: string) => {
    setScheduleSheet({ orderId, jobKey: jobKey ?? "" });
  };

  const handleTaskActivate = (task: ShopTask) => {
    if (task.productionEvent) {
      setProductionEvent({
        orderId: task.productionEvent.orderId,
        jobId: task.productionEvent.jobId,
        imprintId: task.productionEvent.imprintId,
      });
      return;
    }
    if (task.scheduleJobKey && task.scheduleOrderId) {
      openOrderScheduleSheet(task.scheduleOrderId, task.scheduleJobKey);
      return;
    }
    if (task.artworkEntry) {
      setArtworkEntry(task.artworkEntry);
      return;
    }
    if (task.attentionItem) {
      setActiveItem(task.attentionItem);
    }
  };

  const modalCopy = activeItem ? ATTENTION_MODAL_COPY[activeItem.kind] : null;

  const modalSummary = useMemo(() => {
    if (!activeItem) return undefined;
    switch (activeItem.kind) {
      case "schedule":
        return formatProductionEventsAcrossOrders(
          stats.toSchedule,
          stats.toScheduleOrders
        );
      case "rush":
        return `${rushOrdersList.length} active rush order${rushOrdersList.length !== 1 ? "s" : ""}`;
      case "overdue":
        return `${overdueOrders.length} overdue order${overdueOrders.length !== 1 ? "s" : ""}`;
      case "approval":
        return `${awaitingApprovalOrders.length} awaiting approval`;
      case "artwork":
        return `${artworkPendingEntries.length} proof${artworkPendingEntries.length !== 1 ? "s" : ""} in queue`;
      case "ready_to_ship":
        return `${readyToShipOrders.length} ready to ship`;
      case "inventory":
        return `${stats.lowStockItems} below reorder point`;
      default:
        return undefined;
    }
  }, [
    activeItem,
    stats,
    rushOrdersList.length,
    overdueOrders.length,
    awaitingApprovalOrders.length,
    artworkPendingEntries.length,
    readyToShipOrders.length,
  ]);

  const modalFooter = activeItem ? (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-lg text-[#616161]"
        nativeButton={false}
        render={<Link href={activeItem.href} />}
      >
        <ExternalLink className="size-3.5" />
        Open full page
      </Button>
      <Button
        type="button"
        variant="outline"
        className="rounded-lg bg-white"
        onClick={() => setActiveItem(null)}
      >
        Done
      </Button>
    </>
  ) : null;

  const renderModalBody = () => {
    if (!activeItem) return null;

    switch (activeItem.kind) {
      case "schedule":
        return (
          <AttentionScheduleList
            queue={schedulingQueue}
            onSchedule={(jobKey, orderId) =>
              openOrderScheduleSheet(orderId, jobKey)
            }
            onOpenOrder={openOrderScheduleSheet}
          />
        );
      case "artwork":
        return (
          <AttentionArtworkList
            entries={artworkPendingEntries}
            onReview={setArtworkEntry}
          />
        );
      case "approval":
        return (
          <AttentionOrderList
            orders={awaitingApprovalOrders}
            emptyMessage="No orders waiting on customer approval."
          />
        );
      case "rush":
        return (
          <AttentionOrderList
            orders={rushOrdersList}
            emptyMessage="No active rush orders right now."
            renderAction={(order) => (
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg bg-white text-xs"
                nativeButton={false}
                render={
                  <Link href={`/app/orders/${order.id}?tab=production`} />
                }
              >
                Production
              </Button>
            )}
          />
        );
      case "overdue":
        return (
          <AttentionOrderList
            orders={overdueOrders}
            emptyMessage="No overdue orders."
          />
        );
      case "ready_to_ship":
        return (
          <AttentionOrderList
            orders={readyToShipOrders}
            emptyMessage="No orders ready to ship."
          />
        );
      case "inventory":
        return (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-5 py-4">
              <p className="text-sm font-semibold text-amber-950">
                {stats.lowStockItems} item
                {stats.lowStockItems !== 1 ? "s" : ""} below reorder point
              </p>
              <p className="mt-1 text-sm text-amber-900/80">
                Check blanks and supplies before scheduling large runs.
              </p>
            </div>
            <Button
              className="w-full rounded-lg"
              nativeButton={false}
              render={<Link href="/app/inventory" />}
            >
              Review inventory
              <ArrowRight className="size-4" />
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  const toggleFilter = (status: ShopTaskFilter) => {
    setFilter(filter === status ? "all" : status);
  };

  const filterLabel =
    filter === "all"
      ? ""
      : layout === "page" && filter !== "open"
        ? SHOP_TASK_WORKFLOW_LABELS[filter as ShopTaskWorkflowStatus].toLowerCase()
        : SHOP_TASK_DASHBOARD_LABELS[
            filter as ShopTaskDashboardStatus
          ].toLowerCase();

  const renderTaskList = () => {
    if (visibleTasks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
          <CheckCircle2 className="size-8 text-[#108043]/70" strokeWidth={1.5} />
          <p className="mt-3 text-[15px] font-semibold text-[#303030]">
            {filter === "completed"
              ? "No completed tasks yet"
              : "You're caught up"}
          </p>
          <p className={cn("mt-1", dashboardTaskDetailClass)}>
            {filter === "all"
              ? layout === "page"
                ? "No tasks match the current view."
                : "Nothing needs attention right now."
              : `No ${filterLabel} tasks to show.`}
          </p>
        </div>
      );
    }

    const rowProps = {
      onActivate: handleTaskActivate,
      layout,
    } as const;

    if (filter !== "all") {
      const rows = visibleTasks.map((task) => (
        <TaskRow key={task.id} task={task} {...rowProps} />
      ));
      return layout === "page" ? (
        <div className="flex flex-col gap-2 p-3 sm:p-4">{rows}</div>
      ) : (
        rows
      );
    }

    if (layout === "page") {
      return (
        <div className="flex flex-col gap-2 p-3 sm:p-4">
          {workflowSections.map((section) => (
            <div key={section.status}>
              <ListSectionHeader
                label={section.label}
                count={section.tasks.length}
                layout="page"
              />
              {section.tasks.map((task) => (
                <TaskRow key={task.id} task={task} {...rowProps} />
              ))}
            </div>
          ))}
        </div>
      );
    }

    return (
      <>
        <ListSectionHeader label="Urgent" count={urgentVisible.length} />
        {urgentVisible.map((task) => (
          <TaskRow key={task.id} task={task} {...rowProps} />
        ))}
        <ListSectionHeader label="Open" count={openVisible.length} />
        {openVisible.map((task) => (
          <TaskRow key={task.id} task={task} {...rowProps} />
        ))}
        {completedVisible.length > 0 ? (
          <>
            <ListSectionHeader
              label="Completed"
              count={completedVisible.length}
            />
            {completedVisible.map((task) => (
              <TaskRow key={task.id} task={task} {...rowProps} />
            ))}
          </>
        ) : null}
      </>
    );
  };

  const renderFilterCards = () => {
    if (layout === "page") {
      return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {SHOP_TASK_WORKFLOW_ORDER.map((status) => (
            <TaskFilterCard
              key={status}
              label={SHOP_TASK_WORKFLOW_LABELS[status]}
              hint={SHOP_TASK_WORKFLOW_HINTS[status]}
              style={WORKFLOW_FILTER_CARD[status]}
              value={workflowCounts[status]}
              active={filter === status}
              onClick={() => toggleFilter(status)}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(["open", "urgent", "completed"] as const).map((status) => (
          <TaskFilterCard
            key={status}
            label={SHOP_TASK_DASHBOARD_LABELS[status]}
            hint={SHOP_TASK_DASHBOARD_HINTS[status]}
            style={DASHBOARD_FILTER_CARD[status]}
            value={dashboardCounts[status]}
            active={filter === status}
            onClick={() => toggleFilter(status)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {renderFilterCards()}

      <WorkloadSummary tasks={allTasks} />

      <section className={cn(dashboardCardClass, "overflow-hidden")}>
        <TaskListHeader
          totalCount={filteredTasks.length}
          hiddenCount={hiddenCount}
        />
        {renderTaskList()}
      </section>

      <AttentionModalShell
        open={activeItem !== null}
        onOpenChange={(open) => {
          if (!open) setActiveItem(null);
        }}
        title={modalCopy?.title ?? activeItem?.label ?? ""}
        description={
          activeItem && modalCopy?.description
            ? modalCopy.description(activeItem)
            : activeItem?.detail
        }
        summary={modalSummary}
        footer={modalFooter}
      >
        {renderModalBody()}
      </AttentionModalShell>

      <ProductionEventSheet
        open={productionEvent !== null}
        onOpenChange={(open) => {
          if (!open) setProductionEvent(null);
        }}
        orderId={productionEvent?.orderId ?? null}
        jobId={productionEvent?.jobId ?? null}
        imprintId={productionEvent?.imprintId ?? null}
        onSchedule={() => {
          if (!productionEvent) return;
          const task = allTasks.find(
            (entry) =>
              entry.productionEvent?.orderId === productionEvent.orderId &&
              entry.productionEvent.jobId === productionEvent.jobId &&
              entry.productionEvent.imprintId === productionEvent.imprintId
          );
          if (task?.scheduleJobKey && task.scheduleOrderId) {
            openOrderScheduleSheet(task.scheduleOrderId, task.scheduleJobKey);
          }
        }}
      />

      <OrderScheduleSheet
        open={scheduleSheet !== null}
        onOpenChange={(open) => {
          if (!open) setScheduleSheet(null);
        }}
        orderId={scheduleSheet?.orderId ?? null}
        selectedJobKey={scheduleSheet?.jobKey ?? null}
        schedulingQueue={schedulingQueue}
        onScheduleEvent={openScheduleFor}
      />

      <ScheduleJobDialog
        open={scheduleDialogOpen}
        onOpenChange={(open) => {
          setScheduleDialogOpen(open);
          if (!open) setSchedulePrefill(undefined);
        }}
        prefillJobKey={schedulePrefill?.jobKey}
        filterOrderId={schedulePrefill?.orderId}
      />

      <ArtworkDetailDialog
        entry={artworkEntry}
        open={artworkEntry !== null}
        onOpenChange={(open) => {
          if (!open) setArtworkEntry(null);
        }}
      />
    </div>
  );
}
