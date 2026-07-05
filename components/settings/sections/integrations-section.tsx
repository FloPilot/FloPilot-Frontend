"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  connectSsActivewearIntegration,
  disconnectSupplierIntegration,
  fetchSupplierIntegrations,
} from "@/lib/api";
import type {
  SupplierIntegration,
  SupplierProviderId,
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
    name: "SanMar",
    description: "Pull blanks, live inventory, and net pricing into orders.",
    available: false,
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

export function IntegrationsSection() {
  const { getIdToken } = useAuth();
  const [integrations, setIntegrations] = useState<SupplierIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [apiKey, setApiKey] = useState("");

  const ssIntegration = useMemo(
    () => integrations.find((entry) => entry.provider === "ssActivewear"),
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

  const openConnectDialog = () => {
    setAccountNumber(ssIntegration?.accountNumber || "");
    setApiKey("");
    setFormError(null);
    setDialogOpen(true);
  };

  const handleConnect = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const token = await getIdToken();
      if (!token) return;

      const { integration } = await connectSsActivewearIntegration(token, {
        accountNumber: accountNumber.trim(),
        apiKey: apiKey.trim(),
      });

      setIntegrations((current) => {
        const others = current.filter((entry) => entry.provider !== "ssActivewear");
        return [...others, integration];
      });
      setDialogOpen(false);
      setApiKey("");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not connect S&S Activewear"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;

      const { integration } = await disconnectSupplierIntegration(
        token,
        "ssActivewear"
      );

      setIntegrations((current) => {
        const others = current.filter((entry) => entry.provider !== "ssActivewear");
        return [...others, integration];
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not disconnect S&S Activewear"
      );
    } finally {
      setDisconnecting(false);
    }
  };

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
            S&amp;S Activewear is live. Connect your API username and API
            password from{" "}
            <a
              className="inline-flex items-center gap-1 font-medium text-brand-primary"
              href="https://www.ssactivewear.com/myaccount/"
              target="_blank"
              rel="noreferrer"
            >
              My Account
              <ExternalLink className="size-3" />
            </a>{" "}
            to pull styles, your customer pricing, and warehouse stock.
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
          const isSs = supplier.provider === "ssActivewear";

          return (
            <div
              key={supplier.name}
              className={cn(
                "flex flex-col justify-between gap-4 rounded-lg border px-4 py-4",
                isSs && integration?.status === "connected"
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
                    {isSs && integration?.accountNumber ? (
                      <p className="mt-2 text-[11px] text-[#616161]">
                        API Username {integration.accountNumber}
                        {integration.lastVerifiedAt
                          ? ` · Verified ${formatTimestamp(integration.lastVerifiedAt)}`
                          : null}
                      </p>
                    ) : null}
                    {isSs && integration?.lastError ? (
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
                  {loading && isSs ? "Loading" : badge.label}
                </span>
              </div>

              {supplier.available ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={openConnectDialog}>
                    {integration?.status === "connected" ? "Update credentials" : "Connect"}
                  </Button>
                  {integration?.status === "connected" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleDisconnect()}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect S&amp;S Activewear</DialogTitle>
            <DialogDescription>
              Enter the API username and API password from your S&amp;S My
              Account page. Credentials are encrypted and only used server-side
              to fetch your catalog and pricing.
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleConnect()}
              disabled={saving || !accountNumber.trim() || !apiKey.trim()}
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
