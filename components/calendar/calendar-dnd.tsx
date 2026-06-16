"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO } from "date-fns";
import type { Machine, ScheduleBlock } from "@/types";
import { getCalendarCellDropId } from "@/lib/schedule-reschedule";
import { machineColorStyles } from "@/lib/machine-styles";
import { cn } from "@/lib/utils";

export function ScheduleChipContent({
  block,
  machine,
  showDragHint,
  hasOverlap,
  outsideHours,
}: {
  block: ScheduleBlock;
  machine: Machine;
  showDragHint?: boolean;
  hasOverlap?: boolean;
  outsideHours?: boolean;
}) {
  const start = parseISO(block.startAt);
  const end = parseISO(block.endAt);
  const hasConflict = Boolean(hasOverlap || outsideHours);

  return (
    <>
      <p className="text-xs font-semibold truncate">{block.orderNumber}</p>
      <p className="text-[11px] truncate opacity-90">{block.imprintLabel}</p>
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
        <p className="mt-1.5 text-[10px] font-medium opacity-50">Drag to move</p>
      )}
    </>
  );
}

export function DraggableScheduleChip({
  block,
  machine,
  onEdit,
  isDragOverlay,
  highlighted,
}: {
  block: ScheduleBlock;
  machine: Machine;
  onEdit: () => void;
  isDragOverlay?: boolean;
  highlighted?: boolean;
}) {
  const styles = machineColorStyles[machine.color];
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: block.id,
      data: { block, machineId: machine.id },
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
        "w-full touch-none text-left rounded-lg border px-2.5 py-2",
        styles.bg,
        styles.border,
        styles.text,
        highlighted && "ring-2 ring-brand-primary/45 shadow-sm z-[1] relative",
        "cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md",
        isDragging && !isDragOverlay && "opacity-40 shadow-none",
        isDragOverlay && "shadow-lg ring-2 ring-brand-primary/30 scale-[1.02]"
      )}
    >
      <ScheduleChipContent
        block={block}
        machine={machine}
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
