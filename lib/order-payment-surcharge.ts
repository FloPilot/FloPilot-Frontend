import type { Order, OrderPaymentSurcharge } from "@/types";

export const PAYMENT_SURCHARGE_ROW_ID = "payment-surcharge";
export const DEFAULT_PAYMENT_SURCHARGE_PERCENT = 3;
export const DEFAULT_PAYMENT_SURCHARGE_LABEL = "Payment processing surcharge";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function emptyPaymentSurcharge(
  patch?: Partial<OrderPaymentSurcharge>
): OrderPaymentSurcharge {
  return {
    enabled: false,
    percent: DEFAULT_PAYMENT_SURCHARGE_PERCENT,
    label: DEFAULT_PAYMENT_SURCHARGE_LABEL,
    amountOverride: null,
    ...patch,
  };
}

export function normalizePaymentSurcharge(
  raw: Partial<OrderPaymentSurcharge> | null | undefined
): OrderPaymentSurcharge | null {
  if (raw == null) return null;
  if (typeof raw !== "object") return null;

  const percentRaw = Number(raw.percent);
  const percent = Number.isFinite(percentRaw)
    ? Math.min(100, Math.max(0, Math.round(percentRaw * 1000) / 1000))
    : DEFAULT_PAYMENT_SURCHARGE_PERCENT;

  const label =
    typeof raw.label === "string" && raw.label.trim()
      ? raw.label.trim().slice(0, 120)
      : DEFAULT_PAYMENT_SURCHARGE_LABEL;

  let amountOverride: number | null = null;
  if (raw.amountOverride !== undefined && raw.amountOverride !== null) {
    const amount = Number(raw.amountOverride);
    if (Number.isFinite(amount) && amount >= 0) {
      amountOverride = round2(amount);
    }
  }

  return {
    enabled: raw.enabled === true,
    percent,
    label,
    amountOverride,
    ...(typeof raw.updatedAt === "string" && raw.updatedAt.trim()
      ? { updatedAt: raw.updatedAt.trim() }
      : {}),
  };
}

export function resolvePaymentSurcharge(
  order: Pick<Order, "paymentSurcharge"> | null | undefined
): OrderPaymentSurcharge | null {
  return normalizePaymentSurcharge(order?.paymentSurcharge);
}

/** Dollar amount from percent × base (never uses override). */
export function calculatePaymentSurchargeFromPercent(
  baseSubtotal: number,
  percent: number
): number {
  const base = Math.max(0, Number(baseSubtotal) || 0);
  const pct = Math.max(0, Number(percent) || 0);
  return round2((base * pct) / 100);
}

/**
 * Effective surcharge amount for totals.
 * Uses locked override when set; otherwise percent × base.
 */
export function resolvePaymentSurchargeAmount(
  surcharge: OrderPaymentSurcharge | null | undefined,
  baseSubtotal: number
): number {
  if (!surcharge?.enabled) return 0;
  if (
    surcharge.amountOverride !== undefined &&
    surcharge.amountOverride !== null &&
    Number.isFinite(Number(surcharge.amountOverride))
  ) {
    return round2(Math.max(0, Number(surcharge.amountOverride)));
  }
  return calculatePaymentSurchargeFromPercent(baseSubtotal, surcharge.percent);
}

export function isPaymentSurchargeLocked(
  surcharge: OrderPaymentSurcharge | null | undefined
): boolean {
  return (
    Boolean(surcharge?.enabled) &&
    surcharge?.amountOverride !== undefined &&
    surcharge?.amountOverride !== null &&
    Number.isFinite(Number(surcharge.amountOverride))
  );
}

/** True when a locked amount no longer matches the live percent calc. */
export function paymentSurchargeNeedsRecalc(
  surcharge: OrderPaymentSurcharge | null | undefined,
  baseSubtotal: number
): boolean {
  if (!isPaymentSurchargeLocked(surcharge) || !surcharge) return false;
  const live = calculatePaymentSurchargeFromPercent(
    baseSubtotal,
    surcharge.percent
  );
  return round2(Number(surcharge.amountOverride)) !== live;
}

export function unlockAndRecalculateSurcharge(
  surcharge: OrderPaymentSurcharge
): OrderPaymentSurcharge {
  return {
    ...surcharge,
    amountOverride: null,
    updatedAt: new Date().toISOString(),
  };
}

export function formatSurchargePercent(percent: number): string {
  const n = Number(percent);
  if (!Number.isFinite(n)) return String(DEFAULT_PAYMENT_SURCHARGE_PERCENT);
  return String(Number(n.toFixed(3)));
}
