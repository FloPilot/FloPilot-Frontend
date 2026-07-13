"use client";

import Link from "next/link";
import { CalendarPlus, ChevronRight } from "lucide-react";
import { ProductionEventRow } from "@/components/production/production-event-row";
import type {
  ProductionFloorDayGroup,
  ProductionFloorEvent,
  ProductionFloorMachineGroup,
} from "@/lib/production-floor-overview";
import { machineColorStyles } from "@/lib/machine-styles";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";
import type { MachineCalendarColor } from "@/types";

export type FloorGroupMode = "day" | "machine";

export function ProductionFloorFeed({
  mode,
  byDay,
  byMachine,
  machineFilter,
  onSelectEvent,
}: {
  mode: FloorGroupMode;
  byDay: ProductionFloorDayGroup[];
  byMachine: ProductionFloorMachineGroup[];
  machineFilter: string | "all";
  onSelectEvent: (event: ProductionFloorEvent) => void;
}) {
  const dayGroups =
    machineFilter === "all"
      ? byDay
      : byDay
          .map((group) => ({
            ...group,
            events: group.events.filter(
              (event) => event.machineId === machineFilter
            ),
          }))
          .filter((group) => group.events.length > 0);

  const machineGroups =
    machineFilter === "all"
      ? byMachine
      : byMachine.filter((group) => group.machineId === machineFilter);

  const isEmpty =
    mode === "day" ? dayGroups.length === 0 : machineGroups.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center sm:px-6">
        <div className="flex size-11 items-center justify-center rounded-lg border border-[#e3e3e3] bg-[#fafafa]">
          <CalendarPlus className="size-5 text-[#8a8a8a]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#303030]">
            No machine events in view
          </p>
          <p className={cn("mt-1 max-w-sm", dashboardTaskDetailClass)}>
            Schedule decoration runs on your machines from the shop calendar.
            Once booked, they’ll show up here as an upcoming floor overview.
          </p>
        </div>
        <Link
          href="/app/calendar"
          className={cn(
            dashboardControlClass,
            "h-9 text-xs font-semibold text-[#303030]"
          )}
        >
          Open shop calendar
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    );
  }

  if (mode === "machine") {
    return (
      <div className="flex flex-col gap-5 p-3 sm:p-4">
        {machineGroups.map((group) => {
          const colorStyles = group.machineColor
            ? machineColorStyles[group.machineColor as MachineCalendarColor]
            : null;
          return (
            <section key={group.machineId} className="min-w-0">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 px-0.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      colorStyles?.dot ?? "bg-[#2c6ecb]"
                    )}
                  />
                  <h3 className="truncate text-[13px] font-semibold text-[#303030]">
                    {group.machineName}
                  </h3>
                  <span className="text-[12px] text-[#8a8a8a]">
                    {group.events.length} event
                    {group.events.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {group.runningCount > 0 ? (
                    <span className="rounded-sm bg-[#e3f1df] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#108043]">
                      {group.runningCount} live
                    </span>
                  ) : null}
                  <Link
                    href={`/app/machines/${group.machineId}`}
                    className="text-[12px] font-medium text-[#2c6ecb] hover:underline"
                  >
                    Station
                  </Link>
                </div>
              </div>
              <ul className="flex flex-col gap-2">
                {group.events.map((event) => (
                  <li key={`${group.machineId}-${event.id}`}>
                    <ProductionEventRow
                      event={event}
                      onSelect={onSelectEvent}
                      showMachine={false}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-3 sm:p-4">
      {dayGroups.map((group) => (
        <section key={group.key} className="min-w-0">
          <div className="mb-2.5 flex items-baseline justify-between gap-2 px-0.5">
            <h3 className="text-[13px] font-semibold text-[#303030]">
              {group.label}
            </h3>
            <span className="text-[12px] tabular-nums text-[#8a8a8a]">
              {group.events.length}
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {group.events.map((event) => (
              <li key={`${group.key}-${event.id}`}>
                <ProductionEventRow event={event} onSelect={onSelectEvent} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function ProductionRunningStrip({
  events,
  onSelectEvent,
}: {
  events: ProductionFloorEvent[];
  onSelectEvent: (event: ProductionFloorEvent) => void;
}) {
  if (events.length === 0) return null;

  return (
    <section className={cn(dashboardCardClass, "overflow-hidden")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d8ebcf] bg-[#f4faf2] px-4 py-3 sm:px-5">
        <div>
          <p className="text-[15px] font-semibold text-[#108043]">
            Running now
          </p>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Live machine runs — tap to manage status or jump into the order
          </p>
        </div>
        <span className="rounded-sm bg-[#e3f1df] px-2 py-1 text-xs font-semibold text-[#108043]">
          {events.length} active
        </span>
      </div>
      <ul className="flex flex-col gap-2 p-3 sm:p-4">
        {events.map((event) => (
          <li key={`live-${event.id}`}>
            <ProductionEventRow
              event={event}
              onSelect={onSelectEvent}
              showDateHint
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
