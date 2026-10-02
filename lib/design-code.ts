import type { Order, SavedDesign } from "@/types";

/** Normalize a shop design code for storage / search (e.g. DC-1063). */
export function normalizeDesignCode(raw: string | null | undefined): string | null {
  const cleaned = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9._-]/g, "")
    .slice(0, 40);
  return cleaned || null;
}

/** Compact form for fuzzy search: DC-1063 → DC1063 */
export function designCodeSearchKey(raw: string | null | undefined): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * True when the query looks like / matches a design code.
 * Accepts "DC-1063", "dc 1063", "dc1063", or a trailing numeric fragment.
 */
export function matchesDesignCodeSearch(
  designCode: string | null | undefined,
  query: string | null | undefined
): boolean {
  const codeKey = designCodeSearchKey(designCode);
  const queryKey = designCodeSearchKey(query);
  if (!codeKey || !queryKey) return false;
  if (codeKey.includes(queryKey) || queryKey.includes(codeKey)) return true;

  const normalizedCode = normalizeDesignCode(designCode)?.toLowerCase() || "";
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedCode || !normalizedQuery) return false;
  return (
    normalizedCode.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedCode)
  );
}

/** Suggest a design code from the order number when none is set. */
export function suggestDesignCode(order: Pick<Order, "number">): string {
  const compact = String(order.number || "")
    .replace(/^SO-?/i, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 12);
  return compact ? `DC-${compact}` : "DC-NEW";
}

export function designCodeFromRecord(
  record: Pick<SavedDesign, "designCode"> | Pick<Order, "designCode"> | null | undefined
): string | null {
  if (!record) return null;
  return normalizeDesignCode(
    "designCode" in record ? record.designCode : null
  );
}
