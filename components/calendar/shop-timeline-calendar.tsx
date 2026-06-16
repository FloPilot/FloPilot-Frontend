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
  X,
} from "lucide-react";
import { EventBasketPanel } from "@/components/calendar/event-basket-panel";
import { MachineTimelineCalendar } from "@/components/station/machine-timeline-calendar";
import { ScheduleJobDialog } from "@/components/calendar/schedule-job-dialog";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { computeMachineWeekKpis, computeShopWeekKpis } from "@/lib/calendar-kpis";
import {
  machineColorStyles,
  RESOURCE_TYPE_LABELS,
} from "@/lib/machine-styles";
import { formatOperatingHoursSummary } from "@/lib/machine-hours";
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
  const { machines, scheduleBlocks } = useSchedule();
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
    () => computeShopWeekKpis(machines, scheduleBlocks, weekStart),
    [machines, scheduleBlocks, weekStart]
  );

  const singleMachineKpis =
    visibleMachines.length === 1
      ? computeMachineWeekKpis(
          visibleMachines[0],
          scheduleBlocks,
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
    <div className="space-y-5">
      <EventBasketPanel onScheduleEvent={scheduleFromBasket} />

      <div className="rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-ink">
              {compareMode ? "Compare machines" : "Select a machine"}
            </p>
            <p className="text-xs text-brand-muted mt-0.5">
              {compareMode
                ? `Choose up to ${MAX_COMPARE_MACHINES} machines to view side by side.`
                : "Pick one station to focus on its weekly schedule."}
            </p>
          </div>
          {!compareMode ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full bg-white shrink-0"
              onClick={() => setCompareMode(true)}
              disabled={sortedMachines.length < 2}
            >
              <Layers className="size-3.5" />
              Compare
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full bg-white shrink-0"
              onClick={exitCompareMode}
            >
              <X className="size-3.5" />
              Single view
            </Button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {sortedMachines.map((machine) => {
            const styles = machineColorStyles[machine.color];
            const selected = selectedIds.includes(machine.id);
            const kpis = shopKpis.perMachine[machine.id];
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
                  "shrink-0 flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-all min-w-[148px] max-w-[220px]",
                  selected
                    ? "border-brand-primary/40 bg-brand-primary/5 shadow-sm ring-1 ring-brand-primary/20"
                    : "border-border bg-white hover:border-brand-primary/25 hover:bg-brand-primary/[0.03]",
                  !machine.active && "opacity-70",
                  atMax && "opacity-40 cursor-not-allowed"
                )}
              >
                <span
                  className={cn("size-2.5 rounded-full shrink-0", styles.dot)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate text-brand-ink">
                    {machine.name}
                  </p>
                  <p className="text-[11px] text-brand-muted truncate">
                    {kpis?.jobCount ?? 0} event
                    {(kpis?.jobCount ?? 0) !== 1 ? "s" : ""} this week
                    {!machine.active && " · Offline"}
                  </p>
                </div>
                {compareMode && selected && (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white">
                    <Check className="size-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {visibleMachines.length > 0 && (
        <div
          className={cn(
            "grid gap-3",
            singleMachineView ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-4"
          )}
        >
          {singleMachineKpis ? (
            <>
              <KpiCard
                label="Events this week"
                value={String(singleMachineKpis.jobCount)}
                detail={`${singleMachineKpis.todayCount} scheduled today`}
                icon={CalendarDays}
              />
              <KpiCard
                label="Booked hours"
                value={`${singleMachineKpis.bookedHours}h`}
                detail={`${singleMachineKpis.availableHours}h available`}
                icon={Clock}
              />
              <KpiCard
                label="Utilization"
                value={`${singleMachineKpis.utilization}%`}
                detail={`Open ${singleMachineKpis.openDays} days this week`}
                icon={Layers}
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
                tone={singleMachineKpis.conflictCount > 0 ? "warning" : "good"}
              />
            </>
          ) : multiMachineKpis ? (
            <>
              <KpiCard
                label="Visible machines"
                value={String(visibleMachines.length)}
                detail={compareMode ? "Compare mode" : "Focused view"}
                icon={Layers}
              />
              <KpiCard
                label="Events this week"
                value={String(multiMachineKpis.jobs)}
                detail="Across selected machines"
                icon={CalendarDays}
              />
              <KpiCard
                label="Booked hours"
                value={`${multiMachineKpis.booked}h`}
                detail={`${multiMachineKpis.utilization}% avg utilization`}
                icon={Clock}
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
                tone={multiMachineKpis.conflicts > 0 ? "warning" : "good"}
              />
            </>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full bg-white"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="min-w-[200px] text-center">
            <p className="text-sm font-semibold text-brand-ink">
              {format(weekDays[0], "MMM d")} –{" "}
              {format(weekDays[6], "MMM d, yyyy")}
            </p>
            <p className="text-xs text-brand-muted">
              Drag events on the timeline to reschedule
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full bg-white"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-brand-primary rounded-full"
            onClick={() =>
              setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
          >
            Today
          </Button>
        </div>

        <Button
          className="rounded-full"
          onClick={() => openSchedule()}
          disabled={visibleMachines.length === 0}
        >
          <Plus className="size-4" />
          Schedule event
        </Button>
      </div>

      {visibleMachines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-brand-muted">
          No machines yet.{" "}
          <Link
            href="/app/machines/settings"
            className="text-brand-primary hover:underline"
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
              <div
                key={machine.id}
                className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden"
              >
                {!singleMachineView && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={cn("size-3 rounded-full shrink-0", styles.dot)}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-brand-ink truncate">
                            {machine.name}
                          </h3>
                          {!machine.active && (
                            <Badge
                              variant="outline"
                              className="rounded-full text-[10px] border-slate-200"
                            >
                              Offline
                            </Badge>
                          )}
                          {kpis && kpis.conflictCount > 0 && (
                            <Badge
                              variant="outline"
                              className="rounded-full text-[10px] border-amber-200 bg-amber-50 text-amber-800"
                            >
                              {kpis.conflictCount} issue
                              {kpis.conflictCount !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-brand-muted truncate">
                          {RESOURCE_TYPE_LABELS[machine.type]} ·{" "}
                          {formatOperatingHoursSummary(machine)}
                        </p>
                      </div>
                    </div>
                    {kpis && (
                      <p className="text-xs text-brand-muted tabular-nums">
                        {kpis.jobCount} events · {kpis.bookedHours}h ·{" "}
                        {kpis.utilization}%
                      </p>
                    )}
                  </div>
                )}

                {singleMachineView && (
                  <div className="border-b border-border/80 px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn("size-3 rounded-full shrink-0", styles.dot)}
                      />
                      <h3 className="text-base font-semibold text-brand-ink">
                        {machine.name}
                      </h3>
                      {!machine.active && (
                        <Badge variant="outline" className="rounded-full">
                          Offline
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-brand-muted mt-1">
                      {RESOURCE_TYPE_LABELS[machine.type]} ·{" "}
                      {formatOperatingHoursSummary(machine)}
                      {kpis?.nextJobLabel && (
                        <> · Next: {kpis.nextJobLabel}</>
                      )}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-[52px_repeat(7,minmax(100px,1fr))] border-b border-border bg-brand-surface/50">
                  <div className="border-r border-border px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-brand-muted">
                    Time
                  </div>
                  {weekDays.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "px-2 py-2.5 text-center border-r border-border last:border-r-0",
                          isToday && "bg-brand-primary/5"
                        )}
                      >
                        <p
                          className={cn(
                            "text-xs font-medium",
                            isToday ? "text-brand-primary" : "text-brand-muted"
                          )}
                        >
                          {format(day, "EEE")}
                        </p>
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            isToday ? "text-brand-primary" : "text-brand-ink"
                          )}
                        >
                          {format(day, "MMM d")}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="px-2 sm:px-3 py-2">
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

                {(singleMachineView || index === visibleMachines.length - 1) && (
                  <p className="px-5 pb-3 text-[11px] text-brand-muted">
                    Striped areas are outside operating hours. Red blocks
                    indicate overlaps or off-hours scheduling.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-brand-muted">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-muted/60 border border-border" />
          Outside operating hours
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-red-50 border border-red-300" />
          Overlap or off-hours event
        </span>
        <Link
          href="/app/machines/settings"
          className="text-brand-primary hover:underline ml-auto"
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
    </div>
  );
}

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
  icon: typeof CalendarDays;
  tone?: "good" | "warning" | "neutral";
}) {
  const styles =
    tone === "good"
      ? "border-emerald-200/80 bg-emerald-50/80"
      : tone === "warning"
        ? "border-amber-200/80 bg-amber-50/80"
        : "border-border/60 bg-white";

  return (
    <div className={cn("rounded-xl border px-4 py-3 shadow-sm", styles)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
          {label}
        </p>
        <Icon className="size-4 text-brand-muted shrink-0" />
      </div>
      <p className="text-2xl font-semibold text-brand-ink mt-1 tabular-nums">
        {value}
      </p>
      <p className="text-xs text-brand-muted mt-0.5">{detail}</p>
    </div>
  );
}
