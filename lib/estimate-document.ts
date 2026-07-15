export type EstimateDocumentBlockId =
  | "header"
  | "shop_contact"
  | "bill_to"
  | "line_items"
  | "totals"
  | "terms";

export type EstimateLineItemSectionId =
  | "garments"
  | "decoration"
  | "setup"
  | "finishing"
  | "other";

/** How identity / parties are composed in the top of the PDF */
export type EstimateHeaderStyle =
  | "classic"
  | "branded"
  | "split_parties"
  | "compact";

export type EstimateDocumentBlockDef = {
  id: EstimateDocumentBlockId;
  label: string;
  description: string;
  removable: boolean;
};

export type EstimateLineItemSectionDef = {
  id: EstimateLineItemSectionId;
  label: string;
  description: string;
};

export type EstimateHeaderStyleDef = {
  id: EstimateHeaderStyle;
  label: string;
  description: string;
};

export type EstimateDocumentSettings = {
  templateId: string;
  headerStyle: EstimateHeaderStyle;
  blocks: EstimateDocumentBlockId[];
  lineItemSections: EstimateLineItemSectionId[];
  termsText: string;
  showPaidBalance: boolean;
};

export type EstimateDocumentTemplate = {
  id: string;
  name: string;
  description: string;
  document: EstimateDocumentSettings;
};

export const ESTIMATE_DOCUMENT_BLOCK_DEFS: EstimateDocumentBlockDef[] = [
  {
    id: "header",
    label: "Header",
    description: "Logo, estimate title, order number, and dates",
    removable: false,
  },
  {
    id: "shop_contact",
    label: "Shop contact",
    description: "Your shop name, address, email, and phone",
    removable: true,
  },
  {
    id: "bill_to",
    label: "Prepared for",
    description: "Customer company and contact details",
    removable: true,
  },
  {
    id: "line_items",
    label: "Line items",
    description: "Itemized garments, decoration, and fees",
    removable: false,
  },
  {
    id: "totals",
    label: "Totals",
    description: "Subtotal, tax, and grand total",
    removable: false,
  },
  {
    id: "terms",
    label: "Terms & notes",
    description: "Footer message shown on the estimate",
    removable: true,
  },
];

export const ESTIMATE_LINE_ITEM_SECTION_DEFS: EstimateLineItemSectionDef[] = [
  {
    id: "garments",
    label: "Garments",
    description: "Blank goods and apparel lines",
  },
  {
    id: "decoration",
    label: "Decoration",
    description: "Print, embroidery, and decoration charges",
  },
  {
    id: "setup",
    label: "Setup",
    description: "Screens, digitizing, and setup fees",
  },
  {
    id: "finishing",
    label: "Finishing",
    description: "Packing, tagging, and finishing fees",
  },
  {
    id: "other",
    label: "Other",
    description: "Miscellaneous fees and add-ons",
  },
];

export const ESTIMATE_HEADER_STYLE_DEFS: EstimateHeaderStyleDef[] = [
  {
    id: "classic",
    label: "Logo + meta",
    description: "Logo on the left, estimate details on the right",
  },
  {
    id: "branded",
    label: "Company in header",
    description: "Shop address and contact sit under your logo",
  },
  {
    id: "split_parties",
    label: "From / To columns",
    description: "Shop and customer side-by-side under the title",
  },
  {
    id: "compact",
    label: "Compact",
    description: "Tighter header with shop info next to the estimate number",
  },
];

export const DEFAULT_ESTIMATE_TERMS_TEXT =
  "Approve this estimate from the email we sent, or reply with any changes. Pricing is valid for 30 days.";

export const PRINT_SHOP_TERMS_TEXT =
  "This estimate is valid for 30 days and covers the items listed above. Artwork must be approved before production. Changes after approval may adjust pricing or timeline. A deposit may be required to begin. Balance is due on pickup or shipment unless other terms are agreed in writing.";

export const MINIMAL_TERMS_TEXT =
  "Estimate valid for 14 days. Reply to approve or request changes.";

export const DEFAULT_ESTIMATE_DOCUMENT_BLOCKS: EstimateDocumentBlockId[] =
  ESTIMATE_DOCUMENT_BLOCK_DEFS.map((def) => def.id);

export const DEFAULT_ESTIMATE_LINE_ITEM_SECTIONS: EstimateLineItemSectionId[] =
  ESTIMATE_LINE_ITEM_SECTION_DEFS.map((def) => def.id);

const BLOCK_IDS = new Set(
  ESTIMATE_DOCUMENT_BLOCK_DEFS.map((def) => def.id)
);
const LINE_IDS = new Set(
  ESTIMATE_LINE_ITEM_SECTION_DEFS.map((def) => def.id)
);
const HEADER_STYLES = new Set(
  ESTIMATE_HEADER_STYLE_DEFS.map((def) => def.id)
);
const REQUIRED_BLOCKS = new Set(
  ESTIMATE_DOCUMENT_BLOCK_DEFS.filter((def) => !def.removable).map(
    (def) => def.id
  )
);

function uniqueValidIds<T extends string>(
  input: Array<T | string> | null | undefined,
  allowed: Set<string>
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const raw of input || []) {
    const id = String(raw || "").trim();
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id as T);
  }
  return result;
}

export function normalizeEstimateDocumentBlocks(
  input?: Array<EstimateDocumentBlockId | string> | null
): EstimateDocumentBlockId[] {
  const normalized = uniqueValidIds<EstimateDocumentBlockId>(
    input,
    BLOCK_IDS
  );
  const result =
    normalized.length > 0
      ? [...normalized]
      : [...DEFAULT_ESTIMATE_DOCUMENT_BLOCKS];

  for (const required of REQUIRED_BLOCKS) {
    if (!result.includes(required)) {
      const defaultIndex = DEFAULT_ESTIMATE_DOCUMENT_BLOCKS.indexOf(required);
      const insertAt = Math.min(Math.max(defaultIndex, 0), result.length);
      result.splice(insertAt, 0, required);
    }
  }

  const withoutHeader = result.filter((id) => id !== "header");
  return ["header", ...withoutHeader];
}

export function normalizeEstimateLineItemSections(
  input?: Array<EstimateLineItemSectionId | string> | null
): EstimateLineItemSectionId[] {
  const normalized = uniqueValidIds<EstimateLineItemSectionId>(
    input,
    LINE_IDS
  );
  return normalized.length > 0
    ? normalized
    : [...DEFAULT_ESTIMATE_LINE_ITEM_SECTIONS];
}

export function normalizeEstimateHeaderStyle(
  value?: string | null
): EstimateHeaderStyle {
  return HEADER_STYLES.has(value as EstimateHeaderStyle)
    ? (value as EstimateHeaderStyle)
    : "classic";
}

export function normalizeEstimateDocument(
  input?: Partial<EstimateDocumentSettings> | null
): EstimateDocumentSettings {
  const raw = input && typeof input === "object" ? input : {};
  const termsText =
    typeof raw.termsText === "string" && raw.termsText.trim()
      ? raw.termsText.trim().slice(0, 2000)
      : DEFAULT_ESTIMATE_TERMS_TEXT;
  const templateId =
    typeof raw.templateId === "string" && raw.templateId.trim()
      ? raw.templateId.trim().slice(0, 64)
      : "classic";

  return {
    templateId,
    headerStyle: normalizeEstimateHeaderStyle(raw.headerStyle),
    blocks: normalizeEstimateDocumentBlocks(raw.blocks),
    lineItemSections: normalizeEstimateLineItemSections(raw.lineItemSections),
    termsText,
    showPaidBalance: raw.showPaidBalance !== false,
  };
}

export const ESTIMATE_DOCUMENT_TEMPLATES: EstimateDocumentTemplate[] = [
  {
    id: "classic",
    name: "Classic",
    description:
      "Logo and estimate details up top, shop contact and customer below — the familiar invoice layout.",
    document: normalizeEstimateDocument({
      templateId: "classic",
      headerStyle: "classic",
      blocks: [
        "header",
        "shop_contact",
        "bill_to",
        "line_items",
        "totals",
        "terms",
      ],
      lineItemSections: [...DEFAULT_ESTIMATE_LINE_ITEM_SECTIONS],
      termsText: DEFAULT_ESTIMATE_TERMS_TEXT,
      showPaidBalance: true,
    }),
  },
  {
    id: "branded_header",
    name: "Branded header",
    description:
      "Company address and contact live under your logo in the header — clean and brand-forward.",
    document: normalizeEstimateDocument({
      templateId: "branded_header",
      headerStyle: "branded",
      blocks: ["header", "bill_to", "line_items", "totals", "terms"],
      lineItemSections: [...DEFAULT_ESTIMATE_LINE_ITEM_SECTIONS],
      termsText: DEFAULT_ESTIMATE_TERMS_TEXT,
      showPaidBalance: true,
    }),
  },
  {
    id: "split_parties",
    name: "From / To columns",
    description:
      "Shop and customer sit side-by-side under the title — common on professional quotes.",
    document: normalizeEstimateDocument({
      templateId: "split_parties",
      headerStyle: "split_parties",
      blocks: ["header", "line_items", "totals", "terms"],
      lineItemSections: [...DEFAULT_ESTIMATE_LINE_ITEM_SECTIONS],
      termsText: DEFAULT_ESTIMATE_TERMS_TEXT,
      showPaidBalance: true,
    }),
  },
  {
    id: "compact",
    name: "Compact",
    description:
      "Tighter header with shop info beside the estimate number — more room for line items.",
    document: normalizeEstimateDocument({
      templateId: "compact",
      headerStyle: "compact",
      blocks: ["header", "bill_to", "line_items", "totals", "terms"],
      lineItemSections: [...DEFAULT_ESTIMATE_LINE_ITEM_SECTIONS],
      termsText: MINIMAL_TERMS_TEXT,
      showPaidBalance: false,
    }),
  },
  {
    id: "print_shop",
    name: "Print shop detailed",
    description:
      "Branded header plus full fee breakdown and production-minded terms for apparel/print work.",
    document: normalizeEstimateDocument({
      templateId: "print_shop",
      headerStyle: "branded",
      blocks: ["header", "bill_to", "line_items", "totals", "terms"],
      lineItemSections: [...DEFAULT_ESTIMATE_LINE_ITEM_SECTIONS],
      termsText: PRINT_SHOP_TERMS_TEXT,
      showPaidBalance: true,
    }),
  },
  {
    id: "minimal",
    name: "Minimal",
    description:
      "Just the essentials — header, pricing table, total, and a short validity note.",
    document: normalizeEstimateDocument({
      templateId: "minimal",
      headerStyle: "classic",
      blocks: ["header", "line_items", "totals", "terms"],
      lineItemSections: ["garments", "decoration", "other"],
      termsText: MINIMAL_TERMS_TEXT,
      showPaidBalance: false,
    }),
  },
];

export const DEFAULT_ESTIMATE_DOCUMENT = normalizeEstimateDocument(
  ESTIMATE_DOCUMENT_TEMPLATES[0]?.document
);

export function getEstimateDocumentTemplate(
  templateId: string
): EstimateDocumentTemplate {
  return (
    ESTIMATE_DOCUMENT_TEMPLATES.find((entry) => entry.id === templateId) ||
    ESTIMATE_DOCUMENT_TEMPLATES[0]
  );
}

export function applyEstimateDocumentTemplate(
  templateId: string
): EstimateDocumentSettings {
  return normalizeEstimateDocument(
    getEstimateDocumentTemplate(templateId).document
  );
}

/** Standalone blocks already drawn inside the header for this style. */
export function isBlockAbsorbedByHeader(
  blockId: EstimateDocumentBlockId,
  headerStyle: EstimateHeaderStyle
): boolean {
  if (headerStyle === "branded" || headerStyle === "compact") {
    return blockId === "shop_contact";
  }
  if (headerStyle === "split_parties") {
    return blockId === "shop_contact" || blockId === "bill_to";
  }
  return false;
}

export function missingEstimateDocumentBlocks(
  blocks: EstimateDocumentBlockId[],
  headerStyle: EstimateHeaderStyle = "classic"
): EstimateDocumentBlockDef[] {
  const present = new Set(blocks);
  return ESTIMATE_DOCUMENT_BLOCK_DEFS.filter(
    (def) =>
      def.removable &&
      !present.has(def.id) &&
      !isBlockAbsorbedByHeader(def.id, headerStyle)
  );
}

export function missingEstimateLineItemSections(
  sections: EstimateLineItemSectionId[]
): EstimateLineItemSectionDef[] {
  const present = new Set(sections);
  return ESTIMATE_LINE_ITEM_SECTION_DEFS.filter((def) => !present.has(def.id));
}

export function getEstimateDocumentBlockDef(
  id: EstimateDocumentBlockId
): EstimateDocumentBlockDef | undefined {
  return ESTIMATE_DOCUMENT_BLOCK_DEFS.find((def) => def.id === id);
}

export function getEstimateLineItemSectionDef(
  id: EstimateLineItemSectionId
): EstimateLineItemSectionDef | undefined {
  return ESTIMATE_LINE_ITEM_SECTION_DEFS.find((def) => def.id === id);
}
