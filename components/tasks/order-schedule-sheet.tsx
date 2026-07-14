"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2, ChevronRight, ExternalLink } from "lucide-react";
import {
  FlowProgressDots,
  FlowStepList,
} from "@/components/calendar/order-production-flow";
import { RushBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SchedulingQueueOrder, UnscheduledEvent } from "@/lib/event-basket";
import { formatOrderRef } from "@/lib/order-display";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { decorationLabel, formatDate } from "@/lib/format";
import type { HealthStatus } from "@/lib/order-health";
import { formatEventXOfY } from "@/lib/terminology";
import { cn } from "@/lib/utils";

function urgencyClass(status: HealthStatus) {
  switch (status) {
    case "critical":
      return "text-[#d82c0d] font-medium";
    case "warning":
      return "text-amber-800 font-medium";
    default:
      return "text-[#616161]";
  }
}

function EventPickerRow({
  event,
  selected,
  onSelect,
}: {
  event: UnscheduledEvent;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors",
        selected
          ? "border-[#2c6ecb] bg-[#f0f5ff] shadow-sm"
          : "border-[#e3e3e3] bg-white hover:border-[#c9cccf] hover:bg-[#fafafa]"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
          selected
            ? "border-[#2c6ecb] bg-[#2c6ecb] text-white"
            : "border-[#c9cccf] bg-white text-[#616161]"
        )}
      >
        {event.flowStep}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#303030]">
          {event.imprintLabel}
        </span>
        <span className="mt-0.5 block text-xs text-[#616161]">
          {decorationLabel(event.decoration)}
          {event.pieceCount > 0
            ? ` · ${event.pieceCount.toLocaleString()} pcs`
            : ""}
        </span>
      </span>
      {selected ? (
        <ChevronRight className="mt-0.5 size-4 shrink-0 text-[#2c6ecb]" />
      ) : null}
    </button>
  );
}

export function OrderScheduleSheet({
  open,
  onOpenChange,
  orderId,
  selectedJobKey,
  schedulingQueue,
  onScheduleEvent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  selectedJobKey: string | null;
  schedulingQueue: SchedulingQueueOrder[];
  onScheduleEvent: (jobKey: string, orderId: string) => void;
}) {
  const queueItem = useMemo(
    () => schedulingQueue.find((item) => item.orderId === orderId) ?? null,
    [schedulingQueue, orderId]
  );

  const events = useMemo(() => {
    if (!queueItem) return [];
    return queueItem.unscheduledEvents?.length > 0
      ? queueItem.unscheduledEvents
      : queueItem.nextEvent
        ? [queueItem.nextEvent]
        : [];
  }, [queueItem]);

  const [activeKey, setActiveKey] = useState<string | null>(selectedJobKey);

  useEffect(() => {
    if (!open) return;
    if (
      selectedJobKey &&
      events.some((event) => event.key === selectedJobKey)
    ) {
      setActiveKey(selectedJobKey);
      return;
    }
    setActiveKey(events[0]?.key ?? null);
  }, [open, selectedJobKey, events]);

  const selectedEvent =
    events.find((event) => event.key === activeKey) ?? events[0] ?? null;

  if (!queueItem) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg rounded-lg border-[#e3e3e3] p-6">
          <DialogTitle className="text-lg font-semibold text-[#303030]">
            Order not found
          </DialogTitle>
          <DialogDescription className="text-sm text-[#616161]">
            This order may have been scheduled already. Close and refresh the
            task list.
          </DialogDescription>
        </DialogContent>
      </Dialog>
    );
  }

  const scheduledCount = queueItem.progress.scheduled;
  const totalCount = queueItem.progress.total;
  const remainingCount = events.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,840px)] w-[calc(100vw-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-lg border-[#e3e3e3] p-0 shadow-xl sm:max-w-5xl">
        <DialogHeader className="border-b border-[#ebebeb] bg-[#fafafa] px-6 py-5 text-left sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="min-w-0 space-y-2">
              <DialogTitle className="text-xl font-bold tracking-tight text-[#303030]">
                Schedule {formatOrderRef(queueItem)}
              </DialogTitle>
              <DialogDescription className="text-sm text-[#616161]">
                Pick any production event below — you can schedule them in any
                order.
              </DialogDescription>
              <div className="flex flex-wrap items-center gap-2 text-sm text-[#303030]">
                <span className="font-medium">{queueItem.customerName}</span>
                <span className="text-[#8a8a8a]">·</span>
                <span className={urgencyClass(queueItem.dueUrgency)}>
                  {queueItem.dueLabel}
                </span>
                <span className="text-[#8a8a8a]">·</span>
                <span className="text-[#616161]">
                  In hands {formatDate(queueItem.inHandsDate)}
                </span>
                {queueItem.rush ? <RushBadge /> : null}
              </div>
            </div>
            <div className="rounded-lg border border-[#e3e3e3] bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                On calendar
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[#303030]">
                {scheduledCount}
                <span className="text-base font-medium text-[#616161]">
                  /{totalCount}
                </span>
              </p>
            </div>
          </div>
          {queueItem.flowSteps.length > 1 ? (
            <div className="mt-4 rounded-lg border border-[#e3e3e3] bg-white px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#616161]">
                Production flow
              </p>
              <FlowProgressDots steps={queueItem.flowSteps} />
            </div>
          ) : null}
          {!queueItem.artworkApproved && queueItem.artworkLabel ? (
            <p className="mt-3 text-xs text-amber-800">
              {queueItem.artworkLabel} — you can still schedule production
            </p>
          ) : null}
        </DialogHeader>

        <div className="grid flex-1 overflow-hidden lg:grid-cols-[minmax(240px,300px)_1fr]">
          <div className="border-b border-[#ebebeb] bg-[#fafafa] p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#616161]">
              Events to schedule · {remainingCount}
            </p>
            <ul className="mt-3 space-y-2">
              {events.map((event) => (
                <li key={event.key}>
                  <EventPickerRow
                    event={event}
                    selected={event.key === selectedEvent?.key}
                    onSelect={() => setActiveKey(event.key)}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col overflow-y-auto bg-white p-4 sm:p-6">
            {selectedEvent ? (
              <div className="flex h-full flex-col">
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#616161]">
                      Selected event
                    </p>
                    <h3 className={cn("mt-2", dashboardTaskTitleClass)}>
                      {selectedEvent.imprintLabel}
                    </h3>
                    <p className={cn("mt-1", dashboardTaskDetailClass)}>
                      {selectedEvent.jobName} ·{" "}
                      {decorationLabel(selectedEvent.decoration)}
                      {selectedEvent.pieceCount > 0
                        ? ` · ${selectedEvent.pieceCount.toLocaleString()} pieces`
                        : ""}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className={cn(dashboardCardClass, "px-4 py-3")}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                        Position in order
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#303030]">
                        {formatEventXOfY(
                          selectedEvent.flowStep,
                          selectedEvent.flowTotal
                        )}
                      </p>
                    </div>
                    <div className={cn(dashboardCardClass, "px-4 py-3")}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                        Due
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-sm font-semibold",
                          urgencyClass(selectedEvent.dueUrgency)
                        )}
                      >
                        {selectedEvent.dueLabel}
                      </p>
                    </div>
                  </div>

                  {queueItem.flowSteps.length > 1 ? (
                    <div className={cn(dashboardCardClass, "px-4 py-4")}>
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#616161]">
                        All events on this order
                      </p>
                      <FlowStepList steps={queueItem.flowSteps} />
                    </div>
                  ) : null}
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-[#ebebeb] pt-5">
                  <Button
                    size="lg"
                    className="h-10 rounded-lg px-5 text-sm font-semibold"
                    onClick={() =>
                      onScheduleEvent(selectedEvent.key, queueItem.orderId)
                    }
                  >
                    <CalendarPlus className="size-4" />
                    Schedule on calendar
                  </Button>
                  <Button
                    variant="outline"
                    className={cn(dashboardControlClass, "h-10 px-4 text-sm")}
                    nativeButton={false}
                    render={
                      <Link href={`/app/orders/${queueItem.orderId}`} />
                    }
                  >
                    <ExternalLink className="size-3.5" />
                    Open order
                  </Button>
                  {events.length > 1 ? (
                    <p className="flex items-center gap-1.5 text-xs text-[#616161]">
                      <CheckCircle2 className="size-3.5 text-[#108043]" />
                      {events.length - 1} other event
                      {events.length - 1 !== 1 ? "s" : ""} still on this list
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-[#616161]">
                All events for this order are on the calendar.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
