import type { Customer, Order, ScheduleBlock } from "@/types";

export type WorkspaceSalesRepMode = "all" | "me" | "unassigned" | "member";

export type WorkspaceSalesRepFilter =
  | { mode: "all" }
  | { mode: "me" }
  | { mode: "unassigned" }
  | { mode: "member"; memberId: string; memberName?: string };

export type WorkspaceScope = {
  salesRep: WorkspaceSalesRepFilter;
  customerId: string | null;
  customerName?: string | null;
};

export type WorkspaceScopePreset = {
  id: string;
  name: string;
  scope: WorkspaceScope;
  createdAt: string;
};

export const DEFAULT_WORKSPACE_SCOPE: WorkspaceScope = {
  salesRep: { mode: "all" },
  customerId: null,
  customerName: null,
};

const STORAGE_SCOPE_PREFIX = "flopilot.workspaceScope.v1";
const STORAGE_PRESETS_PREFIX = "flopilot.workspaceScopePresets.v1";
const MAX_PRESETS = 12;

function storageKey(prefix: string, tenantId: string, userId: string) {
  return `${prefix}:${tenantId}:${userId}`;
}

export function normalizeWorkspaceScope(input?: unknown): WorkspaceScope {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_WORKSPACE_SCOPE };
  }

  const raw = input as Record<string, unknown>;
  const salesRepRaw = raw.salesRep;
  let salesRep: WorkspaceSalesRepFilter = { mode: "all" };

  if (salesRepRaw && typeof salesRepRaw === "object") {
    const mode = (salesRepRaw as { mode?: unknown }).mode;
    if (mode === "me" || mode === "unassigned" || mode === "all") {
      salesRep = { mode };
    } else if (mode === "member") {
      const memberId = String(
        (salesRepRaw as { memberId?: unknown }).memberId ?? ""
      ).trim();
      if (memberId) {
        const memberName = String(
          (salesRepRaw as { memberName?: unknown }).memberName ?? ""
        ).trim();
        salesRep = {
          mode: "member",
          memberId,
          memberName: memberName || undefined,
        };
      }
    }
  }

  const customerIdRaw = raw.customerId;
  const customerId =
    typeof customerIdRaw === "string" && customerIdRaw.trim()
      ? customerIdRaw.trim()
      : null;
  const customerNameRaw = raw.customerName;
  const customerName =
    typeof customerNameRaw === "string" && customerNameRaw.trim()
      ? customerNameRaw.trim()
      : null;

  return {
    salesRep,
    customerId,
    customerName,
  };
}

export function workspaceScopeIsActive(scope: WorkspaceScope) {
  return (
    scope.salesRep.mode !== "all" || Boolean(scope.customerId)
  );
}

export function scopesEqual(a: WorkspaceScope, b: WorkspaceScope) {
  if (a.customerId !== b.customerId) return false;
  if (a.salesRep.mode !== b.salesRep.mode) return false;
  if (a.salesRep.mode === "member" && b.salesRep.mode === "member") {
    return a.salesRep.memberId === b.salesRep.memberId;
  }
  return true;
}

export function describeWorkspaceScope(scope: WorkspaceScope): {
  salesRepLabel: string;
  customerLabel: string;
  summary: string;
} {
  let salesRepLabel = "All team";
  if (scope.salesRep.mode === "me") salesRepLabel = "My work";
  else if (scope.salesRep.mode === "unassigned") salesRepLabel = "Unassigned";
  else if (scope.salesRep.mode === "member") {
    salesRepLabel = scope.salesRep.memberName?.trim() || "Team member";
  }

  const customerLabel = scope.customerId
    ? scope.customerName?.trim() || "1 customer"
    : "All customers";

  const summary =
    scope.salesRep.mode === "all" && !scope.customerId
      ? "Viewing everything"
      : `Viewing · ${salesRepLabel} · ${customerLabel}`;

  return { salesRepLabel, customerLabel, summary };
}

function matchesSalesRep(
  salesRepId: string | null | undefined,
  filter: WorkspaceSalesRepFilter,
  currentUserId: string | null | undefined
): boolean {
  if (filter.mode === "all") return true;
  const id = salesRepId?.trim() || "";
  if (filter.mode === "unassigned") return !id;
  if (filter.mode === "me") {
    if (!currentUserId) return false;
    return id === currentUserId;
  }
  return id === filter.memberId;
}

export function orderMatchesWorkspaceScope(
  order: Pick<Order, "salesRepId" | "customerId">,
  scope: WorkspaceScope,
  currentUserId?: string | null
): boolean {
  if (!matchesSalesRep(order.salesRepId, scope.salesRep, currentUserId)) {
    return false;
  }
  if (scope.customerId && order.customerId !== scope.customerId) {
    return false;
  }
  return true;
}

export function customerMatchesWorkspaceScope(
  customer: Pick<Customer, "id" | "salesRepId">,
  scope: WorkspaceScope,
  currentUserId?: string | null
): boolean {
  if (scope.customerId && customer.id !== scope.customerId) {
    return false;
  }
  if (!matchesSalesRep(customer.salesRepId, scope.salesRep, currentUserId)) {
    return false;
  }
  return true;
}

export function applyWorkspaceScopeToOrders(
  orders: Order[],
  scope: WorkspaceScope,
  currentUserId?: string | null
): Order[] {
  if (!workspaceScopeIsActive(scope)) return orders;
  return orders.filter((order) =>
    orderMatchesWorkspaceScope(order, scope, currentUserId)
  );
}

export function applyWorkspaceScopeToCustomers(
  customers: Customer[],
  scope: WorkspaceScope,
  currentUserId?: string | null
): Customer[] {
  if (!workspaceScopeIsActive(scope)) return customers;
  return customers.filter((customer) =>
    customerMatchesWorkspaceScope(customer, scope, currentUserId)
  );
}

export function applyWorkspaceScopeToScheduleBlocks(
  blocks: ScheduleBlock[],
  orders: Order[],
  scope: WorkspaceScope,
  currentUserId?: string | null
): ScheduleBlock[] {
  if (!workspaceScopeIsActive(scope)) return blocks;
  const allowed = new Set(
    applyWorkspaceScopeToOrders(orders, scope, currentUserId).map((o) => o.id)
  );
  return blocks.filter((block) => allowed.has(block.orderId));
}

export function loadWorkspaceScope(
  tenantId: string,
  userId: string
): WorkspaceScope {
  if (typeof window === "undefined") return { ...DEFAULT_WORKSPACE_SCOPE };
  try {
    const raw = window.localStorage.getItem(
      storageKey(STORAGE_SCOPE_PREFIX, tenantId, userId)
    );
    if (!raw) return { ...DEFAULT_WORKSPACE_SCOPE };
    return normalizeWorkspaceScope(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_WORKSPACE_SCOPE };
  }
}

export function persistWorkspaceScope(
  tenantId: string,
  userId: string,
  scope: WorkspaceScope
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(STORAGE_SCOPE_PREFIX, tenantId, userId),
      JSON.stringify(normalizeWorkspaceScope(scope))
    );
  } catch {
    // ignore quota / private mode
  }
}

export function loadWorkspaceScopePresets(
  tenantId: string,
  userId: string
): WorkspaceScopePreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(
      storageKey(STORAGE_PRESETS_PREFIX, tenantId, userId)
    );
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const id = String((entry as { id?: unknown }).id ?? "").trim();
        const name = String((entry as { name?: unknown }).name ?? "")
          .trim()
          .slice(0, 80);
        if (!id || !name) return null;
        return {
          id,
          name,
          scope: normalizeWorkspaceScope((entry as { scope?: unknown }).scope),
          createdAt:
            String((entry as { createdAt?: unknown }).createdAt ?? "") ||
            new Date().toISOString(),
        } satisfies WorkspaceScopePreset;
      })
      .filter((entry): entry is WorkspaceScopePreset => Boolean(entry))
      .slice(0, MAX_PRESETS);
  } catch {
    return [];
  }
}

export function persistWorkspaceScopePresets(
  tenantId: string,
  userId: string,
  presets: WorkspaceScopePreset[]
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(STORAGE_PRESETS_PREFIX, tenantId, userId),
      JSON.stringify(presets.slice(0, MAX_PRESETS))
    );
  } catch {
    // ignore
  }
}

export function createWorkspaceScopePresetId() {
  return `wsp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
