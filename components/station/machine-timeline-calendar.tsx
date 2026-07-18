"use client";

import { useMemo, useRef, useState, useCallback, type CSSProperties } from "react";
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
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
import {
  getScheduleBlockEventClasses,
  resolveScheduleBlockCustomer,
  type ScheduleBlockCustomerPresentation,
} from "@/lib/schedule-block-customer";
import {
  resolveScheduleBlockProductionStatus,
  SCHEDULE_CHIP_BOX_PADDING,
  type ScheduleBlockProductionStatus,
} from "@/lib/schedule-block-display";
import { formatScheduleBlockDisplayLine } from "@/lib/order-display";
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
  snapHeightPx,
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
import { cn } from "@/lib/utils";

const TIMELINE_BLOCK_INSET_PX = 6;
const TIMELINE_BLOCK_LANE_GAP_PX = 2;

type BlockLane = { index: number; total: number };

type TimelineDragPreview = {
  blockId: string;
  dayKey: string;
  topPx: number;
  heightPx: number;
  valid: boolean;
  startAt: string;
  endAt: string;
};

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
  blockCustomer,
  productionStatus,
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
  blockCustomer: ScheduleBlockCustomerPresentation;
  productionStatus: ScheduleBlockProductionStatus;
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
  const hasConflict = blockHasSchedulingConflict(hasOverlap, outsideHours);
  const eventClasses = getScheduleBlockEventClasses(blockCustomer, {
    muted,
    hasConflict,
    productionStatus,
  });
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
      setResizeHeightPx(snapHeightPx(base + dy));
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const dy = ev.clientY - startY;
      const finalHeight = snapHeightPx(base + dy);
      onResize(finalHeight);
      // Keep preview until the optimistic schedule update lands, then clear.
      window.requestAnimationFrame(() => {
        setResizeHeightPx(null);
        resizingRef.current = false;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const showDragHintOnBlock =
    lane.total === 1 && !hasConflict && !isDragging;

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
        "group/block touch-none overflow-x-hidden overflow-y-auto rounded-md border text-left min-w-0 box-border",
        SCHEDULE_CHIP_BOX_PADDING,
        "flex flex-col items-start justify-start",
        !enableBlockActions && "absolute z-10",
        enableBlockActions && "relative h-full w-full",
        hasConflict
          ? overlapBlockStyles
          : eventClasses,
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
        blockCustomer={blockCustomer}
        productionStatus={productionStatus}
        showDragHint={false}
        hasOverlap={hasOverlap}
        outsideHours={outsideHours}
      />
      {showDragHintOnBlock && (
        <p className="mt-auto w-full pt-1 text-[10px] font-medium leading-none opacity-50">
          Drag to move
        </p>
      )}
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

function TimelineDragGhost({
  block,
  blockCustomer,
  productionStatus,
  topPx,
  heightPx,
  valid,
  startAt,
  endAt,
}: {
  block: ScheduleBlock;
  blockCustomer: ScheduleBlockCustomerPresentation;
  productionStatus?: ScheduleBlockProductionStatus;
  topPx: number;
  heightPx: number;
  valid: boolean;
  startAt: string;
  endAt: string;
}) {
  return (
    <div
      className={cn(
        "absolute z-30 pointer-events-none overflow-hidden rounded-md border text-left min-w-0 box-border shadow-md",
        SCHEDULE_CHIP_BOX_PADDING,
        "flex flex-col items-start justify-start",
        valid
          ? cn(
              getScheduleBlockEventClasses(blockCustomer, { productionStatus }),
              "ring-2 ring-inset ring-brand-primary/45"
            )
          : overlapBlockStyles
      )}
      style={{
        top: topPx,
        height: Math.max(heightPx, TIMELINE_ROW_HEIGHT_PX * 2),
        left: `${TIMELINE_BLOCK_INSET_PX}px`,
        width: `calc(100% - ${TIMELINE_BLOCK_INSET_PX * 2}px)`,
      }}
      aria-hidden
    >
      <ScheduleChipContent
        block={block}
        blockCustomer={blockCustomer}
        productionStatus={productionStatus}
        showDragHint={false}
      />
      <p className="mt-auto w-full pt-1 text-[10px] font-semibold tabular-nums opacity-80">
        {format(parseISO(startAt), "h:mm a")} –{" "}
        {format(parseISO(endAt), "h:mm a")}
        {!valid ? " · Invalid" : ""}
      </p>
    </div>
  );
}

function TimelineContextBlock({
  block,
  blockCustomer,
  productionStatus,
  machine,
  lane,
}: {
  block: ScheduleBlock;
  blockCustomer: ScheduleBlockCustomerPresentation;
  productionStatus: ScheduleBlockProductionStatus;
  machine: Machine;
  lane: BlockLane;
}) {
  const { activeOrders } = useSchedule();
  const order = activeOrders.find((entry) => entry.id === block.orderId);
  const orderTitle = formatScheduleBlockDisplayLine(block, order);

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
      className={cn(
        "absolute z-[5] overflow-x-hidden overflow-y-auto rounded-md border text-left opacity-75 pointer-events-none min-w-0 box-border",
        SCHEDULE_CHIP_BOX_PADDING,
        "flex flex-col items-start justify-start",
        getScheduleBlockEventClasses(blockCustomer, { muted: true })
      )}
      title={`${orderTitle} · other order`}
    >
      <ScheduleChipContent
        block={block}
        blockCustomer={blockCustomer}
        productionStatus={productionStatus}
      />
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
  dragPreview,
  dragPreviewBlock,
  dragPreviewCustomer,
  dragPreviewStatus,
  onEditBlock,
  onViewOrderBlock,
  onMoveBlockToMachine,
  onRemoveBlock,
  onResizeBlock,
  resolveBlockCustomer,
  resolveBlockProductionStatus,
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
  dragPreview?: TimelineDragPreview | null;
  dragPreviewBlock?: ScheduleBlock;
  dragPreviewCustomer?: ScheduleBlockCustomerPresentation;
  dragPreviewStatus?: ScheduleBlockProductionStatus;
  onEditBlock: (block: ScheduleBlock) => void;
  onViewOrderBlock?: (block: ScheduleBlock) => void;
  onMoveBlockToMachine?: (
    block: ScheduleBlock,
    machineId: string
  ) => boolean;
  onRemoveBlock?: (block: ScheduleBlock) => void;
  onResizeBlock?: (block: ScheduleBlock, newHeightPx: number) => void;
  resolveBlockCustomer: (
    block: ScheduleBlock
  ) => ScheduleBlockCustomerPresentation;
  resolveBlockProductionStatus: (
    block: ScheduleBlock
  ) => ScheduleBlockProductionStatus;
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

  const dayKey = startOfDay(day).toISOString();
  const showGhost =
    dragPreview &&
    dragPreviewBlock &&
    dragPreviewCustomer &&
    dragPreview.dayKey === dayKey;

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
        const blockCustomer = resolveBlockCustomer(block);
        const productionStatus = resolveBlockProductionStatus(block);

        if (contextOnly && !enableBlockActions) {
          return (
            <TimelineContextBlock
              key={block.id}
              block={block}
              blockCustomer={blockCustomer}
              productionStatus={productionStatus}
              machine={machine}
              lane={lane}
            />
          );
        }

        return (
          <TimelineDraggableBlock
            key={block.id}
            block={block}
            blockCustomer={blockCustomer}
            productionStatus={productionStatus}
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

      {showGhost ? (
        <TimelineDragGhost
          block={dragPreviewBlock}
          blockCustomer={dragPreviewCustomer}
          productionStatus={dragPreviewStatus}
          topPx={dragPreview.topPx}
          heightPx={dragPreview.heightPx}
          valid={dragPreview.valid}
          startAt={dragPreview.startAt}
          endAt={dragPreview.endAt}
        />
      ) : null}
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
  const {
    machines,
    activeScheduleBlocks: scheduleBlocks,
    activeOrders,
    jobRuns,
    getCustomerById,
    updateScheduleBlock,
    removeScheduleBlock,
  } = useSchedule();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOriginTopRef = useRef(0);
  const [dragPreview, setDragPreview] = useState<TimelineDragPreview | null>(
    null
  );

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

  const resolveBlockCustomer = useCallback(
    (block: ScheduleBlock) =>
      resolveScheduleBlockCustomer(block, activeOrders, getCustomerById),
    [activeOrders, getCustomerById]
  );

  const resolveBlockProductionStatus = useCallback(
    (block: ScheduleBlock) =>
      resolveScheduleBlockProductionStatus(block, jobRuns, activeOrders),
    [jobRuns, activeOrders]
  );

  const draggingBlock = draggableBlocks.find((b) => b.id === draggingId);
  const draggingBlockCustomer = draggingBlock
    ? resolveBlockCustomer(draggingBlock)
    : undefined;
  const draggingProductionStatus = draggingBlock
    ? resolveBlockProductionStatus(draggingBlock)
    : undefined;

  const buildDragPreview = useCallback(
    (
      block: ScheduleBlock,
      day: Date,
      deltaY: number,
      originTop: number
    ): TimelineDragPreview => {
      const { heightPx } = blockTimelinePosition(block, machine);
      const rawTop = snapTopPx(originTop + deltaY, heightPx, machine);
      const updated = rescheduleBlockOnTimeline(block, day, rawTop, machine);
      const dayKey = startOfDay(day).toISOString();

      if (updated) {
        const pos = blockTimelinePosition(
          { ...block, ...updated },
          machine
        );
        return {
          blockId: block.id,
          dayKey,
          topPx: pos.topPx,
          heightPx: pos.heightPx,
          valid: true,
          startAt: updated.startAt,
          endAt: updated.endAt,
        };
      }

      return {
        blockId: block.id,
        dayKey,
        topPx: rawTop,
        heightPx,
        valid: false,
        startAt: block.startAt,
        endAt: block.endAt,
      };
    },
    [machine]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const block = draggableBlocks.find((b) => b.id === event.active.id);
    if (!block) return;
    const originTop = blockTimelinePosition(block, machine).topPx;
    dragOriginTopRef.current = originTop;
    setDraggingId(String(event.active.id));
    setDragPreview(
      buildDragPreview(block, startOfDay(parseISO(block.startAt)), 0, originTop)
    );
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, over, delta } = event;
    const block = draggableBlocks.find((b) => b.id === active.id);
    if (!block) return;

    const target = over ? parseCalendarCellDropId(over.id) : null;
    const day =
      target && target.machineId === machine.id
        ? target.day
        : startOfDay(parseISO(block.startAt));

    setDragPreview(
      buildDragPreview(block, day, delta.y, dragOriginTopRef.current)
    );
  };

  const clearDragState = () => {
    setDraggingId(null);
    setDragPreview(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    const block = draggableBlocks.find((b) => b.id === active.id);
    const preview = dragPreview;
    clearDragState();

    if (!block) return;

    const target = over ? parseCalendarCellDropId(over.id) : null;
    const day =
      target && target.machineId === machine.id
        ? target.day
        : preview
          ? parseISO(preview.dayKey)
          : startOfDay(parseISO(block.startAt));

    if (!target || target.machineId !== machine.id) {
      // Dropped outside a valid day column — keep original placement.
      return;
    }

    const { heightPx } = blockTimelinePosition(block, machine);
    const newTopPx = snapTopPx(
      dragOriginTopRef.current + delta.y,
      heightPx,
      machine
    );
    const updated = rescheduleBlockOnTimeline(block, day, newTopPx, machine);
    if (!updated) return;

    const sameSlot =
      updated.startAt === block.startAt &&
      updated.endAt === block.endAt &&
      updated.machineId === block.machineId;
    if (sameSlot) return;

    void updateScheduleBlock(block.id, updated);
  };

  const handleMoveBlockToMachine = (
    block: ScheduleBlock,
    targetMachineId: string
  ): boolean => {
    const targetMachine = machines.find((m) => m.id === targetMachineId);
    if (!targetMachine) return false;
    const updated = moveBlockToMachine(block, targetMachine);
    if (!updated) return false;
    void updateScheduleBlock(block.id, updated);
    onBlockMoved?.(targetMachineId);
    return true;
  };

  const handleResizeBlock = (block: ScheduleBlock, newHeightPx: number) => {
    const updated = resizeBlockOnTimeline(block, newHeightPx, machine);
    if (updated) void updateScheduleBlock(block.id, updated);
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
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={clearDragState}
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
                dragPreview={dragPreview}
                dragPreviewBlock={draggingBlock}
                dragPreviewCustomer={draggingBlockCustomer}
                dragPreviewStatus={draggingProductionStatus}
                onEditBlock={(block) => handleEditBlock?.(block)}
                onViewOrderBlock={onViewOrderBlock}
                onMoveBlockToMachine={handleMoveBlockToMachine}
                onRemoveBlock={handleRemoveBlock}
                onResizeBlock={handleResizeBlock}
                resolveBlockCustomer={resolveBlockCustomer}
                resolveBlockProductionStatus={resolveBlockProductionStatus}
              />
            );
            })}
          </div>
        </div>
      </div>
    </DndContext>
  );
}
