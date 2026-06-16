import { format, parseISO } from "date-fns";
import type {
  Message,
  Order,
  OrderActivityEvent,
  ScheduleBlock,
} from "@/types";
import { formatScheduleBlockSummary } from "@/lib/order-production";

const ACTIVITY_ICONS: Record<OrderActivityEvent["type"], string> = {
  artwork_uploaded: "upload",
  artwork_approved: "check",
  artwork_revision: "refresh",
  scheduled: "calendar",
  message: "message",
  payment: "payment",
  note: "note",
  status: "status",
  file_uploaded: "file",
  proof_sent: "send",
};

export function getActivityIconType(type: OrderActivityEvent["type"]): string {
  return ACTIVITY_ICONS[type] ?? "status";
}

export function buildOrderActivityFeed(
  order: Order,
  scheduleBlocks: ScheduleBlock[],
  liveMessages: Message[]
): OrderActivityEvent[] {
  const events: OrderActivityEvent[] = [...(order.activity ?? [])];

  for (const block of scheduleBlocks.filter((b) => b.orderId === order.id)) {
    events.push({
      id: `sched-${block.id}`,
      type: "scheduled",
      title: `${block.imprintLabel} scheduled`,
      detail: formatScheduleBlockSummary(block),
      timestamp: block.startAt,
      author: "Shop",
    });
  }

  for (const message of liveMessages) {
    events.push({
      id: `msg-act-${message.id}`,
      type: "message",
      title:
        message.role === "customer"
          ? "Customer message"
          : "Message sent to customer",
      detail: message.content.slice(0, 120),
      timestamp: message.timestamp,
      author: message.author,
    });
  }

  for (const note of order.internalNotes ?? []) {
    events.push({
      id: `note-act-${note.id}`,
      type: "note",
      title: "Internal note added",
      detail: note.content.slice(0, 120),
      timestamp: note.timestamp,
      author: note.author,
    });
  }

  const seen = new Set<string>();
  return events
    .filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .sort(
      (a, b) =>
        parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime()
    );
}

export function formatActivityTimestamp(iso: string): string {
  return format(parseISO(iso), "MMM d · h:mm a");
}

export { ORDER_FILE_KIND_LABELS } from "@/lib/order-files";
