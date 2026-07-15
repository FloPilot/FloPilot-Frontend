"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchAccountingIntegrations,
  pushOrderToQuickBooks,
} from "@/lib/api";
import {
  isQuickBooksConnected,
  type AccountingIntegration,
  type QuickBooksDocumentType,
} from "@/lib/accounting-integrations";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatDateTime } from "@/lib/format";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

function formatPushSummary(
  results: Array<{
    documentType: QuickBooksDocumentType;
    action: "created" | "updated";
    docNumber: string;
  }>,
  customerName?: string
) {
  const parts = results.map((result) => {
    const label = result.documentType === "invoice" ? "Invoice" : "Estimate";
    const verb = result.action === "updated" ? "updated" : "created";
    return `${label} #${result.docNumber} ${verb}`;
  });
  const joined =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `${joined} in QuickBooks${customerName ? ` for ${customerName}` : ""}.`;
}

export function OrderQuickBooksPanel({
  order,
}: {
  order: Order;
}) {
  const { getIdToken } = useAuth();
  const { refreshShopData } = useSchedule();
  const [integration, setIntegration] = useState<AccountingIntegration | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const connected = isQuickBooksConnected(integration);
  const allowed = useMemo(() => {
    const types = integration?.settings?.allowedDocumentTypes || [
      "estimate",
      "invoice",
    ];
    return types.length ? types : (["estimate", "invoice"] as QuickBooksDocumentType[]);
  }, [integration]);

  const defaultSelected = useMemo(() => {
    const preferred = integration?.settings?.defaultDocumentType;
    if (preferred && preferred !== "ask" && allowed.includes(preferred)) {
      return [preferred] as QuickBooksDocumentType[];
    }
    if (order.type === "invoice" && allowed.includes("invoice")) {
      return ["invoice"] as QuickBooksDocumentType[];
    }
    return [allowed[0] || "estimate"] as QuickBooksDocumentType[];
  }, [allowed, integration, order.type]);

  const [selectedTypes, setSelectedTypes] =
    useState<QuickBooksDocumentType[]>(defaultSelected);

  useEffect(() => {
    setSelectedTypes(defaultSelected);
  }, [defaultSelected]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const token = await getIdToken();
        if (!token) return;
        const result = await fetchAccountingIntegrations(token);
        if (cancelled) return;
        const qb =
          result.integrations.find((entry) => entry.provider === "quickbooks") ||
          null;
        setIntegration(qb);
      } catch {
        if (!cancelled) setIntegration(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [getIdToken]);

  const sync = order.quickbooks;

  const toggleType = (type: QuickBooksDocumentType) => {
    setSelectedTypes((current) => {
      if (current.includes(type)) {
        if (current.length === 1) return current;
        return current.filter((entry) => entry !== type);
      }
      return [...current, type];
    });
  };

  const selectedPlans = selectedTypes.map((type) => {
    const existingId =
      type === "invoice" ? sync?.invoiceId : sync?.estimateId;
    const docNumber =
      type === "invoice" ? sync?.invoiceDocNumber : sync?.estimateDocNumber;
    return {
      type,
      action: existingId ? ("update" as const) : ("create" as const),
      docNumber: docNumber || null,
    };
  });

  const primaryActionLabel = (() => {
    if (selectedPlans.length === 0) return "Push";
    if (selectedPlans.length > 1) {
      const allUpdate = selectedPlans.every((plan) => plan.action === "update");
      const allCreate = selectedPlans.every((plan) => plan.action === "create");
      if (allUpdate) return "Update both in QuickBooks";
      if (allCreate) return "Create both in QuickBooks";
      return "Push selected to QuickBooks";
    }
    const plan = selectedPlans[0];
    const label = plan.type === "invoice" ? "invoice" : "estimate";
    return plan.action === "update"
      ? `Update ${label}`
      : `Create ${label}`;
  })();

  const handlePush = async () => {
    if (selectedTypes.length === 0) return;
    setPushing(true);
    setError(null);
    setSuccess(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in.");
      const result = await pushOrderToQuickBooks(token, {
        orderId: order.id,
        documentTypes: selectedTypes,
      });
      await refreshShopData().catch(() => undefined);
      setSuccess(
        formatPushSummary(result.results || [], result.customerName)
      );
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Push to QuickBooks failed");
    } finally {
      setPushing(false);
    }
  };

  if (loading) {
    return (
      <section className={cn(dashboardCardClass, "px-4 py-4")}>
        <div className="flex items-center gap-2 text-sm text-[#616161]">
          <Loader2 className="size-4 animate-spin" />
          Checking QuickBooks…
        </div>
      </section>
    );
  }

  if (!connected) {
    return (
      <section className={cn(dashboardCardClass, "px-4 py-4")}>
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#eef6f0] text-[#2d6a4f]">
            <BookOpen className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#303030]">
              QuickBooks
            </p>
            <p className={cn(dashboardTaskDetailClass, "mt-0.5")}>
              Connect Accounting to push this order as an estimate or invoice.
            </p>
            <Link
              href="/app/settings/integrations/accounting"
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#2c6ecb] hover:underline"
            >
              Open Accounting settings
              <ExternalLink className="size-3" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const hasSyncedDocs = Boolean(sync?.estimateId || sync?.invoiceId);

  return (
    <>
      <section className={cn(dashboardCardClass, "overflow-hidden")}>
        <div className="border-b border-[#ebebeb] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-[#2d6a4f]" />
              <p className="text-[13px] font-semibold text-[#303030]">
                QuickBooks
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f5ee] px-2 py-0.5 text-[10px] font-semibold text-[#0d5c2e]">
              <CheckCircle2 className="size-3" />
              Connected
            </span>
          </div>
          <p className={cn(dashboardTaskDetailClass, "mt-1")}>
            {integration?.companyName || "QuickBooks Online"}
          </p>
        </div>

        <div className="space-y-3 px-4 py-4">
          {hasSyncedDocs ? (
            <div className="space-y-2 rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-2.5 text-[12px] text-[#616161]">
              {sync?.estimateId ? (
                <p>
                  Estimate{" "}
                  <span className="font-medium text-[#303030]">
                    #{sync.estimateDocNumber || "—"}
                  </span>
                  <span className="text-[#8a8a8a]"> · linked · re-push updates it</span>
                </p>
              ) : null}
              {sync?.invoiceId ? (
                <p>
                  Invoice{" "}
                  <span className="font-medium text-[#303030]">
                    #{sync.invoiceDocNumber || "—"}
                  </span>
                  <span className="text-[#8a8a8a]"> · linked · re-push updates it</span>
                </p>
              ) : null}
              {sync?.lastSyncedAt ? (
                <p className="text-[11px] text-[#8a8a8a]">
                  Last synced {formatDateTime(sync.lastSyncedAt)}
                </p>
              ) : null}
            </div>
          ) : (
            <p className={dashboardTaskDetailClass}>
              Push this job’s pricing into QuickBooks when you’re ready. Re-push
              later updates the same document — it won’t create a duplicate.
            </p>
          )}

          {success && (
            <p className="rounded-lg border border-[#cdead8] bg-[#f2fbf6] px-3 py-2 text-[12px] text-[#0d5c2e]">
              {success}
            </p>
          )}
          {error && (
            <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[12px] text-[#8f1f1f]">
              {error}
            </p>
          )}

          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-9 w-full")}
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
          >
            {hasSyncedDocs ? (
              <RefreshCw className="size-3.5" />
            ) : (
              <Send className="size-3.5" />
            )}
            {hasSyncedDocs ? "Update in QuickBooks" : "Push to QuickBooks"}
          </Button>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {hasSyncedDocs ? "Update QuickBooks" : "Push to QuickBooks"}
            </DialogTitle>
            <DialogDescription>
              Choose what to send for order {order.number}. Select one or both —
              FloPilot updates any document already linked to this order instead
              of creating a duplicate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-[13px] font-medium text-[#303030]">
              Documents to send
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {allowed.map((type) => {
                const selected = selectedTypes.includes(type);
                const existingId =
                  type === "invoice" ? sync?.invoiceId : sync?.estimateId;
                const docNumber =
                  type === "invoice"
                    ? sync?.invoiceDocNumber
                    : sync?.estimateDocNumber;
                const willUpdate = Boolean(existingId);

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={cn(
                      "rounded-lg border px-3 py-3 text-left transition-colors",
                      selected
                        ? "border-[#2c6ecb] bg-[#f4f7fd]"
                        : "border-[#e3e3e3] bg-white hover:border-[#c4d7f2]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold capitalize text-[#303030]">
                        {type}
                      </p>
                      <span
                        className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border text-[10px]",
                          selected
                            ? "border-[#2c6ecb] bg-[#2c6ecb] text-white"
                            : "border-[#cfcfcf] bg-white text-transparent"
                        )}
                        aria-hidden
                      >
                        ✓
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-[#616161]">
                      {type === "estimate"
                        ? "Quote / proposal in QuickBooks"
                        : "Billable invoice in QuickBooks"}
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-[11px] font-medium",
                        willUpdate ? "text-[#0d5c2e]" : "text-[#8a8a8a]"
                      )}
                    >
                      {willUpdate
                        ? `Will update #${docNumber || existingId}`
                        : "Will create new"}
                    </p>
                  </button>
                );
              })}
            </div>

            {selectedPlans.some((plan) => plan.action === "update") && (
              <p className="rounded-lg border border-[#d9ebe0] bg-[#f4fbf7] px-3 py-2 text-[12px] text-[#0d5c2e]">
                Line items and totals from this FloPilot order will overwrite the
                matching QuickBooks document. Manual edits in QuickBooks for
                those fields will be replaced.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              className={cn(dashboardControlClass, "h-9")}
              onClick={() => setOpen(false)}
              disabled={pushing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "h-9")}
              onClick={() => void handlePush()}
              disabled={pushing || selectedTypes.length === 0}
            >
              {pushing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : selectedPlans.every((plan) => plan.action === "update") ? (
                <RefreshCw className="size-3.5" />
              ) : (
                <Send className="size-3.5" />
              )}
              {primaryActionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
