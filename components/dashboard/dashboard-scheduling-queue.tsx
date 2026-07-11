"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  FlowProgressDots,
  FlowStepList,
} from "@/components/calendar/order-production-flow";
import { RushBadge } from "@/components/status-badges";
import { decorationLabel, formatDate } from "@/lib/format";
import { formatOrderRef } from "@/lib/order-display";
import type { SchedulingQueueOrder } from "@/lib/event-basket";
import type { HealthStatus } from "@/lib/order-health";
import {
  allProductionEventsScheduledMessage,
  formatEventsLeft,
  productionEventsLabel,
} from "@/lib/terminology";
import { cn } from "@/lib/utils";

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

function SchedulingQueueOrderCard({ item }: { item: SchedulingQueueOrder }) {
  const next = item.nextEvent;
  const remainingSteps = item.flowSteps.filter(
    (step) => step.status !== "scheduled"
  ).length;
  const href = `/app/orders/${item.orderId}`;

  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-xl border border-border/60 bg-slate-50/40 px-4 py-3.5 transition-colors sm:px-5",
        "hover:border-border hover:bg-slate-50 hover:shadow-sm",
        item.rush && "border-l-[3px] border-l-orange-500 bg-orange-50/30"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-brand-ink transition-colors group-hover:text-brand-primary">
              {formatOrderRef(item)}
            </span>
            <span className="text-sm text-brand-muted truncate">
              {item.customerName}
            </span>
            {item.rush && <RushBadge />}
            {!item.artworkApproved && item.artworkLabel && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                {item.artworkLabel}
              </span>
            )}
          </div>

          {next ? (
            <p className="text-sm text-brand-ink">
              <span className="text-brand-muted">Next up: </span>
              {next.imprintLabel}
              <span className="text-brand-muted">
                {" "}
                · {decorationLabel(next.decoration)}
                {next.pieceCount > 0 && ` · ${next.pieceCount.toLocaleString()} pcs`}
              </span>
            </p>
          ) : (
            <p className="text-sm text-brand-muted">
              Waiting on earlier events before the next one can be scheduled
            </p>
          )}

          {!item.artworkApproved && (
            <p className="text-xs text-amber-800">
              Artwork approval still needed before these can go on the calendar
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-brand-muted">
            <span className={urgencyStyles(item.dueUrgency)}>
              {item.dueLabel}
            </span>
            <span>ETA {formatDate(item.inHandsDate)}</span>
            {item.totalPieceCount > 0 && (
              <span>{item.totalPieceCount.toLocaleString()} pcs total</span>
            )}
            <span>
              {item.progress.scheduled}/{item.progress.total} scheduled
              {remainingSteps > 0 && ` · ${formatEventsLeft(remainingSteps)}`}
            </span>
          </div>
        </div>

        {item.flowSteps.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <FlowProgressDots steps={item.flowSteps} />
            <ArrowRight className="size-4 text-brand-primary opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
          </div>
        )}
      </div>

      {item.flowSteps.length > 0 && (
        <div className="mt-3 border-t border-border/50 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            {productionEventsLabel}
          </p>
          <FlowStepList steps={item.flowSteps} alwaysShow />
        </div>
      )}
    </Link>
  );
}

export function DashboardSchedulingQueue({
  items,
  className,
}: {
  items: SchedulingQueueOrder[];
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border/80 bg-slate-50/50 px-4 py-8 text-center text-sm text-brand-muted",
          className
        )}
      >
        {allProductionEventsScheduledMessage}
      </div>
    );
  }

  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item) => (
        <li key={item.orderId}>
          <SchedulingQueueOrderCard item={item} />
        </li>
      ))}
    </ul>
  );
}
