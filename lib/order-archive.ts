import type { Order, ScheduleBlock } from "@/types";

export function isArchivedOrder(order: Order): boolean {
  return order.archived === true;
}

/** Active shop work — excludes soft-archived orders from operational views. */
export function excludeArchivedOrders(orders: Order[]): Order[] {
  return orders.filter((order) => !isArchivedOrder(order));
}

export function getArchivedOrderIds(orders: Order[]): Set<string> {
  return new Set(
    orders.filter(isArchivedOrder).map((order) => order.id)
  );
}

export function excludeScheduleBlocksForArchivedOrders(
  scheduleBlocks: ScheduleBlock[],
  archivedOrderIds: Set<string>
): ScheduleBlock[] {
  if (archivedOrderIds.size === 0) return scheduleBlocks;
  return scheduleBlocks.filter((block) => !archivedOrderIds.has(block.orderId));
}
