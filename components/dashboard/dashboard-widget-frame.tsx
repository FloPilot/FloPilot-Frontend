"use client";

import type { CSSProperties, ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import {
  getDashboardWidgetDef,
  type DashboardWidgetId,
} from "@/lib/dashboard-layout";
import { cn } from "@/lib/utils";

export function DashboardWidgetFrame({
  id,
  editing,
  canRemove,
  onRemove,
  children,
}: {
  id: DashboardWidgetId;
  editing: boolean;
  canRemove: boolean;
  onRemove: () => void;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editing });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const def = getDashboardWidgetDef(id);

  if (!editing) {
    return <>{children}</>;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative rounded-xl border border-dashed border-[#c9cccf] bg-[#fafafa]/70 p-1.5 transition-shadow",
        isDragging && "z-20 border-[#2c6ecb]/50 shadow-[0_8px_24px_rgba(26,26,26,0.12)]"
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 px-1.5 pt-0.5">
        <button
          type="button"
          className="inline-flex cursor-grab items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] font-medium text-[#616161] hover:bg-white hover:text-[#303030] active:cursor-grabbing"
          aria-label={`Drag ${def?.label ?? "widget"}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
          {def?.label ?? id}
        </button>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex size-7 items-center justify-center rounded-md text-[#8c9196] hover:bg-white hover:text-[#b42318]"
            aria-label={`Remove ${def?.label ?? "widget"}`}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      <div className="pointer-events-none select-none opacity-95">{children}</div>
    </div>
  );
}
