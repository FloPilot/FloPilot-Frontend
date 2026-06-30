"use client";

import {
  Calendar,
  CheckCircle2,
  CreditCard,
  Droplets,
  FileText,
  MessageSquare,
  RefreshCw,
  Send,
  StickyNote,
  Trash2,
  Upload,
} from "lucide-react";
import {
  activityActorLabel,
  buildOrderActivityFeed,
  formatActivityActorName,
  formatActivityTime,
  groupActivityByDate,
  inferActivityActorKind,
  shouldShowActivityActorName,
} from "@/lib/order-activity";
import type { Order, OrderActivityEvent } from "@/types";
import { useSchedule } from "@/components/providers/schedule-provider";
import { dashboardInsetSurfaceClass } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<
  OrderActivityEvent["type"],
  React.ComponentType<{ className?: string }>
> = {
  artwork_uploaded: Upload,
  artwork_approved: CheckCircle2,
  artwork_revision: RefreshCw,
  scheduled: Calendar,
  message: MessageSquare,
  payment: CreditCard,
  note: StickyNote,
  status: RefreshCw,
  file_uploaded: FileText,
  file_deleted: Trash2,
  proof_sent: Send,
  ink_updated: Droplets,
  review_sent: Send,
};

const ICON_STYLES: Record<OrderActivityEvent["type"], string> = {
  artwork_uploaded: "bg-[#eef1ff] text-brand-primary",
  artwork_approved: "bg-[#e8f5ee] text-[#0d5c2e]",
  artwork_revision: "bg-[#fff5ea] text-[#8a6116]",
  scheduled: "bg-[#eef1ff] text-brand-primary",
  message: "bg-[#f3f3f3] text-[#616161]",
  payment: "bg-[#e8f5ee] text-[#0d5c2e]",
  note: "bg-[#f8f4ff] text-[#6b4c9a]",
  status: "bg-[#f3f3f3] text-[#616161]",
  file_uploaded: "bg-[#eef1ff] text-brand-primary",
  file_deleted: "bg-[#fdf2f2] text-[#b42318]",
  proof_sent: "bg-[#eef1ff] text-brand-primary",
  ink_updated: "bg-[#eef1ff] text-brand-primary",
  review_sent: "bg-[#eef1ff] text-brand-primary",
};

const ACTOR_STYLES: Record<
  ReturnType<typeof inferActivityActorKind>,
  string
> = {
  customer: "bg-[#fff5ea] text-[#8a6116]",
  shop: "bg-[#eef1ff] text-brand-primary",
  system: "bg-[#f3f3f3] text-[#616161]",
};

function ActivityIcon({ type }: { type: OrderActivityEvent["type"] }) {
  const Icon = ICON_MAP[type] ?? RefreshCw;
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        ICON_STYLES[type] ?? ICON_STYLES.status
      )}
    >
      <Icon className="size-3.5" />
    </div>
  );
}

function ActivityRow({
  order,
  event,
  isLast,
}: {
  order: Order;
  event: OrderActivityEvent;
  isLast: boolean;
}) {
  const actorKind = inferActivityActorKind(order, event);
  const actorName = formatActivityActorName(order, event);
  const showActorName = shouldShowActivityActorName(order, event);

  return (
    <li className="relative flex gap-3 pb-5">
      {!isLast ? (
        <span
          aria-hidden
          className="absolute left-4 top-9 bottom-0 w-px -translate-x-1/2 bg-[#ebebeb]"
        />
      ) : null}
      <ActivityIcon type={event.type} />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <p className="text-[13px] font-semibold text-[#303030]">
            {event.title}
          </p>
          <time className="shrink-0 text-[11px] text-[#8a8a8a]">
            {formatActivityTime(event.timestamp)}
          </time>
        </div>
        {event.detail ? (
          <p className="mt-1 text-[12px] leading-relaxed text-[#616161]">
            {event.detail}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              ACTOR_STYLES[actorKind]
            )}
          >
            {activityActorLabel(actorKind)}
          </span>
          {showActorName ? (
            <span className="text-[11px] font-medium text-[#303030]">
              {actorName}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function OrderActivityFeed({
  order,
  limit,
  compact,
  variant = compact ? "compact" : "card",
}: {
  order: Order;
  limit?: number;
  compact?: boolean;
  variant?: "card" | "compact" | "timeline";
}) {
  const { scheduleBlocks } = useSchedule();
  const resolvedVariant = variant ?? (compact ? "compact" : "card");

  const events = buildOrderActivityFeed(order, scheduleBlocks).slice(
    0,
    limit ?? undefined
  );

  if (events.length === 0) {
    return (
      <div className={cn(dashboardInsetSurfaceClass, "px-4 py-8 text-center")}>
        <p className="text-[13px] text-[#616161]">
          Activity will appear here as you work this order — artwork uploads,
          customer approvals, materials, scheduling, and more.
        </p>
      </div>
    );
  }

  if (resolvedVariant === "timeline") {
    const groups = groupActivityByDate(events);

    return (
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.label}>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              {group.label}
            </h3>
            <ul>
              {group.events.map((event, index) => (
                <ActivityRow
                  key={event.id}
                  order={order}
                  event={event}
                  isLast={index === group.events.length - 1}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  const content = (
    <ul
      className={cn(
        "space-y-0",
        resolvedVariant === "compact" && "max-h-64 overflow-y-auto"
      )}
    >
      {events.map((event, index) => (
        <li
          key={event.id}
          className={cn(
            "flex gap-3 py-3",
            index < events.length - 1 && "border-b border-[#ebebeb]"
          )}
        >
          <ActivityIcon type={event.type} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13px] font-medium text-[#303030]">
                {event.title}
              </p>
              <time className="shrink-0 text-[11px] text-[#8a8a8a]">
                {formatActivityTime(event.timestamp)}
              </time>
            </div>
            {event.detail ? (
              <p className="mt-0.5 line-clamp-2 text-[12px] text-[#616161]">
                {event.detail}
              </p>
            ) : null}
            {shouldShowActivityActorName(order, event) ? (
              <p className="mt-0.5 text-[11px] font-medium text-[#303030]">
                {formatActivityActorName(order, event)}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-[#8a8a8a]">Team</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );

  if (resolvedVariant === "compact") return content;

  return (
    <div className={cn(dashboardInsetSurfaceClass, "p-4")}>{content}</div>
  );
}
