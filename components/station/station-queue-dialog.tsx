"use client";

import { format, parseISO } from "date-fns";
import { Clock, ListOrdered, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScheduleBlockOrderLine } from "@/components/orders/order-display-line";
import { formatJobBarcode, groupUpcomingByDay } from "@/lib/station-runs";
import { machineColorStyles } from "@/lib/machine-styles";
import type { Machine, ScheduleBlock, StationJobRun } from "@/types";
import { cn } from "@/lib/utils";

export function StationQueueDialog({
  open,
  onOpenChange,
  machine,
  upcoming,
  onOpenOrder,
  onEditSchedule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machine: Machine;
  upcoming: { block: ScheduleBlock; run: StationJobRun }[];
  onOpenOrder: (orderId: string, block: ScheduleBlock) => void;
  onEditSchedule: (block: ScheduleBlock) => void;
}) {
  const grouped = groupUpcomingByDay(upcoming);
  const styles = machineColorStyles[machine.color];

  const handleOpenOrder = (block: ScheduleBlock) => {
    onOpenOrder(block.orderId, block);
    onOpenChange(false);
  };

  const handleReschedule = (block: ScheduleBlock) => {
    onEditSchedule(block);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88vh,720px)] w-[calc(100vw-2rem)] max-w-2xl sm:max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border border-border/60 p-0 shadow-lg">
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4 text-left">
          <div className="flex items-center gap-2.5 pr-6">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl border",
                styles.bg,
                styles.border,
                styles.text
              )}
            >
              <ListOrdered className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-brand-ink">
                Event queue
              </DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                {upcoming.length === 0
                  ? `Nothing queued on ${machine.name}`
                  : `${upcoming.length} upcoming on ${machine.name}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {upcoming.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm text-brand-muted">
                The queue is clear. Schedule events from the production calendar.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {grouped.map((group) => (
                <section key={group.label}>
                  <p className="sticky top-0 z-10 border-b border-border/40 bg-muted/40 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-brand-muted backdrop-blur-sm">
                    {group.label}
                  </p>
                  <ul className="divide-y divide-border/60">
                    {group.items.map(({ block }) => {
                      const start = parseISO(block.startAt);
                      const end = parseISO(block.endAt);
                      const isNext = upcoming[0]?.block.id === block.id;

                      return (
                        <li
                          key={block.id}
                          className="px-6 py-4 transition-colors hover:bg-brand-primary/[0.03]"
                        >
                          <div className="flex items-start justify-between gap-6">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-brand-ink">
                                  <ScheduleBlockOrderLine block={block} />
                                </p>
                                {isNext && (
                                  <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
                                    Up next
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 truncate text-xs text-brand-muted">
                                {block.customerName}
                              </p>
                              <p className="mt-2 text-sm font-medium text-brand-ink">
                                {block.imprintLabel}
                              </p>
                              <p className="text-xs text-brand-muted">
                                {block.jobName}
                              </p>
                              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-muted">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="size-3.5" />
                                  {format(start, "h:mm a")} –{" "}
                                  {format(end, "h:mm a")}
                                </span>
                                {block.pieceCount != null &&
                                  block.pieceCount > 0 && (
                                    <span className="inline-flex items-center gap-1">
                                      <Package className="size-3.5" />
                                      {block.pieceCount} pcs
                                    </span>
                                  )}
                                <span className="font-mono text-brand-primary/80">
                                  {formatJobBarcode(block.id)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-full bg-white text-xs"
                              onClick={() => handleOpenOrder(block)}
                            >
                              View order
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-full text-xs"
                              onClick={() => handleReschedule(block)}
                            >
                              Reschedule
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        {upcoming.length > 0 && (
          <div className="shrink-0 border-t border-border/60 bg-muted/20 px-6 py-3.5">
            <p className="text-xs text-brand-muted">
              Scan the barcode on the event bag to start the next run, or scroll
              down for the full calendar.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
