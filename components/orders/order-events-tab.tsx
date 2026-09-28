"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";
import { ProductionEventSheet } from "@/components/tasks/production-event-sheet";
import {
  CheckpointStatusBadge,
} from "@/components/orders/order-checkpoint-pills";
import { DecorationTypePill } from "@/components/orders/decoration-type-pill";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatJobBlankAssignmentSummary } from "@/lib/job-line-items";
import {
  computeEventStatusCards,
  findEventStatusCard,
  visibleEventStatusColumns,
} from "@/lib/event-status-checkpoints";
import type { OrderDetailTab } from "@/lib/order-detail-tabs";
import { eventsLabel } from "@/lib/terminology";
import {
  getOrderProductionSteps,
  type ProductionStep,
} from "@/lib/order-production";
import { resolveProductionEvent } from "@/lib/production-event-status";
import type { Order, ScheduleBlock, StationJobRun } from "@/types";
import { cn } from "@/lib/utils";

export function OrderEventsTab({
  order,
  scheduleBlocks,
  jobRuns,
  onAddEvent,
  onScheduleStep,
  onOpenDesign,
  onOpenTab,
}: {
  order: Order;
  scheduleBlocks: ScheduleBlock[];
  jobRuns: StationJobRun[];
  onAddEvent: () => void;
  onScheduleStep: (step: ProductionStep) => void;
  onOpenDesign?: (jobId: string, imprintId: string) => void;
  onOpenTab?: (tab: OrderDetailTab) => void;
}) {
  const [selectedEvent, setSelectedEvent] = useState<{
    jobId: string;
    imprintId: string;
  } | null>(null);

  const eventRows = useMemo(() => {
    return getOrderProductionSteps(order).map(({ job, imprint }) => {
      const resolved = resolveProductionEvent({
        order,
        job,
        imprint,
        scheduleBlocks,
        jobRuns,
      });

      return {
        job,
        imprint,
        resolved,
        statusCards: computeEventStatusCards(order, job, imprint, resolved),
      };
    });
  }, [order, scheduleBlocks, jobRuns]);

  const columnHeaders = useMemo(
    () =>
      visibleEventStatusColumns(eventRows).map((column) => ({
        key: column.key,
        label:
          typeof column.label === "function"
            ? column.label(order)
            : column.label,
      })),
    [eventRows, order]
  );

  const eventSingular = eventsLabel.endsWith("s")
    ? eventsLabel.slice(0, -1)
    : eventsLabel;

  if (eventRows.length === 0) {
    return (
      <section className={dashboardCardClass}>
        <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
          <h2 className={dashboardTaskTitleClass}>{eventsLabel}</h2>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Decoration to run on the floor for this order.
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-12 text-center">
            <CalendarPlus className="mx-auto mb-3 size-8 text-[#c9c9c9]" />
            <p className="text-[13px] font-medium text-[#303030]">
              No {eventsLabel.toLowerCase()} yet
            </p>
            <p className={cn("mx-auto mt-1 max-w-sm", dashboardTaskDetailClass)}>
              Add one for each decoration you need to run on the floor — then
              proofs, materials, and scheduling unlock from there.
            </p>
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "mt-4 h-9")}
              onClick={onAddEvent}
            >
              <Plus className="size-3.5" />
              Add {eventSingular.toLowerCase()}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={dashboardCardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
          <div>
            <h2 className={dashboardTaskTitleClass}>{eventsLabel}</h2>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              {eventRows.length === 1
                ? "1 decoration on this order — open an event to assign blanks for matrix pricing"
                : `${eventRows.length} decorations on this order — assign blanks on each event for matrix pricing`}
            </p>
          </div>
          <Button
            type="button"
            className={cn(dashboardControlClass, "h-8 shrink-0 text-[12px]")}
            onClick={onAddEvent}
          >
            <Plus className="size-3.5" />
            Add event
          </Button>
        </div>

        <div className="overflow-x-auto border-t border-[#ebebeb]">
          <Table className="min-w-[960px] w-full">
            <TableHeader>
              <TableRow className="border-[#ebebeb] bg-[#fafafa] hover:bg-[#fafafa]">
                <TableHead className="sticky left-0 z-10 h-9 min-w-[180px] bg-[#fafafa] pl-4 text-[12px] font-medium text-[#616161] sm:pl-5">
                  Decoration
                </TableHead>
                {columnHeaders.map((column) => (
                  <TableHead
                    key={column.key}
                    className="h-9 min-w-[108px] text-[12px] font-medium text-[#616161]"
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventRows.map(({ job, imprint, statusCards }) => (
                <TableRow
                  key={`${job.id}-${imprint.id}`}
                  className="group cursor-pointer border-[#ebebeb] hover:bg-[#f6f6f7]"
                  onClick={() =>
                    setSelectedEvent({ jobId: job.id, imprintId: imprint.id })
                  }
                >
                  <TableCell className="sticky left-0 z-10 bg-white py-2.5 pl-4 transition-colors group-hover:bg-[#f6f6f7] sm:pl-5">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-[13px] font-semibold text-[#303030]">
                        {imprint.label}
                      </p>
                      <DecorationTypePill decoration={imprint.decoration} />
                      {job.kind !== "finishing" &&
                      imprint.decoration !== "finishing" ? (
                        <p className="truncate text-[11px] text-[#8a8a8a]">
                          {formatJobBlankAssignmentSummary(order, job)}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  {columnHeaders.map((column) => (
                    <TableCell key={column.key} className="py-2.5">
                      <CheckpointStatusBadge
                        checkpoint={findEventStatusCard(statusCards, column.key)}
                        compact
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <ProductionEventSheet
        orderId={order.id}
        jobId={selectedEvent?.jobId ?? null}
        imprintId={selectedEvent?.imprintId ?? null}
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
        onSchedule={() => {
          const selected = eventRows.find(
            (row) =>
              row.job.id === selectedEvent?.jobId &&
              row.imprint.id === selectedEvent?.imprintId
          );
          setSelectedEvent(null);
          if (selected) {
            onScheduleStep({ job: selected.job, imprint: selected.imprint });
          }
        }}
        onOpenFiles={
          onOpenDesign
            ? (jobId, imprintId) => {
                setSelectedEvent(null);
                onOpenDesign(jobId, imprintId);
              }
            : undefined
        }
        onOpenTab={onOpenTab}
      />
    </>
  );
}
