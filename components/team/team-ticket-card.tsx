"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  supportTicketCategoryLabel,
  supportTicketPriorityLabel,
  supportTicketStatusMeta,
  type SupportTicket,
} from "@/lib/support-tickets";
import { cn } from "@/lib/utils";

export function TeamTicketCard({
  ticket,
  onOpen,
  draggable = false,
  compact = false,
}: {
  ticket: SupportTicket;
  onOpen: (ticket: SupportTicket) => void;
  draggable?: boolean;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: ticket.id,
      data: { ticket },
      disabled: !draggable,
    });

  const status = supportTicketStatusMeta(ticket.status);
  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <button
      ref={draggable ? setNodeRef : undefined}
      type="button"
      style={style}
      {...(draggable ? { ...listeners, ...attributes } : {})}
      onClick={() => onOpen(ticket)}
      className={cn(
        "w-full rounded-xl border border-slate-200/80 bg-white p-3.5 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30",
        isDragging && "opacity-40",
        draggable && "cursor-grab active:cursor-grabbing"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "line-clamp-2 font-semibold text-brand-ink",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {ticket.title}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            status.color
          )}
        >
          {status.label}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] text-brand-muted">
        {ticket.tenantName}
      </p>
      {!compact && (
        <p className="mt-1 text-[11px] text-brand-muted">
          {supportTicketCategoryLabel(ticket.category)} ·{" "}
          {supportTicketPriorityLabel(ticket.priority)}
        </p>
      )}
      {ticket.assignedToName ? (
        <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-brand-ink">
          {ticket.assignedToName}
        </p>
      ) : (
        <p className="mt-2 text-[10px] font-medium text-brand-muted">
          Unassigned
        </p>
      )}
    </button>
  );
}

export function TeamTicketListRow({
  ticket,
  onOpen,
}: {
  ticket: SupportTicket;
  onOpen: (ticket: SupportTicket) => void;
}) {
  const status = supportTicketStatusMeta(ticket.status);

  return (
    <button
      type="button"
      onClick={() => onOpen(ticket)}
      className="flex w-full items-start justify-between gap-4 rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-brand-ink">
          {ticket.title}
        </p>
        <p className="mt-0.5 text-xs text-brand-muted">
          {ticket.tenantName} · {supportTicketCategoryLabel(ticket.category)}
          {ticket.assignedToName ? ` · ${ticket.assignedToName}` : " · Unassigned"}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
          status.color
        )}
      >
        {status.label}
      </span>
    </button>
  );
}
