/** Common account payment terms used for invoice due dates. */

export type PaymentTerms = {
  /** Calendar days after invoice date. 0 = due on receipt. null = unset. */
  days: number | null;
  /** Display label, e.g. "Net 30" or "Due on receipt". */
  label: string;
};

export const PAYMENT_TERMS_PRESETS: ReadonlyArray<{
  days: number;
  label: string;
}> = [
  { days: 0, label: "Due on receipt" },
  { days: 10, label: "Net 10" },
  { days: 15, label: "Net 15" },
  { days: 30, label: "Net 30" },
  { days: 45, label: "Net 45" },
  { days: 60, label: "Net 60" },
];

const NET_PATTERN = /\bnet\s*[- ]?\s*(\d{1,3})\b/i;
const DUE_ON_RECEIPT_PATTERN =
  /\b(due\s+on\s+receipt|due\s+upon\s+receipt|cod|cash\s+on\s+delivery)\b/i;

export function formatPaymentTermsLabel(days: number | null | undefined): string {
  if (days == null || !Number.isFinite(days)) return "";
  const n = Math.max(0, Math.floor(days));
  const preset = PAYMENT_TERMS_PRESETS.find((entry) => entry.days === n);
  if (preset) return preset.label;
  if (n === 0) return "Due on receipt";
  return `Net ${n}`;
}

/** Parse freeform terms text into structured days + cleaned label. */
export function parsePaymentTermsInput(raw: string): PaymentTerms {
  const label = raw.replace(/\s+/g, " ").trim();
  if (!label) return { days: null, label: "" };

  if (DUE_ON_RECEIPT_PATTERN.test(label)) {
    return { days: 0, label: "Due on receipt" };
  }

  const netMatch = label.match(NET_PATTERN);
  if (netMatch) {
    const days = Math.min(365, Math.max(0, Number.parseInt(netMatch[1], 10)));
    if (Number.isFinite(days)) {
      return {
        days,
        label: formatPaymentTermsLabel(days) || label,
      };
    }
  }

  // Custom text — keep label, no automatic due-date math.
  return { days: null, label };
}

export function normalizePaymentTerms(input: {
  days?: number | null;
  label?: string | null;
}): PaymentTerms {
  const labelRaw =
    typeof input.label === "string" ? input.label.replace(/\s+/g, " ").trim() : "";
  const daysRaw =
    typeof input.days === "number" && Number.isFinite(input.days)
      ? Math.min(365, Math.max(0, Math.floor(input.days)))
      : null;

  if (!labelRaw && daysRaw == null) {
    return { days: null, label: "" };
  }

  if (labelRaw) {
    const parsed = parsePaymentTermsInput(labelRaw);
    if (parsed.days != null) return parsed;
    if (daysRaw != null) {
      return { days: daysRaw, label: labelRaw };
    }
    return { days: null, label: labelRaw };
  }

  return {
    days: daysRaw,
    label: formatPaymentTermsLabel(daysRaw),
  };
}

export function paymentTermsSummary(terms: PaymentTerms | null | undefined): string {
  if (!terms?.label) return "";
  if (terms.days == null) return terms.label;
  if (terms.days === 0) {
    return `${terms.label} — invoices are due when sent`;
  }
  return `${terms.label} — invoices due ${terms.days} days after send`;
}

/** YYYY-MM-DD from a Date or ISO string in local calendar terms. */
export function toDateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return toDateOnly(parsed);
  }
  if (Number.isNaN(value.getTime())) return null;
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysToDateOnly(dateOnly: string, days: number): string {
  const [y, m, d] = dateOnly.split("-").map((part) => Number(part));
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toDateOnly(date)!;
}

/**
 * Invoice due date from payment terms.
 * When terms days are set: invoiceDate + days.
 * Otherwise fall back to an explicit due / in-hands date.
 */
export function computeInvoiceDueDate(params: {
  termsDays?: number | null;
  invoiceDate?: string | Date | null;
  explicitDueDate?: string | null;
  inHandsDate?: string | null;
}): string | null {
  const invoiceDate = toDateOnly(params.invoiceDate) || toDateOnly(new Date());
  if (
    typeof params.termsDays === "number" &&
    Number.isFinite(params.termsDays) &&
    invoiceDate
  ) {
    return addDaysToDateOnly(invoiceDate, Math.max(0, Math.floor(params.termsDays)));
  }
  const explicit = toDateOnly(params.explicitDueDate);
  if (explicit) return explicit;
  return toDateOnly(params.inHandsDate);
}

export function resolvePaymentTerms(source: {
  paymentTermsDays?: number | null;
  paymentTermsLabel?: string | null;
} | null | undefined): PaymentTerms | null {
  if (!source) return null;
  const normalized = normalizePaymentTerms({
    days: source.paymentTermsDays,
    label: source.paymentTermsLabel,
  });
  if (!normalized.label && normalized.days == null) return null;
  return normalized;
}
