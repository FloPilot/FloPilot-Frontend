import type { PlatformTeamMember } from "@/lib/platform-team";
import type { NewCustomerInput } from "@/lib/customers";
import type { NewOrderFormInput } from "@/lib/create-order";
import type { ShopSettings } from "@/lib/shop-settings";
import type { StaffRole } from "@/lib/staff-roles";
import type { StaffAccess } from "@/lib/staff-access";
import type { SupportTicket } from "@/lib/support-tickets";
import type { Customer, DashboardStats, Order } from "@/types";

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
  }  );
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

export async function updateCustomer(
  token: string,
  customerId: string,
  updates: Partial<NewCustomerInput>
) {
  return callApi<{ customer: Customer }>("updateCustomer", {
    method: "PATCH",
    body: { customerId, ...updates },
    token,
  });
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export type ListOrdersQuery = {
  search?: string;
  status?: string;
  type?: string;
  customerId?: string;
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

export async function addOrderLineItem(token: string, orderId: string) {
  return callApi<{ order: Order }>("addOrderLineItem", {
    method: "POST",
    body: { orderId },
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
  kind?: import("@/types").OrderFileKind
) {
  return callApi<{ order: Order }>("uploadArtworkVersion", {
    method: "POST",
    body: { orderId, jobId, imprintId, fileName, mockupLabel, kind },
    token,
  });
}

export async function sendProofToCustomer(
  token: string,
  orderId: string,
  jobId: string,
  imprintId: string
) {
  return callApi<{ order: Order }>("sendProofToCustomer", {
    method: "POST",
    body: { orderId, jobId, imprintId },
    token,
  });
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
