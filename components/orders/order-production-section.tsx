"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarPlus, ChevronDown, Plus } from "lucide-react";
import { ProductionEventSheet } from "@/components/tasks/production-event-sheet";
import {
  CheckpointStatusBadge,
  findCheckpoint,
} from "@/components/orders/order-checkpoint-pills";
import { Button } from "@/components/ui/button";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { decorationLabel } from "@/lib/format";
import { eventsLabel } from "@/lib/terminology";
import {
  findScheduleBlockForStep,
  getOrderProductionSteps,
  type ProductionStep,
} from "@/lib/order-production";
import { computeEventCheckpoints } from "@/lib/order-list-summary";
import { resolveProductionEvent } from "@/lib/production-event-status";
import { machineColorStyles } from "@/lib/machine-styles";
import type { Machine, Order, ScheduleBlock, StationJobRun } from "@/types";
import { cn } from "@/lib/utils";

const WORKFLOW_LABEL: Record<string, string> = {
  needs_attention: "Needs attention",
  in_progress: "In progress",
  blocked: "Blocked",
  completed: "Completed",
};

export function OrderProductionSection({
  order,
  scheduleBlocks,
  jobRuns,
  machines,
  onAddEvent,
  onScheduleStep,
}: {
  order: Order;
  scheduleBlocks: ScheduleBlock[];
  jobRuns: StationJobRun[];
  machines: Machine[];
  onAddEvent: () => void;
  onScheduleStep: (step: ProductionStep) => void;
}) {
  const [selectedEvent, setSelectedEvent] = useState<{
    jobId: string;
    imprintId: string;
  } | null>(null);

  const steps = useMemo(() => getOrderProductionSteps(order), [order]);

  const eventRows = useMemo(() => {
    return steps.map(({ job, imprint }) => {
      const resolved = resolveProductionEvent({
        order,
        job,
        imprint,
        scheduleBlocks,
        jobRuns,
      });
      const block = findScheduleBlockForStep(
        scheduleBlocks,
        order.id,
        job.id,
        imprint.id
      );
      const machine = block
        ? machines.find((entry) => entry.id === block.machineId)
        : undefined;

      return {
        job,
        imprint,
        resolved,
        block,
        machine,
        checkpoints: computeEventCheckpoints(imprint, resolved),
      };
    });
  }, [order, steps, scheduleBlocks, jobRuns, machines]);

  return (
    <>
      <section className={dashboardCardClass}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-4 py-4 sm:px-5">
          <div>
            <h2 className={dashboardTaskTitleClass}>Production</h2>
            <p className={cn("mt-1", dashboardTaskDetailClass)}>
              {steps.length === 0
                ? `Add ${eventsLabel.toLowerCase()} for each decoration, then manage prep and scheduling.`
                : `${steps.length} decoration${steps.length !== 1 ? "s" : ""} on this order — tap one to update status or schedule it.`}
            </p>
          </div>
          <Button
            type="button"
            className={cn(dashboardControlClass, "h-9 shrink-0")}
            onClick={onAddEvent}
          >
            <Plus className="size-3.5" />
            Add {eventLabel()}
          </Button>
        </div>

        {steps.length === 0 ? (
          <div className="px-4 py-12 text-center sm:px-5">
            <p className={dashboardTaskDetailClass}>
              No production steps yet. Add a screen print, embroidery, or
              finishing step to get started.
            </p>
            <Button
              type="button"
              className={cn(dashboardControlClass, "mt-4 h-9")}
              onClick={onAddEvent}
            >
              <Plus className="size-3.5" />
              Add first step
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-[#ebebeb]">
            {eventRows.map(({ job, imprint, resolved, block, machine, checkpoints }) => {
              const machineStyles = machine
                ? machineColorStyles[machine.color]
                : null;

              return (
                <li key={`${job.id}-${imprint.id}`}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedEvent({ jobId: job.id, imprintId: imprint.id })
                    }
                    className="flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-[#fafafa] sm:px-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={dashboardTaskTitleClass}>{imprint.label}</p>
                        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                          {job.name} · {decorationLabel(imprint.decoration)}
                        </p>
                        <p className="mt-1 text-[13px] text-[#303030]">
                          {resolved.phase}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span
                          className={cn(
                            "rounded-lg px-2 py-0.5 text-[11px] font-semibold",
                            resolved.status === "completed" &&
                              "bg-[#e8f5ee] text-[#0d5c2e]",
                            resolved.status === "in_progress" &&
                              "bg-[#ebf4ff] text-[#2c6ecb]",
                            resolved.status === "blocked" &&
                              "bg-[#fff1f1] text-[#8f1f1f]",
                            resolved.status === "needs_attention" &&
                              "bg-[#fff8eb] text-[#8a6116]"
                          )}
                        >
                          {WORKFLOW_LABEL[resolved.status] ?? resolved.status}
                        </span>

                        {block && machine ? (
                          <span
                            className={cn(
                              "rounded-lg border px-2 py-0.5 text-[11px] font-medium",
                              machineStyles?.bg,
                              machineStyles?.border,
                              machineStyles?.text
                            )}
                          >
                            {machine.name} ·{" "}
                            {format(parseISO(block.startAt), "MMM d · h:mm a")}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onScheduleStep({ job, imprint });
                            }}
                            className={cn(
                              dashboardControlClass,
                              "inline-flex h-8 gap-1 px-2.5 text-[12px]"
                            )}
                          >
                            <CalendarPlus className="size-3.5" />
                            Schedule
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {checkpoints
                        .filter(
                          (checkpoint) => checkpoint.status !== "not_applicable"
                        )
                        .map((checkpoint) => (
                          <CheckpointStatusBadge
                            key={checkpoint.key}
                            checkpoint={findCheckpoint(checkpoints, checkpoint.key)}
                          />
                        ))}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
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
      />
    </>
  );
}

function eventLabel() {
  return eventsLabel.endsWith("s")
    ? eventsLabel.slice(0, -1).toLowerCase()
    : eventsLabel.toLowerCase();
}

export function OrderDetailSection({
  title,
  description,
  defaultOpen = true,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={dashboardCardClass}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 border-b border-[#ebebeb] px-4 py-4 text-left sm:px-5"
        aria-expanded={open}
      >
        <div>
          <h2 className={dashboardTaskTitleClass}>{title}</h2>
          {description ? (
            <p className={cn("mt-1", dashboardTaskDetailClass)}>{description}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "mt-1 size-4 shrink-0 text-[#616161] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? (
        <div className="px-4 py-4 sm:px-5">{children}</div>
      ) : null}
    </section>
  );
}

export function OrderLineItemsSummary({ order }: { order: Order }) {
  const totalPieces = order.lineItems.reduce(
    (sum, item) =>
      sum + item.sizes.reduce((sizeSum, size) => sizeSum + size.quantity, 0),
    0
  );

  if (order.lineItems.length === 0) {
    return (
      <p className={dashboardTaskDetailClass}>No products on this order yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[13px] text-[#616161]">
        {totalPieces} pieces · {order.lineItems.length} product
        {order.lineItems.length !== 1 ? "s" : ""}
      </p>
      <div className={cn(dashboardInsetSurfaceClass, "divide-y divide-[#ebebeb]")}>
        {order.lineItems.map((item) => (
          <div key={item.id} className="px-3 py-3">
            <p className="text-[13px] font-medium text-[#303030]">
              {item.productName}
            </p>
            <p className="text-[12px] text-[#616161]">
              {item.brand} · {item.color}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.sizes.map((size) => (
                <span
                  key={size.size}
                  className="rounded-md bg-[#f6f6f7] px-2 py-0.5 text-[11px] font-medium text-[#616161]"
                >
                  {size.size}: {size.quantity}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
