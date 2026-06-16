"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MachineTimelineCalendar } from "@/components/station/machine-timeline-calendar";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import { getOrderScheduleBlocks } from "@/lib/order-production";
import { machineColorStyles } from "@/lib/machine-styles";
import type { ScheduleBlock } from "@/types";
import { cn } from "@/lib/utils";

export function OrderScheduleTimeline({
  orderId,
  onEditBlock,
}: {
  orderId: string;
  onEditBlock?: (block: ScheduleBlock) => void;
}) {
  const { machines, scheduleBlocks } = useSchedule();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [orderOnlyView, setOrderOnlyView] = useState(false);

  const orderBlocks = useMemo(
    () => getOrderScheduleBlocks(scheduleBlocks, orderId),
    [scheduleBlocks, orderId]
  );

  const machineIdsWithOrderJobs = useMemo(
    () => new Set(orderBlocks.map((b) => b.machineId)),
    [orderBlocks]
  );

  const selectableMachines = useMemo(() => {
    const list = machines.filter((m) => m.active);
    return list.sort((a, b) => {
      const aHas = machineIdsWithOrderJobs.has(a.id);
      const bHas = machineIdsWithOrderJobs.has(b.id);
      if (aHas !== bHas) return aHas ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [machines, machineIdsWithOrderJobs]);

  const [selectedMachineId, setSelectedMachineId] = useState(
    () =>
      selectableMachines.find((m) => machineIdsWithOrderJobs.has(m.id))?.id ??
      selectableMachines[0]?.id ??
      ""
  );

  useEffect(() => {
    if (
      selectedMachineId &&
      selectableMachines.some((m) => m.id === selectedMachineId)
    ) {
      return;
    }
    const fallback =
      selectableMachines.find((m) => machineIdsWithOrderJobs.has(m.id))?.id ??
      selectableMachines[0]?.id;
    if (fallback) setSelectedMachineId(fallback);
  }, [selectableMachines, selectedMachineId, machineIdsWithOrderJobs]);

  const selectedMachine = selectableMachines.find(
    (m) => m.id === selectedMachineId
  );

  const weekLabel = `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d")}`;

  if (selectableMachines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground px-1 py-4">
        No active machines available. Add a machine to schedule production.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full size-8 bg-white"
            onClick={() => setWeekStart((d) => addDays(d, -7))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[120px] text-center text-sm font-semibold text-brand-ink">
            {weekLabel}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full size-8 bg-white"
            onClick={() => setWeekStart((d) => addDays(d, 7))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-brand-primary h-8 px-2 text-xs"
            onClick={() =>
              setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
          >
            This week
          </Button>
        </div>

        <div className="flex rounded-full border border-border bg-white p-0.5">
          <button
            type="button"
            onClick={() => setOrderOnlyView(false)}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
              !orderOnlyView
                ? "bg-brand-primary text-white"
                : "text-brand-muted hover:text-brand-ink"
            )}
          >
            Full shop
          </button>
          <button
            type="button"
            onClick={() => setOrderOnlyView(true)}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
              orderOnlyView
                ? "bg-brand-primary text-white"
                : "text-brand-muted hover:text-brand-ink"
            )}
          >
            This order
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {selectableMachines.map((machine) => {
          const styles = machineColorStyles[machine.color];
          const selected = machine.id === selectedMachineId;
          const hasOrderJobs = machineIdsWithOrderJobs.has(machine.id);

          return (
            <button
              key={machine.id}
              type="button"
              onClick={() => setSelectedMachineId(machine.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                selected
                  ? "border-brand-primary bg-brand-primary/10 text-brand-ink shadow-sm"
                  : "border-border bg-white text-brand-muted hover:border-brand-primary/30 hover:text-brand-ink"
              )}
            >
              <span className={cn("size-2.5 rounded-full", styles.dot)} />
              {machine.name}
              {hasOrderJobs && (
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    selected ? "bg-brand-primary" : "bg-emerald-500"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {selectedMachine ? (
        <>
          <p className="text-xs text-brand-muted leading-relaxed">
            Drag any job to move it — including gray blocks from other orders.
            {!orderOnlyView && (
              <>
                {" "}
                <span className="text-brand-ink font-medium">Highlighted</span>{" "}
                jobs are this order; gray blocks are other shop work.
              </>
            )}
            {" "}
            Tap a job to edit, or use{" "}
            <span className="font-medium text-brand-ink">⋯</span> to move it
            to another machine.{" "}
            <span className="text-red-700 font-medium">Red</span> means overlap
            or outside operating hours.
          </p>
          <MachineTimelineCalendar
            machine={selectedMachine}
            weekStart={weekStart}
            highlightOrderId={orderId}
            orderOnlyView={orderOnlyView}
            embedded
            enableBlockActions
            onEditBlock={onEditBlock}
            onBlockMoved={(machineId) => setSelectedMachineId(machineId)}
          />
        </>
      ) : null}
    </div>
  );
}
