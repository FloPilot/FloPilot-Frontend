"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { TeamTicketCard } from "@/components/team/team-ticket-card";
import {
  SUPPORT_TICKET_BOARD_STATUSES,
  parseTeamTicketColumnDropId,
  supportTicketBoardStatus,
  supportTicketStatusMeta,
  teamTicketColumnDropId,
  type SupportTicket,
  type SupportTicketStatus,
} from "@/lib/support-tickets";
import { cn } from "@/lib/utils";

const COLUMN_META: Record<
  (typeof SUPPORT_TICKET_BOARD_STATUSES)[number],
  { hint: string; headerClass: string; bodyClass: string; dotClass: string }
> = {
  open: {
    hint: "New submissions waiting for triage",
    headerClass: "text-sky-800",
    bodyClass: "border-sky-100 bg-sky-50/40",
    dotClass: "bg-sky-500",
  },
  in_review: {
    hint: "Being investigated by the team",
    headerClass: "text-amber-900",
    bodyClass: "border-amber-100 bg-amber-50/40",
    dotClass: "bg-amber-500",
  },
  planned: {
    hint: "Accepted and scheduled for work",
    headerClass: "text-violet-900",
    bodyClass: "border-violet-100 bg-violet-50/40",
    dotClass: "bg-violet-500",
  },
  done: {
    hint: "Resolved or shipped",
    headerClass: "text-emerald-900",
    bodyClass: "border-emerald-100 bg-emerald-50/40",
    dotClass: "bg-emerald-500",
  },
};

function BoardColumn({
  status,
  tickets,
  onOpenTicket,
}: {
  status: SupportTicketStatus;
  tickets: SupportTicket[];
  onOpenTicket: (ticket: SupportTicket) => void;
}) {
  const meta = supportTicketStatusMeta(status);
  const columnMeta = COLUMN_META[status as keyof typeof COLUMN_META];
  const { setNodeRef, isOver } = useDroppable({
    id: teamTicketColumnDropId(status),
    data: { status },
  });

  return (
    <section className="flex min-w-[260px] flex-1 flex-col">
      <header className="mb-3 px-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", columnMeta.dotClass)} />
            <h3 className={cn("text-sm font-semibold", columnMeta.headerClass)}>
              {meta.label}
            </h3>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-brand-muted">
            {tickets.length}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-brand-muted">{columnMeta.hint}</p>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[420px] flex-1 flex-col gap-2.5 rounded-2xl border p-2.5 transition-colors",
          columnMeta.bodyClass,
          isOver && "ring-2 ring-brand-primary/25"
        )}
      >
        {tickets.map((ticket) => (
          <TeamTicketCard
            key={ticket.id}
            ticket={ticket}
            draggable
            compact
            onOpen={onOpenTicket}
          />
        ))}
        {tickets.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200/80 px-4 py-10 text-center">
            <p className="text-xs text-brand-muted">
              {isOver ? "Drop to move here" : "No tickets"}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export function TeamTicketBoard({
  tickets,
  onOpenTicket,
  onStatusChange,
}: {
  tickets: SupportTicket[];
  onOpenTicket: (ticket: SupportTicket) => void;
  onStatusChange: (ticketId: string, status: SupportTicketStatus) => Promise<void>;
}) {
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const ticketsByColumn = useMemo(() => {
    const grouped = Object.fromEntries(
      SUPPORT_TICKET_BOARD_STATUSES.map((status) => [status, [] as SupportTicket[]])
    ) as Record<(typeof SUPPORT_TICKET_BOARD_STATUSES)[number], SupportTicket[]>;

    for (const ticket of tickets) {
      const column = supportTicketBoardStatus(ticket.status);
      grouped[column].push(ticket);
    }

    return grouped;
  }, [tickets]);

  const activeTicket =
    tickets.find((ticket) => ticket.id === activeTicketId) ?? null;

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTicketId(null);
    const { active, over } = event;
    if (!over) return;

    const ticketId = String(active.id);
    const nextStatus = parseTeamTicketColumnDropId(String(over.id));
    if (!nextStatus) return;

    const ticket = tickets.find((item) => item.id === ticketId);
    if (!ticket || ticket.status === nextStatus) return;

    await onStatusChange(ticketId, nextStatus);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTicketId(String(event.active.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={(event) => void handleDragEnd(event)}
    >
      <div className="flex gap-4 overflow-x-auto pb-2">
        {SUPPORT_TICKET_BOARD_STATUSES.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tickets={ticketsByColumn[status]}
            onOpenTicket={onOpenTicket}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTicket ? (
          <div className="w-[260px] rotate-2 opacity-95">
            <TeamTicketCard ticket={activeTicket} onOpen={() => {}} draggable />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
