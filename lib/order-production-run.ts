import type { Order, OrderProductionRunMember } from "@/types";

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
