"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Landmark,
  Loader2,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOrderPayLink,
  createOrderPaymentCheckout,
  fetchAccountingIntegrations,
  fetchPaymentIntegrations,
} from "@/lib/api";
import { isQuickBooksConnected } from "@/lib/accounting-integrations";
import {
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatCurrency } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";
import { isStripeConnected } from "@/lib/payment-integrations";
import { resolveEffectivePricingMatrix } from "@/lib/customer-pricing";
import { computeInvoiceTotals } from "@/lib/order-estimate";
import {
  normalizePaymentOptions,
  type ShopPaymentMethod,
} from "@/lib/shop-payment-options";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error";

type MethodChoice =
  | { kind: "stripe"; id: "stripe"; label: string; description: string }
  | { kind: "quickbooks"; id: "quickbooks"; label: string; description: string }
  | {
      kind: "manual";
      id: string;
      label: string;
      description: string;
      method?: ShopPaymentMethod;
      builtIn?: "cash";
    };

type Step = "choose" | "link" | "record";

type OpenInvoiceRow = {
  order: Order;
  balance: number;
  total: number;
  paid: number;
  label: string;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function MethodIcon({
  kind,
  builtIn,
}: {
  kind: MethodChoice["kind"];
  builtIn?: "cash";
}) {
  if (builtIn === "cash") return <Banknote className="size-4" />;
  if (kind === "stripe") return <CreditCard className="size-4" />;
  if (kind === "quickbooks") return <Landmark className="size-4" />;
  return <Wallet className="size-4" />;
}

export function AddInvoicePaymentDialog({
  order,
  open,
  onOpenChange,
  onRecorded,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded?: (message: string, type?: ToastType) => void;
}) {
  const { getIdToken } = useAuth();
  const { settings } = useShopSettings();
  const {
    getCustomerById,
    getOrdersByCustomerId,
    recordInvoicePayments,
  } = useSchedule();

  const customer = getCustomerById(order.customerId);
  const pricingMatrix = useMemo(
    () => resolveEffectivePricingMatrix(settings, customer, order),
    [settings, customer, order]
  );
  const shopPricing = useMemo(
    () => ({
      pricingMatrix,
      pricingRateSheets: settings.pricingRateSheets,
      productionDefaults: settings.productionDefaults,
    }),
    [pricingMatrix, settings.pricingRateSheets, settings.productionDefaults]
  );

  const openInvoices = useMemo((): OpenInvoiceRow[] => {
    /** Only post-fulfillment / invoicing stages — not drafts or in-production. */
    const billableStatuses = new Set([
      "ready_to_invoice",
      "invoice_sent",
      "completed",
    ]);
    const isBillableSibling = (entry: Order) =>
      billableStatuses.has(entry.status) || Boolean(entry.invoice?.sentAt);

    const siblings = (getOrdersByCustomerId(order.customerId) || []).filter(
      (entry) =>
        !entry.archived &&
        !entry.archivedAt &&
        (entry.id === order.id || isBillableSibling(entry))
    );
    const rows: OpenInvoiceRow[] = [];
    for (const entry of siblings) {
      const totals = computeInvoiceTotals(
        entry,
        settings.taxRate,
        shopPricing,
        customer
      );
      const balance = round2(totals.balance);
      if (balance <= 0 && entry.id !== order.id) continue;
      rows.push({
        order: entry,
        balance: Math.max(0, balance),
        total: round2(totals.total),
        paid: round2(totals.paid),
        label: formatOrderDisplayLine(entry),
      });
    }
    rows.sort((a, b) => {
      if (a.order.id === order.id) return -1;
      if (b.order.id === order.id) return 1;
      return (
        new Date(b.order.createdAt).getTime() -
        new Date(a.order.createdAt).getTime()
      );
    });
    // Always include current order even if somehow zero (paid state)
    if (!rows.some((row) => row.order.id === order.id)) {
      const totals = computeInvoiceTotals(
        order,
        settings.taxRate,
        shopPricing,
        customer
      );
      rows.unshift({
        order,
        balance: round2(totals.balance),
        total: round2(totals.total),
        paid: round2(totals.paid),
        label: formatOrderDisplayLine(order),
      });
    }
    return rows;
  }, [
    getOrdersByCustomerId,
    order,
    settings.taxRate,
    shopPricing,
    customer,
  ]);

  const [selectedIds, setSelectedIds] = useState<string[]>([order.id]);
  const selectedRows = useMemo(
    () => openInvoices.filter((row) => selectedIds.includes(row.order.id)),
    [openInvoices, selectedIds]
  );
  const selectedBalance = useMemo(
    () => round2(selectedRows.reduce((sum, row) => sum + row.balance, 0)),
    [selectedRows]
  );
  const currentTotals = useMemo(() => {
    const row = openInvoices.find((entry) => entry.order.id === order.id);
    return (
      row || {
        balance: 0,
        total: 0,
        paid: 0,
      }
    );
  }, [openInvoices, order.id]);

  const [stripeReady, setStripeReady] = useState(false);
  const [quickbooksReady, setQuickbooksReady] = useState(false);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);

  const [step, setStep] = useState<Step>("choose");
  const [selected, setSelected] = useState<MethodChoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [payProvider, setPayProvider] = useState<"stripe" | "quickbooks" | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const [amountDraft, setAmountDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  const manualMethods = useMemo(
    () => normalizePaymentOptions(settings.paymentOptions).methods,
    [settings.paymentOptions]
  );

  const multiSelected = selectedIds.length > 1;

  const choices = useMemo((): MethodChoice[] => {
    const list: MethodChoice[] = [];
    if (stripeReady) {
      list.push({
        kind: "stripe",
        id: "stripe",
        label: multiSelected ? "Card · Stripe (all selected)" : "Card · Stripe",
        description: multiSelected
          ? "One checkout link covering every selected invoice."
          : "Open a secure checkout page so the customer can enter card details.",
      });
    }
    if (quickbooksReady && !multiSelected) {
      list.push({
        kind: "quickbooks",
        id: "quickbooks",
        label: "Card · QuickBooks",
        description: stripeReady
          ? "Push this invoice to QuickBooks and open its payment link."
          : "Push the invoice to QuickBooks and open a payment link for the card.",
      });
    }
    list.push({
      kind: "manual",
      id: "cash",
      label: "Cash",
      description: multiSelected
        ? "Record cash received and mark every selected invoice paid."
        : "Record a cash payment received at the counter.",
      builtIn: "cash",
    });
    for (const method of manualMethods) {
      list.push({
        kind: "manual",
        id: method.id,
        label: method.label,
        description:
          method.details ||
          method.link ||
          (method.kind === "venmo"
            ? "Record a Venmo payment the customer already sent."
            : method.kind === "zelle"
              ? "Record a Zelle payment the customer already sent."
              : "Record a payment received outside card checkout."),
        method,
      });
    }
    return list;
  }, [stripeReady, quickbooksReady, manualMethods, multiSelected]);

  const isPaid = currentTotals.balance <= 0 && currentTotals.total > 0;
  const hasAnyMethod = choices.length > 0;
  const otherOpenCount = openInvoices.filter(
    (row) => row.order.id !== order.id && row.balance > 0
  ).length;

  const reset = useCallback(() => {
    setStep("choose");
    setSelected(null);
    setBusy(false);
    setError(null);
    setPayUrl(null);
    setPayProvider(null);
    setCopied(false);
    setSelectedIds([order.id]);
    setAmountDraft("");
    setNoteDraft("");
  }, [order.id]);

  useEffect(() => {
    if (!open) return;
    reset();
  }, [open, order.id, reset]);

  useEffect(() => {
    if (step !== "record") return;
    setAmountDraft(selectedBalance > 0 ? selectedBalance.toFixed(2) : "");
  }, [selectedBalance, step]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function loadIntegrations() {
      setIntegrationsLoading(true);
      try {
        const token = await getIdToken();
        if (!token) return;
        const [payments, accounting] = await Promise.all([
          fetchPaymentIntegrations(token).catch(() => null),
          fetchAccountingIntegrations(token).catch(() => null),
        ]);
        if (cancelled) return;
        const stripe = payments?.integrations?.find(
          (entry) => entry.provider === "stripe"
        );
        const qb = accounting?.integrations?.find(
          (entry) => entry.provider === "quickbooks"
        );
        setStripeReady(isStripeConnected(stripe));
        setQuickbooksReady(isQuickBooksConnected(qb));
      } catch {
        if (!cancelled) {
          setStripeReady(false);
          setQuickbooksReady(false);
        }
      } finally {
        if (!cancelled) setIntegrationsLoading(false);
      }
    }
    void loadIntegrations();
    return () => {
      cancelled = true;
    };
  }, [open, getIdToken]);

  const toggleInvoice = (orderId: string) => {
    if (orderId === order.id) return;
    setSelectedIds((prev) => {
      if (prev.includes(orderId)) {
        return prev.filter((id) => id !== orderId);
      }
      return [...prev, orderId];
    });
  };

  const handleSelect = async (choice: MethodChoice) => {
    setSelected(choice);
    setError(null);
    setCopied(false);

    if (choice.kind === "manual") {
      setNoteDraft("");
      setStep("record");
      return;
    }

    setStep("link");
    setBusy(true);
    setPayUrl(null);
    setPayProvider(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in.");
      const ids = selectedIds.filter((id) =>
        selectedRows.some((row) => row.order.id === id && row.balance > 0)
      );
      const targetIds = ids.length > 0 ? ids : [order.id];

      if (choice.kind === "stripe") {
        try {
          const result = await createOrderPayLink(token, {
            orderId: order.id,
            orderIds: targetIds,
            provider: "stripe",
          });
          setPayUrl(result.payUrl);
          setPayProvider(result.provider);
        } catch {
          if (targetIds.length > 1) throw new Error(
            "Could not create a bundled Stripe checkout. Try again or record cash."
          );
          const result = await createOrderPaymentCheckout(token, {
            orderId: order.id,
          });
          setPayUrl(result.payUrl);
          setPayProvider("stripe");
        }
      } else {
        const result = await createOrderPayLink(token, {
          orderId: order.id,
          provider: "quickbooks",
        });
        setPayUrl(result.payUrl);
        setPayProvider(result.provider);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create a payment link."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!payUrl) return;
    try {
      await navigator.clipboard.writeText(payUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the link. Select and copy it manually.");
    }
  };

  const handleOpenLink = () => {
    if (!payUrl) return;
    window.open(payUrl, "_blank", "noopener,noreferrer");
  };

  const handleRecord = async (paidInFull = false) => {
    setBusy(true);
    setError(null);
    try {
      const payable = selectedRows.filter((row) => row.balance > 0);
      if (payable.length === 0) {
        setError("Nothing left to collect on the selected invoices.");
        setBusy(false);
        return;
      }

      const methodLabel = selected?.label || "Payment";
      let payments: Array<{ orderId: string; amount: number }>;

      if (paidInFull || multiSelected) {
        payments = payable.map((row) => ({
          orderId: row.order.id,
          amount: row.balance,
        }));
      } else {
        const parsed = Number(amountDraft);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          setError("Enter a payment amount greater than zero.");
          setBusy(false);
          return;
        }
        payments = [
          {
            orderId: order.id,
            amount: round2(Math.min(parsed, currentTotals.balance)),
          },
        ];
      }

      const totalApplied = round2(
        payments.reduce((sum, row) => sum + row.amount, 0)
      );
      await recordInvoicePayments({
        payments,
        method: methodLabel,
        note: noteDraft.trim() || undefined,
        syncQuickBooks: true,
      });

      const invoiceWord =
        payments.length === 1 ? "invoice" : `${payments.length} invoices`;
      onRecorded?.(
        `Recorded ${formatCurrency(totalApplied)} via ${methodLabel} · ${invoiceWord} updated`,
        "success"
      );
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not record the payment."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy && next === false) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton
        className="flex max-h-[min(92vh,780px)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4 pr-12">
          <DialogTitle className={dashboardTaskTitleClass}>
            Add payment
          </DialogTitle>
          <DialogDescription className={dashboardTaskDetailClass}>
            {isPaid && otherOpenCount === 0
              ? "This invoice is paid in full."
              : selectedBalance > 0
                ? `Collecting ${formatCurrency(selectedBalance)}${
                    multiSelected
                      ? ` across ${selectedIds.length} invoices`
                      : ""
                  } · walk-in or counter`
                : "Select open invoices to collect."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isPaid && otherOpenCount === 0 && step === "choose" ? (
            <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
              <span className="flex size-11 items-center justify-center rounded-full border border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]">
                <CheckCircle2 className="size-5" />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-[#303030]">
                  Completed · Paid
                </p>
                <p className={cn("mt-1", dashboardTaskDetailClass)}>
                  {formatCurrency(currentTotals.paid)} received against{" "}
                  {formatCurrency(currentTotals.total)}.
                </p>
              </div>
            </div>
          ) : step === "choose" ? (
            <div className="space-y-4 px-5 py-4">
              {openInvoices.some((row) => row.balance > 0) ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-[13px] font-semibold text-[#303030]">
                      Open invoices
                      {customer?.company ? ` · ${customer.company}` : ""}
                    </p>
                    <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                      Bundle unpaid invoices into one payment when the customer
                      is settling up at the counter.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {openInvoices
                      .filter(
                        (row) => row.balance > 0 || row.order.id === order.id
                      )
                      .map((row) => {
                        const checked = selectedIds.includes(row.order.id);
                        const locked = row.order.id === order.id;
                        const disabled = row.balance <= 0 && !locked;
                        return (
                          <label
                            key={row.order.id}
                            className={cn(
                              dashboardInsetSurfaceClass,
                              "flex cursor-pointer items-center gap-3 px-3 py-2.5",
                              checked && "border-[#2c6ecb]/40 bg-[#f4f7fd]",
                              disabled && "cursor-default opacity-50"
                            )}
                          >
                            <input
                              type="checkbox"
                              className="size-4 rounded border-[#c9cccf]"
                              checked={checked}
                              disabled={locked || disabled || busy}
                              onChange={() => toggleInvoice(row.order.id)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium text-[#303030]">
                                {row.label}
                                {locked ? (
                                  <span className="ml-1.5 text-[11px] font-semibold text-[#2c6ecb]">
                                    This order
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-0.5 block text-[12px] text-[#8a8a8a]">
                                {formatCurrency(row.paid)} paid ·{" "}
                                {formatCurrency(row.total)} total
                              </span>
                            </span>
                            <span
                              className={cn(
                                "shrink-0 text-[13px] font-semibold tabular-nums",
                                row.balance > 0
                                  ? "text-[#8f1f1f]"
                                  : "text-[#0d5c2e]"
                              )}
                            >
                              {formatCurrency(row.balance)}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[#fafafa] px-3 py-2 text-[13px]">
                    <span className="font-medium text-[#616161]">
                      Selected balance
                    </span>
                    <span className="font-semibold tabular-nums text-[#303030]">
                      {formatCurrency(selectedBalance)}
                    </span>
                  </div>
                </div>
              ) : null}

              <div>
                <p className="text-[13px] font-semibold text-[#303030]">
                  How is the customer paying?
                </p>
                <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                  Card links open a payment page. Cash, Venmo, and Zelle record
                  money already received
                  {quickbooksReady
                    ? " and sync the payment to QuickBooks when connected."
                    : "."}
                </p>
              </div>

              {integrationsLoading ? (
                <p className="inline-flex items-center gap-2 text-[13px] text-[#616161]">
                  <Loader2 className="size-3.5 animate-spin" />
                  Checking payment options…
                </p>
              ) : hasAnyMethod ? (
                <div className="space-y-2">
                  {choices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      disabled={busy || selectedBalance <= 0}
                      onClick={() => void handleSelect(choice)}
                      className={cn(
                        dashboardInsetSurfaceClass,
                        "flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:border-[#c9cccf] hover:bg-[#fafafa] disabled:opacity-60"
                      )}
                    >
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f4f7fd] text-[#2c6ecb]">
                        <MethodIcon
                          kind={choice.kind}
                          builtIn={
                            choice.kind === "manual"
                              ? choice.builtIn
                              : undefined
                          }
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-[#303030]">
                          {choice.label}
                        </span>
                        <span className="mt-0.5 block text-[12px] leading-snug text-[#616161]">
                          {choice.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#e3e3e3] px-4 py-5 text-center">
                  <AlertCircle className="mx-auto size-5 text-[#8a8a8a]" />
                  <p className="mt-2 text-[13px] font-semibold text-[#303030]">
                    No payment methods available
                  </p>
                  <p className={cn("mt-1", dashboardTaskDetailClass)}>
                    Connect Stripe or QuickBooks for card payments, or add
                    Venmo / Zelle under Payments settings.
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <Link
                      href="/app/settings/integrations/payments"
                      className={cn(
                        dashboardControlClass,
                        "h-8 px-2.5 text-[12px]"
                      )}
                      onClick={() => onOpenChange(false)}
                    >
                      Payments settings
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : step === "link" ? (
            <div className="space-y-4 px-5 py-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setStep("choose");
                  setSelected(null);
                  setError(null);
                  setPayUrl(null);
                }}
                className={cn(
                  dashboardGhostButtonClass,
                  "-ml-2 h-8 px-2 text-[12px]"
                )}
              >
                <ArrowLeft className="size-3.5" />
                All methods
              </button>

              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#f4f7fd] text-[#2c6ecb]">
                  <MethodIcon kind={selected?.kind || "stripe"} />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#303030]">
                    {selected?.label || "Card payment"}
                  </p>
                  <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                    Open this on a tablet or phone for the walk-in customer.{" "}
                    {formatCurrency(selectedBalance)} due
                    {multiSelected
                      ? ` across ${selectedIds.length} invoices`
                      : ""}
                    .
                  </p>
                </div>
              </div>

              {busy ? (
                <div
                  className={cn(
                    dashboardInsetSurfaceClass,
                    "flex items-center gap-3 px-4 py-5"
                  )}
                >
                  <Loader2 className="size-4 animate-spin text-[#2c6ecb]" />
                  <div>
                    <p className="text-[13px] font-medium text-[#303030]">
                      {selected?.kind === "quickbooks"
                        ? "Pushing invoice to QuickBooks…"
                        : "Creating Stripe checkout…"}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                      This usually takes a few seconds.
                    </p>
                  </div>
                </div>
              ) : payUrl ? (
                <div className="space-y-3">
                  <div
                    className={cn(
                      dashboardInsetSurfaceClass,
                      "space-y-2 px-3.5 py-3"
                    )}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                      {payProvider === "quickbooks"
                        ? "QuickBooks payment link"
                        : "Stripe checkout link"}
                    </p>
                    <p className="break-all font-mono text-[11px] leading-relaxed text-[#616161]">
                      {payUrl}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleOpenLink}
                      className={cn(
                        dashboardPrimaryButtonClass,
                        "h-9 px-3 text-[13px]"
                      )}
                    >
                      <ExternalLink className="size-3.5" />
                      Open payment page
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopy()}
                      className={cn(
                        dashboardControlClass,
                        "h-9 px-3 text-[13px]"
                      )}
                    >
                      <Copy className="size-3.5" />
                      {copied ? "Copied" : "Copy link"}
                    </button>
                  </div>
                  <p className="text-[12px] leading-snug text-[#8a8a8a]">
                    After they pay, invoices update automatically and move to
                    Completed · Paid when the balance clears.
                  </p>
                </div>
              ) : null}

              {error ? (
                <div className="flex gap-2 rounded-lg border border-[#f5c2c2] bg-[#fff1f1] px-3 py-2.5 text-[12px] text-[#b42318]">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  <div className="min-w-0 space-y-2">
                    <p>{error}</p>
                    {selected ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSelect(selected)}
                        className="font-semibold underline-offset-2 hover:underline"
                      >
                        Try again
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4 px-5 py-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setStep("choose");
                  setSelected(null);
                  setError(null);
                }}
                className={cn(
                  dashboardGhostButtonClass,
                  "-ml-2 h-8 px-2 text-[12px]"
                )}
              >
                <ArrowLeft className="size-3.5" />
                All methods
              </button>

              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#f4f7fd] text-[#2c6ecb]">
                  <MethodIcon
                    kind="manual"
                    builtIn={
                      selected?.kind === "manual" ? selected.builtIn : undefined
                    }
                  />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#303030]">
                    Record {selected?.label || "payment"}
                  </p>
                  <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                    {multiSelected
                      ? `Settle ${selectedIds.length} invoices (${formatCurrency(
                          selectedBalance
                        )}) and mark them Completed · Paid.`
                      : `Enter what was received. Balance due ${formatCurrency(
                          selectedBalance
                        )}.`}
                  </p>
                </div>
              </div>

              {multiSelected ? (
                <div
                  className={cn(
                    dashboardInsetSurfaceClass,
                    "divide-y divide-[#ebebeb] overflow-hidden"
                  )}
                >
                  {selectedRows
                    .filter((row) => row.balance > 0)
                    .map((row) => (
                      <div
                        key={row.order.id}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px]"
                      >
                        <span className="truncate font-medium text-[#303030]">
                          {row.label}
                        </span>
                        <span className="shrink-0 tabular-nums text-[#303030]">
                          {formatCurrency(row.balance)}
                        </span>
                      </div>
                    ))}
                </div>
              ) : null}

              {selected?.kind === "manual" &&
              selected.method &&
              (selected.method.link || selected.method.details) ? (
                <div
                  className={cn(
                    dashboardInsetSurfaceClass,
                    "space-y-1.5 px-3.5 py-3"
                  )}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                    Shop {selected.label} details
                  </p>
                  {selected.method.details ? (
                    <p className="text-[13px] text-[#303030]">
                      {selected.method.details}
                    </p>
                  ) : null}
                  {selected.method.link ? (
                    <a
                      href={selected.method.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#2c6ecb] hover:underline"
                    >
                      Open {selected.label}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </div>
              ) : null}

              {!multiSelected ? (
                <div className="space-y-3">
                  <div>
                    <Label
                      htmlFor="add-payment-amount"
                      className="text-[12px] font-medium text-[#616161]"
                    >
                      Amount received
                    </Label>
                    <div className="relative mt-1.5">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#8a8a8a]">
                        $
                      </span>
                      <Input
                        id="add-payment-amount"
                        type="number"
                        min={0}
                        step="0.01"
                        value={amountDraft}
                        disabled={busy}
                        onChange={(event) => setAmountDraft(event.target.value)}
                        className="h-10 rounded-lg border-[#e3e3e3] pl-7 text-[14px]"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div>
                    <Label
                      htmlFor="add-payment-note"
                      className="text-[12px] font-medium text-[#616161]"
                    >
                      Note{" "}
                      <span className="font-normal text-[#8a8a8a]">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="add-payment-note"
                      value={noteDraft}
                      disabled={busy}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      className="mt-1.5 h-10 rounded-lg border-[#e3e3e3] text-[13px]"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label
                    htmlFor="add-payment-note-multi"
                    className="text-[12px] font-medium text-[#616161]"
                  >
                    Note{" "}
                    <span className="font-normal text-[#8a8a8a]">(optional)</span>
                  </Label>
                  <Input
                    id="add-payment-note-multi"
                    value={noteDraft}
                    disabled={busy}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    className="mt-1.5 h-10 rounded-lg border-[#e3e3e3] text-[13px]"
                  />
                </div>
              )}

              {quickbooksReady ? (
                <p className="text-[12px] leading-snug text-[#8a8a8a]">
                  QuickBooks is connected — we&apos;ll push a Payment against
                  the linked invoices when you record this.
                </p>
              ) : null}

              {error ? (
                <div className="flex gap-2 rounded-lg border border-[#f5c2c2] bg-[#fff1f1] px-3 py-2.5 text-[12px] text-[#b42318]">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  <p>{error}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {step === "record" ? (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
            {!multiSelected ? (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                className="h-9 rounded-lg"
                onClick={() => void handleRecord(true)}
              >
                Mark paid in full
              </Button>
            ) : (
              <span className="text-[12px] text-[#8a8a8a]">
                Clears selected balances
              </span>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                className="h-9 rounded-lg"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRecord(multiSelected)}
                className={cn(
                  dashboardPrimaryButtonClass,
                  "h-9 px-3 text-[13px] disabled:opacity-60"
                )}
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {multiSelected
                  ? `Record ${formatCurrency(selectedBalance)}`
                  : "Record payment"}
              </button>
            </div>
          </div>
        ) : step === "link" && payUrl ? (
          <div className="flex shrink-0 justify-end gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-lg"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="flex shrink-0 justify-end border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-lg"
              onClick={() => onOpenChange(false)}
            >
              {isPaid && otherOpenCount === 0 ? "Close" : "Cancel"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
