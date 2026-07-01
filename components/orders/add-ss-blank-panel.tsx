"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  Package,
  Search,
  Truck,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchSupplierBrands,
  fetchSupplierStyleDetail,
  searchSupplierCatalog,
} from "@/lib/api";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatCurrency } from "@/lib/format";
import {
  buildLineItemFromSsSelection,
  existingSsSizesOnOrder,
} from "@/lib/supplier-line-items";
import type {
  SupplierBrand,
  SupplierColorVariant,
  SupplierStyleDetail,
  SupplierStyleSummary,
} from "@/lib/supplier-integrations";
import type { LineItem, Order } from "@/types";
import { cn } from "@/lib/utils";

type View = "search" | "detail";

const QUICK_BRAND_HINTS = [
  "Gildan",
  "Comfort Colors",
  "Bella + Canvas",
  "Next Level",
  "Hanes",
  "Champion",
  "Port & Company",
  "Sport-Tek",
];

function stockTone(qty: number): string {
  if (qty <= 0) return "text-[#b42318]";
  if (qty < 100) return "text-[#8a6116]";
  return "text-[#0d5c2e]";
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

function StyleResultRow({
  style,
  loading,
  onSelect,
}: {
  style: SupplierStyleSummary;
  loading?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={loading}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border border-[#ebebeb] bg-white px-3 py-3 text-left transition-colors",
        loading
          ? "border-[#c9d7ef] bg-[#f8faff]"
          : "hover:border-[#c9d7ef] hover:bg-[#f8faff]"
      )}
    >
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#ebebeb] bg-[#fafafa]">
        {style.styleImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={style.styleImageUrl}
            alt=""
            className="size-full object-contain"
          />
        ) : (
          <Package className="size-5 text-[#8a8a8a]" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#303030]">
          {style.brandName} {style.styleName}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[12px] text-[#616161]">
          {style.title}
        </p>
        <p className="mt-1 text-[11px] text-[#8a8a8a]">
          {style.baseCategory}
          {style.partNumber ? ` · ${style.partNumber}` : ""}
        </p>
      </div>
      {loading ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-brand-primary" />
      ) : null}
    </button>
  );
}

export function AddSsBlankPanel({
  order,
  onAdd,
  saving,
}: {
  order: Order;
  onAdd: (item: LineItem) => Promise<void>;
  saving: boolean;
}) {
  const { getIdToken } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>("search");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [brands, setBrands] = useState<SupplierBrand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<SupplierStyleSummary[]>([]);

  const [loadingStyleId, setLoadingStyleId] = useState<number | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [styleDetail, setStyleDetail] = useState<SupplierStyleDetail | null>(
    null
  );
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function loadBrands() {
      setLoadingBrands(true);
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const { brands: next } = await fetchSupplierBrands(token);
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
  }, [getIdToken]);

  const shouldSearch = debouncedQuery.length >= 2 || Boolean(brandFilter);

  useEffect(() => {
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
            brand: brandFilter || undefined,
            limit: 50,
          }
        );
        if (!cancelled) setResults(next);
      } catch (err) {
        if (!cancelled) {
          setResults([]);
          setSearchError(
            err instanceof Error ? err.message : "Search failed"
          );
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }

    void runSearch();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, brandFilter, getIdToken, shouldSearch]);

  const brandChipOptions = useMemo(() => {
    const normalized = debouncedQuery.toLowerCase();
    const matching = normalized
      ? brands.filter((brand) => brand.name.toLowerCase().includes(normalized))
      : brands;

    const quickMatches = QUICK_BRAND_HINTS.map((hint) =>
      brands.find((brand) => brand.name.toLowerCase() === hint.toLowerCase())
    ).filter((brand): brand is SupplierBrand => Boolean(brand));

    const merged = new Map<string, SupplierBrand>();
    for (const brand of [...quickMatches, ...matching]) {
      merged.set(brand.name, brand);
    }

    return Array.from(merged.values()).slice(0, 12);
  }, [brands, debouncedQuery]);

  const filteredBrandMenu = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return brands;
    return brands.filter((brand) =>
      brand.name.toLowerCase().includes(normalized)
    );
  }, [brands, query]);

  const selectedColor: SupplierColorVariant | null =
    styleDetail?.colors[selectedColorIndex] ?? null;

  const existingOnOrder = useMemo(() => {
    if (!styleDetail || !selectedColor) return {};
    return existingSsSizesOnOrder(
      order.lineItems,
      styleDetail.partNumber,
      selectedColor.colorCode
    );
  }, [order.lineItems, selectedColor, styleDetail]);

  const loadStyle = useCallback(
    async (style: SupplierStyleSummary) => {
      if (style.styleId == null) {
        setDetailError("This style is missing a catalog ID. Try searching again.");
        return;
      }

      setDetailError(null);
      setSubmitError(null);
      setLoadingStyleId(style.styleId);
      try {
        const token = await getIdToken();
        if (!token) return;
        const { style: detail } = await fetchSupplierStyleDetail(token, style);
        if (!detail.colors?.length) {
          throw new Error(
            "This style has no available colors on your S&S account."
          );
        }
        setStyleDetail(detail);
        setSelectedColorIndex(0);
        setQuantities({});
        setView("detail");
      } catch (err) {
        setDetailError(
          err instanceof Error ? err.message : "Could not load style"
        );
      } finally {
        setLoadingStyleId(null);
      }
    },
    [getIdToken]
  );

  useEffect(() => {
    if (!selectedColor) return;
    setQuantities((current) => {
      const next: Record<string, number> = {};
      for (const sku of selectedColor.sizes) {
        next[sku.sizeName] = current[sku.sizeName] || 0;
      }
      return next;
    });
  }, [selectedColor]);

  const pieceCount = useMemo(() => {
    if (!selectedColor) return 0;
    return selectedColor.sizes.reduce(
      (sum, sku) => sum + (quantities[sku.sizeName] || 0),
      0
    );
  }, [quantities, selectedColor]);

  const orderTotal = useMemo(() => {
    if (!selectedColor) return 0;
    return selectedColor.sizes.reduce((sum, sku) => {
      const qty = quantities[sku.sizeName] || 0;
      const price =
        sku.customerPrice > 0
          ? sku.customerPrice
          : sku.salePrice ?? sku.piecePrice;
      return sum + qty * price;
    }, 0);
  }, [quantities, selectedColor]);

  const handleSubmit = async () => {
    if (!styleDetail || !selectedColor) return;
    setSubmitError(null);

    const item = buildLineItemFromSsSelection(
      styleDetail,
      selectedColor,
      quantities
    );
    if (!item) {
      setSubmitError("Enter a quantity for at least one size.");
      return;
    }

    try {
      await onAdd(item);
      setView("search");
      setQuery("");
      setBrandFilter(null);
      setStyleDetail(null);
      setQuantities({});
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not add blank");
    }
  };

  const clearBrandFilter = () => {
    setBrandFilter(null);
    setBrandMenuOpen(false);
    inputRef.current?.focus();
  };

  const applyBrandFilter = (brandName: string | null) => {
    setBrandFilter(brandName);
    setBrandMenuOpen(false);
    inputRef.current?.focus();
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      event.key === "Backspace" &&
      query.length === 0 &&
      brandFilter &&
      (event.currentTarget.selectionStart ?? 0) === 0
    ) {
      event.preventDefault();
      clearBrandFilter();
    }
  };

  if (view === "search") {
    const resultsLabel = brandFilter
      ? debouncedQuery.length >= 2
        ? `${results.length} result${results.length !== 1 ? "s" : ""} in ${brandFilter}`
        : `Browsing ${brandFilter}`
      : debouncedQuery.length >= 2
        ? `${results.length} result${results.length !== 1 ? "s" : ""}`
        : null;

    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className={cn(dashboardInsetSurfaceClass, "shrink-0 overflow-visible p-0")}>
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
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
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
                  onClick={() => setBrandMenuOpen((open) => !open)}
                  className="inline-flex h-8 w-full items-center justify-between gap-1 rounded-md border border-[#e3e3e3] px-2.5 text-[12px] font-medium text-[#303030] hover:bg-[#fafafa] sm:w-auto sm:justify-center"
                  aria-expanded={brandMenuOpen}
                  aria-haspopup="listbox"
                >
                  <span>{brandFilter ? "Change brand" : "All brands"}</span>
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
                          !brandFilter && "bg-[#eef1ff] font-medium text-brand-primary"
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
                            onClick={() => applyBrandFilter(brand.name)}
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

          <div className="px-3 py-2 sm:px-4">
            <p className={dashboardTaskDetailClass}>
              {brandFilter
                ? `Showing styles from ${brandFilter}. Search to narrow by style number or name.`
                : "Pick a brand below or search by brand, style number, or part number."}
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 pt-3">
          {searchError ? (
            <p className="shrink-0 rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
              {searchError}
            </p>
          ) : null}

          {detailError ? (
            <p className="shrink-0 rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
              {detailError}
            </p>
          ) : null}

          {!shouldSearch ? (
            <div className="flex flex-1 items-start gap-3 rounded-lg border border-[#ebebeb] bg-[#fafafa] px-4 py-4 text-[12px] text-[#616161]">
              <Truck className="mt-0.5 size-4 shrink-0 text-brand-primary" />
              <div>
                <p className="font-medium text-[#303030]">
                  Start with a brand or search term
                </p>
                <p className="mt-1">
                  Tap a brand chip like{" "}
                  <span className="font-medium">Comfort Colors</span>, or search{" "}
                  <span className="font-medium">Gildan 2000</span> / part{" "}
                  <span className="font-medium">00760</span>.
                </p>
              </div>
            </div>
          ) : searching && results.length === 0 ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-[13px] text-[#616161]">
              <Loader2 className="size-4 animate-spin" />
              {brandFilter ? `Loading ${brandFilter} styles…` : "Searching catalog…"}
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-[#d4d4d4] px-4 py-10 text-center">
              <p className="text-[14px] font-semibold text-[#303030]">
                No styles found
              </p>
              <p className="mx-auto mt-2 max-w-md text-[13px] text-[#616161]">
                {debouncedQuery
                  ? `Nothing matched "${debouncedQuery}"${brandFilter ? ` in ${brandFilter}` : ""}. Try a style number like 1717 or 2000.`
                  : `No styles are available for ${brandFilter || "this brand"} on your S&S account.`}
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
            <>
              {resultsLabel ? (
                <p className="shrink-0 text-[12px] font-medium text-[#616161]">
                  {resultsLabel}
                </p>
              ) : null}
              <div className="scrollbar-none max-h-[min(42vh,420px)] space-y-2 overflow-y-auto overscroll-contain pr-1">
                {results.map((style) => (
                  <StyleResultRow
                    key={`${style.styleId ?? "x"}-${style.brandName}-${style.styleName}`}
                    style={style}
                    loading={loadingStyleId === style.styleId}
                    onSelect={() => void loadStyle(style)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!styleDetail || !selectedColor) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-[#ebebeb] pb-3">
        <button
          type="button"
          onClick={() => {
            setView("search");
            setStyleDetail(null);
            setDetailError(null);
            setSubmitError(null);
          }}
          className={cn(
            dashboardControlClass,
            "inline-flex h-8 items-center gap-1.5 px-2.5 text-[12px] font-medium text-[#303030] hover:bg-[#fafafa]"
          )}
        >
          <ArrowLeft className="size-3.5 text-[#616161]" strokeWidth={2} />
          Back to catalog
        </button>

        <div className="mt-3 flex flex-wrap items-start gap-4">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#ebebeb] bg-[#fafafa]">
            {styleDetail.styleImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={styleDetail.styleImageLargeUrl || styleDetail.styleImageUrl}
                alt=""
                className="size-full object-contain"
              />
            ) : (
              <Package className="size-6 text-[#8a8a8a]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={dashboardTaskTitleClass}>
              {styleDetail.brandName} {styleDetail.styleName}
            </h3>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              {styleDetail.title}
            </p>
            <p className="mt-1 text-[11px] text-[#8a8a8a]">
              {styleDetail.baseCategory} · Part {styleDetail.partNumber} ·{" "}
              {styleDetail.colors.length} colors
            </p>
          </div>
        </div>
      </div>

      <div className="scrollbar-none max-h-[min(42vh,420px)] space-y-4 overflow-y-auto overscroll-contain py-3">
        {detailError ? (
          <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
            {detailError}
          </p>
        ) : null}

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Color
          </p>
          <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
          {styleDetail.colors.map((color, index) => (
            <button
              key={`${color.colorCode}-${color.colorName}`}
              type="button"
              onClick={() => setSelectedColorIndex(index)}
              className={cn(
                "inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1.5 text-left text-[12px] transition-colors",
                index === selectedColorIndex
                  ? "border-brand-primary bg-[#eef1ff] text-[#303030]"
                  : "border-[#e3e3e3] bg-white text-[#616161] hover:border-[#c9d7ef]"
              )}
            >
              <span
                className="size-4 shrink-0 rounded-full border border-[#d4d4d4] bg-cover bg-center"
                style={{
                  backgroundColor: color.colorHex || "#f3f3f3",
                  backgroundImage: color.colorSwatchImageUrl
                    ? `url(${color.colorSwatchImageUrl})`
                    : undefined,
                }}
              />
              <span className="truncate font-medium">{color.colorName}</span>
              <span className="tabular-nums text-[#8a8a8a]">
                {color.totalQty.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={cn(dashboardInsetSurfaceClass, "overflow-hidden")}>
        <div className="border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3">
          <p className="text-[13px] font-semibold text-[#303030]">
            {selectedColor.colorName}
          </p>
          <p className="mt-0.5 text-[12px] text-[#616161]">
            Your S&amp;S customer pricing · {selectedColor.totalQty.toLocaleString()}{" "}
            in stock across warehouses
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-[#ebebeb] bg-[#fafafa]">
                <th className="px-4 py-2.5 text-left font-medium text-[#616161]">
                  Size
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                  On order
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                  Stock
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                  Add
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                  Your price
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-[#616161]">
                  Line total
                </th>
              </tr>
            </thead>
            <tbody>
              {selectedColor.sizes.map((sku) => {
                const qty = quantities[sku.sizeName] || 0;
                const onOrder = existingOnOrder[sku.sizeName] || 0;
                const price =
                  sku.customerPrice > 0
                    ? sku.customerPrice
                    : sku.salePrice ?? sku.piecePrice;

                return (
                  <tr
                    key={sku.sku}
                    className="border-b border-[#ebebeb] last:border-0"
                  >
                    <td className="px-4 py-3 font-semibold text-[#303030]">
                      {sku.sizeName}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-[#616161]">
                      {onOrder > 0 ? onOrder : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 text-right tabular-nums font-medium",
                        stockTone(sku.qty)
                      )}
                    >
                      {sku.qty.toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        type="number"
                        min={0}
                        value={qty || ""}
                        placeholder="0"
                        disabled={saving}
                        onChange={(event) => {
                          const next = Math.max(
                            0,
                            parseInt(event.target.value, 10) || 0
                          );
                          setQuantities((current) => ({
                            ...current,
                            [sku.sizeName]: next,
                          }));
                        }}
                        className="ml-auto h-8 w-20 rounded-lg border-[#e3e3e3] text-right text-sm tabular-nums"
                      />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-[#616161]">
                      {formatCurrency(price)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-[#303030]">
                      {qty > 0 ? formatCurrency(qty * price) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#fafafa]">
                <td
                  colSpan={5}
                  className="px-4 py-3 text-right text-[12px] font-medium text-[#616161]"
                >
                  {pieceCount} piece{pieceCount !== 1 ? "s" : ""} to add
                </td>
                <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-[#303030]">
                  {formatCurrency(orderTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {submitError ? (
        <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
          {submitError}
        </p>
      ) : null}
      </div>

      <div className="flex shrink-0 justify-end border-t border-[#ebebeb] pt-3">
        <Button
          type="button"
          disabled={saving || pieceCount <= 0}
          className={cn(dashboardPrimaryButtonClass, "h-9 px-4 text-[13px]")}
          onClick={() => void handleSubmit()}
        >
          {saving ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Adding…
            </>
          ) : (
            "Add to order"
          )}
        </Button>
      </div>
    </div>
  );
}
