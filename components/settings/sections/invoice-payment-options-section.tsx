"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Link2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import {
  SettingsPanel,
} from "@/components/settings/settings-kit";
import { useAuth } from "@/components/providers/auth-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchAccountingIntegrations,
  fetchPaymentIntegrations,
} from "@/lib/api";
import { isQuickBooksConnected } from "@/lib/accounting-integrations";
import { isStripeConnected } from "@/lib/payment-integrations";
import {
  PAYMENT_METHOD_KIND_OPTIONS,
  createPaymentMethodId,
  normalizePaymentOptions,
  type ShopPaymentMethod,
  type ShopPaymentMethodKind,
  type ShopPaymentOptions,
} from "@/lib/shop-payment-options";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

function emptyMethod(kind: ShopPaymentMethodKind): ShopPaymentMethod {
  const labels: Record<ShopPaymentMethodKind, string> = {
    venmo: "Venmo",
    zelle: "Zelle",
    custom: "Other",
  };
  return {
    id: createPaymentMethodId(),
    kind,
    label: labels[kind],
    defaultOnInvoice: true,
  };
}

export function InvoicePaymentOptionsSection() {
  const { getIdToken } = useAuth();
  const { settings, updateSettings } = useShopSettings();
  const [draft, setDraft] = useState<ShopPaymentOptions>(() =>
    normalizePaymentOptions(settings.paymentOptions)
  );
  const [stripeAvailable, setStripeAvailable] = useState(false);
  const [quickbooksAvailable, setQuickbooksAvailable] = useState(false);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setDraft(normalizePaymentOptions(settings.paymentOptions));
  }, [settings.paymentOptions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingIntegrations(true);
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
        setStripeAvailable(isStripeConnected(stripe));
        const qb = accounting?.integrations?.find(
          (entry) => entry.provider === "quickbooks"
        );
        setQuickbooksAvailable(isQuickBooksConnected(qb));
      } finally {
        if (!cancelled) setLoadingIntegrations(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getIdToken]);

  const dirty = useMemo(() => {
    const current = normalizePaymentOptions(settings.paymentOptions);
    return JSON.stringify(current) !== JSON.stringify(draft);
  }, [settings.paymentOptions, draft]);

  const updateMethod = (
    id: string,
    patch: Partial<ShopPaymentMethod>
  ) => {
    setDraft((prev) => ({
      ...prev,
      methods: prev.methods.map((method) =>
        method.id === id ? { ...method, ...patch } : method
      ),
    }));
    setSavedFlash(false);
  };

  const removeMethod = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      methods: prev.methods.filter((method) => method.id !== id),
    }));
    setSavedFlash(false);
  };

  const addMethod = (kind: ShopPaymentMethodKind) => {
    setDraft((prev) => ({
      ...prev,
      methods: [...prev.methods, emptyMethod(kind)],
    }));
    setSavedFlash(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const normalized = normalizePaymentOptions(draft);
      await updateSettings({ paymentOptions: normalized });
      setDraft(normalized);
      setSavedFlash(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save payment options."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPanel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-[#303030]">
            Invoice payment options
          </h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[#616161]">
            Choose what customers see when you send an invoice — card (Stripe),
            QuickBooks pay link, Venmo, Zelle, or anything else. Defaults apply
            on every send; you can still turn options off per invoice.
          </p>
        </div>
        <Button
          type="button"
          className={cn(dashboardPrimaryButtonClass, "h-9 shrink-0")}
          disabled={!dirty || saving}
          onClick={() => void handleSave()}
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {saving ? "Saving…" : "Save payment options"}
        </Button>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-[#f3d6d6] bg-[#fdf2f2] px-3 py-2.5 text-[13px] text-[#b42318]">
          {error}
        </div>
      ) : null}
      {savedFlash && !dirty ? (
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#cdeccd] bg-[#f1faf1] px-3 py-2 text-[12px] font-medium text-[#0d5c2e]">
          <CheckCircle2 className="size-3.5" />
          Payment options saved
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
          Defaults on every invoice
        </p>

        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3",
            stripeAvailable
              ? "border-[#ebebeb] bg-white"
              : "border-dashed border-[#e3e3e3] bg-[#fafafa] opacity-70"
          )}
        >
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-[#c9c9c9] text-[#2c6ecb] focus:ring-[#2c6ecb]/30"
            checked={draft.stripeDefaultOnInvoice}
            disabled={!stripeAvailable || loadingIntegrations}
            onChange={(event) => {
              setDraft((prev) => ({
                ...prev,
                stripeDefaultOnInvoice: event.target.checked,
              }));
              setSavedFlash(false);
            }}
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[#303030]">
              <CreditCard className="size-3.5 text-[#635bff]" />
              Pay by card (Stripe)
            </span>
            <span className="mt-0.5 block text-[12px] text-[#8a8a8a]">
              {stripeAvailable
                ? "Attach a Stripe checkout link when sending invoices."
                : "Connect Stripe below to enable card pay links."}
            </span>
          </span>
        </label>

        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3",
            quickbooksAvailable
              ? "border-[#ebebeb] bg-white"
              : "border-dashed border-[#e3e3e3] bg-[#fafafa] opacity-70"
          )}
        >
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-[#c9c9c9] text-[#2c6ecb] focus:ring-[#2c6ecb]/30"
            checked={draft.quickbooksDefaultOnInvoice}
            disabled={!quickbooksAvailable || loadingIntegrations}
            onChange={(event) => {
              setDraft((prev) => ({
                ...prev,
                quickbooksDefaultOnInvoice: event.target.checked,
              }));
              setSavedFlash(false);
            }}
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[#303030]">
              <Link2 className="size-3.5 text-[#2ca01c]" />
              QuickBooks pay link
            </span>
            <span className="mt-0.5 block text-[12px] text-[#8a8a8a]">
              {quickbooksAvailable
                ? "Push the invoice to QuickBooks and attach its payment link."
                : "Connect QuickBooks under Accounting to enable this."}
            </span>
          </span>
        </label>

        {draft.methods.map((method) => (
          <div
            key={method.id}
            className="space-y-3 rounded-xl border border-[#ebebeb] bg-white px-3.5 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 rounded border-[#c9c9c9] text-[#2c6ecb] focus:ring-[#2c6ecb]/30"
                  checked={method.defaultOnInvoice}
                  onChange={(event) =>
                    updateMethod(method.id, {
                      defaultOnInvoice: event.target.checked,
                    })
                  }
                />
                <span className="min-w-0 flex-1 space-y-2">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    {method.kind === "venmo"
                      ? "Venmo"
                      : method.kind === "zelle"
                        ? "Zelle"
                        : "Custom"}{" "}
                    · default on invoice
                  </span>
                  <Input
                    value={method.label}
                    onChange={(event) =>
                      updateMethod(method.id, { label: event.target.value })
                    }
                    className="h-9 border-[#e3e3e3] text-[13px] shadow-none"
                    aria-label="Payment method label"
                  />
                </span>
              </label>
              <Button
                type="button"
                variant="ghost"
                className="h-8 shrink-0 px-2 text-[#8a8a8a] hover:text-[#b42318]"
                onClick={() => removeMethod(method.id)}
                aria-label={`Remove ${method.label}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>

            {method.kind === "venmo" || method.kind === "custom" ? (
              <div className="space-y-1.5 pl-7">
                <Label className="text-[11px] font-medium text-[#8a8a8a]">
                  {method.kind === "venmo" ? "Venmo link" : "Payment link"}
                </Label>
                <Input
                  value={method.link || ""}
                  onChange={(event) =>
                    updateMethod(method.id, { link: event.target.value })
                  }
                  className="h-9 border-[#e3e3e3] text-[13px] shadow-none"
                />
              </div>
            ) : null}

            {method.kind === "zelle" || method.kind === "custom" ? (
              <div className="space-y-1.5 pl-7">
                <Label className="text-[11px] font-medium text-[#8a8a8a]">
                  {method.kind === "zelle"
                    ? "Zelle details"
                    : "Instructions"}
                </Label>
                <Textarea
                  value={method.details || ""}
                  onChange={(event) =>
                    updateMethod(method.id, { details: event.target.value })
                  }
                  className="min-h-[64px] resize-none border-[#e3e3e3] text-[13px] shadow-none"
                />
              </div>
            ) : null}

            {method.kind === "venmo" ? (
              <div className="space-y-1.5 pl-7">
                <Label className="text-[11px] font-medium text-[#8a8a8a]">
                  Optional note
                </Label>
                <Input
                  value={method.details || ""}
                  onChange={(event) =>
                    updateMethod(method.id, { details: event.target.value })
                  }
                  className="h-9 border-[#e3e3e3] text-[13px] shadow-none"
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {PAYMENT_METHOD_KIND_OPTIONS.map((option) => (
          <Button
            key={option.kind}
            type="button"
            className={cn(dashboardControlClass, "h-8 text-[12px]")}
            onClick={() => addMethod(option.kind)}
          >
            <Plus className="size-3.5" />
            Add {option.label}
          </Button>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-[#8a8a8a]">
        Checked options are selected by default when staff send an invoice.
        They can still uncheck any option for a specific customer.
      </p>
    </SettingsPanel>
  );
}
