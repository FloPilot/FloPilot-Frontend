import type {
  Customer,
  CustomerContact,
  CustomerFile,
  CustomerNote,
  CustomerNegotiatedPricing,
  CustomerShippingLocation,
  CustomerTaxDocument,
  SubCustomer,
} from "@/types";
import { createCustomerNoteId, resolveCustomerAccountNotes } from "@/lib/customer-notes";

/** Inline small images in Firestore; larger files go to the storage bucket. */
export const CUSTOMER_INLINE_FILE_MAX_BYTES = 200 * 1024;

export type CustomerPendingUpload = {
  localId: string;
  name: string;
  contentBase64: string;
  contentType: string;
  size: number;
  /** data URL preview when available */
  previewUrl?: string;
  /** Prefer inline data URL storage when under the size threshold and image/* */
  preferInline: boolean;
};

export type CustomerPageDraft = {
  salesRepId: string | null;
  taxExempt: boolean;
  taxExemptNumber: string;
  /** Existing + staged tax docs (pending uploads use localId as id) */
  taxDocuments: Array<CustomerTaxDocument | (CustomerPendingUpload & { kind: "sales_certificate" | "supporting"; pending: true })>;
  contacts: CustomerContact[];
  accountNotes: CustomerNote[];
  shippingLocations: CustomerShippingLocation[];
  subCustomers: SubCustomer[];
  negotiatedPricing: CustomerNegotiatedPricing | undefined;
  files: Array<
    | CustomerFile
    | (CustomerPendingUpload & { kind: "supporting"; pending: true })
  >;
  removedTaxDocumentIds: string[];
  removedFileIds: string[];
};

export function createPendingUploadId() {
  return `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function customerToPageDraft(customer: Customer): CustomerPageDraft {
  return {
    salesRepId: customer.salesRepId ?? null,
    taxExempt: Boolean(customer.taxExempt),
    taxExemptNumber: customer.taxExemptNumber ?? "",
    taxDocuments: [...(customer.taxDocuments ?? [])],
    contacts: [...(customer.contacts ?? [])],
    accountNotes: resolveCustomerAccountNotes(customer).map((note) =>
      note.id === "legacy-notes"
        ? { ...note, id: createCustomerNoteId() }
        : { ...note }
    ),
    shippingLocations: [...(customer.shippingLocations ?? [])],
    subCustomers: [...(customer.subCustomers ?? [])],
    negotiatedPricing: customer.negotiatedPricing
      ? structuredClone(customer.negotiatedPricing)
      : undefined,
    files: [...(customer.files ?? [])],
    removedTaxDocumentIds: [],
    removedFileIds: [],
  };
}

export function serializeCustomerPageDraft(draft: CustomerPageDraft): string {
  return JSON.stringify({
    salesRepId: draft.salesRepId,
    taxExempt: draft.taxExempt,
    taxExemptNumber: draft.taxExemptNumber.trim(),
    taxDocuments: draft.taxDocuments.map((doc) =>
      isPendingCustomerUpload(doc)
        ? {
            pending: true,
            localId: doc.localId,
            name: doc.name,
            kind: doc.kind,
            size: doc.size,
            contentType: doc.contentType,
          }
        : {
            id: doc.id,
            name: doc.name,
            kind: doc.kind,
          }
    ),
    contacts: draft.contacts,
    accountNotes: draft.accountNotes.map((note) => ({
      id: note.id,
      content: note.content.trim(),
      priority: note.priority,
    })),
    shippingLocations: draft.shippingLocations,
    subCustomers: draft.subCustomers,
    negotiatedPricing: draft.negotiatedPricing ?? null,
    files: draft.files.map((doc) =>
      isPendingCustomerUpload(doc)
        ? {
            pending: true,
            localId: doc.localId,
            name: doc.name,
            size: doc.size,
            contentType: doc.contentType,
          }
        : {
            id: doc.id,
            name: doc.name,
            kind: doc.kind,
          }
    ),
    removedTaxDocumentIds: [...draft.removedTaxDocumentIds].sort(),
    removedFileIds: [...draft.removedFileIds].sort(),
  });
}

export function shouldPreferInlineCustomerFile(
  contentType: string,
  size: number
): boolean {
  return (
    contentType.startsWith("image/") && size <= CUSTOMER_INLINE_FILE_MAX_BYTES
  );
}

export function isPendingCustomerUpload(
  entry: unknown
): entry is CustomerPendingUpload & { pending: true; kind?: string } {
  return Boolean(
    entry &&
      typeof entry === "object" &&
      "pending" in entry &&
      (entry as { pending?: boolean }).pending === true
  );
}

export function customerFileHref(
  entry:
    | CustomerFile
    | CustomerTaxDocument
    | (CustomerPendingUpload & { pending?: boolean })
): string | undefined {
  if (isPendingCustomerUpload(entry)) {
    return entry.previewUrl;
  }
  const saved = entry as CustomerFile | CustomerTaxDocument;
  return saved.downloadUrl || saved.dataUrl || saved.previewUrl || undefined;
}
