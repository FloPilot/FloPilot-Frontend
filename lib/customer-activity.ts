import {
  format,
  isToday,
  isYesterday,
  parseISO,
  startOfDay,
} from "date-fns";
import type { Customer, CustomerActivityEvent } from "@/types";

function activityFingerprint(event: CustomerActivityEvent): string {
  return [
    event.type,
    event.title,
    event.timestamp.slice(0, 16),
    event.author ?? "",
    (event.detail ?? "").slice(0, 80),
  ].join("|");
}

function syntheticCreatedEvent(customer: Customer): CustomerActivityEvent | null {
  if (!customer.customerSince) return null;
  return {
    id: `created-${customer.id}`,
    type: "created",
    title: "Customer added",
    detail: customer.company,
    timestamp: `${customer.customerSince}T12:00:00.000Z`,
    author: "Team",
  };
}

export function buildCustomerActivityFeed(
  customer: Customer
): CustomerActivityEvent[] {
  const persisted = [...(customer.activity ?? [])];
  const events = [...persisted];

  if (!persisted.some((event) => event.type === "created")) {
    const created = syntheticCreatedEvent(customer);
    if (created) events.push(created);
  }

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

export function formatCustomerActivityTime(iso: string): string {
  return format(parseISO(iso), "h:mm a");
}

export function formatCustomerActivityDateGroup(iso: string): string {
  const date = parseISO(iso);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d");
}

export function groupCustomerActivityByDate(
  events: CustomerActivityEvent[]
): { label: string; events: CustomerActivityEvent[] }[] {
  const groups = new Map<string, CustomerActivityEvent[]>();

  for (const event of events) {
    const key = startOfDay(parseISO(event.timestamp)).toISOString();
    const bucket = groups.get(key) ?? [];
    bucket.push(event);
    groups.set(key, bucket);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => parseISO(b).getTime() - parseISO(a).getTime())
    .map(([, bucket]) => ({
      label: formatCustomerActivityDateGroup(bucket[0]!.timestamp),
      events: bucket,
    }));
}

export type CustomerActivityActorKind = "customer" | "shop" | "system";

export function inferCustomerActivityActorKind(
  customer: Customer,
  event: CustomerActivityEvent
): CustomerActivityActorKind {
  const author = event.author?.trim();
  if (!author || author === "Team" || author === "Shop") return "shop";
  if (author === "System") return "system";
  if (author === "Customer") return "customer";
  if (author === customer.name || author === customer.company) return "customer";
  return "shop";
}

export function customerActivityActorLabel(
  kind: CustomerActivityActorKind
): string {
  if (kind === "customer") return "Customer";
  if (kind === "system") return "System";
  return "Team";
}

export function formatCustomerActivityActorName(
  customer: Customer,
  event: CustomerActivityEvent
): string {
  const author = event.author?.trim();
  const kind = inferCustomerActivityActorKind(customer, event);

  if (kind === "customer") {
    return author === "Customer"
      ? customer.name || customer.company || "Customer"
      : author || customer.name || "Customer";
  }
  if (kind === "system") return "System";
  if (author && author !== "Team" && author !== "Shop") return author;
  return "Team";
}

export function shouldShowCustomerActivityActorName(
  customer: Customer,
  event: CustomerActivityEvent
): boolean {
  const kind = inferCustomerActivityActorKind(customer, event);
  if (kind !== "shop") return true;
  const author = event.author?.trim();
  return Boolean(author && author !== "Team" && author !== "Shop");
}
