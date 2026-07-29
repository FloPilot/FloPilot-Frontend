import type { OrderRequestDraft } from "@/lib/order-requests";

export type PortalWizardLocalDraft = {
  version: 1;
  updatedAt: string;
  draftId?: string | null;
  step: string;
  draft: OrderRequestDraft;
};

const STORAGE_PREFIX = "portal-order-request-draft:";

export function portalWizardStorageKey(scope: string) {
  return `${STORAGE_PREFIX}${scope || "anon"}`;
}

export function readPortalWizardLocalDraft(
  scope: string
): PortalWizardLocalDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(portalWizardStorageKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PortalWizardLocalDraft;
    if (!parsed?.draft || typeof parsed.draft !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePortalWizardLocalDraft(
  scope: string,
  value: Omit<PortalWizardLocalDraft, "version" | "updatedAt">
) {
  if (typeof window === "undefined") return;
  const payload: PortalWizardLocalDraft = {
    version: 1,
    updatedAt: new Date().toISOString(),
    draftId: value.draftId || null,
    step: value.step,
    draft: value.draft,
  };
  window.localStorage.setItem(
    portalWizardStorageKey(scope),
    JSON.stringify(payload)
  );
}

export function clearPortalWizardLocalDraft(scope: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(portalWizardStorageKey(scope));
}

export function draftHasMeaningfulContent(draft: OrderRequestDraft) {
  if (draft.lineItems.length > 0) return true;
  if (draft.events.length > 0) return true;
  if (draft.customLabel.trim()) return true;
  if (draft.notes.trim()) return true;
  if (draft.vendorPurchaseOrder) return true;
  if ((draft.estimateAdjustments || []).length > 0) return true;
  if ((draft.linkedRequestIds || []).length > 0) return true;
  if (draft.subCustomerId || draft.newEndBusinessName.trim()) return true;
  return false;
}
