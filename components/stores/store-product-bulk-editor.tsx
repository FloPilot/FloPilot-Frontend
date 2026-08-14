"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Check,
  Columns3,
  Info,
  Loader2,
  Search,
} from "lucide-react";
import { useRegisterUnsavedChanges } from "@/components/layout/staff-unsaved-changes-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  computeClientStoreEconomics,
  getPrimaryMockupUrl,
  normalizeClientStoreProductKind,
  sizesForClientStoreProductKind,
  type ClientStoreProduct,
  type ClientStoreProductKind,
  type ClientStoreSellPriceMode,
} from "@/lib/client-stores";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type BulkColumnId =
  | "title"
  | "status"
  | "productKind"
  | "brand"
  | "color"
  | "description"
  | "insights"
  | "tags"
  | "sellPrice"
  | "sellPriceMode"
  | "blankCost"
  | "decorationCost"
  | "markupPercent"
  | "decorationType"
  | "minOrderQty"
  | "setupFee";

type BulkColumnGroup = "general" | "publishing" | "pricing" | "decoration";

type BulkColumnDef = {
  id: BulkColumnId;
  label: string;
  group: BulkColumnGroup;
  locked?: boolean;
  hint?: string;
  width: string;
};

const COLUMN_GROUPS: Array<{ id: BulkColumnGroup; label: string }> = [
  { id: "general", label: "General" },
  { id: "publishing", label: "Publishing" },
  { id: "pricing", label: "Pricing" },
  { id: "decoration", label: "Decoration" },
];

const COLUMN_DEFS: BulkColumnDef[] = [
  {
    id: "title",
    label: "Product title",
    group: "general",
    locked: true,
    width: "w-[280px] min-w-[280px] max-w-[280px]",
  },
  { id: "status", label: "Status", group: "publishing", width: "min-w-[120px]" },
  {
    id: "productKind",
    label: "Type",
    group: "general",
    hint: "Apparel = size run · Accessory = One Size",
    width: "min-w-[130px]",
  },
  { id: "brand", label: "Brand", group: "general", width: "min-w-[140px]" },
  { id: "color", label: "Primary color", group: "general", width: "min-w-[130px]" },
  {
    id: "description",
    label: "Description",
    group: "general",
    width: "min-w-[220px]",
  },
  {
    id: "insights",
    label: "Insights",
    group: "general",
    hint: "Talking points shown on review / show stores",
    width: "min-w-[200px]",
  },
  { id: "tags", label: "Tags", group: "general", width: "min-w-[180px]" },
  {
    id: "sellPrice",
    label: "Sell price",
    group: "pricing",
    hint: "Sets price mode to Fixed so the value sticks",
    width: "min-w-[120px]",
  },
  {
    id: "sellPriceMode",
    label: "Price mode",
    group: "pricing",
    width: "min-w-[120px]",
  },
  {
    id: "blankCost",
    label: "Blank cost",
    group: "pricing",
    width: "min-w-[110px]",
  },
  {
    id: "decorationCost",
    label: "Decoration cost",
    group: "pricing",
    width: "min-w-[130px]",
  },
  {
    id: "markupPercent",
    label: "Markup %",
    group: "pricing",
    width: "min-w-[100px]",
  },
  {
    id: "setupFee",
    label: "Setup fee",
    group: "pricing",
    width: "min-w-[110px]",
  },
  {
    id: "minOrderQty",
    label: "Min order qty",
    group: "pricing",
    width: "min-w-[120px]",
  },
  {
    id: "decorationType",
    label: "Decoration type",
    group: "decoration",
    width: "min-w-[150px]",
  },
];

const DEFAULT_VISIBLE: BulkColumnId[] = [
  "title",
  "status",
  "brand",
  "sellPrice",
  "tags",
];

const STORAGE_KEY = "flopilot.clientStore.bulkEditor.columns.v1";

function readStoredColumns(): BulkColumnId[] {
  if (typeof window === "undefined") return DEFAULT_VISIBLE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE;
    const parsed = JSON.parse(raw) as string[];
    const valid = parsed.filter((id): id is BulkColumnId =>
      COLUMN_DEFS.some((col) => col.id === id)
    );
    if (!valid.includes("title")) valid.unshift("title");
    return valid.length > 0 ? valid : DEFAULT_VISIBLE;
  } catch {
    return DEFAULT_VISIBLE;
  }
}

function cloneProducts(products: ClientStoreProduct[]): ClientStoreProduct[] {
  return products.map((product) => ({
    ...product,
    sizes: (product.sizes || []).map((row) => ({ ...row })),
    colors: product.colors ? [...product.colors] : undefined,
    tags: product.tags ? [...product.tags] : undefined,
    galleryUrls: product.galleryUrls ? [...product.galleryUrls] : undefined,
    colorVariants: (product.colorVariants || []).map((variant) => ({
      ...variant,
      mockupUrls: [...(variant.mockupUrls || [])],
      blankMockupUrls: variant.blankMockupUrls
        ? [...variant.blankMockupUrls]
        : undefined,
    })),
    decorationLocations: product.decorationLocations
      ? product.decorationLocations.map((row) => ({ ...row }))
      : undefined,
  }));
}

function snapshotEditable(products: ClientStoreProduct[]): string {
  return JSON.stringify(
    products.map((product) => ({
      id: product.id,
      name: product.name,
      enabled: product.enabled,
      brand: product.brand || "",
      color: product.color || "",
      description: product.description || "",
      insights: product.insights || "",
      tags: product.tags || [],
      sellPrice: product.sellPrice,
      sellPriceMode: product.sellPriceMode,
      blankCost: product.blankCost,
      decorationCost: product.decorationCost || 0,
      markupPercent: product.markupPercent,
      decorationType: product.decorationType || "",
      minOrderQty: product.minOrderQty || 0,
      setupFee: product.setupFee || 0,
    }))
  );
}

function parseMoney(raw: string): number {
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * 100) / 100);
}

function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim().slice(0, 40);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags.slice(0, 24);
}

function getCellValue(
  product: ClientStoreProduct,
  columnId: BulkColumnId
): string | number | boolean {
  switch (columnId) {
    case "title":
      return product.name;
    case "status":
      return product.enabled;
    case "productKind":
      return normalizeClientStoreProductKind(product.productKind);
    case "brand":
      return product.brand || "";
    case "color":
      return product.color || "";
    case "description":
      return product.description || "";
    case "insights":
      return product.insights || "";
    case "tags":
      return (product.tags || []).join(", ");
    case "sellPrice":
      return product.sellPrice;
    case "sellPriceMode":
      return product.sellPriceMode;
    case "blankCost":
      return product.blankCost;
    case "decorationCost":
      return product.decorationCost || 0;
    case "markupPercent":
      return product.markupPercent;
    case "decorationType":
      return product.decorationType || "";
    case "minOrderQty":
      return product.minOrderQty || 0;
    case "setupFee":
      return product.setupFee || 0;
    default:
      return "";
  }
}

function applyCellValue(
  product: ClientStoreProduct,
  columnId: BulkColumnId,
  value: string | number | boolean
): ClientStoreProduct {
  switch (columnId) {
    case "title":
      return { ...product, name: String(value).trim().slice(0, 120) || product.name };
    case "status":
      return { ...product, enabled: Boolean(value) };
    case "productKind": {
      const kind = normalizeClientStoreProductKind(value);
      return {
        ...product,
        productKind: kind,
        sizes: sizesForClientStoreProductKind(kind),
      };
    }
    case "brand":
      return { ...product, brand: String(value).trim().slice(0, 80) || undefined };
    case "color": {
      const color = String(value).trim().slice(0, 60);
      const variants = product.colorVariants || [];
      const nextVariants =
        color && variants.length === 1
          ? [{ ...variants[0], name: color }]
          : variants;
      return {
        ...product,
        // Keep "" when cleared so backend doesn't revive the first variant name.
        color,
        colors: color
          ? Array.from(
              new Set([
                color,
                ...(nextVariants.length
                  ? nextVariants
                      .filter((row) => row.enabled !== false)
                      .map((row) => row.name)
                  : product.colors || []),
              ])
            )
          : product.colors,
        colorVariants: nextVariants.length ? nextVariants : product.colorVariants,
      };
    }
    case "description":
      return {
        ...product,
        description: String(value).trim().slice(0, 1200) || undefined,
      };
    case "insights":
      return {
        ...product,
        insights: String(value).trim().slice(0, 800) || undefined,
      };
    case "tags":
      return { ...product, tags: parseTags(String(value)) };
    case "sellPrice": {
      const sellPrice = typeof value === "number" ? value : parseMoney(String(value));
      return { ...product, sellPrice, sellPriceMode: "fixed" };
    }
    case "sellPriceMode": {
      const mode: ClientStoreSellPriceMode =
        value === "markup" ? "markup" : "fixed";
      const next = { ...product, sellPriceMode: mode };
      if (mode === "markup") {
        next.sellPrice = computeClientStoreEconomics(next).sellPrice;
      }
      return next;
    }
    case "blankCost": {
      const blankCost =
        typeof value === "number" ? value : parseMoney(String(value));
      const next = { ...product, blankCost };
      if (next.sellPriceMode === "markup") {
        next.sellPrice = computeClientStoreEconomics(next).sellPrice;
      }
      return next;
    }
    case "decorationCost": {
      const decorationCost =
        typeof value === "number" ? value : parseMoney(String(value));
      const next = { ...product, decorationCost };
      if (next.sellPriceMode === "markup") {
        next.sellPrice = computeClientStoreEconomics(next).sellPrice;
      }
      return next;
    }
    case "markupPercent": {
      const markupPercent = Math.max(
        0,
        Number(typeof value === "number" ? value : String(value).replace(/[^0-9.-]/g, "")) || 0
      );
      const next = { ...product, markupPercent };
      if (next.sellPriceMode === "markup") {
        next.sellPrice = computeClientStoreEconomics(next).sellPrice;
      }
      return next;
    }
    case "decorationType":
      return {
        ...product,
        decorationType: String(value).trim().slice(0, 80) || undefined,
      };
    case "minOrderQty": {
      const minOrderQty = Math.max(
        0,
        Math.floor(
          Number(
            typeof value === "number"
              ? value
              : String(value).replace(/[^0-9]/g, "")
          ) || 0
        )
      );
      return { ...product, minOrderQty: minOrderQty || undefined };
    }
    case "setupFee": {
      const setupFee =
        typeof value === "number" ? value : parseMoney(String(value));
      return { ...product, setupFee: setupFee || undefined };
    }
    default:
      return product;
  }
}

type FocusedCell = { productId: string; columnId: BulkColumnId };

export function StoreProductBulkEditor({
  open,
  products,
  saving = false,
  onClose,
  onSave,
}: {
  open: boolean;
  products: ClientStoreProduct[];
  saving?: boolean;
  onClose: (options?: { force?: boolean }) => void;
  onSave: (products: ClientStoreProduct[]) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<ClientStoreProduct[]>([]);
  const [baseline, setBaseline] = useState("");
  const [visibleColumns, setVisibleColumns] =
    useState<BulkColumnId[]>(DEFAULT_VISIBLE);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [columnQuery, setColumnQuery] = useState("");
  const [focused, setFocused] = useState<FocusedCell | null>(null);
  const [fillDrag, setFillDrag] = useState<{
    columnId: BulkColumnId;
    sourceIndex: number;
    endIndex: number;
  } | null>(null);
  const columnsRef = useRef<HTMLDivElement | null>(null);

  const productsRef = useRef(products);
  productsRef.current = products;
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const cloned = cloneProducts(productsRef.current);
      setDrafts(cloned);
      setBaseline(snapshotEditable(cloned));
      setVisibleColumns(readStoredColumns());
      setFocused(null);
      setFillDrag(null);
      setColumnsOpen(false);
      setColumnQuery("");
    }
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !columnsOpen) {
        // Let unsaved bar / parent handle leave — don't force close.
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, columnsOpen]);

  useEffect(() => {
    if (!columnsOpen) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && columnsRef.current?.contains(target)) return;
      setColumnsOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [columnsOpen]);

  const dirty = open && snapshotEditable(drafts) !== baseline;

  const discard = useCallback(() => {
    const cloned = cloneProducts(products);
    setDrafts(cloned);
    setBaseline(snapshotEditable(cloned));
    setFocused(null);
    setFillDrag(null);
  }, [products]);

  const handleSave = useCallback(async () => {
    await onSave(drafts);
    setBaseline(snapshotEditable(drafts));
    onClose({ force: true });
  }, [drafts, onSave, onClose]);

  useRegisterUnsavedChanges(
    open
      ? {
          dirty,
          saving,
          label: "Unsaved bulk edits",
          onSave: () => handleSave(),
          onDiscard: discard,
        }
      : null,
    "store-bulk-editor"
  );

  const visibleDefs = useMemo(
    () =>
      COLUMN_DEFS.filter(
        (col) => col.locked || visibleColumns.includes(col.id)
      ),
    [visibleColumns]
  );

  const toggleColumn = (id: BulkColumnId) => {
    const def = COLUMN_DEFS.find((col) => col.id === id);
    if (!def || def.locked) return;
    setVisibleColumns((prev) => {
      const next = prev.includes(id)
        ? prev.filter((col) => col !== id)
        : [...prev, id];
      if (!next.includes("title")) next.unshift("title");
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updateProduct = (
    productId: string,
    columnId: BulkColumnId,
    value: string | number | boolean
  ) => {
    setDrafts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? applyCellValue(product, columnId, value)
          : product
      )
    );
  };

  const applyFill = useCallback(
    (columnId: BulkColumnId, sourceIndex: number, endIndex: number) => {
      setDrafts((prev) => {
        const source = prev[sourceIndex];
        if (!source) return prev;
        const value = getCellValue(source, columnId);
        const from = Math.min(sourceIndex, endIndex);
        const to = Math.max(sourceIndex, endIndex);
        return prev.map((product, index) => {
          if (index < from || index > to || index === sourceIndex) return product;
          return applyCellValue(product, columnId, value);
        });
      });
    },
    []
  );

  useEffect(() => {
    if (!fillDrag) return;
    const onMove = (event: MouseEvent) => {
      const el = document.elementFromPoint(event.clientX, event.clientY);
      const row = el?.closest?.("[data-bulk-row-index]") as HTMLElement | null;
      if (!row) return;
      const index = Number(row.dataset.bulkRowIndex);
      if (!Number.isFinite(index)) return;
      setFillDrag((current) =>
        current ? { ...current, endIndex: index } : current
      );
    };
    const onUp = () => {
      setFillDrag((current) => {
        if (current) {
          applyFill(current.columnId, current.sourceIndex, current.endIndex);
        }
        return null;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [fillDrag, applyFill]);

  const filteredColumnDefs = useMemo(() => {
    const q = columnQuery.trim().toLowerCase();
    if (!q) return COLUMN_DEFS;
    return COLUMN_DEFS.filter(
      (col) =>
        col.label.toLowerCase().includes(q) ||
        col.group.toLowerCase().includes(q)
    );
  }, [columnQuery]);

  const requestClose = () => {
    onClose();
  };

  if (!open) return null;

  const fillRange = fillDrag
    ? {
        from: Math.min(fillDrag.sourceIndex, fillDrag.endIndex),
        to: Math.max(fillDrag.sourceIndex, fillDrag.endIndex),
        columnId: fillDrag.columnId,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#f6f6f7]">
      <header className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-b border-[#e3e3e3] bg-white px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={requestClose}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-[#616161] transition-colors hover:bg-[#f6f6f7] hover:text-[#303030]"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
          <div className="hidden h-5 w-px bg-[#ebebeb] sm:block" />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-[#303030]">
              Editing {drafts.length} product{drafts.length === 1 ? "" : "s"}
            </p>
            <p className="hidden text-[12px] text-[#8a8a8a] sm:block">
              Edit cells inline. Drag the blue handle to fill a column down.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={columnsRef}>
            <Button
              type="button"
              className={cn(dashboardControlClass, "h-9")}
              onClick={() => setColumnsOpen((openState) => !openState)}
            >
              <Columns3 className="size-3.5" />
              Columns
            </Button>
            {columnsOpen ? (
              <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-[0_12px_32px_rgba(26,26,26,0.14)]">
                <div className="border-b border-[#ebebeb] p-2.5">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
                    <Input
                      value={columnQuery}
                      onChange={(e) => setColumnQuery(e.target.value)}
                      placeholder="Search fields"
                      className="h-9 border-[#e3e3e3] pl-8 text-[13px]"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
                  {COLUMN_GROUPS.map((group) => {
                    const cols = filteredColumnDefs.filter(
                      (col) => col.group === group.id
                    );
                    if (cols.length === 0) return null;
                    return (
                      <div key={group.id} className="mb-2 last:mb-0">
                        <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                          {group.label}
                        </p>
                        <div className="space-y-0.5">
                          {cols.map((col) => {
                            const checked =
                              col.locked || visibleColumns.includes(col.id);
                            return (
                              <label
                                key={col.id}
                                className={cn(
                                  "flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-[#f6f6f7]",
                                  col.locked && "cursor-default opacity-70"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={col.locked}
                                  onChange={() => toggleColumn(col.id)}
                                  className="mt-0.5 size-4 rounded border-[#c9cccf]"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[13px] font-medium text-[#303030]">
                                    {col.label}
                                  </span>
                                  {col.hint ? (
                                    <span className="mt-0.5 block text-[11px] leading-snug text-[#8a8a8a]">
                                      {col.hint}
                                    </span>
                                  ) : null}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-9 min-w-[88px]")}
            disabled={!dirty || saving}
            onClick={() => void handleSave()}
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-max">
          <table className="border-separate border-spacing-0 text-left">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#fafafa]">
                {visibleDefs.map((col) => (
                  <th
                    key={col.id}
                    className={cn(
                      "border-b border-[#e3e3e3] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]",
                      col.width,
                      col.id === "title" &&
                        "sticky left-0 z-[15] bg-[#fafafa] pl-4 shadow-[4px_0_8px_rgba(26,26,26,0.04)] sm:pl-5"
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.hint ? (
                        <span title={col.hint}>
                          <Info className="size-3 opacity-60" />
                        </span>
                      ) : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drafts.map((product, rowIndex) => {
                const thumb = getPrimaryMockupUrl(product);
                const economics = computeClientStoreEconomics(product);
                return (
                  <tr
                    key={product.id}
                    data-bulk-row-index={rowIndex}
                    className="group/row bg-white hover:bg-[#fcfcfd]"
                  >
                    {visibleDefs.map((col) => {
                      const isFocused =
                        focused?.productId === product.id &&
                        focused.columnId === col.id;
                      const inFill =
                        fillRange &&
                        fillRange.columnId === col.id &&
                        rowIndex >= fillRange.from &&
                        rowIndex <= fillRange.to;
                      return (
                        <td
                          key={col.id}
                          className={cn(
                            "relative border-b border-[#ebebeb] px-2 py-1.5 align-middle",
                            col.width,
                            inFill && col.id !== "title" && "bg-[#eef3fb]",
                            col.id === "title" &&
                              "sticky left-0 z-[5] bg-white pl-4 shadow-[4px_0_8px_rgba(26,26,26,0.04)] group-hover/row:bg-[#fcfcfd] sm:pl-5",
                            col.id === "title" && inFill && "bg-[#eef3fb]"
                          )}
                          onFocusCapture={() =>
                            setFocused({
                              productId: product.id,
                              columnId: col.id,
                            })
                          }
                        >
                          {col.id === "title" ? (
                            <div className="flex items-center gap-2.5 px-1 py-1">
                              <div className="size-10 shrink-0 overflow-hidden rounded-md border border-[#ebebeb] bg-[#f7f7f8]">
                                {thumb ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={thumb}
                                    alt=""
                                    className="size-full object-contain p-0.5"
                                  />
                                ) : (
                                  <div className="flex size-full items-center justify-center text-[9px] text-[#8a8a8a]">
                                    —
                                  </div>
                                )}
                              </div>
                              <Input
                                value={product.name}
                                onChange={(e) =>
                                  updateProduct(
                                    product.id,
                                    "title",
                                    e.target.value
                                  )
                                }
                                className="h-9 border-transparent bg-transparent px-1.5 text-[13px] font-medium shadow-none hover:border-[#e3e3e3] focus-visible:border-[#c9cccf] focus-visible:bg-white"
                              />
                            </div>
                          ) : col.id === "status" ? (
                            <select
                              value={product.enabled ? "active" : "draft"}
                              onChange={(e) =>
                                updateProduct(
                                  product.id,
                                  "status",
                                  e.target.value === "active"
                                )
                              }
                              className={cn(
                                "h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-[13px] font-medium outline-none hover:border-[#e3e3e3] focus:border-[#c9cccf] focus:bg-white",
                                product.enabled
                                  ? "text-emerald-700"
                                  : "text-[#2c6ecb]"
                              )}
                            >
                              <option value="active">Active</option>
                              <option value="draft">Draft</option>
                            </select>
                          ) : col.id === "productKind" ? (
                            <select
                              value={normalizeClientStoreProductKind(
                                product.productKind
                              )}
                              onChange={(e) =>
                                updateProduct(
                                  product.id,
                                  "productKind",
                                  e.target.value as ClientStoreProductKind
                                )
                              }
                              className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-[13px] outline-none hover:border-[#e3e3e3] focus:border-[#c9cccf] focus:bg-white"
                            >
                              <option value="apparel">Apparel</option>
                              <option value="accessory">Accessory</option>
                            </select>
                          ) : col.id === "sellPriceMode" ? (
                            <select
                              value={product.sellPriceMode}
                              onChange={(e) =>
                                updateProduct(
                                  product.id,
                                  "sellPriceMode",
                                  e.target.value
                                )
                              }
                              className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-[13px] outline-none hover:border-[#e3e3e3] focus:border-[#c9cccf] focus:bg-white"
                            >
                              <option value="fixed">Fixed</option>
                              <option value="markup">Markup</option>
                            </select>
                          ) : col.id === "description" ||
                            col.id === "insights" ? (
                            <textarea
                              value={String(getCellValue(product, col.id))}
                              onChange={(e) =>
                                updateProduct(
                                  product.id,
                                  col.id,
                                  e.target.value
                                )
                              }
                              rows={2}
                              className="w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[12px] leading-relaxed outline-none hover:border-[#e3e3e3] focus:border-[#c9cccf] focus:bg-white"
                            />
                          ) : col.id === "sellPrice" ||
                            col.id === "blankCost" ||
                            col.id === "decorationCost" ||
                            col.id === "setupFee" ||
                            col.id === "markupPercent" ||
                            col.id === "minOrderQty" ? (
                            <div className="relative">
                              <Input
                                value={String(getCellValue(product, col.id))}
                                onChange={(e) =>
                                  updateProduct(
                                    product.id,
                                    col.id,
                                    e.target.value
                                  )
                                }
                                inputMode="decimal"
                                className="h-9 border-transparent bg-transparent px-2 font-mono text-[13px] tabular-nums shadow-none hover:border-[#e3e3e3] focus-visible:border-[#c9cccf] focus-visible:bg-white"
                              />
                              {col.id === "sellPrice" &&
                              product.sellPriceMode === "markup" ? (
                                <p className="px-2 pb-1 text-[10px] text-[#8a8a8a]">
                                  ≈ {formatCurrency(economics.sellPrice)} from
                                  markup
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <Input
                              value={String(getCellValue(product, col.id))}
                              onChange={(e) =>
                                updateProduct(
                                  product.id,
                                  col.id,
                                  e.target.value
                                )
                              }
                              className="h-9 border-transparent bg-transparent px-2 text-[13px] shadow-none hover:border-[#e3e3e3] focus-visible:border-[#c9cccf] focus-visible:bg-white"
                            />
                          )}

                          {isFocused && col.id !== "title" ? (
                            <button
                              type="button"
                              aria-label="Fill down"
                              title="Drag to fill down"
                              className="absolute -bottom-1 -right-1 z-10 size-2.5 cursor-crosshair rounded-[1px] border border-white bg-[#2c6ecb] shadow-sm"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setFillDrag({
                                  columnId: col.id,
                                  sourceIndex: rowIndex,
                                  endIndex: rowIndex,
                                });
                              }}
                            />
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {dirty ? (
        <div className="shrink-0 border-t border-[#ebebeb] bg-white px-4 py-2 text-[12px] text-[#616161] sm:px-5">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#303030]">
            <Check className="size-3.5 text-[#2c6ecb]" />
            Unsaved changes
          </span>
          <span className="mx-2 text-[#c9cccf]">·</span>
          Save when you’re done, or discard from the unsaved bar.
        </div>
      ) : null}
    </div>
  );
}

