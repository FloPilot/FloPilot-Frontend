"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Plug,
  Truck,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  connectSanMarIntegration,
  connectSsActivewearIntegration,
  disconnectSupplierIntegration,
  fetchSupplierIntegrations,
  verifySupplierIntegration,
} from "@/lib/api";
import {
  isSupplierIntegrationUsable,
  type SupplierIntegration,
  type SupplierProviderId,
} from "@/lib/supplier-integrations";
import { cn } from "@/lib/utils";

type SupplierCardConfig = {
  provider?: SupplierProviderId;
  name: string;
  description: string;
  available: boolean;
};

const SUPPLIER_CARDS: SupplierCardConfig[] = [
  {
    provider: "ssActivewear",
    name: "S&S Activewear",
    description: "Sync catalog products, account pricing, and live inventory.",
    available: true,
  },
  {
    provider: "sanMar",
    name: "SanMar",
    description: "Pull blanks, live inventory, and net pricing into orders.",
    available: true,
  },
  {
    name: "SLC Activewear",
    description: "Import styles, colors, and tiered cost as you build orders.",
    available: false,
  },
  {
    name: "AS Colour",
    description: "Bring in premium blanks with up-to-date availability.",
    available: false,
  },
];

function statusBadge(integration?: SupplierIntegration) {
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

function upsertIntegration(
  current: SupplierIntegration[],
  next: SupplierIntegration
) {
  const others = current.filter((entry) => entry.provider !== next.provider);
  return [...others, next];
}

export function IntegrationsSection() {
  const { getIdToken } = useAuth();
  const [integrations, setIntegrations] = useState<SupplierIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogProvider, setDialogProvider] =
    useState<SupplierProviderId | null>(null);
  const [saving, setSaving] = useState(false);
  const [disconnectingProvider, setDisconnectingProvider] =
    useState<SupplierProviderId | null>(null);
  const [verifyingProvider, setVerifyingProvider] =
    useState<SupplierProviderId | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // S&S fields
  const [accountNumber, setAccountNumber] = useState("");
  const [apiKey, setApiKey] = useState("");

  // SanMar fields
  const [customerNumber, setCustomerNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const ssIntegration = useMemo(
    () => integrations.find((entry) => entry.provider === "ssActivewear"),
    [integrations]
  );
  const sanMarIntegration = useMemo(
    () => integrations.find((entry) => entry.provider === "sanMar"),
    [integrations]
  );

  const loadIntegrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const { integrations: next } = await fetchSupplierIntegrations(token);
      setIntegrations(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load integrations");
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  useEffect(() => {
    if (loading || verifyingProvider) return;

    const errored = [ssIntegration, sanMarIntegration].filter(
      (entry) =>
        entry &&
        isSupplierIntegrationUsable(entry) &&
        entry.status === "error"
    ) as SupplierIntegration[];

    if (errored.length === 0) return;

    let cancelled = false;

    async function autoVerify() {
      for (const entry of errored) {
        const provider = entry.provider as SupplierProviderId;
        setVerifyingProvider(provider);
        try {
          const token = await getIdToken();
          if (!token || cancelled) return;
          const { integration } = await verifySupplierIntegration(
            token,
            provider
          );
          if (!cancelled) {
            setIntegrations((current) => upsertIntegration(current, integration));
          }
        } catch {
          // Keep showing the stored error until the user retries manually.
        } finally {
          if (!cancelled) setVerifyingProvider(null);
        }
      }
    }

    void autoVerify();
    return () => {
      cancelled = true;
    };
  }, [loading, verifyingProvider, ssIntegration, sanMarIntegration, getIdToken]);

  const openConnectDialog = (provider: SupplierProviderId) => {
    setFormError(null);
    setDialogProvider(provider);
    if (provider === "ssActivewear") {
      setAccountNumber(ssIntegration?.accountNumber || "");
      setApiKey("");
    } else {
      setCustomerNumber(sanMarIntegration?.customerNumber || "");
      setUsername(sanMarIntegration?.username || "");
      setPassword("");
    }
  };

  const handleConnect = async () => {
    if (!dialogProvider) return;
    setSaving(true);
    setFormError(null);
    try {
      const token = await getIdToken();
      if (!token) return;

      const { integration } =
        dialogProvider === "ssActivewear"
          ? await connectSsActivewearIntegration(token, {
              accountNumber: accountNumber.trim(),
              apiKey: apiKey.trim(),
            })
          : await connectSanMarIntegration(token, {
              customerNumber: customerNumber.trim(),
              username: username.trim(),
              password: password.trim(),
            });

      setIntegrations((current) => upsertIntegration(current, integration));
      setDialogProvider(null);
      setApiKey("");
      setPassword("");
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : `Could not connect ${dialogProvider === "sanMar" ? "SanMar" : "S&S Activewear"}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (provider: SupplierProviderId) => {
    setVerifyingProvider(provider);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const { integration } = await verifySupplierIntegration(token, provider);
      setIntegrations((current) => upsertIntegration(current, integration));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not verify integration"
      );
    } finally {
      setVerifyingProvider(null);
    }
  };

  const handleDisconnect = async (provider: SupplierProviderId) => {
    setDisconnectingProvider(provider);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const { integration } = await disconnectSupplierIntegration(
        token,
        provider
      );
      setIntegrations((current) => upsertIntegration(current, integration));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not disconnect integration"
      );
    } finally {
      setDisconnectingProvider(null);
    }
  };

  const connectDisabled =
    dialogProvider === "ssActivewear"
      ? !accountNumber.trim() || !apiKey.trim()
      : !customerNumber.trim() || !username.trim() || !password.trim();

  return (
    <SettingsMain>
      <SettingsHeader
        title="Supplier integrations"
        description="Connect your wholesale suppliers to pull blanks and vendor pricing straight into orders."
      />

      <SettingsPanel
        title="Connected suppliers"
        description="Each shop connects its own supplier accounts so pricing and inventory reflect your negotiated rates."
      >
        <div className="flex items-start gap-3 rounded-lg border border-[#dbe6ff] bg-[#f4f7ff] px-4 py-3 text-[13px] text-[#3a4a6b]">
          <Plug className="mt-0.5 size-4 shrink-0 text-brand-primary" />
          <p>
            S&amp;S and SanMar are live. S&amp;S uses API credentials from{" "}
            <a
              className="inline-flex items-center gap-1 font-medium text-brand-primary"
              href="https://www.ssactivewear.com/myaccount/"
              target="_blank"
              rel="noreferrer"
            >
              My Account
              <ExternalLink className="size-3" />
            </a>
            . SanMar uses your SanMar.com login after web services access is
            enabled — email{" "}
            <a
              className="font-medium text-brand-primary"
              href="mailto:sanmarintegrations@sanmar.com"
            >
              sanmarintegrations@sanmar.com
            </a>{" "}
            if you haven’t been onboarded yet. For QuickBooks, use{" "}
            <Link
              href="/app/settings/integrations/accounting"
              className="font-medium text-brand-primary hover:underline"
            >
              Accounting
            </Link>
            .
          </p>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-[#f3d6d6] bg-[#fdf2f2] px-4 py-3 text-[13px] text-[#b42318]">
            {error}
          </div>
        ) : null}
      </SettingsPanel>

      <div className="grid gap-4 sm:grid-cols-2">
        {SUPPLIER_CARDS.map((supplier) => {
          const integration = supplier.provider
            ? integrations.find((entry) => entry.provider === supplier.provider)
            : undefined;
          const badge = statusBadge(integration);
          const BadgeIcon = badge.icon;
          const provider = supplier.provider;
          const usable =
            provider != null && isSupplierIntegrationUsable(integration, provider);
          const verifying = provider != null && verifyingProvider === provider;
          const disconnecting =
            provider != null && disconnectingProvider === provider;

          return (
            <div
              key={supplier.name}
              className={cn(
                "flex flex-col justify-between gap-4 rounded-lg border px-4 py-4",
                usable
                  ? "border-[#cfe0d4] bg-[#f8fcf9]"
                  : "border-dashed border-[#d4d4d4] bg-[#fafafa]"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#8a8a8a] shadow-sm">
                    <Truck className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#303030]">
                      {supplier.name}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#616161]">
                      {supplier.description}
                    </p>
                    {provider === "ssActivewear" &&
                    integration?.accountNumber ? (
                      <p className="mt-2 text-[11px] text-[#616161]">
                        API Username {integration.accountNumber}
                        {integration.lastVerifiedAt
                          ? ` · Verified ${formatTimestamp(integration.lastVerifiedAt)}`
                          : null}
                      </p>
                    ) : null}
                    {provider === "sanMar" &&
                    (integration?.customerNumber || integration?.username) ? (
                      <p className="mt-2 text-[11px] text-[#616161]">
                        {integration.customerNumber
                          ? `Customer #${integration.customerNumber}`
                          : null}
                        {integration.username
                          ? `${integration.customerNumber ? " · " : ""}${integration.username}`
                          : null}
                        {integration.lastVerifiedAt
                          ? ` · Verified ${formatTimestamp(integration.lastVerifiedAt)}`
                          : null}
                      </p>
                    ) : null}
                    {usable && integration?.lastError ? (
                      <p className="mt-1 text-[11px] text-[#b42318]">
                        {integration.lastError}
                      </p>
                    ) : null}
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    badge.className
                  )}
                >
                  <BadgeIcon className="size-3" />
                  {loading && provider ? "Loading" : badge.label}
                </span>
              </div>

              {supplier.available && provider ? (
                <div className="flex flex-wrap gap-2">
                  {usable ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleVerify(provider)}
                      disabled={verifying}
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Testing…
                        </>
                      ) : (
                        "Test connection"
                      )}
                    </Button>
                  ) : null}
                  <Button size="sm" onClick={() => openConnectDialog(provider)}>
                    {usable ? "Update credentials" : "Connect"}
                  </Button>
                  {usable ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleDisconnect(provider)}
                      disabled={disconnecting}
                    >
                      {disconnecting ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Disconnecting
                        </>
                      ) : (
                        <>
                          <Unplug className="size-3.5" />
                          Disconnect
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#ededed] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#7a7a7a]">
                  <Clock className="size-3" />
                  Soon
                </span>
              )}
            </div>
          );
        })}
      </div>

      <SettingsPanel
        title="Custom or in-house catalog"
        description="Not using a supported supplier? Manual products keep working exactly as today."
      >
        <div className="flex items-center gap-3 text-[13px] text-[#616161]">
          <Boxes className="size-4 shrink-0 text-[#8a8a8a]" />
          Keep adding products by hand from any order — no integration required.
        </div>
      </SettingsPanel>

      <Dialog
        open={Boolean(dialogProvider)}
        onOpenChange={(open) => !open && setDialogProvider(null)}
      >
        <DialogContent className="sm:max-w-lg">
          {dialogProvider === "ssActivewear" ? (
            <>
              <DialogHeader>
                <DialogTitle>Connect S&amp;S Activewear</DialogTitle>
                <DialogDescription>
                  Enter the API username and API password from your S&amp;S My
                  Account page. Credentials are encrypted and only used
                  server-side to fetch your catalog and pricing.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="ss-account-number">API Username</Label>
                  <Input
                    id="ss-account-number"
                    value={accountNumber}
                    onChange={(event) => setAccountNumber(event.target.value)}
                    placeholder="Your S&S API Username"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ss-api-key">API Password</Label>
                  <Input
                    id="ss-api-key"
                    type="password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="Your S&S API key"
                    autoComplete="new-password"
                  />
                </div>
                {formError ? (
                  <p className="text-sm text-[#b42318]">{formError}</p>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Connect SanMar</DialogTitle>
                <DialogDescription>
                  Use your SanMar customer number plus the SanMar.com username
                  and password for an account that has web services access.
                  Request access from{" "}
                  <a
                    className="font-medium text-brand-primary"
                    href="mailto:sanmarintegrations@sanmar.com"
                  >
                    sanmarintegrations@sanmar.com
                  </a>{" "}
                  if needed. Credentials are encrypted server-side.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="sanmar-customer-number">
                    SanMar customer number
                  </Label>
                  <Input
                    id="sanmar-customer-number"
                    value={customerNumber}
                    onChange={(event) => setCustomerNumber(event.target.value)}
                    placeholder="e.g. 123456"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sanmar-username">SanMar.com username</Label>
                  <Input
                    id="sanmar-username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Your SanMar.com login"
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sanmar-password">SanMar.com password</Label>
                  <Input
                    id="sanmar-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Your SanMar.com password"
                    autoComplete="current-password"
                  />
                </div>
                {formError ? (
                  <p className="text-sm text-[#b42318]">{formError}</p>
                ) : null}
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogProvider(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleConnect()}
              disabled={saving || connectDisabled}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Connecting
                </>
              ) : (
                "Save connection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsMain>
  );
}
