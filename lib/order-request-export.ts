export type OrderRequestExportSectionId =
  | "summary"
  | "garments"
  | "decorations"
  | "artwork"
  | "pricing"
  | "notes"
  | "vendor_po";

export type OrderRequestExportSectionDef = {
  id: OrderRequestExportSectionId;
  label: string;
  description: string;
};

export type OrderRequestExportReferencePdf = {
  fileName: string;
  contentType: string;
  fileUrl: string;
  uploadedAt?: string | null;
};

export type OrderRequestExportLayoutProfile = {
  documentKind: "tech_pack" | "purchase_order" | "simple_record";
  theme: "dark" | "light";
  backgroundColor: string;
  textColor: string;
  mutedTextColor: string;
  accentColor: string;
  headerBarColor: string;
  title: string;
  showLogo: boolean;
  showCompanyName: boolean;
  showContactBlock: boolean;
  showForLabel: boolean;
  showPoNumber: boolean;
  showDate: boolean;
  tableColumns: Array<"description" | "quantity" | "rate" | "amount">;
  rowMode: "per_size" | "grouped";
  includeDecorationNotesInDescription: boolean;
  notesAsZeroAmountRows: boolean;
  showSubtotal: boolean;
  showTotal: boolean;
};

export type OrderRequestExportSettings = {
  title: string;
  sections: OrderRequestExportSectionId[];
  footerText: string;
  includeShopName: boolean;
  referencePdf: OrderRequestExportReferencePdf | null;
  mapNotes: string;
  layoutProfile: OrderRequestExportLayoutProfile;
};

export const ORDER_REQUEST_EXPORT_SECTION_DEFS: OrderRequestExportSectionDef[] =
  [
    {
      id: "summary",
      label: "Request summary",
      description: "Request #, order name, dates, end business",
    },
    {
      id: "garments",
      label: "Garments / blanks",
      description: "Styles, colors, and size quantities",
    },
    {
      id: "decorations",
      label: "Decorations",
      description: "Locations, decoration type, PMS colors, placement",
    },
    {
      id: "artwork",
      label: "Artwork / mockups",
      description: "Front/back mockups embedded in the tech pack",
    },
    {
      id: "pricing",
      label: "Pricing estimate",
      description: "Current estimate total from your rate sheet",
    },
    {
      id: "notes",
      label: "Notes",
      description: "Customer notes on the request",
    },
    {
      id: "vendor_po",
      label: "Vendor purchase order",
      description: "Vendor name and PO # when blanks are customer-supplied",
    },
  ];

export const DEFAULT_ORDER_REQUEST_EXPORT_SECTIONS: OrderRequestExportSectionId[] =
  ["summary", "garments", "decorations", "artwork", "pricing", "notes"];

export function createDefaultLayoutProfile(): OrderRequestExportLayoutProfile {
  return {
    documentKind: "tech_pack",
    theme: "light",
    backgroundColor: "#ffffff",
    textColor: "#1f2430",
    mutedTextColor: "#6b7280",
    accentColor: "#2762ff",
    headerBarColor: "#2762ff",
    title: "Order Request",
    showLogo: true,
    showCompanyName: true,
    showContactBlock: false,
    showForLabel: true,
    showPoNumber: true,
    showDate: true,
    tableColumns: ["description", "quantity", "rate", "amount"],
    rowMode: "per_size",
    includeDecorationNotesInDescription: true,
    notesAsZeroAmountRows: false,
    showSubtotal: true,
    showTotal: true,
  };
}

export function createDefaultOrderRequestExport(): OrderRequestExportSettings {
  return {
    title: "Order Request",
    sections: [...DEFAULT_ORDER_REQUEST_EXPORT_SECTIONS],
    footerText: "",
    includeShopName: true,
    referencePdf: null,
    mapNotes: "",
    layoutProfile: createDefaultLayoutProfile(),
  };
}

export function normalizeOrderRequestExport(
  raw: Partial<OrderRequestExportSettings> | null | undefined
): OrderRequestExportSettings {
  const defaults = createDefaultOrderRequestExport();
  if (!raw || typeof raw !== "object") return defaults;

  const validIds = new Set(
    ORDER_REQUEST_EXPORT_SECTION_DEFS.map((row) => row.id)
  );
  const sections = Array.isArray(raw.sections)
    ? (raw.sections.filter((id): id is OrderRequestExportSectionId =>
        validIds.has(id as OrderRequestExportSectionId)
      ) as OrderRequestExportSectionId[])
    : defaults.sections;

  const referencePdf =
    raw.referencePdf &&
    typeof raw.referencePdf === "object" &&
    typeof raw.referencePdf.fileUrl === "string" &&
    raw.referencePdf.fileUrl.trim()
      ? {
          fileName: String(raw.referencePdf.fileName || "template.pdf").slice(
            0,
            180
          ),
          contentType: String(
            raw.referencePdf.contentType || "application/pdf"
          ).slice(0, 120),
          fileUrl: raw.referencePdf.fileUrl.trim().slice(0, 2000),
          uploadedAt: raw.referencePdf.uploadedAt || null,
        }
      : null;

  const incomingKind = raw.layoutProfile?.documentKind;
  const documentKind =
    incomingKind === "simple_record"
      ? "simple_record"
      : incomingKind === "purchase_order" && raw.layoutProfile?.theme === "light"
        ? "purchase_order"
        : "tech_pack";

  return {
    title:
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title.trim().slice(0, 120)
        : defaults.title,
    sections: sections.length > 0 ? sections : defaults.sections,
    footerText:
      typeof raw.footerText === "string"
        ? raw.footerText.trim().slice(0, 500)
        : defaults.footerText,
    includeShopName:
      raw.includeShopName === undefined
        ? defaults.includeShopName
        : Boolean(raw.includeShopName),
    referencePdf,
    mapNotes:
      typeof raw.mapNotes === "string"
        ? raw.mapNotes.trim().slice(0, 2000)
        : "",
    layoutProfile: {
      ...createDefaultLayoutProfile(),
      ...(raw.layoutProfile || {}),
      documentKind,
      theme: documentKind === "tech_pack" ? "light" : raw.layoutProfile?.theme || "light",
    },
  };
}
