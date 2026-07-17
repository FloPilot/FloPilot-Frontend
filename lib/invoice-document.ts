/**
 * Invoice document layout — same structure as estimates, with invoice defaults.
 */
import {
  ESTIMATE_DOCUMENT_BLOCK_DEFS,
  ESTIMATE_DOCUMENT_TEMPLATES,
  ESTIMATE_HEADER_STYLE_DEFS,
  ESTIMATE_LINE_ITEM_SECTION_DEFS,
  getEstimateDocumentBlockDef,
  getEstimateLineItemSectionDef,
  isBlockAbsorbedByHeader,
  missingEstimateDocumentBlocks,
  missingEstimateLineItemSections,
  normalizeEstimateDocument,
  normalizeEstimateDocumentBlocks,
  normalizeEstimateHeaderStyle,
  normalizeEstimateLineItemSections,
  type EstimateDocumentBlockId,
  type EstimateDocumentSettings,
  type EstimateDocumentTemplate,
  type EstimateHeaderStyle,
  type EstimateLineItemSectionId,
} from "@/lib/estimate-document";

export type InvoiceDocumentBlockId = EstimateDocumentBlockId;
export type InvoiceLineItemSectionId = EstimateLineItemSectionId;
export type InvoiceHeaderStyle = EstimateHeaderStyle;
export type InvoiceDocumentSettings = EstimateDocumentSettings;
export type InvoiceDocumentTemplate = EstimateDocumentTemplate;

export const INVOICE_DOCUMENT_BLOCK_DEFS = ESTIMATE_DOCUMENT_BLOCK_DEFS.map(
  (def) =>
    def.id === "header"
      ? {
          ...def,
          description:
            "Logo, invoice title, order number, estimate reference, and dates",
        }
      : def.id === "terms"
        ? {
            ...def,
            description: "Payment terms and footer message on the invoice",
          }
        : def
);

export const INVOICE_LINE_ITEM_SECTION_DEFS = ESTIMATE_LINE_ITEM_SECTION_DEFS;
export const INVOICE_HEADER_STYLE_DEFS = ESTIMATE_HEADER_STYLE_DEFS.map(
  (def) => ({
    ...def,
    description: def.description.replace(/estimate/gi, "invoice"),
  })
);

export const DEFAULT_INVOICE_TERMS_TEXT =
  "Payment is due upon receipt unless other terms are agreed in writing. Thank you for your business.";

export const PRINT_SHOP_INVOICE_TERMS_TEXT =
  "Payment is due on pickup or shipment unless other terms are agreed in writing. This invoice reflects quantities produced for this order. Questions about this bill? Reply to this email and we will help right away.";

export const MINIMAL_INVOICE_TERMS_TEXT =
  "Payment due upon receipt. Thank you for your business.";

export function normalizeInvoiceDocument(
  input?: Partial<InvoiceDocumentSettings> | null
): InvoiceDocumentSettings {
  const raw = input && typeof input === "object" ? input : {};
  const hasTerms =
    typeof raw.termsText === "string" && raw.termsText.trim().length > 0;

  return normalizeEstimateDocument({
    ...raw,
    termsText: hasTerms ? raw.termsText : DEFAULT_INVOICE_TERMS_TEXT,
  });
}

export const INVOICE_DOCUMENT_TEMPLATES: InvoiceDocumentTemplate[] =
  ESTIMATE_DOCUMENT_TEMPLATES.map((template) => {
    const termsByTemplate: Record<string, string> = {
      classic: DEFAULT_INVOICE_TERMS_TEXT,
      branded_header: DEFAULT_INVOICE_TERMS_TEXT,
      split_parties: DEFAULT_INVOICE_TERMS_TEXT,
      compact: MINIMAL_INVOICE_TERMS_TEXT,
      print_shop: PRINT_SHOP_INVOICE_TERMS_TEXT,
      minimal: MINIMAL_INVOICE_TERMS_TEXT,
    };
    return {
      ...template,
      description: template.description
        .replace(/estimate/gi, "invoice")
        .replace(/quote/gi, "invoice"),
      document: normalizeInvoiceDocument({
        ...template.document,
        termsText:
          termsByTemplate[template.id] || DEFAULT_INVOICE_TERMS_TEXT,
      }),
    };
  });

export function getInvoiceDocumentTemplate(templateId: string) {
  return (
    INVOICE_DOCUMENT_TEMPLATES.find((entry) => entry.id === templateId) ||
    INVOICE_DOCUMENT_TEMPLATES[0]
  );
}

export function applyInvoiceDocumentTemplate(
  templateId: string
): InvoiceDocumentSettings {
  return normalizeInvoiceDocument(
    getInvoiceDocumentTemplate(templateId).document
  );
}

export const DEFAULT_INVOICE_DOCUMENT = applyInvoiceDocumentTemplate("classic");

export const getInvoiceDocumentBlockDef = getEstimateDocumentBlockDef;
export const getInvoiceLineItemSectionDef = getEstimateLineItemSectionDef;
export const missingInvoiceDocumentBlocks = missingEstimateDocumentBlocks;
export const missingInvoiceLineItemSections = missingEstimateLineItemSections;
export const normalizeInvoiceDocumentBlocks = normalizeEstimateDocumentBlocks;
export const normalizeInvoiceHeaderStyle = normalizeEstimateHeaderStyle;
export const normalizeInvoiceLineItemSections =
  normalizeEstimateLineItemSections;

export { isBlockAbsorbedByHeader };
