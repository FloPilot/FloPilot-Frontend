import {
  getGarmentReceivingLines,
  mergeOrderMaterials,
} from "@/lib/order-materials";
import {
  countOrderedPieces,
  countProducedPieces,
  hasProducedGoodsVariance,
  mergeOrderProducedGoods,
  producedGoodsAreRecorded,
} from "@/lib/order-produced-goods";
import type { Order } from "@/types";

export type OrderSchedulingPieceCounts = {
  ordered: number;
  received: number;
  produced: number;
  /** Quantity to plan for on press / calendar time. */
  decorate: number;
  source: "ordered" | "received" | "produced";
};

function countOrderedFromLineItems(order: Order): number {
  return (order.lineItems ?? []).reduce(
    (sum, item) =>
      sum +
      (item.sizes ?? []).reduce((sizeSum, size) => sizeSum + size.quantity, 0),
    0
  );
}

function countReceivedBlanks(order: Order): number {
  return getGarmentReceivingLines(mergeOrderMaterials(order)).reduce(
    (sum, line) => sum + (line.receivedQty || 0),
    0
  );
}

/**
 * Resolve how many pieces scheduling should plan for.
 * Prefer confirmed/recorded produced goods, otherwise blank receiving,
 * otherwise the ordered total.
 */
export function resolveOrderSchedulingPieceCounts(
  order: Order
): OrderSchedulingPieceCounts {
  const produced = mergeOrderProducedGoods(order);
  const ordered =
    countOrderedPieces(produced) || countOrderedFromLineItems(order);
  const producedCount = countProducedPieces(produced);
  const received = countReceivedBlanks(order);

  if (
    produced.lines.length > 0 &&
    (producedGoodsAreRecorded(produced) || hasProducedGoodsVariance(produced))
  ) {
    return {
      ordered,
      received,
      produced: producedCount,
      decorate: producedCount,
      source: "produced",
    };
  }

  if (received > 0) {
    return {
      ordered,
      received,
      produced: producedCount,
      decorate: received,
      source: "received",
    };
  }

  return {
    ordered,
    received,
    produced: producedCount,
    decorate: ordered,
    source: "ordered",
  };
}

/** Compact label for queue / calendar cards. */
export function formatSchedulingPieceLabel(
  counts: Pick<OrderSchedulingPieceCounts, "ordered" | "decorate">
): string {
  const ordered = Math.max(0, counts.ordered || 0);
  const decorate = Math.max(0, counts.decorate || 0);
  if (ordered <= 0 && decorate <= 0) return "";
  if (ordered === decorate || ordered <= 0) {
    return `${decorate.toLocaleString()} pcs`;
  }
  return `${ordered.toLocaleString()} ordered · ${decorate.toLocaleString()} to decorate`;
}
