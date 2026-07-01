import { supplierStyleRef } from "@/lib/supplier-integrations";
import type { PlatformTeamMember } from "@/lib/platform-team";
import type { NewCustomerInput } from "@/lib/customers";
import type { NewOrderFormInput } from "@/lib/create-order";
import type { ShopSettings } from "@/lib/shop-settings";
import type { StaffRole } from "@/lib/staff-roles";
import type { StaffAccess } from "@/lib/staff-access";
import type { SupportTicket } from "@/lib/support-tickets";
import type { Customer, DashboardStats, Order, StaffNotification } from "@/types";

export function getApiBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set in .env.local");
  }
  return base.replace(/\/$/, "");
}

export type ApiError = {
  error: string;
  code?: string;
};

export async function callApi<T>(
  functionName: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string | null;
    query?: Record<string, string | undefined>;
  } = {}
): Promise<T> {
  const { method = "GET", body, token, query } = options;
  const url = new URL(`${getApiBaseUrl()}/${functionName}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json();

  if (!res.ok) {
    const err = data as ApiError;
    throw new Error(err.error || `API error ${res.status}`);
  }

  return data as T;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export type MeResponse = (
  | {
      type: "staff";
      user: {
        id: string;
        name: string;
        email: string;
        role: StaffRole;
        access?: StaffAccess | null;
      };
      tenant: {
        id: string;
        name: string;
        slug: string;
        settings: ShopSettings;
      };
    }
  | {
      type: "none";
      needsRegistration: true;
      email: string;
      name?: string;
    }
) & {
  platformTeam?: PlatformTeamMember | null;
};

export async function fetchMe(token: string) {
  return callApi<MeResponse>("getMe", { token });
}

export type UserTenantSummary = {
  tenantId: string;
  userId: string;
  name: string;
  slug: string;
  logoUrl: string;
  role: StaffRole;
};

export async function listUserTenants(token: string) {
  return callApi<{ tenants: UserTenantSummary[] }>("listUserTenants", { token });
}

export async function switchTenant(token: string, tenantId: string) {
  return callApi<{
    user: {
      id: string;
      name: string;
      email: string;
      role: StaffRole;
      access?: StaffAccess | null;
    };
    tenant: {
      id: string;
      name: string;
      slug: string;
      settings: ShopSettings;
    };
    message: string;
  }>("switchTenant", { method: "POST", body: { tenantId }, token });
}

export async function fetchTenantSettings(token: string) {
  return callApi<{ settings: ShopSettings }>("getTenantSettings", { token });
}

export async function updateTenantSettings(
  token: string,
  patch: Partial<ShopSettings> & {
    modules?: Partial<ShopSettings["modules"]>;
    branding?: Partial<ShopSettings["branding"]>;
    onboarding?: Partial<ShopSettings["onboarding"]>;
  }
) {
  return callApi<{ settings: ShopSettings }>("updateTenantSettings", {
    method: "PATCH",
    body: patch,
    token,
  });
}

// ─── Supplier integrations ───────────────────────────────────────────────────

export async function fetchSupplierIntegrations(token: string) {
  return callApi<{ integrations: import("@/lib/supplier-integrations").SupplierIntegration[] }>(
    "getSupplierIntegrations",
    { token }
  );
}

export async function connectSsActivewearIntegration(
  token: string,
  payload: { accountNumber: string; apiKey: string }
) {
  return callApi<{ integration: import("@/lib/supplier-integrations").SupplierIntegration }>(
    "connectSsActivewearIntegration",
    {
      method: "POST",
      body: payload,
      token,
    }
  );
}

export async function disconnectSupplierIntegration(
  token: string,
  provider: import("@/lib/supplier-integrations").SupplierProviderId
) {
  return callApi<{ integration: import("@/lib/supplier-integrations").SupplierIntegration }>(
    "disconnectSupplierIntegration",
    {
      method: "POST",
      body: { provider },
      token,
    }
  );
}

export async function searchSupplierCatalog(
  token: string,
  query: string,
  options: {
    provider?: import("@/lib/supplier-integrations").SupplierProviderId;
    brand?: string;
    limit?: number;
  } = {}
) {
  const provider = options.provider ?? "ssActivewear";
  return callApi<{
    provider: string;
    query: string;
    brand: string | null;
    results: import("@/lib/supplier-integrations").SupplierStyleSummary[];
  }>("searchSupplierCatalog", {
    token,
    query: {
      provider,
      q: query,
      brand: options.brand || undefined,
      limit: options.limit != null ? String(options.limit) : undefined,
    },
  });
}

export async function fetchSupplierBrands(
  token: string,
  provider: import("@/lib/supplier-integrations").SupplierProviderId = "ssActivewear"
) {
  return callApi<{
    provider: string;
    brands: import("@/lib/supplier-integrations").SupplierBrand[];
  }>("listSupplierBrands", {
    token,
    query: { provider },
  });
}

export async function fetchSupplierStyleDetail(
  token: string,
  style: import("@/lib/supplier-integrations").SupplierStyleSummary,
  provider: import("@/lib/supplier-integrations").SupplierProviderId = "ssActivewear"
) {
  return callApi<{
    provider: string;
    style: import("@/lib/supplier-integrations").SupplierStyleDetail;
  }>("getSupplierStyleDetail", {
    token,
    query: {
      provider,
      styleRef: supplierStyleRef(style),
      styleId: style.styleId != null ? String(style.styleId) : undefined,
      brandName: style.brandName || undefined,
      styleName: style.styleName || undefined,
      partNumber: style.partNumber || undefined,
    },
  });
}

// ─── Team ───────────────────────────────────────────────────────────────────

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status?: "active" | "disabled";
  access?: StaffAccess | null;
  createdAt: string;
};

export type TeamInvite = {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  access?: StaffAccess | null;
  status: "pending" | "accepted" | "cancelled" | "expired";
  invitedByName?: string;
  expiresAt: string;
  createdAt: string;
};

export async function listTeamMembers(token: string) {
  return callApi<{ members: TeamMember[]; invites: TeamInvite[] }>(
    "listTeamMembers",
    { token }
  );
}

export async function inviteTeamMember(
  token: string,
  body: { email: string; name: string; role: StaffRole; access?: StaffAccess | null }
) {
  return callApi<{
    invite: TeamInvite;
    inviteUrl: string;
    email: { sent: boolean; dev?: boolean; message?: string; error?: string };
  }>("inviteTeamMember", { method: "POST", body, token });
}

export async function updateTeamMember(
  token: string,
  userId: string,
  body: { name?: string; role?: StaffRole; access?: StaffAccess | null }
) {
  return callApi<{ member: TeamMember }>("updateTeamMember", {
    method: "PATCH",
    body: { userId, ...body },
    token,
  });
}

export async function removeTeamMember(token: string, userId: string) {
  return callApi<{ ok: boolean }>("removeTeamMember", {
    method: "DELETE",
    query: { userId },
    token,
  });
}

export async function cancelTeamInvite(token: string, inviteId: string) {
  return callApi<{ ok: boolean }>("cancelTeamInvite", {
    method: "DELETE",
    query: { inviteId },
    token,
  });
}

export async function fetchTeamInvite(token: string) {
  return callApi<{
    email: string;
    name: string;
    role: StaffRole;
    roleLabel: string;
    shopName: string;
    expiresAt: string;
  }>("getTeamInvite", { query: { token } });
}

export async function acceptTeamInvite(
  firebaseToken: string,
  inviteToken: string
) {
  return callApi<{
    tenantId: string;
    user: TeamMember;
    tenant: { id: string; name: string; slug: string } | null;
    message: string;
  }>("acceptTeamInvite", {
    method: "POST",
    body: { token: inviteToken },
    token: firebaseToken,
  });
}

export async function registerShop(
  token: string,
  body: { shopName: string; slug?: string; adminName?: string }
) {
  return callApi<{ tenantId: string; tenant: unknown; user: unknown }>(
    "registerTenant",
    { method: "POST", body, token }
  );
}

// ─── Support / feedback tickets ─────────────────────────────────────────────

export type CreateSupportTicketInput = {
  title: string;
  description: string;
  category: SupportTicket["category"];
  priority?: SupportTicket["priority"];
  pageUrl?: string;
  attachmentUrl?: string;
  attachmentName?: string;
};

export async function createSupportTicket(
  token: string,
  body: CreateSupportTicketInput
) {
  return callApi<{ ticket: SupportTicket }>("createSupportTicket", {
    method: "POST",
    body,
    token,
  });
}

export async function listSupportTickets(token: string) {
  return callApi<{ tickets: SupportTicket[] }>("listSupportTickets", { token });
}

export async function listAllSupportTickets(token: string) {
  return callApi<{ tickets: SupportTicket[] }>("listAllSupportTickets", {
    token,
  });
}

export async function updateSupportTicket(
  token: string,
  ticketId: string,
  body: {
    status?: SupportTicket["status"];
    adminNote?: string;
    assignedToMemberId?: string | null;
  }
) {
  return callApi<{ ticket: SupportTicket }>("updateSupportTicket", {
    method: "PATCH",
    body: { ticketId, ...body },
    token,
  });
}

export async function listPlatformTeamMembers(token: string) {
  return callApi<{ members: PlatformTeamMember[] }>("listPlatformTeamMembers", {
    token,
  });
}

export async function createPlatformTeamMember(
  token: string,
  body: {
    email: string;
    name: string;
    role?: PlatformTeamMember["role"];
  }
) {
  return callApi<{ member: PlatformTeamMember }>("createPlatformTeamMember", {
    method: "POST",
    body,
    token,
  });
}

export async function updatePlatformTeamMember(
  token: string,
  memberId: string,
  body: {
    name?: string;
    role?: PlatformTeamMember["role"];
    status?: PlatformTeamMember["status"];
  }
) {
  return callApi<{ member: PlatformTeamMember }>("updatePlatformTeamMember", {
    method: "POST",
    body: { memberId, ...body },
    token,
  });
}

export async function removePlatformTeamMember(token: string, memberId: string) {
  return callApi<{ removed: boolean; id: string }>("removePlatformTeamMember", {
    method: "POST",
    body: { memberId },
    token,
  });
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export type DashboardStatsResponse = DashboardStats & {
  recentOrders?: Order[];
  generatedAt?: string;
};

export async function fetchDashboardStats(token: string) {
  return callApi<{ stats: DashboardStatsResponse }>("getDashboardStats", {
    token,
  });
}

// ─── Customers ──────────────────────────────────────────────────────────────

export async function listCustomers(token: string, search?: string) {
  return callApi<{ customers: Customer[] }>("listCustomers", {
    token,
    query: search ? { search } : undefined,
  });
}

export async function getCustomer(token: string, customerId: string) {
  return callApi<{ customer: Customer }>("getCustomer", {
    token,
    query: { customerId },
  });
}

export async function createCustomer(token: string, input: NewCustomerInput) {
  return callApi<{ customer: Customer }>("createCustomer", {
    method: "POST",
    body: input,
    token,
  });
}

export type CustomerUpdate = Partial<NewCustomerInput> & {
  /** https URL or inline data URL; null clears the logo */
  logoUrl?: string | null;
  /** Production accent color key; null clears to auto */
  accentColorKey?: string | null;
  shippingLocations?: import("@/types").CustomerShippingLocation[];
};

export async function updateCustomer(
  token: string,
  customerId: string,
  updates: CustomerUpdate
) {
  return callApi<{ customer: Customer }>("updateCustomer", {
    method: "PATCH",
    body: { customerId, ...updates },
    token,
  });
}

export async function archiveCustomer(token: string, customerId: string) {
  return callApi<{ customer: Customer; archivedOrders: number }>(
    "archiveCustomer",
    {
      method: "POST",
      body: { customerId },
      token,
    }
  );
}

export async function restoreCustomer(token: string, customerId: string) {
  return callApi<{ customer: Customer; restoredOrders: number }>(
    "restoreCustomer",
    {
      method: "POST",
      body: { customerId },
      token,
    }
  );
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export type ListOrdersQuery = {
  search?: string;
  status?: string;
  type?: string;
  customerId?: string;
  archived?: "only" | "include";
};

export async function listOrders(token: string, query?: ListOrdersQuery) {
  return callApi<{ orders: Order[] }>("listOrders", {
    token,
    query,
  });
}

export async function getOrder(token: string, orderId: string) {
  return callApi<{ order: Order }>("getOrder", {
    token,
    query: { orderId },
  });
}

export async function createOrderFromForm(token: string, form: NewOrderFormInput) {
  return callApi<{ order: Order }>("createOrder", {
    method: "POST",
    body: { form },
    token,
  });
}

export async function updateOrder(
  token: string,
  orderId: string,
  updates: Partial<Order>
) {
  return callApi<{ order: Order }>("updateOrder", {
    method: "PATCH",
    body: { orderId, ...updates },
    token,
  });
}

export async function reorderOrder(token: string, orderId: string) {
  return callApi<{ id: string; number: string; order: Order }>("reorderOrder", {
    method: "POST",
    body: { orderId },
    token,
  });
}

export async function archiveOrder(token: string, orderId: string) {
  return callApi<{ order: Order }>("archiveOrder", {
    method: "POST",
    body: { orderId },
    token,
  });
}

export async function restoreOrder(token: string, orderId: string) {
  return callApi<{ order: Order }>("restoreOrder", {
    method: "POST",
    body: { orderId },
    token,
  });
}

export async function addProductionJob(
  token: string,
  orderId: string,
  job: import("@/types").Job
) {
  return callApi<{ order: Order }>("addProductionJob", {
    method: "POST",
    body: { orderId, ...job },
    token,
  });
}

export async function removeProductionJob(
  token: string,
  orderId: string,
  jobId: string
) {
  return callApi<{ order: Order }>("removeProductionJob", {
    method: "POST",
    body: { orderId, jobId },
    token,
  });
}

export async function sendOrderMessage(
  token: string,
  orderId: string,
  content: string,
  author = "Shop"
) {
  return callApi<{ order: Order }>("sendOrderMessage", {
    method: "POST",
    body: { orderId, content, author },
    token,
  });
}

export async function addOrderInternalNote(
  token: string,
  orderId: string,
  content: string,
  author = "Shop"
) {
  return callApi<{ order: Order }>("addOrderInternalNote", {
    method: "POST",
    body: { orderId, content, author },
    token,
  });
}

export async function addOrderFile(
  token: string,
  orderId: string,
  file: Omit<import("@/types").OrderFile, "id" | "uploadedAt">
) {
  return callApi<{ order: Order }>("addOrderFile", {
    method: "POST",
    body: { orderId, ...file },
    token,
  });
}

export async function uploadOrderFile(
  token: string,
  orderId: string,
  payload: {
    name: string;
    kind: import("@/types").OrderFileKind;
    uploadedBy: string;
    contentBase64: string;
    contentType: string;
    notes?: string;
  }
) {
  return callApi<{ order: Order }>("uploadOrderFile", {
    method: "POST",
    body: { orderId, ...payload },
    token,
  });
}

export async function deleteOrderFile(
  token: string,
  orderId: string,
  fileId: string
) {
  return callApi<{ order: Order }>("deleteOrderFile", {
    method: "POST",
    body: { orderId, fileId },
    token,
  });
}

export async function updateOrderLineItem(
  token: string,
  orderId: string,
  lineItemId: string,
  lineItem: import("@/types").LineItem
) {
  return callApi<{ order: Order }>("updateOrderLineItem", {
    method: "PATCH",
    body: { orderId, lineItemId, ...lineItem },
    token,
  });
}

export async function addOrderLineItem(
  token: string,
  orderId: string,
  lineItem?: import("@/types").LineItem
) {
  const payload =
    lineItem !== undefined
      ? {
          orderId,
          lineItem: {
            id: lineItem.id,
            productName: lineItem.productName,
            brand: lineItem.brand,
            color: lineItem.color,
            productKey: lineItem.productKey,
            colorKey: lineItem.colorKey,
            unitCost: lineItem.unitCost,
            supplier: lineItem.supplier,
            supplierPartNumber: lineItem.supplierPartNumber,
            supplierStyleId: lineItem.supplierStyleId,
            sizes: lineItem.sizes.filter((row) => row.quantity > 0),
          },
        }
      : { orderId };

  return callApi<{ order: Order }>("addOrderLineItem", {
    method: "POST",
    body: payload,
    token,
  });
}

export async function removeOrderLineItem(
  token: string,
  orderId: string,
  lineItemId: string
) {
  return callApi<{ order: Order }>("removeOrderLineItem", {
    method: "POST",
    body: { orderId, lineItemId },
    token,
  });
}

export async function updateImprintNotes(
  token: string,
  orderId: string,
  jobId: string,
  imprintId: string,
  notes: import("@/types").ImprintProductionNotes
) {
  return callApi<{ order: Order }>("updateImprintNotes", {
    method: "PATCH",
    body: { orderId, jobId, imprintId, ...notes },
    token,
  });
}

export async function updateImprintInkColors(
  token: string,
  orderId: string,
  jobId: string,
  imprintId: string,
  inkColors: import("@/types").ImprintInkColor[]
) {
  return callApi<{ order: Order }>("updateImprintInkColors", {
    method: "PATCH",
    body: { orderId, jobId, imprintId, inkColors },
    token,
  });
}

export async function updateProductionEventWorkflow(
  token: string,
  orderId: string,
  jobId: string,
  imprintId: string,
  workflow: import("@/types").ProductionEventWorkflow
) {
  return callApi<{ order: Order }>("updateProductionEventWorkflow", {
    method: "PATCH",
    body: { orderId, jobId, imprintId, workflow },
    token,
  });
}

export async function setArtworkStatus(
  token: string,
  orderId: string,
  jobId: string,
  imprintId: string,
  status: import("@/types").ArtworkFile["status"]
) {
  return callApi<{ order: Order }>("setArtworkStatus", {
    method: "PATCH",
    body: { orderId, jobId, imprintId, status },
    token,
  });
}

export async function uploadArtworkVersion(
  token: string,
  orderId: string,
  jobId: string,
  imprintId: string,
  fileName: string,
  mockupLabel?: string,
  kind?: import("@/types").OrderFileKind,
  previewUrl?: string
) {
  return callApi<{ order: Order }>("uploadArtworkVersion", {
    method: "POST",
    body: { orderId, jobId, imprintId, fileName, mockupLabel, kind, previewUrl },
    token,
  });
}

export async function updateOrderMaterials(
  token: string,
  orderId: string,
  materials: import("@/types").OrderMaterials
) {
  return callApi<{ order: Order }>("updateOrderMaterials", {
    method: "POST",
    body: { orderId, materials },
    token,
  });
}

export async function listDesigns(
  token: string,
  query?: { customerId?: string; search?: string }
) {
  return callApi<{ designs: import("@/types").SavedDesign[] }>("listDesigns", {
    token,
    query,
  });
}

export async function getDesign(token: string, designId: string) {
  return callApi<{ design: import("@/types").SavedDesign }>("getDesign", {
    token,
    query: { designId },
  });
}

export async function restoreDesignVersion(
  token: string,
  body: { designId: string; versionId: string; author?: string }
) {
  return callApi<{ design: import("@/types").SavedDesign }>(
    "restoreDesignVersion",
    { method: "POST", body, token }
  );
}

export async function backfillDesignLibrary(token: string) {
  return callApi<{
    result: { designsSynced: number; ordersTouched: number };
  }>("backfillDesignLibrary", {
    method: "POST",
    token,
  });
}

export async function createDesignFromImprint(
  token: string,
  body: {
    orderId: string;
    jobId: string;
    imprintId: string;
    name?: string;
    customerId?: string;
  }
) {
  return callApi<{ design: import("@/types").SavedDesign }>(
    "createDesignFromImprint",
    { method: "POST", body, token }
  );
}

export async function applyDesignToOrder(
  token: string,
  body: {
    designId: string;
    orderId: string;
    jobId: string;
    imprintId: string;
  }
) {
  return callApi<{ order: Order }>("applyDesignToOrder", {
    method: "POST",
    body,
    token,
  });
}

export async function updateDesign(
  token: string,
  body: {
    designId: string;
    patch: Partial<
      Pick<
        import("@/types").SavedDesign,
        "name" | "tags" | "notes" | "inkColors"
      >
    >;
    changeSummary?: string;
    author?: string;
  }
) {
  return callApi<{ design: import("@/types").SavedDesign }>("updateDesign", {
    method: "POST",
    body,
    token,
  });
}

export async function updateOrderGarments(
  token: string,
  orderId: string,
  garments: import("@/types").OrderGarments
) {
  return callApi<{ order: Order }>("updateOrderGarments", {
    method: "POST",
    body: { orderId, garments },
    token,
  });
}

export async function sendProofToCustomer(
  token: string,
  orderId: string,
  jobId: string,
  imprintId: string
) {
  return callApi<{ order: Order; email: { sent: boolean; to: string } }>(
    "sendProofToCustomer",
    {
      method: "POST",
      body: { orderId, jobId, imprintId },
      token,
    }
  );
}

export async function sendProofsAndEstimate(token: string, orderId: string) {
  return callApi<{ order: Order; email: { sent: boolean; to: string } }>(
    "sendProofsAndEstimate",
    {
      method: "POST",
      body: { orderId },
      token,
    }
  );
}

export async function getOrderCustomerPortalLink(
  token: string,
  orderId: string
) {
  return callApi<{
    portalToken: string;
    portalHomeUrl: string;
    portalOrderUrl: string;
    customer: { name: string; email: string | null };
  }>("getOrderCustomerPortalLink", {
    method: "POST",
    token,
    body: { orderId },
  });
}

export type OrderDocumentScope = "all" | "estimate" | "proofs";

export async function previewOrderDocument(
  token: string,
  orderId: string,
  scope: OrderDocumentScope = "all"
) {
  return callApi<{ pdfBase64: string; filename: string }>(
    "previewOrderDocument",
    {
      method: "POST",
      body: { orderId, scope },
      token,
    }
  );
}

// ─── Machines ───────────────────────────────────────────────────────────────

export async function listMachines(token: string) {
  return callApi<{ machines: import("@/types").Machine[] }>("listMachines", {
    token,
  });
}

export async function createMachine(
  token: string,
  machine: Omit<import("@/types").Machine, "id">
) {
  return callApi<{ machine: import("@/types").Machine }>("createMachine", {
    method: "POST",
    body: machine,
    token,
  });
}

export async function updateMachine(
  token: string,
  machineId: string,
  machine: Omit<import("@/types").Machine, "id">
) {
  return callApi<{ machine: import("@/types").Machine }>("updateMachine", {
    method: "PATCH",
    body: { machineId, ...machine },
    token,
  });
}

export async function deleteMachine(token: string, machineId: string) {
  return callApi<void>("deleteMachine", {
    method: "DELETE",
    body: { machineId },
    token,
  });
}

// ─── Schedule ───────────────────────────────────────────────────────────────

export async function listScheduleBlocks(token: string) {
  return callApi<{ blocks: import("@/types").ScheduleBlock[] }>(
    "listScheduleBlocks",
    { token }
  );
}

export async function createScheduleBlock(
  token: string,
  block: Omit<import("@/types").ScheduleBlock, "id">
) {
  return callApi<{
    block: import("@/types").ScheduleBlock;
    order: import("@/types").Order | null;
  }>("createScheduleBlock", {
    method: "POST",
    body: block,
    token,
  });
}

export async function updateScheduleBlock(
  token: string,
  blockId: string,
  block: Omit<import("@/types").ScheduleBlock, "id">
) {
  return callApi<{ block: import("@/types").ScheduleBlock }>(
    "updateScheduleBlock",
    {
      method: "PATCH",
      body: { blockId, ...block },
      token,
    }
  );
}

export async function deleteScheduleBlock(token: string, blockId: string) {
  return callApi<void>("deleteScheduleBlock", {
    method: "DELETE",
    body: { blockId },
    token,
  });
}

export async function listJobRuns(token: string) {
  return callApi<{ runs: import("@/types").StationJobRun[] }>("listJobRuns", {
    token,
  });
}

export async function scanAndStartJob(
  token: string,
  body: { machineId: string; barcode: string }
) {
  return callApi<{
    run: import("@/types").StationJobRun;
    block: import("@/types").ScheduleBlock;
  }>("scanAndStartJob", {
    method: "POST",
    body,
    token,
  });
}

export async function updateJobRunStatus(
  token: string,
  runId: string,
  status: import("@/types").StationJobRun["status"]
) {
  return callApi<{ run: import("@/types").StationJobRun }>("updateJobRunStatus", {
    method: "PATCH",
    body: { runId, status },
    token,
  });
}

export async function addJobRunNote(
  token: string,
  runId: string,
  content: string,
  author = "Floor"
) {
  return callApi<{ run: import("@/types").StationJobRun }>("addJobRunNote", {
    method: "POST",
    body: { runId, content, author },
    token,
  });
}

export async function reportMachineIssue(
  token: string,
  body: {
    machineId: string;
    issueType: import("@/types").MachineIssueType;
    message: string;
    takeOffline: boolean;
  }
) {
  return callApi<{ machine: import("@/types").Machine }>("reportMachineIssue", {
    method: "POST",
    body,
    token,
  });
}

export async function setMachineOnline(
  token: string,
  machineId: string,
  note?: string
) {
  return callApi<{ machine: import("@/types").Machine }>("setMachineOnline", {
    method: "POST",
    body: { machineId, note },
    token,
  });
}

// ─── Inventory ──────────────────────────────────────────────────────────────

export type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  warehouse: string;
  onHand: number;
  reorderAt: number;
};

export async function listInventory(token: string) {
  return callApi<{ items: InventoryItem[] }>("listInventory", { token });
}

export async function createInventoryItem(
  token: string,
  data: Omit<InventoryItem, "id">
) {
  return callApi<{ item: InventoryItem }>("createInventoryItem", {
    method: "POST",
    body: data,
    token,
  });
}

export async function updateInventoryItem(
  token: string,
  itemId: string,
  updates: Partial<Omit<InventoryItem, "id">>
) {
  return callApi<{ item: InventoryItem }>("updateInventoryItem", {
    method: "PATCH",
    body: { itemId, ...updates },
    token,
  });
}

// ─── Purchase orders ─────────────────────────────────────────────────────────

export type PurchaseOrderStatus = "draft" | "ordered" | "received" | "cancelled";

export type PurchaseOrderLineItem = {
  id: string;
  inventoryItemId: string | null;
  name: string;
  sku: string;
  quantity: number;
  unitCost: number;
};

export type PurchaseOrder = {
  id: string;
  number: string;
  status: PurchaseOrderStatus;
  supplier: string;
  warehouse: string;
  notes: string;
  lineItems: PurchaseOrderLineItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
  orderedAt: string | null;
  receivedAt: string | null;
  createdByName: string;
};

export type PurchaseOrderInput = {
  supplier?: string;
  warehouse?: string;
  notes?: string;
  status?: PurchaseOrderStatus;
  lineItems: {
    inventoryItemId?: string | null;
    name: string;
    sku?: string;
    quantity: number;
    unitCost?: number;
  }[];
};

export async function listPurchaseOrders(token: string) {
  return callApi<{ purchaseOrders: PurchaseOrder[] }>("listPurchaseOrders", {
    token,
  });
}

export async function createPurchaseOrder(
  token: string,
  data: PurchaseOrderInput
) {
  return callApi<{ purchaseOrder: PurchaseOrder }>("createPurchaseOrder", {
    method: "POST",
    body: data,
    token,
  });
}

export async function updatePurchaseOrder(
  token: string,
  purchaseOrderId: string,
  updates: Partial<PurchaseOrderInput> & { status?: PurchaseOrderStatus }
) {
  return callApi<{ purchaseOrder: PurchaseOrder }>("updatePurchaseOrder", {
    method: "PATCH",
    body: { purchaseOrderId, ...updates },
    token,
  });
}

export async function deletePurchaseOrder(
  token: string,
  purchaseOrderId: string
) {
  return callApi<{ ok: boolean }>("deletePurchaseOrder", {
    method: "POST",
    body: { purchaseOrderId },
    token,
  });
}

// ─── Manual tasks ───────────────────────────────────────────────────────────

export type ManualTaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type ManualTaskPriority = "low" | "normal" | "high" | "urgent";

export type ManualTaskComment = {
  id: string;
  body: string;
  authorId: string | null;
  authorName: string;
  createdAt: string;
};

export type ManualTask = {
  id: string;
  title: string;
  description: string;
  status: ManualTaskStatus;
  priority: ManualTaskPriority;
  assigneeId: string | null;
  assigneeName: string;
  dueDate: string | null;
  comments: ManualTaskComment[];
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  createdByName: string;
  completedAt: string | null;
};

export type ManualTaskInput = {
  title: string;
  description?: string;
  status?: ManualTaskStatus;
  priority?: ManualTaskPriority;
  assigneeId?: string | null;
  assigneeName?: string;
  dueDate?: string | null;
};

export type AssignableStaffMember = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
};

export async function listTasks(token: string) {
  return callApi<{ tasks: ManualTask[] }>("listTasks", { token });
}

export async function createTask(token: string, data: ManualTaskInput) {
  return callApi<{ task: ManualTask }>("createTask", {
    method: "POST",
    body: data,
    token,
  });
}

export async function updateTask(
  token: string,
  taskId: string,
  updates: Partial<ManualTaskInput>
) {
  return callApi<{ task: ManualTask }>("updateTask", {
    method: "PATCH",
    body: { taskId, ...updates },
    token,
  });
}

export async function addTaskComment(
  token: string,
  taskId: string,
  body: string
) {
  return callApi<{ task: ManualTask }>("addTaskComment", {
    method: "POST",
    body: { taskId, body },
    token,
  });
}

export async function deleteTask(token: string, taskId: string) {
  return callApi<{ ok: boolean }>("deleteTask", {
    method: "POST",
    body: { taskId },
    token,
  });
}

export async function listStaffMembers(token: string) {
  return callApi<{ members: AssignableStaffMember[] }>("listStaffMembers", {
    token,
  });
}

// ─── Staff notifications ────────────────────────────────────────────────────

export async function listNotifications(token: string, limit = 30) {
  return callApi<{ notifications: StaffNotification[]; unreadCount: number }>(
    "listNotifications",
    { token, query: { limit: String(limit) } }
  );
}

export async function markNotificationRead(
  token: string,
  notificationId: string
) {
  return callApi<{ notification: StaffNotification }>("markNotificationRead", {
    method: "PATCH",
    body: { notificationId },
    token,
  });
}

export async function markAllNotificationsRead(token: string) {
  return callApi<{ updated: number }>("markAllNotificationsRead", {
    method: "POST",
    token,
  });
}
