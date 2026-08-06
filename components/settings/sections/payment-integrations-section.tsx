"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  Unplug,
} from "lucide-react";
import {
  SettingsHeader,
  SettingsMain,
  SettingsPanel,
} from "@/components/settings/settings-kit";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  disconnectStripe,
  fetchPaymentIntegrations,
  refreshStripeConnect,
  startStripeConnect,
} from "@/lib/api";
import {
  isStripeConnected,
  type PaymentIntegration,
} from "@/lib/payment-integrations";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

function statusBadge(integration?: PaymentIntegration) {
  if (!integration || integration.status === "disconnected") {
    return {
      label: "Not connected",
      className: "bg-[#ededed] text-[#7a7a7a]",
      icon: Clock,
    };
  }
  if (integration.status === "error") {
    return {
      label: "Needs attention",
      className: "bg-[#fff5ea] text-[#8a6116]",
      icon: AlertCircle,
    };
  }
  if (integration.status === "pending" || !integration.chargesEnabled) {
    return {
      label: "Finish setup",
      className: "bg-[#eef3ff] text-[#2c6ecb]",
      icon: Clock,
    };
  }
  return {
    label: "Connected",
    className: "bg-[#e8f5ee] text-[#0d5c2e]",
    icon: CheckCircle2,
  };
}

function formatTimestamp(value?: string | null) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function PaymentIntegrationsSection() {
  const { getIdToken } = useAuth();
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<PaymentIntegration[]>([]);
  const [appConfigured, setAppConfigured] = useState(true);
  const [mode, setMode] = useState<"test" | "live">("test");
  const [platformFeePercent, setPlatformFeePercent] = useState(3.95);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const stripe = useMemo(
    () => integrations.find((entry) => entry.provider === "stripe"),
    [integrations]
  );
  const connected = isStripeConnected(stripe);
  const badge = statusBadge(stripe);
  const BadgeIcon = badge.icon;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in.");
      const result = await fetchPaymentIntegrations(token);
      setIntegrations(result.integrations || []);
      setAppConfigured(result.appConfigured !== false);
      setMode(result.mode === "live" ? "live" : "test");
      if (typeof result.platformFeePercent === "number") {
        setPlatformFeePercent(result.platformFeePercent);
      } else if (
        typeof result.integrations?.[0]?.platformFeePercent === "number"
      ) {
        setPlatformFeePercent(result.integrations[0].platformFeePercent);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load payment integrations."
      );
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const stripeParam = searchParams.get("stripe");
    if (!stripeParam) return;

    let cancelled = false;
    async function finishReturn() {
      setRefreshing(true);
      setError(null);
      try {
        const token = await getIdToken();
        if (!token) throw new Error("You must be signed in.");
        const result = await refreshStripeConnect(token);
        if (cancelled) return;
        setIntegrations([result.integration]);
        if (isStripeConnected(result.integration)) {
          setBanner(
            "Stripe is connected. Invoice emails and the customer portal can now accept card payments."
          );
        } else if (stripeParam === "refresh") {
          setBanner(
            "Stripe onboarding needs to be finished. Click Continue setup to pick up where you left off."
          );
        } else {
          setBanner(
            "Thanks — Stripe still needs a few details before card payments go live. Continue setup when you’re ready."
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not refresh Stripe connection."
          );
        }
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }

    void finishReturn();
    return () => {
      cancelled = true;
    };
  }, [getIdToken, searchParams]);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    setBanner(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in.");
      const result = await startStripeConnect(token);
      if (result.authorizeUrl) {
        window.location.href = result.authorizeUrl;
        return;
      }
      setError("Stripe did not return an onboarding link.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start Stripe Connect."
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in.");
      const result = await refreshStripeConnect(token);
      setIntegrations([result.integration]);
      setBanner(
        isStripeConnected(result.integration)
          ? "Stripe connection verified."
          : "Stripe status updated. Finish onboarding if card payments are still pending."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not refresh Stripe connection."
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !window.confirm(
        "Disconnect Stripe? Customers will no longer be able to pay invoices by card until you reconnect."
      )
    ) {
      return;
    }
    setDisconnecting(true);
    setError(null);
    setBanner(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in.");
      const result = await disconnectStripe(token);
      setIntegrations([result.integration]);
      setBanner("Stripe disconnected from this shop.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not disconnect Stripe."
      );
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <SettingsMain>
      <SettingsHeader
        title="Payments"
        description="Connect Stripe so customers can pay open invoices by card from email and the customer portal. Payouts go straight to your Stripe account."
      />

      {!appConfigured ? (
        <div className="mb-4 rounded-xl border border-[#f0d9a8] bg-[#fff8eb] px-4 py-3 text-[13px] text-[#8a6116]">
          Stripe keys are not configured on this environment yet. Add{" "}
          <code className="rounded bg-white/70 px-1.5 py-0.5 text-[12px]">
            STRIPE_SECRET_KEY
          </code>{" "}
          on the backend, then refresh this page.
        </div>
      ) : null}

      {banner ? (
        <div className="mb-4 rounded-xl border border-[#cdeccd] bg-[#f1faf1] px-4 py-3 text-[13px] text-[#0d5c2e]">
          {banner}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-[#f3d6d6] bg-[#fdf2f2] px-4 py-3 text-[13px] text-[#b42318]">
          {error}
        </div>
      ) : null}

      <SettingsPanel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#635bff]/10 text-[#635bff]">
              <CreditCard className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-semibold text-[#303030]">
                  Stripe
                </h2>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                    badge.className
                  )}
                >
                  <BadgeIcon className="size-3" />
                  {badge.label}
                </span>
                {mode === "test" ? (
                  <span className="rounded-md bg-[#f4f4f5] px-2 py-0.5 text-[11px] font-medium text-[#616161]">
                    Test mode
                  </span>
                ) : null}
              </div>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#616161]">
                Express Connect lets each shop collect card payments under their
                own Stripe account. Invoice emails, the customer portal, and
                client store checkouts can all accept cards. Funds deposit to
                your Stripe balance.
              </p>
            </div>
          </div>
        </div>

        {connected ? (
          <div className="mt-4 rounded-xl border border-[#ebebeb] bg-[#fafafa] px-4 py-3.5">
            <p className="text-[13px] font-semibold text-[#303030]">
              Client store fee
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#616161]">
              FloPilot takes{" "}
              <span className="font-semibold text-[#303030]">
                {platformFeePercent}%
              </span>{" "}
              of each paid client-store order as an application fee (similar to
              Order My Gear). Shoppers pay your listed prices — the fee comes
              out of your payout, along with Stripe’s card processing fee. Invoice
              payments from the portal do not include this store fee.
            </p>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-[13px] text-[#616161]">
            <Loader2 className="size-4 animate-spin" />
            Loading payment settings…
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {connected || stripe?.accountId ? (
              <div className="rounded-xl border border-[#ebebeb] bg-[#fafafa] px-4 py-3.5">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      Business
                    </dt>
                    <dd className="mt-0.5 text-[13px] font-medium text-[#303030]">
                      {stripe?.businessName || "Stripe account"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      Account
                    </dt>
                    <dd className="mt-0.5 font-mono text-[12px] text-[#616161]">
                      {stripe?.accountId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      Charges
                    </dt>
                    <dd className="mt-0.5 text-[13px] text-[#303030]">
                      {stripe?.chargesEnabled ? "Enabled" : "Not yet enabled"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      Payouts
                    </dt>
                    <dd className="mt-0.5 text-[13px] text-[#303030]">
                      {stripe?.payoutsEnabled ? "Enabled" : "Not yet enabled"}
                    </dd>
                  </div>
                  {stripe?.connectedAt ? (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                        Connected
                      </dt>
                      <dd className="mt-0.5 text-[13px] text-[#303030]">
                        {formatTimestamp(stripe.connectedAt)}
                      </dd>
                    </div>
                  ) : null}
                  {stripe?.lastVerifiedAt ? (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                        Last checked
                      </dt>
                      <dd className="mt-0.5 text-[13px] text-[#303030]">
                        {formatTimestamp(stripe.lastVerifiedAt)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {stripe?.lastError ? (
                  <p className="mt-3 text-[12px] font-medium text-[#b42318]">
                    {stripe.lastError}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#d8d8d8] bg-[#fcfcfc] px-4 py-5">
                <p className="text-[13px] font-semibold text-[#303030]">
                  Accept card payments on invoices
                </p>
                <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[13px] leading-relaxed text-[#616161]">
                  <li>Connect your Stripe account (takes a few minutes).</li>
                  <li>Send an invoice from any order as usual.</li>
                  <li>
                    Customers pay by card from the email or their portal — funds
                    deposit to your Stripe balance.
                  </li>
                </ol>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {!connected ? (
                <Button
                  type="button"
                  disabled={!appConfigured || connecting || refreshing}
                  onClick={() => void handleConnect()}
                  className={cn(dashboardPrimaryButtonClass, "h-9 px-4")}
                >
                  {connecting || refreshing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : null}
                  {stripe?.accountId ? "Continue setup" : "Connect Stripe"}
                </Button>
              ) : null}

              {stripe?.accountId ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={refreshing || connecting}
                  onClick={() => void handleRefresh()}
                  className={cn(dashboardControlClass, "h-9 px-3")}
                >
                  {refreshing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5" />
                  )}
                  Refresh status
                </Button>
              ) : null}

              {stripe?.accountId ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={disconnecting}
                  onClick={() => void handleDisconnect()}
                  className={cn(
                    dashboardControlClass,
                    "h-9 px-3 text-[#b42318] hover:text-[#b42318]"
                  )}
                >
                  {disconnecting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Unplug className="size-3.5" />
                  )}
                  Disconnect
                </Button>
              ) : null}

              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noreferrer"
                className={cn(
                  dashboardControlClass,
                  "inline-flex h-9 items-center gap-1.5 px-3 text-[13px]"
                )}
              >
                Stripe Dashboard
                <ExternalLink className="size-3.5" />
              </a>
            </div>

            {connected ? (
              <p className="text-[12px] leading-relaxed text-[#8a8a8a]">
                Tip: after connecting, send a test invoice on a ready-to-invoice
                order. The customer email will include{" "}
                <span className="font-medium text-[#616161]">Pay now</span>, and
                the same button appears in the customer portal invoice view. You
                can also create a pay link from the order Payment tab.
              </p>
            ) : null}
          </div>
        )}
      </SettingsPanel>

      <p className="mt-4 text-[12px] text-[#8a8a8a]">
        Looking for QuickBooks?{" "}
        <Link
          href="/app/settings/integrations/accounting"
          className="font-medium text-brand-primary hover:underline"
        >
          Accounting integrations
        </Link>
      </p>
    </SettingsMain>
  );
}
