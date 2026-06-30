"use client";

import Link from "next/link";
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  CalendarClock,
  ExternalLink,
  Play,
  StickyNote,
} from "lucide-react";
import { FlowStepList } from "@/components/calendar/order-production-flow";
import { useSchedule } from "@/components/providers/schedule-provider";
import { RushBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TodayFloorItem } from "@/lib/dashboard-insights";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { decorationLabel, formatDate } from "@/lib/format";
import { getDueDateUrgency } from "@/lib/order-health";
import { machineColorStyles } from "@/lib/machine-styles";
import { analyzeOrderProductionFlow } from "@/lib/production-flow";
import { cn } from "@/lib/utils";

function DetailCard({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(dashboardCardClass, "px-4 py-3", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
        {label}
      </p>
      <div className="mt-1.5 text-sm font-semibold text-[#303030]">{children}</div>
    </div>
  );
}

export function ShopFloorEventSheet({
  item,
  open,
  onOpenChange,
  onReschedule,
}: {
  item: TodayFloorItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReschedule: () => void;
}) {
  const { orders, scheduleBlocks, machines } = useSchedule();

  const block = useMemo(
    () =>
      item
        ? scheduleBlocks.find((entry) => entry.id === item.scheduleBlockId)
        : undefined,
    [item, scheduleBlocks]
  );

  const order = useMemo(
    () => (item?.orderId ? orders.find((entry) => entry.id === item.orderId) : undefined),
    [item?.orderId, orders]
  );

  const machine = useMemo(
    () =>
      item
        ? machines.find((entry) => entry.id === item.machineId)
        : undefined,
    [item, machines]
  );

  const imprintDecoration = useMemo(() => {
    if (!order || !block) return undefined;
    const job = order.jobs.find((entry) => entry.id === block.jobId);
    const imprint = job?.imprints.find((entry) => entry.id === block.imprintId);
    return imprint?.decoration;
  }, [order, block]);

  const flowSteps = useMemo(
    () => (order ? analyzeOrderProductionFlow(order, scheduleBlocks) : []),
    [order, scheduleBlocks]
  );

  const dueMeta = order ? getDueDateUrgency(order) : null;

  if (!item) return null;

  const isRunning = item.kind === "running";
  let scheduleDateLabel = "—";
  try {
    if (item.startAt) {
      scheduleDateLabel = format(parseISO(item.startAt), "EEE, MMM d, yyyy");
    }
  } catch {
    scheduleDateLabel = "—";
  }

  const machineDot =
    machine?.color && machineColorStyles[machine.color]
      ? machineColorStyles[machine.color].dot
      : "bg-[#2c6ecb]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,720px)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-lg border-[#e3e3e3] p-0 shadow-xl sm:max-w-2xl">
        <DialogHeader className="border-b border-[#ebebeb] bg-[#fafafa] px-6 py-5 text-left">
          <div className="flex flex-wrap items-start gap-2 pr-6">
            <DialogTitle className="text-xl font-bold tracking-tight text-[#303030]">
              {item.orderNumber}
            </DialogTitle>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                isRunning
                  ? "bg-[#e3f1df] text-[#108043]"
                  : "bg-[#ebf4ff] text-[#2c6ecb]"
              )}
            >
              {isRunning ? (
                <>
                  <Play className="size-2.5 fill-current" />
                  Running
                </>
              ) : (
                "Scheduled"
              )}
            </span>
            {order?.rush ? <RushBadge /> : null}
          </div>
          <DialogDescription className="mt-2 text-sm text-[#616161]">
            {item.imprintLabel}
            {imprintDecoration
              ? ` · ${decorationLabel(imprintDecoration)}`
              : ""}
            {item.customerName ? ` · ${item.customerName}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto bg-white px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Machine">
              <span className="inline-flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full", machineDot)} />
                {item.machineName}
              </span>
            </DetailCard>
            <DetailCard label="Time on calendar">
              <span className="block font-semibold">{item.timeLabel}</span>
              <span className="mt-0.5 block text-xs font-normal text-[#616161]">
                {scheduleDateLabel}
              </span>
            </DetailCard>
            {item.pieceCount && item.pieceCount > 0 ? (
              <DetailCard label="Pieces">
                {item.pieceCount.toLocaleString()}
              </DetailCard>
            ) : null}
            {order ? (
              <DetailCard
                label="In hands"
                className={cn(
                  dueMeta?.status === "critical" && "border-[#f5c4c4] bg-[#fff4f4]",
                  dueMeta?.status === "warning" && "border-amber-200 bg-amber-50/50"
                )}
              >
                <span
                  className={cn(
                    dueMeta?.status === "critical" && "text-[#d82c0d]",
                    dueMeta?.status === "warning" && "text-amber-900"
                  )}
                >
                  {formatDate(order.inHandsDate)}
                </span>
                {dueMeta ? (
                  <span className="mt-0.5 block text-xs font-normal text-[#616161]">
                    {dueMeta.label}
                  </span>
                ) : null}
              </DetailCard>
            ) : null}
          </div>

          <div className={cn(dashboardCardClass, "px-4 py-3.5")}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
              Production event
            </p>
            <p className={cn("mt-1.5", dashboardTaskTitleClass)}>{item.jobName}</p>
            <p className={cn("mt-1", dashboardTaskDetailClass)}>
              {item.imprintLabel}
            </p>
          </div>

          {item.notes ? (
            <div className="rounded-lg border border-[#e3e3e3] bg-[#fafafa] px-4 py-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                <StickyNote className="size-3.5" />
                Schedule notes
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#303030]">
                {item.notes}
              </p>
            </div>
          ) : null}

          {flowSteps.length > 1 ? (
            <div className={cn(dashboardCardClass, "px-4 py-4")}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#616161]">
                Order production flow
              </p>
              <FlowStepList steps={flowSteps} />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-6 py-4">
          <Button
            className="h-10 rounded-lg px-4 text-sm font-semibold"
            onClick={onReschedule}
            disabled={!block}
          >
            <CalendarClock className="size-4" />
            Reschedule
          </Button>
          <Button
            variant="outline"
            className={cn(dashboardControlClass, "h-10 px-4 text-sm")}
            nativeButton={false}
            render={<Link href="/app/calendar" />}
          >
            <Calendar className="size-3.5" />
            Calendar
          </Button>
          {item.orderId ? (
            <Button
              variant="outline"
              className={cn(dashboardControlClass, "h-10 px-4 text-sm")}
              nativeButton={false}
              render={<Link href={`/app/orders/${item.orderId}`} />}
            >
              <ExternalLink className="size-3.5" />
              Open order
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
