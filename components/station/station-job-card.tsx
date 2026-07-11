import { format, parseISO } from "date-fns";
import { ChevronRight, Clock, Package, Pencil } from "lucide-react";
import { ScheduleBlockOrderLine } from "@/components/orders/order-display-line";
import type { ScheduleBlock } from "@/types";
import { machineColorStyles } from "@/lib/machine-styles";
import type { MachineCalendarColor } from "@/types";
import { cn } from "@/lib/utils";

export function StationJobCard({
  block,
  color,
  showDate,
  onOpenOrder,
  onEditSchedule,
}: {
  block: ScheduleBlock;
  color: MachineCalendarColor;
  showDate?: boolean;
  onOpenOrder: (orderId: string, block: ScheduleBlock) => void;
  onEditSchedule?: (block: ScheduleBlock) => void;
}) {
  const styles = machineColorStyles[color];
  const start = parseISO(block.startAt);
  const end = parseISO(block.endAt);

  return (
    <article className="group overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm transition-all hover:border-brand-primary/20 hover:shadow-md">
      <div className={cn("h-1.5 w-full", styles.cap)} />

      <button
        type="button"
        onClick={() => onOpenOrder(block.orderId, block)}
        className="w-full text-left p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold text-brand-ink group-hover:text-brand-primary transition-colors">
              <ScheduleBlockOrderLine block={block} />
            </p>
            <p className="text-sm text-brand-muted mt-0.5 truncate">
              {block.customerName}
            </p>
          </div>
          {showDate && (
            <span className="text-xs font-medium text-brand-muted shrink-0">
              {format(start, "MMM d")}
            </span>
          )}
        </div>

        <p className="mt-3 text-sm font-medium text-brand-ink">
          {block.imprintLabel}
        </p>
        <p className="text-xs text-brand-muted mt-0.5">{block.jobName}</p>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-brand-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5 shrink-0" />
            {format(start, "h:mm a")} – {format(end, "h:mm a")}
          </span>
          {block.pieceCount != null && block.pieceCount > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Package className="size-3.5 shrink-0" />
              {block.pieceCount} pcs
            </span>
          )}
        </div>

        {block.notes && (
          <p className="mt-3 text-xs text-brand-muted border-t border-border/60 pt-3 line-clamp-2">
            {block.notes}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary">
            View order
            <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
          {onEditSchedule && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditSchedule(block);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-1 text-xs font-medium text-brand-ink hover:bg-muted/40 transition-colors"
            >
              <Pencil className="size-3 text-brand-muted" />
              Reschedule
            </button>
          )}
        </div>
      </button>
    </article>
  );
}
