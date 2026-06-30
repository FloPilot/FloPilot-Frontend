import type { Customer } from "@/types";

export type CustomerAccentKey =
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "cyan"
  | "orange"
  | "indigo";

export type CustomerAccent = {
  key: CustomerAccentKey;
  label: string;
  cap: string;
  bg: string;
  border: string;
  dot: string;
  text: string;
  swatch: string;
};

export const CUSTOMER_ACCENT_OPTIONS: CustomerAccent[] = [
  {
    key: "blue",
    label: "Blue",
    cap: "bg-blue-500",
    bg: "bg-blue-50/80",
    border: "border-blue-200",
    dot: "bg-blue-500",
    text: "text-blue-900",
    swatch: "bg-blue-500",
  },
  {
    key: "violet",
    label: "Violet",
    cap: "bg-violet-500",
    bg: "bg-violet-50/80",
    border: "border-violet-200",
    dot: "bg-violet-500",
    text: "text-violet-900",
    swatch: "bg-violet-500",
  },
  {
    key: "emerald",
    label: "Emerald",
    cap: "bg-emerald-500",
    bg: "bg-emerald-50/80",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    text: "text-emerald-900",
    swatch: "bg-emerald-500",
  },
  {
    key: "amber",
    label: "Amber",
    cap: "bg-amber-500",
    bg: "bg-amber-50/80",
    border: "border-amber-200",
    dot: "bg-amber-500",
    text: "text-amber-900",
    swatch: "bg-amber-500",
  },
  {
    key: "rose",
    label: "Rose",
    cap: "bg-rose-500",
    bg: "bg-rose-50/80",
    border: "border-rose-200",
    dot: "bg-rose-500",
    text: "text-rose-900",
    swatch: "bg-rose-500",
  },
  {
    key: "cyan",
    label: "Cyan",
    cap: "bg-cyan-500",
    bg: "bg-cyan-50/80",
    border: "border-cyan-200",
    dot: "bg-cyan-500",
    text: "text-cyan-900",
    swatch: "bg-cyan-500",
  },
  {
    key: "orange",
    label: "Orange",
    cap: "bg-orange-500",
    bg: "bg-orange-50/80",
    border: "border-orange-200",
    dot: "bg-orange-500",
    text: "text-orange-900",
    swatch: "bg-orange-500",
  },
  {
    key: "indigo",
    label: "Indigo",
    cap: "bg-indigo-500",
    bg: "bg-indigo-50/80",
    border: "border-indigo-200",
    dot: "bg-indigo-500",
    text: "text-indigo-900",
    swatch: "bg-indigo-500",
  },
];

const ACCENT_BY_KEY = new Map(
  CUSTOMER_ACCENT_OPTIONS.map((accent) => [accent.key, accent])
);

export function isCustomerAccentKey(
  value: string | undefined
): value is CustomerAccentKey {
  return Boolean(value && ACCENT_BY_KEY.has(value as CustomerAccentKey));
}

export function getCustomerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getCustomerAccent(
  customerId: string | undefined,
  fallbackKey: string,
  accentColorKey?: string | null
): CustomerAccent {
  if (isCustomerAccentKey(accentColorKey ?? undefined)) {
    return ACCENT_BY_KEY.get(accentColorKey as CustomerAccentKey)!;
  }
  const key = customerId?.trim() || fallbackKey;
  const index = hashString(key) % CUSTOMER_ACCENT_OPTIONS.length;
  return CUSTOMER_ACCENT_OPTIONS[index];
}

export function getCustomerAccentFromCustomer(
  customer: Pick<Customer, "id" | "accentColorKey"> | undefined,
  fallbackKey: string
): CustomerAccent {
  return getCustomerAccent(
    customer?.id,
    fallbackKey,
    customer?.accentColorKey
  );
}

export function collectCustomerLegend(
  items: { customerId?: string; orderId: string; customerName: string }[],
  customersById?: Map<string, Pick<Customer, "accentColorKey" | "logoUrl">>
) {
  const seen = new Map<
    string,
    {
      customerName: string;
      accent: CustomerAccent;
      logoUrl?: string;
    }
  >();

  for (const item of items) {
    const key = item.customerId || item.orderId;
    if (seen.has(key)) continue;
    const customer = item.customerId
      ? customersById?.get(item.customerId)
      : undefined;
    seen.set(key, {
      customerName: item.customerName,
      accent: getCustomerAccent(
        item.customerId,
        item.orderId,
        customer?.accentColorKey
      ),
      logoUrl: customer?.logoUrl,
    });
  }

  return Array.from(seen.values());
}
