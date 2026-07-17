import type {
  Order,
  OrderProducedGoods,
  OrderProducedGoodsLine,
  ProducedGoodsLineStatus,
} from "@/types";

export function producedGoodsLineId(lineItemId: string, size: string): string {
  return `produced-${lineItemId}-${size}`;
}

export function computeProducedLineStatus(
  producedQty: number,
  hasBeenSaved: boolean
): ProducedGoodsLineStatus {
  if (hasBeenSaved || producedQty > 0) return "recorded";
  return "pending";
}

export function buildDefaultProducedGoods(order: Order): OrderProducedGoods {
  const lines: OrderProducedGoodsLine[] = [];

  for (const item of order.lineItems || []) {
    for (const sizeRow of item.sizes || []) {
      const orderedQty = Math.max(0, Math.floor(sizeRow.quantity || 0));
      if (orderedQty <= 0) continue;
      lines.push({
        id: producedGoodsLineId(item.id, sizeRow.size),
        lineItemId: item.id,
        size: sizeRow.size,
        productName: item.productName,
        brand: item.brand,
        color: item.color,
        orderedQty,
        producedQty: orderedQty,
        status: "pending",
      });
    }
  }

  return { lines };
}

export function mergeOrderProducedGoods(order: Order): OrderProducedGoods {
  const template = buildDefaultProducedGoods(order);
  const savedById = new Map(
    (order.producedGoods?.lines || []).map((line) => [line.id, line])
  );

  const lines = template.lines.map((tpl) => {
    const saved = savedById.get(tpl.id);
    if (!saved) return tpl;

    const producedQty = Math.max(0, Math.floor(saved.producedQty ?? tpl.orderedQty));
    const recorded =
      saved.status === "recorded" ||
      Boolean(saved.recordedAt) ||
      producedQty !== tpl.orderedQty;

    return {
      ...tpl,
      ...saved,
      orderedQty: tpl.orderedQty,
      producedQty,
      status: computeProducedLineStatus(producedQty, recorded),
      productName: tpl.productName,
      brand: tpl.brand,
      color: tpl.color,
      lineItemId: tpl.lineItemId,
      size: tpl.size,
    };
  });

  return {
    lines,
    notes: order.producedGoods?.notes,
    updatedAt: order.producedGoods?.updatedAt,
    confirmedAt: order.producedGoods?.confirmedAt,
    confirmedBy: order.producedGoods?.confirmedBy,
  };
}

export function applyProducedQty(
  produced: OrderProducedGoods,
  lineId: string,
  producedQty: number,
  recordedBy: string
): OrderProducedGoods {
  const now = new Date().toISOString();
  const qty = Math.max(0, Math.floor(producedQty));

  return {
    ...produced,
    updatedAt: now,
    lines: produced.lines.map((line) => {
      if (line.id !== lineId) return line;
      return {
        ...line,
        producedQty: qty,
        status: "recorded" as const,
        recordedBy,
        recordedAt: now,
        updatedAt: now,
      };
    }),
  };
}

export function setAllProducedToOrdered(
  produced: OrderProducedGoods,
  recordedBy: string
): OrderProducedGoods {
  let next = produced;
  for (const line of produced.lines) {
    next = applyProducedQty(next, line.id, line.orderedQty, recordedBy);
  }
  return {
    ...next,
    confirmedAt: new Date().toISOString(),
    confirmedBy: recordedBy,
  };
}

export function confirmProducedGoods(
  produced: OrderProducedGoods,
  recordedBy: string
): OrderProducedGoods {
  const now = new Date().toISOString();
  return {
    ...produced,
    updatedAt: now,
    confirmedAt: now,
    confirmedBy: recordedBy,
    lines: produced.lines.map((line) => ({
      ...line,
      status: "recorded" as const,
      recordedBy: line.recordedBy || recordedBy,
      recordedAt: line.recordedAt || now,
      updatedAt: now,
    })),
  };
}

export function countOrderedPieces(produced: OrderProducedGoods): number {
  return produced.lines.reduce((sum, line) => sum + (line.orderedQty || 0), 0);
}

export function countProducedPieces(produced: OrderProducedGoods): number {
  return produced.lines.reduce((sum, line) => sum + (line.producedQty || 0), 0);
}

export function producedGoodsDelta(produced: OrderProducedGoods): number {
  return countProducedPieces(produced) - countOrderedPieces(produced);
}

export function hasProducedGoodsVariance(produced: OrderProducedGoods): boolean {
  return produced.lines.some((line) => line.producedQty !== line.orderedQty);
}

export function producedGoodsAreRecorded(produced: OrderProducedGoods): boolean {
  if (produced.lines.length === 0) return false;
  if (produced.confirmedAt) return true;
  return produced.lines.every((line) => line.status === "recorded");
}

/** Shallow order copy with line-item size qtys replaced by produced counts for billing. */
export function orderWithProducedQuantities(order: Order): Order {
  const produced = mergeOrderProducedGoods(order);
  const qtyByKey = new Map(
    produced.lines.map((line) => [
      `${line.lineItemId}::${line.size}`,
      line.producedQty,
    ])
  );

  return {
    ...order,
    lineItems: (order.lineItems || []).map((item) => ({
      ...item,
      sizes: (item.sizes || []).map((sizeRow) => {
        const key = `${item.id}::${sizeRow.size}`;
        const producedQty = qtyByKey.get(key);
        if (producedQty === undefined) return sizeRow;
        return { ...sizeRow, quantity: producedQty };
      }),
    })),
  };
}

export const PRODUCED_STATUS_STYLES: Record<
  ProducedGoodsLineStatus,
  { label: string; badge: string; row: string }
> = {
  pending: {
    label: "Pending",
    badge: "border-[#e3e3e3] bg-[#f5f5f5] text-[#616161]",
    row: "bg-white",
  },
  recorded: {
    label: "Recorded",
    badge: "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]",
    row: "bg-white",
  },
};

export function varianceCallout(produced: OrderProducedGoods): {
  tone: "match" | "over" | "under" | "pending";
  title: string;
  detail: string;
} | null {
  if (produced.lines.length === 0) return null;

  const ordered = countOrderedPieces(produced);
  const made = countProducedPieces(produced);
  const delta = made - ordered;
  const recorded = producedGoodsAreRecorded(produced);

  if (!recorded && !hasProducedGoodsVariance(produced)) {
    return {
      tone: "pending",
      title: "Produced goods not confirmed",
      detail: `Enter actual counts after production. Defaults match the ordered total (${ordered} pcs).`,
    };
  }

  if (delta === 0) {
    return {
      tone: "match",
      title: "Produced matches order",
      detail: `${made} pcs produced — same as ordered.`,
    };
  }

  if (delta > 0) {
    return {
      tone: "over",
      title: `Over-produced by ${delta} pc${delta === 1 ? "" : "s"}`,
      detail: `${made} pcs produced vs ${ordered} ordered. Invoice will bill produced quantities.`,
    };
  }

  return {
    tone: "under",
    title: `Short by ${Math.abs(delta)} pc${Math.abs(delta) === 1 ? "" : "s"}`,
    detail: `${made} pcs produced vs ${ordered} ordered. Invoice will bill produced quantities.`,
  };
}
