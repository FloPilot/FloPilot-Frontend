import {
  format,
  isToday,
  isYesterday,
  parseISO,
  startOfDay,
} from "date-fns";
import type { Order, OrderActivityEvent, ScheduleBlock } from "@/types";
import { formatScheduleBlockSummary } from "@/lib/order-production";

const ACTIVITY_ICONS: Record<OrderActivityEvent["type"], string> = {
  artwork_uploaded: "upload",
  artwork_approved: "check",
  artwork_revision: "refresh",
  estimate_approved: "check",
  scheduled: "calendar",
  message: "message",
  payment: "payment",
  note: "note",
  status: "status",
  file_uploaded: "file",
  file_deleted: "file",
  proof_sent: "send",
  ink_updated: "ink",
  review_sent: "send",
};

export function getActivityIconType(type: OrderActivityEvent["type"]): string {
  return ACTIVITY_ICONS[type] ?? "status";
}

function activityFingerprint(event: OrderActivityEvent): string {
  return [
    event.type,
    event.title,
    event.timestamp.slice(0, 16),
    event.author ?? "",
    (event.detail ?? "").slice(0, 80),
  ].join("|");
}

/** Schedule blocks not yet logged on the order (legacy / pre-logging). */
function syntheticScheduleEvents(
  order: Order,
  scheduleBlocks: ScheduleBlock[],
  persisted: OrderActivityEvent[]
): OrderActivityEvent[] {
  const scheduledTitles = new Set(
    persisted
      .filter((event) => event.type === "scheduled")
      .map((event) => event.title.toLowerCase())
  );

  return scheduleBlocks
    .filter((block) => block.orderId === order.id)
    .filter((block) => {
      const title = `${block.imprintLabel} scheduled`.toLowerCase();
      return !scheduledTitles.has(title);
    })
    .map((block) => ({
      id: `sched-${block.id}`,
      type: "scheduled" as const,
      title: `${block.imprintLabel} scheduled`,
      detail: formatScheduleBlockSummary(block),
      timestamp: block.startAt,
      author: "Shop",
    }));
}

export function buildOrderActivityFeed(
  order: Order,
  scheduleBlocks: ScheduleBlock[] = []
): OrderActivityEvent[] {
  const persisted = [...(order.activity ?? [])];
  const events = [
    ...persisted,
    ...syntheticScheduleEvents(order, scheduleBlocks, persisted),
  ];

  const seen = new Set<string>();
  return events
    .filter((event) => {
      const key = activityFingerprint(event);
      if (seen.has(key)) return false;
      seen.add(key);
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

export function formatActivityTime(iso: string): string {
  return format(parseISO(iso), "h:mm a");
}

export function formatActivityDateGroup(iso: string): string {
  const date = parseISO(iso);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d");
}

export function groupActivityByDate(
  events: OrderActivityEvent[]
): { label: string; events: OrderActivityEvent[] }[] {
  const groups = new Map<string, OrderActivityEvent[]>();

  for (const event of events) {
    const key = startOfDay(parseISO(event.timestamp)).toISOString();
    const bucket = groups.get(key) ?? [];
    bucket.push(event);
    groups.set(key, bucket);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => parseISO(b).getTime() - parseISO(a).getTime())
    .map(([, bucket]) => ({
      label: formatActivityDateGroup(bucket[0]!.timestamp),
      events: bucket,
    }));
}

export type ActivityActorKind = "customer" | "shop" | "system";

export function inferActivityActorKind(
  order: Order,
  event: OrderActivityEvent
): ActivityActorKind {
  const author = event.author?.trim();
  if (!author || author === "Shop") return "shop";
  if (author === "System") return "system";
  if (author === order.customerName) return "customer";
  if (event.title.toLowerCase().includes("customer")) return "customer";
  if (event.type === "estimate_approved") return "customer";
  if (event.type === "payment" && author !== "Shop") return "customer";
  return "shop";
}

export function activityActorLabel(kind: ActivityActorKind): string {
  if (kind === "customer") return "Customer";
  if (kind === "system") return "System";
  return "Team";
}

/** Who performed the action — employee name when known. */
export function formatActivityActorName(
  order: Order,
  event: OrderActivityEvent
): string {
  const author = event.author?.trim();
  const kind = inferActivityActorKind(order, event);

  if (kind === "customer") {
    return author || order.customerName || "Customer";
  }
  if (kind === "system") return "System";
  if (author && author !== "Shop") return author;
  return "Team";
}

export function shouldShowActivityActorName(
  order: Order,
  event: OrderActivityEvent
): boolean {
  const kind = inferActivityActorKind(order, event);
  if (kind !== "shop") return true;
  const author = event.author?.trim();
  return Boolean(author && author !== "Shop");
}

export { ORDER_FILE_KIND_LABELS } from "@/lib/order-files";
