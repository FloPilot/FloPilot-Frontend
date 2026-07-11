"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO } from "date-fns";
import { CustomerBrandMark } from "@/components/customers/customer-brand-mark";
import { useSchedule } from "@/components/providers/schedule-provider";
import type { ScheduleBlock } from "@/types";
import { formatScheduleBlockDisplayLine } from "@/lib/order-display";
import { getCalendarCellDropId } from "@/lib/schedule-reschedule";
import {
  PRODUCTION_STATUS_FLAG,
  SCHEDULE_CHIP_BOX_PADDING,
  type ScheduleBlockProductionStatus,
} from "@/lib/schedule-block-display";
import {
  getScheduleBlockEventClasses,
  type ScheduleBlockCustomerPresentation,
} from "@/lib/schedule-block-customer";
import { cn } from "@/lib/utils";

function ScheduleBlockOrderTitle({ block }: { block: ScheduleBlock }) {
  const { activeOrders } = useSchedule();
  const order = activeOrders.find((entry) => entry.id === block.orderId);

  return (
    <p className="text-xs font-semibold leading-snug break-words [overflow-wrap:anywhere]">
      {formatScheduleBlockDisplayLine(block, order)}
    </p>
  );
}

export function ScheduleBlockStatusFlag({
  status,
  className,
}: {
  status: ScheduleBlockProductionStatus;
  className?: string;
}) {
  const config = PRODUCTION_STATUS_FLAG[status];
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide leading-none",
        config.className,
        className
      )}
      title={config.label}
    >
      {config.label}
    </span>
  );
}

export function ScheduleChipContent({
  block,
  blockCustomer,
  productionStatus,
  showDragHint,
  hasOverlap,
  outsideHours,
}: {
  block: ScheduleBlock;
  blockCustomer: ScheduleBlockCustomerPresentation;
  productionStatus?: ScheduleBlockProductionStatus;
  showDragHint?: boolean;
  hasOverlap?: boolean;
  outsideHours?: boolean;
}) {
  const start = parseISO(block.startAt);
  const end = parseISO(block.endAt);
  const hasConflict = Boolean(hasOverlap || outsideHours);

  return (
    <div className="flex w-full min-w-0 items-start gap-1.5">
      <CustomerBrandMark
        company={blockCustomer.company}
        logoUrl={blockCustomer.logoUrl}
        accentColorKey={blockCustomer.accentColorKey}
        customerId={blockCustomer.customerId}
        fallbackKey={block.orderId}
        size="xs"
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <ScheduleBlockOrderTitle block={block} />
        {productionStatus ? (
          <div className="mt-1">
            <ScheduleBlockStatusFlag status={productionStatus} />
          </div>
        ) : null}
        <p className="mt-1 text-[11px] truncate opacity-90 leading-tight">
          {block.imprintLabel}
        </p>
        <p className="text-[10px] mt-1 opacity-75">
          {format(start, "h:mm a")} – {format(end, "h:mm a")}
        </p>
        {hasOverlap && outsideHours && (
          <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
            Overlap · Outside hours
          </p>
        )}
        {hasOverlap && !outsideHours && (
          <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
            Overlap
          </p>
        )}
        {outsideHours && !hasOverlap && (
          <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
            Outside hours
          </p>
        )}
        {showDragHint && !hasConflict && (
          <p className="mt-1.5 text-[10px] font-medium opacity-50">
            Drag to move
          </p>
        )}
      </div>
    </div>
  );
}

export function DraggableScheduleChip({
  block,
  blockCustomer,
  productionStatus,
  onEdit,
  isDragOverlay,
  highlighted,
}: {
  block: ScheduleBlock;
  blockCustomer: ScheduleBlockCustomerPresentation;
  productionStatus?: ScheduleBlockProductionStatus;
  onEdit: () => void;
  isDragOverlay?: boolean;
  highlighted?: boolean;
}) {
  const eventClasses = getScheduleBlockEventClasses(blockCustomer, {
    productionStatus,
  });
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: block.id,
      data: { block, machineId: block.machineId },
    });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (isDragging) {
          e.preventDefault();
          return;
        }
        onEdit();
      }}
      className={cn(
        "w-full touch-none text-left rounded-lg border flex flex-col items-start justify-start",
        SCHEDULE_CHIP_BOX_PADDING,
        eventClasses,
        highlighted && "ring-2 ring-brand-primary/45 shadow-sm z-[1] relative",
        "cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md",
        isDragging && !isDragOverlay && "opacity-40 shadow-none",
        isDragOverlay && "shadow-lg ring-2 ring-brand-primary/30 scale-[1.02]"
      )}
    >
      <ScheduleChipContent
        block={block}
        blockCustomer={blockCustomer}
        productionStatus={productionStatus}
        showDragHint={!isDragOverlay}
      />
    </button>
  );
}

export function DroppableCalendarCell({
  machineId,
  day,
  machineActive,
  disabled,
  isToday,
  className,
  children,
}: {
  machineId: string;
  day: Date;
  machineActive: boolean;
  disabled?: boolean;
  isToday?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const cellId = getCalendarCellDropId(machineId, day);
  const { isOver, setNodeRef } = useDroppable({
    id: cellId,
    disabled: disabled || !machineActive,
    data: { machineId, day },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "p-2 border-r border-border last:border-r-0 space-y-1.5 min-h-[88px] transition-colors",
        isToday && "bg-brand-primary/[0.03]",
        isOver &&
          machineActive &&
          !disabled &&
          "bg-brand-primary/10 ring-2 ring-inset ring-brand-primary/35",
        className
      )}
    >
      {children}
    </div>
  );
}
