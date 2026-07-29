"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Layers3, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  LabeledSelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import { listOrderRequests } from "@/lib/api";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import {
  loadOrderRequestsListCached,
  peekOrderRequestsListCache,
} from "@/lib/order-requests-cache";
import {
  ORDER_REQUEST_STATUS_LABELS,
  orderRequestStatusTone,
  type OrderRequestStatus,
  type OrderRequestSummary,
} from "@/lib/order-requests";
import { cn } from "@/lib/utils";
import { RushBadge } from "@/components/status-badges";

type StatusFilter = "all" | OrderRequestStatus;
type AssigneeFilter = "all" | "mine" | "unassigned";

type EnrichedRequest = OrderRequestSummary & {
  salesRepId: string | null;
  salesRepName: string;
};

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "in_review", label: "In review" },
  { value: "converted", label: "Converted" },
  { value: "declined", label: "Declined" },
];

const ASSIGNEE_FILTERS: { value: AssigneeFilter; label: string }[] = [
  { value: "all", label: "All requests" },
  { value: "mine", label: "Assigned to me" },
  { value: "unassigned", label: "Unassigned" },
];

function statusBadgeClass(status: OrderRequestStatus) {
  const tone = orderRequestStatusTone(status);
  if (tone === "warning") return "bg-amber-50 text-amber-900 border-amber-200";
  if (tone === "info") return "bg-[#f4f7fd] text-[#2c6ecb] border-[#c4d7f2]";
  if (tone === "success")
    return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (tone === "danger") return "bg-[#fff1f1] text-[#8f1f1f] border-[#f5b5b5]";
  return "bg-[#f4f4f5] text-[#616161] border-[#e3e3e3]";
}

function safeFormatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return formatDate(value);
  } catch {
    return value;
  }
}

function buildCounts(requests: OrderRequestSummary[]): Record<string, number> {
  const counts: Record<string, number> = {
    submitted: 0,
    in_review: 0,
    converted: 0,
    declined: 0,
    cancelled: 0,
    all: requests.length,
  };
  for (const row of requests) {
    counts[row.status] = (counts[row.status] || 0) + 1;
  }
  return counts;
}

function chipClass(active: boolean) {
  return cn(
    "rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors",
    active
      ? "border-[#2c6ecb]/30 bg-[#f4f7fd] text-[#303030]"
      : "border-transparent text-[#616161] hover:bg-[#f6f6f7] hover:text-[#303030]"
  );
}

export function OrderRequestsListView() {
  const router = useRouter();
  const { getIdToken, profile } = useAuth();
  const { customers } = useSchedule();
  const myUserId =
    profile?.type === "staff" ? profile.user.id : null;

  const cached = peekOrderRequestsListCache();
  const [allRequests, setAllRequests] = useState<OrderRequestSummary[]>(
    () => cached?.requests ?? []
  );
  const [status, setStatus] = useState<StatusFilter>("all");
  const [assignee, setAssignee] = useState<AssigneeFilter>("all");
  const [customerId, setCustomerId] = useState<string>("all");
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (options: { force?: boolean } = {}) => {
      const token = await getIdToken();
      if (!token) return;
      const existing = peekOrderRequestsListCache();
      if (!existing) setLoading(true);
      setError(null);
      try {
        const res = await loadOrderRequestsListCached(
          async () => {
            const data = await listOrderRequests(token);
            return {
              requests: data.requests,
              counts: data.counts || buildCounts(data.requests),
            };
          },
          { force: options.force }
        );
        setAllRequests(res.requests);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load order requests"
        );
      } finally {
        setLoading(false);
      }
    },
    [getIdToken]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const customerById = useMemo(() => {
    const map = new Map<
      string,
      { salesRepId?: string; salesRepName?: string }
    >();
    for (const customer of customers) {
      map.set(customer.id, customer);
    }
    return map;
  }, [customers]);

  /** Prefer live customer sales-rep so “Assigned to me” tracks account ownership. */
  const enrichedRequests = useMemo<EnrichedRequest[]>(() => {
    return allRequests.map((request) => {
      const customer = customerById.get(request.customerId);
      const salesRepId =
        customer?.salesRepId?.trim() ||
        request.salesRepId?.trim() ||
        null;
      const salesRepName =
        customer?.salesRepName?.trim() ||
        request.salesRepName?.trim() ||
        "";
      return { ...request, salesRepId, salesRepName };
    });
  }, [allRequests, customerById]);

  const customerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const request of enrichedRequests) {
      if (!request.customerId) continue;
      const label =
        request.company?.trim() ||
        request.customerName?.trim() ||
        request.customerId;
      if (!map.has(request.customerId)) map.set(request.customerId, label);
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [enrichedRequests]);

  const matchesAssignee = useCallback(
    (request: EnrichedRequest) => {
      if (assignee === "mine") {
        return Boolean(myUserId && request.salesRepId === myUserId);
      }
      if (assignee === "unassigned") {
        return !request.salesRepId;
      }
      return true;
    },
    [assignee, myUserId]
  );

  const matchesCustomer = useCallback(
    (request: EnrichedRequest) => {
      if (customerId === "all") return true;
      return request.customerId === customerId;
    },
    [customerId]
  );

  const requests = useMemo(() => {
    return enrichedRequests.filter((request) => {
      if (status !== "all" && request.status !== status) return false;
      if (!matchesAssignee(request)) return false;
      if (!matchesCustomer(request)) return false;
      return true;
    });
  }, [enrichedRequests, status, matchesAssignee, matchesCustomer]);

  const assigneeCounts = useMemo(() => {
    const base = enrichedRequests.filter((request) => {
      if (status !== "all" && request.status !== status) return false;
      if (!matchesCustomer(request)) return false;
      return true;
    });
    return {
      all: base.length,
      mine: myUserId
        ? base.filter((request) => request.salesRepId === myUserId).length
        : 0,
      unassigned: base.filter((request) => !request.salesRepId).length,
    };
  }, [enrichedRequests, status, matchesCustomer, myUserId]);

  const statusCounts = useMemo(() => {
    const base = enrichedRequests.filter(
      (request) => matchesAssignee(request) && matchesCustomer(request)
    );
    return buildCounts(base);
  }, [enrichedRequests, matchesAssignee, matchesCustomer]);

  const filterCount = (value: StatusFilter) => {
    if (value === "all") return statusCounts.all ?? 0;
    return statusCounts[value] ?? 0;
  };

  const customerSelectOptions = useMemo(
    () => [{ value: "all", label: "All customers" }, ...customerOptions],
    [customerOptions]
  );

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <div>
        <h1 className={dashboardSectionTitleClass}>Order requests</h1>
        <p className={cn(dashboardTaskDetailClass, "mt-1 max-w-2xl")}>
          Purchase order requests submitted by customers. Review garments and
          decoration details, then confirm to create a shop order.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {error}
        </div>
      ) : null}

      <section className={dashboardCardClass}>
        <div className="flex flex-col gap-3 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-[#303030]">
                Inbox
              </h2>
              <p className="mt-0.5 text-[13px] text-[#616161]">
                {loading
                  ? "Loading…"
                  : `${requests.length} request${requests.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="flex min-w-[200px] flex-1 flex-col gap-1 sm:max-w-xs sm:flex-none">
              <label className="text-[11px] font-medium uppercase tracking-wide text-[#8a8a8a]">
                Customer
              </label>
              <Select
                value={customerId}
                onValueChange={(value) => setCustomerId(value || "all")}
              >
                <SelectTrigger className={cn(dashboardControlClass, "h-9")}>
                  <LabeledSelectValue
                    value={customerId}
                    options={customerSelectOptions}
                    placeholder="All customers"
                  />
                </SelectTrigger>
                <SelectContent>
                  {customerSelectOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {ASSIGNEE_FILTERS.map((filter) => {
              const active = assignee === filter.value;
              const count = assigneeCounts[filter.value];
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setAssignee(filter.value)}
                  className={chipClass(active)}
                >
                  {filter.label}
                  <span
                    className={cn(
                      "ml-1.5 tabular-nums",
                      active ? "text-[#2c6ecb]" : "text-[#8a8a8a]"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((filter) => {
              const active = status === filter.value;
              const count = filterCount(filter.value);
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatus(filter.value)}
                  className={chipClass(active)}
                >
                  {filter.label}
                  <span
                    className={cn(
                      "ml-1.5 tabular-nums",
                      active ? "text-[#2c6ecb]" : "text-[#8a8a8a]"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-[13px] text-[#616161]">
            <Loader2 className="size-4 animate-spin" />
            Loading order requests…
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#f4f4f5]">
              <ClipboardList className="size-5 text-[#616161]" />
            </div>
            <h2 className="mt-4 text-[15px] font-semibold text-[#303030]">
              No order requests
            </h2>
            <p className="mt-1 max-w-sm text-[13px] text-[#616161]">
              {assignee === "mine"
                ? "Nothing assigned to your customer accounts right now."
                : assignee === "unassigned"
                  ? "Every request in this view already has a sales rep."
                  : customerId !== "all"
                    ? "No requests for this customer with the current filters."
                    : status === "all"
                      ? "When customers submit a purchase order request, it will show up here."
                      : `No ${STATUS_FILTERS.find((f) => f.value === status)?.label.toLowerCase()} requests right now.`}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Request</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Sales rep</TableHead>
                <TableHead>Blanks / pieces / events</TableHead>
                <TableHead>In-hands</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow
                  key={request.id}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(`/app/order-requests/${request.id}`)
                  }
                >
                  <TableCell>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#303030]">
                        {request.number}
                      </p>
                      {request.customLabel ? (
                        <p className="truncate text-[12px] text-[#8a8a8a]">
                          {request.customLabel}
                        </p>
                      ) : null}
                      {request.productionRun &&
                      request.productionRun.memberCount > 1 ? (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-[#bfd8c8] bg-[#f2f8f4] px-2 py-0.5 text-[11px] font-semibold text-[#245c3c]">
                          <Layers3 className="size-3" />
                          Run {request.productionRun.memberCount} ·{" "}
                          {request.productionRun.combinedQuantity.toLocaleString()}{" "}
                          pcs
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#303030]">
                        {request.customerName || "—"}
                      </p>
                      <p className="truncate text-[12px] text-[#8a8a8a]">
                        {[
                          request.company || null,
                          request.subCustomerName
                            ? `End: ${request.subCustomerName}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px] text-[#616161]">
                    {request.salesRepName?.trim() || "—"}
                  </TableCell>
                  <TableCell className="tabular-nums text-[13px] text-[#616161]">
                    {request.blankCount} / {request.pieceCount} /{" "}
                    {request.eventCount}
                  </TableCell>
                  <TableCell className="text-[13px] text-[#616161]">
                    <span className="inline-flex items-center gap-1.5">
                      {safeFormatDate(request.inHandsDate)}
                      {request.rush ? <RushBadge /> : null}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium",
                        statusBadgeClass(request.status)
                      )}
                    >
                      {ORDER_REQUEST_STATUS_LABELS[request.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-[13px] text-[#616161]">
                    {safeFormatDate(request.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </main>
  );
}
