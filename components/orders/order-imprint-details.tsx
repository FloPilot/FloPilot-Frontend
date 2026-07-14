"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarPlus, FileImage, Plus } from "lucide-react";
import { MockupPreview } from "@/components/orders/artwork/mockup-preview";
import { ProductionEventSheet } from "@/components/tasks/production-event-sheet";
import {
  CheckpointStatusBadge,
  findCheckpoint,
} from "@/components/orders/order-checkpoint-pills";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import { Button } from "@/components/ui/button";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { decorationLabel } from "@/lib/format";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { getPrintLocationOptions } from "@/lib/shop-settings";
import { imprintLocationLabel } from "@/lib/job-imprints";
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

export function OrderImprintDetails({
  order,
  scheduleBlocks,
  jobRuns,
  machines,
  onAddEvent,
  onScheduleStep,
  onOpenFiles,
}: {
  order: Order;
  scheduleBlocks: ScheduleBlock[];
  jobRuns: StationJobRun[];
  machines: Machine[];
  onAddEvent: () => void;
  onScheduleStep: (step: ProductionStep) => void;
  onOpenFiles: (jobId: string, imprintId: string) => void;
}) {
  const { settings } = useShopSettings();
  const printLocationOptions = useMemo(
    () => getPrintLocationOptions(settings.productionDefaults),
    [settings.productionDefaults]
  );
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
  }, [order, scheduleBlocks, jobRuns, machines]);

  if (eventRows.length === 0) {
    return (
      <section className={cn(dashboardCardClass, "px-4 py-10 text-center sm:px-5")}>
        <p className={dashboardTaskDetailClass}>
          No imprint details yet. Add production steps to see decoration specs,
          artwork, and floor status here.
        </p>
        <Button
          type="button"
          className={cn(dashboardControlClass, "mt-4 h-9")}
          onClick={onAddEvent}
        >
          <Plus className="size-3.5" />
          Add production step
        </Button>
      </section>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {eventRows.map(({ job, imprint, resolved, block, machine, checkpoints }) => {
          const inkList =
            imprint.inkColors
              ?.map((ink) => ink.name || ink.pmsCode || "Ink")
              .filter(Boolean)
              .join(", ") || "—";
          const machineStyles = machine ? machineColorStyles[machine.color] : null;

          return (
            <section key={`${job.id}-${imprint.id}`} className={dashboardCardClass}>
              <div className="border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className={dashboardTaskTitleClass}>{imprint.label}</h3>
                    <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                      {job.name}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-lg px-2 py-0.5 text-[11px] font-semibold",
                      resolved.status === "completed" && "bg-[#e8f5ee] text-[#0d5c2e]",
                      resolved.status === "in_progress" && "bg-[#ebf4ff] text-[#2c6ecb]",
                      resolved.status === "blocked" && "bg-[#fff1f1] text-[#8f1f1f]",
                      resolved.status === "needs_attention" &&
                        "bg-[#fff8eb] text-[#8a6116]"
                    )}
                  >
                    {WORKFLOW_LABEL[resolved.status] ?? resolved.status}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:p-5">
                <div className="space-y-4">
                  <dl className="grid gap-2 sm:grid-cols-2">
                    <DetailItem
                      label="Method"
                      value={decorationLabel(imprint.decoration)}
                    />
                    <DetailItem
                      label="Location"
                      value={imprintLocationLabel(
                        imprint.locationKey,
                        printLocationOptions
                      )}
                    />
                    <DetailItem label="Colors / ink" value={inkList} />
                    <DetailItem
                      label="Art status"
                      value={
                        <ArtworkStatusBadge status={imprint.artwork.status} />
                      }
                    />
                    <DetailItem
                      label="What's happening"
                      value={resolved.phase}
                      className="sm:col-span-2"
                    />
                    {block && machine ? (
                      <DetailItem
                        label="Scheduled"
                        value={`${machine.name} · ${format(parseISO(block.startAt), "MMM d · h:mm a")}`}
                        className="sm:col-span-2"
                      />
                    ) : null}
                  </dl>

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

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className={cn(
                        dashboardControlClass,
                        "h-9 bg-[#2c6ecb] text-white hover:bg-[#1f5199]"
                      )}
                      onClick={() =>
                        setSelectedEvent({ jobId: job.id, imprintId: imprint.id })
                      }
                    >
                      Manage step
                    </Button>
                    {block ? (
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(dashboardControlClass, "h-9")}
                        onClick={() => onScheduleStep({ job, imprint })}
                      >
                        Reschedule
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(dashboardControlClass, "h-9")}
                        onClick={() => onScheduleStep({ job, imprint })}
                      >
                        <CalendarPlus className="size-3.5" />
                        Schedule
                      </Button>
                    )}
                    {job.kind !== "finishing" ? (
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(dashboardControlClass, "h-9")}
                        onClick={() => onOpenFiles(job.id, imprint.id)}
                      >
                        <FileImage className="size-3.5" />
                        Files
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Proof / mockup
                  </p>
                  <div className="max-w-[220px]">
                    <MockupPreview
                      entry={{ job, imprint }}
                      compact
                      onClick={() => onOpenFiles(job.id, imprint.id)}
                    />
                  </div>
                  <p className="text-[11px] text-[#8a8a8a]">
                    v{imprint.artwork.version}
                    {imprint.artwork.mockupLabel
                      ? ` · ${imprint.artwork.mockupLabel}`
                      : ""}
                  </p>
                  {machine && block ? (
                    <span
                      className={cn(
                        "inline-flex rounded-lg border px-2 py-0.5 text-[11px] font-medium",
                        machineStyles?.bg,
                        machineStyles?.border,
                        machineStyles?.text
                      )}
                    >
                      {machine.name}
                    </span>
                  ) : null}
                </div>
              </div>
            </section>
          );
        })}
      </div>

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

function DetailItem({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
        {label}
      </dt>
      <dd className="mt-1 text-[13px] font-medium text-[#303030]">{value}</dd>
    </div>
  );
}

export function OrderProductionJobsList({
  order,
  scheduleBlocks,
  jobRuns,
  machines,
  onManage,
}: {
  order: Order;
  scheduleBlocks: ScheduleBlock[];
  jobRuns: StationJobRun[];
  machines: Machine[];
  onManage: (jobId: string, imprintId: string) => void;
}) {
  const rows = useMemo(() => {
    return getOrderProductionSteps(order).map(({ job, imprint }) => {
      const resolved = resolveProductionEvent({
        order,
        job,
        imprint,
        scheduleBlocks,
        jobRuns,
      });
      return { job, imprint, resolved };
    });
  }, [order, scheduleBlocks, jobRuns]);

  if (rows.length === 0) return null;

  return (
    <section className={dashboardCardClass}>
      <div className="border-b border-[#ebebeb] px-4 py-4 sm:px-5">
        <h2 className={dashboardTaskTitleClass}>Production jobs</h2>
        <p className={cn("mt-1", dashboardTaskDetailClass)}>
          Each decoration on this order — same as your {eventsLabel.toLowerCase()}{" "}
          on the floor.
        </p>
      </div>
      <ul className="divide-y divide-[#ebebeb]">
        {rows.map(({ job, imprint, resolved }) => (
          <li
            key={`${job.id}-${imprint.id}`}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
          >
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#303030]">
                {job.name}
              </p>
              <p className="text-[12px] text-[#616161]">
                {imprint.label} · Status: {WORKFLOW_LABEL[resolved.status]}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className={cn(dashboardControlClass, "h-8 text-[12px]")}
              onClick={() => onManage(job.id, imprint.id)}
            >
              Manage
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
