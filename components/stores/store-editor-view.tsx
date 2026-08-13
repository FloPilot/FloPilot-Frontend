"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Menu,
  Package,
  Plus,
  Settings2,
  CreditCard,
  Tags,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  useRegisterUnsavedChanges,
  useStaffUnsavedChanges,
} from "@/components/layout/staff-unsaved-changes-provider";
import { StoreCollectionsPanel } from "@/components/stores/store-collections-panel";
import { StoreConvertSubmissionDialog } from "@/components/stores/store-convert-submission-dialog";
import { StoreCustomizeBuilder } from "@/components/stores/store-customize-builder";
import { StoreEmployeesPanel } from "@/components/stores/store-employees-panel";
import { StoreNavigationPanel } from "@/components/stores/store-navigation-panel";
import { StorePagesPanel } from "@/components/stores/store-pages-panel";
import { StoreProductEditor } from "@/components/stores/store-product-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteClientStore,
  fetchPaymentIntegrations,
  getClientStore,
  listClientStoreSubmissions,
  updateClientStore,
  updateClientStoreSubmission,
} from "@/lib/api";
import { isStripeConnected } from "@/lib/payment-integrations";
import { readStoreMockupDataUrl } from "@/lib/artwork-preview";
import {
  collectProductTags,
  ensureStoreTheme,
  type ClientStoreTheme,
} from "@/lib/client-store-theme";
import {
  clientStoreModeLabel,
  clientStoreReviewPhase,
  clientStoreReviewPhaseLabel,
  clientStoreStatusLabel,
  computeClientStoreEconomics,
  getEnabledColorVariants,
  getPrimaryMockupUrl,
  isClientStoreReviewMode,
  resolveClientStoreShareUrl,
  type ClientStore,
  type ClientStoreMode,
  type ClientStoreProduct,
  type ClientStoreReviewPhase,
  type ClientStoreSubmission,
  type ClientStoreVoteSummaryRow,
} from "@/lib/client-stores";
import { reviewDecisionKey } from "@/lib/client-store-review";
import { supplierProviderLabel } from "@/lib/supplier-integrations";
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
  | "navigation"
  | "customize"
  | "share"
  | "employees"
  | "orders";

type StoreDraftSnapshotInput = {
  name: string;
  headline: string;
  description: string;
  opensAt: string;
  closesAt: string;
  password: string;
  orderInstructions: string;
  reviewPrompt: string;
  reviewPhase: ClientStoreReviewPhase;
  showPrices: boolean;
  pageBackgroundColor: string;
  accentColorKey: CustomerAccentKey | null;
  theme: ClientStoreTheme;
};

function serializeStoreDraft(input: StoreDraftSnapshotInput): string {
  return JSON.stringify({
    name: input.name.trim(),
    headline: input.headline.trim(),
    description: input.description.trim(),
    opensAt: input.opensAt,
    closesAt: input.closesAt,
    password: input.password.trim(),
    orderInstructions: input.orderInstructions.trim(),
    reviewPrompt: input.reviewPrompt.trim(),
    reviewPhase: input.reviewPhase,
    showPrices: input.showPrices,
    pageBackgroundColor: input.pageBackgroundColor.trim() || "#ffffff",
    accentColorKey: input.accentColorKey,
    theme: input.theme,
  });
}

export function StoreEditorView({ storeId }: { storeId: string }) {
  const { getIdToken } = useAuth();
  const { requestLeave } = useStaffUnsavedChanges();
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
  const [productDirty, setProductDirty] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkTagDraft, setBulkTagDraft] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const productActionsRef = useRef<{
    save: () => Promise<void>;
    discard: () => void;
  } | null>(null);
  const [draftBaseline, setDraftBaseline] = useState("");
  const [convertSubmission, setConvertSubmission] =
    useState<ClientStoreSubmission | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState<"logo" | "hero" | null>(
    null
  );
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(true);

  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [password, setPassword] = useState("");
  const [orderInstructions, setOrderInstructions] = useState("");
  const [reviewPrompt, setReviewPrompt] = useState("");
  const [reviewPhase, setReviewPhase] =
    useState<ClientStoreReviewPhase>("selection");
  const [showPrices, setShowPrices] = useState(false);
  const [pageBackgroundColor, setPageBackgroundColor] = useState("#ffffff");
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
      const nextName = storeRes.store.name || "";
      const nextHeadline = storeRes.store.headline || "";
      const nextDescription = storeRes.store.description || "";
      const nextOpensAt = storeRes.store.opensAt?.slice(0, 16) || "";
      const nextClosesAt = storeRes.store.closesAt?.slice(0, 16) || "";
      const nextOrderInstructions =
        storeRes.store.settings?.orderInstructions || "";
      const nextReviewPrompt = storeRes.store.settings?.reviewPrompt || "";
      const nextReviewPhase = clientStoreReviewPhase(storeRes.store);
      const nextShowPrices = storeRes.store.settings?.showPrices === true;
      const nextPageBackgroundColor =
        storeRes.store.settings?.pageBackgroundColor || "#ffffff";
      const nextAccent =
        (CUSTOMER_ACCENT_OPTIONS.find(
          (opt) => opt.key === storeRes.store.accentColorKey
        )?.key as CustomerAccentKey | undefined) || null;
      const nextTheme = ensureStoreTheme(storeRes.store.theme, {
        name: storeRes.store.name,
        headline: storeRes.store.headline,
        description: storeRes.store.description,
        heroImageUrl: storeRes.store.heroImageUrl,
      });
      setName(nextName);
      setHeadline(nextHeadline);
      setDescription(nextDescription);
      setOpensAt(nextOpensAt);
      setClosesAt(nextClosesAt);
      setOrderInstructions(nextOrderInstructions);
      setReviewPrompt(nextReviewPrompt);
      setReviewPhase(nextReviewPhase);
      setShowPrices(nextShowPrices);
      setPageBackgroundColor(nextPageBackgroundColor);
      setAccentColorKey(nextAccent);
      setTheme(nextTheme);
      setActivePageId((current) => {
        if (current && nextTheme.pages.some((page) => page.id === current)) {
          return current;
        }
        return nextTheme.pages[0]?.id || null;
      });
      setDraftBaseline(serializeStoreDraft({
        name: nextName,
        headline: nextHeadline,
        description: nextDescription,
        opensAt: nextOpensAt,
        closesAt: nextClosesAt,
        password: "",
        orderInstructions: nextOrderInstructions,
        reviewPrompt: nextReviewPrompt,
        reviewPhase: nextReviewPhase,
        showPrices: nextShowPrices,
        pageBackgroundColor: nextPageBackgroundColor,
        accentColorKey: nextAccent,
        theme: nextTheme,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load store");
    } finally {
      setLoading(false);
    }
  }, [getIdToken, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    async function loadStripe() {
      setStripeLoading(true);
      try {
        const token = await getIdToken();
        if (!token) return;
        const result = await fetchPaymentIntegrations(token);
        const stripe = result.integrations?.find(
          (entry) => entry.provider === "stripe"
        );
        if (!cancelled) setStripeReady(isStripeConnected(stripe));
      } catch {
        if (!cancelled) setStripeReady(false);
      } finally {
        if (!cancelled) setStripeLoading(false);
      }
    }
    void loadStripe();
    return () => {
      cancelled = true;
    };
  }, [getIdToken]);

  const enabledProducts = useMemo(
    () => (store?.products || []).filter((p) => p.enabled),
    [store]
  );

  const draftSnapshot = useMemo(
    () =>
      serializeStoreDraft({
        name,
        headline,
        description,
        opensAt,
        closesAt,
        password,
        orderInstructions,
        reviewPrompt,
        reviewPhase,
        showPrices,
        pageBackgroundColor,
        accentColorKey,
        theme,
      }),
    [
      name,
      headline,
      description,
      opensAt,
      closesAt,
      password,
      orderInstructions,
      reviewPrompt,
      reviewPhase,
      showPrices,
      pageBackgroundColor,
      accentColorKey,
      theme,
    ]
  );

  const storeDirty =
    Boolean(store) && !loading && draftSnapshot !== draftBaseline;

  const requestTabChange = useCallback(
    (nextTab: EditorTab) => {
      if (nextTab === tab && !productOpen) return;

      const blocked = productOpen ? productDirty : storeDirty;
      if (blocked) {
        requestLeave();
        return;
      }

      if (productOpen) {
        setProductOpen(false);
        setEditingProduct(null);
        setProductDirty(false);
        setProductSaving(false);
      }
      setTab(nextTab);
    },
    [tab, productOpen, productDirty, storeDirty, requestLeave]
  );

  const discardStoreDraft = useCallback(() => {
    if (!store) return;
    const nextName = store.name || "";
    const nextHeadline = store.headline || "";
    const nextDescription = store.description || "";
    const nextOpensAt = store.opensAt?.slice(0, 16) || "";
    const nextClosesAt = store.closesAt?.slice(0, 16) || "";
    const nextOrderInstructions = store.settings?.orderInstructions || "";
    const nextReviewPrompt = store.settings?.reviewPrompt || "";
    const nextReviewPhase = clientStoreReviewPhase(store);
    const nextShowPrices = store.settings?.showPrices === true;
    const nextPageBackgroundColor =
      store.settings?.pageBackgroundColor || "#ffffff";
    const nextAccent =
      (CUSTOMER_ACCENT_OPTIONS.find((opt) => opt.key === store.accentColorKey)
        ?.key as CustomerAccentKey | undefined) || null;
    const nextTheme = ensureStoreTheme(store.theme, {
      name: store.name,
      headline: store.headline,
      description: store.description,
      heroImageUrl: store.heroImageUrl,
    });
    setName(nextName);
    setHeadline(nextHeadline);
    setDescription(nextDescription);
    setOpensAt(nextOpensAt);
    setClosesAt(nextClosesAt);
    setPassword("");
    setOrderInstructions(nextOrderInstructions);
    setReviewPrompt(nextReviewPrompt);
    setReviewPhase(nextReviewPhase);
    setShowPrices(nextShowPrices);
    setPageBackgroundColor(nextPageBackgroundColor);
    setAccentColorKey(nextAccent);
    setTheme(nextTheme);
    setDraftBaseline(serializeStoreDraft({
      name: nextName,
      headline: nextHeadline,
      description: nextDescription,
      opensAt: nextOpensAt,
      closesAt: nextClosesAt,
      password: "",
      orderInstructions: nextOrderInstructions,
      reviewPrompt: nextReviewPrompt,
      reviewPhase: nextReviewPhase,
      showPrices: nextShowPrices,
      pageBackgroundColor: nextPageBackgroundColor,
      accentColorKey: nextAccent,
      theme: nextTheme,
    }));
  }, [store]);

  const saveDrafts = async () => {
    const token = await getIdToken();
    if (!token || !store) return;
    setSaving(true);
    setError(null);
    try {
      const res = await updateClientStore(token, store.id, {
        name: name.trim(),
        opensAt: opensAt ? new Date(opensAt).toISOString() : null,
        closesAt: closesAt ? new Date(closesAt).toISOString() : null,
        headline: headline.trim() || undefined,
        description: description.trim() || undefined,
        accentColorKey: accentColorKey ?? null,
        theme,
        settings: {
          ...store.settings,
          orderInstructions: orderInstructions.trim() || undefined,
          reviewPrompt: reviewPrompt.trim() || undefined,
          reviewPhase,
          showPrices,
          pageBackgroundColor: pageBackgroundColor.trim() || "#ffffff",
        },
        ...(password.trim()
          ? { password: password.trim(), passwordProtected: true }
          : {}),
      });
      setStore(res.store);
      setPassword("");
      const nextTheme = ensureStoreTheme(res.store.theme, {
        name: res.store.name,
        headline: res.store.headline,
        description: res.store.description,
        heroImageUrl: res.store.heroImageUrl,
      });
      setTheme(nextTheme);
      setHeadline(res.store.headline || "");
      setDescription(res.store.description || "");
      setName(res.store.name || "");
      setOpensAt(res.store.opensAt?.slice(0, 16) || "");
      setClosesAt(res.store.closesAt?.slice(0, 16) || "");
      setOrderInstructions(res.store.settings?.orderInstructions || "");
      setReviewPrompt(res.store.settings?.reviewPrompt || "");
      setReviewPhase(clientStoreReviewPhase(res.store));
      setShowPrices(res.store.settings?.showPrices === true);
      setPageBackgroundColor(
        res.store.settings?.pageBackgroundColor || "#ffffff"
      );
      setAccentColorKey(
        (CUSTOMER_ACCENT_OPTIONS.find(
          (opt) => opt.key === res.store.accentColorKey
        )?.key as CustomerAccentKey | undefined) || null
      );
      setDraftBaseline(serializeStoreDraft({
        name: res.store.name || "",
        headline: res.store.headline || "",
        description: res.store.description || "",
        opensAt: res.store.opensAt?.slice(0, 16) || "",
        closesAt: res.store.closesAt?.slice(0, 16) || "",
        password: "",
        orderInstructions: res.store.settings?.orderInstructions || "",
        reviewPrompt: res.store.settings?.reviewPrompt || "",
        reviewPhase: clientStoreReviewPhase(res.store),
        showPrices: res.store.settings?.showPrices === true,
        pageBackgroundColor:
          res.store.settings?.pageBackgroundColor || "#ffffff",
        accentColorKey:
          (CUSTOMER_ACCENT_OPTIONS.find(
            (opt) => opt.key === res.store.accentColorKey
          )?.key as CustomerAccentKey | undefined) || null,
        theme: nextTheme,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save store");
    } finally {
      setSaving(false);
    }
  };

  useRegisterUnsavedChanges(
    productOpen
      ? {
          dirty: productDirty,
          saving: productSaving || saving,
          label: "Unsaved product",
          onSave: async () => {
            await productActionsRef.current?.save();
          },
          onDiscard: () => {
            productActionsRef.current?.discard();
            setProductDirty(false);
            setProductSaving(false);
            setProductOpen(false);
            setEditingProduct(null);
          },
        }
      : {
          dirty: storeDirty,
          saving,
          label: "Unsaved changes",
          onSave: () => saveDrafts(),
          onDiscard: discardStoreDraft,
        }
  );

  const saveCustomize = async () => {
    await saveDrafts();
  };

  const setStatus = async (status: ClientStore["status"]) => {
    const token = await getIdToken();
    if (!token || !store) return;

    if (status === "published") {
      const enabled = (store.products || []).filter((product) => product.enabled);
      if (enabled.length === 0) {
        setError("Add at least one enabled product before publishing.");
        setTab("products");
        return;
      }
      if (store.mode !== "review") {
        const readyProducts = enabled.filter((product) => product.sellPrice > 0);
        if (readyProducts.length === 0) {
          setError(
            "Add at least one enabled product with a shopper price before publishing."
          );
          setTab("products");
          return;
        }
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
    if (!token) {
      throw new Error("Not signed in. Refresh and try saving again.");
    }
    if (!store) {
      throw new Error("Store is not loaded yet. Try again in a moment.");
    }
    setSaving(true);
    setError(null);
    try {
      const res = await updateClientStore(token, store.id, { products });
      setStore(res.store);
      return res.store;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save products";
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setSaving(false);
    }
  }

  const sortedCatalogProducts = useMemo(
    () =>
      (store?.products || [])
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [store?.products]
  );

  const selectedProductIdSet = useMemo(
    () => new Set(selectedProductIds),
    [selectedProductIds]
  );

  const allCatalogSelected =
    sortedCatalogProducts.length > 0 &&
    sortedCatalogProducts.every((product) =>
      selectedProductIdSet.has(product.id)
    );

  const availableCatalogTags = useMemo(
    () => collectProductTags(store?.products || []),
    [store?.products]
  );

  const toggleProductSelected = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleSelectAllProducts = () => {
    if (allCatalogSelected) {
      setSelectedProductIds([]);
      return;
    }
    setSelectedProductIds(sortedCatalogProducts.map((product) => product.id));
  };

  const normalizeBulkTags = (raw: string): string[] => {
    const seen = new Set<string>();
    const tags: string[] = [];
    for (const part of raw.split(/[,\n]/)) {
      const tag = part.trim().slice(0, 40);
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tags.push(tag);
      if (tags.length >= 24) break;
    }
    return tags;
  };

  const applyBulkProductPatch = async (
    patch: (product: ClientStoreProduct) => ClientStoreProduct
  ) => {
    if (!store || selectedProductIds.length === 0) return;
    const selected = new Set(selectedProductIds);
    const products = (store.products || []).map((product) =>
      selected.has(product.id) ? patch(product) : product
    );
    setBulkSaving(true);
    setError(null);
    try {
      await saveProducts(products);
      setSelectedProductIds([]);
      setBulkTagDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update products");
    } finally {
      setBulkSaving(false);
    }
  };

  const bulkAddTags = async () => {
    const tagsToAdd = normalizeBulkTags(bulkTagDraft);
    if (!tagsToAdd.length) {
      setError("Enter at least one tag to add.");
      return;
    }
    await applyBulkProductPatch((product) => {
      const existing = product.tags || [];
      const seen = new Set(existing.map((tag) => tag.toLowerCase()));
      const merged = [...existing];
      for (const tag of tagsToAdd) {
        if (seen.has(tag.toLowerCase())) continue;
        seen.add(tag.toLowerCase());
        merged.push(tag);
        if (merged.length >= 24) break;
      }
      return { ...product, tags: merged };
    });
  };

  const bulkRemoveTags = async () => {
    const tagsToRemove = new Set(
      normalizeBulkTags(bulkTagDraft).map((tag) => tag.toLowerCase())
    );
    if (!tagsToRemove.size) {
      setError("Enter at least one tag to remove.");
      return;
    }
    await applyBulkProductPatch((product) => ({
      ...product,
      tags: (product.tags || []).filter(
        (tag) => !tagsToRemove.has(tag.toLowerCase())
      ),
    }));
  };
;

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
    {
      id: "navigation",
      label: `Navigation (${
        theme.navigation?.items?.length ||
        theme.pages.filter((p) => p.enabled && p.handle !== "product").length
      })`,
      icon: Menu,
    },
    { id: "customize", label: "Customize", icon: LayoutTemplate },
    { id: "share", label: "Share", icon: Link2 },
    ...(!isClientStoreReviewMode(store)
      ? [{ id: "employees" as const, label: "Employees", icon: Users }]
      : []),
    {
      id: "orders",
      label: `${isClientStoreReviewMode(store) ? "Reviews" : "Orders"} (${submissions.length})`,
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
            {clientStoreModeLabel(store.mode)} store
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
              onClick={() => requestTabChange(item.id)}
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
              <Label className="text-[13px]">Store type</Label>
              <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    {
                      value: "order" as ClientStoreMode,
                      title: "Order store",
                      body: "Shoppers pick sizes and pay by card at checkout when Stripe is connected.",
                    },
                    {
                      value: "review" as ClientStoreMode,
                      title: "Review store",
                      body: "Clients browse products for feedback — vote first, then select.",
                    },
                  ] as const
                ).map((option) => {
                  const active = (store.mode || "order") === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        void (async () => {
                          const token = await getIdToken();
                          if (!token || !store) return;
                          setSaving(true);
                          setError(null);
                          try {
                            const res = await updateClientStore(token, store.id, {
                              mode: option.value,
                            });
                            setStore(res.store);
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Could not update store type"
                            );
                          } finally {
                            setSaving(false);
                          }
                        })();
                      }}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left transition-colors",
                        active
                          ? "border-brand-primary/40 bg-[#f4f7ff]"
                          : "border-[#e3e3e3] bg-white hover:border-[#c9cccf]"
                      )}
                    >
                      <p className="text-[13px] font-semibold text-[#303030]">
                        {option.title}
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-[#8a8a8a]">
                        {option.body}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {(store.mode || "order") === "order" ? (
              <div
                className={cn(
                  "rounded-xl border px-3.5 py-3",
                  stripeReady
                    ? "border-[#cdeccd] bg-[#f1faf1]"
                    : "border-[#ebebeb] bg-[#fafafa]"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#303030]">
                      <CreditCard className="size-3.5" />
                      Card checkout
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-[#616161]">
                      {stripeLoading
                        ? "Checking Stripe…"
                        : stripeReady
                          ? "Stripe is connected. Shoppers will pay by card at checkout; FloPilot takes a small platform fee from your payout (not added to the shopper’s total)."
                          : "Connect Stripe under Settings → Payments so this store can take card payments. Until then, shoppers can only submit an unpaid order request."}
                    </p>
                  </div>
                  {!stripeLoading && !stripeReady ? (
                    <Link
                      href="/app/settings/integrations/payments"
                      className="text-[12px] font-semibold text-brand-primary hover:underline"
                    >
                      Connect Stripe
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}

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
              <Label className="text-[13px]">
                {isClientStoreReviewMode(store)
                  ? "Review instructions"
                  : "Order instructions"}
              </Label>
              <Textarea
                value={orderInstructions}
                onChange={(e) => setOrderInstructions(e.target.value)}
                placeholder={
                  isClientStoreReviewMode(store)
                    ? "Shown near submit — deadlines, who to include, etc."
                    : "Shown at checkout — pickup notes, deadlines, etc."
                }
                className="mt-1.5 min-h-[80px] border-[#e3e3e3] text-[13px]"
              />
            </div>
            {isClientStoreReviewMode(store) ? (
              <>
                <div>
                  <Label className="text-[13px]">Review phase</Label>
                  <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        {
                          value: "voting" as ClientStoreReviewPhase,
                          title: "Voting",
                          body: "Anyone with the link can thumbs up or down. Best for broad internal feedback.",
                        },
                        {
                          value: "selection" as ClientStoreReviewPhase,
                          title: "Selection",
                          body: "Turn on include / pass for final picks. Vote totals stay visible.",
                        },
                      ] as const
                    ).map((option) => {
                      const active = reviewPhase === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setReviewPhase(option.value)}
                          className={cn(
                            "rounded-xl border px-3 py-3 text-left transition-colors",
                            active
                              ? "border-brand-primary/40 bg-[#f4f7ff]"
                              : "border-[#e3e3e3] bg-white hover:border-[#c9cccf]"
                          )}
                        >
                          <p className="text-[13px] font-semibold text-[#303030]">
                            {option.title}
                          </p>
                          <p className="mt-1 text-[12px] leading-relaxed text-[#8a8a8a]">
                            {option.body}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#8a8a8a]">
                    Current: {clientStoreReviewPhaseLabel(reviewPhase)}. Save
                    overview to apply. Share internally in Voting first, then
                    switch to Selection when you’re ready for final include /
                    pass.
                  </p>
                </div>
                <div>
                  <Label className="text-[13px]">Review prompt</Label>
                  <Textarea
                    value={reviewPrompt}
                    onChange={(e) => setReviewPrompt(e.target.value)}
                    placeholder={
                      reviewPhase === "voting"
                        ? "Browse each style and thumbs up or down the colors your team likes."
                        : "Browse each style and mark what you’d like included for this program."
                    }
                    className="mt-1.5 min-h-[72px] border-[#e3e3e3] text-[13px]"
                  />
                  <p className="mt-1 text-[11px] text-[#8a8a8a]">
                    Shown at the top of the public review storefront.
                  </p>
                </div>
                <label className="flex items-start gap-2.5 rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={showPrices}
                    onChange={(e) => setShowPrices(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-[13px] font-medium text-[#303030]">
                      Show prices on the review storefront
                    </span>
                    <span className="mt-0.5 block text-[12px] text-[#8a8a8a]">
                      Off by default so clients focus on product fit, not cost.
                    </span>
                  </span>
                </label>
                <div>
                  <Label className="text-[13px]">Page background</Label>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {["#ffffff", "#f6f6f7", "#f7f5f1", "#f4f7ff", "#0f172a"].map(
                      (color) => (
                        <button
                          key={color}
                          type="button"
                          title={color}
                          onClick={() => setPageBackgroundColor(color)}
                          className={cn(
                            "size-8 rounded-md border",
                            pageBackgroundColor === color
                              ? "ring-2 ring-brand-primary/40"
                              : "border-[#e3e3e3]"
                          )}
                          style={{ background: color }}
                        />
                      )
                    )}
                    <Input
                      value={pageBackgroundColor}
                      onChange={(e) => setPageBackgroundColor(e.target.value)}
                      placeholder="#ffffff"
                      className="h-9 w-28 border-[#e3e3e3] text-[12px]"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-[#8a8a8a]">
                    Matches the live review storefront. Defaults to white.
                  </p>
                </div>
              </>
            ) : null}
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
                onClick={() => requestTabChange("customize")}
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
        productOpen ? (
          <StoreProductEditor
            key={editingProduct?.id ?? "new-product"}
            product={editingProduct}
            collections={theme.collections || []}
            onOpenCollections={() => {
              requestTabChange("collections");
            }}
            onBack={() => {
              if (productDirty) {
                requestLeave();
                return;
              }
              setProductOpen(false);
              setEditingProduct(null);
              setProductDirty(false);
            }}
            onLeaveBlocked={() => {
              requestLeave();
            }}
            onDirtyChange={setProductDirty}
            onSavingChange={setProductSaving}
            onBindUnsavedActions={(actions) => {
              productActionsRef.current = actions;
            }}
            onSave={async (product) => {
              const products = [...(store.products || [])];
              const index = products.findIndex((row) => row.id === product.id);
              if (index >= 0) products[index] = product;
              else products.push(product);
              await saveProducts(products);
              setProductOpen(false);
              setEditingProduct(null);
              setProductDirty(false);
            }}
            onDelete={
              editingProduct
                ? async () => {
                    if (
                      !window.confirm(
                        `Remove “${editingProduct.name}” from this store?`
                      )
                    ) {
                      return;
                    }
                    const products = (store.products || []).filter(
                      (row) => row.id !== editingProduct.id
                    );
                    await saveProducts(products);
                    setProductOpen(false);
                    setEditingProduct(null);
                    setProductDirty(false);
                  }
                : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-[#303030]">
                  Catalog
                </p>
                <p className="text-[12px] text-[#8a8a8a]">
                  Add blanks from suppliers or create manual products with
                  mockups and markup. Select rows to bulk-edit tags or status.
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
              <div className="space-y-3">
                {selectedProductIds.length > 0 ? (
                  <div
                    className={cn(
                      dashboardCardClass,
                      "flex flex-col gap-3 p-3.5 sm:flex-row sm:items-end sm:justify-between"
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Tags className="size-3.5 text-[#2c6ecb]" />
                        <p className="text-[13px] font-semibold text-[#303030]">
                          {selectedProductIds.length} selected
                        </p>
                        <button
                          type="button"
                          className="text-[12px] font-medium text-[#2c6ecb] hover:underline"
                          onClick={() => setSelectedProductIds([])}
                        >
                          Clear
                        </button>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          value={bulkTagDraft}
                          onChange={(e) => setBulkTagDraft(e.target.value)}
                          placeholder="Tags to add or remove (comma-separated)"
                          className="h-9 max-w-md border-[#e3e3e3] text-[12px]"
                          disabled={bulkSaving}
                        />
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            type="button"
                            className={cn(dashboardControlClass, "h-9")}
                            disabled={bulkSaving}
                            onClick={() => void bulkAddTags()}
                          >
                            Add tags
                          </Button>
                          <Button
                            type="button"
                            className={cn(dashboardControlClass, "h-9")}
                            disabled={bulkSaving}
                            onClick={() => void bulkRemoveTags()}
                          >
                            Remove tags
                          </Button>
                          <Button
                            type="button"
                            className={cn(dashboardControlClass, "h-9")}
                            disabled={bulkSaving}
                            onClick={() =>
                              void applyBulkProductPatch((product) => ({
                                ...product,
                                enabled: true,
                              }))
                            }
                          >
                            Set active
                          </Button>
                          <Button
                            type="button"
                            className={cn(dashboardControlClass, "h-9")}
                            disabled={bulkSaving}
                            onClick={() =>
                              void applyBulkProductPatch((product) => ({
                                ...product,
                                enabled: false,
                              }))
                            }
                          >
                            Set draft
                          </Button>
                        </div>
                      </div>
                      {availableCatalogTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {availableCatalogTags.slice(0, 12).map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              disabled={bulkSaving}
                              onClick={() =>
                                setBulkTagDraft((prev) => {
                                  const parts = normalizeBulkTags(prev);
                                  if (
                                    parts.some(
                                      (row) =>
                                        row.toLowerCase() === tag.toLowerCase()
                                    )
                                  ) {
                                    return parts.join(", ");
                                  }
                                  return [...parts, tag].join(", ");
                                })
                              }
                              className="rounded-md border border-[#e3e3e3] bg-white px-2 py-0.5 text-[11px] font-medium text-[#616161] hover:border-[#c9cccf] hover:text-[#303030]"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {bulkSaving ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-[#8a8a8a]" />
                    ) : null}
                  </div>
                ) : null}

                <div className={cn(dashboardCardClass, "overflow-x-auto")}>
                  <table className="w-full min-w-[820px] text-left">
                    <thead>
                      <tr className="border-b border-[#ebebeb] bg-[#fafafa]">
                        <th className="w-10 px-3 py-2.5 sm:px-4">
                          <input
                            type="checkbox"
                            checked={allCatalogSelected}
                            onChange={toggleSelectAllProducts}
                            aria-label="Select all products"
                            className="size-3.5 rounded border-[#c9cccf]"
                          />
                        </th>
                        <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a] sm:px-4">
                          Product
                        </th>
                        <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                          Status
                        </th>
                        <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                          Price
                        </th>
                        <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                          Profit
                        </th>
                        <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                          Variants
                        </th>
                        <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                          Tags
                        </th>
                        <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                          Vendor
                        </th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a] sm:px-5">
                          Supplier
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ebebeb]">
                      {sortedCatalogProducts.map((product) => {
                        const colorCount =
                          getEnabledColorVariants(product).length;
                        const sizeCount = (product.sizes || []).filter(
                          (row) => row.enabled
                        ).length;
                        const economics = computeClientStoreEconomics(product);
                        const selected = selectedProductIdSet.has(product.id);
                        return (
                          <tr
                            key={product.id}
                            onClick={() => {
                              setEditingProduct(product);
                              setProductOpen(true);
                            }}
                            className={cn(
                              "cursor-pointer bg-white transition-colors hover:bg-[#fafafa]",
                              selected && "bg-[#f6f8ff] hover:bg-[#f0f4ff]"
                            )}
                          >
                            <td
                              className="px-3 py-3 sm:px-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() =>
                                  toggleProductSelected(product.id)
                                }
                                aria-label={`Select ${product.name}`}
                                className="size-3.5 rounded border-[#c9cccf]"
                              />
                            </td>
                            <td className="px-3 py-3 sm:px-4">
                              <div className="flex items-center gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#ebebeb] bg-[#fafafa] p-0.5">
                                  {getPrimaryMockupUrl(product) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={getPrimaryMockupUrl(product)}
                                      alt=""
                                      className="size-full object-contain"
                                    />
                                  ) : (
                                    <Package className="size-4 text-[#c0c0c4]" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="max-w-[260px] truncate text-[13px] font-medium text-[#303030]">
                                    {product.name}
                                  </p>
                                  <p className="max-w-[260px] truncate text-[11px] text-[#8a8a8a]">
                                    {[
                                      product.color,
                                      product.decorationType,
                                      Number(product.minOrderQty) > 0
                                        ? `MOQ ${product.minOrderQty}`
                                        : null,
                                      Number(product.setupFee) > 0
                                        ? `Setup ${formatCurrency(product.setupFee || 0)}`
                                        : null,
                                    ]
                                      .map((part) =>
                                        typeof part === "string"
                                          ? part.trim()
                                          : part
                                      )
                                      .filter(Boolean)
                                      .join(" · ") || "—"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                  product.enabled
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-[#eef3fb] text-[#2c6ecb]"
                                )}
                              >
                                {product.enabled ? "Active" : "Draft"}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">
                              <p className="text-[13px] font-medium tabular-nums text-[#303030]">
                                {formatCurrency(economics.sellPrice)}
                              </p>
                              <p className="text-[11px] text-[#8a8a8a]">
                                {product.sellPriceMode === "fixed"
                                  ? "Fixed"
                                  : `${product.markupPercent}% markup`}
                              </p>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">
                              <p
                                className={cn(
                                  "text-[13px] font-medium tabular-nums",
                                  economics.profit > 0
                                    ? "text-emerald-700"
                                    : economics.profit < 0
                                      ? "text-red-700"
                                      : "text-[#303030]"
                                )}
                              >
                                {formatCurrency(economics.profit)}
                              </p>
                              <p className="text-[11px] text-[#8a8a8a]">
                                {economics.marginPercent}% margin
                              </p>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[#616161]">
                              {colorCount > 0
                                ? `${colorCount} color${colorCount === 1 ? "" : "s"}`
                                : "—"}
                              {sizeCount > 0
                                ? ` · ${sizeCount} size${sizeCount === 1 ? "" : "s"}`
                                : ""}
                            </td>
                            <td className="px-3 py-3">
                              {(product.tags || []).length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {(product.tags || [])
                                    .slice(0, 2)
                                    .map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded-md bg-[#f1f1f1] px-1.5 py-0.5 text-[10px] font-medium text-[#616161]"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  {(product.tags || []).length > 2 ? (
                                    <span className="text-[10px] text-[#8a8a8a]">
                                      +{(product.tags || []).length - 2}
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-[12px] text-[#8a8a8a]">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[#616161]">
                              {product.brand || "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[#616161] sm:px-5">
                              {product.supplier
                                ? supplierProviderLabel(product.supplier)
                                : "Manual"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )
      ) : null}

      {tab === "collections" ? (
        <StoreCollectionsPanel
          theme={theme}
          onThemeChange={setTheme}
          products={store.products || []}
          onSave={() => void saveCustomize()}
          saving={saving}
          showSave={false}
        />
      ) : null}

      {tab === "pages" ? (
        <StorePagesPanel
          theme={theme}
          onThemeChange={setTheme}
          onCustomizePage={(pageId) => {
            if (storeDirty) {
              requestLeave();
              return;
            }
            setActivePageId(pageId);
            setTab("customize");
          }}
          onSave={() => void saveCustomize()}
          saving={saving}
          showSave={false}
        />
      ) : null}

      {tab === "navigation" ? (
        <StoreNavigationPanel
          theme={theme}
          storeName={store.name}
          logoUrl={store.logoUrl}
          onThemeChange={setTheme}
          onSave={() => void saveCustomize()}
          saving={saving}
          showSave={false}
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
          pageBackgroundColor={pageBackgroundColor}
          onPageBackgroundColorChange={setPageBackgroundColor}
          onSave={saveCustomize}
          showSave={false}
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

      {tab === "employees" && !isClientStoreReviewMode(store) ? (
        <StoreEmployeesPanel
          store={store}
          onStoreUpdated={(next) => setStore(next)}
        />
      ) : null}

      {tab === "orders" ? (
        <div className="space-y-4">
          {isClientStoreReviewMode(store) ? (
            <div className={cn(dashboardCardClass, "overflow-hidden")}>
              <div className="border-b border-[#ebebeb] px-4 py-3 sm:px-5">
                <p className="text-[14px] font-semibold text-[#303030]">
                  Team votes
                </p>
                <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                  Live thumbs from everyone who opened the share link
                  {clientStoreReviewPhase(store) === "voting"
                    ? " · store is in Voting mode"
                    : " · store is in Selection mode (votes stay visible)"}
                  .
                </p>
              </div>
              {(store.voteSummary || []).length === 0 ? (
                <div className="px-4 py-10 text-center text-[13px] text-[#8a8a8a] sm:px-5">
                  No votes yet. Share the link internally to start collecting
                  thumbs.
                </div>
              ) : (
                <ul className="divide-y divide-[#ebebeb]">
                  {[...(store.voteSummary || [])]
                    .sort((a, b) => b.up + b.down - (a.up + a.down) || b.up - a.up)
                    .map((row: ClientStoreVoteSummaryRow) => {
                      const product = (store.products || []).find(
                        (p) => p.id === row.productId
                      );
                      return (
                        <li
                          key={row.key || reviewDecisionKey(row.productId, row.color)}
                          className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-[#303030]">
                              {product?.name || row.productId}
                              {row.color ? (
                                <span className="font-normal text-[#8a8a8a]">
                                  {" "}
                                  · {row.color}
                                </span>
                              ) : null}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3 text-[12px] font-semibold tabular-nums">
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              <ThumbsUp className="size-3.5" />
                              {row.up}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[#8a8a8a]">
                              <ThumbsDown className="size-3.5" />
                              {row.down}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          ) : null}

        <div className={cn(dashboardCardClass, "overflow-hidden")}>
          {submissions.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-[15px] font-semibold text-[#303030]">
                {isClientStoreReviewMode(store)
                  ? "No selection reviews yet"
                  : "No store orders yet"}
              </p>
              <p className="mt-1 text-[13px] text-[#616161]">
                {isClientStoreReviewMode(store)
                  ? clientStoreReviewPhase(store) === "voting"
                    ? "Include / pass submissions appear here after you switch the store to Selection mode."
                    : "When clients mark products as include or pass, their responses show up here."
                  : "When shoppers submit sizes and contact info, they’ll show up here for review before you create a sales order."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#ebebeb]">
              {submissions.map((submission) => {
                const isConverted = Boolean(submission.orderId);
                const isReview =
                  submission.kind === "review" ||
                  isClientStoreReviewMode(store);
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
                          ) : submission.status === "awaiting_payment" ? (
                            <span className="inline-flex rounded-md bg-[#fff8eb] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8a6116]">
                              Awaiting payment
                            </span>
                          ) : submission.payment?.status === "paid" ? (
                            <span className="inline-flex rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                              Paid
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
                        {isReview ? (
                          <span className="text-[13px] font-semibold tabular-nums text-[#303030]">
                            {submission.includedCount ?? 0} include ·{" "}
                            {submission.excludedCount ?? 0} pass
                          </span>
                        ) : (
                          <span className="text-[13px] font-semibold tabular-nums text-[#303030]">
                            {formatCurrency(submission.subtotal)}
                          </span>
                        )}
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
                            {!isReview ? (
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
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </div>
                    {isReview ? (
                      <ul className="mt-3 space-y-1.5">
                        {(submission.decisions || []).map((row) => (
                          <li
                            key={`${submission.id}-${row.productId}`}
                            className="flex items-start justify-between gap-3 text-[12px] text-[#616161]"
                          >
                            <span className="min-w-0">
                              <span
                                className={cn(
                                  "mr-2 inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                  row.decision === "included"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-[#f1f1f1] text-[#616161]"
                                )}
                              >
                                {row.decision === "included" ? "Include" : "Pass"}
                              </span>
                              {row.productName}
                              {row.color ? ` · ${row.color}` : ""}
                              {row.note ? (
                                <span className="mt-0.5 block text-[#8a8a8a]">
                                  Note: {row.note}
                                </span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="mt-3 space-y-1">
                        {submission.items.map((item, index) => (
                          <li
                            key={`${submission.id}-${index}`}
                            className="text-[12px] text-[#616161]"
                          >
                            {item.qty}× {item.productName}
                            {item.color ? ` · ${item.color}` : ""} · {item.size}{" "}
                            · {formatCurrency(item.lineTotal)}
                          </li>
                        ))}
                      </ul>
                    )}
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
              Copy this link and send it to{" "}
              {store.company || store.customerName || "your client"}.
              {isClientStoreReviewMode(store)
                ? clientStoreReviewPhase(store) === "voting"
                  ? " Their team can open it and thumbs up or down products."
                  : " Their team can open it, review products, and mark what to include."
                : " Their team can open it and place size requests."}
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
