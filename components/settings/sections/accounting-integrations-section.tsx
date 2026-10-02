"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Package,
  Plus,
  Plug,
  RefreshCw,
  Trash2,
  Unplug,
} from "lucide-react";
import {
  SaveButton,
  SettingsHeader,
  SettingsMain,
  SettingsPanel,
  useRegisterSectionUnsavedChanges,
  useSectionDraft,
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
  LabeledSelectValue,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  createQuickBooksItem,
  disconnectQuickBooks,
  fetchAccountingIntegrations,
  listQuickBooksItems,
  startQuickBooksOAuth,
  updateQuickBooksSettings,
  verifyQuickBooks,
} from "@/lib/api";
import {
  createAdditionalItemMappingId,
  EMPTY_ITEM_MAPPINGS,
  isQuickBooksConnected,
  QUICKBOOKS_ITEM_MAPPING_OPTIONS,
  type AccountingIntegration,
  type QuickBooksAdditionalItemMapping,
  type QuickBooksCatalogItem,
  type QuickBooksDocumentType,
  type QuickBooksItemMapping,
  type QuickBooksItemMappingKey,
  type QuickBooksItemMappings,
  type QuickBooksSettings,
} from "@/lib/accounting-integrations";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const AUTO_ITEM_VALUE = "__auto__";

function statusBadge(integration?: AccountingIntegration) {
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

function resolveItemMappings(
  settings?: QuickBooksSettings | null
): QuickBooksItemMappings {
  return {
    ...EMPTY_ITEM_MAPPINGS,
    ...(settings?.itemMappings || {}),
  };
}

function resolveAdditionalMappings(
  settings?: QuickBooksSettings | null
): QuickBooksAdditionalItemMapping[] {
  return Array.isArray(settings?.additionalItemMappings)
    ? settings.additionalItemMappings
    : [];
}

function catalogSelectOptions(
  catalogItems: QuickBooksCatalogItem[],
  mapped?: QuickBooksItemMapping | null,
  autoLabel?: string
) {
  const options = [
    ...(autoLabel
      ? [
          {
            value: AUTO_ITEM_VALUE,
            label: `Auto · ${autoLabel}`,
          },
        ]
      : [
          {
            value: AUTO_ITEM_VALUE,
            label: "Choose a Product/Service",
          },
        ]),
    ...catalogItems.map((item) => ({
      value: item.id,
      label: item.name,
    })),
  ];
  if (mapped?.id && !catalogItems.some((item) => item.id === mapped.id)) {
    options.splice(autoLabel ? 1 : 0, 0, {
      value: mapped.id,
      label: mapped.name || `Saved item (${mapped.id})`,
    });
  }
  return options;
}

export function AccountingIntegrationsSection() {
  const { getIdToken } = useAuth();
  const [integrations, setIntegrations] = useState<AccountingIntegration[]>([]);
  const [appConfigured, setAppConfigured] = useState(true);
  const [environment, setEnvironment] = useState<"sandbox" | "production">(
    "sandbox"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingMappings, setSavingMappings] = useState(false);
  const [savedMappings, setSavedMappings] = useState(false);
  const [catalogItems, setCatalogItems] = useState<QuickBooksCatalogItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creatingItem, setCreatingItem] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createAssignKey, setCreateAssignKey] = useState<
    QuickBooksItemMappingKey | "none"
  >("none");

  const quickbooks = useMemo(
    () => integrations.find((entry) => entry.provider === "quickbooks"),
    [integrations]
  );
  const connected = isQuickBooksConnected(quickbooks);
  const badge = statusBadge(quickbooks);
  const BadgeIcon = badge.icon;

  const savedMappingState = useMemo(
    () => ({
      itemMappings: resolveItemMappings(quickbooks?.settings),
      additionalItemMappings: resolveAdditionalMappings(quickbooks?.settings),
    }),
    [quickbooks?.settings]
  );
  const {
    draft: mappingDraft,
    setDraft: setMappingDraft,
    dirty: mappingsDirty,
    discard: discardMappings,
  } = useSectionDraft(savedMappingState);
  const itemMappings = mappingDraft.itemMappings;
  const additionalItemMappings = mappingDraft.additionalItemMappings;

  const settings: QuickBooksSettings = {
    defaultDocumentType: quickbooks?.settings?.defaultDocumentType || "ask",
    allowedDocumentTypes: quickbooks?.settings?.allowedDocumentTypes || [
      "estimate",
      "invoice",
    ],
    autoPushOnEstimateApprove:
      quickbooks?.settings?.autoPushOnEstimateApprove || false,
    autoPushOnInvoice: quickbooks?.settings?.autoPushOnInvoice || false,
    itemMappings: savedMappingState.itemMappings,
    additionalItemMappings: savedMappingState.additionalItemMappings,
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in.");
      const result = await fetchAccountingIntegrations(token);
      setIntegrations(result.integrations || []);
      setAppConfigured(result.appConfigured !== false);
      setEnvironment(result.environment || "sandbox");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  const loadCatalogItems = useCallback(async () => {
    setLoadingItems(true);
    setItemsError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in.");
      const result = await listQuickBooksItems(token);
      setCatalogItems(result.items || []);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not load QuickBooks products/services";
      setItemsError(message);
      if (/session expired|reconnect/i.test(message)) {
        void load();
      }
    } finally {
      setLoadingItems(false);
    }
  }, [getIdToken, load]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!connected) {
      setCatalogItems([]);
      setItemsError(null);
      return;
    }
    void loadCatalogItems();
  }, [connected, loadCatalogItems]);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in.");
      const { authorizeUrl } = await startQuickBooksOAuth(token);
      window.location.href = authorizeUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start QuickBooks login");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect QuickBooks from this shop?")) return;
    setDisconnecting(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in.");
      const result = await disconnectQuickBooks(token);
      setIntegrations([result.integration]);
      setCatalogItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in.");
      const result = await verifyQuickBooks(token);
      setIntegrations([result.integration]);
      void loadCatalogItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection test failed");
    } finally {
      setVerifying(false);
    }
  };

  /** Document prefs only — leave product mappings in the local draft. */
  const saveDocumentSettings = async (patch: Partial<QuickBooksSettings>) => {
    setSavingSettings(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in.");
      const result = await updateQuickBooksSettings(token, {
        defaultDocumentType:
          patch.defaultDocumentType ?? settings.defaultDocumentType,
        allowedDocumentTypes:
          patch.allowedDocumentTypes ?? settings.allowedDocumentTypes,
        autoPushOnEstimateApprove:
          patch.autoPushOnEstimateApprove ??
          settings.autoPushOnEstimateApprove,
        autoPushOnInvoice:
          patch.autoPushOnInvoice ?? settings.autoPushOnInvoice,
        itemMappings: savedMappingState.itemMappings,
        additionalItemMappings: savedMappingState.additionalItemMappings,
      });
      setIntegrations([result.integration]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const saveMappings = async () => {
    setSavingMappings(true);
    setError(null);
    setSavedMappings(false);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in.");
      const cleanedAdditional = mappingDraft.additionalItemMappings
        .map((entry) => ({
          ...entry,
          label: entry.label.trim(),
        }))
        .filter((entry) => entry.label || entry.item?.id);
      const result = await updateQuickBooksSettings(token, {
        defaultDocumentType: settings.defaultDocumentType,
        allowedDocumentTypes: settings.allowedDocumentTypes,
        autoPushOnEstimateApprove: settings.autoPushOnEstimateApprove,
        autoPushOnInvoice: settings.autoPushOnInvoice,
        itemMappings: mappingDraft.itemMappings,
        additionalItemMappings: cleanedAdditional,
      });
      setIntegrations([result.integration]);
      setSavedMappings(true);
      window.setTimeout(() => setSavedMappings(false), 2500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save product mappings"
      );
    } finally {
      setSavingMappings(false);
    }
  };

  useRegisterSectionUnsavedChanges({
    dirty: mappingsDirty,
    saving: savingMappings,
    enabled: connected,
    label: "Unsaved products & services",
    onSave: () => saveMappings(),
    onDiscard: discardMappings,
    id: "settings-accounting-products",
  });

  const toggleAllowed = (type: QuickBooksDocumentType) => {
    const current = new Set(settings.allowedDocumentTypes);
    if (current.has(type)) {
      if (current.size === 1) return;
      current.delete(type);
    } else {
      current.add(type);
    }
    void saveDocumentSettings({ allowedDocumentTypes: [...current] });
  };

  const updateItemMapping = (
    key: QuickBooksItemMappingKey,
    itemId: string | null
  ) => {
    const selected = catalogItems.find((item) => item.id === itemId);
    setMappingDraft((current) => ({
      ...current,
      itemMappings: {
        ...current.itemMappings,
        [key]: selected
          ? { id: selected.id, name: selected.name }
          : { id: null, name: null },
      },
    }));
  };

  const selectOptionsForKey = (key: QuickBooksItemMappingKey) => {
    const option = QUICKBOOKS_ITEM_MAPPING_OPTIONS.find(
      (entry) => entry.key === key
    );
    return catalogSelectOptions(
      catalogItems,
      itemMappings[key],
      option?.defaultLabel
    );
  };

  const selectOptionsForAdditional = (mapped?: QuickBooksItemMapping | null) =>
    catalogSelectOptions(catalogItems, mapped);

  const openCreateDialog = () => {
    setCreateName("");
    setCreateError(null);
    setCreateAssignKey("none");
    setCreateOpen(true);
  };

  const handleCreateItem = async () => {
    const name = createName.trim();
    if (!name) {
      setCreateError("Enter a product/service name.");
      return;
    }
    setCreatingItem(true);
    setCreateError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in.");
      const result = await createQuickBooksItem(token, { name });
      const created = result.item;
      setCatalogItems((prev) => {
        if (prev.some((item) => item.id === created.id)) return prev;
        return [...prev, created].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );
      });
      if (createAssignKey !== "none") {
        setMappingDraft((current) => ({
          ...current,
          itemMappings: {
            ...current.itemMappings,
            [createAssignKey]: { id: created.id, name: created.name },
          },
        }));
      }
      setCreateOpen(false);
      setCreateName("");
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Could not create in QuickBooks"
      );
    } finally {
      setCreatingItem(false);
    }
  };

  const addAdditionalMapping = () => {
    setMappingDraft((current) => ({
      ...current,
      additionalItemMappings: [
        ...current.additionalItemMappings,
        {
          id: createAdditionalItemMappingId(),
          label: "",
          item: { id: null, name: null },
        },
      ],
    }));
  };

  const updateAdditionalMapping = (
    id: string,
    patch: Partial<Pick<QuickBooksAdditionalItemMapping, "label" | "item">>
  ) => {
    setMappingDraft((current) => ({
      ...current,
      additionalItemMappings: current.additionalItemMappings.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry
      ),
    }));
  };

  const removeAdditionalMapping = (id: string) => {
    setMappingDraft((current) => ({
      ...current,
      additionalItemMappings: current.additionalItemMappings.filter(
        (entry) => entry.id !== id
      ),
    }));
  };

  return (
    <SettingsMain>
      <SettingsHeader
        title="Accounting"
        description="Connect QuickBooks Online when you’re ready to push estimates and invoices from FloPilot. Nothing syncs until you authorize a company."
      >
        {connected ? (
          <SaveButton
            dirty={mappingsDirty}
            saving={savingMappings}
            saved={savedMappings}
            headerBar
            onSave={() => void saveMappings()}
          />
        ) : null}
      </SettingsHeader>

      {!loading && !connected && appConfigured ? (
        <div className="rounded-lg border border-[#e3e3e3] bg-[#fafafa] px-4 py-3 text-[13px] text-[#616161]">
          Not connected yet — use{" "}
          <span className="font-medium text-[#303030]">Connect QuickBooks</span>{" "}
          below. You can finish settings mapping after OAuth completes.
        </div>
      ) : null}
      {error && (
        <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-4 py-3 text-sm text-[#8f1f1f]">
          {error}
        </p>
      )}

      {!appConfigured && (
        <SettingsPanel
          title="QuickBooks app setup required"
          description="Your FloPilot server needs Intuit developer credentials before shops can connect."
        >
          <ol className="list-decimal space-y-2 pl-5 text-sm text-[#616161]">
            <li>
              Create an app at{" "}
              <a
                href="https://developer.intuit.com"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#2c6ecb] hover:underline"
              >
                developer.intuit.com
              </a>{" "}
              with QuickBooks Online Accounting scope.
            </li>
            <li>
              Add redirect URI:{" "}
              <code className="rounded bg-[#f4f4f4] px-1.5 py-0.5 text-[12px]">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/app/settings/integrations/accounting/callback`
                  : "/app/settings/integrations/accounting/callback"}
              </code>
            </li>
            <li>
              Set <code className="rounded bg-[#f4f4f4] px-1.5 py-0.5 text-[12px]">QUICKBOOKS_CLIENT_ID</code>{" "}
              and{" "}
              <code className="rounded bg-[#f4f4f4] px-1.5 py-0.5 text-[12px]">QUICKBOOKS_CLIENT_SECRET</code>{" "}
              on the backend, then redeploy.
            </li>
          </ol>
        </SettingsPanel>
      )}

      <SettingsPanel
        title="QuickBooks Online"
        description="Authorize FloPilot to create estimates and invoices in your QuickBooks company."
      >
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#616161]">
            <Loader2 className="size-4 animate-spin" />
            Loading accounting integrations…
          </div>
        ) : (
          <div className="rounded-lg border border-[#e3e3e3] bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eef6f0] text-[#2d6a4f]">
                  <BookOpen className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-[#303030]">
                      QuickBooks Online
                    </h3>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        badge.className
                      )}
                    >
                      <BadgeIcon className="size-3" />
                      {badge.label}
                    </span>
                    <span className="rounded-full bg-[#f1f1f1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
                      {environment}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#616161]">
                    Sync customers and push estimates or invoices from shop
                    orders — you choose what to send.
                    {environment === "sandbox" ? (
                      <>
                        {" "}
                        FloPilot is in <span className="font-medium">sandbox</span>{" "}
                        mode — connect a QuickBooks sandbox company, not a live
                        production file.
                      </>
                    ) : null}
                  </p>
                  {connected && (
                    <p className="mt-2 text-[12px] text-[#616161]">
                      Company:{" "}
                      <span className="font-medium text-[#303030]">
                        {quickbooks?.companyName || "QuickBooks company"}
                      </span>
                      {quickbooks?.lastVerifiedAt
                        ? ` · Verified ${formatTimestamp(quickbooks.lastVerifiedAt)}`
                        : null}
                    </p>
                  )}
                  {quickbooks?.lastError && (
                    <p className="mt-2 text-[12px] text-[#8a6116]">
                      {quickbooks.lastError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {connected ? (
                  <>
                    <Button
                      type="button"
                      className={cn(dashboardControlClass, "h-9")}
                      disabled={verifying}
                      onClick={() => void handleVerify()}
                    >
                      {verifying ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="size-3.5" />
                      )}
                      Test connection
                    </Button>
                    <Button
                      type="button"
                      className={cn(dashboardControlClass, "h-9")}
                      disabled={disconnecting}
                      onClick={() => void handleDisconnect()}
                    >
                      {disconnecting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Unplug className="size-3.5" />
                      )}
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    className={cn(dashboardPrimaryButtonClass, "h-9")}
                    disabled={!appConfigured || connecting}
                    onClick={() => void handleConnect()}
                  >
                    {connecting ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plug className="size-3.5" />
                    )}
                    Connect QuickBooks
                  </Button>
                )}
              </div>
            </div>

            {connected && (
              <div className="mt-5 border-t border-[#ebebeb] pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f4f7fd] text-[#2c6ecb]">
                      <Package className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[14px] font-semibold text-[#303030]">
                        Products & services
                      </h4>
                      <p className="mt-0.5 text-[13px] text-[#616161]">
                        Map FloPilot line types to QuickBooks Products/Services —
                        or create a new one in QuickBooks from here.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className={cn(dashboardControlClass, "h-8 shrink-0")}
                      disabled={loadingItems}
                      onClick={() => void loadCatalogItems()}
                    >
                      {loadingItems ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="size-3.5" />
                      )}
                      Refresh list
                    </Button>
                    <Button
                      type="button"
                      className={cn(dashboardPrimaryButtonClass, "h-8 shrink-0")}
                      disabled={creatingItem}
                      onClick={openCreateDialog}
                    >
                      <Plus className="size-3.5" />
                      Create in QuickBooks
                    </Button>
                  </div>
                </div>

                {itemsError && (
                  <p className="mt-3 rounded-lg border border-[#f5e0b8] bg-[#fff8eb] px-3 py-2 text-[12px] text-[#8a6116]">
                    {itemsError}
                  </p>
                )}

                <div className="mt-4 space-y-3">
                  {QUICKBOOKS_ITEM_MAPPING_OPTIONS.map((option) => {
                    const mapped = itemMappings[option.key];
                    const value = mapped?.id || AUTO_ITEM_VALUE;
                    const selectOptions = selectOptionsForKey(option.key);

                    return (
                      <div
                        key={option.key}
                        className="grid gap-2 rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] sm:items-center sm:gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#303030]">
                            {option.label}
                          </p>
                          <p className="mt-0.5 text-[12px] leading-snug text-[#8a8a8a]">
                            {option.description}
                          </p>
                        </div>
                        <Select
                          value={value}
                          disabled={savingMappings || loadingItems}
                          onValueChange={(next) => {
                            const selected =
                              !next || next === AUTO_ITEM_VALUE
                                ? null
                                : String(next);
                            updateItemMapping(option.key, selected);
                          }}
                        >
                          <SelectTrigger className="h-10 w-full rounded-xl border-[#e3e3e3] bg-white">
                            <LabeledSelectValue
                              value={value}
                              options={selectOptions}
                              placeholder="Choose a Product/Service"
                            />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {selectOptions.map((entry) => (
                              <SelectItem key={entry.value} value={entry.value}>
                                <span
                                  className={cn(
                                    entry.value === AUTO_ITEM_VALUE
                                      ? "text-[#616161]"
                                      : "text-[#303030]"
                                  )}
                                >
                                  {entry.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-xl border border-[#ebebeb] bg-white px-3 py-4 sm:px-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#303030]">
                        Additional products & services
                      </p>
                      <p className="mt-0.5 text-[12px] leading-snug text-[#8a8a8a]">
                        Map specific FloPilot fee or offering labels (exact name
                        match) to their own QuickBooks Product/Service — useful
                        when Fees & setup is too broad.
                      </p>
                    </div>
                    <Button
                      type="button"
                      className={cn(dashboardControlClass, "h-8 shrink-0")}
                      disabled={
                        savingMappings || additionalItemMappings.length >= 25
                      }
                      onClick={addAdditionalMapping}
                    >
                      <Plus className="size-3.5" />
                      Add mapping
                    </Button>
                  </div>

                  {additionalItemMappings.length === 0 ? (
                    <p className="mt-3 text-[12px] text-[#8a8a8a]">
                      No additional mappings yet. Add one for a named fee (e.g.
                      “Rush fee”) and assign the QuickBooks service it should
                      push as.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {additionalItemMappings.map((entry) => {
                        const itemValue = entry.item?.id || AUTO_ITEM_VALUE;
                        const itemOptions = selectOptionsForAdditional(
                          entry.item
                        );
                        return (
                          <div
                            key={entry.id}
                            className="grid gap-2 rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(200px,260px)_auto] sm:items-center sm:gap-3"
                          >
                            <div className="min-w-0 space-y-1">
                              <Label className="text-[11px] font-medium uppercase tracking-wide text-[#8a8a8a]">
                                FloPilot offering label
                              </Label>
                              <Input
                                value={entry.label}
                                disabled={savingMappings}
                                placeholder="e.g. Rush fee"
                                className="h-10 rounded-xl border-[#e3e3e3] bg-white"
                                onChange={(event) => {
                                  updateAdditionalMapping(entry.id, {
                                    label: event.target.value,
                                  });
                                }}
                                onBlur={(event) => {
                                  const next = event.target.value.trim();
                                  if (next === entry.label) return;
                                  updateAdditionalMapping(entry.id, {
                                    label: next,
                                  });
                                }}
                              />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <Label className="text-[11px] font-medium uppercase tracking-wide text-[#8a8a8a]">
                                QuickBooks Product/Service
                              </Label>
                              <Select
                                value={itemValue}
                                disabled={savingMappings || loadingItems}
                                onValueChange={(next) => {
                                  const selectedId =
                                    !next || next === AUTO_ITEM_VALUE
                                      ? null
                                      : String(next);
                                  const selected = catalogItems.find(
                                    (item) => item.id === selectedId
                                  );
                                  updateAdditionalMapping(entry.id, {
                                    item: selected
                                      ? {
                                          id: selected.id,
                                          name: selected.name,
                                        }
                                      : { id: null, name: null },
                                  });
                                }}
                              >
                                <SelectTrigger className="h-10 w-full rounded-xl border-[#e3e3e3] bg-white">
                                  <LabeledSelectValue
                                    value={itemValue}
                                    options={itemOptions}
                                    placeholder="Choose a Product/Service"
                                  />
                                </SelectTrigger>
                                <SelectContent className="max-h-72">
                                  {itemOptions.map((opt) => (
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value}
                                    >
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              type="button"
                              aria-label="Remove mapping"
                              className={cn(
                                dashboardControlClass,
                                "h-10 w-10 shrink-0 px-0 sm:mt-5"
                              )}
                              disabled={savingMappings}
                              onClick={() => removeAdditionalMapping(entry.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <p className="mt-3 text-[12px] text-[#8a8a8a]">
                  Leave any row on Auto and FloPilot will create a matching
                  service in QuickBooks the first time you push. Additional
                  mappings override Fees & setup when the line label matches
                  exactly. Use Save / Discard in the top bar when you’re done
                  editing mappings.
                </p>

                {mappingsDirty ? (
                  <p className="mt-2 text-[12px] font-medium text-[#2c6ecb]">
                    Mapping changes aren’t saved yet — use the bar at the top.
                  </p>
                ) : null}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#ebebeb] pt-4 text-[12px] text-[#616161]">
              <a
                href="https://developer.intuit.com/app/developer/qbo/docs/get-started"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-[#2c6ecb] hover:underline"
              >
                QuickBooks docs
                <ExternalLink className="size-3" />
              </a>
              <Link
                href="/app/settings/integrations"
                className="font-medium text-[#616161] hover:text-[#303030]"
              >
                ← Back to suppliers
              </Link>
            </div>
          </div>
        )}
      </SettingsPanel>

      {connected && (
        <SettingsPanel
          title="What to send"
          description="Choose which QuickBooks documents staff can create from FloPilot orders."
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[13px] text-[#303030]">
                Documents available when pushing
              </Label>
              <div className="flex flex-wrap gap-2">
                {(["estimate", "invoice"] as QuickBooksDocumentType[]).map(
                  (type) => {
                    const active = settings.allowedDocumentTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={savingSettings}
                        onClick={() => toggleAllowed(type)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[13px] font-medium capitalize transition-colors",
                          active
                            ? "border-[#2c6ecb] bg-[#f4f7fd] text-[#2c6ecb]"
                            : "border-[#e3e3e3] bg-white text-[#616161] hover:border-[#c4d7f2]"
                        )}
                      >
                        {type}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] text-[#303030]">
                Default when opening push
              </Label>
              <div className="flex flex-wrap gap-2">
                {(
                  ["ask", "estimate", "invoice"] as Array<
                    QuickBooksSettings["defaultDocumentType"]
                  >
                ).map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={savingSettings}
                    onClick={() =>
                      void saveDocumentSettings({ defaultDocumentType: type })
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[13px] font-medium capitalize transition-colors",
                      settings.defaultDocumentType === type
                        ? "border-[#2c6ecb] bg-[#f4f7fd] text-[#2c6ecb]"
                        : "border-[#e3e3e3] bg-white text-[#616161] hover:border-[#c4d7f2]"
                    )}
                  >
                    {type === "ask" ? "Ask each time" : type}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-[#8a8a8a]">
                “Ask each time” is the safest default — staff pick estimate or
                invoice on the order.
              </p>
            </div>

            {savingSettings && (
              <p className="flex items-center gap-2 text-[12px] text-[#616161]">
                <Loader2 className="size-3.5 animate-spin" />
                Saving…
              </p>
            )}
          </div>
        </SettingsPanel>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[#303030]">
              Create product/service
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[#616161]">
              Adds a Service item in your QuickBooks company, then appears in
              the mapping lists above.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-1 pb-1">
            <div className="space-y-1.5">
              <Label htmlFor="qb-create-name" className="text-[13px] text-[#303030]">
                Name in QuickBooks
              </Label>
              <Input
                id="qb-create-name"
                value={createName}
                autoFocus
                maxLength={100}
                placeholder="e.g. Rush fee"
                className="h-10 rounded-xl border-[#e3e3e3]"
                disabled={creatingItem}
                onChange={(event) => setCreateName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleCreateItem();
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] text-[#303030]">
                Assign to mapping (optional)
              </Label>
              <Select
                value={createAssignKey}
                disabled={creatingItem}
                onValueChange={(next) =>
                  setCreateAssignKey(
                    (next as QuickBooksItemMappingKey | "none") || "none"
                  )
                }
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-[#e3e3e3]">
                  <LabeledSelectValue
                    value={createAssignKey}
                    options={[
                      { value: "none", label: "Don’t assign yet" },
                      ...QUICKBOOKS_ITEM_MAPPING_OPTIONS.map((option) => ({
                        value: option.key,
                        label: option.label,
                      })),
                    ]}
                    placeholder="Don’t assign yet"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Don’t assign yet</SelectItem>
                  {QUICKBOOKS_ITEM_MAPPING_OPTIONS.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[12px] text-[#8a8a8a]">
                Or leave unassigned and pick it later under Additional products
                & services — then Save from the top bar.
              </p>
            </div>
            {createError && (
              <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[12px] text-[#8f1f1f]">
                {createError}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              className={cn(dashboardControlClass, "h-9")}
              disabled={creatingItem}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "h-9")}
              disabled={creatingItem || !createName.trim()}
              onClick={() => void handleCreateItem()}
            >
              {creatingItem ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Create & push
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsMain>
  );
}
