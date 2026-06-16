"use client";

import {
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  MessageSquare,
  RefreshCw,
  Send,
  StickyNote,
  Upload,
} from "lucide-react";
import {
  buildOrderActivityFeed,
  formatActivityTimestamp,
} from "@/lib/order-activity";
import type { Order, OrderActivityEvent } from "@/types";
import { useSchedule } from "@/components/providers/schedule-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  proof_sent: Send,
};

function ActivityIcon({ type }: { type: OrderActivityEvent["type"] }) {
  const Icon = ICON_MAP[type] ?? RefreshCw;
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/80 text-muted-foreground">
      <Icon className="size-3.5" />
    </div>
  );
}

export function OrderActivityFeed({
  order,
  limit = 8,
  compact,
}: {
  order: Order;
  limit?: number;
  compact?: boolean;
}) {
  const { scheduleBlocks, getOrderMessages } = useSchedule();
  const messages = getOrderMessages(order.id);

  const events = buildOrderActivityFeed(order, scheduleBlocks, messages).slice(
    0,
    limit
  );

  const content =
    events.length === 0 ? (
      <p className="text-sm text-muted-foreground py-4">
        Activity will appear here as you work this order.
      </p>
    ) : (
      <ul className={cn("space-y-0", compact ? "max-h-64 overflow-y-auto" : "")}>
        {events.map((event, i) => (
          <li
            key={event.id}
            className={cn(
              "flex gap-3 py-3",
              i < events.length - 1 && "border-b border-border/60"
            )}
          >
            <ActivityIcon type={event.type} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{event.title}</p>
                <time className="text-[11px] text-muted-foreground shrink-0">
                  {formatActivityTimestamp(event.timestamp)}
                </time>
              </div>
              {event.detail && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {event.detail}
                </p>
              )}
              {event.author && (
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                  {event.author}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    );

  if (compact) return content;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Activity</CardTitle>
        <CardDescription>Recent updates on this order</CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
