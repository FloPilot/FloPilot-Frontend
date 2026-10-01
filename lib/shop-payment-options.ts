/**
 * Shop-configured invoice payment options (Venmo, Zelle, custom) plus
 * defaults for Stripe / QuickBooks when those integrations are connected.
 */

export type ShopPaymentMethodKind = "venmo" | "zelle" | "custom";

export type ShopPaymentMethod = {
  id: string;
  kind: ShopPaymentMethodKind;
  label: string;
  /** Payment URL (venmo.me/..., Cash App, etc.) */
  link?: string;
  /** Free-text details (Zelle name / email / phone) */
  details?: string;
  /** Pre-select when sending invoices */
  defaultOnInvoice: boolean;
  sortOrder?: number;
};

export type ShopPaymentOptions = {
  /** When Stripe is connected, include card pay link by default */
  stripeDefaultOnInvoice: boolean;
  /** When QuickBooks is connected, push + attach QB pay link by default */
  quickbooksDefaultOnInvoice: boolean;
  methods: ShopPaymentMethod[];
};

export type InvoicePaymentSelection = {
  includeStripe?: boolean;
  includeQuickBooks?: boolean;
  methodIds?: string[];
};

export type ResolvedInvoicePaymentOption = {
  id: string;
  kind: "stripe" | "quickbooks" | ShopPaymentMethodKind;
  label: string;
  description?: string;
  link?: string | null;
  details?: string | null;
  defaultOnInvoice: boolean;
};

const METHOD_KINDS = new Set<ShopPaymentMethodKind>([
  "venmo",
  "zelle",
  "custom",
]);

export const DEFAULT_PAYMENT_OPTIONS: ShopPaymentOptions = {
  stripeDefaultOnInvoice: true,
  quickbooksDefaultOnInvoice: true,
  methods: [],
};

export function createPaymentMethodId(): string {
  return `pay_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function normalizePaymentMethod(
  raw: Partial<ShopPaymentMethod> | null | undefined,
  index = 0
): ShopPaymentMethod | null {
  if (!raw || typeof raw !== "object") return null;
  const kind = METHOD_KINDS.has(raw.kind as ShopPaymentMethodKind)
    ? (raw.kind as ShopPaymentMethodKind)
    : "custom";
  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim().slice(0, 80)
      : createPaymentMethodId();
  const defaultLabels: Record<ShopPaymentMethodKind, string> = {
    venmo: "Venmo",
    zelle: "Zelle",
    custom: "Other",
  };
  const label =
    typeof raw.label === "string" && raw.label.trim()
      ? raw.label.trim().slice(0, 80)
      : defaultLabels[kind];
  const link =
    typeof raw.link === "string" && raw.link.trim()
      ? raw.link.trim().slice(0, 500)
      : "";
  const details =
    typeof raw.details === "string" && raw.details.trim()
      ? raw.details.trim().slice(0, 500)
      : "";
  if (kind === "custom" && !label.trim() && !link && !details) return null;
  return {
    id,
    kind,
    label,
    ...(link ? { link } : {}),
    ...(details ? { details } : {}),
    defaultOnInvoice: raw.defaultOnInvoice !== false,
    sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : index,
  };
}

export function normalizePaymentOptions(
  raw?: Partial<ShopPaymentOptions> | null
): ShopPaymentOptions {
  const input = raw && typeof raw === "object" ? raw : {};
  const methods: ShopPaymentMethod[] = [];
  const seen = new Set<string>();
  const list = Array.isArray(input.methods) ? input.methods : [];
  list.forEach((entry, index) => {
    const method = normalizePaymentMethod(entry, index);
    if (!method || seen.has(method.id)) return;
    seen.add(method.id);
    methods.push(method);
  });
  methods.sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      String(a.label).localeCompare(String(b.label))
  );
  return {
    stripeDefaultOnInvoice: input.stripeDefaultOnInvoice !== false,
    quickbooksDefaultOnInvoice: input.quickbooksDefaultOnInvoice !== false,
    methods: methods.map(({ sortOrder: _s, ...rest }, index) => ({
      ...rest,
      sortOrder: index,
    })),
  };
}

export function resolveInvoicePaymentOptions(
  paymentOptions: ShopPaymentOptions | null | undefined,
  opts: {
    stripeAvailable?: boolean;
    quickbooksAvailable?: boolean;
    selected?: InvoicePaymentSelection | null;
  } = {}
): {
  available: ResolvedInvoicePaymentOption[];
  selectedIds: string[];
} {
  const options = normalizePaymentOptions(paymentOptions);
  const available: ResolvedInvoicePaymentOption[] = [];

  if (opts.stripeAvailable) {
    available.push({
      id: "stripe",
      kind: "stripe",
      label: "Pay by card",
      description: "Secure Stripe checkout link",
      defaultOnInvoice: options.stripeDefaultOnInvoice,
    });
  }
  if (opts.quickbooksAvailable) {
    available.push({
      id: "quickbooks",
      kind: "quickbooks",
      label: "QuickBooks pay link",
      description: "Payment link from the QuickBooks invoice",
      defaultOnInvoice: options.quickbooksDefaultOnInvoice,
    });
  }
  for (const method of options.methods) {
    available.push({
      id: method.id,
      kind: method.kind,
      label: method.label,
      description:
        method.link ||
        method.details ||
        (method.kind === "venmo"
          ? "Venmo"
          : method.kind === "zelle"
            ? "Zelle"
            : "Custom"),
      link: method.link || null,
      details: method.details || null,
      defaultOnInvoice: method.defaultOnInvoice !== false,
    });
  }

  let selectedIds: string[];
  if (opts.selected && typeof opts.selected === "object") {
    const ids = new Set<string>();
    if (opts.selected.includeStripe) ids.add("stripe");
    if (opts.selected.includeQuickBooks) ids.add("quickbooks");
    for (const id of opts.selected.methodIds || []) {
      if (id) ids.add(String(id));
    }
    selectedIds = [...ids].filter((id) =>
      available.some((entry) => entry.id === id)
    );
  } else {
    selectedIds = available
      .filter((entry) => entry.defaultOnInvoice)
      .map((entry) => entry.id);
  }

  return { available, selectedIds };
}

export function paymentSelectionFromIds(
  selectedIds: string[]
): InvoicePaymentSelection {
  return {
    includeStripe: selectedIds.includes("stripe"),
    includeQuickBooks: selectedIds.includes("quickbooks"),
    methodIds: selectedIds.filter(
      (id) => id !== "stripe" && id !== "quickbooks"
    ),
  };
}

export const PAYMENT_METHOD_KIND_OPTIONS: {
  kind: ShopPaymentMethodKind;
  label: string;
  hint: string;
}[] = [
  {
    kind: "venmo",
    label: "Venmo",
    hint: "Add your venmo.me link so customers can pay from the invoice.",
  },
  {
    kind: "zelle",
    label: "Zelle",
    hint: "Share the name, email, or phone customers should send Zelle to.",
  },
  {
    kind: "custom",
    label: "Custom",
    hint: "Any other rail — Cash App, check instructions, wire details, etc.",
  },
];
