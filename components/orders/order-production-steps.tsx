"use client";

import { format, parseISO } from "date-fns";
import {
  CalendarClock,
  CalendarPlus,
  FileImage,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { decorationLabel } from "@/lib/format";
import { eventLabel, eventsLabel } from "@/lib/terminology";
import { schedulableJobKey } from "@/lib/job-imprints";
import {
  findScheduleBlockForStep,
  getOrderProductionSteps,
  type ProductionStep,
} from "@/lib/order-production";
import { machineColorStyles } from "@/lib/machine-styles";
import type { Machine, Order, ScheduleBlock } from "@/types";
import { cn } from "@/lib/utils";

function StepStatusBadge({
  block,
  machine,
}: {
  block?: ScheduleBlock;
  machine?: Machine;
}) {
  if (!block) {
    return (
      <Badge
        variant="outline"
        className="border-amber-200 bg-amber-50 text-amber-900"
      >
        Not scheduled
      </Badge>
    );
  }

  const styles = machine ? machineColorStyles[machine.color] : null;
  const start = parseISO(block.startAt);

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal gap-1.5",
        styles
          ? [styles.bg, styles.border, styles.text]
          : "border-emerald-200 bg-emerald-50 text-emerald-900"
      )}
    >
      <CalendarClock className="size-3" />
      {machine?.name ?? "Scheduled"} · {format(start, "MMM d · h:mm a")}
    </Badge>
  );
}

export function OrderProductionSteps({
  order,
  scheduleBlocks,
  machines,
  onScheduleStep,
  onEditSchedule,
  onRemoveStep,
  onViewArtwork,
  compact = false,
}: {
  order: Order;
  scheduleBlocks: ScheduleBlock[];
  machines: Machine[];
  onScheduleStep: (step: ProductionStep) => void;
  onEditSchedule: (block: ScheduleBlock) => void;
  onRemoveStep: (jobId: string) => void;
  onViewArtwork?: (jobId: string, imprintId: string) => void;
  compact?: boolean;
}) {
  const steps = getOrderProductionSteps(order);

  if (steps.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          No {eventsLabel.toLowerCase()} yet. Add each decoration hit, label, and finishing
          task — then schedule them on your machines.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", !compact && "space-y-3")}>
      {steps.map(({ job, imprint }) => {
        const block = findScheduleBlockForStep(
          scheduleBlocks,
          order.id,
          job.id,
          imprint.id
        );
        const machine = block
          ? machines.find((m) => m.id === block.machineId)
          : undefined;

        return (
          <div
            key={`${job.id}-${imprint.id}`}
            className={cn(
              "rounded-xl border border-border bg-white",
              compact ? "p-3" : "p-4 sm:p-5"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{job.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {imprint.label} · {decorationLabel(imprint.decoration)}
                </p>
              </div>
              <StepStatusBadge block={block} machine={machine} />
            </div>

            {!compact && (
              <div className="mt-4 flex flex-wrap gap-2">
                {onViewArtwork && job.kind !== "finishing" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => onViewArtwork(job.id, imprint.id)}
                  >
                    <FileImage className="size-3.5" />
                    Artwork
                  </Button>
                )}
                {block ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => onEditSchedule(block)}
                  >
                    <Pencil className="size-3.5" />
                    Reschedule
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => onScheduleStep({ job, imprint })}
                  >
                    <CalendarPlus className="size-3.5" />
                    Schedule
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (
                      confirm(
                        `Remove "${job.name}" from this order?${block ? " Its schedule will also be removed." : ""}`
                      )
                    ) {
                      onRemoveStep(job.id);
                    }
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              </div>
            )}

            {compact && (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {onViewArtwork && job.kind !== "finishing" && (
                  <button
                    type="button"
                    onClick={() => onViewArtwork(job.id, imprint.id)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    View files
                  </button>
                )}
                {block ? (
                  <button
                    type="button"
                    onClick={() => onEditSchedule(block)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Reschedule
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onScheduleStep({ job, imprint })}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Schedule this {eventLabel.toLowerCase()}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function getStepJobKey(orderId: string, step: ProductionStep): string {
  return schedulableJobKey(orderId, step.job.id, step.imprint.id);
}
