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
  ImagePlus,
  LayoutTemplate,
  Loader2,
  Palette,
  Plus,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { CustomerAccentPicker } from "@/components/customers/customer-accent-picker";
import { DesignStudioEditImageDialog } from "@/components/design-studio/design-studio-edit-image-dialog";
import { StoreSectionRenderer } from "@/components/stores/store-section-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readStoreMockupDataUrl } from "@/lib/artwork-preview";
import {
  STORE_WIDGET_LIBRARY,
  createSectionFromWidget,
  ensureStoreTheme,
  getPageById,
  heroContentBlockLabel,
  normalizeHeroContentOrder,
  sectionTypeLabel,
  updatePageSections,
  type ClientStoreCollection,
  type ClientStoreSection,
  type ClientStoreTheme,
  type StoreHeroContentBlock,
  type StoreHeroImagePosition,
  type StoreSectionType,
} from "@/lib/client-store-theme";
import type { ClientStore } from "@/lib/client-stores";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import {
  CUSTOMER_ACCENT_OPTIONS,
  type CustomerAccentKey,
} from "@/lib/production-customer-colors";
import { cn } from "@/lib/utils";

type CustomizeNav = "sections" | "branding";

const COLOR_PRESETS = [
  "#ffffff",
  "#f6f6f7",
  "#303030",
  "#121a2e",
  "#2762ff",
  "#eef1ff",
  "#ecfdf5",
  "#fff7ed",
];

const HERO_IMAGE_POSITIONS: {
  value: StoreHeroImagePosition;
  label: string;
}[] = [
  { value: "left top", label: "Top left" },
  { value: "center top", label: "Top" },
  { value: "right top", label: "Top right" },
  { value: "left center", label: "Left" },
  { value: "center center", label: "Center" },
  { value: "right center", label: "Right" },
  { value: "left bottom", label: "Bottom left" },
  { value: "center bottom", label: "Bottom" },
  { value: "right bottom", label: "Bottom right" },
];

function SortableSectionRow({
  section,
  index,
  selected,
  onSelect,
}: {
  section: ClientStoreSection;
  index: number;
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
  } = useSortable({ id: section.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "group flex w-full items-center gap-1 rounded-lg border px-1 py-1.5 text-left transition-colors",
        isDragging
          ? "z-20 border-brand-primary/40 bg-white shadow-[0_8px_24px_rgba(26,26,26,0.12)]"
          : selected
            ? "border-brand-primary/30 bg-white shadow-sm"
            : "border-transparent hover:bg-white"
      )}
    >
      <button
        type="button"
        className={cn(
          "inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-[#c0c0c4] transition-colors",
          "hover:bg-[#f1f1f1] hover:text-[#616161] active:cursor-grabbing",
          isDragging && "cursor-grabbing text-[#616161]"
        )}
        aria-label={`Drag ${section.settings.title || sectionTypeLabel(section.type)}`}
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
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-[#303030]">
            {section.settings.title || sectionTypeLabel(section.type)}
          </p>
          <p className="text-[11px] text-[#8a8a8a]">
            {sectionTypeLabel(section.type)}
          </p>
        </div>
        {!section.enabled ? (
          <EyeOff className="size-3.5 shrink-0 text-[#8a8a8a]" />
        ) : null}
        <span className="text-[10px] tabular-nums text-[#c0c0c4]">
          {index + 1}
        </span>
      </button>
    </div>
  );
}

function SortableHeroContentRow({
  block,
  index,
}: {
  block: StoreHeroContentBlock;
  index: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-center gap-1 rounded-lg border bg-white px-1 py-1.5",
        isDragging
          ? "z-20 border-brand-primary/40 shadow-[0_8px_24px_rgba(26,26,26,0.12)]"
          : "border-[#e3e3e3]"
      )}
    >
      <button
        type="button"
        className={cn(
          "inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-[#c0c0c4] transition-colors",
          "hover:bg-[#f1f1f1] hover:text-[#616161] active:cursor-grabbing",
          isDragging && "cursor-grabbing text-[#616161]"
        )}
        aria-label={`Drag ${heroContentBlockLabel(block)}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <div className="min-w-0 flex-1 px-1.5">
        <p className="text-[12px] font-medium text-[#303030]">
          {heroContentBlockLabel(block)}
        </p>
      </div>
      <span className="pr-2 text-[10px] tabular-nums text-[#c0c0c4]">
        {index + 1}
      </span>
    </div>
  );
}

export function StoreCustomizeBuilder({
  store,
  theme,
  onThemeChange,
  activePageId,
  onActivePageChange,
  accentColorKey,
  onAccentChange,
  headline,
  description,
  onHeadlineChange,
  onDescriptionChange,
  pageBackgroundColor,
  onPageBackgroundColorChange,
  onSave,
  onUploadLogo,
  onUploadHero,
  onClearLogo,
  onClearHero,
  saving,
  uploadingAsset,
  showSave = true,
}: {
  store: ClientStore;
  theme: ClientStoreTheme;
  onThemeChange: (theme: ClientStoreTheme) => void;
  activePageId: string | null;
  onActivePageChange: (pageId: string) => void;
  accentColorKey: CustomerAccentKey | null;
  onAccentChange: (value: CustomerAccentKey | null) => void;
  headline: string;
  description: string;
  onHeadlineChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  pageBackgroundColor?: string;
  onPageBackgroundColorChange?: (value: string) => void;
  onSave: () => void;
  onUploadLogo: (file: File | null) => void;
  onUploadHero: (file: File | null) => void;
  onClearLogo: () => void;
  onClearHero: () => void;
  saving: boolean;
  uploadingAsset: "logo" | "hero" | null;
  showSave?: boolean;
}) {
  const activePage = getPageById(theme, activePageId);
  const pageSections = activePage?.sections || [];

  const [nav, setNav] = useState<CustomizeNav>("sections");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    pageSections[0]?.id || null
  );
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSectionId(pageSections[0]?.id || null);
  }, [activePage?.id]);

  const accent =
    CUSTOMER_ACCENT_OPTIONS.find((opt) => opt.key === accentColorKey) ||
    CUSTOMER_ACCENT_OPTIONS[0];

  const selectedSection =
    pageSections.find((section) => section.id === selectedSectionId) || null;

  const publicProducts = useMemo(
    () =>
      (store.products || [])
        .filter((product) => product.enabled)
        .map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          insights: product.insights,
          brand: product.brand,
          color: product.color,
          colors: product.colors,
          colorVariants: product.colorVariants,
          productKind: product.productKind,
          sizes: product.sizes,
          mockupUrl: product.mockupUrl,
          galleryUrls: product.galleryUrls,
          tags: product.tags || [],
          sellPrice: product.sellPrice,
          decorationType: product.decorationType,
          decorationLocations: product.decorationLocations || [],
          minOrderQty: product.minOrderQty,
          setupFee: product.setupFee,
        })),
    [store.products]
  );

  const updateSections = (sections: ClientStoreSection[]) => {
    if (!activePage) return;
    onThemeChange(updatePageSections(theme, activePage.id, sections));
  };

  const patchSection = (
    sectionId: string,
    patch: Partial<ClientStoreSection> | ((current: ClientStoreSection) => ClientStoreSection)
  ) => {
    updateSections(
      pageSections.map((section) => {
        if (section.id !== sectionId) return section;
        return typeof patch === "function" ? patch(section) : { ...section, ...patch };
      })
    );
  };

  const patchSectionSettings = (
    sectionId: string,
    settingsPatch: Partial<ClientStoreSection["settings"]>
  ) => {
    patchSection(sectionId, (current) => ({
      ...current,
      settings: { ...current.settings, ...settingsPatch },
    }));
  };

  const addSection = (type: StoreSectionType) => {
    const section = createSectionFromWidget(type, pageSections.length);
    updateSections([...pageSections, section]);
    setSelectedSectionId(section.id);
    setLibraryOpen(false);
    setNav("sections");
  };

  const moveSection = (sectionId: string, direction: -1 | 1) => {
    const index = pageSections.findIndex((section) => section.id === sectionId);
    if (index < 0) return;
    const next = index + direction;
    if (next < 0 || next >= pageSections.length) return;
    const copy = pageSections.slice();
    const [row] = copy.splice(index, 1);
    copy.splice(next, 0, row);
    updateSections(copy);
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pageSections.findIndex(
      (section) => section.id === active.id
    );
    const newIndex = pageSections.findIndex(
      (section) => section.id === over.id
    );
    if (oldIndex < 0 || newIndex < 0) return;
    updateSections(arrayMove(pageSections, oldIndex, newIndex));
  };

  const sectionSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const removeSection = (sectionId: string) => {
    const target = pageSections.find((section) => section.id === sectionId);
    if (target?.type === "product_detail") return;
    const next = pageSections.filter((section) => section.id !== sectionId);
    updateSections(next);
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(next[0]?.id || null);
    }
  };

  const availableWidgets = useMemo(() => {
    const hasProductDetail = pageSections.some(
      (section) => section.type === "product_detail"
    );
    return STORE_WIDGET_LIBRARY.filter((widget) => {
      if (widget.type === "product_detail") {
        return activePage?.handle === "product" && !hasProductDetail;
      }
      return true;
    });
  }, [pageSections, activePage?.handle]);

  const uploadImage = async (
    fieldKey: string,
    file: File | null,
    onUrl: (url: string) => void
  ) => {
    if (!file) return;
    setUploadingField(fieldKey);
    try {
      const { previewUrl, error } = await readStoreMockupDataUrl(file);
      if (error || !previewUrl) return;
      onUrl(previewUrl);
    } finally {
      setUploadingField(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] px-4 py-3">
        <div className="flex gap-1 rounded-lg border border-[#e3e3e3] bg-[#f4f4f5] p-1">
          <div className="mr-2 min-w-[140px] sm:min-w-[160px]">
            <select
              value={activePage?.id || ""}
              onChange={(e) => {
                onActivePageChange(e.target.value);
                const page = theme.pages.find((row) => row.id === e.target.value);
                setSelectedSectionId(page?.sections[0]?.id || null);
                setNav("sections");
              }}
              className="h-8 w-full appearance-none rounded-md border border-[#e3e3e3] bg-white bg-[length:12px] bg-[right_10px_center] bg-no-repeat pl-2.5 pr-8 text-[12px] font-medium text-[#303030]"
              style={{
                backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%238a8a8a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
                )}")`,
              }}
            >
              {theme.pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title}
                </option>
              ))}
            </select>
          </div>
          {(
            [
              ["sections", "Sections", LayoutTemplate],
              ["branding", "Branding", Palette],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setNav(id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                nav === id
                  ? "bg-white text-[#121a2e] shadow-[0_1px_2px_rgba(26,26,26,0.08)]"
                  : "text-[#616161] hover:text-[#303030]"
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
        {showSave ? (
          <Button
            type="button"
            className={dashboardPrimaryButtonClass}
            disabled={saving}
            onClick={onSave}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save customize
          </Button>
        ) : null}
      </div>

      <div className="grid min-h-[640px] lg:h-[min(760px,calc(100vh-8rem))] lg:min-h-0 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        {/* Left rail */}
        <aside className="border-b border-[#ebebeb] bg-[#fafafa] lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          {nav === "sections" ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between px-3 py-3">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Page sections
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#a0a0a0]">
                    Drag the grip to rearrange
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLibraryOpen((open) => !open)}
                  className="inline-flex size-7 items-center justify-center rounded-md border border-[#e3e3e3] bg-white text-[#303030] hover:bg-[#f6f6f7]"
                  title="Add section"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              {libraryOpen ? (
                <div className="mx-3 mb-3 space-y-1 rounded-lg border border-[#e3e3e3] bg-white p-2">
                  <p className="px-1 pb-1 text-[11px] font-medium text-[#8a8a8a]">
                    Widget library
                  </p>
                  {availableWidgets.map((widget) => (
                    <button
                      key={widget.type}
                      type="button"
                      onClick={() => addSection(widget.type)}
                      className="w-full rounded-md px-2 py-2 text-left hover:bg-[#f6f6f7]"
                    >
                      <p className="text-[12px] font-medium text-[#303030]">
                        {widget.label}
                      </p>
                      <p className="text-[11px] text-[#8a8a8a]">
                        {widget.description}
                      </p>
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="flex-1 overflow-y-auto px-2 pb-3">
                {pageSections.length === 0 ? (
                  <p className="px-2 py-8 text-center text-[12px] text-[#8a8a8a]">
                    Add a section from the widget library.
                  </p>
                ) : (
                  <DndContext
                    sensors={sectionSensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleSectionDragEnd}
                  >
                    <SortableContext
                      items={pageSections.map((section) => section.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1">
                        {pageSections.map((section, index) => (
                          <SortableSectionRow
                            key={section.id}
                            section={section}
                            index={index}
                            selected={selectedSectionId === section.id}
                            onSelect={() => setSelectedSectionId(section.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          ) : null}


          {nav === "branding" ? (
            <div className="px-3 py-4 text-[12px] leading-relaxed text-[#8a8a8a]">
              Logo, accent color, and legacy hero assets. Page sections control
              most of what shoppers see.
            </div>
          ) : null}
        </aside>

        {/* Center preview */}
        <div className="min-h-[420px] overflow-y-auto bg-[#e8e8ea] lg:min-h-0">
          <div className="mx-auto max-w-[1100px] py-4 sm:py-6">
            <div
              className="overflow-hidden rounded-lg border border-[#d4d4d4] shadow-sm"
              style={{
                background: pageBackgroundColor || "#ffffff",
              }}
            >
              <div className="flex h-12 items-center justify-between gap-3 border-b border-[#e3e3e3] px-4">
                <div className="flex min-w-0 items-center gap-2">
                  {theme.navigation?.logoMode === "none" ? null : (
                    theme.navigation?.logoMode === "custom" &&
                    theme.navigation.customLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={theme.navigation.customLogoUrl}
                        alt=""
                        className="h-7 w-auto object-contain"
                      />
                    ) : store.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={store.logoUrl}
                        alt=""
                        className="h-7 w-auto object-contain"
                      />
                    ) : (
                      <span className="text-[12px] font-semibold text-[#303030]">
                        {store.name}
                      </span>
                    )
                  )}
                  {theme.navigation?.showStoreName !== false &&
                  (store.logoUrl ||
                    theme.navigation?.logoMode === "custom" ||
                    theme.navigation?.logoMode === "none") ? (
                    <span className="truncate text-[12px] font-semibold text-[#303030]">
                      {store.name}
                    </span>
                  ) : null}
                </div>
                <div className="flex min-w-0 items-center gap-1 overflow-hidden">
                  {(theme.navigation?.items || [])
                    .filter((item) => item.enabled !== false)
                    .slice(0, 4)
                    .map((item) => (
                      <span
                        key={item.id}
                        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-[#8a8a8a]"
                      >
                        {item.label}
                      </span>
                    ))}
                  <span className="shrink-0 text-[11px] text-[#8a8a8a]">
                    Preview
                  </span>
                </div>
              </div>
              {pageSections
                .filter((section) => section.enabled)
                .map((section) => (
                  <div
                    key={section.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setNav("sections");
                      setSelectedSectionId(section.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        setNav("sections");
                        setSelectedSectionId(section.id);
                      }
                    }}
                    className={cn(
                      "relative outline-none transition-shadow",
                      selectedSectionId === section.id && nav === "sections"
                        ? "ring-2 ring-inset ring-brand-primary"
                        : "hover:ring-1 hover:ring-inset hover:ring-[#c9cccf]"
                    )}
                  >
                    <StoreSectionRenderer
                      section={section}
                      products={publicProducts}
                      collections={theme.collections}
                      accentHex={accent.hex}
                      compact
                      theme={theme}
                      previewProduct={publicProducts[0] || null}
                    />
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right settings */}
        <aside className="border-t border-[#ebebeb] bg-white lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
          {nav === "sections" && selectedSection ? (
            <SectionSettingsPanel
              section={selectedSection}
              collections={theme.collections}
              pages={theme.pages}
              uploadingField={uploadingField}
              onUploadImage={uploadImage}
              onPatchSettings={(patch) =>
                patchSectionSettings(selectedSection.id, patch)
              }
              onToggleEnabled={() =>
                patchSection(selectedSection.id, {
                  enabled: !selectedSection.enabled,
                })
              }
              onMoveUp={() => moveSection(selectedSection.id, -1)}
              onMoveDown={() => moveSection(selectedSection.id, 1)}
              onRemove={() => removeSection(selectedSection.id)}
              canRemove={selectedSection.type !== "product_detail"}
            />
          ) : null}


          {nav === "sections" && !selectedSection ? (
            <div className="px-4 py-10 text-center text-[13px] text-[#8a8a8a]">
              Select a section to edit its settings.
            </div>
          ) : null}

          {nav === "branding" ? (
            <div className="space-y-5 px-4 py-4">
              <div>
                <Label className="text-[12px]">Headline (legacy)</Label>
                <Input
                  value={headline}
                  onChange={(e) => onHeadlineChange(e.target.value)}
                  className="mt-1.5 h-9 border-[#e3e3e3] text-[13px]"
                />
              </div>
              <div>
                <Label className="text-[12px]">Description (legacy)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  className="mt-1.5 min-h-[80px] border-[#e3e3e3] text-[13px]"
                />
              </div>
              <div>
                <Label className="text-[12px]">Accent color</Label>
                <div className="mt-2">
                  <CustomerAccentPicker
                    value={accentColorKey}
                    onChange={onAccentChange}
                    customerId={store.customerId}
                    fallbackKey={store.name}
                    hint="Used for buttons and highlights on the live store."
                  />
                </div>
              </div>
              {onPageBackgroundColorChange ? (
                <ColorField
                  label="Page background"
                  value={pageBackgroundColor || "#ffffff"}
                  onChange={onPageBackgroundColorChange}
                />
              ) : null}
              <AssetUploadField
                label="Logo"
                url={store.logoUrl}
                uploading={uploadingAsset === "logo"}
                onUpload={(file) => onUploadLogo(file)}
                onClear={onClearLogo}
              />
              <AssetUploadField
                label="Default hero image"
                url={store.heroImageUrl}
                uploading={uploadingAsset === "hero"}
                onUpload={(file) => onUploadHero(file)}
                onClear={onClearHero}
              />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function AssetUploadField({
  label,
  url,
  uploading,
  onUpload,
  onClear,
}: {
  label: string;
  url?: string;
  uploading?: boolean;
  onUpload: (file: File | null) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <Label className="text-[12px]">{label}</Label>
      <div className="mt-1.5 flex aspect-[16/10] items-center justify-center overflow-hidden rounded-lg border border-[#e3e3e3] bg-[#f6f6f7]">
        {uploading ? (
          <Loader2 className="size-4 animate-spin text-[#8a8a8a]" />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-full object-contain p-2" />
        ) : (
          <ImagePlus className="size-5 text-[#c0c0c4]" />
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <label className={cn(dashboardControlClass, "flex-1 cursor-pointer justify-center")}>
          <Upload className="size-3.5" />
          Upload
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              onUpload(e.target.files?.[0] || null);
              e.target.value = "";
            }}
          />
        </label>
        {url ? (
          <Button
            type="button"
            variant="ghost"
            className="h-9 px-2.5 text-[#8a8a8a] hover:text-red-700"
            onClick={onClear}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label className="text-[12px]">{label}</Label>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {COLOR_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            title={color}
            onClick={() => onChange(color)}
            className={cn(
              "size-7 rounded-md border",
              value === color ? "ring-2 ring-brand-primary/40" : "border-[#e3e3e3]"
            )}
            style={{ background: color }}
          />
        ))}
      </div>
      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#ffffff"
        className="mt-2 h-9 border-[#e3e3e3] text-[12px]"
      />
    </div>
  );
}

function SectionSettingsPanel({
  section,
  collections,
  pages,
  uploadingField,
  onUploadImage,
  onPatchSettings,
  onToggleEnabled,
  onMoveUp,
  onMoveDown,
  onRemove,
  canRemove = true,
}: {
  section: ClientStoreSection;
  collections: ClientStoreCollection[];
  pages: ClientStoreTheme["pages"];
  uploadingField: string | null;
  onUploadImage: (
    fieldKey: string,
    file: File | null,
    onUrl: (url: string) => void
  ) => void;
  onPatchSettings: (patch: Partial<ClientStoreSection["settings"]>) => void;
  onToggleEnabled: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  canRemove?: boolean;
}) {
  const [heroLogoEditorOpen, setHeroLogoEditorOpen] = useState(false);
  const settings = section.settings;
  const linkablePages = pages.filter(
    (page) => page.enabled !== false && page.handle !== "product"
  );
  const buttonLinkType = settings.buttonLinkType || "products";
  const heroLogoWorkingUrl = settings.heroLogoUrl || "";
  const heroLogoOriginalUrl =
    settings.heroLogoOriginalUrl || settings.heroLogoUrl || "";
  const heroContentOrder = normalizeHeroContentOrder(settings.heroContentOrder);
  const heroContentSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleHeroContentDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = heroContentOrder.indexOf(
      active.id as StoreHeroContentBlock
    );
    const newIndex = heroContentOrder.indexOf(over.id as StoreHeroContentBlock);
    if (oldIndex < 0 || newIndex < 0) return;
    onPatchSettings({
      heroContentOrder: arrayMove(heroContentOrder, oldIndex, newIndex),
    });
  };

  return (
    <div className="flex h-full max-h-[70vh] flex-col lg:max-h-none">
      <div className="border-b border-[#ebebeb] px-4 py-3">
        <p className="text-[13px] font-semibold text-[#121a2e]">
          {sectionTypeLabel(section.type)}
        </p>
        <p className="text-[11px] text-[#8a8a8a]">Section settings</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-md border-[#e3e3e3] px-2 text-[11px]"
            onClick={onMoveUp}
          >
            <ChevronUp className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-md border-[#e3e3e3] px-2 text-[11px]"
            onClick={onMoveDown}
          >
            <ChevronDown className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-md border-[#e3e3e3] px-2 text-[11px]"
            onClick={onToggleEnabled}
          >
            {section.enabled ? (
              <Eye className="size-3.5" />
            ) : (
              <EyeOff className="size-3.5" />
            )}
            {section.enabled ? "Hide" : "Show"}
          </Button>
          {canRemove ? (
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-[11px] text-red-700 hover:bg-red-50"
              onClick={onRemove}
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {section.type === "hero" ? (
          <div>
            <Label className="text-[12px]">Content order</Label>
            <p className="mt-1 text-[11px] leading-relaxed text-[#8a8a8a]">
              Drag to rearrange logo, overline, heading, subheading, and button
              in the hero.
            </p>
            <div className="mt-2">
              <DndContext
                sensors={heroContentSensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleHeroContentDragEnd}
              >
                <SortableContext
                  items={heroContentOrder}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {heroContentOrder.map((block, index) => (
                      <SortableHeroContentRow
                        key={block}
                        block={block}
                        index={index}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        ) : null}

        {section.type === "hero" ? (
          <div>
            <Label className="text-[12px]">Hero logo</Label>
            <p className="mt-1 text-[11px] leading-relaxed text-[#8a8a8a]">
              Displays above the overline and heading. Click the logo to remove
              the background or recolor artwork — same tools as Design Studio.
            </p>
            <button
              type="button"
              disabled={!heroLogoWorkingUrl || uploadingField === `${section.id}-hero-logo`}
              onClick={() => {
                if (!heroLogoWorkingUrl) return;
                setHeroLogoEditorOpen(true);
              }}
              className={cn(
                "mt-2 flex h-16 w-full items-center justify-center overflow-hidden rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] p-2 transition-colors",
                heroLogoWorkingUrl
                  ? "cursor-pointer hover:border-brand-primary/40 hover:bg-[#f4f7ff]"
                  : "cursor-default"
              )}
            >
              {uploadingField === `${section.id}-hero-logo` ? (
                <Loader2 className="size-4 animate-spin text-[#8a8a8a]" />
              ) : heroLogoWorkingUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroLogoWorkingUrl}
                  alt=""
                  className="size-full object-contain"
                />
              ) : (
                <ImagePlus className="size-5 text-[#c0c0c4]" />
              )}
            </button>
            <div className="mt-2 flex gap-2">
              <label
                className={cn(
                  dashboardControlClass,
                  "flex-1 cursor-pointer justify-center"
                )}
              >
                <Upload className="size-3.5" />
                Upload logo
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={(e) => {
                    void onUploadImage(
                      `${section.id}-hero-logo`,
                      e.target.files?.[0] || null,
                      (url) =>
                        onPatchSettings({
                          heroLogoUrl: url,
                          heroLogoOriginalUrl: url,
                        })
                    );
                    e.target.value = "";
                  }}
                />
              </label>
              {heroLogoWorkingUrl ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 border-[#e3e3e3] px-2.5 text-[#616161]"
                    onClick={() => setHeroLogoEditorOpen(true)}
                    title="Edit logo"
                  >
                    <Wand2 className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 px-2.5 text-[#8a8a8a] hover:text-red-700"
                    onClick={() =>
                      onPatchSettings({
                        heroLogoUrl: "",
                        heroLogoOriginalUrl: "",
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {section.type === "product_detail" ? (
          <>
            <div>
              <Label className="text-[12px]">Eyebrow / label</Label>
              <Input
                value={settings.title || ""}
                onChange={(e) => onPatchSettings({ title: e.target.value })}
                placeholder="Product"
                className="mt-1.5 h-9 border-[#e3e3e3] text-[13px]"
              />
            </div>
            <div>
              <Label className="text-[12px]">Helper text</Label>
              <Textarea
                value={settings.body || ""}
                onChange={(e) => onPatchSettings({ body: e.target.value })}
                className="mt-1.5 min-h-[72px] border-[#e3e3e3] text-[13px]"
              />
            </div>
            <div>
              <Label className="text-[12px]">Button label</Label>
              <Input
                value={settings.buttonLabel || ""}
                onChange={(e) =>
                  onPatchSettings({ buttonLabel: e.target.value })
                }
                placeholder="Add to cart"
                className="mt-1.5 h-9 border-[#e3e3e3] text-[13px]"
              />
            </div>
            <ColorField
              label="Background"
              value={settings.backgroundColor}
              onChange={(backgroundColor) =>
                onPatchSettings({ backgroundColor })
              }
            />
            <ColorField
              label="Text color"
              value={settings.textColor}
              onChange={(textColor) => onPatchSettings({ textColor })}
            />
            <div>
              <Label className="text-[12px]">Product media background</Label>
              <div className="mt-1.5 flex gap-1">
                {(
                  [
                    ["auto", "Match image"],
                    ["custom", "Custom"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      onPatchSettings({ cardBackgroundMode: mode })
                    }
                    className={cn(
                      "h-8 flex-1 rounded-md border text-[12px] font-medium",
                      (settings.cardBackgroundMode || "auto") === mode
                        ? "border-brand-primary bg-brand-primary/8 text-[#121a2e]"
                        : "border-[#e3e3e3] text-[#616161]"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#8a8a8a]">
                Match image samples the mockup corners so white studio shots
                don’t sit on a gray box.
              </p>
            </div>
            {(settings.cardBackgroundMode || "auto") === "custom" ? (
              <ColorField
                label="Media color"
                value={settings.cardBackgroundColor || "#ffffff"}
                onChange={(cardBackgroundColor) =>
                  onPatchSettings({ cardBackgroundColor })
                }
              />
            ) : null}
            <div>
              <Label className="text-[12px]">Product media shadow</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-1">
                {(
                  [
                    ["none", "None"],
                    ["soft", "Soft"],
                    ["medium", "Medium"],
                    ["strong", "Strong"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onPatchSettings({ cardShadow: value })}
                    className={cn(
                      "h-8 rounded-md border text-[12px] font-medium",
                      (settings.cardShadow || "soft") === value
                        ? "border-brand-primary bg-brand-primary/8 text-[#121a2e]"
                        : "border-[#e3e3e3] text-[#616161]"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-2 text-[11px] leading-relaxed text-[#8a8a8a]">
              This block shows the live product gallery, price, and size/color
              pickers. Add rich text or banners above/below it on the Product
              page.
            </p>
          </>
        ) : null}

        {(section.type === "hero" ||
          section.type === "rich_text" ||
          section.type === "image_banner" ||
          section.type === "featured_collection" ||
          section.type === "product_grid" ||
          section.type === "collection_list") && (
          <div>
            <Label className="text-[12px]">Heading</Label>
            <Input
              value={settings.title || ""}
              onChange={(e) => onPatchSettings({ title: e.target.value })}
              className="mt-1.5 h-9 border-[#e3e3e3] text-[13px]"
            />
          </div>
        )}

        {section.type === "hero" ? (
          <div>
            <Label className="text-[12px]">Overline</Label>
            <Input
              value={
                settings.hideEyebrow ? "" : settings.eyebrow || ""
              }
              onChange={(e) => {
                const next = e.target.value;
                onPatchSettings({
                  eyebrow: next,
                  hideEyebrow: next.trim().length === 0,
                });
              }}
              placeholder="Collection"
              className="mt-1.5 h-9 border-[#e3e3e3] text-[13px]"
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#8a8a8a]">
              Small label above the heading. Clear the field to hide it.
            </p>
          </div>
        ) : null}

        {(section.type === "hero" || section.type === "image_banner") && (
          <div>
            <Label className="text-[12px]">Subheading</Label>
            <Textarea
              value={settings.subtitle || ""}
              onChange={(e) => onPatchSettings({ subtitle: e.target.value })}
              className="mt-1.5 min-h-[72px] border-[#e3e3e3] text-[13px]"
            />
          </div>
        )}

        {section.type === "rich_text" ? (
          <div>
            <Label className="text-[12px]">Body</Label>
            <Textarea
              value={settings.body || ""}
              onChange={(e) => onPatchSettings({ body: e.target.value })}
              className="mt-1.5 min-h-[100px] border-[#e3e3e3] text-[13px]"
            />
          </div>
        ) : null}

        {section.type === "hero" ? (
          <>
            <div>
              <Label className="text-[12px]">Button label</Label>
              <Input
                value={settings.buttonLabel || ""}
                onChange={(e) =>
                  onPatchSettings({ buttonLabel: e.target.value })
                }
                className="mt-1.5 h-9 border-[#e3e3e3] text-[13px]"
              />
            </div>
            <div>
              <Label className="text-[12px]">Button link</Label>
              <select
                value={buttonLinkType}
                onChange={(e) => {
                  const nextType = e.target
                    .value as NonNullable<
                    ClientStoreSection["settings"]["buttonLinkType"]
                  >;
                  const patch: Partial<ClientStoreSection["settings"]> = {
                    buttonLinkType: nextType,
                  };
                  if (nextType === "collection") {
                    patch.buttonLinkTargetId =
                      settings.buttonLinkTargetId ||
                      collections.find((row) => row.enabled)?.id ||
                      "";
                  } else if (nextType === "page") {
                    patch.buttonLinkTargetId =
                      settings.buttonLinkTargetId ||
                      linkablePages[0]?.id ||
                      "";
                  } else {
                    patch.buttonLinkTargetId = "";
                  }
                  if (nextType !== "url") {
                    patch.buttonUrl = "";
                    patch.buttonOpenInNewTab = false;
                  }
                  onPatchSettings(patch);
                }}
                className="mt-1.5 h-9 w-full rounded-md border border-[#e3e3e3] bg-white px-3 text-[13px] text-[#303030]"
              >
                <option value="products">All products (home)</option>
                <option value="collection">Collection</option>
                <option value="page">Page</option>
                <option value="url">External URL</option>
                <option value="none">No link</option>
              </select>
            </div>
            {buttonLinkType === "collection" ? (
              <div>
                <Label className="text-[12px]">Collection</Label>
                <select
                  value={settings.buttonLinkTargetId || ""}
                  onChange={(e) =>
                    onPatchSettings({ buttonLinkTargetId: e.target.value })
                  }
                  className="mt-1.5 h-9 w-full rounded-md border border-[#e3e3e3] bg-white px-3 text-[13px] text-[#303030]"
                >
                  <option value="">Select collection…</option>
                  {collections
                    .filter((row) => row.enabled)
                    .map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : null}
            {buttonLinkType === "page" ? (
              <div>
                <Label className="text-[12px]">Page</Label>
                <select
                  value={settings.buttonLinkTargetId || ""}
                  onChange={(e) =>
                    onPatchSettings({ buttonLinkTargetId: e.target.value })
                  }
                  className="mt-1.5 h-9 w-full rounded-md border border-[#e3e3e3] bg-white px-3 text-[13px] text-[#303030]"
                >
                  <option value="">Select page…</option>
                  {linkablePages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {buttonLinkType === "url" ? (
              <>
                <div>
                  <Label className="text-[12px]">URL</Label>
                  <Input
                    value={settings.buttonUrl || ""}
                    onChange={(e) =>
                      onPatchSettings({ buttonUrl: e.target.value })
                    }
                    placeholder="https://"
                    className="mt-1.5 h-9 border-[#e3e3e3] text-[13px]"
                  />
                </div>
                <label className="flex items-center gap-2 text-[12px] text-[#616161]">
                  <input
                    type="checkbox"
                    checked={settings.buttonOpenInNewTab === true}
                    onChange={(e) =>
                      onPatchSettings({
                        buttonOpenInNewTab: e.target.checked,
                      })
                    }
                    className="size-3.5 rounded border-[#c9cccf]"
                  />
                  Open in new tab
                </label>
              </>
            ) : null}
          </>
        ) : null}

        {(section.type === "hero" || section.type === "image_banner") && (
          <div>
            <Label className="text-[12px]">Image</Label>
            <div className="mt-1.5 flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-[#e3e3e3] bg-[#f6f6f7]">
              {uploadingField === `${section.id}-image` ? (
                <Loader2 className="size-4 animate-spin text-[#8a8a8a]" />
              ) : settings.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.imageUrl}
                  alt=""
                  className={cn(
                    "size-full",
                    settings.imageFit === "contain"
                      ? "object-contain"
                      : "object-cover"
                  )}
                  style={{
                    objectPosition: settings.imagePosition || "center center",
                  }}
                />
              ) : (
                <ImagePlus className="size-5 text-[#c0c0c4]" />
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <label
                className={cn(
                  dashboardControlClass,
                  "flex-1 cursor-pointer justify-center"
                )}
              >
                <Upload className="size-3.5" />
                Upload
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={(e) => {
                    void onUploadImage(
                      `${section.id}-image`,
                      e.target.files?.[0] || null,
                      (url) => onPatchSettings({ imageUrl: url })
                    );
                    e.target.value = "";
                  }}
                />
              </label>
              {settings.imageUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 px-2.5 text-[#8a8a8a] hover:text-red-700"
                  onClick={() => onPatchSettings({ imageUrl: "" })}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </div>
            {section.type === "hero" ? (
              <>
                <p className="mt-2 text-[11px] leading-relaxed text-[#8a8a8a]">
                  Best results: upload a wide 12:5 image, at least 2400 × 1000
                  px. Keep faces, logos, and important details near the focal
                  point below.
                </p>
                <div className="mt-3">
                  <Label className="text-[12px]">Image fit</Label>
                  <div className="mt-1.5 grid grid-cols-2 gap-1">
                    {(
                      [
                        ["cover", "Fill & crop"],
                        ["contain", "Show whole image"],
                      ] as const
                    ).map(([fit, label]) => (
                      <button
                        key={fit}
                        type="button"
                        onClick={() => onPatchSettings({ imageFit: fit })}
                        className={cn(
                          "h-8 rounded-md border text-[12px] font-medium",
                          (settings.imageFit || "cover") === fit
                            ? "border-brand-primary bg-brand-primary/8 text-[#121a2e]"
                            : "border-[#e3e3e3] text-[#616161]"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="text-[12px]">Image focal point</Label>
                  <div className="mt-1.5 grid grid-cols-3 gap-1">
                    {HERO_IMAGE_POSITIONS.map((position) => (
                      <button
                        key={position.value}
                        type="button"
                        aria-label={position.label}
                        title={position.label}
                        onClick={() =>
                          onPatchSettings({ imagePosition: position.value })
                        }
                        className={cn(
                          "h-8 rounded-md border text-[11px] font-medium",
                          (settings.imagePosition || "center center") ===
                            position.value
                            ? "border-brand-primary bg-brand-primary/8 text-[#121a2e]"
                            : "border-[#e3e3e3] text-[#616161]"
                        )}
                      >
                        {position.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[#8a8a8a]">
                    Use this to keep the important part visible when Fill & crop
                    is selected.
                  </p>
                </div>
              </>
            ) : null}
          </div>
        )}

        {(section.type === "featured_collection" ||
          section.type === "product_grid") && (
          <>
            {section.type === "featured_collection" ? (
              <div>
                <Label className="text-[12px]">Collection</Label>
                <select
                  value={settings.collectionId || ""}
                  onChange={(e) =>
                    onPatchSettings({
                      collectionId: e.target.value || undefined,
                      productSource: "collection",
                    })
                  }
                  className="mt-1.5 h-9 w-full rounded-lg border border-[#e3e3e3] bg-white px-2 text-[13px]"
                >
                  <option value="">Select collection…</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <Label className="text-[12px]">Columns</Label>
              <div className="mt-1.5 flex gap-1">
                {([2, 3, 4] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => onPatchSettings({ columns: count })}
                    className={cn(
                      "h-8 flex-1 rounded-md border text-[12px] font-medium",
                      settings.columns === count
                        ? "border-brand-primary bg-brand-primary/8 text-[#121a2e]"
                        : "border-[#e3e3e3] text-[#616161]"
                    )}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-[12px]">Product card background</Label>
              <div className="mt-1.5 flex gap-1">
                {(
                  [
                    ["auto", "Match image"],
                    ["custom", "Custom"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      onPatchSettings({ cardBackgroundMode: mode })
                    }
                    className={cn(
                      "h-8 flex-1 rounded-md border text-[12px] font-medium",
                      (settings.cardBackgroundMode || "auto") === mode
                        ? "border-brand-primary bg-brand-primary/8 text-[#121a2e]"
                        : "border-[#e3e3e3] text-[#616161]"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#8a8a8a]">
                Match image samples the mockup corners so white studio shots
                don’t sit on a gray box.
              </p>
            </div>
            {(settings.cardBackgroundMode || "auto") === "custom" ? (
              <ColorField
                label="Card color"
                value={settings.cardBackgroundColor || "#ffffff"}
                onChange={(cardBackgroundColor) =>
                  onPatchSettings({ cardBackgroundColor })
                }
              />
            ) : null}
            <div>
              <Label className="text-[12px]">Product card shadow</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-1">
                {(
                  [
                    ["none", "None"],
                    ["soft", "Soft"],
                    ["medium", "Medium"],
                    ["strong", "Strong"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onPatchSettings({ cardShadow: value })}
                    className={cn(
                      "h-8 rounded-md border text-[12px] font-medium",
                      (settings.cardShadow || "soft") === value
                        ? "border-brand-primary bg-brand-primary/8 text-[#121a2e]"
                        : "border-[#e3e3e3] text-[#616161]"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {(section.type === "hero" || section.type === "rich_text") && (
          <div>
            <Label className="text-[12px]">Text align</Label>
            <div className="mt-1.5 flex gap-1">
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => onPatchSettings({ textAlign: align })}
                  className={cn(
                    "h-8 flex-1 rounded-md border text-[12px] font-medium capitalize",
                    settings.textAlign === align
                      ? "border-brand-primary bg-brand-primary/8 text-[#121a2e]"
                      : "border-[#e3e3e3] text-[#616161]"
                  )}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        )}

        {section.type !== "product_detail" ? (
          <>
            <ColorField
              label="Background"
              value={settings.backgroundColor}
              onChange={(backgroundColor) => onPatchSettings({ backgroundColor })}
            />
            <ColorField
              label="Text color"
              value={settings.textColor}
              onChange={(textColor) => onPatchSettings({ textColor })}
            />
          </>
        ) : null}
      </div>

      {heroLogoWorkingUrl ? (
        <DesignStudioEditImageDialog
          open={heroLogoEditorOpen}
          onOpenChange={setHeroLogoEditorOpen}
          originalUrl={heroLogoOriginalUrl}
          workingUrl={heroLogoWorkingUrl}
          fileLabel="Hero logo"
          onApply={(result) => {
            onPatchSettings({
              heroLogoUrl: result.cleanUrl,
              heroLogoOriginalUrl: heroLogoOriginalUrl || result.cleanUrl,
            });
            setHeroLogoEditorOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

export function useEnsuredTheme(store: ClientStore | null): ClientStoreTheme {
  return useMemo(
    () =>
      ensureStoreTheme(store?.theme, {
        name: store?.name,
        headline: store?.headline,
        description: store?.description,
        heroImageUrl: store?.heroImageUrl,
      }),
    [store]
  );
}
