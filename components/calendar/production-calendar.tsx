"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  addDays,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useSchedule } from "@/components/providers/schedule-provider";
import {
  DraggableScheduleChip,
  DroppableCalendarCell,
  ScheduleChipContent,
} from "@/components/calendar/calendar-dnd";
import { ScheduleJobDialog } from "@/components/calendar/schedule-job-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Machine, ScheduleBlock } from "@/types";
import {
  isSameCalendarCell,
  parseCalendarCellDropId,
  rescheduleBlockToCell,
} from "@/lib/schedule-reschedule";
import { machineColorStyles, RESOURCE_TYPE_LABELS } from "@/lib/machine-styles";
import { cn } from "@/lib/utils";

function MachineRowLabel({
  machine,
  compact,
}: {
  machine: Machine;
  compact?: boolean;
}) {
  const styles = machineColorStyles[machine.color];
  return (
    <div
      className={cn(
        "flex items-center gap-2 min-w-[180px] max-w-[200px] px-3 border-r border-border bg-white",
        compact ? "py-2" : "py-3",
        !machine.active && "opacity-50"
      )}
    >
      <span className={cn("size-2.5 rounded-full shrink-0", styles.dot)} />
      <div className="min-w-0">
        <p className="text-sm font-medium truncate text-brand-ink">
          {machine.name}
        </p>
        <p className="text-xs text-brand-muted truncate">
          {RESOURCE_TYPE_LABELS[machine.type]}
        </p>
      </div>
      {!machine.active && (
        <Badge
          variant="outline"
          className="shrink-0 text-[10px] border-slate-200 bg-slate-50"
        >
          Down
        </Badge>
      )}
    </div>
  );
}

function ScheduleChip({
  block,
  machine,
  onEdit,
  onView,
  readOnly,
  highlighted,
  contextOnly,
}: {
  block: ScheduleBlock;
  machine: Machine;
  onEdit?: () => void;
  onView?: (block: ScheduleBlock) => void;
  readOnly?: boolean;
  highlighted?: boolean;
  contextOnly?: boolean;
}) {
  const styles = machineColorStyles[machine.color];
  const start = parseISO(block.startAt);
  const end = parseISO(block.endAt);

  const className = cn(
    "w-full text-left rounded-lg border px-2.5 py-2",
    contextOnly
      ? "border-border/70 bg-muted/40 text-brand-muted opacity-80"
      : [styles.bg, styles.border, styles.text],
    highlighted && !contextOnly && "ring-2 ring-brand-primary/45 shadow-sm",
    !contextOnly &&
      (onView || !readOnly) &&
      "transition-shadow hover:shadow-md cursor-pointer"
  );

  const content = (
    <>
      <p className="text-xs font-semibold truncate">{block.orderNumber}</p>
      <p className="text-[11px] truncate opacity-90">{block.imprintLabel}</p>
      <p className="text-[10px] mt-1 opacity-75">
        {format(start, "h:mm a")} – {format(end, "h:mm a")}
      </p>
    </>
  );

  if (contextOnly) {
    return (
      <div className={className} title={`${block.orderNumber} · other order`}>
        {content}
      </div>
    );
  }

  if (readOnly && onView) {
    return (
      <button
        type="button"
        onClick={() => onView(block)}
        className={className}
      >
        {content}
      </button>
    );
  }

  if (readOnly) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button type="button" onClick={onEdit} className={className}>
      {content}
    </button>
  );
}

export type ProductionCalendarProps = {
  /** Highlights this machine's row (e.g. station view) */
  highlightMachineId?: string;
  /** View-only: no scheduling actions */
  readOnly?: boolean;
  /** Only show schedule blocks for this order (legacy — prefer highlightOrderId + toggle) */
  filterOrderId?: string;
  /** Emphasize this order's jobs; other jobs show muted for shop context */
  highlightOrderId?: string;
  /** When read-only, tap a scheduled job to open details (e.g. station) */
  onScheduleBlockClick?: (block: ScheduleBlock) => void;
  hideFooter?: boolean;
  /** Show only this machine (station floor calendar) */
  singleMachineId?: string;
  hideToolbar?: boolean;
  controlledWeekStart?: Date;
  onControlledWeekStartChange?: (date: Date) => void;
  /** Tighter layout for cards / order detail embeds */
  embedded?: boolean;
  className?: string;
};

export function ProductionCalendar({
  highlightMachineId,
  readOnly = false,
  onScheduleBlockClick,
  hideFooter = false,
  singleMachineId,
  hideToolbar = false,
  filterOrderId,
  highlightOrderId,
  controlledWeekStart,
  onControlledWeekStartChange,
  embedded = false,
  className,
}: ProductionCalendarProps = {}) {
  const { machines, scheduleBlocks, updateScheduleBlock } = useSchedule();
  const [internalWeekStart, setInternalWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const weekStart = controlledWeekStart ?? internalWeekStart;
  const setWeekStart = onControlledWeekStartChange ?? setInternalWeekStart;

  const shiftWeek = (days: number) => {
    setWeekStart(addDays(weekStart, days));
  };
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [prefillMachineId, setPrefillMachineId] = useState<string>();
  const [prefillDate, setPrefillDate] = useState<string>();
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock>();
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [orderOnlyView, setOrderOnlyView] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const visibleBlocks = useMemo(() => {
    if (highlightOrderId && orderOnlyView) {
      return scheduleBlocks.filter((b) => b.orderId === highlightOrderId);
    }
    if (filterOrderId && !highlightOrderId) {
      return scheduleBlocks.filter((b) => b.orderId === filterOrderId);
    }
    return scheduleBlocks;
  }, [scheduleBlocks, filterOrderId, highlightOrderId, orderOnlyView]);

  const showShopContext = Boolean(highlightOrderId && !orderOnlyView);

  const draggingBlock = useMemo(
    () => visibleBlocks.find((b) => b.id === draggingBlockId),
    [visibleBlocks, draggingBlockId]
  );

  const draggingMachine = useMemo(
    () =>
      draggingBlock
        ? machines.find((m) => m.id === draggingBlock.machineId)
        : undefined,
    [machines, draggingBlock]
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const sortedMachines = useMemo(() => {
    const list = singleMachineId
      ? machines.filter((m) => m.id === singleMachineId)
      : [...machines];
    return list.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [machines, singleMachineId]);

  const openSchedule = (opts?: { machineId?: string; date?: Date }) => {
    setEditingBlock(undefined);
    setPrefillMachineId(opts?.machineId);
    setPrefillDate(opts?.date ? format(opts.date, "yyyy-MM-dd") : undefined);
    setScheduleOpen(true);
  };

  const openEdit = (block: ScheduleBlock) => {
    setEditingBlock(block);
    setScheduleOpen(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingBlockId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingBlockId(null);
    const { active, over } = event;
    if (!over) return;

    const block = visibleBlocks.find((b) => b.id === active.id);
    if (!block) return;

    const target = parseCalendarCellDropId(over.id);
    if (!target) return;

    const targetMachine = machines.find((m) => m.id === target.machineId);
    if (!targetMachine?.active) return;

    if (isSameCalendarCell(block, target.machineId, target.day)) return;

    const updated = rescheduleBlockToCell(
      block,
      target.day,
      target.machineId,
      targetMachine
    );
    if (!updated) return;
    updateScheduleBlock(block.id, updated);
  };

  const handleDragCancel = () => {
    setDraggingBlockId(null);
  };

  const rowMinH = embedded ? "min-h-[68px]" : "min-h-[88px]";
  const cellPad = embedded ? "p-1.5" : "p-2";
  const cellMinH = embedded ? "min-h-[68px]" : "min-h-[88px]";
  const addSlotMinH = embedded ? "min-h-[48px]" : "min-h-[60px]";

  const toolbar =
    !hideToolbar && (
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 sm:gap-3",
          embedded
            ? "border-b border-border bg-brand-surface/40 px-3 py-2.5"
            : "mb-6"
        )}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "rounded-full bg-white",
              embedded && "size-8"
            )}
            onClick={() => shiftWeek(-7)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className={cn("text-center", embedded ? "min-w-[140px]" : "min-w-[200px]")}>
            <p
              className={cn(
                "font-semibold text-brand-ink",
                embedded ? "text-xs sm:text-sm" : "text-sm"
              )}
            >
              {format(weekDays[0], "MMM d")} – {format(weekDays[6], "MMM d, yyyy")}
            </p>
            {!embedded && (
              <p className="text-xs text-brand-muted">
                Production schedule by machine
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "rounded-full bg-white",
              embedded && "size-8"
            )}
            onClick={() => shiftWeek(7)}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("text-brand-primary", embedded && "h-8 px-2 text-xs")}
            onClick={() =>
              setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
          >
            Today
          </Button>
        </div>

        {!readOnly && !filterOrderId && !highlightOrderId && (
          <Button
            className={cn("rounded-full", embedded && "h-8 text-xs px-4")}
            onClick={() => openSchedule()}
          >
            <Plus className="size-3.5" />
            Schedule event
          </Button>
        )}

        {highlightOrderId && embedded && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
            {showShopContext && (
              <p className="hidden sm:flex items-center gap-3 text-[10px] text-brand-muted">
                <span className="inline-flex items-center gap-1">
                  <span className="size-2.5 rounded-md ring-2 ring-brand-primary/50 bg-white" />
                  This order
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-2.5 rounded-md bg-muted border border-border" />
                  Other events
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    );

  const calendarGrid = (
      <div
        className={cn(
          "overflow-hidden bg-white",
          embedded
            ? "rounded-xl border border-border"
            : "rounded-2xl border border-border shadow-sm"
        )}
      >
        {embedded && toolbar}
        <div className="overflow-x-auto">
          <div className={cn("min-w-0", singleMachineId ? "min-w-[640px]" : "min-w-[900px]")}>
            <div
              className={cn(
                "grid border-b border-border bg-brand-surface/50",
                singleMachineId
                  ? "grid-cols-[repeat(7,1fr)]"
                  : "grid-cols-[200px_repeat(7,1fr)]"
              )}
            >
              {!singleMachineId && (
              <div className={cn(
                "px-3 text-xs font-semibold uppercase tracking-wide text-brand-muted border-r border-border",
                embedded ? "py-2" : "py-3"
              )}>
                Machine
              </div>
              )}
              {weekDays.map((day) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "px-2 text-center border-r border-border last:border-r-0",
                      embedded ? "py-2" : "py-3",
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

            {sortedMachines.length === 0 ? (
              <div className="p-12 text-center text-sm text-brand-muted">
                No machines yet.{" "}
                <Link href="/app/machines" className="text-brand-primary hover:underline">
                  Add your first machine
                </Link>{" "}
                to start scheduling.
              </div>
            ) : (
              sortedMachines.map((machine) => (
                <div
                  key={machine.id}
                  className={cn(
                    "grid border-b border-border last:border-b-0",
                    rowMinH,
                    singleMachineId
                      ? "grid-cols-[repeat(7,1fr)]"
                      : "grid-cols-[200px_repeat(7,1fr)]",
                    !machine.active && "bg-muted/20",
                    highlightMachineId === machine.id &&
                      "bg-brand-primary/[0.06] ring-2 ring-inset ring-brand-primary/30"
                  )}
                >
                  {!singleMachineId && (
                    <MachineRowLabel machine={machine} compact={embedded} />
                  )}
                  {weekDays.map((day) => {
                    const dayBlocks = visibleBlocks
                      .filter(
                        (b) =>
                          b.machineId === machine.id &&
                          isSameDay(parseISO(b.startAt), day)
                      )
                      .sort((a, b) => {
                        if (!highlightOrderId) return 0;
                        const aMine = a.orderId === highlightOrderId ? 1 : 0;
                        const bMine = b.orderId === highlightOrderId ? 1 : 0;
                        return bMine - aMine;
                      });
                    const isToday = isSameDay(day, new Date());
                    const hasOwnBlock =
                      highlightOrderId &&
                      dayBlocks.some((b) => b.orderId === highlightOrderId);

                    const cellInner = (
                      <>
                        {dayBlocks.map((block) => {
                          const isThisOrder =
                            highlightOrderId &&
                            block.orderId === highlightOrderId;
                          const contextOnly = showShopContext && !isThisOrder;

                          return readOnly || contextOnly ? (
                            <ScheduleChip
                              key={block.id}
                              block={block}
                              machine={machine}
                              readOnly={readOnly || contextOnly}
                              contextOnly={contextOnly}
                              highlighted={Boolean(isThisOrder)}
                              onEdit={
                                readOnly || contextOnly
                                  ? undefined
                                  : () => openEdit(block)
                              }
                              onView={
                                readOnly ? onScheduleBlockClick : undefined
                              }
                            />
                          ) : (
                            <DraggableScheduleChip
                              key={block.id}
                              block={block}
                              machine={machine}
                              highlighted={Boolean(isThisOrder)}
                              onEdit={() => openEdit(block)}
                            />
                          );
                        })}
                        {!readOnly &&
                          machine.active &&
                          (!highlightOrderId || !hasOwnBlock) && (
                            <button
                              type="button"
                              onClick={() =>
                                openSchedule({
                                  machineId: machine.id,
                                  date: day,
                                })
                              }
                              className={cn(
                                "flex w-full items-center justify-center rounded-md border border-dashed border-border/80 text-[11px] text-brand-muted hover:border-brand-primary/40 hover:text-brand-primary hover:bg-brand-primary/5 transition-colors",
                                addSlotMinH
                              )}
                            >
                              + Add
                            </button>
                          )}
                        {readOnly && dayBlocks.length === 0 && (
                          <div className={addSlotMinH} aria-hidden />
                        )}
                        {!machine.active && dayBlocks.length === 0 && (
                          <div
                            className={cn(
                              "flex items-center justify-center text-[10px] text-brand-muted",
                              addSlotMinH
                            )}
                          >
                            Unavailable
                          </div>
                        )}
                      </>
                    );

                    return readOnly ? (
                      <div
                        key={`${machine.id}-${day.toISOString()}`}
                        className={cn(
                          cellPad,
                          "border-r border-border last:border-r-0 space-y-1",
                          cellMinH,
                          isToday && "bg-brand-primary/[0.03]"
                        )}
                      >
                        {cellInner}
                      </div>
                    ) : (
                      <DroppableCalendarCell
                        key={`${machine.id}-${day.toISOString()}`}
                        machineId={machine.id}
                        day={day}
                        machineActive={machine.active}
                        isToday={isToday}
                        className={cn(cellPad, cellMinH, "space-y-1")}
                      >
                        {cellInner}
                      </DroppableCalendarCell>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
  );

  return (
    <div className={className}>
      {!embedded && toolbar}

      {readOnly ? (
        calendarGrid
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {calendarGrid}
          <DragOverlay dropAnimation={{ duration: 200, easing: "ease-out" }}>
            {draggingBlock && draggingMachine ? (
              <div
                className={cn(
                  "w-[148px] cursor-grabbing rounded-lg border px-2.5 py-2 shadow-lg ring-2 ring-brand-primary/30",
                  machineColorStyles[draggingMachine.color].bg,
                  machineColorStyles[draggingMachine.color].border,
                  machineColorStyles[draggingMachine.color].text
                )}
              >
                <ScheduleChipContent
                  block={draggingBlock}
                  machine={draggingMachine}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {!hideFooter && (
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-brand-muted">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500" />
            Active machines can be scheduled
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-slate-400" />
            Inactive machines are blocked from new events
          </span>
          {!readOnly && (
            <>
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-brand-primary" />
                Drag events to another day or machine to reschedule
              </span>
              <Link
                href="/app/machines"
                className="text-brand-primary hover:underline ml-auto"
              >
                Manage machines →
              </Link>
            </>
          )}
        </div>
      )}

      {!readOnly && (
        <ScheduleJobDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          prefillMachineId={prefillMachineId}
          prefillDate={prefillDate}
          filterOrderId={filterOrderId}
          editingBlock={editingBlock}
        />
      )}
    </div>
  );
}
