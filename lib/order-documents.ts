import type { LucideIcon } from "lucide-react";
import { FileSpreadsheet, FileText, LayoutGrid, Receipt } from "lucide-react";

export const DOCUMENTS_BASE = "/app/documents";

export const DOCUMENT_SLUGS = ["estimates", "invoices"] as const;

export type DocumentSlug = (typeof DOCUMENT_SLUGS)[number];

export type DocumentDefinition = {
  slug: DocumentSlug | "overview";
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  href: string;
};

export const DOCUMENT_DEFINITIONS: DocumentDefinition[] = [
  {
    slug: "overview",
    label: "Overview",
    shortLabel: "Overview",
    description: "All billing documents at a glance — estimates and invoices.",
    icon: LayoutGrid,
    href: DOCUMENTS_BASE,
  },
  {
    slug: "estimates",
    label: "Estimates",
    shortLabel: "Estimates",
    description: "Quotes waiting to send, under review, or approved.",
    icon: FileText,
    href: `${DOCUMENTS_BASE}/estimates`,
  },
  {
    slug: "invoices",
    label: "Invoices",
    shortLabel: "Invoices",
    description: "Ready to bill, sent, and unpaid invoices.",
    icon: Receipt,
    href: `${DOCUMENTS_BASE}/invoices`,
  },
];

/** Nav children exclude overview (parent href covers it). */
export const DOCUMENT_NAV_CHILDREN = DOCUMENT_DEFINITIONS.filter(
  (entry) => entry.slug !== "overview"
);

export function getDocumentDefinition(
  slug: string
): DocumentDefinition | undefined {
  return DOCUMENT_DEFINITIONS.find((entry) => entry.slug === slug);
}

export function isDocumentSlug(value: string): value is DocumentSlug {
  return DOCUMENT_SLUGS.includes(value as DocumentSlug);
}

export function isDocumentsSection(pathname: string): boolean {
  return (
    pathname === DOCUMENTS_BASE || pathname.startsWith(`${DOCUMENTS_BASE}/`)
  );
}

export function activeDocumentSlug(
  pathname: string
): DocumentSlug | "overview" | null {
  if (!isDocumentsSection(pathname)) return null;
  if (pathname === DOCUMENTS_BASE) return "overview";
  const segment = pathname.slice(DOCUMENTS_BASE.length + 1).split("/")[0];
  if (segment && isDocumentSlug(segment)) return segment;
  return null;
}

export const DOCUMENTS_NAV_ICON = FileSpreadsheet;
