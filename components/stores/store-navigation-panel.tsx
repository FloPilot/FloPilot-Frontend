"use client";

import { useEffect, useMemo, useState } from "react";
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
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ensureStoreNavigation,
  isStorefrontNavPage,
  newStoreNavItemId,
  updateThemeNavigation,
  type ClientStoreNavItem,
  type ClientStoreNavigation,
  type ClientStoreTheme,
  type StoreNavItemType,
} from "@/lib/client-store-theme";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const LINK_TYPES: { value: StoreNavItemType; label: string }[] = [
  { value: "group", label: "Dropdown group" },
  { value: "home", label: "Home" },
  { value: "page", label: "Page" },
  { value: "collection", label: "Collection" },
  { value: "products", label: "All products" },
  { value: "url", label: "External URL" },
];

const CHILD_LINK_TYPES = LINK_TYPES.filter((type) => type.value !== "group");

function linkTypeLabel(type: StoreNavItemType): string {
  return LINK_TYPES.find((entry) => entry.value === type)?.label || type;
}

function createNavItem(
  type: StoreNavItemType,
  pageOptions: { id: string; title: string }[],
  collectionOptions: { id: string; name: string }[]
): ClientStoreNavItem {
  const page = pageOptions[0];
  const collection = collectionOptions[0];
  return {
    id: newStoreNavItemId(),
    label:
      type === "home"
        ? "Home"
        : type === "products"
          ? "Shop"
          : type === "group"
            ? "Products"
            : type === "collection"
              ? collection?.name || "Collection"
              : type === "url"
                ? "Link"
                : page?.title || "Page",
    type,
    enabled: true,
    targetId:
      type === "page"
        ? page?.id
        : type === "collection"
          ? collection?.id
          : undefined,
    href: type === "url" ? "https://" : undefined,
    children: type === "group" ? [] : undefined,
  };
}

function applyTypeChange(
  item: ClientStoreNavItem,
  type: StoreNavItemType,
  pageOptions: { id: string; title: string }[],
  collectionOptions: { id: string; name: string }[],
  keepChildren: boolean
): ClientStoreNavItem {
  const next: ClientStoreNavItem = {
    ...item,
    type,
    targetId: undefined,
    href: undefined,
    openInNewTab: false,
  };
  if (!keepChildren) {
    delete next.children;
  } else if (type === "group" && !next.children) {
    next.children = [];
  }

  if (type === "home") next.label = item.label || "Home";
  else if (type === "products") next.label = item.label || "Shop";
  else if (type === "group") next.label = item.label || "Products";
  else if (type === "page") {
    next.targetId = pageOptions[0]?.id;
    if (!item.label || item.label === "Link") {
      next.label = pageOptions[0]?.title || "Page";
    }
  } else if (type === "collection") {
    next.targetId = collectionOptions[0]?.id;
    if (!item.label || item.label === "Link") {
      next.label = collectionOptions[0]?.name || "Collection";
    }
  } else if (type === "url") {
    next.href = "https://";
    next.label = item.label || "Link";
  }
  return next;
}

function SortableNavRow({
  item,
  selected,
  onSelect,
}: {
  item: ClientStoreNavItem;
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
  } = useSortable({ id: item.id });
  const childCount = item.children?.length || 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-center gap-0.5 rounded-lg border px-1 py-0.5",
        selected
          ? "border-brand-primary/30 bg-[#f6f8ff]"
          : "border-transparent hover:bg-[#f6f6f7]",
        isDragging && "z-10 border-[#e3e3e3] bg-white shadow-sm"
      )}
    >
      <button
        type="button"
        className="inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-[#8a8a8a] hover:bg-white/80 hover:text-[#616161] active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 px-1.5 py-1.5 text-left"
      >
        <span className="flex items-center gap-1 truncate text-[13px] font-medium text-[#303030]">
          {item.label}
          {childCount > 0 ? (
            <ChevronDown className="size-3 shrink-0 text-[#8a8a8a]" />
          ) : null}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#8a8a8a]">
          {linkTypeLabel(item.type)}
          {childCount > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>
                {childCount} sub{childCount === 1 ? "" : "s"}
              </span>
            </>
          ) : null}
          {item.enabled === false ? (
            <>
              <span aria-hidden>·</span>
              <span>Hidden</span>
            </>
          ) : null}
        </span>
      </button>
    </div>
  );
}

const fieldClass =
  "mt-1.5 h-9 w-full rounded-lg border border-[#e3e3e3] bg-white px-2.5 text-[13px] text-[#303030] outline-none transition-colors focus:border-[#c9cccf]";

const selectChevron = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%238a8a8a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
)}")`;

const selectClass = cn(
  fieldClass,
  "appearance-none bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-9"
);

function LinkEditorFields({
  item,
  types,
  pageOptions,
  collectionOptions,
  onChange,
}: {
  item: ClientStoreNavItem;
  types: { value: StoreNavItemType; label: string }[];
  pageOptions: { id: string; title: string }[];
  collectionOptions: { id: string; name: string }[];
  onChange: (patch: ClientStoreNavItem) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-[12px] text-[#616161]">Label</Label>
        <Input
          value={item.label}
          onChange={(e) =>
            onChange({ ...item, label: e.target.value.slice(0, 60) })
          }
          className={cn(fieldClass, "mt-1.5")}
          maxLength={60}
        />
      </div>

      <div>
        <Label className="text-[12px] text-[#616161]">Link type</Label>
        <select
          value={item.type}
          onChange={(e) =>
            onChange(
              applyTypeChange(
                item,
                e.target.value as StoreNavItemType,
                pageOptions,
                collectionOptions,
                true
              )
            )
          }
          className={selectClass}
          style={{ backgroundImage: selectChevron }}
        >
          {types.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {item.type === "page" ? (
        <div>
          <Label className="text-[12px] text-[#616161]">Page</Label>
          <select
            value={item.targetId || ""}
            onChange={(e) => {
              const page = pageOptions.find((row) => row.id === e.target.value);
              onChange({
                ...item,
                targetId: e.target.value || undefined,
                label: item.label || page?.title || "Page",
              });
            }}
            className={selectClass}
            style={{ backgroundImage: selectChevron }}
          >
            {pageOptions.length === 0 ? (
              <option value="">No pages available</option>
            ) : (
              pageOptions.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title}
                </option>
              ))
            )}
          </select>
        </div>
      ) : null}

      {item.type === "collection" ? (
        <div>
          <Label className="text-[12px] text-[#616161]">Collection</Label>
          <select
            value={item.targetId || ""}
            onChange={(e) => {
              const collection = collectionOptions.find(
                (row) => row.id === e.target.value
              );
              onChange({
                ...item,
                targetId: e.target.value || undefined,
                label: item.label || collection?.name || "Collection",
              });
            }}
            className={selectClass}
            style={{ backgroundImage: selectChevron }}
          >
            {collectionOptions.length === 0 ? (
              <option value="">No collections yet</option>
            ) : (
              collectionOptions.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))
            )}
          </select>
        </div>
      ) : null}

      {item.type === "url" ? (
        <>
          <div>
            <Label className="text-[12px] text-[#616161]">URL</Label>
            <Input
              value={item.href || ""}
              onChange={(e) =>
                onChange({ ...item, href: e.target.value.slice(0, 500) })
              }
              className={cn(fieldClass, "mt-1.5")}
              placeholder="https://"
            />
          </div>
          <label className="flex items-center gap-2 text-[13px] text-[#303030]">
            <input
              type="checkbox"
              checked={item.openInNewTab === true}
              onChange={(e) =>
                onChange({ ...item, openInNewTab: e.target.checked })
              }
              className="size-3.5 rounded border-[#c9cccf]"
            />
            Open in new tab
          </label>
        </>
      ) : null}

      {item.type === "home" || item.type === "products" ? (
        <p className="text-[12px] leading-relaxed text-[#8a8a8a]">
          {item.type === "home"
            ? "Takes shoppers to the store home page."
            : "Takes shoppers to the home page to browse products."}
        </p>
      ) : null}

      {item.type === "group" ? (
        <p className="text-[12px] leading-relaxed text-[#8a8a8a]">
          Dropdown label only — shoppers open the submenu instead of navigating.
        </p>
      ) : null}
    </div>
  );
}

export function StoreNavigationPanel({
  theme,
  storeName,
  logoUrl,
  onThemeChange,
  onSave,
  saving,
}: {
  theme: ClientStoreTheme;
  storeName: string;
  logoUrl?: string;
  onThemeChange: (theme: ClientStoreTheme) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const navigation = useMemo(
    () => ensureStoreNavigation(theme.navigation, theme.pages),
    [theme.navigation, theme.pages]
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    navigation.items[0]?.id || null
  );
  const [addType, setAddType] = useState<StoreNavItemType>("group");
  const [childAddType, setChildAddType] = useState<StoreNavItemType>("collection");

  const selection = useMemo(() => {
    for (const parent of navigation.items) {
      if (parent.id === selectedId) {
        return { parent: null as ClientStoreNavItem | null, item: parent };
      }
      const child = (parent.children || []).find((row) => row.id === selectedId);
      if (child) return { parent, item: child };
    }
    return null;
  }, [navigation.items, selectedId]);

  useEffect(() => {
    if (selection) return;
    setSelectedId(navigation.items[0]?.id || null);
  }, [navigation.items, selection]);

  const pageOptions = useMemo(
    () =>
      theme.pages
        .filter(isStorefrontNavPage)
        .filter((page) => page.handle !== "home")
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [theme.pages]
  );

  const collectionOptions = useMemo(
    () =>
      theme.collections
        .filter((collection) => collection.enabled !== false)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [theme.collections]
  );

  const patchNavigation = (patch: Partial<ClientStoreNavigation>) => {
    onThemeChange(
      updateThemeNavigation(theme, {
        ...navigation,
        ...patch,
      })
    );
  };

  const replaceItem = (nextItem: ClientStoreNavItem, parentId?: string | null) => {
    if (!parentId) {
      patchNavigation({
        items: navigation.items.map((item) =>
          item.id === nextItem.id ? nextItem : item
        ),
      });
      return;
    }
    patchNavigation({
      items: navigation.items.map((item) =>
        item.id === parentId
          ? {
              ...item,
              children: (item.children || []).map((child) =>
                child.id === nextItem.id ? nextItem : child
              ),
            }
          : item
      ),
    });
  };

  const addLink = (type: StoreNavItemType = addType) => {
    const item = createNavItem(type, pageOptions, collectionOptions);
    patchNavigation({ items: [...navigation.items, item] });
    setSelectedId(item.id);
  };

  const addChildLink = (parentId: string, type: StoreNavItemType = childAddType) => {
    const child = createNavItem(
      type === "group" ? "collection" : type,
      pageOptions,
      collectionOptions
    );
    patchNavigation({
      items: navigation.items.map((item) =>
        item.id === parentId
          ? { ...item, children: [...(item.children || []), child] }
          : item
      ),
    });
    setSelectedId(child.id);
  };

  const removeSelected = () => {
    if (!selection) return;
    if (selection.parent) {
      const parentId = selection.parent.id;
      const children = (selection.parent.children || []).filter(
        (child) => child.id !== selection.item.id
      );
      patchNavigation({
        items: navigation.items.map((item) =>
          item.id === parentId ? { ...item, children } : item
        ),
      });
      setSelectedId(parentId);
      return;
    }
    const items = navigation.items.filter((item) => item.id !== selection.item.id);
    patchNavigation({ items });
    setSelectedId(items[0]?.id || null);
  };

  const moveChild = (parentId: string, childId: string, direction: -1 | 1) => {
    const parent = navigation.items.find((item) => item.id === parentId);
    if (!parent?.children) return;
    const index = parent.children.findIndex((child) => child.id === childId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= parent.children.length) return;
    const children = arrayMove(parent.children, index, nextIndex);
    patchNavigation({
      items: navigation.items.map((item) =>
        item.id === parentId ? { ...item, children } : item
      ),
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = navigation.items.findIndex((item) => item.id === active.id);
    const newIndex = navigation.items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    patchNavigation({ items: arrayMove(navigation.items, oldIndex, newIndex) });
  };

  const logoPreview =
    navigation.logoMode === "none"
      ? null
      : navigation.logoMode === "custom"
        ? navigation.customLogoUrl
        : logoUrl;

  const logoMode =
    navigation.logoMode === "custom" || navigation.logoMode === "none"
      ? navigation.logoMode
      : "store";

  const visibleLinks = navigation.items.filter((item) => item.enabled !== false);
  const editingChild = Boolean(selection?.parent);
  const selectedParent = selection?.parent || null;
  const selectedItem = selection?.item || null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-[#121a2e]">Navigation</p>
          <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
            Build the storefront header — including dropdown submenus.
          </p>
        </div>
        <Button
          type="button"
          className={dashboardPrimaryButtonClass}
          disabled={saving}
          onClick={onSave}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save
        </Button>
      </div>

      <div className={cn(dashboardCardClass, "overflow-hidden p-0")}>
        <div className="border-b border-[#ebebeb] bg-[#f4f4f5] px-4 py-4 sm:px-5">
          <div className="overflow-hidden rounded-lg border border-[#e3e3e3] bg-white shadow-[0_1px_2px_rgba(26,26,26,0.04)]">
            <div className="flex h-12 items-center gap-2 border-b border-[#ebebeb] bg-[#fafafa] px-3">
              <span className="size-2 rounded-full bg-[#e3e3e3]" />
              <span className="size-2 rounded-full bg-[#e3e3e3]" />
              <span className="size-2 rounded-full bg-[#e3e3e3]" />
              <span className="ml-2 text-[11px] font-medium text-[#8a8a8a]">
                Storefront header
              </span>
            </div>
            <div className="flex h-14 items-center justify-between gap-4 px-4">
              <div className="flex min-w-0 items-center gap-2.5">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt=""
                    className="h-8 w-auto max-w-[120px] object-contain"
                  />
                ) : logoMode !== "none" ? (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#303030] text-[10px] font-semibold text-white">
                    {storeName.slice(0, 2).toUpperCase()}
                  </div>
                ) : null}
                {navigation.showStoreName !== false ? (
                  <span className="truncate text-[13px] font-semibold text-[#303030]">
                    {storeName}
                  </span>
                ) : null}
              </div>
              <div className="flex min-w-0 items-center gap-1">
                <nav className="hidden items-center gap-0.5 sm:flex">
                  {visibleLinks.slice(0, 5).map((item) => {
                    const hasKids = (item.children || []).some(
                      (child) => child.enabled !== false
                    );
                    return (
                      <span
                        key={item.id}
                        className={cn(
                          "inline-flex items-center gap-0.5 rounded-md px-2.5 py-1 text-[12px] font-medium",
                          item.id === selectedId ||
                            item.children?.some((child) => child.id === selectedId)
                            ? "bg-[#f6f6f7] text-[#303030]"
                            : "text-[#616161]"
                        )}
                      >
                        {item.label}
                        {hasKids ? <ChevronDown className="size-3" /> : null}
                      </span>
                    );
                  })}
                  {visibleLinks.length > 5 ? (
                    <span className="px-1 text-[11px] text-[#8a8a8a]">…</span>
                  ) : null}
                </nav>
                <span className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e3e3e3] px-2.5 text-[12px] font-medium text-[#616161]">
                  <ShoppingBag className="size-3.5" />
                  Cart
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[#8a8a8a]">
                Logo
              </span>
              <div className="inline-flex rounded-lg border border-[#e3e3e3] bg-white p-0.5">
                {(
                  [
                    ["store", "Store"],
                    ["custom", "Custom"],
                    ["none", "None"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => patchNavigation({ logoMode: value })}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
                      logoMode === value
                        ? "bg-[#f6f6f7] text-[#121a2e]"
                        : "text-[#616161] hover:text-[#303030]"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-[12px] text-[#616161]">
              <input
                type="checkbox"
                checked={navigation.showStoreName !== false}
                onChange={(e) =>
                  patchNavigation({ showStoreName: e.target.checked })
                }
                className="size-3.5 rounded border-[#c9cccf]"
              />
              Show store name
            </label>
            {logoMode === "custom" ? (
              <Input
                value={navigation.customLogoUrl || ""}
                onChange={(e) =>
                  patchNavigation({
                    customLogoUrl: e.target.value.slice(0, 2000) || undefined,
                  })
                }
                className="h-8 max-w-sm border-[#e3e3e3] text-[12px]"
                placeholder="Custom logo URL"
              />
            ) : null}
          </div>
        </div>

        <div className="grid lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="border-b border-[#ebebeb] bg-[#fafafa] lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Menu items
              </p>
              <span className="text-[11px] tabular-nums text-[#8a8a8a]">
                {navigation.items.length}
              </span>
            </div>

            <div className="min-h-[220px] space-y-1 px-2 pb-2">
              {navigation.items.length === 0 ? (
                <div className="px-2 py-10 text-center">
                  <p className="text-[13px] text-[#8a8a8a]">No menu links yet</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext
                    items={navigation.items.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {navigation.items.map((item) => (
                      <div key={item.id} className="space-y-0.5">
                        <SortableNavRow
                          item={item}
                          selected={item.id === selectedId}
                          onSelect={() => setSelectedId(item.id)}
                        />
                        {(item.children || []).length > 0 ? (
                          <div className="ml-5 space-y-0.5 border-l border-[#e3e3e3] pl-2">
                            {(item.children || []).map((child) => (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => setSelectedId(child.id)}
                                className={cn(
                                  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left",
                                  child.id === selectedId
                                    ? "bg-[#f6f8ff] text-[#121a2e]"
                                    : "text-[#616161] hover:bg-white hover:text-[#303030]"
                                )}
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-[12px] font-medium">
                                    {child.label}
                                  </span>
                                  <span className="text-[10px] text-[#8a8a8a]">
                                    {linkTypeLabel(child.type)}
                                    {child.enabled === false ? " · Hidden" : ""}
                                  </span>
                                </span>
                                <span className="flex shrink-0 items-center gap-0.5">
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    className="inline-flex size-6 items-center justify-center rounded text-[#8a8a8a] hover:bg-[#f0f0f1] hover:text-[#303030]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveChild(item.id, child.id, -1);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        moveChild(item.id, child.id, -1);
                                      }
                                    }}
                                  >
                                    <ChevronUp className="size-3" />
                                  </span>
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    className="inline-flex size-6 items-center justify-center rounded text-[#8a8a8a] hover:bg-[#f0f0f1] hover:text-[#303030]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveChild(item.id, child.id, 1);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        moveChild(item.id, child.id, 1);
                                      }
                                    }}
                                  >
                                    <ChevronDown className="size-3" />
                                  </span>
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-[#ebebeb] bg-white px-3 py-2.5">
              <select
                value={addType}
                onChange={(e) => setAddType(e.target.value as StoreNavItemType)}
                className="h-8 min-w-0 flex-1 appearance-none rounded-lg border border-[#e3e3e3] bg-white bg-[length:12px] bg-[right_10px_center] bg-no-repeat pl-2.5 pr-8 text-[12px] text-[#303030]"
                style={{ backgroundImage: selectChevron }}
              >
                {LINK_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                className={cn(dashboardControlClass, "h-8 shrink-0 gap-1 px-2.5")}
                onClick={() => addLink(addType)}
              >
                <Plus className="size-3.5" />
                Add
              </Button>
            </div>
          </aside>

          <div className="p-4 sm:p-5">
            {selectedItem ? (
              <div className="mx-auto max-w-lg space-y-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-semibold text-[#121a2e]">
                      {editingChild ? "Edit submenu link" : "Edit link"}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                      {editingChild && selectedParent
                        ? `Under “${selectedParent.label}”`
                        : "Label and destination for this menu item"}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-2 text-[#8a8a8a] hover:text-[#303030]"
                      onClick={() =>
                        replaceItem(
                          {
                            ...selectedItem,
                            enabled: selectedItem.enabled === false,
                          },
                          selectedParent?.id
                        )
                      }
                      title={
                        selectedItem.enabled === false
                          ? "Show in menu"
                          : "Hide from menu"
                      }
                    >
                      {selectedItem.enabled === false ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-2 text-[#8a8a8a] hover:text-red-700"
                      onClick={removeSelected}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <LinkEditorFields
                  item={selectedItem}
                  types={editingChild ? CHILD_LINK_TYPES : LINK_TYPES}
                  pageOptions={pageOptions}
                  collectionOptions={collectionOptions}
                  onChange={(next) => replaceItem(next, selectedParent?.id)}
                />

                {!editingChild ? (
                  <div className="border-t border-[#ebebeb] pt-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-semibold text-[#121a2e]">
                          Submenu
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                          Nested links appear in a dropdown with a chevron.
                        </p>
                      </div>
                    </div>

                    {(selectedItem.children || []).length > 0 ? (
                      <ul className="mt-3 space-y-1">
                        {(selectedItem.children || []).map((child) => (
                          <li key={child.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedId(child.id)}
                              className="flex w-full items-center justify-between rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-2 text-left hover:border-[#e3e3e3] hover:bg-white"
                            >
                              <span>
                                <span className="block text-[13px] font-medium text-[#303030]">
                                  {child.label}
                                </span>
                                <span className="text-[11px] text-[#8a8a8a]">
                                  {linkTypeLabel(child.type)}
                                </span>
                              </span>
                              <ChevronDown className="size-3.5 -rotate-90 text-[#8a8a8a]" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-[12px] text-[#8a8a8a]">
                        No submenu links yet. Add collections or pages under this
                        item — e.g. Products → T-Shirts, Hoodies, Hats.
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-2">
                      <select
                        value={childAddType}
                        onChange={(e) =>
                          setChildAddType(e.target.value as StoreNavItemType)
                        }
                        className="h-8 min-w-0 flex-1 appearance-none rounded-lg border border-[#e3e3e3] bg-white bg-[length:12px] bg-[right_10px_center] bg-no-repeat pl-2.5 pr-8 text-[12px] text-[#303030]"
                        style={{ backgroundImage: selectChevron }}
                      >
                        {CHILD_LINK_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        className={cn(
                          dashboardControlClass,
                          "h-8 shrink-0 gap-1 px-2.5"
                        )}
                        onClick={() => addChildLink(selectedItem.id, childAddType)}
                      >
                        <Plus className="size-3.5" />
                        Add submenu link
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
                <p className="text-[13px] font-medium text-[#616161]">
                  No link selected
                </p>
                <p className="mt-1 max-w-xs text-[12px] text-[#8a8a8a]">
                  Choose a menu item on the left, or add a dropdown group to get
                  started.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
