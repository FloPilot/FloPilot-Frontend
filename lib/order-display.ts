/** Optional shop label shown after order number, e.g. "SO-1043 — CUSTOM NAME" */
export function formatOrderDisplayLine(order: {
  number: string;
  customLabel?: string | null;
}): string {
  return formatOrderNumberWithLabel(order.number, order.customLabel);
}

export function formatOrderNumberWithLabel(
  orderNumber: string,
  customLabel?: string | null
): string {
  const custom = customLabel?.trim();
  if (custom) return `${orderNumber} — ${custom}`;
  return orderNumber;
}

/** Derived rows that store raw orderNumber + optional orderCustomLabel */
export function formatOrderRef(ref: {
  orderNumber: string;
  orderCustomLabel?: string | null;
}): string {
  return formatOrderNumberWithLabel(ref.orderNumber, ref.orderCustomLabel);
}

/** Calendar blocks: event label first, then order-level custom name as fallback. */
export function formatScheduleBlockDisplayLine(
  block: { orderNumber: string; customLabel?: string | null },
  order?: { customLabel?: string | null }
): string {
  const custom = block.customLabel?.trim() || order?.customLabel?.trim();
  if (custom) return `${block.orderNumber} — ${custom}`;
  return block.orderNumber;
}
