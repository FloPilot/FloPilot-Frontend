"use client";

import Link from "next/link";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Clock,
  Palette,
  Truck,
} from "lucide-react";
import { DashboardSchedulingQueue } from "@/components/dashboard/dashboard-scheduling-queue";
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
import type { SchedulingQueueOrder } from "@/lib/event-basket";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  eventsToScheduleLabel,
  formatProductionEventsAcrossOrders,
  productionEventsWaitingMessage,
} from "@/lib/terminology";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";

export type DashboardKpiKey =
  | "active_orders"
  | "events_to_schedule"
  | "due_this_week"
  | "proofs_pending";

type KpiConfig = {
  key: DashboardKpiKey;
  label: string;
  value: number;
  icon: LucideIcon;
  title: string;
  description: string;
};

function ModalEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-slate-50/50 px-4 py-10 text-center text-sm text-brand-muted">
      {children}
    </div>
  );
}

function OrderModalList({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return <ModalEmptyState>No orders in this group right now.</ModalEmptyState>;
  }

  return (
    <ul className="max-h-[min(60vh,520px)] space-y-2 overflow-y-auto pr-0.5">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/app/orders/${order.id}`}
            className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-slate-50/40 px-4 py-3 transition-colors hover:bg-slate-50"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-brand-ink">
                  {order.number}
                </span>
                <OrderStatusBadge status={order.status} />
                {order.rush && <RushBadge />}
              </div>
              <p className="mt-0.5 truncate text-xs text-brand-muted">
                {order.company} · Due {formatDate(order.inHandsDate)}
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium tabular-nums text-brand-ink">
              {formatCurrency(order.total)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ArtworkModalList({ entries }: { entries: ArtworkQueueEntry[] }) {
  if (entries.length === 0) {
    return (
      <ModalEmptyState>No proofs waiting for review right now.</ModalEmptyState>
    );
  }

  return (
    <ul className="max-h-[min(60vh,520px)] space-y-2 overflow-y-auto pr-0.5">
      {entries.map((entry) => (
        <li key={`${entry.orderId}-${entry.imprintId}`}>
          <Link
            href={`/app/orders/${entry.orderId}`}
            className="flex items-start justify-between gap-4 rounded-xl border border-border/50 bg-slate-50/40 px-4 py-3 transition-colors hover:bg-slate-50"
          >
            <div className="min-w-0">
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
                {entry.company} · Due {formatDate(entry.inHandsDate)}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function StatTileButton({
  label,
  value,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex h-full min-h-[5.5rem] flex-col rounded-2xl border border-white/80 bg-white px-4 py-4 text-left shadow-sm transition-all sm:px-5",
        "hover:border-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
          {label}
        </p>
        <div className="rounded-lg bg-slate-100 p-1.5 text-brand-muted">
          <Icon className="size-3.5" />
        </div>
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-brand-ink">
        {value}
      </p>
    </button>
  );
}

export function DashboardKpiSection({
  stats,
  activeOrdersList,
  schedulingQueue,
  dueThisWeekOrders,
  artworkPendingEntries,
  showProofsKpi = true,
}: {
  stats: {
    activeOrders: number;
    toSchedule: number;
    toScheduleOrders: number;
    dueThisWeek: number;
    artworkPending: number;
  };
  activeOrdersList: Order[];
  schedulingQueue: SchedulingQueueOrder[];
  dueThisWeekOrders: Order[];
  artworkPendingEntries: ArtworkQueueEntry[];
  showProofsKpi?: boolean;
}) {
  const [openKpi, setOpenKpi] = useState<DashboardKpiKey | null>(null);

  const allKpis: KpiConfig[] = [
    {
      key: "active_orders",
      label: "Active orders",
      value: stats.activeOrders,
      icon: Truck,
      title: "Active orders",
      description: "Approved, in production, and ready to ship",
    },
    {
      key: "events_to_schedule",
      label: eventsToScheduleLabel,
      value: stats.toSchedule,
      icon: Calendar,
      title: eventsToScheduleLabel,
      description:
        stats.toScheduleOrders > 0
          ? formatProductionEventsAcrossOrders(
              stats.toSchedule,
              stats.toScheduleOrders
            )
          : productionEventsWaitingMessage,
    },
    {
      key: "due_this_week",
      label: "Due this week",
      value: stats.dueThisWeek,
      icon: Clock,
      title: "Due this week",
      description: "Open orders with in-hands dates in the next 7 days",
    },
    {
      key: "proofs_pending",
      label: "Proofs pending",
      value: stats.artworkPending,
      icon: Palette,
      title: "Proofs pending",
      description: "Artwork awaiting review or customer revision",
    },
  ];

  const kpis = showProofsKpi
    ? allKpis
    : allKpis.filter((kpi) => kpi.key !== "proofs_pending");

  const activeKpi = kpis.find((kpi) => kpi.key === openKpi);

  return (
    <>
      <section
        className={cn(
          "grid w-full grid-cols-2 gap-3 sm:gap-4",
          kpis.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
        )}
      >
        {kpis.map((kpi) => (
          <StatTileButton
            key={kpi.key}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            onClick={() => setOpenKpi(kpi.key)}
          />
        ))}
      </section>

      <Dialog
        open={openKpi !== null}
        onOpenChange={(open) => {
          if (!open) setOpenKpi(null);
        }}
      >
        <DialogContent className="flex max-h-[min(88vh,720px)] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
          {activeKpi && (
            <>
              <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
                <DialogTitle className="text-lg font-semibold text-brand-ink">
                  {activeKpi.title}
                </DialogTitle>
                <DialogDescription>{activeKpi.description}</DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {openKpi === "active_orders" && (
                  <OrderModalList orders={activeOrdersList} />
                )}
                {openKpi === "events_to_schedule" && (
                  <DashboardSchedulingQueue items={schedulingQueue} />
                )}
                {openKpi === "due_this_week" && (
                  <OrderModalList orders={dueThisWeekOrders} />
                )}
                {openKpi === "proofs_pending" && (
                  <ArtworkModalList entries={artworkPendingEntries} />
                )}
              </div>

              <div className="flex justify-end border-t border-border/60 bg-slate-50/50 px-6 py-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full bg-white"
                  onClick={() => setOpenKpi(null)}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
