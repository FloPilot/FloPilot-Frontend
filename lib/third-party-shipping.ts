import type {
  Customer,
  Order,
  OrderShippingSettings,
  OrderThirdPartyShippingAccount,
  ThirdPartyBillingType,
  ThirdPartyShippingAccount,
  ThirdPartyShippingCarrier,
} from "@/types";

export const THIRD_PARTY_CARRIERS: {
  value: ThirdPartyShippingCarrier;
  label: string;
}[] = [
  { value: "ups", label: "UPS" },
  { value: "fedex", label: "FedEx" },
  { value: "dhl", label: "DHL" },
  { value: "usps", label: "USPS" },
  { value: "other", label: "Other" },
];

export const THIRD_PARTY_BILLING_TYPES: {
  value: ThirdPartyBillingType;
  label: string;
  hint: string;
}[] = [
  {
    value: "third_party",
    label: "Third party",
    hint: "Bill a different account than shipper or receiver",
  },
  {
    value: "collect",
    label: "Freight collect",
    hint: "Receiver’s account is billed",
  },
  {
    value: "consignee",
    label: "Consignee",
    hint: "Bill the consignee account on file",
  },
];

export function createThirdPartyAccountId(): string {
  return `tpa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function thirdPartyCarrierLabel(
  carrier?: ThirdPartyShippingCarrier | string | null,
  carrierOther?: string | null
): string {
  if (carrier === "other") {
    const custom =
      typeof carrierOther === "string" ? carrierOther.trim() : "";
    return custom || "Other";
  }
  return (
    THIRD_PARTY_CARRIERS.find((entry) => entry.value === carrier)?.label ||
    String(carrier || "Carrier")
  );
}

export function thirdPartyBillingTypeLabel(
  type?: ThirdPartyBillingType | string | null
): string {
  return (
    THIRD_PARTY_BILLING_TYPES.find((entry) => entry.value === type)?.label ||
    "Third party"
  );
}

export function emptyThirdPartyAccountDraft(): Omit<
  ThirdPartyShippingAccount,
  "id"
> {
  return {
    label: "",
    carrier: "ups",
    carrierOther: "",
    accountNumber: "",
    billingPostalCode: "",
    billingCountry: "US",
    accountName: "",
    billingType: "third_party",
    notes: "",
    isDefault: false,
  };
}

export function normalizeThirdPartyShippingAccount(
  input: Partial<ThirdPartyShippingAccount> | null | undefined,
  index = 0
): ThirdPartyShippingAccount | null {
  if (!input || typeof input !== "object") return null;
  const accountNumber =
    typeof input.accountNumber === "string"
      ? input.accountNumber.trim().slice(0, 64)
      : "";
  const billingPostalCode =
    typeof input.billingPostalCode === "string"
      ? input.billingPostalCode.trim().slice(0, 20)
      : "";
  if (!accountNumber || !billingPostalCode) return null;

  const carrierRaw =
    typeof input.carrier === "string" ? input.carrier.trim().toLowerCase() : "";
  const carrier: ThirdPartyShippingCarrier = THIRD_PARTY_CARRIERS.some(
    (entry) => entry.value === carrierRaw
  )
    ? (carrierRaw as ThirdPartyShippingCarrier)
    : "other";

  const billingTypeRaw =
    typeof input.billingType === "string"
      ? input.billingType.trim().toLowerCase()
      : "";
  const billingType: ThirdPartyBillingType = THIRD_PARTY_BILLING_TYPES.some(
    (entry) => entry.value === billingTypeRaw
  )
    ? (billingTypeRaw as ThirdPartyBillingType)
    : "third_party";

  const label =
    typeof input.label === "string" ? input.label.trim().slice(0, 80) : "";
  const accountName =
    typeof input.accountName === "string"
      ? input.accountName.trim().slice(0, 120)
      : "";
  const notes =
    typeof input.notes === "string" ? input.notes.trim().slice(0, 500) : "";
  const billingCountry =
    typeof input.billingCountry === "string"
      ? input.billingCountry.trim().slice(0, 40)
      : "";
  const carrierOtherRaw =
    typeof input.carrierOther === "string"
      ? input.carrierOther.trim().slice(0, 80)
      : "";
  const carrierOther = carrier === "other" ? carrierOtherRaw : "";

  return {
    id:
      typeof input.id === "string" && input.id.trim()
        ? input.id.trim().slice(0, 64)
        : `tpa-${index}`,
    carrier,
    accountNumber,
    billingPostalCode,
    billingType,
    ...(label ? { label } : {}),
    ...(carrierOther ? { carrierOther } : {}),
    ...(accountName ? { accountName } : {}),
    ...(notes ? { notes } : {}),
    ...(billingCountry ? { billingCountry } : { billingCountry: "US" }),
    isDefault: input.isDefault === true,
  };
}

export function normalizeThirdPartyShippingAccounts(
  accounts: unknown
): ThirdPartyShippingAccount[] {
  if (!Array.isArray(accounts)) return [];
  const seen = new Set<string>();
  const normalized: ThirdPartyShippingAccount[] = [];
  for (let index = 0; index < accounts.length; index += 1) {
    const entry = normalizeThirdPartyShippingAccount(
      accounts[index] as Partial<ThirdPartyShippingAccount>,
      index
    );
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    normalized.push(entry);
  }
  return normalized.slice(0, 20);
}

export function ensureSingleDefaultThirdPartyAccount(
  accounts: ThirdPartyShippingAccount[]
): ThirdPartyShippingAccount[] {
  if (accounts.length === 0) return [];
  const hasDefault = accounts.some((entry) => entry.isDefault);
  if (hasDefault) {
    let kept = false;
    return accounts.map((entry) => {
      if (!entry.isDefault) return { ...entry, isDefault: false };
      if (kept) return { ...entry, isDefault: false };
      kept = true;
      return { ...entry, isDefault: true };
    });
  }
  return accounts.map((entry, index) => ({
    ...entry,
    isDefault: index === 0,
  }));
}

export function sortThirdPartyAccounts(
  accounts: ThirdPartyShippingAccount[]
): ThirdPartyShippingAccount[] {
  return [...accounts].sort((a, b) => {
    if (a.isDefault === b.isDefault) {
      return (a.label || a.accountNumber).localeCompare(
        b.label || b.accountNumber
      );
    }
    return a.isDefault ? -1 : 1;
  });
}

export function resolveCustomerThirdPartyAccounts(
  customer?: Customer | null
): ThirdPartyShippingAccount[] {
  return sortThirdPartyAccounts(
    normalizeThirdPartyShippingAccounts(
      customer?.thirdPartyShippingAccounts
    )
  );
}

export function resolveDefaultThirdPartyAccount(
  customer?: Customer | null
): ThirdPartyShippingAccount | null {
  const accounts = resolveCustomerThirdPartyAccounts(customer);
  return accounts.find((entry) => entry.isDefault) ?? accounts[0] ?? null;
}

export function snapshotOrderThirdPartyAccount(
  account: ThirdPartyShippingAccount
): OrderThirdPartyShippingAccount {
  return {
    customerAccountId: account.id,
    carrier: account.carrier,
    accountNumber: account.accountNumber,
    billingPostalCode: account.billingPostalCode,
    billingType: account.billingType ?? "third_party",
    ...(account.label ? { label: account.label } : {}),
    ...(account.carrier === "other" && account.carrierOther
      ? { carrierOther: account.carrierOther }
      : {}),
    ...(account.accountName ? { accountName: account.accountName } : {}),
    ...(account.notes ? { notes: account.notes } : {}),
    ...(account.billingCountry
      ? { billingCountry: account.billingCountry }
      : { billingCountry: "US" }),
  };
}

export function normalizeOrderThirdPartyAccount(
  input: Partial<OrderThirdPartyShippingAccount> | null | undefined
): OrderThirdPartyShippingAccount | null {
  if (input == null) return null;
  const normalized = normalizeThirdPartyShippingAccount(
    {
      id: "order",
      ...input,
      isDefault: false,
    },
    0
  );
  if (!normalized) return null;
  return {
    customerAccountId:
      typeof input.customerAccountId === "string" && input.customerAccountId.trim()
        ? input.customerAccountId.trim().slice(0, 64)
        : input.customerAccountId === null
          ? null
          : undefined,
    carrier: normalized.carrier,
    accountNumber: normalized.accountNumber,
    billingPostalCode: normalized.billingPostalCode,
    billingType: normalized.billingType ?? "third_party",
    ...(normalized.label ? { label: normalized.label } : {}),
    ...(normalized.carrierOther
      ? { carrierOther: normalized.carrierOther }
      : {}),
    ...(normalized.accountName ? { accountName: normalized.accountName } : {}),
    ...(normalized.notes ? { notes: normalized.notes } : {}),
    ...(normalized.billingCountry
      ? { billingCountry: normalized.billingCountry }
      : {}),
  };
}

export function formatThirdPartyAccountSummary(
  account:
    | ThirdPartyShippingAccount
    | OrderThirdPartyShippingAccount
    | null
    | undefined
): string {
  if (!account) return "";
  const parts = [
    thirdPartyCarrierLabel(account.carrier, account.carrierOther),
    account.accountNumber ? `#${account.accountNumber}` : "",
    account.billingPostalCode ? `ZIP ${account.billingPostalCode}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

export function formatThirdPartyAccountTitle(
  account:
    | ThirdPartyShippingAccount
    | OrderThirdPartyShippingAccount
    | null
    | undefined
): string {
  if (!account) return "Third-party account";
  if (account.label?.trim()) return account.label.trim();
  return `${thirdPartyCarrierLabel(account.carrier, account.carrierOther)} · #${account.accountNumber}`;
}

/**
 * Resolve the effective third-party account for an order’s shipping UI.
 * Order snapshot wins; otherwise fall back to the customer default.
 */
export function resolveOrderThirdPartyAccount(
  order: Order,
  customer?: Customer | null
): OrderThirdPartyShippingAccount | null {
  if (
    order.shipping &&
    Object.prototype.hasOwnProperty.call(order.shipping, "thirdPartyAccount")
  ) {
    return normalizeOrderThirdPartyAccount(order.shipping.thirdPartyAccount);
  }
  const fallback = resolveDefaultThirdPartyAccount(customer);
  return fallback ? snapshotOrderThirdPartyAccount(fallback) : null;
}

export function buildInitialOrderShippingSettings(
  customer?: Customer | null,
  shippingMethodKey?: string
): OrderShippingSettings {
  const defaultAccount = resolveDefaultThirdPartyAccount(customer);
  return {
    defaultMethodKey: shippingMethodKey,
    thirdPartyAccount: defaultAccount
      ? snapshotOrderThirdPartyAccount(defaultAccount)
      : null,
  };
}

export function accountsMatchOrderSnapshot(
  account: ThirdPartyShippingAccount,
  snapshot: OrderThirdPartyShippingAccount | null | undefined
): boolean {
  if (!snapshot) return false;
  if (snapshot.customerAccountId && snapshot.customerAccountId === account.id) {
    return true;
  }
  return (
    account.carrier === snapshot.carrier &&
    account.accountNumber === snapshot.accountNumber &&
    account.billingPostalCode === snapshot.billingPostalCode
  );
}
