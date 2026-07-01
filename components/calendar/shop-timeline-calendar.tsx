"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  addDays,
  format,
  isSameDay,
  startOfWeek,
} from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Plus,
  Wrench,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EventBasketPanel } from "@/components/calendar/event-basket-panel";
import { MachineTimelineCalendar } from "@/components/station/machine-timeline-calendar";
import { ScheduleJobDialog } from "@/components/calendar/schedule-job-dialog";
import { useSchedule } from "@/components/providers/schedule-provider";
import { computeMachineWeekKpis, computeShopWeekKpis } from "@/lib/calendar-kpis";
import {
  machineColorStyles,
  RESOURCE_TYPE_LABELS,
} from "@/lib/machine-styles";
import { formatOperatingHoursSummary } from "@/lib/machine-hours";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardElevatedShadow,
  dashboardKpiTitleClass,
  dashboardPrimaryButtonClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import type { Machine, ScheduleBlock } from "@/types";
import { cn } from "@/lib/utils";

const MAX_COMPARE_MACHINES = 3;

function sortMachines(list: Machine[]) {
  return [...list].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function ShopTimelineCalendar() {
  const { machines, activeScheduleBlocks } = useSchedule();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [prefillMachineId, setPrefillMachineId] = useState<string>();
  const [prefillDate, setPrefillDate] = useState<string>();
  const [prefillJobKey, setPrefillJobKey] = useState<string>();
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock>();
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const sortedMachines = useMemo(() => sortMachines(machines), [machines]);

  const defaultMachineId = useMemo(() => {
    const firstActive = sortedMachines.find((m) => m.active);
    return firstActive?.id ?? sortedMachines[0]?.id ?? null;
  }, [sortedMachines]);

  useEffect(() => {
    if (!defaultMachineId) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds((prev) => {
      const valid = prev.filter((id) => machines.some((m) => m.id === id));
      if (valid.length === 0) return [defaultMachineId];
      if (!compareMode && valid.length > 1) return [valid[0]];
      return valid;
    });
  }, [defaultMachineId, machines, compareMode]);

  const visibleMachines = useMemo(
    () =>
      selectedIds
        .map((id) => machines.find((m) => m.id === id))
        .filter((m): m is Machine => Boolean(m)),
    [machines, selectedIds]
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const shopKpis = useMemo(
    () => computeShopWeekKpis(machines, activeScheduleBlocks, weekStart),
    [machines, activeScheduleBlocks, weekStart]
  );

  const singleMachineKpis =
    visibleMachines.length === 1
      ? computeMachineWeekKpis(
          visibleMachines[0],
          activeScheduleBlocks,
          weekStart
        )
      : null;

  const multiMachineKpis =
    visibleMachines.length > 1
      ? {
          jobs: visibleMachines.reduce(
            (sum, m) => sum + (shopKpis.perMachine[m.id]?.jobCount ?? 0),
            0
          ),
          conflicts: visibleMachines.reduce(
            (sum, m) => sum + (shopKpis.perMachine[m.id]?.conflictCount ?? 0),
            0
          ),
          booked: visibleMachines.reduce(
            (sum, m) => sum + (shopKpis.perMachine[m.id]?.bookedHours ?? 0),
            0
          ),
          utilization: Math.round(
            visibleMachines.reduce(
              (sum, m) => sum + (shopKpis.perMachine[m.id]?.utilization ?? 0),
              0
            ) / visibleMachines.length
          ),
        }
      : null;

  const selectMachine = (machineId: string) => {
    if (compareMode) {
      setSelectedIds((prev) => {
        if (prev.includes(machineId)) {
          if (prev.length === 1) return prev;
          return prev.filter((id) => id !== machineId);
        }
        if (prev.length >= MAX_COMPARE_MACHINES) return prev;
        return [...prev, machineId];
      });
      return;
    }
    setSelectedIds([machineId]);
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedIds((prev) => (prev[0] ? [prev[0]] : prev));
  };

  const openSchedule = (opts?: {
    machineId?: string;
    date?: Date;
    jobKey?: string;
  }) => {
    setEditingBlock(undefined);
    setPrefillMachineId(opts?.machineId ?? visibleMachines[0]?.id);
    setPrefillDate(opts?.date ? format(opts.date, "yyyy-MM-dd") : undefined);
    setPrefillJobKey(opts?.jobKey);
    setScheduleOpen(true);
  };

  const scheduleFromBasket = (jobKey: string) => {
    openSchedule({ jobKey });
  };

  const openEdit = (block: ScheduleBlock) => {
    setEditingBlock(block);
    setScheduleOpen(true);
  };

  const singleMachineView = visibleMachines.length === 1;
  const timelineHeight = singleMachineView
    ? "max-h-[min(680px,72vh)]"
    : "max-h-[min(380px,42vh)]";

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={dashboardSectionTitleClass}>Production calendar</h1>
          <p className={cn("mt-1 max-w-2xl", dashboardTaskDetailClass)}>
            Review the scheduling queue, then drag events onto machine timelines
            to plan the week.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/app/machines" className={dashboardControlClass}>
            <Wrench className="size-4 text-[#616161]" strokeWidth={1.75} />
            Stations
          </Link>
          <button
            type="button"
            className={dashboardPrimaryButtonClass}
            onClick={() => openSchedule()}
            disabled={visibleMachines.length === 0}
          >
            <Plus className="size-4" />
            Schedule event
          </button>
        </div>
      </div>

      <EventBasketPanel onScheduleEvent={scheduleFromBasket} />

      <section className={dashboardCardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-[#303030]">
              {compareMode ? "Compare machines" : "Stations"}
            </h2>
            <p className="mt-0.5 text-[13px] text-[#616161]">
              {compareMode
                ? `Choose up to ${MAX_COMPARE_MACHINES} machines to view side by side.`
                : "Pick a station to focus on its weekly schedule."}
            </p>
          </div>
          {!compareMode ? (
            <button
              type="button"
              className={cn(dashboardControlClass, "h-8")}
              onClick={() => setCompareMode(true)}
              disabled={sortedMachines.length < 2}
            >
              <Layers className="size-3.5 text-[#616161]" strokeWidth={1.75} />
              Compare
            </button>
          ) : (
            <button
              type="button"
              className={cn(dashboardControlClass, "h-8")}
              onClick={exitCompareMode}
            >
              <X className="size-3.5 text-[#616161]" strokeWidth={1.75} />
              Single view
            </button>
          )}
        </div>

        <div className="flex gap-2.5 overflow-x-auto p-4 sm:p-5">
          {sortedMachines.map((machine) => {
            const styles = machineColorStyles[machine.color];
            const selected = selectedIds.includes(machine.id);
            const kpis = shopKpis.perMachine[machine.id];
            const utilization = Math.min(
              100,
              Math.max(0, kpis?.utilization ?? 0)
            );
            const hasConflict = (kpis?.conflictCount ?? 0) > 0;
            const atMax =
              compareMode &&
              !selected &&
              selectedIds.length >= MAX_COMPARE_MACHINES;

            return (
              <button
                key={machine.id}
                type="button"
                disabled={atMax}
                onClick={() => selectMachine(machine.id)}
                className={cn(
                  "group relative shrink-0 overflow-hidden rounded-lg border pl-3.5 pr-3 py-2.5 text-left transition-colors min-w-[170px] max-w-[230px]",
                  dashboardElevatedShadow,
                  selected
                    ? "border-[#2c6ecb]/40 bg-[#f4f7fd] ring-1 ring-[#2c6ecb]/20"
                    : "border-[#e3e3e3] bg-white hover:bg-[#fafafa]",
                  !machine.active && "opacity-70",
                  atMax && "opacity-40 cursor-not-allowed"
                )}
              >
                <span
                  className={cn("absolute inset-y-0 left-0 w-1", styles.cap)}
                  aria-hidden
                />
                <div className="flex items-center gap-2 pl-1">
                  <span
                    className={cn("size-2.5 rounded-full shrink-0", styles.dot)}
                  />
                  <p className="flex-1 truncate text-[13px] font-semibold text-[#303030]">
                    {machine.name}
                  </p>
                  {compareMode && selected && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2c6ecb] text-white">
                      <Check className="size-3" />
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate pl-1 text-[12px] tabular-nums text-[#616161]">
                  {kpis?.jobCount ?? 0} event
                  {(kpis?.jobCount ?? 0) !== 1 ? "s" : ""}
                  {kpis ? ` · ${kpis.bookedHours}h` : ""}
                  {!machine.active && " · Offline"}
                </p>
                <div className="ml-1 mt-1.5 h-1 overflow-hidden rounded-full bg-[#f1f1f1]">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      hasConflict ? "bg-[#d98c1f]" : "bg-[#2c6ecb]"
                    )}
                    style={{ width: `${utilization}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {visibleMachines.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {singleMachineKpis ? (
            <>
              <KpiCard
                label="Events this week"
                value={String(singleMachineKpis.jobCount)}
                detail={`${singleMachineKpis.todayCount} scheduled today`}
                icon={CalendarDays}
                tone="neutral"
              />
              <KpiCard
                label="Booked hours"
                value={`${singleMachineKpis.bookedHours}h`}
                detail={`${singleMachineKpis.availableHours}h available`}
                icon={Clock}
                tone="blue"
              />
              <KpiCard
                label="Utilization"
                value={`${singleMachineKpis.utilization}%`}
                detail={`Open ${singleMachineKpis.openDays} days this week`}
                icon={Layers}
                tone="green"
              />
              <KpiCard
                label="Issues"
                value={String(singleMachineKpis.conflictCount)}
                detail={
                  singleMachineKpis.conflictCount === 0
                    ? "Schedule looks clean"
                    : "Overlap or off-hours"
                }
                icon={AlertTriangle}
                tone={singleMachineKpis.conflictCount > 0 ? "red" : "neutral"}
              />
            </>
          ) : multiMachineKpis ? (
            <>
              <KpiCard
                label="Visible machines"
                value={String(visibleMachines.length)}
                detail={compareMode ? "Compare mode" : "Focused view"}
                icon={Layers}
                tone="neutral"
              />
              <KpiCard
                label="Events this week"
                value={String(multiMachineKpis.jobs)}
                detail="Across selected machines"
                icon={CalendarDays}
                tone="neutral"
              />
              <KpiCard
                label="Booked hours"
                value={`${multiMachineKpis.booked}h`}
                detail={`${multiMachineKpis.utilization}% avg utilization`}
                icon={Clock}
                tone="blue"
              />
              <KpiCard
                label="Issues"
                value={String(multiMachineKpis.conflicts)}
                detail={
                  multiMachineKpis.conflicts === 0
                    ? "No conflicts on selection"
                    : "Review red blocks below"
                }
                icon={AlertTriangle}
                tone={multiMachineKpis.conflicts > 0 ? "red" : "neutral"}
              />
            </>
          ) : null}
        </div>
      )}

      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 sm:px-4",
          dashboardCardClass
        )}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            className={cn(dashboardControlClass, "size-9 justify-center px-0")}
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4 text-[#616161]" />
          </button>
          <div className="min-w-[180px] text-center">
            <p className="text-[13px] font-semibold tabular-nums text-[#303030]">
              {format(weekDays[0], "MMM d")} –{" "}
              {format(weekDays[6], "MMM d, yyyy")}
            </p>
            <p className="text-[11px] text-[#8a8a8a]">
              Drag events to reschedule
            </p>
          </div>
          <button
            type="button"
            className={cn(dashboardControlClass, "size-9 justify-center px-0")}
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            aria-label="Next week"
          >
            <ChevronRight className="size-4 text-[#616161]" />
          </button>
          <button
            type="button"
            className={cn(dashboardControlClass, "h-9")}
            onClick={() =>
              setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
          >
            Today
          </button>
        </div>

        <button
          type="button"
          className={dashboardPrimaryButtonClass}
          onClick={() => openSchedule()}
          disabled={visibleMachines.length === 0}
        >
          <Plus className="size-4" />
          Schedule event
        </button>
      </div>

      {visibleMachines.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] py-16 text-center text-[13px] text-[#616161]">
          No machines yet.{" "}
          <Link
            href="/app/machines/settings"
            className="font-medium text-[#2c6ecb] hover:underline"
          >
            Add a machine
          </Link>{" "}
          to start scheduling.
        </div>
      ) : (
        <div className="space-y-4">
          {visibleMachines.map((machine, index) => {
            const styles = machineColorStyles[machine.color];
            const kpis = shopKpis.perMachine[machine.id];

            return (
              <section key={machine.id} className={dashboardCardClass}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={cn("size-3 shrink-0 rounded-full", styles.dot)}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={cn(
                            "truncate font-semibold text-[#303030]",
                            singleMachineView ? "text-[15px]" : "text-sm"
                          )}
                        >
                          {machine.name}
                        </h3>
                        {!machine.active && (
                          <span className="inline-flex items-center rounded-md border border-[#e3e3e3] bg-white px-2 py-0.5 text-[11px] font-medium text-[#616161]">
                            Offline
                          </span>
                        )}
                        {kpis && kpis.conflictCount > 0 && (
                          <span className="inline-flex items-center rounded-md border border-[#f0d9a8] bg-[#fff8eb] px-2 py-0.5 text-[11px] font-medium text-[#8a6116]">
                            {kpis.conflictCount} issue
                            {kpis.conflictCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-[#616161]">
                        {RESOURCE_TYPE_LABELS[machine.type]} ·{" "}
                        {formatOperatingHoursSummary(machine)}
                        {singleMachineView && kpis?.nextJobLabel && (
                          <> · Next: {kpis.nextJobLabel}</>
                        )}
                      </p>
                    </div>
                  </div>
                  {kpis && (
                    <p className="text-[12px] tabular-nums text-[#616161]">
                      {kpis.jobCount} events · {kpis.bookedHours}h ·{" "}
                      {kpis.utilization}%
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-[52px_repeat(7,minmax(100px,1fr))] border-b border-[#ebebeb] bg-[#fafafa]">
                  <div className="border-r border-[#ebebeb] px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Time
                  </div>
                  {weekDays.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "border-r border-[#ebebeb] px-2 py-2.5 text-center last:border-r-0",
                          isToday && "bg-[#f4f7fd]"
                        )}
                      >
                        <p
                          className={cn(
                            "text-xs font-medium",
                            isToday ? "text-[#2c6ecb]" : "text-[#616161]"
                          )}
                        >
                          {format(day, "EEE")}
                        </p>
                        <p
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            isToday ? "text-[#2c6ecb]" : "text-[#303030]"
                          )}
                        >
                          {format(day, "MMM d")}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="px-2 py-2 sm:px-3">
                  <MachineTimelineCalendar
                    machine={machine}
                    weekStart={weekStart}
                    embedded
                    hideWeekHeader
                    enableBlockActions
                    maxHeightClass={timelineHeight}
                    onEditBlock={openEdit}
                  />
                </div>

                {(singleMachineView ||
                  index === visibleMachines.length - 1) && (
                  <p className="border-t border-[#ebebeb] px-4 py-2.5 text-[11px] text-[#8a8a8a] sm:px-5">
                    Striped areas are outside operating hours. Red blocks
                    indicate overlaps or off-hours scheduling.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 px-1 text-[12px] text-[#616161]">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm border border-[#e3e3e3] bg-[#f1f1f1]" />
          Outside operating hours
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm border border-red-300 bg-red-50" />
          Overlap or off-hours event
        </span>
        <Link
          href="/app/machines/settings"
          className="ml-auto font-medium text-[#2c6ecb] hover:underline"
        >
          Manage machines →
        </Link>
      </div>

      <ScheduleJobDialog
        open={scheduleOpen}
        onOpenChange={(open) => {
          setScheduleOpen(open);
          if (!open) setPrefillJobKey(undefined);
        }}
        prefillMachineId={prefillMachineId}
        prefillDate={prefillDate}
        prefillJobKey={prefillJobKey}
        editingBlock={editingBlock}
      />
    </main>
  );
}

type KpiTone = "neutral" | "blue" | "green" | "amber" | "red";

const KPI_TONE_STYLES: Record<
  KpiTone,
  {
    surface: string;
    border: string;
    iconWrap: string;
    iconColor: string;
    valueColor: string;
  }
> = {
  neutral: {
    surface: "bg-white",
    border: "border-[#e3e3e3]",
    iconWrap: "bg-[#f1f1f1]",
    iconColor: "text-[#303030]",
    valueColor: "text-[#303030]",
  },
  blue: {
    surface: "bg-[#f4f7fd]",
    border: "border-[#c4d7f2]",
    iconWrap: "bg-[#e8f0fb]",
    iconColor: "text-[#2c6ecb]",
    valueColor: "text-[#2c6ecb]",
  },
  green: {
    surface: "bg-[#e8f5ee]",
    border: "border-[#86d4a8]",
    iconWrap: "bg-[#d4eddf]",
    iconColor: "text-[#0d5c2e]",
    valueColor: "text-[#0d5c2e]",
  },
  amber: {
    surface: "bg-[#fff8eb]",
    border: "border-[#f0d9a8]",
    iconWrap: "bg-[#fff1d6]",
    iconColor: "text-[#8a6116]",
    valueColor: "text-[#8a6116]",
  },
  red: {
    surface: "bg-[#fff1f1]",
    border: "border-[#f5b5b5]",
    iconWrap: "bg-[#fde2e2]",
    iconColor: "text-[#8f1f1f]",
    valueColor: "text-[#8f1f1f]",
  },
};

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: KpiTone;
}) {
  const styles = KPI_TONE_STYLES[tone];

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-lg border p-4",
        styles.surface,
        styles.border,
        dashboardElevatedShadow
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            styles.iconWrap
          )}
        >
          <Icon className={cn("size-3.5", styles.iconColor)} strokeWidth={1.75} />
        </div>
        <p className={dashboardKpiTitleClass}>{label}</p>
      </div>
      <p className={cn(dashboardValueClass, "mt-2.5", styles.valueColor)}>
        {value}
      </p>
      <p className="mt-1.5 text-xs leading-snug text-[#616161]">{detail}</p>
    </div>
  );
}
