"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Layers3,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { usePortalAccess } from "@/components/portal/use-portal-access";
import { usePortalPaths } from "@/components/portal/portal-paths";
import {
  listPortalOrderRequests,
  updatePortalOrderRequestProductionRun,
} from "@/lib/customer-portal-api";
import { formatDate } from "@/lib/format";
import {
  ORDER_REQUEST_STATUS_LABELS,
  orderRequestStatusTone,
  type OrderRequestSummary,
} from "@/lib/order-requests";
import {
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: OrderRequestSummary["status"] }) {
  const tone = orderRequestStatusTone(status);
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "warning" && "bg-[#fff1d6] text-[#8a6116]",
        tone === "info" && "bg-[#ebf4ff] text-[#2c6ecb]",
        tone === "success" && "bg-[#f1faf1] text-[#0d5c2e]",
        tone === "danger" && "bg-[#fff1f1] text-[#8f1f1f]",
        tone === "neutral" && "bg-[#f1f1f1] text-[#616161]"
      )}
    >
      {ORDER_REQUEST_STATUS_LABELS[status]}
    </span>
  );
}

function isLinkable(request: OrderRequestSummary) {
  return request.status === "submitted" || request.status === "in_review";
}

export function PortalOrderRequestList() {
  const { mode, accent, getAccessToken } = usePortalAccess();
  const paths = usePortalPaths();
  const [requests, setRequests] = useState<OrderRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [savingRun, setSavingRun] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const portalMode = mode === "auth" ? "auth" : "invite";

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      if (a.status === "draft" && b.status !== "draft") return -1;
      if (b.status === "draft" && a.status !== "draft") return 1;
      return (
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
    });
  }, [requests]);

  const draftHref = (id: string) =>
    `${paths.newOrderRequest()}?draftId=${encodeURIComponent(id)}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const accessToken = await getAccessToken();
      const data = await listPortalOrderRequests(accessToken, {
        mode: portalMode,
      });
      setRequests(data.requests || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load order requests."
      );
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, portalMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const linkableRequests = useMemo(
    () => requests.filter(isLinkable),
    [requests]
  );

  const selectedRequests = useMemo(
    () =>
      selectedIds
        .map((id) => requests.find((row) => row.id === id))
        .filter((row): row is OrderRequestSummary => Boolean(row)),
    [requests, selectedIds]
  );

  const combinedPieces = selectedRequests.reduce(
    (sum, row) => sum + (row.pieceCount || 0),
    0
  );

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((entry) => entry !== id);
      }
      const target = requests.find((row) => row.id === id);
      const companionIds = (target?.productionRun?.members || [])
        .map((member) => member.requestId)
        .filter((memberId) =>
          requests.some(
            (row) => row.id === memberId && isLinkable(row)
          )
        );
      return Array.from(new Set([...current, id, ...companionIds]));
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
    setRunError(null);
  };

  const handleRunTogether = async () => {
    if (selectedIds.length < 2) {
      setRunError("Select at least two open requests to run together.");
      return;
    }
    const [primaryId, ...linkedIds] = selectedIds;
    setSavingRun(true);
    setRunError(null);
    try {
      const accessToken = await getAccessToken();
      await updatePortalOrderRequestProductionRun(
        accessToken,
        primaryId,
        linkedIds,
        { mode: portalMode }
      );
      exitSelectMode();
      await load();
    } catch (err) {
      setRunError(
        err instanceof Error
          ? err.message
          : "Could not link these requests together."
      );
    } finally {
      setSavingRun(false);
    }
  };

  const handleClearRun = async (request: OrderRequestSummary) => {
    if (!request.productionRun) return;
    const confirmed = window.confirm(
      "Remove this multi-job run? Each request will be priced on its own again."
    );
    if (!confirmed) return;
    setSavingRun(true);
    setRunError(null);
    try {
      const accessToken = await getAccessToken();
      await updatePortalOrderRequestProductionRun(
        accessToken,
        request.id,
        [],
        { mode: portalMode }
      );
      await load();
    } catch (err) {
      setRunError(
        err instanceof Error ? err.message : "Could not clear this run."
      );
    } finally {
      setSavingRun(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-[#616161]">
        <Loader2 className="size-6 animate-spin" style={{ color: accent }} />
        <p className="text-[14px]">Loading order requests…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#f5b5b5] bg-[#fff1f1] px-4 py-6 text-center text-[14px] text-[#8f1f1f]">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={dashboardSectionTitleClass}>Order requests</h1>
          <p className={cn(dashboardTaskDetailClass, "mt-1 max-w-2xl")}>
            Submit purchase-order requests, then link jobs that should run
            together for better decoration pricing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {linkableRequests.length >= 2 ? (
            <button
              type="button"
              onClick={() => {
                if (selectMode) exitSelectMode();
                else {
                  setSelectMode(true);
                  setRunError(null);
                }
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-3.5 text-[13px] font-semibold text-[#303030] hover:bg-[#fafafa]"
            >
              <Layers3 className="size-4" />
              {selectMode ? "Cancel" : "Run together"}
            </button>
          ) : null}
          <Link
            href={paths.newOrderRequest()}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            <Plus className="size-4" strokeWidth={2} />
            New order request
          </Link>
        </div>
      </div>

      {selectMode ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#bfd8c8] bg-[#f2f8f4] px-4 py-3">
          <div className="min-w-0 text-[13px] text-[#245c3c]">
            <p className="font-semibold">
              {selectedIds.length === 0
                ? "Select open requests to combine"
                : `${selectedIds.length} selected · ${combinedPieces.toLocaleString()} combined pcs`}
            </p>
            <p className="mt-0.5 text-[12px] text-[#3d6b52]">
              Combined piece count picks a better decoration price tier when the
              shop converts these to orders.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleRunTogether()}
            disabled={savingRun || selectedIds.length < 2}
            className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: accent }}
          >
            {savingRun ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Layers3 className="size-4" />
            )}
            Link selected
          </button>
        </div>
      ) : null}

      {runError ? (
        <div className="rounded-xl border border-[#f5b5b5] bg-[#fff1f1] px-4 py-3 text-[14px] text-[#8f1f1f]">
          {runError}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-[#ebebeb] bg-white shadow-sm">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <div
              className="flex size-12 items-center justify-center rounded-xl bg-[#f1f1f1]"
              style={{ color: accent }}
            >
              <ClipboardList className="size-5" strokeWidth={1.75} />
            </div>
            <p className="mt-4 text-[15px] font-semibold text-[#303030]">
              No order requests yet
            </p>
            <p className="mt-1 max-w-sm text-[13px] text-[#616161]">
              Start a request with the blanks you need, decoration details, and
              any mockups you have.
            </p>
            <Link
              href={paths.newOrderRequest()}
              className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              <Plus className="size-4" />
              New order request
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#f1f1f1]">
            {sortedRequests.map((request) => {
              const selected = selectedIds.includes(request.id);
              const linkable = isLinkable(request);
              const run = request.productionRun;
              const href =
                request.status === "draft"
                  ? draftHref(request.id)
                  : paths.orderRequest(request.id);
              const rowInner = (
                <>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-semibold leading-snug text-[#303030]">
                        {request.number}
                        {request.customLabel ? (
                          <span className="font-medium text-[#616161]">
                            {" "}
                            · {request.customLabel}
                          </span>
                        ) : null}
                      </p>
                      <StatusBadge status={request.status} />
                      {run && run.memberCount > 1 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#bfd8c8] bg-[#f2f8f4] px-2 py-0.5 text-[11px] font-semibold text-[#245c3c]">
                          <Layers3 className="size-3" />
                          Run {run.memberCount} ·{" "}
                          {run.combinedQuantity.toLocaleString()} pcs
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[12px] leading-snug text-[#8a8a8a]">
                      {request.status === "draft" ? "Draft · " : ""}
                      {formatDate(request.updatedAt || request.createdAt)}
                      {request.inHandsDate
                        ? ` · In-hands ${formatDate(request.inHandsDate)}`
                        : ""}
                      {request.rush ? " · Rush" : ""}
                      {request.status === "draft" ? " · Continue editing" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-right text-[12px] text-[#616161]">
                    <span>
                      <span className="text-[13px] font-semibold tabular-nums text-[#303030]">
                        {request.pieceCount.toLocaleString()}
                      </span>{" "}
                      pcs
                    </span>
                    {request.estimateTotal != null ? (
                      <span className="hidden text-[13px] font-semibold tabular-nums text-[#303030] sm:inline">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(request.estimateTotal)}
                      </span>
                    ) : null}
                    {run && run.memberCount > 1 && linkable && !selectMode ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void handleClearRun(request);
                        }}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-[#8a8a8a] hover:bg-[#fff1f1] hover:text-[#8f1f1f]"
                        aria-label="Remove from multi-job run"
                        title="Remove multi-job run"
                      >
                        <X className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </>
              );

              if (selectMode) {
                return (
                  <button
                    key={request.id}
                    type="button"
                    disabled={!linkable || savingRun}
                    onClick={() => linkable && toggleSelected(request.id)}
                    className={cn(
                      "flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors sm:px-5",
                      linkable ? "hover:bg-[#fafafa]" : "opacity-45",
                      selected && "bg-[#f2f8f4]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded border",
                        selected
                          ? "border-[#245c3c] bg-[#245c3c] text-white"
                          : "border-[#d4d4d4] bg-white"
                      )}
                    >
                      {selected ? (
                        <span className="text-[11px] font-bold leading-none">
                          ✓
                        </span>
                      ) : null}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
                      {rowInner}
                    </div>
                  </button>
                );
              }

              return (
                <Link
                  key={request.id}
                  href={href}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-[#fafafa] sm:px-5"
                >
                  {rowInner}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
