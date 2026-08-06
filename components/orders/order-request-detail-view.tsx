"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import {
  useRegisterUnsavedChanges,
  useStaffUnsavedChanges,
} from "@/components/layout/staff-unsaved-changes-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import {
  OrderRequestActionPanel,
  type OrderRequestActionId,
} from "@/components/orders/order-request-action-panel";
import { OrderRequestActivityTab } from "@/components/orders/order-request-activity-tab";
import { OrderRequestCustomerTab } from "@/components/orders/order-request-customer-tab";
import { OrderRequestDesignStudioTab } from "@/components/orders/order-request-design-studio-tab";
import { OrderRequestDesignUnavailable } from "@/components/orders/order-request-design-unavailable";
import { OrderRequestEstimateTab } from "@/components/orders/order-request-estimate-tab";
import { OrderRequestProofsTab } from "@/components/orders/order-request-proofs-tab";
import { OrderRequestLockedTab } from "@/components/orders/order-request-locked-tab";
import { OrderRequestEventsTab } from "@/components/orders/order-request-events-tab";
import { OrderRequestGarmentsTab } from "@/components/orders/order-request-garments-tab";
import { RushBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  convertOrderRequest,
  getOrderRequest,
  updateOrderRequest,
  updateOrderRequestStatus,
} from "@/lib/api";
import { clearOrderRequestsListCache } from "@/lib/order-requests-cache";
import {
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import {
  buildOrderRequestDetailTabs,
  isOrderRequestDesignUnavailable,
  isOrderRequestTabLocked,
  isOrderRequestTabUnavailable,
  parseOrderRequestDetailTab,
  type OrderRequestDetailTab,
} from "@/lib/order-request-detail-tabs";
import {
  pieceCountFromSizes,
  type OrderRequestDetail,
} from "@/lib/order-requests";
import { cn } from "@/lib/utils";

function safeFormatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return formatDate(value);
  } catch {
    return value;
  }
}

function cloneRequest(request: OrderRequestDetail): OrderRequestDetail {
  return JSON.parse(JSON.stringify(request)) as OrderRequestDetail;
}

export function OrderRequestDetailView({ requestId }: { requestId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getIdToken } = useAuth();
  const { getCustomerById } = useSchedule();
  const { requestLeave } = useStaffUnsavedChanges();
  const [request, setRequest] = useState<OrderRequestDetail | null>(null);
  const [draft, setDraft] = useState<OrderRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<
    "review" | "decline" | "convert" | "save" | null
  >(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [activeTab, setActiveTab] = useState<OrderRequestDetailTab>(() =>
    parseOrderRequestDetailTab(searchParams.get("tab"))
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [forceDesignStudio, setForceDesignStudio] = useState(false);

  const editable =
    request?.status === "submitted" || request?.status === "in_review";

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getOrderRequest(token, requestId);
      setRequest(res.request);
      setDraft(cloneRequest(res.request));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load order request"
      );
    } finally {
      setLoading(false);
    }
  }, [getIdToken, requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setForceDesignStudio(false);
  }, [requestId]);

  useEffect(() => {
    if (!draft) return;
    const available = buildOrderRequestDetailTabs(draft);
    if (!available.some((tab) => tab.id === activeTab)) {
      setActiveTab("events");
    }
  }, [draft, activeTab]);

  const dirty = useMemo(() => {
    if (!request || !draft) return false;
    return JSON.stringify(request) !== JSON.stringify(draft);
  }, [request, draft]);

  const canReview = request?.status === "submitted";
  const canDecline =
    request?.status === "submitted" || request?.status === "in_review";
  const canConvert =
    request?.status === "submitted" || request?.status === "in_review";

  const markInReview = async () => {
    const token = await getIdToken();
    if (!token || !request) return;
    setBusy("review");
    setActionError(null);
    try {
      const res = await updateOrderRequestStatus(
        token,
        request.id,
        "in_review"
      );
      setRequest(res.request);
      setDraft(cloneRequest(res.request));
      clearOrderRequestsListCache();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update status"
      );
    } finally {
      setBusy(null);
    }
  };

  const declineRequest = async () => {
    const token = await getIdToken();
    if (!token || !request) return;
    setBusy("decline");
    setActionError(null);
    try {
      const res = await updateOrderRequestStatus(
        token,
        request.id,
        "declined",
        declineReason.trim() || undefined
      );
      setRequest(res.request);
      setDraft(cloneRequest(res.request));
      setDeclineOpen(false);
      setDeclineReason("");
      clearOrderRequestsListCache();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to decline request"
      );
    } finally {
      setBusy(null);
    }
  };

  const saveChanges = async () => {
    const token = await getIdToken();
    if (!token || !draft) return;
    setBusy("save");
    setActionError(null);
    setSaveMessage(null);
    try {
      const res = await updateOrderRequest(token, draft.id, {
        blankSource: draft.blankSource,
        subCustomerId: draft.subCustomerId || null,
        lineItems: draft.lineItems,
        events: draft.events,
        inHandsDate: draft.inHandsDate,
        rush: draft.rush,
        customLabel: draft.customLabel || "",
        notes: draft.notes || "",
        vendorPurchaseOrder: draft.vendorPurchaseOrder || null,
        estimateAdjustments: draft.estimateAdjustments || [],
        excludedContractFeeIds: draft.excludedContractFeeIds || [],
        selectedRateSheetId: draft.selectedRateSheetId ?? null,
      });
      setRequest(res.request);
      setDraft(cloneRequest(res.request));
      setSaveMessage("Changes saved.");
      clearOrderRequestsListCache();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to save changes"
      );
    } finally {
      setBusy(null);
    }
  };

  useRegisterUnsavedChanges(
    editable && draft
      ? {
          dirty,
          saving: busy === "save",
          label: "Unsaved request",
          persistAcrossTabs: true,
          onSave: () => saveChanges(),
          onDiscard: () => {
            if (request) setDraft(cloneRequest(request));
            setActionError(null);
            setSaveMessage(null);
          },
        }
      : null,
    "order-request"
  );

  const convertRequest = async () => {
    const token = await getIdToken();
    if (!token || !request) return;
    if (dirty) {
      setActionError("Save your changes before converting to an order.");
      return;
    }
    setBusy("convert");
    setActionError(null);
    try {
      const res = await convertOrderRequest(token, request.id);
      clearOrderRequestsListCache();
      setRequest(res.request);
      router.push(`/app/orders/${res.order.id}`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to create order"
      );
      setBusy(null);
    }
  };

  const handlePanelAction = (actionId: OrderRequestActionId) => {
    if (actionId === "convert") {
      void convertRequest();
      return;
    }
    if (actionId === "review") {
      void markInReview();
      return;
    }
    if (actionId === "save") {
      void saveChanges();
      return;
    }
    if (actionId === "decline") {
      setDeclineOpen(true);
      return;
    }
    if (actionId === "open_order" && request?.convertedOrderId) {
      router.push(`/app/orders/${request.convertedOrderId}`);
    }
  };

  const handleRushChange = (rush: boolean) => {
    if (!editable) return;
    setDraft((prev) => (prev ? { ...prev, rush } : prev));
  };

  const updateLineSize = (id: string, size: string, qty: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lineItems: prev.lineItems.map((item) => {
          if (item.id !== id) return item;
          const sizes = { ...(item.sizes || {}), [size]: Math.max(0, qty) };
          return {
            ...item,
            sizes,
            quantity: pieceCountFromSizes(sizes),
          };
        }),
      };
    });
  };

  if (loading) {
    return (
      <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center gap-2 py-24 text-[13px] text-[#616161]">
          <Loader2 className="size-4 animate-spin" />
          Loading order request…
        </div>
      </main>
    );
  }

  if (error || !request || !draft) {
    return (
      <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
        <Link
          href="/app/order-requests"
          className={cn(
            dashboardGhostButtonClass,
            "w-fit gap-1.5 px-2 text-[13px]"
          )}
        >
          <ArrowLeft className="size-3.5" />
          Back to order requests
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {error || "Order request not found"}
        </div>
      </main>
    );
  }

  const tabs = buildOrderRequestDetailTabs(draft).map((tab) =>
    tab.id === "design"
      ? {
          ...tab,
          unavailable:
            isOrderRequestDesignUnavailable(draft) && !forceDesignStudio,
        }
      : tab
  );
  const tabLocked = isOrderRequestTabLocked(tabs, activeTab);
  const tabUnavailable = isOrderRequestTabUnavailable(tabs, activeTab);
  const customer = getCustomerById(request.customerId);
  const salesRepName =
    customer?.salesRepName?.trim() ||
    request.salesRepName?.trim() ||
    "";
  const decorationTypes = Array.from(
    new Set(
      (draft.events || [])
        .map((event) => event.decorationType)
        .filter((value): value is string => Boolean(value))
    )
  );
  const nextStep =
    request.status === "converted"
      ? "This request is already an order — open it to continue production."
      : request.status === "declined"
        ? "This request was declined."
        : dirty
          ? "Save your edits, then convert to order when ready."
          : "Review each tab like an order, then convert to unlock production.";
  const nextStepAttention =
    request.status === "declined"
      ? "critical"
      : dirty
        ? "warning"
        : "default";

  return (
    <main className="flex w-full flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <header className="space-y-4">
        <div className="min-w-0 space-y-2">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-[13px]"
          >
            <Link
              href="/app/order-requests"
              className="rounded-md px-1 py-0.5 text-[#616161] transition-colors hover:bg-[#f6f6f7] hover:text-[#303030]"
            >
              Order requests
            </Link>
            <span className="text-[#c9c9c9]" aria-hidden>
              /
            </span>
            <span className="px-1 font-medium text-[#303030]">
              Request {request.number}
              {draft.customLabel?.trim()
                ? ` — ${draft.customLabel.trim()}`
                : ""}
            </span>
          </nav>

          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2">
            <h1 className={cn(dashboardSectionTitleClass, "shrink-0")}>
              Request {request.number}
            </h1>
            {editable ? (
              <input
                className="min-w-[160px] max-w-xs rounded-md border border-[#ebebeb] bg-white px-2.5 py-1 text-[13px] font-medium text-[#303030] outline-none focus:border-[#c9cccf]"
                value={draft.customLabel || ""}
                placeholder="Add label…"
                onChange={(e) =>
                  setDraft((prev) =>
                    prev ? { ...prev, customLabel: e.target.value } : prev
                  )
                }
              />
            ) : draft.customLabel?.trim() ? (
              <span className="rounded-md border border-[#ebebeb] px-2.5 py-1 text-[13px] font-medium text-[#616161]">
                {draft.customLabel.trim()}
              </span>
            ) : null}
            {draft.rush ? <RushBadge /> : null}
            {request.productionRun && request.productionRun.memberCount > 1 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#bfd8c8] bg-[#f2f8f4] px-2 py-0.5 text-[11px] font-semibold text-[#245c3c]">
                Multi-job run · {request.productionRun.memberCount} ·{" "}
                {request.productionRun.combinedQuantity.toLocaleString()} pcs
              </span>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
            <p className={dashboardTaskDetailClass}>
              {request.company || request.customerName}
              {request.customerName && request.company
                ? ` · ${request.customerName}`
                : ""}
            </p>
            {editable ? (
              <label className="inline-flex items-center gap-1.5 text-[13px] text-[#616161]">
                In-hands
                <input
                  type="date"
                  className="h-8 rounded-md border border-[#ebebeb] bg-white px-2 text-[13px] text-[#303030] outline-none focus:border-[#c9cccf]"
                  value={draft.inHandsDate || ""}
                  onChange={(e) =>
                    setDraft((prev) =>
                      prev ? { ...prev, inHandsDate: e.target.value } : prev
                    )
                  }
                />
              </label>
            ) : (
              <p className={dashboardTaskDetailClass}>
                {draft.inHandsDate
                  ? `In-hands ${safeFormatDate(draft.inHandsDate)}`
                  : "In-hands —"}
              </p>
            )}
            <p className={dashboardTaskDetailClass}>
              {draft.subCustomerName?.trim()
                ? `End business: ${draft.subCustomerName}`
                : "General account order"}
            </p>
            <p className={dashboardTaskDetailClass}>
              Sales rep{" "}
              <span className="font-medium text-[#303030]">
                {salesRepName || "—"}
              </span>
            </p>
          </div>
        </div>

        <div
          className={cn(
            "rounded-lg border px-4 py-3",
            nextStepAttention === "critical"
              ? "border-[#f5b5b5] bg-[#fff1f1]"
              : nextStepAttention === "warning"
                ? "border-[#f0d9a8] bg-[#fff8eb]"
                : "border-[#e3e3e3] bg-white"
          )}
        >
          <p className="flex items-start gap-2 text-[14px] font-medium text-[#303030]">
            <ArrowRight className="mt-0.5 size-4 shrink-0 text-[#2c6ecb]" />
            <span>{nextStep}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-[#ebebeb] pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === activeTab) return;
                if (!requestLeave(undefined, { inPage: true })) return;
                setActiveTab(tab.id);
              }}
              className={cn(
                dashboardControlClass,
                "h-9 px-3 text-[13px]",
                activeTab === tab.id &&
                  "border-[#2c6ecb]/40 bg-[#f4f7fd] text-[#2c6ecb]",
                (tab.locked || tab.unavailable) &&
                  activeTab !== tab.id &&
                  "text-[#8a8a8a]"
              )}
            >
              {tab.label}
              {tab.unavailable ? (
                <span className="ml-1.5 text-[11px] font-normal opacity-80">
                  · N/A
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </header>

      {(actionError || saveMessage) && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-[13px]",
            actionError
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          )}
        >
          {actionError || saveMessage}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
        <div className="min-w-0 space-y-4">
          {tabLocked ? (
            <OrderRequestLockedTab
              tabId={activeTab}
              canConvert={Boolean(canConvert)}
              converting={busy === "convert"}
              onConvert={() => void convertRequest()}
            />
          ) : null}

          {!tabLocked && activeTab === "events" ? (
            <OrderRequestEventsTab request={draft} />
          ) : null}

          {!tabLocked && activeTab === "blanks" ? (
            <OrderRequestGarmentsTab
              request={draft}
              editable={Boolean(editable)}
              onBlankSourceChange={(blankSource) =>
                setDraft((prev) =>
                  prev ? { ...prev, blankSource } : prev
                )
              }
              onOrderedQtyChange={(lineItemId, size, qty) =>
                updateLineSize(lineItemId, size, qty)
              }
            />
          ) : null}

          {!tabLocked && tabUnavailable && activeTab === "design" ? (
            <OrderRequestDesignUnavailable
              request={draft}
              onOpenStudio={() => setForceDesignStudio(true)}
            />
          ) : null}

          {!tabLocked && !tabUnavailable && activeTab === "design" ? (
            <OrderRequestDesignStudioTab
              request={draft}
              editable={Boolean(editable)}
              onRequestChange={(next) => {
                setRequest(next);
                setDraft(cloneRequest(next));
                setSaveMessage("Mockup saved.");
                setActionError(null);
              }}
              onRequestAddBlank={() => setActiveTab("blanks")}
            />
          ) : null}

          {!tabLocked && activeTab === "proof" ? (
            <OrderRequestProofsTab
              request={draft}
              editable={Boolean(editable)}
              onRequestChange={(next) => {
                setRequest(next);
                setDraft(cloneRequest(next));
                setSaveMessage("Proof updates saved.");
                setActionError(null);
              }}
            />
          ) : null}

          {!tabLocked && activeTab === "estimate" ? (
            <OrderRequestEstimateTab
              request={draft}
              editable={Boolean(editable)}
              onRequestChange={(next) => {
                setRequest(next);
                setDraft(cloneRequest(next));
                setSaveMessage("Estimate updated.");
                setActionError(null);
              }}
            />
          ) : null}

          {!tabLocked && activeTab === "customer" ? (
            <OrderRequestCustomerTab
              request={draft}
              editable={Boolean(editable)}
              onRequestChange={(next) => {
                setRequest(next);
                setDraft(cloneRequest(next));
                setActionError(null);
              }}
            />
          ) : null}

          {!tabLocked && activeTab === "activity" ? (
            <OrderRequestActivityTab request={draft} />
          ) : null}
        </div>

        <div className="xl:sticky xl:top-6">
          <OrderRequestActionPanel
            request={draft}
            dirty={dirty}
            busy={busy}
            canReview={Boolean(canReview)}
            canConvert={Boolean(canConvert)}
            canDecline={Boolean(canDecline)}
            editable={Boolean(editable)}
            decorationTypes={decorationTypes}
            onAction={handlePanelAction}
            onRushChange={handleRushChange}
          />
        </div>
      </div>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline order request</DialogTitle>
            <DialogDescription>
              Optionally tell the customer why this request won&apos;t move
              forward.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Reason (optional)"
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeclineOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#8f1f1f] text-white hover:bg-[#7a1a1a]"
              disabled={busy !== null}
              onClick={() => void declineRequest()}
            >
              {busy === "decline" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              Decline request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
