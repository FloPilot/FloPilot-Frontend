"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarPlus,
  ChevronRight,
  ExternalLink,
  Package,
  Palette,
} from "lucide-react";
import { ArtworkDetailDialog } from "@/components/artwork/artwork-detail-dialog";
import { ScheduleJobDialog } from "@/components/calendar/schedule-job-dialog";
import { FlowProgressDots } from "@/components/calendar/order-production-flow";
import { OrderStatusBadge, RushBadge } from "@/components/status-badges";
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
} from "@/lib/dashboard-insights";
import type { SchedulingQueueOrder } from "@/lib/event-basket";
import { decorationLabel, formatDate } from "@/lib/format";
import type { HealthStatus } from "@/lib/order-health";
import {
  eventsToScheduleLabel,
  formatEventXOfY,
  formatProductionEventsAcrossOrders,
} from "@/lib/terminology";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";

function attentionAccent(tone: DashboardAttentionItem["tone"]) {
  switch (tone) {
    case "critical":
      return "border-l-red-500";
    case "warning":
      return "border-l-amber-500";
    default:
      return "border-l-brand-primary";
  }
}

function urgencyStyles(status: HealthStatus) {
  switch (status) {
    case "critical":
      return "text-red-700";
    case "warning":
      return "text-amber-800";
    default:
      return "text-brand-muted";
  }
}

function ModalEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-slate-50/50 px-4 py-10 text-center text-sm text-brand-muted">
      {children}
    </div>
  );
}

function AttentionModalShell({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88vh,720px)] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <DialogTitle className="text-lg font-semibold text-brand-ink">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-slate-50/50 px-6 py-3">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OrderAttentionRow({
  order,
  action,
  meta,
}: {
  order: Order;
  action?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <li className="rounded-xl border border-border/50 bg-slate-50/40 transition-colors hover:bg-slate-50">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href={`/app/orders/${order.id}`} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-brand-ink hover:text-brand-primary">
              {order.number}
            </span>
            <OrderStatusBadge status={order.status} />
            {order.rush && <RushBadge />}
          </div>
          <p className="mt-0.5 truncate text-xs text-brand-muted">
            {order.company} · Due {formatDate(order.inHandsDate)}
          </p>
          {meta}
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-full px-2 text-brand-muted"
            nativeButton={false}
            render={<Link href={`/app/orders/${order.id}`} />}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}

function AttentionScheduleList({
  queue,
  onSchedule,
}: {
  queue: SchedulingQueueOrder[];
  onSchedule: (jobKey: string, orderId: string) => void;
}) {
  const ready = useMemo(
    () => queue.filter((item) => item.nextEvent),
    [queue]
  );
  const waiting = useMemo(
    () => queue.filter((item) => !item.nextEvent),
    [queue]
  );

  if (queue.length === 0) {
    return (
      <ModalEmptyState>
        Nothing waiting to schedule — you&apos;re caught up.
      </ModalEmptyState>
    );
  }

  return (
    <div className="space-y-5">
      {ready.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            Ready to schedule · {ready.length}
          </p>
          <ul className="space-y-2">
            {ready.map((item) => {
              const next = item.nextEvent!;
              return (
                <li
                  key={item.orderId}
                  className={cn(
                    "rounded-xl border border-border/60 bg-white px-4 py-3.5 shadow-sm",
                    item.rush && "border-l-[3px] border-l-orange-500"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/app/orders/${item.orderId}`}
                          className="text-sm font-semibold text-brand-ink hover:text-brand-primary"
                        >
                          {item.orderNumber}
                        </Link>
                        <span className="truncate text-sm text-brand-muted">
                          {item.customerName}
                        </span>
                        {item.rush && <RushBadge />}
                      </div>
                      <p className="text-sm text-brand-ink">
                        <span className="text-brand-muted">Next: </span>
                        {next.imprintLabel}
                        <span className="text-brand-muted">
                          {" "}
                          · {decorationLabel(next.decoration)}
                          {next.pieceCount > 0 &&
                            ` · ${next.pieceCount.toLocaleString()} pcs`}
                        </span>
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-muted">
                        <span className={urgencyStyles(item.dueUrgency)}>
                          {item.dueLabel}
                        </span>
                        <span>ETA {formatDate(item.inHandsDate)}</span>
                        {next.flowTotal > 1 && (
                          <span className="inline-flex items-center gap-1.5">
                            <FlowProgressDots steps={item.flowSteps} />
                            {formatEventXOfY(next.flowStep, next.flowTotal)}
                          </span>
                        )}
                      </div>
                      {!item.artworkApproved && item.artworkLabel && (
                        <p className="text-xs text-amber-800">
                          {item.artworkLabel} — you can still schedule
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="h-9 shrink-0 rounded-full px-4 text-xs font-semibold"
                      onClick={() => onSchedule(next.key, item.orderId)}
                    >
                      <CalendarPlus className="size-3.5" />
                      Schedule
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {waiting.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            Waiting on earlier events · {waiting.length}
          </p>
          <ul className="space-y-2">
            {waiting.map((item) => (
              <li key={item.orderId}>
                <Link
                  href={`/app/orders/${item.orderId}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-slate-50/30 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-ink">
                      {item.orderNumber}
                      <span className="ml-2 font-normal text-brand-muted">
                        {item.customerName}
                      </span>
                    </p>
                    <p className="text-xs text-brand-muted">
                      Complete earlier production events first ·{" "}
                      {item.progress.scheduled}/{item.progress.total} scheduled
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-brand-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AttentionArtworkList({
  entries,
  onReview,
}: {
  entries: ArtworkQueueEntry[];
  onReview: (entry: ArtworkQueueEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <ModalEmptyState>No proofs waiting for review right now.</ModalEmptyState>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li
          key={`${entry.orderId}-${entry.imprintId}`}
          className="rounded-xl border border-border/50 bg-slate-50/40 transition-colors hover:bg-slate-50"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => onReview(entry)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-brand-ink">
                  {entry.orderNumber}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    entry.artwork.status === "revision_requested"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-slate-200 text-slate-700"
                  )}
                >
                  {entry.artwork.status === "revision_requested"
                    ? "Revision"
                    : "Pending"}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-brand-ink">{entry.imprintLabel}</p>
              <p className="mt-0.5 truncate text-xs text-brand-muted">
                {entry.company} · {decorationLabel(entry.decoration)} · Due{" "}
                {formatDate(entry.inHandsDate)}
              </p>
            </button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0 rounded-full bg-white text-xs"
              onClick={() => onReview(entry)}
            >
              <Palette className="size-3.5" />
              Review
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function AttentionOrderList({
  orders,
  emptyMessage,
  renderAction,
}: {
  orders: Order[];
  emptyMessage: string;
  renderAction?: (order: Order) => React.ReactNode;
}) {
  if (orders.length === 0) {
    return <ModalEmptyState>{emptyMessage}</ModalEmptyState>;
  }

  return (
    <ul className="space-y-2">
      {orders.map((order) => (
        <OrderAttentionRow
          key={order.id}
          order={order}
          action={renderAction?.(order)}
        />
      ))}
    </ul>
  );
}

const ATTENTION_MODAL_COPY: Record<
  DashboardAttentionKind,
  { title: string; description?: (item: DashboardAttentionItem) => string }
> = {
  schedule: {
    title: eventsToScheduleLabel,
    description: (item) => item.detail ?? "Pick an event and add it to the calendar",
  },
  artwork: {
    title: "Proofs need attention",
    description: () => "Review mockups, approve artwork, or send proofs to the customer",
  },
  approval: {
    title: "Awaiting customer approval",
    description: () => "Open the order to follow up or convert an approved quote",
  },
  rush: {
    title: "Active rush orders",
    description: () => "Prioritize these on the calendar and shop floor",
  },
  overdue: {
    title: "Past in-hands date",
    description: () => "These orders need immediate attention",
  },
  ready_to_ship: {
    title: "Ready to ship",
    description: () => "Production is complete — finalize shipping",
  },
  inventory: {
    title: "Low stock",
    description: () => "Check inventory before upcoming production runs",
  },
};

export function DashboardAttentionPanel({
  items,
  schedulingQueue,
  artworkPendingEntries,
  awaitingApprovalOrders,
  rushOrdersList,
  overdueOrders,
  readyToShipOrders,
  stats,
}: {
  items: DashboardAttentionItem[];
  schedulingQueue: SchedulingQueueOrder[];
  artworkPendingEntries: ArtworkQueueEntry[];
  awaitingApprovalOrders: Order[];
  rushOrdersList: Order[];
  overdueOrders: Order[];
  readyToShipOrders: Order[];
  stats: { toSchedule: number; toScheduleOrders: number; lowStockItems: number };
}) {
  const [activeItem, setActiveItem] = useState<DashboardAttentionItem | null>(
    null
  );
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [schedulePrefill, setSchedulePrefill] = useState<{
    jobKey: string;
    orderId: string;
  }>();
  const [artworkEntry, setArtworkEntry] = useState<ArtworkQueueEntry | null>(
    null
  );

  const openScheduleFor = (jobKey: string, orderId: string) => {
    setSchedulePrefill({ jobKey, orderId });
    setScheduleDialogOpen(true);
  };

  const modalCopy = activeItem ? ATTENTION_MODAL_COPY[activeItem.kind] : null;

  const modalFooter = activeItem && (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-full text-brand-muted"
        nativeButton={false}
        render={<Link href={activeItem.href} />}
      >
        <ExternalLink className="size-3.5" />
        Open full page
      </Button>
      <Button
        type="button"
        variant="outline"
        className="rounded-full bg-white"
        onClick={() => setActiveItem(null)}
      >
        Close
      </Button>
    </>
  );

  const renderModalBody = () => {
    if (!activeItem) return null;

    switch (activeItem.kind) {
      case "schedule":
        return (
          <AttentionScheduleList
            queue={schedulingQueue}
            onSchedule={openScheduleFor}
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
                className="h-8 rounded-full bg-white text-xs"
                nativeButton={false}
                render={<Link href={`/app/orders/${order.id}?tab=production`} />}
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
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                  <Package className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-950">
                    {stats.lowStockItems} item
                    {stats.lowStockItems !== 1 ? "s" : ""} below reorder point
                  </p>
                  <p className="mt-1 text-sm text-amber-900/80">
                    Review stock levels before scheduling large runs so you
                    don&apos;t get caught short on blanks or supplies.
                  </p>
                </div>
              </div>
            </div>
            <Button
              className="w-full rounded-full"
              nativeButton={false}
              render={<Link href="/app/inventory" />}
            >
              Open inventory
              <ArrowRight className="size-4" />
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-slate-50/50 px-4 py-8 text-center text-sm text-brand-muted">
        You&apos;re caught up — nothing needs immediate attention.
      </div>
    );
  }

  return (
    <>
      <ul className="w-full space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setActiveItem(item)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 border-l-[3px] bg-slate-50/40 px-4 py-3 text-left transition-colors hover:bg-slate-50",
                attentionAccent(item.tone)
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-brand-ink">{item.label}</p>
                {item.detail && (
                  <p className="mt-0.5 truncate text-xs text-brand-muted">
                    {item.detail}
                  </p>
                )}
              </div>
              <ArrowRight className="size-4 shrink-0 text-brand-muted/70" />
            </button>
          </li>
        ))}
      </ul>

      <AttentionModalShell
        open={activeItem !== null}
        onOpenChange={(open) => {
          if (!open) setActiveItem(null);
        }}
        title={modalCopy?.title ?? activeItem?.label ?? ""}
        description={
          activeItem && modalCopy?.description
            ? modalCopy.description(activeItem)
            : activeItem?.kind === "schedule" && stats.toScheduleOrders > 0
              ? formatProductionEventsAcrossOrders(
                  stats.toSchedule,
                  stats.toScheduleOrders
                )
              : activeItem?.detail
        }
        footer={modalFooter}
      >
        {renderModalBody()}
      </AttentionModalShell>

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
    </>
  );
}
