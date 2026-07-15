export type AccountingProviderId = "quickbooks";

export type QuickBooksDocumentType = "estimate" | "invoice";

export type QuickBooksItemMappingKey =
  | "garment"
  | "decoration"
  | "fee"
  | "default";

export type QuickBooksItemMapping = {
  id: string | null;
  name: string | null;
};

export type QuickBooksItemMappings = Record<
  QuickBooksItemMappingKey,
  QuickBooksItemMapping
>;

export type QuickBooksCatalogItem = {
  id: string;
  name: string;
  type: string;
  description?: string | null;
};

export type QuickBooksSettings = {
  defaultDocumentType: "ask" | QuickBooksDocumentType;
  allowedDocumentTypes: QuickBooksDocumentType[];
  autoPushOnEstimateApprove: boolean;
  autoPushOnInvoice: boolean;
  itemMappings?: QuickBooksItemMappings;
};

export type AccountingIntegration = {
  provider: AccountingProviderId;
  name: string;
  status: "connected" | "disconnected" | "error";
  configured: boolean;
  environment?: "sandbox" | "production";
  companyName?: string | null;
  realmId?: string | null;
  connectedAt?: string | null;
  connectedBy?: string | null;
  lastVerifiedAt?: string | null;
  lastError?: string | null;
  tokenExpiresAt?: string | null;
  settings?: QuickBooksSettings;
};

export const QUICKBOOKS_ITEM_MAPPING_OPTIONS: Array<{
  key: QuickBooksItemMappingKey;
  label: string;
  description: string;
  defaultLabel: string;
}> = [
  {
    key: "garment",
    label: "Garments & products",
    description: "Blank apparel and product line items on the order.",
    defaultLabel: "FloPilot Garments",
  },
  {
    key: "decoration",
    label: "Decoration & imprint",
    description: "Screen print, embroidery, DTF, and other event charges.",
    defaultLabel: "FloPilot Decoration",
  },
  {
    key: "fee",
    label: "Fees & setup",
    description: "Screen charges, setup fees, and similar add-ons.",
    defaultLabel: "FloPilot Fees",
  },
  {
    key: "default",
    label: "Everything else",
    description: "Fallback Product/Service when a line doesn’t match above.",
    defaultLabel: "FloPilot Services",
  },
];

export const EMPTY_ITEM_MAPPINGS: QuickBooksItemMappings = {
  garment: { id: null, name: null },
  decoration: { id: null, name: null },
  fee: { id: null, name: null },
  default: { id: null, name: null },
};

export function isQuickBooksConnected(integration?: AccountingIntegration | null) {
  return Boolean(
    integration &&
      integration.provider === "quickbooks" &&
      integration.status === "connected" &&
      integration.realmId
  );
}
