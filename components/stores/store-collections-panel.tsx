"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import {
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readStoreMockupDataUrl } from "@/lib/artwork-preview";
import {
  collectProductTags,
  insertDuplicatedClientStoreCollection,
  newStoreCollectionId,
  newStoreCollectionRuleId,
  resolveCollectionProducts,
  type ClientStoreCollection,
  type ClientStoreCollectionRule,
  type ClientStoreTheme,
} from "@/lib/client-store-theme";
import {
  getPrimaryMockupUrl,
  type ClientStoreProduct,
} from "@/lib/client-stores";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

function emptyRule(): ClientStoreCollectionRule {
  return {
    id: newStoreCollectionRuleId(),
    field: "tag",
    operator: "equals",
    value: "",
  };
}

function SortableCollectionRow({
  collection,
  count,
  selected,
  onSelect,
}: {
  collection: ClientStoreCollection;
  count: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: collection.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex w-full items-center gap-1 rounded-lg border px-1 py-1 text-left",
        isDragging
          ? "z-20 border-brand-primary/40 bg-white shadow-[0_8px_24px_rgba(26,26,26,0.12)]"
          : selected
            ? "border-brand-primary/30 bg-[#f6f8ff]"
            : "border-transparent hover:bg-[#f6f6f7]"
      )}
    >
      <button
        type="button"
        className={cn(
          "inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-[#c0c0c4] transition-colors",
          "hover:bg-[#f1f1f1] hover:text-[#616161] active:cursor-grabbing",
          isDragging && "cursor-grabbing text-[#616161]"
        )}
        aria-label={`Reorder ${collection.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left"
      >
        <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#ebebeb] bg-[#fafafa]">
          {collection.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={collection.imageUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <Package className="size-3.5 text-[#8a8a8a]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-[#303030]">
            {collection.name}
          </p>
          <p className="text-[11px] text-[#8a8a8a]">
            {count} product{count === 1 ? "" : "s"}
            {collection.selectionType === "smart" ? " · Smart" : ""}
            {!collection.enabled ? " · Hidden" : ""}
          </p>
        </div>
      </button>
    </div>
  );
}

function SortableCollectionProductRow({
  product,
  selectionType,
  onRemove,
}: {
  product: ClientStoreProduct;
  selectionType: "manual" | "smart";
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-center gap-2 bg-white px-2 py-2.5 sm:gap-3 sm:px-3",
        isDragging && "relative z-20 shadow-[0_8px_24px_rgba(26,26,26,0.12)]"
      )}
    >
      <button
        type="button"
        className={cn(
          "inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-[#c0c0c4] transition-colors",
          "hover:bg-[#f1f1f1] hover:text-[#616161] active:cursor-grabbing",
          isDragging && "cursor-grabbing text-[#616161]"
        )}
        aria-label={`Reorder ${product.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#ebebeb] bg-[#fafafa] p-1">
        {getPrimaryMockupUrl(product) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getPrimaryMockupUrl(product)}
            alt=""
            className="size-full object-contain"
          />
        ) : (
          <Package className="size-3.5 text-[#c0c0c4]" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[#303030]">
          {product.name}
        </p>
        <p className="truncate text-[11px] text-[#8a8a8a]">
          {[
            [product.brand, product.color].filter(Boolean).join(" · "),
            formatCurrency(product.sellPrice),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {(product.tags || []).length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {(product.tags || []).slice(0, 4).map((tag) => (
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
      <Button
        type="button"
        variant="ghost"
        className="h-8 shrink-0 px-2 text-[12px] text-[#8a8a8a] hover:text-red-700"
        onClick={onRemove}
      >
        {selectionType === "smart" ? "Exclude" : "Remove"}
      </Button>
    </li>
  );
}

function ProductSearchAdd({
  products,
  onAdd,
}: {
  products: ClientStoreProduct[];
  onAdd: (productId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? products
      : products.filter((product) => {
          const haystack = [
            product.name,
            product.brand,
            product.color,
            product.decorationType,
            ...(product.tags || []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        });
    return filtered.slice(0, 10);
  }, [products, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const pick = (productId: string) => {
    onAdd(productId);
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  };

  const showMenu = open && (matches.length > 0 || Boolean(query.trim()));

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!showMenu) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((index) =>
                Math.min(index + 1, Math.max(matches.length - 1, 0))
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (matches[activeIndex]) pick(matches[activeIndex].id);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={
            products.length === 0
              ? "All enabled products are in this collection"
              : "Search products — click to add"
          }
          disabled={products.length === 0}
          className="h-9 border-[#e3e3e3] pl-9 text-[12px]"
          autoComplete="off"
        />
      </div>
      {showMenu ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-lg border border-[#e3e3e3] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.10)]">
          {matches.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto py-1">
              {matches.map((product, index) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(product.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left",
                      index === activeIndex
                        ? "bg-[#f4f7fd]"
                        : "hover:bg-[#f6f6f7]"
                    )}
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#ebebeb] bg-[#fafafa] p-0.5">
                      {getPrimaryMockupUrl(product) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getPrimaryMockupUrl(product)}
                          alt=""
                          className="size-full object-contain"
                        />
                      ) : (
                        <Package className="size-3 text-[#c0c0c4]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-[#303030]">
                        {product.name}
                      </p>
                      {[product.brand, product.color]
                        .filter(Boolean)
                        .join(" · ") ? (
                        <p className="truncate text-[11px] text-[#8a8a8a]">
                          {[product.brand, product.color]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <Plus className="size-3.5 shrink-0 text-[#2c6ecb]" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2.5 text-[11px] text-[#8a8a8a]">
              No matching products to add.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TagSuggestInput({
  value,
  onChange,
  suggestions,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    const filtered = suggestions.filter((tag) => {
      if (!query) return true;
      return tag.toLowerCase().includes(query);
    });
    return filtered
      .slice()
      .sort((a, b) => {
        if (!query) {
          return a.localeCompare(b, undefined, { sensitivity: "base" });
        }
        const aStarts = a.toLowerCase().startsWith(query) ? 0 : 1;
        const bStarts = b.toLowerCase().startsWith(query) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.localeCompare(b, undefined, { sensitivity: "base" });
      })
      .slice(0, 8);
  }, [suggestions, value]);

  const exactMatch = suggestions.some(
    (tag) => tag.toLowerCase() === value.trim().toLowerCase()
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [value, open]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const pick = (tag: string) => {
    onChange(tag);
    setOpen(false);
    inputRef.current?.blur();
  };

  const showMenu =
    open && (matches.length > 0 || (Boolean(value.trim()) && !exactMatch));

  return (
    <div ref={rootRef} className="relative min-w-[160px] flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showMenu) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((index) =>
              Math.min(index + 1, Math.max(matches.length - 1, 0))
            );
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (matches[activeIndex]) pick(matches[activeIndex]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className="h-8 border-[#e3e3e3] text-[12px]"
        autoComplete="off"
      />
      {showMenu ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-lg border border-[#e3e3e3] bg-white shadow-[0_8px_24px_rgba(26,26,26,0.10)]">
          {matches.length > 0 ? (
            <ul className="max-h-48 overflow-y-auto py-1">
              {matches.map((tag, index) => (
                <li key={tag}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(tag)}
                    className={cn(
                      "flex w-full items-center px-3 py-1.5 text-left text-[12px]",
                      index === activeIndex
                        ? "bg-[#f4f7fd] text-[#2c6ecb]"
                        : "text-[#303030] hover:bg-[#f6f6f7]"
                    )}
                  >
                    {tag}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-[11px] text-[#8a8a8a]">
              No matching tags yet — add this tag on a product first.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function StoreCollectionsPanel({
  theme,
  onThemeChange,
  products,
  onSave,
  saving,
  showSave = true,
}: {
  theme: ClientStoreTheme;
  onThemeChange: (theme: ClientStoreTheme) => void;
  products: ClientStoreProduct[];
  onSave: () => void;
  saving: boolean;
  showSave?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    theme.collections[0]?.id || null
  );
  const [uploading, setUploading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const selected =
    theme.collections.find((row) => row.id === selectedId) || null;

  const updateCollections = (collections: ClientStoreCollection[]) => {
    onThemeChange({
      ...theme,
      collections: collections.map((collection, index) => ({
        ...collection,
        sortOrder: index,
      })),
    });
  };

  const patchCollection = (
    collectionId: string,
    patch: Partial<ClientStoreCollection>
  ) => {
    updateCollections(
      theme.collections.map((collection) =>
        collection.id === collectionId ? { ...collection, ...patch } : collection
      )
    );
  };

  const addCollection = () => {
    const collection: ClientStoreCollection = {
      id: newStoreCollectionId(),
      name: "New collection",
      description: "",
      selectionType: "manual",
      productIds: [],
      excludedProductIds: [],
      rules: [],
      matchType: "all",
      sortOrder: theme.collections.length,
      enabled: true,
    };
    updateCollections([...theme.collections, collection]);
    setSelectedId(collection.id);
  };

  const removeCollection = (collectionId: string) => {
    const next = theme.collections.filter((row) => row.id !== collectionId);
    updateCollections(next);
    setSelectedId(next[0]?.id || null);
  };

  const duplicateCollection = (collectionId: string) => {
    const result = insertDuplicatedClientStoreCollection(
      theme.collections,
      collectionId
    );
    if (!result) return;
    updateCollections(result.collections);
    setSelectedId(result.duplicate.id);
  };

  const uploadCover = async (file: File | null) => {
    if (!file || !selected) return;
    setUploading(true);
    try {
      const { previewUrl, error } = await readStoreMockupDataUrl(file);
      if (error || !previewUrl) return;
      patchCollection(selected.id, { imageUrl: previewUrl });
    } finally {
      setUploading(false);
    }
  };

  const enabledProducts = useMemo(
    () => products.filter((product) => product.enabled),
    [products]
  );

  const availableTags = useMemo(
    () => collectProductTags(enabledProducts),
    [enabledProducts]
  );

  const collectionItems = useMemo(() => {
    if (!selected) return [];
    return resolveCollectionProducts(selected, enabledProducts);
  }, [selected, enabledProducts]);

  const selectionType =
    selected?.selectionType === "smart" ||
    (selected?.selectionType !== "manual" &&
      (selected?.rules || []).some((rule) => String(rule.value || "").trim()))
      ? "smart"
      : "manual";

  const productsNotInManual = useMemo(() => {
    if (!selected || selectionType !== "manual") return [];
    const inCollection = new Set(selected.productIds);
    return enabledProducts.filter((product) => !inCollection.has(product.id));
  }, [selected, selectionType, enabledProducts]);

  const setSelectionType = (next: "manual" | "smart") => {
    if (!selected) return;
    if (next === "smart") {
      const nextRules =
        selected.rules && selected.rules.length > 0
          ? selected.rules
          : [emptyRule()];
      const hasRuleValues = nextRules.some((rule) =>
        String(rule.value || "").trim()
      );
      const matchedIds = hasRuleValues
        ? resolveCollectionProducts(
            {
              ...selected,
              selectionType: "smart",
              rules: nextRules,
            },
            enabledProducts
          ).map((product) => product.id)
        : selected.productIds.slice();
      const pinned = selected.productIds.filter((id) => matchedIds.includes(id));
      const rest = matchedIds.filter((id) => !selected.productIds.includes(id));
      patchCollection(selected.id, {
        selectionType: "smart",
        rules: nextRules,
        matchType: selected.matchType || "all",
        excludedProductIds: selected.excludedProductIds || [],
        productIds: [...pinned, ...rest],
      });
      return;
    }
    patchCollection(selected.id, {
      selectionType: "manual",
    });
  };

  const patchRule = (
    ruleId: string,
    patch: Partial<ClientStoreCollectionRule>
  ) => {
    if (!selected) return;
    patchCollection(selected.id, {
      rules: (selected.rules || []).map((rule) =>
        rule.id === ruleId ? { ...rule, ...patch } : rule
      ),
    });
  };

  const removeFromCollection = (productId: string) => {
    if (!selected) return;
    if (selectionType === "smart") {
      const excluded = new Set(selected.excludedProductIds || []);
      excluded.add(productId);
      patchCollection(selected.id, {
        excludedProductIds: Array.from(excluded),
        productIds: (selected.productIds || []).filter((id) => id !== productId),
      });
      return;
    }
    patchCollection(selected.id, {
      productIds: selected.productIds.filter((id) => id !== productId),
    });
  };

  const addManualProduct = (productId: string) => {
    if (!selected || !productId) return;
    if (selected.productIds.includes(productId)) return;
    patchCollection(selected.id, {
      productIds: [...selected.productIds, productId],
    });
  };

  const handleCollectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = theme.collections.findIndex((row) => row.id === active.id);
    const newIndex = theme.collections.findIndex((row) => row.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    updateCollections(arrayMove(theme.collections, oldIndex, newIndex));
  };

  const handleProductDragEnd = (event: DragEndEvent) => {
    if (!selected) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // Use the resolved list so smart collections can pin order via productIds
    // even when membership still comes from tag rules.
    const ids = collectionItems.map((product) => product.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    patchCollection(selected.id, {
      productIds: arrayMove(ids, oldIndex, newIndex),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-[#121a2e]">Collections</p>
          <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
            Drag to reorder collections and products — that order is what shoppers see.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            className={dashboardControlClass}
            onClick={addCollection}
          >
            <Plus className="size-3.5" />
            Add collection
          </Button>
          {showSave ? (
            <Button
              type="button"
              className={dashboardPrimaryButtonClass}
              disabled={saving}
              onClick={onSave}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className={cn(dashboardCardClass, "overflow-hidden p-0")}>
          <div className="border-b border-[#ebebeb] px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              All collections
            </p>
          </div>
          <div className="max-h-[640px] space-y-1 overflow-y-auto p-2">
            {theme.collections.length === 0 ? (
              <p className="px-2 py-8 text-center text-[12px] text-[#8a8a8a]">
                No collections yet. Create one to showcase product groups.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleCollectionDragEnd}
              >
                <SortableContext
                  items={theme.collections.map((row) => row.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {theme.collections.map((collection) => {
                    const count = resolveCollectionProducts(
                      collection,
                      enabledProducts
                    ).length;
                    return (
                      <SortableCollectionRow
                        key={collection.id}
                        collection={collection}
                        count={count}
                        selected={selectedId === collection.id}
                        onSelect={() => setSelectedId(collection.id)}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {!selected ? (
            <div className={cn(dashboardCardClass, "px-4 py-16 text-center")}>
              <p className="text-[13px] text-[#8a8a8a]">
                Select or create a collection to edit.
              </p>
            </div>
          ) : (
            <>
              <div className={cn(dashboardCardClass, "p-4 sm:p-5")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-[13px] font-semibold text-[#121a2e]">
                    Collection details
                  </p>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-2 text-[12px] text-[#616161]"
                      onClick={() => duplicateCollection(selected.id)}
                    >
                      <Copy className="size-3.5" />
                      Duplicate
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-2 text-[12px] text-[#616161]"
                      onClick={() =>
                        patchCollection(selected.id, {
                          enabled: !selected.enabled,
                        })
                      }
                    >
                      {selected.enabled ? (
                        <Eye className="size-3.5" />
                      ) : (
                        <EyeOff className="size-3.5" />
                      )}
                      {selected.enabled ? "Hide" : "Show"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-2 text-[12px] text-red-700 hover:bg-red-50"
                      onClick={() => removeCollection(selected.id)}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                  <div className="shrink-0">
                    <div className="flex size-24 items-center justify-center overflow-hidden rounded-xl border border-[#e3e3e3] bg-[#f6f6f7]">
                      {uploading ? (
                        <Loader2 className="size-4 animate-spin text-[#8a8a8a]" />
                      ) : selected.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selected.imageUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <ImagePlus className="size-5 text-[#c0c0c4]" />
                      )}
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <label
                        className={cn(
                          dashboardControlClass,
                          "h-8 flex-1 cursor-pointer justify-center px-2 text-[11px]"
                        )}
                      >
                        <Upload className="size-3" />
                        Upload
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp"
                          className="hidden"
                          onChange={(e) => {
                            void uploadCover(e.target.files?.[0] || null);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {selected.imageUrl ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-2 text-[#8a8a8a] hover:text-red-700"
                          onClick={() =>
                            patchCollection(selected.id, {
                              imageUrl: undefined,
                            })
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <Label className="text-[12px] text-[#616161]">Name</Label>
                      <Input
                        value={selected.name}
                        onChange={(e) =>
                          patchCollection(selected.id, {
                            name: e.target.value,
                          })
                        }
                        className="mt-1 h-9 border-[#e3e3e3] text-[13px]"
                      />
                    </div>
                    <div>
                      <Label className="text-[12px] text-[#616161]">
                        Description
                      </Label>
                      <Textarea
                        value={selected.description || ""}
                        onChange={(e) =>
                          patchCollection(selected.id, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Optional — shown on the collection page"
                        className="mt-1 min-h-[72px] resize-none border-[#e3e3e3] text-[13px]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={cn(dashboardCardClass, "overflow-hidden p-0")}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
                  <div>
                    <p className="text-[13px] font-semibold text-[#121a2e]">
                      Products
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                      Choose products by hand or auto-match with tags.
                    </p>
                  </div>
                  <div className="inline-flex rounded-lg border border-[#e3e3e3] bg-[#f4f4f5] p-0.5">
                    {(
                      [
                        ["manual", "Manual"],
                        ["smart", "Smart"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSelectionType(value)}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                          selectionType === value
                            ? "bg-white text-[#121a2e] shadow-[0_1px_2px_rgba(26,26,26,0.08)]"
                            : "text-[#616161] hover:text-[#303030]"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 px-4 py-4 sm:px-5">
                  {selectionType === "smart" ? (
                    <div className="space-y-3 rounded-xl border border-[#ebebeb] bg-[#fafafa] p-3.5">
                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#616161]">
                        <span>Products must match</span>
                        <select
                          value={selected.matchType || "all"}
                          onChange={(e) =>
                            patchCollection(selected.id, {
                              matchType:
                                e.target.value === "any" ? "any" : "all",
                            })
                          }
                          className="h-8 rounded-md border border-[#e3e3e3] bg-white px-2 text-[12px] text-[#303030]"
                        >
                          <option value="all">all</option>
                          <option value="any">any</option>
                        </select>
                        <span>conditions</span>
                      </div>

                      <div className="space-y-2">
                        {(selected.rules || []).map((rule) => (
                          <div
                            key={rule.id}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <span className="inline-flex h-8 items-center rounded-md border border-[#e3e3e3] bg-white px-2.5 text-[12px] font-medium text-[#303030]">
                              Product tag
                            </span>
                            <span className="inline-flex h-8 items-center rounded-md border border-[#e3e3e3] bg-white px-2.5 text-[12px] text-[#616161]">
                              is equal to
                            </span>
                            <TagSuggestInput
                              value={rule.value}
                              onChange={(next) =>
                                patchRule(rule.id, { value: next })
                              }
                              suggestions={availableTags}
                              placeholder="Start typing a tag…"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-8 px-2 text-[#8a8a8a] hover:text-red-700"
                              onClick={() =>
                                patchCollection(selected.id, {
                                  rules: (selected.rules || []).filter(
                                    (row) => row.id !== rule.id
                                  ),
                                })
                              }
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 px-2 text-[12px] text-[#2c6ecb] hover:bg-[#f4f7fd]"
                        onClick={() =>
                          patchCollection(selected.id, {
                            rules: [...(selected.rules || []), emptyRule()],
                          })
                        }
                      >
                        <Plus className="size-3.5" />
                        Add condition
                      </Button>

                      {availableTags.length === 0 ? (
                        <p className="text-[11px] leading-relaxed text-[#8a8a8a]">
                          Tip: add tags on products (Products tab) so smart
                          collections can match them automatically.
                        </p>
                      ) : (
                        <p className="text-[11px] leading-relaxed text-[#8a8a8a]">
                          Suggestions come from tags already on your products.
                          Click one to use the exact spelling.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <ProductSearchAdd
                        products={productsNotInManual}
                        onAdd={addManualProduct}
                      />
                      <p className="text-[11px] text-[#8a8a8a]">
                        Click a result to add it. Drag items below to set the order on the site.
                      </p>
                    </div>
                  )}

                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <p className="text-[12px] font-semibold text-[#303030]">
                        Collection items
                      </p>
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f1f1f1] px-1.5 text-[11px] font-semibold tabular-nums text-[#616161]">
                        {collectionItems.length}
                      </span>
                      {collectionItems.length > 1 ? (
                        <span className="text-[11px] text-[#8a8a8a]">
                          Drag to reorder
                        </span>
                      ) : null}
                    </div>

                    {collectionItems.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#e3e3e3] px-4 py-10 text-center">
                        <p className="text-[13px] font-medium text-[#303030]">
                          No products in this collection yet
                        </p>
                        <p className="mt-1 text-[12px] text-[#8a8a8a]">
                          {selectionType === "smart"
                            ? "Add a tag condition above, or tag products so they match."
                            : "Search above and click a product to add it."}
                        </p>
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis]}
                        onDragEnd={handleProductDragEnd}
                      >
                        <SortableContext
                          items={collectionItems.map((row) => row.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <ul className="divide-y divide-[#ebebeb] overflow-hidden rounded-xl border border-[#e3e3e3]">
                            {collectionItems.map((product) => (
                              <SortableCollectionProductRow
                                key={product.id}
                                product={product}
                                selectionType={selectionType}
                                onRemove={() => removeFromCollection(product.id)}
                              />
                            ))}
                          </ul>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
