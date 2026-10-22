/** First auto-assigned number when a shop has none yet. */
export const CUSTOMER_NUMBER_START = 1000;

export function parseCustomerNumber(
  value: string | null | undefined
): number | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!/^\d{1,10}$/.test(trimmed)) return null;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function formatCustomerNumberLabel(
  value: string | null | undefined
): string {
  const n = parseCustomerNumber(value);
  if (n == null) return "";
  return String(n);
}

/** Next unused customer # from the in-memory roster (draft preview). */
export function suggestNextCustomerNumber(
  customers: Array<{ id: string; customerNumber?: string | null }>,
  excludeCustomerId?: string | null
): string {
  let max = CUSTOMER_NUMBER_START - 1;
  for (const customer of customers) {
    if (excludeCustomerId && customer.id === excludeCustomerId) continue;
    const n = parseCustomerNumber(customer.customerNumber);
    if (n != null && n > max) max = n;
  }
  return String(max + 1);
}
