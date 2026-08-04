"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ImagePlus,
  Layers,
  Loader2,
  Search,
  Trash2,
  Truck,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchSupplierBrands,
  fetchSupplierIntegrations,
  fetchSupplierStyleDetail,
  searchSupplierCatalog,
} from "@/lib/api";
import {
  CLIENT_STORE_DEFAULT_SIZES,
  computeClientStoreEconomics,
  computeClientStoreSellPrice,
  getEnabledColorVariants,
  getMockupsForColor,
  getPrimaryMockupUrl,
  syncProductDerivedFields,
  type ClientStoreColorVariant,
  type ClientStoreProduct,
  type ClientStoreProductDesign,
  type ClientStoreSellPriceMode,
  type ClientStoreSizeOption,
} from "@/lib/client-stores";
import {
  resolveCollectionProducts,
  type ClientStoreCollection,
} from "@/lib/client-store-theme";
import { formatCurrency } from "@/lib/format";
import {
  isSanMarIntegrationUsable,
  isSsIntegrationUsable,
  supplierProviderLabel,
  type SupplierBrand,
  type SupplierProviderId,
  type SupplierStyleDetail,
  type SupplierStyleSummary,
} from "@/lib/supplier-integrations";
import { readStoreMockupDataUrl } from "@/lib/artwork-preview";
import { cn } from "@/lib/utils";
import {
  blankCostFromColors,
  buildVariantsFromSelection,
  collectSizesFromColors,
  colorKey,
  StoreCatalogConfigureStep,
  StoreCatalogMockupsStep,
} from "@/components/stores/store-catalog-flow";
import { StoreProductDesignStudio } from "@/components/stores/store-product-design-studio";

const fieldClassName =
  "h-10 rounded-lg border-[#e3e3e3] bg-white text-[13px] text-[#303030] shadow-none focus-visible:border-brand-primary/40 focus-visible:ring-2 focus-visible:ring-brand-primary/15";

const QUICK_BRAND_HINTS: Record<SupplierProviderId, string[]> = {
  ssActivewear: [
    "Gildan",
    "Comfort Colors",
    "Bella + Canvas",
    "Next Level",
    "Hanes",
    "Champion",
    "Port & Company",
    "Sport-Tek",
  ],
  sanMar: [
    "Port & Company",
    "Port Authority",
    "District",
    "Sport-Tek",
    "Nike",
    "OGIO",
    "Eddie Bauer",
    "Bella+Canvas",
  ],
};

function emptyProduct(): ClientStoreProduct {
  return {
    id: `cprod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    description: "",
    insights: "",
    brand: "",
    color: "",
    colors: [],
    colorVariants: [],
    sizes: CLIENT_STORE_DEFAULT_SIZES.map((size) => ({ size, enabled: true })),
    mockupUrl: "",
    tags: [],
    blankCost: 0,
    decorationCost: 0,
    markupPercent: 40,
    sellPrice: 0,
    sellPriceMode: "markup",
    sortOrder: 0,
    enabled: true,
  };
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#e3e3e3] bg-white p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-[14px] font-semibold text-[#121a2e]">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-[12px] leading-relaxed text-[#8a8a8a]">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function BrandChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
        active
          ? "border-brand-primary bg-[#eef1ff] text-[#303030]"
          : "border-[#c9cccf] bg-white text-[#616161] hover:border-[#999999] hover:bg-[#fafafa]"
      )}
    >
      {label}
    </button>
  );
}

export function StoreProductEditor({
  product,
  collections = [],
  onOpenCollections,
  onBack,
  onSave,
  onDelete,
  onDirtyChange,
  onBindUnsavedActions,
  onLeaveBlocked,
  onSavingChange,
}: {
  product: ClientStoreProduct | null;
  collections?: ClientStoreCollection[];
  onOpenCollections?: () => void;
  onBack: () => void;
  onSave: (product: ClientStoreProduct) => Promise<void>;
  onDelete?: () => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
  onBindUnsavedActions?: (
    actions: { save: () => Promise<void>; discard: () => void } | null
  ) => void;
  onLeaveBlocked?: () => void;
}) {
  const { getIdToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<ClientStoreProduct>(emptyProduct());
  const [tagDraft, setTagDraft] = useState("");
  const tagsRef = useRef<string[]>([]);
  const [mode, setMode] = useState<
    "edit" | "search" | "configure" | "mockups" | "design"
  >("edit");
  const [saving, setSaving] = useState(false);
  const [uploadingMockup, setUploadingMockup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [styleDetail, setStyleDetail] = useState<SupplierStyleDetail | null>(
    null
  );
  const [selectedColorKeys, setSelectedColorKeys] = useState<Set<string>>(
    () => new Set()
  );
  const [configureSizes, setConfigureSizes] = useState<
    ClientStoreSizeOption[]
  >([]);
  const [wizardVariants, setWizardVariants] = useState<
    ClientStoreColorVariant[]
  >([]);

  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState<
    SupplierProviderId[]
  >([]);
  const [catalogProvider, setCatalogProvider] =
    useState<SupplierProviderId>("ssActivewear");

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [brands, setBrands] = useState<SupplierBrand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<SupplierStyleSummary[]>([]);
  const [loadingStyleKey, setLoadingStyleKey] = useState<string | null>(null);

  const providerLabel = supplierProviderLabel(catalogProvider);
  const quickBrandHints = QUICK_BRAND_HINTS[catalogProvider];

  useEffect(() => {
    const next = product
      ? { ...product, tags: product.tags || [] }
      : emptyProduct();
    setDraft(next);
    tagsRef.current = next.tags || [];
    setTagDraft("");
    setMode("edit");
    setQuery("");
    setDebouncedQuery("");
    setBrandFilter(null);
    setResults([]);
    setError(null);
    setSearchError(null);
    setBrandMenuOpen(false);
    setStyleDetail(null);
    setSelectedColorKeys(new Set());
    setConfigureSizes([]);
    setWizardVariants([]);
    setGalleryIndex(0);
  }, [product]);

  useEffect(() => {
    tagsRef.current = draft.tags || [];
  }, [draft.tags]);

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify(
        product
          ? { ...product, tags: product.tags || [] }
          : emptyProduct()
      ),
    [product]
  );

  const productDirty = useMemo(() => {
    const current = JSON.stringify({
      ...draft,
      tags: draft.tags || [],
    });
    if (current !== initialSnapshot) return true;
    if (tagDraft.trim()) return true;
    if (mode === "configure" || mode === "mockups" || mode === "design") {
      return true;
    }
    return false;
  }, [draft, initialSnapshot, tagDraft, mode]);

  useEffect(() => {
    onDirtyChange?.(productDirty);
  }, [productDirty, onDirtyChange]);

  useEffect(() => {
    onSavingChange?.(saving);
  }, [saving, onSavingChange]);

  const saveActionRef = useRef<(() => Promise<void>) | null>(null);
  const discardActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadIntegrations() {
      setLoadingIntegrations(true);
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const { integrations } = await fetchSupplierIntegrations(token);
        const ssOk = isSsIntegrationUsable(
          integrations.find((entry) => entry.provider === "ssActivewear")
        );
        const sanMarOk = isSanMarIntegrationUsable(
          integrations.find((entry) => entry.provider === "sanMar")
        );
        const connected: SupplierProviderId[] = [];
        if (ssOk) connected.push("ssActivewear");
        if (sanMarOk) connected.push("sanMar");
        if (!cancelled) {
          setConnectedProviders(connected);
          setCatalogProvider((current) =>
            connected.includes(current)
              ? current
              : connected[0] || "ssActivewear"
          );
        }
      } catch {
        if (!cancelled) setConnectedProviders([]);
      } finally {
        if (!cancelled) setLoadingIntegrations(false);
      }
    }

    void loadIntegrations();
    return () => {
      cancelled = true;
    };
  }, [getIdToken]);

  useEffect(() => {
    setQuery("");
    setDebouncedQuery("");
    setBrandFilter(null);
    setResults([]);
    setSearchError(null);
    setBrandMenuOpen(false);
  }, [catalogProvider]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (mode !== "search" || connectedProviders.length === 0) return;
    let cancelled = false;

    async function loadBrands() {
      setLoadingBrands(true);
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const { brands: next } = await fetchSupplierBrands(
          token,
          catalogProvider
        );
        if (!cancelled) setBrands(next);
      } catch {
        if (!cancelled) setBrands([]);
      } finally {
        if (!cancelled) setLoadingBrands(false);
      }
    }

    void loadBrands();
    return () => {
      cancelled = true;
    };
  }, [mode, catalogProvider, connectedProviders.length, getIdToken]);

  const shouldSearch = debouncedQuery.length >= 2 || Boolean(brandFilter);

  useEffect(() => {
    if (mode !== "search") return;
    if (!shouldSearch) {
      setResults([]);
      setSearchError(null);
      return;
    }

    let cancelled = false;

    async function runSearch() {
      setSearching(true);
      setSearchError(null);
      try {
        const token = await getIdToken();
        if (!token) return;
        const { results: next } = await searchSupplierCatalog(
          token,
          debouncedQuery,
          {
            provider: catalogProvider,
            brand: brandFilter || undefined,
            limit: 50,
          }
        );
        if (!cancelled) setResults(next);
      } catch (err) {
        if (!cancelled) {
          setResults([]);
          setSearchError(err instanceof Error ? err.message : "Search failed");
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }

    void runSearch();
    return () => {
      cancelled = true;
    };
  }, [
    mode,
    debouncedQuery,
    brandFilter,
    catalogProvider,
    getIdToken,
    shouldSearch,
  ]);

  const brandChipOptions = useMemo(() => {
    const normalized = debouncedQuery.toLowerCase();
    const matching = normalized
      ? brands.filter((brand) => brand.name.toLowerCase().includes(normalized))
      : brands;
    const quickMatches = quickBrandHints
      .map((hint) =>
        brands.find((brand) => brand.name.toLowerCase() === hint.toLowerCase())
      )
      .filter((brand): brand is SupplierBrand => Boolean(brand));
    const merged = new Map<string, SupplierBrand>();
    for (const brand of [...quickMatches, ...matching]) {
      merged.set(brand.name, brand);
    }
    return Array.from(merged.values()).slice(0, 12);
  }, [brands, debouncedQuery, quickBrandHints]);

  const filteredBrandMenu = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return brands;
    return brands.filter((brand) =>
      brand.name.toLowerCase().includes(normalized)
    );
  }, [brands, query]);

  const previewPrice = useMemo(
    () => computeClientStoreSellPrice(draft),
    [draft]
  );
  const economics = useMemo(
    () => computeClientStoreEconomics(draft),
    [draft]
  );
  const enabledColorVariants = useMemo(
    () => getEnabledColorVariants(draft),
    [draft]
  );
  const enabledSizeCount = draft.sizes.filter((row) => row.enabled).length;
  const hasDesignArtwork = Boolean(
    draft.design?.artworkUrl || draft.design?.artworkCleanUrl
  );
  const matchedCollections = useMemo(() => {
    const probe = { ...draft, enabled: true };
    return (collections || []).filter(
      (collection) =>
        collection.enabled !== false &&
        resolveCollectionProducts(collection, [probe]).length > 0
    );
  }, [collections, draft]);
  const galleryPreviewUrls = useMemo(() => {
    const urls: string[] = [];
    for (const variant of enabledColorVariants) {
      for (const url of variant.mockupUrls || []) {
        if (url && !urls.includes(url)) urls.push(url);
      }
    }
    if (urls.length === 0 && draft.mockupUrl) urls.push(draft.mockupUrl);
    return urls.slice(0, 8);
  }, [enabledColorVariants, draft.mockupUrl]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const updateDraft = (patch: Partial<ClientStoreProduct>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      next.sellPrice = computeClientStoreSellPrice(next);
      return next;
    });
  };

  const applyBrandFilter = (brandName: string | null) => {
    setBrandFilter(brandName);
    setBrandMenuOpen(false);
    searchInputRef.current?.focus();
  };

  const clearBrandFilter = () => applyBrandFilter(null);

  const pickStyle = async (style: SupplierStyleSummary) => {
    const styleKey =
      style.partNumber ||
      (style.styleId != null ? String(style.styleId) : "");
    if (!styleKey) {
      setSearchError("This style is missing a catalog ID. Try searching again.");
      return;
    }

    const token = await getIdToken();
    if (!token) return;
    setLoadingStyleKey(styleKey);
    setSearchError(null);
    setError(null);
    try {
      const detail = await fetchSupplierStyleDetail(
        token,
        style,
        catalogProvider
      );
      const nextStyle = detail.style;
      const first = nextStyle.colors?.[0];
      const initialKeys = new Set(
        first ? [colorKey(first)] : []
      );
      const sizes = collectSizesFromColors(nextStyle.colors || []);

      setStyleDetail(nextStyle);
      setSelectedColorKeys(initialKeys);
      setConfigureSizes(sizes);
      setWizardVariants([]);
      updateDraft({
        name: style.title || `${style.brandName} ${style.styleName}`,
        brand: style.brandName,
        productKey: style.partNumber,
        supplier: catalogProvider,
        supplierPartNumber: style.partNumber,
        supplierStyleId:
          style.styleId != null ? String(style.styleId) : undefined,
        sellPriceMode: "markup",
      });
      setMode("configure");
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : "Could not load style"
      );
    } finally {
      setLoadingStyleKey(null);
    }
  };

  const applyConfigureAndContinue = () => {
    if (!styleDetail) return;
    if (selectedColorKeys.size === 0) {
      setError("Select at least one color.");
      return;
    }
    if (!configureSizes.some((row) => row.enabled)) {
      setError("Enable at least one size.");
      return;
    }

    const selectedColors = styleDetail.colors.filter((color) =>
      selectedColorKeys.has(colorKey(color))
    );
    const variants = buildVariantsFromSelection(
      styleDetail,
      selectedColorKeys
    );
    const blankCost = blankCostFromColors(selectedColors);

    setWizardVariants(variants);
    updateDraft({
      sizes: configureSizes,
      blankCost,
      colorVariants: variants,
      colors: variants.map((variant) => variant.name),
      color: variants[0]?.name || "",
      mockupUrl: variants[0]?.mockupUrls?.[0] || "",
    });
    setError(null);
    setMode("mockups");
  };

  const applyMockupsAndContinue = () => {
    const synced = syncProductDerivedFields({
      ...draft,
      colorVariants: wizardVariants,
      sizes: configureSizes.length ? configureSizes : draft.sizes,
    });
    setDraft({
      ...synced,
      sellPrice: computeClientStoreSellPrice(synced),
    });
    setError(null);
    setMode("edit");
  };

  const openDesignStudio = () => {
    const existing = draft.colorVariants || [];
    const variants =
      existing.length > 0
        ? existing
        : getEnabledColorVariants(draft).map((variant) => ({
            ...variant,
            mockupUrls: variant.mockupUrls || [],
          }));
    updateDraft({ colorVariants: variants });
    setError(null);
    setMode("design");
  };

  const handleStudioVariantsChange = (next: ClientStoreColorVariant[]) => {
    const firstEnabled = next.find((variant) => variant.enabled !== false);
    updateDraft({
      colorVariants: next,
      mockupUrl:
        (firstEnabled?.mockupUrls || []).find(Boolean) || draft.mockupUrl || "",
    });
  };

  const handleStudioDesignChange = (next: ClientStoreProductDesign) => {
    updateDraft({ design: next });
  };

  const handleMockup = async (file: File | null) => {
    if (!file) return;
    setUploadingMockup(true);
    setError(null);
    try {
      const { previewUrl, error: readError } = await readStoreMockupDataUrl(file);
      if (readError || !previewUrl) {
        setError(
          readError ||
            "Could not read that image. Try a PNG, JPG, or WebP under ~10MB."
        );
        return;
      }
      const variants = draft.colorVariants || [];
      if (variants.length > 0) {
        const nextVariants = variants.map((variant, index) =>
          index === 0
            ? {
                ...variant,
                mockupUrls: [previewUrl, ...(variant.mockupUrls || []).slice(1)],
              }
            : variant
        );
        updateDraft(
          syncProductDerivedFields({
            ...draft,
            colorVariants: nextVariants,
            mockupUrl: previewUrl,
          })
        );
      } else {
        updateDraft({ mockupUrl: previewUrl });
      }
    } catch {
      setError("Could not process that image. Please try another file.");
    } finally {
      setUploadingMockup(false);
    }
  };

  const commitPendingTag = (raw = tagDraft): string[] => {
    const next = raw.replace(/,/g, "").trim();
    const existing = tagsRef.current;
    if (!next) {
      setTagDraft("");
      return existing;
    }
    if (existing.some((tag) => tag.toLowerCase() === next.toLowerCase())) {
      setTagDraft("");
      return existing;
    }
    const merged = [...existing, next].slice(0, 24);
    tagsRef.current = merged;
    updateDraft({ tags: merged });
    setTagDraft("");
    return merged;
  };

  const handleSave = async () => {
    if (!draft.name.trim()) {
      setError("Product name is required.");
      setMode("edit");
      return;
    }
    if (!(previewPrice > 0)) {
      setError("Set a shopper price greater than zero.");
      setMode("edit");
      return;
    }
    if (enabledSizeCount === 0) {
      setError("Enable at least one size.");
      setMode("edit");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Commit any in-progress tag first. Use the ref so a blur→save race
      // (blur clears tagDraft before draft.tags has flushed) can't drop tags.
      const tags = Array.from(
        new Set(
          commitPendingTag(tagDraft)
            .map((tag) => tag.trim())
            .filter(Boolean)
        )
      ).slice(0, 24);
      tagsRef.current = tags;
      const synced = syncProductDerivedFields({
        ...draft,
        name: draft.name.trim(),
        sellPrice: previewPrice,
        tags,
        colors: draft.color
          ? Array.from(
              new Set([draft.color, ...(draft.colors || [])].filter(Boolean))
            )
          : draft.colors || [],
      });
      await onSave(synced);
      setTagDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save product");
    } finally {
      setSaving(false);
    }
  };

  const discardProductDraft = () => {
    const next = product
      ? { ...product, tags: product.tags || [] }
      : emptyProduct();
    setDraft(next);
    tagsRef.current = next.tags || [];
    setTagDraft("");
    setMode("edit");
    setQuery("");
    setDebouncedQuery("");
    setBrandFilter(null);
    setResults([]);
    setError(null);
    setSearchError(null);
    setStyleDetail(null);
    setSelectedColorKeys(new Set());
    setConfigureSizes([]);
    setWizardVariants([]);
    setGalleryIndex(0);
    // Parent handles closing / clearing dirty — do not call onBack() here
    // (onBack is leave-guarded and would shake the save bar).
  };

  saveActionRef.current = handleSave;
  discardActionRef.current = discardProductDraft;

  useEffect(() => {
    if (!onBindUnsavedActions) return;
    onBindUnsavedActions({
      save: async () => {
        await saveActionRef.current?.();
      },
      discard: () => {
        discardActionRef.current?.();
      },
    });
    return () => onBindUnsavedActions(null);
  }, [onBindUnsavedActions]);

  const resultsLabel = brandFilter
    ? debouncedQuery.length >= 2
      ? `${results.length} result${results.length !== 1 ? "s" : ""} in ${brandFilter}`
      : `Browsing ${brandFilter}`
    : debouncedQuery.length >= 2
      ? `${results.length} result${results.length !== 1 ? "s" : ""}`
      : null;

  const headerBack = () => {
    setError(null);
    if (mode === "design") {
      setMode("edit");
      return;
    }
    if (mode === "mockups") {
      setMode(styleDetail ? "configure" : "edit");
      return;
    }
    if (mode === "configure") {
      setMode("search");
      return;
    }
    if (productDirty) {
      onLeaveBlocked?.();
      return;
    }
    onBack();
  };

  return (
    <div className="flex h-[calc(100dvh-240px)] min-h-[560px] w-full flex-col overflow-hidden rounded-2xl border border-[#e3e3e3] bg-white shadow-sm">
      {/* Fixed header — only the body below scrolls. */}
      <div className="shrink-0 border-b border-[#ebebeb] bg-white px-4 pt-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={headerBack}
              aria-label="Back"
              className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#e3e3e3] bg-white text-[#616161] transition-colors hover:bg-[#fafafa] hover:text-[#303030]"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="max-w-[420px] truncate text-[17px] font-semibold tracking-tight text-[#121a2e]">
                  {draft.name.trim() ||
                    (product ? "Edit product" : "Add product")}
                </h2>
                <span
                  className={cn(
                    "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    draft.enabled
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-[#eef3fb] text-[#2c6ecb]"
                  )}
                >
                  {draft.enabled ? "Active" : "Draft"}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[#8a8a8a]">
                {mode === "configure"
                  ? "Choose which colors and sizes this store product should offer."
                  : mode === "mockups"
                    ? "Assign front and back mockups for each selected color."
                    : mode === "design"
                      ? "Drop your artwork onto each color’s blank and save decorated mockups."
                      : "Set the mockup, sizes, and shopper price. Start from a supplier blank or enter details manually."}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {mode === "edit" && onDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="h-9 rounded-lg px-2.5 text-[13px] font-medium text-red-700 hover:bg-red-50 hover:text-red-800"
                disabled={saving}
                onClick={() => void onDelete()}
                title="Remove product"
              >
                <Trash2 className="size-3.5" />
              </Button>
            ) : null}
            {mode === "search" ? (
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg border-[#e3e3e3] bg-white px-3 text-[13px] font-medium"
                onClick={() => setMode("edit")}
              >
                Skip to details
              </Button>
            ) : null}
            {mode === "edit" || mode === "search" ? (
              <Button
                type="button"
                className="h-9 rounded-lg bg-brand-primary px-4 text-[13px] font-medium text-white hover:bg-brand-primary/90"
                disabled={saving || Boolean(loadingStyleKey)}
                onClick={() => {
                  if (mode === "search") {
                    setMode("edit");
                    return;
                  }
                  void handleSave();
                }}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {mode === "search" ? "Continue to details" : "Save product"}
              </Button>
            ) : mode === "design" ? (
              <Button
                type="button"
                className="h-9 rounded-lg bg-brand-primary px-4 text-[13px] font-medium text-white hover:bg-brand-primary/90"
                onClick={() => {
                  setMode("edit");
                  setError(null);
                }}
              >
                Done designing
              </Button>
            ) : (
              <Button
                type="button"
                className="h-9 rounded-lg bg-brand-primary px-4 text-[13px] font-medium text-white hover:bg-brand-primary/90"
                disabled={
                  mode === "configure" &&
                  (selectedColorKeys.size === 0 ||
                    !configureSizes.some((row) => row.enabled))
                }
                onClick={() => {
                  if (mode === "configure") applyConfigureAndContinue();
                  else applyMockupsAndContinue();
                }}
              >
                {mode === "configure"
                  ? "Continue to mockups"
                  : "Continue to pricing"}
              </Button>
            )}
          </div>
        </div>

        {mode === "edit" || mode === "search" ? (
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-[#e3e3e3] bg-[#f4f4f5] p-1">
            {(
              [
                ["edit", "Product details"],
                ["search", "Supplier catalog"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setError(null);
                  setSearchError(null);
                }}
                className={cn(
                  "rounded-md px-3 py-2 text-center text-[13px] font-medium transition-colors",
                  mode === value
                    ? "bg-white text-[#121a2e] shadow-[0_1px_2px_rgba(26,26,26,0.08)]"
                    : "text-[#616161] hover:text-[#303030]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] px-4 py-5 sm:px-6">
          {mode === "configure" && styleDetail ? (
            <StoreCatalogConfigureStep
              styleDetail={styleDetail}
              selectedKeys={selectedColorKeys}
              onSelectedKeysChange={setSelectedColorKeys}
              sizes={configureSizes}
              onSizesChange={setConfigureSizes}
              onBack={() => {
                setMode("search");
                setError(null);
              }}
            />
          ) : mode === "mockups" ? (
            <StoreCatalogMockupsStep
              variants={wizardVariants}
              onVariantsChange={setWizardVariants}
              onBack={() => {
                setMode(styleDetail ? "configure" : "edit");
                setError(null);
              }}
              onError={setError}
              backLabel={
                styleDetail ? "Back to colors & sizes" : "Back to details"
              }
            />
          ) : mode === "design" ? (
            <StoreProductDesignStudio
              variants={draft.colorVariants || []}
              design={draft.design}
              onVariantsChange={handleStudioVariantsChange}
              onDesignChange={handleStudioDesignChange}
              onError={setError}
            />
          ) : mode === "search" ? (
            <div className="space-y-4">
              {loadingIntegrations ? (
                <div className="flex items-center gap-2 rounded-xl border border-[#e3e3e3] bg-white px-4 py-8 text-[13px] text-[#616161]">
                  <Loader2 className="size-4 animate-spin" />
                  Checking connected suppliers…
                </div>
              ) : connectedProviders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#e3e3e3] bg-white px-4 py-8 text-center">
                  <p className="text-[14px] font-medium text-[#303030]">
                    No suppliers connected
                  </p>
                  <p className="mt-1 text-[13px] text-[#8a8a8a]">
                    Connect S&S or SanMar to search blanks here, or switch to
                    Product details to add a listing manually.
                  </p>
                  <Link
                    href="/app/settings/integrations"
                    className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-[#e3e3e3] bg-white px-3 text-[13px] font-medium text-[#303030] hover:bg-[#fafafa]"
                  >
                    Open integrations
                  </Link>
                </div>
              ) : (
                <>
                  <Section
                    title="Supplier"
                    description="Search uses the same catalog experience as adding blanks on an order."
                  >
                    <div
                      className={cn(
                        "grid gap-1 rounded-lg border border-[#e3e3e3] bg-[#f4f4f5] p-1",
                        connectedProviders.length === 1
                          ? "grid-cols-1"
                          : "grid-cols-2"
                      )}
                    >
                      {connectedProviders.map((provider) => (
                        <button
                          key={provider}
                          type="button"
                          onClick={() => setCatalogProvider(provider)}
                          className={cn(
                            "rounded-md px-3 py-2.5 text-center text-[13px] font-medium transition-colors",
                            catalogProvider === provider
                              ? "bg-white text-[#121a2e] shadow-[0_1px_2px_rgba(26,26,26,0.08)]"
                              : "text-[#616161] hover:text-[#303030]"
                          )}
                        >
                          {supplierProviderLabel(provider)}
                        </button>
                      ))}
                    </div>
                  </Section>

                  <div className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white">
                    <div className="border-b border-[#ebebeb] px-3 py-2.5 sm:px-4">
                      <div
                        className={cn(
                          "flex min-h-[44px] flex-wrap items-center gap-2 rounded-lg border bg-white px-3 py-2 transition-colors sm:flex-nowrap sm:py-1.5",
                          "border-[#c9cccf] focus-within:border-[#303030] focus-within:ring-1 focus-within:ring-[#303030]"
                        )}
                      >
                        <Search className="size-[18px] shrink-0 text-[#616161]" />

                        {brandFilter ? (
                          <span className="inline-flex max-w-full shrink-0 items-center gap-1 rounded-md bg-[#eef1ff] py-0.5 pl-2 pr-1 text-xs font-medium text-[#303030] sm:max-w-[45%]">
                            <span className="truncate">{brandFilter}</span>
                            <button
                              type="button"
                              onClick={clearBrandFilter}
                              className="rounded p-0.5 text-[#616161] transition-colors hover:bg-[#dbe3ff] hover:text-[#303030]"
                              aria-label={`Remove ${brandFilter} filter`}
                            >
                              <X className="size-3" strokeWidth={2} />
                            </button>
                          </span>
                        ) : null}

                        <input
                          ref={searchInputRef}
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          onKeyDown={(event) => {
                            if (
                              event.key === "Backspace" &&
                              query.length === 0 &&
                              brandFilter &&
                              (event.currentTarget.selectionStart ?? 0) === 0
                            ) {
                              event.preventDefault();
                              clearBrandFilter();
                            }
                          }}
                          placeholder={
                            brandFilter
                              ? `Search within ${brandFilter}…`
                              : "Search brands, styles, part numbers…"
                          }
                          className="min-w-0 flex-1 basis-[140px] bg-transparent text-[14px] text-[#303030] outline-none placeholder:text-[#8c9196]"
                          autoFocus
                        />

                        {searching ? (
                          <Loader2 className="size-4 shrink-0 animate-spin text-[#8a8a8a]" />
                        ) : query ? (
                          <button
                            type="button"
                            onClick={() => setQuery("")}
                            className="rounded p-0.5 text-[#616161] hover:text-[#303030]"
                            aria-label="Clear search"
                          >
                            <X className="size-3.5" />
                          </button>
                        ) : null}

                        <div className="relative w-full shrink-0 sm:ml-auto sm:w-auto">
                          <button
                            type="button"
                            onClick={() =>
                              setBrandMenuOpen((current) => !current)
                            }
                            className="inline-flex h-8 w-full items-center justify-between gap-1 rounded-md border border-[#e3e3e3] px-2.5 text-[12px] font-medium text-[#303030] hover:bg-[#fafafa] sm:w-auto sm:justify-center"
                            aria-expanded={brandMenuOpen}
                          >
                            <span>
                              {brandFilter ? "Change brand" : "All brands"}
                            </span>
                            <ChevronDown className="size-3.5 text-[#616161]" />
                          </button>

                          {brandMenuOpen ? (
                            <>
                              <button
                                type="button"
                                className="fixed inset-0 z-10 cursor-default"
                                aria-label="Close brand menu"
                                onClick={() => setBrandMenuOpen(false)}
                              />
                              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[#e3e3e3] bg-white py-1 shadow-lg sm:left-auto sm:right-0 sm:w-56">
                                <button
                                  type="button"
                                  onClick={() => applyBrandFilter(null)}
                                  className={cn(
                                    "flex w-full px-3 py-2 text-left text-[13px] hover:bg-[#f6f6f7]",
                                    !brandFilter &&
                                      "bg-[#eef1ff] font-medium text-brand-primary"
                                  )}
                                >
                                  All brands
                                </button>
                                {loadingBrands ? (
                                  <p className="px-3 py-4 text-center text-[12px] text-[#616161]">
                                    Loading brands…
                                  </p>
                                ) : (
                                  filteredBrandMenu.map((brand) => (
                                    <button
                                      key={brand.brandId ?? brand.name}
                                      type="button"
                                      onClick={() =>
                                        applyBrandFilter(brand.name)
                                      }
                                      className={cn(
                                        "flex w-full px-3 py-2 text-left text-[13px] hover:bg-[#f6f6f7]",
                                        brandFilter === brand.name &&
                                          "bg-[#eef1ff] font-medium text-brand-primary"
                                      )}
                                    >
                                      {brand.name}
                                    </button>
                                  ))
                                )}
                              </div>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="scrollbar-none mt-2.5 flex gap-2 overflow-x-auto pb-1">
                        <BrandChip
                          label="All brands"
                          active={!brandFilter}
                          onClick={() => applyBrandFilter(null)}
                        />
                        {brandChipOptions.map((brand) => (
                          <BrandChip
                            key={brand.brandId ?? brand.name}
                            label={brand.name}
                            active={brandFilter === brand.name}
                            onClick={() =>
                              applyBrandFilter(
                                brandFilter === brand.name ? null : brand.name
                              )
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 px-3 py-3 sm:px-4">
                      <p className="text-[12px] text-[#616161]">
                        {brandFilter
                          ? `Showing styles from ${brandFilter}. Keep typing to narrow by style number or name.`
                          : `Pick a brand or search ${providerLabel} by brand, style number, or part number.`}
                        {resultsLabel ? (
                          <span className="ml-1 font-medium text-[#303030]">
                            · {resultsLabel}
                          </span>
                        ) : null}
                      </p>

                      {searchError ? (
                        <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
                          {searchError}
                        </p>
                      ) : null}

                      {!shouldSearch ? (
                        <div className="flex items-start gap-3 rounded-lg border border-[#ebebeb] bg-[#fafafa] px-4 py-4 text-[12px] text-[#616161]">
                          <Truck className="mt-0.5 size-4 shrink-0 text-brand-primary" />
                          <div>
                            <p className="font-medium text-[#303030]">
                              Start with a brand or search term
                            </p>
                            <p className="mt-1">
                              Tap a brand chip like{" "}
                              <span className="font-medium">Comfort Colors</span>
                              , or search{" "}
                              <span className="font-medium">
                                {catalogProvider === "sanMar"
                                  ? "PC61 / K500"
                                  : "Gildan 2000 / 1717"}
                              </span>
                              .
                            </p>
                          </div>
                        </div>
                      ) : searching && results.length === 0 ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-[#616161]">
                          <Loader2 className="size-4 animate-spin" />
                          {brandFilter
                            ? `Loading ${brandFilter} styles…`
                            : "Searching catalog…"}
                        </div>
                      ) : results.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-[#d4d4d4] px-4 py-10 text-center">
                          <p className="text-[14px] font-semibold text-[#303030]">
                            No styles found
                          </p>
                          <p className="mx-auto mt-2 max-w-md text-[13px] text-[#616161]">
                            {debouncedQuery
                              ? `Nothing matched "${debouncedQuery}"${brandFilter ? ` in ${brandFilter}` : ""}. Try a style number like ${catalogProvider === "sanMar" ? "PC61 or K500" : "1717 or 2000"}.`
                              : `No styles are available for ${brandFilter || "this brand"} on your ${providerLabel} account.`}
                          </p>
                          {brandFilter ? (
                            <Button
                              type="button"
                              variant="ghost"
                              className="mt-3 h-8 text-[13px]"
                              onClick={clearBrandFilter}
                            >
                              Clear brand filter
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <div className="max-h-[320px] space-y-2 overflow-y-auto pr-0.5">
                          {results.map((style) => {
                            const styleKey =
                              style.partNumber ||
                              (style.styleId != null
                                ? String(style.styleId)
                                : style.title);
                            const loading = loadingStyleKey === styleKey;
                            return (
                              <button
                                key={`${style.provider}-${style.partNumber}-${style.styleId}`}
                                type="button"
                                disabled={Boolean(loadingStyleKey)}
                                onClick={() => void pickStyle(style)}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-lg border border-[#ebebeb] bg-white px-3 py-3 text-left transition-colors",
                                  loading
                                    ? "border-[#c9d7ef] bg-[#f8faff]"
                                    : "hover:border-[#c9d7ef] hover:bg-[#f8faff]"
                                )}
                              >
                                <div className="size-14 shrink-0 overflow-hidden rounded-md border border-[#ebebeb] bg-[#f4f4f5]">
                                  {style.styleImageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={style.styleImageUrl}
                                      alt=""
                                      className="size-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex size-full items-center justify-center">
                                      <ImagePlus className="size-4 text-[#c0c0c4]" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-semibold text-[#303030]">
                                    {style.title || style.styleName}
                                  </p>
                                  <p className="mt-0.5 truncate text-[12px] text-[#8a8a8a]">
                                    {style.brandName} · {style.partNumber}
                                  </p>
                                </div>
                                {loading ? (
                                  <Loader2 className="size-4 shrink-0 animate-spin text-brand-primary" />
                                ) : (
                                  <span className="shrink-0 text-[11px] font-medium text-brand-primary">
                                    Use blank →
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Economics at-a-glance */}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    {
                      label: "Shopper price",
                      value: formatCurrency(economics.sellPrice),
                      hint: draft.sellPriceMode === "fixed" ? "Fixed" : "From markup",
                      tone: "default" as const,
                    },
                    {
                      label: "Unit cost",
                      value: formatCurrency(economics.unitCost),
                      hint: `${formatCurrency(economics.blankCost)} blank + ${formatCurrency(economics.decorationCost)} deco`,
                      tone: "default" as const,
                    },
                    {
                      label: "Profit / piece",
                      value: formatCurrency(economics.profit),
                      hint:
                        economics.profit >= 0
                          ? "After blank + decoration"
                          : "Selling below cost",
                      tone:
                        economics.profit > 0
                          ? ("good" as const)
                          : economics.profit < 0
                            ? ("bad" as const)
                            : ("default" as const),
                    },
                    {
                      label: "Margin",
                      value: `${economics.marginPercent}%`,
                      hint: `${economics.markupPercent}% markup on cost`,
                      tone:
                        economics.marginPercent >= 30
                          ? ("good" as const)
                          : economics.marginPercent < 10
                            ? ("bad" as const)
                            : ("default" as const),
                    },
                  ] as const
                ).map((card) => (
                  <div
                    key={card.label}
                    className="rounded-xl border border-[#e3e3e3] bg-white px-3.5 py-3"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      {card.label}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-[20px] font-semibold tabular-nums tracking-tight",
                        card.tone === "good" && "text-emerald-700",
                        card.tone === "bad" && "text-red-700",
                        card.tone === "default" && "text-[#121a2e]"
                      )}
                    >
                      {card.value}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-[#8a8a8a]">
                      {card.hint}
                    </p>
                  </div>
                ))}
              </div>

              <Section
                title="Listing"
                description="What shoppers see on the storefront — mockups, vendor, and copy."
              >
                <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
                  <div>
                    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-[#e3e3e3] bg-[#f4f4f5]">
                      {uploadingMockup ? (
                        <div className="flex flex-col items-center gap-2 px-4 text-center">
                          <Loader2 className="size-6 animate-spin text-[#8a8a8a]" />
                          <p className="text-[12px] text-[#8a8a8a]">
                            Preparing image…
                          </p>
                        </div>
                      ) : galleryPreviewUrls[galleryIndex] ||
                        getPrimaryMockupUrl(draft) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            galleryPreviewUrls[galleryIndex] ||
                            getPrimaryMockupUrl(draft)
                          }
                          alt=""
                          className="size-full object-contain p-2"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 px-4 text-center">
                          <ImagePlus className="size-6 text-[#c0c0c4]" />
                          <p className="text-[12px] text-[#8a8a8a]">
                            Mockup preview
                          </p>
                        </div>
                      )}
                    </div>

                    {galleryPreviewUrls.length > 1 ? (
                      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
                        {galleryPreviewUrls.map((url, index) => (
                          <button
                            key={`${url.slice(0, 24)}-${index}`}
                            type="button"
                            onClick={() => setGalleryIndex(index)}
                            className={cn(
                              "size-12 shrink-0 overflow-hidden rounded-lg border bg-[#fafafa] p-0.5",
                              galleryIndex === index
                                ? "border-brand-primary ring-2 ring-brand-primary/20"
                                : "border-[#e3e3e3] hover:border-[#c9cccf]"
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt=""
                              className="size-full object-contain"
                            />
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp"
                      className="hidden"
                      onChange={(e) => {
                        void handleMockup(e.target.files?.[0] || null);
                        e.target.value = "";
                      }}
                    />

                    <div className="mt-2 space-y-2">
                      {enabledColorVariants.length > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-full rounded-lg border-[#e3e3e3] bg-white text-[12px] font-medium"
                          onClick={() => {
                            setWizardVariants(
                              (draft.colorVariants || []).filter(
                                (v) => v.enabled
                              )
                            );
                            setConfigureSizes(draft.sizes);
                            setMode("mockups");
                          }}
                        >
                          <Upload className="size-3.5" />
                          Manage color mockups
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={uploadingMockup}
                            className="h-9 flex-1 rounded-lg border-[#e3e3e3] bg-white text-[12px] font-medium"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {uploadingMockup ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Upload className="size-3.5" />
                            )}
                            {draft.mockupUrl ? "Replace" : "Upload"}
                          </Button>
                          {draft.mockupUrl ? (
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={uploadingMockup}
                              className="h-9 rounded-lg px-2.5 text-[#8a8a8a] hover:bg-white hover:text-red-700"
                              onClick={() => updateDraft({ mockupUrl: "" })}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-full rounded-lg border-brand-primary/30 bg-brand-primary/5 text-[12px] font-medium text-brand-primary hover:bg-brand-primary/10"
                        onClick={openDesignStudio}
                      >
                        <Wand2 className="size-3.5" />
                        Design studio
                      </Button>
                      <div
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px]",
                          hasDesignArtwork
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-[#ebebeb] bg-[#fafafa] text-[#8a8a8a]"
                        )}
                      >
                        {hasDesignArtwork ? (
                          <Check className="size-3.5 shrink-0" />
                        ) : (
                          <Wand2 className="size-3.5 shrink-0" />
                        )}
                        {hasDesignArtwork
                          ? "Artwork saved — reopen studio to edit placement."
                          : "No artwork yet — drop a logo onto each color."}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label
                        htmlFor="product-name"
                        className="text-[13px] font-medium text-[#303030]"
                      >
                        Product name
                      </Label>
                      <Input
                        id="product-name"
                        value={draft.name}
                        onChange={(e) => {
                          updateDraft({ name: e.target.value });
                          setError(null);
                        }}
                        placeholder="Softstyle tee — front print"
                        className={cn(fieldClassName, "mt-1.5")}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label
                          htmlFor="product-brand"
                          className="text-[13px] font-medium text-[#303030]"
                        >
                          Vendor
                          <span className="ml-1 font-normal text-[#8a8a8a]">
                            Brand
                          </span>
                        </Label>
                        <Input
                          id="product-brand"
                          value={draft.brand || ""}
                          onChange={(e) =>
                            updateDraft({ brand: e.target.value })
                          }
                          placeholder="Gildan"
                          className={cn(fieldClassName, "mt-1.5")}
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="product-color"
                          className="text-[13px] font-medium text-[#303030]"
                        >
                          Primary color
                        </Label>
                        <Input
                          id="product-color"
                          value={draft.color || ""}
                          onChange={(e) =>
                            updateDraft({ color: e.target.value })
                          }
                          placeholder="Navy"
                          className={cn(fieldClassName, "mt-1.5")}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#ebebeb] bg-[#fafafa] px-3.5 py-3">
                      <div className="flex items-start gap-2">
                        <Truck className="mt-0.5 size-3.5 shrink-0 text-[#8a8a8a]" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium text-[#303030]">
                            {draft.supplier
                              ? supplierProviderLabel(draft.supplier)
                              : "Manual product"}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[#8a8a8a]">
                            {draft.supplier
                              ? [
                                  draft.supplierPartNumber
                                    ? `Part ${draft.supplierPartNumber}`
                                    : null,
                                  draft.supplierStyleId
                                    ? `Style ${draft.supplierStyleId}`
                                    : null,
                                  draft.productKey &&
                                  draft.productKey !== draft.supplierPartNumber
                                    ? `Key ${draft.productKey}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") ||
                                "Linked to supplier catalog."
                              : "No supplier linked — pick a blank from Supplier catalog to order blanks later."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label
                        htmlFor="product-description"
                        className="text-[13px] font-medium text-[#303030]"
                      >
                        Description
                        <span className="ml-1 font-normal text-[#8a8a8a]">
                          Optional
                        </span>
                      </Label>
                      <Textarea
                        id="product-description"
                        value={draft.description || ""}
                        onChange={(e) =>
                          updateDraft({ description: e.target.value })
                        }
                        placeholder="Fit notes, decoration location, or what’s included."
                        className="mt-1.5 min-h-[88px] rounded-lg border-[#e3e3e3] bg-white text-[13px] shadow-none focus-visible:border-brand-primary/40 focus-visible:ring-2 focus-visible:ring-brand-primary/15"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="product-insights"
                        className="text-[13px] font-medium text-[#303030]"
                      >
                        Review insights
                        <span className="ml-1 font-normal text-[#8a8a8a]">
                          Optional · great for review stores
                        </span>
                      </Label>
                      <Textarea
                        id="product-insights"
                        value={draft.insights || ""}
                        onChange={(e) =>
                          updateDraft({ insights: e.target.value })
                        }
                        placeholder="Why this style works for brokers — durability, decoration sweet spot, popular use cases…"
                        className="mt-1.5 min-h-[88px] rounded-lg border-[#e3e3e3] bg-white text-[13px] shadow-none focus-visible:border-brand-primary/40 focus-visible:ring-2 focus-visible:ring-brand-primary/15"
                      />
                    </div>
                  </div>
                </div>
              </Section>

              <Section
                title="Economics"
                description="Blank + decoration cost, markup or a fixed shopper price — and what you keep per piece."
              >
                <div className="mb-4 inline-flex rounded-lg border border-[#e3e3e3] bg-[#f4f4f5] p-1">
                  {(
                    [
                      ["markup", "Markup %"],
                      ["fixed", "Fixed price"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        updateDraft({
                          sellPriceMode: value as ClientStoreSellPriceMode,
                        })
                      }
                      className={cn(
                        "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                        draft.sellPriceMode === value
                          ? "bg-white text-[#121a2e] shadow-[0_1px_2px_rgba(26,26,26,0.08)]"
                          : "text-[#616161] hover:text-[#303030]"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label
                      htmlFor="blank-cost"
                      className="text-[13px] font-medium text-[#303030]"
                    >
                      Blank cost
                    </Label>
                    <Input
                      id="blank-cost"
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft.blankCost}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(e) =>
                        updateDraft({ blankCost: Number(e.target.value) || 0 })
                      }
                      className={cn(fieldClassName, "mt-1.5")}
                    />
                    <p className="mt-1.5 text-[11px] text-[#8a8a8a]">
                      What you pay for the garment
                    </p>
                  </div>
                  <div>
                    <Label
                      htmlFor="decoration-cost"
                      className="text-[13px] font-medium text-[#303030]"
                    >
                      Decoration cost
                    </Label>
                    <Input
                      id="decoration-cost"
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft.decorationCost ?? 0}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(e) =>
                        updateDraft({
                          decorationCost: Number(e.target.value) || 0,
                        })
                      }
                      className={cn(fieldClassName, "mt-1.5")}
                    />
                    <p className="mt-1.5 text-[11px] text-[#8a8a8a]">
                      Print, embroidery, or DTF per piece
                    </p>
                  </div>
                  <div>
                    <Label
                      htmlFor="markup-percent"
                      className="text-[13px] font-medium text-[#303030]"
                    >
                      Markup %
                    </Label>
                    <Input
                      id="markup-percent"
                      type="number"
                      min={0}
                      step="1"
                      value={draft.markupPercent}
                      disabled={draft.sellPriceMode === "fixed"}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(e) =>
                        updateDraft({
                          markupPercent: Number(e.target.value) || 0,
                        })
                      }
                      className={cn(
                        fieldClassName,
                        "mt-1.5 disabled:bg-[#f4f4f5] disabled:text-[#8a8a8a]"
                      )}
                    />
                    <p className="mt-1.5 text-[11px] text-[#8a8a8a]">
                      On blank + decoration
                    </p>
                  </div>
                  <div>
                    <Label
                      htmlFor="sell-price"
                      className="text-[13px] font-medium text-[#303030]"
                    >
                      Shopper price
                    </Label>
                    <Input
                      id="sell-price"
                      type="number"
                      min={0}
                      step="0.01"
                      value={
                        draft.sellPriceMode === "fixed"
                          ? draft.sellPrice
                          : previewPrice
                      }
                      readOnly={draft.sellPriceMode === "markup"}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(e) =>
                        updateDraft({
                          sellPriceMode: "fixed",
                          sellPrice: Number(e.target.value) || 0,
                        })
                      }
                      className={cn(
                        fieldClassName,
                        "mt-1.5",
                        draft.sellPriceMode === "markup" &&
                          "bg-[#f4f4f5] text-[#303030]"
                      )}
                    />
                    <p className="mt-1.5 text-[11px] text-[#8a8a8a]">
                      {draft.sellPriceMode === "markup"
                        ? "Calculated from costs + markup"
                        : "Locked fixed amount"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 rounded-xl border border-[#ebebeb] bg-[#fafafa] px-3.5 py-3 text-[12px] sm:grid-cols-2">
                  <div className="space-y-1 text-[#616161]">
                    <p>
                      <span className="tabular-nums">
                        {formatCurrency(economics.blankCost)}
                      </span>{" "}
                      blank
                      <span className="mx-1.5 text-[#c0c0c4]">+</span>
                      <span className="tabular-nums">
                        {formatCurrency(economics.decorationCost)}
                      </span>{" "}
                      decoration
                      <span className="mx-1.5 text-[#c0c0c4]">=</span>
                      <span className="font-semibold tabular-nums text-[#121a2e]">
                        {formatCurrency(economics.unitCost)}
                      </span>{" "}
                      unit cost
                    </p>
                    <p>
                      Shopper pays{" "}
                      <span className="font-semibold tabular-nums text-[#121a2e]">
                        {formatCurrency(economics.sellPrice)}
                      </span>
                      <span className="mx-1.5 text-[#c0c0c4]">→</span>
                      you keep{" "}
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          economics.profit >= 0
                            ? "text-emerald-700"
                            : "text-red-700"
                        )}
                      >
                        {formatCurrency(economics.profit)}
                      </span>{" "}
                      ({economics.marginPercent}% margin)
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 sm:justify-end sm:gap-6">
                    <span className="text-[12px] text-[#616161]">
                      Price on storefront
                    </span>
                    <span className="text-[18px] font-semibold tabular-nums text-[#121a2e]">
                      {formatCurrency(previewPrice)}
                    </span>
                  </div>
                </div>
              </Section>

              <Section
                title="Variants"
                description="Colors shoppers can pick, mockups attached to each, and the size run."
              >
                {enabledColorVariants.length > 0 ? (
                  <div className="mb-4 divide-y divide-[#ebebeb] overflow-hidden rounded-xl border border-[#e3e3e3]">
                    {enabledColorVariants.map((variant) => {
                      const mockupCount = (variant.mockupUrls || []).filter(
                        Boolean
                      ).length;
                      const thumb =
                        getMockupsForColor(draft, variant.name)[0] || "";
                      return (
                        <div
                          key={variant.id}
                          className="flex items-center gap-3 bg-white px-3 py-2.5"
                        >
                          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#ebebeb] bg-[#fafafa] p-0.5">
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={thumb}
                                alt=""
                                className="size-full object-contain"
                              />
                            ) : (
                              <span
                                className="size-5 rounded-full border border-[#d4d4d4]"
                                style={{
                                  backgroundColor:
                                    variant.colorHex || "#e5e5e5",
                                }}
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="size-2.5 shrink-0 rounded-full border border-[#d4d4d4]"
                                style={{
                                  backgroundColor:
                                    variant.colorHex || "#e5e5e5",
                                }}
                              />
                              <p className="truncate text-[13px] font-medium text-[#303030]">
                                {variant.name}
                              </p>
                            </div>
                            <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
                              {mockupCount > 0
                                ? `${mockupCount} mockup${mockupCount === 1 ? "" : "s"}`
                                : "No mockups yet"}
                              {variant.colorCode
                                ? ` · Code ${variant.colorCode}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mb-4 rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-3 py-3 text-[12px] text-[#8a8a8a]">
                    No color variants yet. Add a primary color above, or pick a
                    blank from the Supplier catalog for multi-color mockups.
                  </p>
                )}

                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-medium text-[#303030]">
                      Sizes
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
                      Toggle which sizes shoppers can order.
                    </p>
                  </div>
                  <p className="text-[12px] text-[#8a8a8a]">
                    {enabledSizeCount} size
                    {enabledSizeCount === 1 ? "" : "s"} available
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {draft.sizes.map((row) => (
                    <button
                      key={row.size}
                      type="button"
                      onClick={() =>
                        updateDraft({
                          sizes: draft.sizes.map((size) =>
                            size.size === row.size
                              ? { ...size, enabled: !size.enabled }
                              : size
                          ),
                        })
                      }
                      className={cn(
                        "min-w-11 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors",
                        row.enabled
                          ? "border-brand-primary/30 bg-brand-primary/8 text-[#121a2e]"
                          : "border-[#e3e3e3] bg-white text-[#8a8a8a] hover:border-[#c9cccf]"
                      )}
                    >
                      {row.size}
                    </button>
                  ))}
                </div>
              </Section>

              <Section
                title="Organization"
                description="Tags power smart collections. Collections show where this product appears on the storefront."
              >
                <div>
                  <Label
                    htmlFor="product-tags"
                    className="text-[13px] font-medium text-[#303030]"
                  >
                    Tags
                  </Label>
                  <div className="mt-1.5 rounded-lg border border-[#e3e3e3] bg-white px-2.5 py-2 focus-within:border-brand-primary/40 focus-within:ring-2 focus-within:ring-brand-primary/15">
                    <div className="flex flex-wrap gap-1.5">
                      {(draft.tags || []).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-md bg-[#f1f1f1] px-2 py-0.5 text-[11px] font-medium text-[#303030]"
                        >
                          {tag}
                          <button
                            type="button"
                            className="rounded text-[#8a8a8a] hover:text-red-700"
                            onClick={() => {
                              const next = (tagsRef.current || []).filter(
                                (entry) => entry !== tag
                              );
                              tagsRef.current = next;
                              updateDraft({ tags: next });
                            }}
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        id="product-tags"
                        value={tagDraft}
                        onChange={(e) => setTagDraft(e.target.value)}
                        onBlur={() => commitPendingTag()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            commitPendingTag();
                          } else if (
                            e.key === "Backspace" &&
                            !tagDraft &&
                            tagsRef.current.length > 0
                          ) {
                            const next = tagsRef.current.slice(0, -1);
                            tagsRef.current = next;
                            updateDraft({ tags: next });
                          }
                        }}
                        placeholder={
                          (draft.tags || []).length
                            ? "Add another…"
                            : "e.g. t-shirts, hoodies"
                        }
                        className="min-w-[120px] flex-1 border-0 bg-transparent py-0.5 text-[13px] text-[#303030] outline-none placeholder:text-[#8a8a8a]"
                      />
                    </div>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#8a8a8a]">
                    Press Enter or click away to add. Save the product so smart
                    collections can pick these tags up.
                  </p>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13px] font-medium text-[#303030]">
                      In collections
                    </p>
                    {onOpenCollections ? (
                      <button
                        type="button"
                        onClick={onOpenCollections}
                        className="text-[12px] font-medium text-brand-primary hover:underline"
                      >
                        Manage collections
                      </button>
                    ) : null}
                  </div>
                  {matchedCollections.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {matchedCollections.map((collection) => (
                        <span
                          key={collection.id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#e3e3e3] bg-white px-2.5 py-1 text-[12px] font-medium text-[#303030]"
                        >
                          <Layers className="size-3 text-[#8a8a8a]" />
                          {collection.name}
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                            {collection.selectionType === "smart"
                              ? "Smart"
                              : "Manual"}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-3 py-3 text-[12px] text-[#8a8a8a]">
                      {(draft.tags || []).length === 0
                        ? "Add tags (or manually add this product to a collection) so it shows up in storefront collections."
                        : "No collections match yet. Create a smart collection for one of these tags, or add the product to a manual collection."}
                    </div>
                  )}
                </div>
              </Section>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e3e3e3] bg-white px-4 py-3.5">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) => updateDraft({ enabled: e.target.checked })}
                  className="mt-0.5 size-4 rounded border-[#c9cccf] text-brand-primary focus:ring-brand-primary/30"
                />
                <span>
                  <span className="block text-[13px] font-medium text-[#303030]">
                    Show on storefront
                  </span>
                  <span className="mt-0.5 block text-[12px] text-[#8a8a8a]">
                    Turn off to keep this product in the catalog as a draft
                    without offering it to shoppers yet.
                  </span>
                </span>
              </label>
            </div>
          )}

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
              {error}
            </p>
          ) : null}
        </div>
    </div>
  );
}
