import { decorationLabel } from "@/lib/format";
import { jobAssignedPieceCount } from "@/lib/job-line-items";
import type {
  Job,
  JobImprint,
  Order,
  OrderProductionRunEventGang,
  OrderProductionRunEventMember,
  OrderProductionRunMember,
} from "@/types";

export function countOrderPieces(order: Pick<Order, "lineItems">): number {
  return (order.lineItems || []).reduce(
    (total, item) =>
      total +
      (item.sizes || []).reduce(
        (sizeTotal, size) => sizeTotal + (Number(size.quantity) || 0),
        0
      ),
    0
  );
}

export function countJobPieces(
  order: Pick<Order, "lineItems">,
  job: Pick<Job, "lineItemIds" | "blankAssignments">
): number {
  return jobAssignedPieceCount(order as Order, job as Job);
}

export function productionRunTierQuantity(order: Order): number {
  const combined = Number(order.productionRun?.combinedQuantity);
  return combined > 0 ? combined : countOrderPieces(order);
}

export function productionRunMemberLabel(
  member: OrderProductionRunMember
): string {
  const name = member.customLabel?.trim();
  return name ? `${member.orderNumber} — ${name}` : member.orderNumber;
}

export function productionRunCompanions(order: Order) {
  return (order.productionRun?.members || []).filter(
    (member) => member.orderId !== order.id
  );
}

/** Order IDs in this production run (or just this order if not linked). */
export function productionRunMemberOrderIds(order: Order): string[] {
  const members = order.productionRun?.members;
  if (!members || members.length < 2) return [order.id];
  return [...new Set(members.map((member) => member.orderId))];
}

export function eventRefKey(
  orderId: string,
  jobId: string,
  imprintId: string
): string {
  return `${orderId}:${jobId}:${imprintId}`;
}

export function eventMemberKey(member: {
  orderId: string;
  jobId: string;
  imprintId: string;
}): string {
  return eventRefKey(member.orderId, member.jobId, member.imprintId);
}

export type OrderEventOption = {
  key: string;
  orderId: string;
  orderNumber: string;
  customLabel?: string;
  jobId: string;
  jobName: string;
  imprintId: string;
  imprintLabel: string;
  locationKey: string;
  decoration: string;
  quantity: number;
  kind: "decoration" | "finishing";
};

export function listOrderEvents(order: Order): OrderEventOption[] {
  const events: OrderEventOption[] = [];
  for (const job of order.jobs || []) {
    const quantity = countJobPieces(order, job);
    for (const imprint of job.imprints || []) {
      events.push(buildOrderEventOption(order, job, imprint, quantity));
    }
  }
  return events;
}

function buildOrderEventOption(
  order: Order,
  job: Job,
  imprint: JobImprint,
  quantity: number
): OrderEventOption {
  const imprintLabel =
    imprint.customLabel?.trim() || imprint.label?.trim() || "Event";
  return {
    key: eventRefKey(order.id, job.id, imprint.id),
    orderId: order.id,
    orderNumber: order.number,
    customLabel: order.customLabel?.trim() || undefined,
    jobId: job.id,
    jobName: job.name?.trim() || "Job",
    imprintId: imprint.id,
    imprintLabel,
    locationKey: String(imprint.locationKey || ""),
    decoration: String(imprint.decoration || ""),
    quantity,
    kind: job.kind === "finishing" ? "finishing" : "decoration",
  };
}

export function eventOptionTitle(event: OrderEventOption): string {
  if (event.kind === "finishing") {
    return event.jobName || event.imprintLabel || "Finishing";
  }
  return event.imprintLabel;
}

export function eventOptionSubtitle(event: OrderEventOption): string {
  if (event.kind === "finishing") {
    return "Finishing";
  }
  return decorationLabel(event.decoration);
}

export function eventsMatchForGang(
  a: Pick<OrderEventOption, "locationKey" | "decoration" | "kind">,
  b: Pick<OrderEventOption, "locationKey" | "decoration" | "kind">
): boolean {
  if (a.kind === "finishing" || b.kind === "finishing") {
    return a.kind === "finishing" && b.kind === "finishing";
  }
  return (
    a.locationKey === b.locationKey &&
    a.decoration === b.decoration &&
    Boolean(a.locationKey) &&
    Boolean(a.decoration)
  );
}

export function toEventGangMember(
  event: OrderEventOption
): OrderProductionRunEventMember {
  return {
    orderId: event.orderId,
    orderNumber: event.orderNumber,
    customLabel: event.customLabel,
    jobId: event.jobId,
    jobName: event.jobName,
    imprintId: event.imprintId,
    imprintLabel: event.imprintLabel,
    locationKey: event.locationKey,
    decoration: event.decoration,
    quantity: event.quantity,
  };
}

export function gangCombinedQuantity(
  members: Pick<OrderProductionRunEventMember, "quantity">[]
): number {
  return members.reduce(
    (total, member) => total + (Number(member.quantity) || 0),
    0
  );
}

export function createEventGangId(): string {
  return `egang-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function draftEventGangsFromOrder(
  order: Order
): OrderProductionRunEventGang[] {
  const gangs = order.productionRun?.eventGangs;
  if (!Array.isArray(gangs)) return [];
  return gangs
    .filter((gang) => Array.isArray(gang.members) && gang.members.length >= 2)
    .map((gang) => ({
      id: gang.id || createEventGangId(),
      members: gang.members.map((member) => ({ ...member })),
      combinedQuantity:
        Number(gang.combinedQuantity) || gangCombinedQuantity(gang.members),
    }));
}

export function ordersLinkedByEventGangs(
  gangs: OrderProductionRunEventGang[]
): string[] {
  return [
    ...new Set(
      gangs.flatMap((gang) => gang.members.map((member) => member.orderId))
    ),
  ];
}

export function productionRunSummaryLabel(order: Order): string {
  const run = order.productionRun;
  if (!run || run.members.length < 2) return "None";
  const gangCount = run.eventGangs?.filter(
    (gang) => (gang.members?.length || 0) >= 2
  ).length;
  if (gangCount && gangCount > 0) {
    return `${gangCount} gang${gangCount === 1 ? "" : "s"} · ${run.members.length} orders`;
  }
  return `${run.members.length} orders · ${run.combinedQuantity.toLocaleString()} pcs`;
}
