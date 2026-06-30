"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
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
  startOfDay,
} from "date-fns";
import { useSchedule } from "@/components/providers/schedule-provider";
import { ScheduleBlockActionsMenu } from "@/components/calendar/schedule-block-actions-menu";
import { ScheduleChipContent } from "@/components/calendar/calendar-dnd";
import type { Machine, ScheduleBlock } from "@/types";
import { getBlocksForMachine } from "@/lib/station-utils";
import {
  blockTimelinePosition,
  formatOperatingHoursSummary,
  formatTimelineHour,
  getTimelineLayout,
  getOutsideHoursBlockIds,
  getUnavailableRegionsPx,
  isMachineOpenOnDay,
  rescheduleBlockOnTimeline,
  resizeBlockOnTimeline,
  snapTopPx,
  TIMELINE_ROW_HEIGHT_PX,
  TIMELINE_SLOT_MINUTES,
} from "@/lib/machine-hours";
import {
  getCalendarCellDropId,
  getOverlappingBlockIds,
  isBlockInWeek,
  moveBlockToMachine,
  parseCalendarCellDropId,
  scheduleBlocksOverlap,
} from "@/lib/schedule-reschedule";
import { machineColorStyles } from "@/lib/machine-styles";
import { cn } from "@/lib/utils";

const TIMELINE_BLOCK_INSET_PX = 6;
const TIMELINE_BLOCK_LANE_GAP_PX = 2;

type BlockLane = { index: number; total: number };

function computeBlockLanes(blocks: ScheduleBlock[]): Map<string, BlockLane> {
  const map = new Map<string, BlockLane>();
  if (blocks.length === 0) return map;

  const sorted = [...blocks].sort(
    (a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime()
  );

  for (const block of sorted) {
    const cluster = sorted.filter(
      (b) => b.id === block.id || scheduleBlocksOverlap(b, block)
    );
    const ordered = [...cluster].sort((a, b) => a.id.localeCompare(b.id));
    map.set(block.id, {
      index: ordered.findIndex((b) => b.id === block.id),
      total: ordered.length,
    });
  }
  return map;
}

function getTimelineBlockHorizontalStyle(lane: BlockLane): {
  left: string;
  width: string;
} {
  if (lane.total <= 1) {
    return {
      left: `${TIMELINE_BLOCK_INSET_PX}px`,
      width: `calc(100% - ${TIMELINE_BLOCK_INSET_PX * 2}px)`,
    };
  }
  const gaps = (lane.total - 1) * TIMELINE_BLOCK_LANE_GAP_PX;
  const insetTotal = TIMELINE_BLOCK_INSET_PX * 2;
  return {
    width: `calc((100% - ${insetTotal + gaps}px) / ${lane.total})`,
    left: `calc(${TIMELINE_BLOCK_INSET_PX}px + ${lane.index} * ((100% - ${insetTotal + gaps}px) / ${lane.total} + ${TIMELINE_BLOCK_LANE_GAP_PX}px))`,
  };
}

const overlapBlockStyles =
  "bg-red-50 border-red-400 text-red-950 ring-2 ring-inset ring-red-300/80";

const unavailableRegionStyles =
  "bg-muted/60 bg-[repeating-linear-gradient(-45deg,transparent,transparent_6px,rgba(0,0,0,0.04)_6px,rgba(0,0,0,0.04)_12px)]";

function blockHasSchedulingConflict(
  hasOverlap?: boolean,
  outsideHours?: boolean
): boolean {
  return Boolean(hasOverlap || outsideHours);
}

function TimelineDraggableBlock({
  block,
  machine,
  machines,
  lane,
  hasOverlap,
  outsideHours,
  highlighted,
  muted,
  enableBlockActions,
  onEdit,
  onViewOrder,
  onMoveToMachine,
  onRemove,
  onResize,
}: {
  block: ScheduleBlock;
  machine: Machine;
  machines?: Machine[];
  lane: BlockLane;
  hasOverlap?: boolean;
  outsideHours?: boolean;
  highlighted?: boolean;
  muted?: boolean;
  enableBlockActions?: boolean;
  onEdit: () => void;
  onViewOrder?: () => void;
  onMoveToMachine?: (machineId: string) => boolean;
  onRemove?: () => void;
  onResize?: (newHeightPx: number) => void;
}) {
  const styles = machineColorStyles[machine.color];
  const hasConflict = blockHasSchedulingConflict(hasOverlap, outsideHours);
  const { topPx, heightPx } = blockTimelinePosition(block, machine);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: block.id,
    data: {
      block,
      topPx,
      heightPx,
      day: startOfDay(parseISO(block.startAt)),
    },
  });

  const [resizeHeightPx, setResizeHeightPx] = useState<number | null>(null);
  const resizingRef = useRef(false);

  const blockHeight = Math.max(heightPx, TIMELINE_ROW_HEIGHT_PX * 2);
  const displayHeight =
    resizeHeightPx != null
      ? Math.max(TIMELINE_ROW_HEIGHT_PX, resizeHeightPx)
      : blockHeight;
  const horizontal = getTimelineBlockHorizontalStyle(lane);
  const blockPosition: CSSProperties = {
    top: topPx,
    height: displayHeight,
    left: horizontal.left,
    width: horizontal.width,
  };

  const handleResizeStart = (e: React.PointerEvent) => {
    if (!onResize) return;
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = true;
    const startY = e.clientY;
    const base = heightPx;
    setResizeHeightPx(Math.max(TIMELINE_ROW_HEIGHT_PX, base));

    const onMove = (ev: PointerEvent) => {
      const dy = ev.clientY - startY;
      setResizeHeightPx(Math.max(TIMELINE_ROW_HEIGHT_PX, base + dy));
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const dy = ev.clientY - startY;
      const finalHeight = Math.max(TIMELINE_ROW_HEIGHT_PX, base + dy);
      setResizeHeightPx(null);
      onResize(finalHeight);
      window.setTimeout(() => {
        resizingRef.current = false;
      }, 0);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const blockButton = (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (isDragging || resizingRef.current) {
          e.preventDefault();
          return;
        }
        onEdit();
      }}
      style={enableBlockActions ? { height: "100%", width: "100%" } : blockPosition}
      className={cn(
        "group/block touch-none overflow-hidden rounded-md border px-1.5 py-1 text-left min-w-0 box-border",
        !enableBlockActions && "absolute z-10",
        enableBlockActions && "relative h-full w-full",
        hasConflict
          ? overlapBlockStyles
          : muted
            ? "bg-muted/45 border-border/70 text-brand-muted"
            : [styles.bg, styles.border, styles.text],
        highlighted &&
          !hasConflict &&
          !muted &&
          "ring-2 ring-inset ring-brand-primary/40",
        muted && !hasConflict && "opacity-90",
        "cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md hover:z-20",
        hasConflict && "z-20",
        isDragging && "opacity-30"
      )}
    >
      <ScheduleChipContent
        block={block}
        machine={machine}
        showDragHint={lane.total === 1}
        hasOverlap={hasOverlap}
        outsideHours={outsideHours}
      />
      {onResize && (
        <span
          onPointerDown={handleResizeStart}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 z-20 flex h-2.5 cursor-ns-resize touch-none items-end justify-center opacity-0 transition-opacity group-hover/block:opacity-100"
          title="Drag to change duration"
          aria-hidden
        >
          <span className="mb-[3px] h-1 w-7 rounded-full bg-black/25" />
        </span>
      )}
    </button>
  );

  if (enableBlockActions && machines && onMoveToMachine && onRemove) {
    return (
      <ScheduleBlockActionsMenu
        block={block}
        currentMachineId={machine.id}
        machines={machines}
        onEdit={onEdit}
        onViewOrder={onViewOrder}
        onMoveToMachine={onMoveToMachine}
        onRemove={onRemove}
        className="absolute z-10 min-w-0 overflow-hidden"
        style={blockPosition}
      >
        {blockButton}
      </ScheduleBlockActionsMenu>
    );
  }

  return blockButton;
}

function TimelineContextBlock({
  block,
  machine,
  lane,
}: {
  block: ScheduleBlock;
  machine: Machine;
  lane: BlockLane;
}) {
  const { topPx, heightPx } = blockTimelinePosition(block, machine);
  const horizontal = getTimelineBlockHorizontalStyle(lane);

  return (
    <div
      style={{
        top: topPx,
        height: Math.max(heightPx, TIMELINE_ROW_HEIGHT_PX * 2),
        left: horizontal.left,
        width: horizontal.width,
      }}
      className="absolute z-[5] overflow-hidden rounded-md border border-border/70 bg-muted/45 px-1.5 py-1 text-left opacity-75 pointer-events-none min-w-0 box-border"
      title={`${block.orderNumber} · other order`}
    >
      <p className="text-xs font-semibold truncate text-brand-muted">
        {block.orderNumber}
      </p>
      <p className="text-[11px] truncate text-brand-muted/90">
        {block.imprintLabel}
      </p>
    </div>
  );
}

function TimelineDayColumn({
  day,
  machine,
  blocks,
  displayBlocks,
  isToday,
  highlightOrderId,
  showShopContext,
  machines,
  enableBlockActions,
  onEditBlock,
  onViewOrderBlock,
  onMoveBlockToMachine,
  onRemoveBlock,
  onResizeBlock,
}: {
  day: Date;
  machine: Machine;
  /** All blocks this day — used for overlap detection */
  blocks: ScheduleBlock[];
  /** Blocks to render (may exclude other orders in focus mode) */
  displayBlocks: ScheduleBlock[];
  isToday: boolean;
  highlightOrderId?: string;
  showShopContext?: boolean;
  machines?: Machine[];
  enableBlockActions?: boolean;
  onEditBlock: (block: ScheduleBlock) => void;
  onViewOrderBlock?: (block: ScheduleBlock) => void;
  onMoveBlockToMachine?: (
    block: ScheduleBlock,
    machineId: string
  ) => boolean;
  onRemoveBlock?: (block: ScheduleBlock) => void;
  onResizeBlock?: (block: ScheduleBlock, newHeightPx: number) => void;
}) {
  const { totalHeightPx, slotsPerHour, displayStartHour, displayEndHour } =
    getTimelineLayout(machine);
  const dayOpen = isMachineOpenOnDay(machine, day);
  const unavailable = getUnavailableRegionsPx(machine, day);
  const cellId = getCalendarCellDropId(machine.id, day);
  const { setNodeRef, isOver } = useDroppable({
    id: cellId,
    data: { machineId: machine.id, day },
    disabled: !machine.active || !dayOpen,
  });

  const hourLines = Array.from(
    { length: displayEndHour - displayStartHour },
    (_, i) => displayStartHour + i
  );

  const overlappingIds = useMemo(
    () => getOverlappingBlockIds(blocks),
    [blocks]
  );
  const outsideHoursIds = useMemo(
    () => getOutsideHoursBlockIds(machine, blocks),
    [machine, blocks]
  );

  const blockLanes = useMemo(
    () => computeBlockLanes(displayBlocks),
    [displayBlocks]
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative border-r border-border last:border-r-0 min-w-[100px] flex-1 transition-colors overflow-hidden",
        isToday && "bg-brand-primary/[0.04]",
        !dayOpen && "bg-muted/40",
        isOver &&
          machine.active &&
          dayOpen &&
          "bg-brand-primary/10 ring-2 ring-inset ring-brand-primary/25"
      )}
      style={{ height: totalHeightPx }}
    >
      {hourLines.map((hour) => (
        <div
          key={hour}
          className="absolute left-0 right-0 border-t border-border/50 pointer-events-none"
          style={{
            top:
              (hour - displayStartHour) * slotsPerHour * TIMELINE_ROW_HEIGHT_PX,
          }}
        />
      ))}

      {unavailable.map((region, i) => (
        <div
          key={i}
          className={cn(
            "absolute left-0 right-0 pointer-events-none z-[1]",
            unavailableRegionStyles
          )}
          style={{ top: region.topPx, height: region.heightPx }}
          aria-hidden
        />
      ))}

      {displayBlocks.map((block) => {
        const isThisOrder =
          highlightOrderId && block.orderId === highlightOrderId;
        const contextOnly = showShopContext && !isThisOrder;
        const lane = blockLanes.get(block.id) ?? { index: 0, total: 1 };

        if (contextOnly && !enableBlockActions) {
          return (
            <TimelineContextBlock
              key={block.id}
              block={block}
              machine={machine}
              lane={lane}
            />
          );
        }

        return (
          <TimelineDraggableBlock
            key={block.id}
            block={block}
            machine={machine}
            machines={machines}
            lane={lane}
            hasOverlap={overlappingIds.has(block.id)}
            outsideHours={outsideHoursIds.has(block.id)}
            highlighted={Boolean(isThisOrder)}
            muted={Boolean(contextOnly)}
            enableBlockActions={enableBlockActions}
            onEdit={() => onEditBlock(block)}
            onViewOrder={
              onViewOrderBlock
                ? () => onViewOrderBlock(block)
                : undefined
            }
            onMoveToMachine={(machineId) =>
              onMoveBlockToMachine?.(block, machineId) ?? false
            }
            onRemove={() => onRemoveBlock?.(block)}
            onResize={
              enableBlockActions && onResizeBlock
                ? (newHeightPx) => onResizeBlock(block, newHeightPx)
                : undefined
            }
          />
        );
      })}
    </div>
  );
}

export function MachineTimelineCalendar({
  machine,
  weekStart,
  highlightOrderId,
  orderOnlyView = false,
  embedded = false,
  hideWeekHeader = false,
  maxHeightClass,
  enableBlockActions = false,
  onEditBlock,
  onViewOrderBlock,
  /** @deprecated Use onEditBlock */
  onSelectBlock,
  onBlockMoved,
  onRemoveBlock,
}: {
  machine: Machine;
  weekStart: Date;
  highlightOrderId?: string;
  orderOnlyView?: boolean;
  embedded?: boolean;
  hideWeekHeader?: boolean;
  maxHeightClass?: string;
  enableBlockActions?: boolean;
  onEditBlock?: (block: ScheduleBlock) => void;
  onViewOrderBlock?: (block: ScheduleBlock) => void;
  onSelectBlock?: (block: ScheduleBlock) => void;
  onBlockMoved?: (machineId: string) => void;
  onRemoveBlock?: (block: ScheduleBlock) => void;
}) {
  const handleEditBlock = onEditBlock ?? onSelectBlock;
  const { machines, scheduleBlocks, updateScheduleBlock, removeScheduleBlock } =
    useSchedule();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOriginTop, setDragOriginTop] = useState(0);

  const showShopContext = Boolean(highlightOrderId && !orderOnlyView);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const { totalHeightPx, slotCount, displayStartHour } = getTimelineLayout(machine);

  const timeLabels = useMemo(
    () =>
      Array.from({ length: slotCount }, (_, i) => {
        const hour =
          displayStartHour +
          Math.floor((i * TIMELINE_SLOT_MINUTES) / 60);
        const minute = (i * TIMELINE_SLOT_MINUTES) % 60;
        return { i, hour, minute, showLabel: minute === 0 };
      }),
    [slotCount, displayStartHour]
  );

  const allWeekBlocks = useMemo(
    () =>
      getBlocksForMachine(scheduleBlocks, machine.id).filter((b) =>
        isBlockInWeek(b, weekStart)
      ),
    [scheduleBlocks, machine.id, weekStart]
  );

  const weekBlocks = useMemo(() => {
    if (highlightOrderId && orderOnlyView) {
      return allWeekBlocks.filter((b) => b.orderId === highlightOrderId);
    }
    return allWeekBlocks;
  }, [allWeekBlocks, highlightOrderId, orderOnlyView]);

  const draggableBlocks = useMemo(() => {
    if (!highlightOrderId) return allWeekBlocks;
    if (showShopContext && enableBlockActions) return allWeekBlocks;
    return allWeekBlocks.filter((b) => b.orderId === highlightOrderId);
  }, [allWeekBlocks, highlightOrderId, showShopContext, enableBlockActions]);

  const blocksByDay = useMemo(() => {
    const allMap = new Map<string, ScheduleBlock[]>();
    const displayMap = new Map<string, ScheduleBlock[]>();
    for (const day of weekDays) {
      allMap.set(day.toISOString(), []);
      displayMap.set(day.toISOString(), []);
    }
    for (const block of allWeekBlocks) {
      const dayKey = startOfDay(parseISO(block.startAt)).toISOString();
      const allList = allMap.get(dayKey);
      if (allList) allList.push(block);
    }
    for (const block of weekBlocks) {
      const dayKey = startOfDay(parseISO(block.startAt)).toISOString();
      const displayList = displayMap.get(dayKey);
      if (displayList) displayList.push(block);
    }
    return { allMap, displayMap };
  }, [allWeekBlocks, weekBlocks, weekDays]);

  const draggingBlock = draggableBlocks.find((b) => b.id === draggingId);

  const draggingHasOverlap = useMemo(() => {
    if (!draggingBlock) return false;
    const dayKey = startOfDay(parseISO(draggingBlock.startAt)).toISOString();
    const dayBlocks = blocksByDay.allMap.get(dayKey) ?? [];
    return dayBlocks.some(
      (b) =>
        b.id !== draggingBlock.id &&
        scheduleBlocksOverlap(b, draggingBlock)
    );
  }, [draggingBlock, blocksByDay]);

  const draggingOutsideHours = useMemo(() => {
    if (!draggingBlock) return false;
    return getOutsideHoursBlockIds(machine, [draggingBlock]).has(draggingBlock.id);
  }, [draggingBlock, machine]);

  const draggingHasConflict = blockHasSchedulingConflict(
    draggingHasOverlap,
    draggingOutsideHours
  );

  const handleDragStart = (event: DragStartEvent) => {
    const block = draggableBlocks.find((b) => b.id === event.active.id);
    if (!block) return;
    setDraggingId(String(event.active.id));
    setDragOriginTop(blockTimelinePosition(block, machine).topPx);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingId(null);
    const { active, over, delta } = event;
    if (!over) return;

    const block = draggableBlocks.find((b) => b.id === active.id);
    const target = parseCalendarCellDropId(over.id);
    if (!block || !target || target.machineId !== machine.id) return;

    const { heightPx } = blockTimelinePosition(block, machine);
    const newTopPx = snapTopPx(dragOriginTop + delta.y, heightPx, machine);

    const updated = rescheduleBlockOnTimeline(
      block,
      target.day,
      newTopPx,
      machine
    );
    if (updated) {
      updateScheduleBlock(block.id, updated);
    }
  };

  const handleMoveBlockToMachine = (
    block: ScheduleBlock,
    targetMachineId: string
  ): boolean => {
    const targetMachine = machines.find((m) => m.id === targetMachineId);
    if (!targetMachine) return false;
    const updated = moveBlockToMachine(block, targetMachine);
    if (!updated) return false;
    updateScheduleBlock(block.id, updated);
    onBlockMoved?.(targetMachineId);
    return true;
  };

  const handleResizeBlock = (block: ScheduleBlock, newHeightPx: number) => {
    const updated = resizeBlockOnTimeline(block, newHeightPx, machine);
    if (updated) updateScheduleBlock(block.id, updated);
  };

  const handleRemoveBlock = (block: ScheduleBlock) => {
    if (
      confirm(
        `Remove ${block.imprintLabel} from the schedule? This cannot be undone.`
      )
    ) {
      removeScheduleBlock(block.id);
      onRemoveBlock?.(block);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDraggingId(null)}
    >
      {!embedded && (
        <p className="text-xs text-brand-muted mb-3">
          Hours: {formatOperatingHoursSummary(machine)}. Striped areas are outside
          operating hours and cannot be booked.
        </p>
      )}

      <div
        className={cn(
          "overflow-x-auto border-border overflow-y-auto",
          !hideWeekHeader && "rounded-xl border",
          maxHeightClass ??
            (embedded
              ? "max-h-[min(56vh,560px)]"
              : "max-h-[min(62vh,640px)]")
        )}
      >
        <div className="min-w-[720px]">
          {!hideWeekHeader && (
          <div className="grid grid-cols-[52px_repeat(7,minmax(100px,1fr))] border-b border-border bg-brand-surface/50">
            <div className="border-r border-border" />
            {weekDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              const open = isMachineOpenOnDay(machine, day);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "px-2 py-2.5 text-center border-r border-border last:border-r-0",
                    isToday && "bg-brand-primary/5",
                    !open && "bg-muted/30"
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
                  {!open && (
                    <p className="text-[10px] text-brand-muted mt-0.5">Closed</p>
                  )}
                </div>
              );
            })}
          </div>
          )}

          <div className="grid grid-cols-[52px_repeat(7,minmax(100px,1fr))]">
            <div
              className="relative border-r border-border bg-muted/20"
              style={{ height: totalHeightPx }}
            >
              {timeLabels.map(({ i, hour, showLabel }) =>
                showLabel ? (
                  <span
                    key={i}
                    className="absolute right-1.5 -translate-y-1/2 text-[10px] font-medium text-brand-muted tabular-nums"
                    style={{ top: i * TIMELINE_ROW_HEIGHT_PX }}
                  >
                    {formatTimelineHour(hour)}
                  </span>
                ) : null
              )}
            </div>

            {weekDays.map((day) => {
              const dayKey = day.toISOString();
              return (
              <TimelineDayColumn
                key={dayKey}
                day={day}
                machine={machine}
                blocks={blocksByDay.allMap.get(dayKey) ?? []}
                displayBlocks={blocksByDay.displayMap.get(dayKey) ?? []}
                isToday={isSameDay(day, new Date())}
                highlightOrderId={highlightOrderId}
                showShopContext={showShopContext}
                machines={machines}
                enableBlockActions={enableBlockActions}
                onEditBlock={(block) => handleEditBlock?.(block)}
                onViewOrderBlock={onViewOrderBlock}
                onMoveBlockToMachine={handleMoveBlockToMachine}
                onRemoveBlock={handleRemoveBlock}
                onResizeBlock={handleResizeBlock}
              />
            );
            })}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
        {draggingBlock ? (
          <div
            className={cn(
              "w-[120px] rounded-lg border px-2 py-1.5 shadow-lg",
              draggingHasConflict
                ? overlapBlockStyles
                : [
                    machineColorStyles[machine.color].bg,
                    machineColorStyles[machine.color].border,
                    machineColorStyles[machine.color].text,
                    "ring-2 ring-inset ring-brand-primary/30",
                  ]
            )}
            style={{
              height: Math.max(
                blockTimelinePosition(draggingBlock, machine).heightPx,
                TIMELINE_ROW_HEIGHT_PX * 2
              ),
            }}
          >
            <ScheduleChipContent
              block={draggingBlock}
              machine={machine}
              hasOverlap={draggingHasOverlap}
              outsideHours={draggingOutsideHours}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
