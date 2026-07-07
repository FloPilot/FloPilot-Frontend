/** Optional shop label shown after order number, e.g. "SO-1043 — LEGENDS SPIRIT OF DRIVING" */
export function formatOrderDisplayLine(order: {
  number: string;
  customLabel?: string;
}): string {
  const custom = order.customLabel?.trim();
  if (custom) return `${order.number} — ${custom}`;
  return order.number;
}
