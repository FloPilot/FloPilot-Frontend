import type { GarmentReceiveStatus, Order, OrderGarments } from "@/types";

export function countExpectedGarmentPieces(order: Order): number {
  return order.lineItems.reduce(
    (sum, item) =>
      sum + item.sizes.reduce((sizeSum, size) => sizeSum + size.quantity, 0),
    0
  );
}

export function defaultOrderGarments(order: Order): OrderGarments {
  const expectedCount = countExpectedGarmentPieces(order);
  return {
    status: "waiting",
    expectedCount,
    receivedCount: 0,
  };
}

export function resolveOrderGarments(order: Order): OrderGarments | null {
  const expectedCount = countExpectedGarmentPieces(order);
  if (expectedCount === 0) return null;

  if (order.garments) {
    return {
      ...order.garments,
      expectedCount: order.garments.expectedCount || expectedCount,
    };
  }

  return defaultOrderGarments(order);
}

export function garmentStatusLabel(status: GarmentReceiveStatus): string {
  switch (status) {
    case "received":
      return "All received";
    case "partial":
      return "Partially received";
    default:
      return "Waiting on blanks";
  }
}

export function garmentStatusHint(
  garments: OrderGarments
): string {
  if (garments.status === "received") {
    return `All ${garments.expectedCount} pieces are in — every event can run.`;
  }
  if (garments.status === "partial") {
    return `${garments.receivedCount} of ${garments.expectedCount} pieces received so far.`;
  }
  return `Waiting on ${garments.expectedCount} blank garments for this order.`;
}
