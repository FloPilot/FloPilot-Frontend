import type { Order } from "@/types";

export function isArchivedOrder(order: Order): boolean {
  return order.archived === true;
}
