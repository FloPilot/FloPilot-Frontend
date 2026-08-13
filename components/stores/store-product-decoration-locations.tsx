"use client";

import { useMemo, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  GripVertical,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { readStoreMockupDataUrl } from "@/lib/artwork-preview";
import {
  createClientStoreDecorationLocationId,
  type ClientStoreDecorationLocation,
} from "@/lib/client-stores";
import { getPrintLocationOptions } from "@/lib/shop-settings";
import { cn } from "@/lib/utils";

function SortableLocationRow({
  location,
  uploading,
  onUpload,
  onRemove,
}: {
  location: ClientStoreDecorationLocation;
  uploading: boolean;
  onUpload: (file: File | null) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: location.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-center gap-2 rounded-xl border border-[#e3e3e3] bg-white px-2 py-2 sm:gap-3 sm:px-3",
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
        aria-label={`Reorder ${location.locationLabel}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>

      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#d4d4d4] bg-[#fafafa] transition-colors hover:border-[#2c6ecb] hover:bg-[#f4f7fd]"
      >
        {location.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={location.imageUrl}
            alt=""
            className="size-full object-contain p-0.5"
          />
        ) : uploading ? (
          <Loader2 className="size-4 animate-spin text-[#8a8a8a]" />
        ) : (
          <ImagePlus className="size-4 text-[#2c6ecb]" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[#303030]">
          {location.locationLabel}
        </p>
        <p className="truncate text-[11px] text-[#8a8a8a]">
          {location.imageUrl
            ? "Shown on the storefront gallery — click image to replace"
            : "Upload a mockup for this placement"}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(event) => {
          void onUpload(event.target.files?.[0] || null);
          event.target.value = "";
        }}
      />

      <Button
        type="button"
        variant="ghost"
        className="h-8 shrink-0 px-2 text-[12px] text-[#8a8a8a] hover:text-red-700"
        onClick={onRemove}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </li>
  );
}

export function StoreProductDecorationLocations({
  locations,
  onChange,
}: {
  locations: ClientStoreDecorationLocation[];
  onChange: (next: ClientStoreDecorationLocation[]) => void;
}) {
  const { settings } = useShopSettings();
  const locationOptions = useMemo(
    () => getPrintLocationOptions(settings.productionDefaults),
    [settings.productionDefaults]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [draftKeys, setDraftKeys] = useState<string[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const modalUploadRef = useRef<HTMLInputElement>(null);
  const modalUploadTargetRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sorted = useMemo(
    () =>
      locations
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [locations]
  );

  const openModal = () => {
    setDraftKeys(sorted.map((row) => row.locationKey));
    setModalOpen(true);
  };

  const toggleDraftKey = (key: string) => {
    setDraftKeys((prev) =>
      prev.includes(key) ? prev.filter((value) => value !== key) : [...prev, key]
    );
  };

  const applyModalSelection = () => {
    const byKey = new Map(sorted.map((row) => [row.locationKey, row]));
    const next: ClientStoreDecorationLocation[] = draftKeys.map(
      (key, index) => {
        const option = locationOptions.find((row) => row.value === key);
        const existing = byKey.get(key);
        if (existing) {
          return {
            ...existing,
            locationLabel: option?.label || existing.locationLabel,
            sortOrder: index,
          };
        }
        return {
          id: createClientStoreDecorationLocationId(),
          locationKey: key,
          locationLabel: option?.label || key,
          sortOrder: index,
        };
      }
    );
    onChange(next);
    setModalOpen(false);
  };

  const patchLocation = (
    locationId: string,
    patch: Partial<ClientStoreDecorationLocation>
  ) => {
    onChange(
      sorted.map((row) =>
        row.id === locationId ? { ...row, ...patch } : row
      )
    );
  };

  const removeLocation = (locationId: string) => {
    onChange(
      sorted
        .filter((row) => row.id !== locationId)
        .map((row, index) => ({ ...row, sortOrder: index }))
    );
  };

  const handleUpload = async (locationId: string, file: File | null) => {
    if (!file) return;
    setUploadingId(locationId);
    try {
      const { previewUrl, error } = await readStoreMockupDataUrl(file);
      if (error || !previewUrl) return;
      patchLocation(locationId, { imageUrl: previewUrl });
    } finally {
      setUploadingId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = sorted.map((row) => row.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(
      arrayMove(sorted, oldIndex, newIndex).map((row, index) => ({
        ...row,
        sortOrder: index,
      }))
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-[#303030]">
            Decoration locations
          </p>
          <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
            Pick placements from your shop settings, upload mockups, and drag to
            set gallery order on the storefront.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-lg border-[#e3e3e3] bg-white text-[12px] font-medium"
          onClick={openModal}
        >
          <Plus className="size-3.5" />
          {sorted.length > 0 ? "Edit locations" : "Add locations"}
        </Button>
      </div>

      {sorted.length === 0 ? (
        <button
          type="button"
          onClick={openModal}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#d4d4d4] bg-[#fafafa] px-4 py-8 text-center transition-colors hover:border-[#2c6ecb] hover:bg-[#f4f7fd]"
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-white text-[#2c6ecb] shadow-sm">
            <MapPin className="size-4" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-[#303030]">
              No decoration locations yet
            </p>
            <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
              Select front, back, sleeve, and more — then attach images
            </p>
          </div>
        </button>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sorted.map((row) => row.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {sorted.map((location) => (
                <SortableLocationRow
                  key={location.id}
                  location={location}
                  uploading={uploadingId === location.id}
                  onUpload={(file) => void handleUpload(location.id, file)}
                  onRemove={() => removeLocation(location.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className={cn(
            "flex h-[min(860px,92vh)] w-[min(1040px,calc(100%-1.5rem))] max-w-none flex-col gap-0 overflow-hidden p-0",
            "rounded-2xl border-0 bg-white shadow-[0_24px_80px_rgba(18,26,46,0.18)] ring-1 ring-black/5 sm:max-w-none"
          )}
        >
          <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-6 py-5 pr-14 text-left sm:px-8">
            <DialogTitle className="text-[1.25rem] font-semibold tracking-tight text-[#121a2e]">
              Decoration locations
            </DialogTitle>
            <DialogDescription className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-[#616161]">
              Select placements from your shop settings, then attach a mockup
              for each one. Those images show in the product gallery on the
              storefront.
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
            <aside className="flex min-h-0 flex-col border-b border-[#ebebeb] bg-[#fafafa] lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between gap-3 border-b border-[#ebebeb] px-5 py-3.5 sm:px-6">
                <div>
                  <p className="text-[13px] font-semibold text-[#121a2e]">
                    Locations
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                    From Settings → Decoration locations
                  </p>
                </div>
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-[11px] font-semibold tabular-nums text-[#616161] ring-1 ring-[#e3e3e3]">
                  {draftKeys.length}
                </span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                {locationOptions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#d4d4d4] bg-white px-4 py-10 text-center">
                    <MapPin className="mx-auto size-5 text-[#c0c0c4]" />
                    <p className="mt-3 text-[13px] font-medium text-[#303030]">
                      No locations configured
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-[#8a8a8a]">
                      Add print locations in Settings first, then come back
                      here.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {locationOptions.map((option) => {
                      const active = draftKeys.includes(option.value);
                      return (
                        <li key={option.value}>
                          <button
                            type="button"
                            onClick={() => toggleDraftKey(option.value)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                              active
                                ? "border-brand-primary/40 bg-white shadow-sm ring-1 ring-brand-primary/15"
                                : "border-transparent bg-transparent hover:border-[#e3e3e3] hover:bg-white"
                            )}
                          >
                            <span
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                                active
                                  ? "border-brand-primary bg-brand-primary text-white"
                                  : "border-[#c9cccf] bg-white text-transparent"
                              )}
                            >
                              <Check className="size-3" strokeWidth={3} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium text-[#303030]">
                                {option.label}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </aside>

            <section className="flex min-h-0 flex-col bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-[#ebebeb] px-5 py-3.5 sm:px-6">
                <div>
                  <p className="text-[13px] font-semibold text-[#121a2e]">
                    Mockup images
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                    Upload one image per selected location
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                {draftKeys.length === 0 ? (
                  <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#d8d8dc] bg-[#fafafa] px-6 py-16 text-center">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-[#8a8a8a] shadow-sm ring-1 ring-[#ebebeb]">
                      <ImagePlus className="size-5" />
                    </div>
                    <p className="mt-4 text-[15px] font-semibold text-[#121a2e]">
                      Select locations on the left
                    </p>
                    <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-[#8a8a8a]">
                      Choose front, back, sleeve, or any placement you’ve set
                      up — then drop a mockup photo into each card.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {draftKeys.map((key) => {
                      const option = locationOptions.find(
                        (row) => row.value === key
                      );
                      const existing = sorted.find(
                        (row) => row.locationKey === key
                      );
                      const label =
                        option?.label || existing?.locationLabel || key;
                      const imageUrl = existing?.imageUrl;
                      const busy =
                        uploadingId === existing?.id ||
                        (modalUploadTargetRef.current === key &&
                          uploadingId === "modal");
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            modalUploadTargetRef.current = key;
                            modalUploadRef.current?.click();
                          }}
                          className={cn(
                            "group flex min-h-[220px] flex-col overflow-hidden rounded-2xl border bg-[#fafafa] text-left transition-all",
                            "hover:border-[#2c6ecb] hover:bg-[#f7f9fd] hover:shadow-[0_8px_24px_rgba(44,110,203,0.08)]",
                            imageUrl
                              ? "border-[#d7e3f5]"
                              : "border-dashed border-[#d0d0d4]"
                          )}
                        >
                          <div className="flex min-h-0 flex-1 items-center justify-center px-4 pt-5">
                            {imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={imageUrl}
                                alt={`${label} mockup`}
                                className="max-h-40 w-full object-contain"
                              />
                            ) : busy ? (
                              <Loader2 className="size-6 animate-spin text-[#8a8a8a]" />
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-center">
                                <div className="flex size-11 items-center justify-center rounded-full bg-white text-[#2c6ecb] shadow-sm ring-1 ring-[#ebebeb] transition-transform group-hover:scale-105">
                                  <Upload className="size-4" />
                                </div>
                                <p className="text-[12px] font-medium text-[#616161]">
                                  Upload mockup
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="border-t border-[#ebebeb]/80 bg-white px-4 py-3">
                            <p className="truncate text-[13px] font-semibold text-[#303030]">
                              {label}
                            </p>
                            <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                              {imageUrl
                                ? "Click to replace image"
                                : "PNG, JPG, or WebP"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <input
                  ref={modalUploadRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={(event) => {
                    const key = modalUploadTargetRef.current;
                    const file = event.target.files?.[0] || null;
                    event.target.value = "";
                    if (!key || !file) return;
                    const existing = sorted.find(
                      (row) => row.locationKey === key
                    );
                    if (existing) {
                      void handleUpload(existing.id, file);
                      return;
                    }
                    const option = locationOptions.find(
                      (row) => row.value === key
                    );
                    const id = createClientStoreDecorationLocationId();
                    setUploadingId("modal");
                    void readStoreMockupDataUrl(file)
                      .then(({ previewUrl, error }) => {
                        if (error || !previewUrl) return;
                        const staged: ClientStoreDecorationLocation = {
                          id,
                          locationKey: key,
                          locationLabel: option?.label || key,
                          imageUrl: previewUrl,
                          sortOrder: draftKeys.indexOf(key),
                        };
                        const byKey = new Map(
                          sorted.map((row) => [row.locationKey, row] as const)
                        );
                        byKey.set(key, staged);
                        onChange(
                          draftKeys.map((draftKey, index) => {
                            const row = byKey.get(draftKey);
                            if (row) return { ...row, sortOrder: index };
                            const opt = locationOptions.find(
                              (optionRow) => optionRow.value === draftKey
                            );
                            return {
                              id: createClientStoreDecorationLocationId(),
                              locationKey: draftKey,
                              locationLabel: opt?.label || draftKey,
                              sortOrder: index,
                            };
                          })
                        );
                      })
                      .finally(() => {
                        setUploadingId(null);
                        modalUploadTargetRef.current = null;
                      });
                  }}
                />
              </div>
            </section>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 gap-3 rounded-b-2xl border-t border-[#ebebeb] bg-white px-6 py-4 sm:mx-0 sm:mb-0 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="text-[12px] leading-relaxed text-[#8a8a8a]">
              Changes apply when you click Apply. Remember to save the product
              afterward.
            </p>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 rounded-xl border-[#e3e3e3] px-4 text-[13px] font-medium sm:flex-none"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-10 flex-1 rounded-xl px-5 text-[13px] font-medium sm:flex-none"
                onClick={applyModalSelection}
              >
                Apply locations
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
