"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Layers,
  LayoutTemplate,
  Link2,
  ListOrdered,
  Loader2,
  Package,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { StoreCollectionsPanel } from "@/components/stores/store-collections-panel";
import { StoreConvertSubmissionDialog } from "@/components/stores/store-convert-submission-dialog";
import { StoreCustomizeBuilder } from "@/components/stores/store-customize-builder";
import { StorePagesPanel } from "@/components/stores/store-pages-panel";
import { StoreProductDialog } from "@/components/stores/store-product-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteClientStore,
  getClientStore,
  listClientStoreSubmissions,
  updateClientStore,
  updateClientStoreSubmission,
} from "@/lib/api";
import { readStoreMockupDataUrl } from "@/lib/artwork-preview";
import {
  ensureStoreTheme,
  type ClientStoreTheme,
} from "@/lib/client-store-theme";
import {
  clientStoreStatusLabel,
  getPrimaryMockupUrl,
  resolveClientStoreShareUrl,
  type ClientStore,
  type ClientStoreProduct,
  type ClientStoreSubmission,
} from "@/lib/client-stores";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardPrimaryButtonClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  CUSTOMER_ACCENT_OPTIONS,
  type CustomerAccentKey,
} from "@/lib/production-customer-colors";
import { cn } from "@/lib/utils";

type EditorTab =
  | "overview"
  | "products"
  | "collections"
  | "pages"
  | "customize"
  | "share"
  | "orders";

export function StoreEditorView({ storeId }: { storeId: string }) {
  const { getIdToken } = useAuth();
  const [store, setStore] = useState<ClientStore | null>(null);
  const [submissions, setSubmissions] = useState<ClientStoreSubmission[]>([]);
  const [tab, setTab] = useState<EditorTab>("overview");
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ClientStoreProduct | null>(
    null
  );
  const [convertSubmission, setConvertSubmission] =
    useState<ClientStoreSubmission | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState<"logo" | "hero" | null>(
    null
  );

  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [password, setPassword] = useState("");
  const [orderInstructions, setOrderInstructions] = useState("");
  const [accentColorKey, setAccentColorKey] =
    useState<CustomerAccentKey | null>(null);
  const [theme, setTheme] = useState<ClientStoreTheme>(() =>
    ensureStoreTheme(null)
  );

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [storeRes, submissionRes] = await Promise.all([
        getClientStore(token, storeId),
        listClientStoreSubmissions(token, { storeId }),
      ]);
      setStore(storeRes.store);
      setSubmissions(submissionRes.submissions);
      setName(storeRes.store.name || "");
      setHeadline(storeRes.store.headline || "");
      setDescription(storeRes.store.description || "");
      setOpensAt(storeRes.store.opensAt?.slice(0, 16) || "");
      setClosesAt(storeRes.store.closesAt?.slice(0, 16) || "");
      setOrderInstructions(storeRes.store.settings?.orderInstructions || "");
      setAccentColorKey(
        (CUSTOMER_ACCENT_OPTIONS.find(
          (opt) => opt.key === storeRes.store.accentColorKey
        )?.key as CustomerAccentKey | undefined) || null
      );
      setTheme(
        ensureStoreTheme(storeRes.store.theme, {
          name: storeRes.store.name,
          headline: storeRes.store.headline,
          description: storeRes.store.description,
          heroImageUrl: storeRes.store.heroImageUrl,
        })
      );
      setActivePageId((current) => {
        const nextTheme = ensureStoreTheme(storeRes.store.theme, {
          name: storeRes.store.name,
          headline: storeRes.store.headline,
          description: storeRes.store.description,
          heroImageUrl: storeRes.store.heroImageUrl,
        });
        if (current && nextTheme.pages.some((page) => page.id === current)) {
          return current;
        }
        return nextTheme.pages[0]?.id || null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load store");
    } finally {
      setLoading(false);
    }
  }, [getIdToken, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const enabledProducts = useMemo(
    () => (store?.products || []).filter((p) => p.enabled),
    [store]
  );

  const saveOverview = async () => {
    const token = await getIdToken();
    if (!token || !store) return;
    setSaving(true);
    setError(null);
    try {
      const res = await updateClientStore(token, store.id, {
        name: name.trim(),
        opensAt: opensAt ? new Date(opensAt).toISOString() : null,
        closesAt: closesAt ? new Date(closesAt).toISOString() : null,
        settings: {
          ...store.settings,
          orderInstructions: orderInstructions.trim() || undefined,
        },
        ...(password.trim()
          ? { password: password.trim(), passwordProtected: true }
          : {}),
      });
      setStore(res.store);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save store");
    } finally {
      setSaving(false);
    }
  };

  const saveCustomize = async () => {
    const token = await getIdToken();
    if (!token || !store) return;
    setSaving(true);
    setError(null);
    try {
      const res = await updateClientStore(token, store.id, {
        headline: headline.trim() || undefined,
        description: description.trim() || undefined,
        accentColorKey: accentColorKey ?? null,
        theme,
      });
      setStore(res.store);
      setTheme(
        ensureStoreTheme(res.store.theme, {
          name: res.store.name,
          headline: res.store.headline,
          description: res.store.description,
          heroImageUrl: res.store.heroImageUrl,
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save store look");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (status: ClientStore["status"]) => {
    const token = await getIdToken();
    if (!token || !store) return;

    if (status === "published") {
      const readyProducts = (store.products || []).filter(
        (product) => product.enabled && product.sellPrice > 0
      );
      if (readyProducts.length === 0) {
        setError(
          "Add at least one enabled product with a shopper price before publishing."
        );
        setTab("products");
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const res = await updateClientStore(token, store.id, { status });
      setStore(res.store);
      if (status === "published") {
        setPublishSuccess(true);
        setTab("share");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setSaving(false);
    }
  };

  const saveProducts = async (products: ClientStoreProduct[]) => {
    const token = await getIdToken();
    if (!token || !store) return;
    setSaving(true);
    setError(null);
    try {
      const res = await updateClientStore(token, store.id, { products });
      setStore(res.store);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save products");
    } finally {
      setSaving(false);
    }
  };

  const handleAssetUpload = async (
    kind: "logo" | "hero",
    file: File | null
  ) => {
    if (!file || !store) return;
    setUploadingAsset(kind);
    setError(null);
    try {
      const { previewUrl, error: readError } = await readStoreMockupDataUrl(file);
      if (readError || !previewUrl) {
        setError(readError || "Could not read that image.");
        return;
      }
      const token = await getIdToken();
      if (!token) return;
      const res = await updateClientStore(
        token,
        store.id,
        kind === "logo" ? { logoUrl: previewUrl } : { heroImageUrl: previewUrl }
      );
      setStore(res.store);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : kind === "logo"
            ? "Could not update logo"
            : "Could not update hero image"
      );
    } finally {
      setUploadingAsset(null);
    }
  };

  const clearAsset = async (kind: "logo" | "hero") => {
    if (!store) return;
    const token = await getIdToken();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const res = await updateClientStore(
        token,
        store.id,
        kind === "logo" ? { logoUrl: "" } : { heroImageUrl: "" }
      );
      setStore(res.store);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove image");
    } finally {
      setSaving(false);
    }
  };

  const shareUrl = useMemo(
    () => (store ? resolveClientStoreShareUrl(store) : ""),
    [store]
  );

  const copyShareLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const removeStore = async () => {
    if (!store) return;
    if (!window.confirm(`Delete “${store.name}”? This cannot be undone.`)) {
      return;
    }
    const token = await getIdToken();
    if (!token) return;
    await deleteClientStore(token, store.id);
    window.location.href = "/app/stores";
  };

  if (loading) {
    return (
      <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center gap-2 py-24 text-[13px] text-[#616161]">
          <Loader2 className="size-4 animate-spin" />
          Loading store…
        </div>
      </main>
    );
  }

  if (!store) {
    return (
      <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-lg py-16 text-center">
          <p className="text-[15px] font-semibold text-[#303030]">
            Store not found
          </p>
          <Link
            href="/app/stores"
            className="mt-3 inline-flex text-[13px] text-brand-primary"
          >
            Back to Client Stores
          </Link>
        </div>
      </main>
    );
  }

  const tabs: {
    id: EditorTab;
    label: string;
    icon: typeof Settings2;
  }[] = [
    { id: "overview", label: "Overview", icon: Settings2 },
    {
      id: "products",
      label: `Products (${enabledProducts.length})`,
      icon: Package,
    },
    {
      id: "collections",
      label: `Collections (${theme.collections.length})`,
      icon: Layers,
    },
    { id: "pages", label: `Pages (${theme.pages.length})`, icon: FileText },
    { id: "customize", label: "Customize", icon: LayoutTemplate },
    { id: "share", label: "Share", icon: Link2 },
    {
      id: "orders",
      label: `Orders (${submissions.length})`,
      icon: ListOrdered,
    },
  ];

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/app/stores"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-[#616161] hover:text-[#303030]"
          >
            <ArrowLeft className="size-3.5" />
            Client Stores
          </Link>
          <h1 className={cn(dashboardSectionTitleClass, "mt-2 truncate")}>
            {store.name}
          </h1>
          <p className={cn(dashboardTaskDetailClass, "mt-1")}>
            {store.company || store.customerName || "Client store"}
            {" · "}
            {clientStoreStatusLabel(store.status)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {store.status !== "published" ? (
            <Button
              type="button"
              className={dashboardPrimaryButtonClass}
              disabled={saving}
              onClick={() => void setStatus("published")}
            >
              Publish
            </Button>
          ) : (
            <Button
              type="button"
              className={dashboardControlClass}
              disabled={saving}
              onClick={() => void setStatus("closed")}
            >
              Close store
            </Button>
          )}
          {store.status === "closed" || store.status === "published" ? (
            <Button
              type="button"
              className={dashboardGhostButtonClass}
              disabled={saving}
              onClick={() => void setStatus("draft")}
            >
              Revert to draft
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {error}
        </div>
      ) : null}

      <div className="flex gap-1 overflow-x-auto border-b border-[#ebebeb]">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors",
                tab === item.id
                  ? "border-brand-primary text-[#303030]"
                  : "border-transparent text-[#616161] hover:text-[#303030]"
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <div className={cn(dashboardCardClass, "space-y-4 p-4 sm:p-5")}>
            <div>
              <Label className="text-[13px]">Store name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 h-9 border-[#e3e3e3] text-[13px]"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-[13px]">Opens</Label>
                <Input
                  type="datetime-local"
                  value={opensAt}
                  onChange={(e) => setOpensAt(e.target.value)}
                  className="mt-1.5 h-9 border-[#e3e3e3] text-[13px]"
                />
              </div>
              <div>
                <Label className="text-[13px]">Closes</Label>
                <Input
                  type="datetime-local"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                  className="mt-1.5 h-9 border-[#e3e3e3] text-[13px]"
                />
              </div>
            </div>
            <div>
              <Label className="text-[13px]">Order instructions</Label>
              <Textarea
                value={orderInstructions}
                onChange={(e) => setOrderInstructions(e.target.value)}
                placeholder="Shown at checkout — pickup notes, deadlines, etc."
                className="mt-1.5 min-h-[80px] border-[#e3e3e3] text-[13px]"
              />
            </div>
            <div>
              <Label className="text-[13px]">Store password (optional)</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  store.hasPassword
                    ? "Leave blank to keep current password"
                    : "Optional access password"
                }
                className="mt-1.5 h-9 border-[#e3e3e3] text-[13px]"
              />
            </div>
            <Button
              type="button"
              className={dashboardPrimaryButtonClass}
              disabled={saving}
              onClick={() => void saveOverview()}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>

          <div className="space-y-4">
            <div className={cn(dashboardCardClass, "p-4 sm:p-5")}>
              <p className="text-[13px] font-semibold text-[#303030]">
                Storefront look
              </p>
              <p className="mt-1 text-[12px] text-[#8a8a8a]">
                Logo, colors, hero image, and storefront copy live on the
                Customize tab.
              </p>
              <Button
                type="button"
                className={cn(dashboardControlClass, "mt-4")}
                onClick={() => setTab("customize")}
              >
                Open Customize
              </Button>
            </div>
            <div className={cn(dashboardCardClass, "p-4 sm:p-5")}>
              <p className="text-[13px] font-semibold text-[#303030]">Danger zone</p>
              <Button
                type="button"
                variant="ghost"
                className="mt-3 h-9 px-3 text-[13px] text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => void removeStore()}
              >
                <Trash2 className="size-3.5" />
                Delete store
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "products" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-[#303030]">
                Catalog
              </p>
              <p className="text-[12px] text-[#8a8a8a]">
                Add blanks from suppliers or create manual products with mockups
                and markup.
              </p>
            </div>
            <Button
              type="button"
              className={dashboardPrimaryButtonClass}
              onClick={() => {
                setEditingProduct(null);
                setProductOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add product
            </Button>
          </div>

          {(store.products || []).length === 0 ? (
            <div className={cn(dashboardCardClass, "px-6 py-14 text-center")}>
              <p className="text-[15px] font-semibold text-[#303030]">
                No products yet
              </p>
              <p className="mt-1 text-[13px] text-[#616161]">
                Add the tees, hoodies, and hats this client’s team can order.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(store.products || [])
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setEditingProduct(product);
                      setProductOpen(true);
                    }}
                    className={cn(
                      dashboardCardClass,
                      "flex gap-3 p-3 text-left transition-colors hover:border-[#c9cccf]"
                    )}
                  >
                    <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#ebebeb] bg-[#fafafa] p-1.5">
                      {getPrimaryMockupUrl(product) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getPrimaryMockupUrl(product)}
                          alt=""
                          className="size-full object-contain"
                        />
                      ) : (
                        <span className="px-2 text-center text-[10px] text-[#8a8a8a]">
                          No mockup
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[#303030]">
                        {product.name}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-[#8a8a8a]">
                        {[product.brand, product.color].filter(Boolean).join(" · ") ||
                          "Custom product"}
                      </p>
                      <p className="mt-2 text-[13px] font-semibold tabular-nums text-[#303030]">
                        {formatCurrency(product.sellPrice)}
                      </p>
                      <p className="text-[11px] text-[#8a8a8a]">
                        {product.sellPriceMode === "fixed"
                          ? "Fixed price"
                          : `${product.markupPercent}% markup · blank ${formatCurrency(product.blankCost)}`}
                        {!product.enabled ? " · Hidden" : ""}
                      </p>
                      {(product.tags || []).length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {(product.tags || []).slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md bg-[#f1f1f1] px-1.5 py-0.5 text-[10px] font-medium text-[#616161]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "collections" ? (
        <StoreCollectionsPanel
          theme={theme}
          onThemeChange={setTheme}
          products={store.products || []}
          onSave={() => void saveCustomize()}
          saving={saving}
        />
      ) : null}

      {tab === "pages" ? (
        <StorePagesPanel
          theme={theme}
          onThemeChange={setTheme}
          onCustomizePage={(pageId) => {
            setActivePageId(pageId);
            setTab("customize");
          }}
          onSave={() => void saveCustomize()}
          saving={saving}
        />
      ) : null}

      {tab === "customize" ? (
        <StoreCustomizeBuilder
          store={store}
          theme={theme}
          onThemeChange={setTheme}
          activePageId={activePageId}
          onActivePageChange={setActivePageId}
          accentColorKey={accentColorKey}
          onAccentChange={setAccentColorKey}
          headline={headline}
          description={description}
          onHeadlineChange={setHeadline}
          onDescriptionChange={setDescription}
          onSave={saveCustomize}
          onUploadLogo={(file) => void handleAssetUpload("logo", file)}
          onUploadHero={(file) => {
            void handleAssetUpload("hero", file);
            if (file) {
              void readStoreMockupDataUrl(file).then(({ previewUrl }) => {
                if (!previewUrl) return;
                setTheme((current) => {
                  const home =
                    current.pages.find((page) => page.handle === "home") ||
                    current.pages[0];
                  if (!home) return current;
                  return {
                    ...current,
                    pages: current.pages.map((page) =>
                      page.id === home.id
                        ? {
                            ...page,
                            sections: page.sections.map((section) =>
                              section.type === "hero"
                                ? {
                                    ...section,
                                    settings: {
                                      ...section.settings,
                                      imageUrl: previewUrl,
                                    },
                                  }
                                : section
                            ),
                          }
                        : page
                    ),
                    sections: home.sections.map((section) =>
                      section.type === "hero"
                        ? {
                            ...section,
                            settings: {
                              ...section.settings,
                              imageUrl: previewUrl,
                            },
                          }
                        : section
                    ),
                  };
                });
              });
            }
          }}
          onClearLogo={() => void clearAsset("logo")}
          onClearHero={() => {
            void clearAsset("hero");
            setTheme((current) => {
              const home =
                current.pages.find((page) => page.handle === "home") ||
                current.pages[0];
              if (!home) return current;
              return {
                ...current,
                pages: current.pages.map((page) =>
                  page.id === home.id
                    ? {
                        ...page,
                        sections: page.sections.map((section) =>
                          section.type === "hero"
                            ? {
                                ...section,
                                settings: {
                                  ...section.settings,
                                  imageUrl: undefined,
                                },
                              }
                            : section
                        ),
                      }
                    : page
                ),
                sections: home.sections.map((section) =>
                  section.type === "hero"
                    ? {
                        ...section,
                        settings: {
                          ...section.settings,
                          imageUrl: undefined,
                        },
                      }
                    : section
                ),
              };
            });
          }}
          saving={saving}
          uploadingAsset={uploadingAsset}
        />
      ) : null}

      {tab === "share" ? (
        <div className="space-y-4">
          <div className={cn(dashboardCardClass, "space-y-4 p-4 sm:p-5")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold text-[#121a2e]">
                  Client share link
                </p>
                <p className="mt-1 text-[13px] text-[#616161]">
                  {store.status === "published"
                    ? "Send this link to your client so their team can order."
                    : "Publish the store to activate this link for shoppers."}
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  store.status === "published"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-[#f4f4f5] text-[#616161]"
                )}
              >
                {clientStoreStatusLabel(store.status)}
              </span>
            </div>

            {store.status !== "published" ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-950">
                This store is still a draft. Shoppers can’t open the link until
                you publish.
                <div className="mt-3">
                  <Button
                    type="button"
                    className={dashboardPrimaryButtonClass}
                    disabled={saving}
                    onClick={() => void setStatus("published")}
                  >
                    Publish & get link
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                readOnly
                value={shareUrl || ""}
                className="h-10 border-[#e3e3e3] bg-[#fafafa] text-[12px]"
              />
              <Button
                type="button"
                className={dashboardControlClass}
                disabled={!shareUrl || store.status !== "published"}
                onClick={() => void copyShareLink()}
              >
                <Copy className="size-3.5" />
                {copied ? "Copied" : "Copy link"}
              </Button>
              {shareUrl && store.status === "published" ? (
                <Link
                  href={shareUrl}
                  target="_blank"
                  className={cn(dashboardControlClass, "justify-center")}
                >
                  <ExternalLink className="size-3.5" />
                  Preview
                </Link>
              ) : null}
            </div>
            {store.hasPassword ? (
              <p className="text-[12px] text-[#8a8a8a]">
                Password protected — share the password with your client
                separately.
              </p>
            ) : null}
          </div>

          <div className={cn(dashboardCardClass, "p-4 sm:p-5")}>
            <p className="text-[13px] font-semibold text-[#303030]">
              Ready to share checklist
            </p>
            <ul className="mt-3 space-y-2 text-[13px] text-[#616161]">
              <li className="flex items-center gap-2">
                <Check
                  className={cn(
                    "size-3.5",
                    enabledProducts.length > 0
                      ? "text-emerald-600"
                      : "text-[#c0c0c4]"
                  )}
                />
                {enabledProducts.length} product
                {enabledProducts.length === 1 ? "" : "s"} ready
              </li>
              <li className="flex items-center gap-2">
                <Check
                  className={cn(
                    "size-3.5",
                    store.logoUrl || store.heroImageUrl || headline
                      ? "text-emerald-600"
                      : "text-[#c0c0c4]"
                  )}
                />
                Storefront customized
              </li>
              <li className="flex items-center gap-2">
                <Check
                  className={cn(
                    "size-3.5",
                    store.status === "published"
                      ? "text-emerald-600"
                      : "text-[#c0c0c4]"
                  )}
                />
                Published / live
              </li>
            </ul>
          </div>
        </div>
      ) : null}

      {tab === "orders" ? (
        <div className={cn(dashboardCardClass, "overflow-hidden")}>
          {submissions.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-[15px] font-semibold text-[#303030]">
                No store orders yet
              </p>
              <p className="mt-1 text-[13px] text-[#616161]">
                When shoppers submit sizes and contact info, they’ll show up
                here for review before you create a sales order.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#ebebeb]">
              {submissions.map((submission) => {
                const isConverted = Boolean(submission.orderId);
                return (
                  <div key={submission.id} className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-semibold text-[#303030]">
                            {submission.shopper.name}
                          </p>
                          {isConverted ? (
                            <span className="inline-flex rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                              Converted
                            </span>
                          ) : submission.status === "cancelled" ? (
                            <span className="inline-flex rounded-md bg-[#f1f1f1] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
                              Cancelled
                            </span>
                          ) : submission.status === "reviewed" ? (
                            <span className="inline-flex rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                              Reviewed
                            </span>
                          ) : (
                            <span className="inline-flex rounded-md bg-[#eef3fb] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
                              New
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                          {[submission.shopper.email, submission.shopper.phone]
                            .filter(Boolean)
                            .join(" · ") || "No contact"}
                          {" · "}
                          {formatDate(submission.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <span className="text-[13px] font-semibold tabular-nums text-[#303030]">
                          {formatCurrency(submission.subtotal)}
                        </span>
                        {isConverted ? (
                          <Link
                            href={`/app/orders/${submission.orderId}`}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-[#c4d7f2] bg-[#f4f7fd] px-2.5 text-[12px] font-medium text-[#2c6ecb] hover:bg-[#eaf1fb]"
                          >
                            {submission.orderNumber || "Open order"}
                            <ExternalLink className="size-3" />
                          </Link>
                        ) : submission.status !== "cancelled" ? (
                          <>
                            <select
                              className="h-8 rounded-md border border-[#e3e3e3] bg-white px-2 text-[12px]"
                              value={
                                submission.status === "reviewed"
                                  ? "reviewed"
                                  : "new"
                              }
                              onChange={(e) => {
                                void (async () => {
                                  const token = await getIdToken();
                                  if (!token) return;
                                  const res = await updateClientStoreSubmission(
                                    token,
                                    submission.id,
                                    e.target
                                      .value as ClientStoreSubmission["status"]
                                  );
                                  setSubmissions((prev) =>
                                    prev.map((row) =>
                                      row.id === submission.id
                                        ? res.submission
                                        : row
                                    )
                                  );
                                })();
                              }}
                            >
                              <option value="new">New</option>
                              <option value="reviewed">Reviewed</option>
                              <option value="cancelled">Cancel</option>
                            </select>
                            <Button
                              type="button"
                              className={cn(
                                dashboardPrimaryButtonClass,
                                "h-8 px-3 text-[12px]"
                              )}
                              onClick={() => setConvertSubmission(submission)}
                            >
                              Create order
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1">
                      {submission.items.map((item, index) => (
                        <li
                          key={`${submission.id}-${index}`}
                          className="text-[12px] text-[#616161]"
                        >
                          {item.qty}× {item.productName}
                          {item.color ? ` · ${item.color}` : ""} · {item.size} ·{" "}
                          {formatCurrency(item.lineTotal)}
                        </li>
                      ))}
                    </ul>
                    {submission.shopper.notes ? (
                      <p className="mt-2 text-[12px] text-[#8a8a8a]">
                        Note: {submission.shopper.notes}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      <StoreConvertSubmissionDialog
        open={Boolean(convertSubmission)}
        onOpenChange={(open) => {
          if (!open) setConvertSubmission(null);
        }}
        submission={convertSubmission}
        customerId={store?.customerId || ""}
        onConverted={({ submission }) => {
          setSubmissions((prev) =>
            prev.map((row) => (row.id === submission.id ? submission : row))
          );
          setConvertSubmission(null);
        }}
      />

      <StoreProductDialog
        open={productOpen}
        onOpenChange={setProductOpen}
        product={editingProduct}
        onSave={async (product) => {
          const products = [...(store.products || [])];
          const index = products.findIndex((row) => row.id === product.id);
          if (index >= 0) products[index] = product;
          else products.push(product);
          await saveProducts(products);
          setProductOpen(false);
        }}
        onDelete={
          editingProduct
            ? async () => {
                const products = (store.products || []).filter(
                  (row) => row.id !== editingProduct.id
                );
                await saveProducts(products);
                setProductOpen(false);
              }
            : undefined
        }
      />

      {publishSuccess && shareUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#e3e3e3] bg-white p-6 shadow-xl">
            <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Check className="size-5" />
            </div>
            <h3 className="mt-4 text-center text-[18px] font-semibold text-[#121a2e]">
              Store is live
            </h3>
            <p className="mt-2 text-center text-[13px] leading-relaxed text-[#5a6478]">
              Copy this link and send it to {store.company || store.customerName || "your client"}.
              Their team can open it and place size requests.
            </p>
            <div className="mt-5 flex gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="h-10 border-[#e3e3e3] bg-[#fafafa] text-[11px]"
              />
              <Button
                type="button"
                className={dashboardPrimaryButtonClass}
                onClick={() => void copyShareLink()}
              >
                <Copy className="size-3.5" />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                href={shareUrl}
                target="_blank"
                className={cn(dashboardControlClass, "flex-1 justify-center")}
              >
                <ExternalLink className="size-3.5" />
                Preview store
              </Link>
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-3 text-[13px]"
                onClick={() => setPublishSuccess(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
