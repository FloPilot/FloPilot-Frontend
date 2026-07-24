"use client";

import { useMemo, useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import {
  AdminLockNotice,
  SaveButton,
  SettingsError,
  SettingsHeader,
  SettingsMain,
  SettingsPanel,
  useSectionDraft,
} from "@/components/settings/settings-kit";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  LabeledSelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_DECORATION_TYPES,
  DEFAULT_PRINT_LOCATIONS,
  resolvePrintLocationDecorationType,
  type DecorationTypeOption,
  type PrintLocationOption,
  type ShopProductionDefaults,
} from "@/lib/shop-settings";
import { cn } from "@/lib/utils";

function slugifyPrintLocationValue(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug ? `loc_${slug}` : `loc_${Date.now()}`;
}

function slugifyDecorationTypeValue(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || `dec_${Date.now()}`;
}

export function PrintLocationsSection() {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const { draft, setDraft, dirty } = useSectionDraft<ShopProductionDefaults>(
    settings.productionDefaults
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newLocation, setNewLocation] = useState("");
  const [newDecorationType, setNewDecorationType] = useState("");
  const [newLocationDecorationType, setNewLocationDecorationType] =
    useState("screen_print");

  const locations = draft.printLocations ?? [];
  const decorationTypes = draft.decorationTypes ?? [];

  const decorationTypeChoices = useMemo(() => {
    if (decorationTypes.length > 0) return decorationTypes;
    return DEFAULT_DECORATION_TYPES;
  }, [decorationTypes]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateSettings({ productionDefaults: draft });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save decoration locations"
      );
    } finally {
      setSaving(false);
    }
  };

  const addDecorationType = () => {
    const label = newDecorationType.trim();
    if (!label) return;

    const value = slugifyDecorationTypeValue(label);
    const exists = decorationTypeChoices.some(
      (entry) =>
        entry.label.toLowerCase() === label.toLowerCase() ||
        entry.value === value
    );
    if (exists) return;

    setDraft((current) => {
      const base =
        (current.decorationTypes?.length ?? 0) > 0
          ? [...(current.decorationTypes ?? [])]
          : DEFAULT_DECORATION_TYPES.map((item) => ({ ...item }));
      return {
        ...current,
        decorationTypes: [...base, { value, label } satisfies DecorationTypeOption],
      };
    });
    setNewDecorationType("");
  };

  const addLocation = () => {
    const label = newLocation.trim();
    if (!label) return;

    const value = slugifyPrintLocationValue(label);
    const exists = locations.some(
      (entry) =>
        entry.label.toLowerCase() === label.toLowerCase() ||
        entry.value === value
    );
    if (exists) return;

    const decorationType =
      newLocationDecorationType ||
      decorationTypeChoices[0]?.value ||
      "screen_print";

    setDraft((current) => ({
      ...current,
      printLocations: [
        ...(current.printLocations ?? []),
        {
          value,
          label,
          decorationType,
        } satisfies PrintLocationOption,
      ],
    }));
    setNewLocation("");
  };

  const moveLocation = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= locations.length) return;
    setDraft((current) => {
      const next = [...(current.printLocations ?? [])];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return { ...current, printLocations: next };
    });
  };

  const moveDecorationType = (index: number, direction: -1 | 1) => {
    const list =
      decorationTypes.length > 0
        ? decorationTypes
        : DEFAULT_DECORATION_TYPES.map((item) => ({ ...item }));
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= list.length) return;
    const next = [...list];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    setDraft((current) => ({ ...current, decorationTypes: next }));
  };

  const ensureDecorationTypesEditable = () => {
    if ((draft.decorationTypes?.length ?? 0) > 0) return;
    setDraft((current) => ({
      ...current,
      decorationTypes: DEFAULT_DECORATION_TYPES.map((item) => ({ ...item })),
    }));
  };

  const loadStarterLocations = () => {
    setDraft((current) => ({
      ...current,
      decorationTypes:
        (current.decorationTypes?.length ?? 0) > 0
          ? current.decorationTypes
          : DEFAULT_DECORATION_TYPES.map((item) => ({ ...item })),
      printLocations: DEFAULT_PRINT_LOCATIONS.map((item) => ({ ...item })),
    }));
  };

  // Keep Select value valid if types are edited away
  const safeNewLocationType = decorationTypeChoices.some(
    (entry) => entry.value === newLocationDecorationType
  )
    ? newLocationDecorationType
    : decorationTypeChoices[0]?.value ?? "screen_print";

  return (
    <SettingsMain>
      <SettingsHeader
        title="Decoration locations"
        description="Set the decoration methods your shop offers, then map each placement — neck label, left chest, full back — to the right method."
      >
        {isAdmin && (
          <SaveButton
            dirty={dirty}
            saving={saving}
            saved={saved}
            onSave={() => void handleSave()}
          />
        )}
      </SettingsHeader>

      {!isAdmin && <AdminLockNotice />}
      {error && <SettingsError message={error} />}

      <SettingsPanel
        title="Decoration types"
        description="Screen Print, Embroidery, DTF, or anything else you run. These power the method dropdown on each location and on orders."
        action={
          isAdmin && decorationTypes.length === 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  decorationTypes: DEFAULT_DECORATION_TYPES.map((item) => ({
                    ...item,
                  })),
                }))
              }
            >
              Load FloPilot defaults
            </Button>
          ) : null
        }
        bodyClassName="p-0"
      >
        {decorationTypeChoices.length === 0 ? (
          <div className="space-y-4 px-5 py-8 text-center">
            <p className="text-sm text-brand-muted">
              No decoration types yet. Add the methods your shop offers.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#ebebeb]">
            {decorationTypeChoices.map((type, index) => (
              <div
                key={type.value}
                className="flex items-center gap-2 px-4 py-3 sm:px-5"
              >
                <GripVertical className="size-4 shrink-0 text-[#d4d4d4]" />
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#f6f6f7] text-[11px] font-semibold tabular-nums text-[#8a8a8a]">
                  {index + 1}
                </span>
                <Input
                  value={type.label}
                  disabled={!isAdmin}
                  onChange={(event) => {
                    ensureDecorationTypesEditable();
                    setDraft((current) => {
                      const list =
                        (current.decorationTypes?.length ?? 0) > 0
                          ? [...(current.decorationTypes ?? [])]
                          : DEFAULT_DECORATION_TYPES.map((item) => ({
                              ...item,
                            }));
                      list[index] = {
                        ...list[index],
                        label: event.target.value,
                      };
                      return { ...current, decorationTypes: list };
                    });
                  }}
                  className="h-9 min-w-0 flex-1"
                  placeholder="Decoration type"
                />
                {isAdmin ? (
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveDecorationType(index, -1)}
                      className="rounded-md px-2 py-1 text-[12px] text-[#616161] hover:bg-[#f1f1f1] disabled:opacity-30"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      disabled={index === decorationTypeChoices.length - 1}
                      onClick={() => moveDecorationType(index, 1)}
                      className="rounded-md px-2 py-1 text-[12px] text-[#616161] hover:bg-[#f1f1f1] disabled:opacity-30"
                    >
                      Down
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        const list =
                          decorationTypes.length > 0
                            ? decorationTypes
                            : DEFAULT_DECORATION_TYPES.map((item) => ({
                                ...item,
                              }));
                        const removed = list[index]?.value;
                        const next = list.filter((_, i) => i !== index);
                        setDraft((current) => ({
                          ...current,
                          decorationTypes: next,
                          printLocations: (current.printLocations ?? []).map(
                            (location) =>
                              location.decorationType === removed
                                ? {
                                    ...location,
                                    decorationType:
                                      next[0]?.value ?? "screen_print",
                                  }
                                : location
                          ),
                        }));
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {isAdmin ? (
          <div className="border-t border-[#ebebeb] px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={newDecorationType}
                onChange={(event) => setNewDecorationType(event.target.value)}
                placeholder="e.g. Embroidery, DTF, Rhinestone"
                className="h-10"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addDecorationType();
                  }
                }}
              />
              <Button
                type="button"
                className="h-10 shrink-0 gap-1.5"
                onClick={addDecorationType}
                disabled={!newDecorationType.trim()}
              >
                <Plus className="size-3.5" />
                Add type
              </Button>
            </div>
          </div>
        ) : null}
      </SettingsPanel>

      <SettingsPanel
        title="Your locations"
        description="These appear when adding decoration events. Set the decoration type on the right so placements like Neck Label default to the right method."
        action={
          isAdmin && (
            <div className="flex flex-wrap gap-2">
              {locations.length === 0 ? (
                <Button variant="outline" size="sm" onClick={loadStarterLocations}>
                  Load FloPilot defaults
                </Button>
              ) : null}
            </div>
          )
        }
        bodyClassName="p-0"
      >
        {locations.length === 0 ? (
          <div className="space-y-4 px-5 py-8 text-center">
            <p className="text-sm text-brand-muted">
              No decoration locations yet. Add your own names or load the
              FloPilot starter list.
            </p>
            {isAdmin ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadStarterLocations}
                >
                  Load FloPilot defaults
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div className="hidden items-center gap-2 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a] sm:flex sm:px-5">
              <span className="w-10" />
              <span className="min-w-0 flex-1">Location</span>
              <span className="w-[180px] shrink-0">Decoration type</span>
              <span className="w-[112px] shrink-0" />
            </div>
            <div className="divide-y divide-[#ebebeb]">
              {locations.map((location, index) => {
                const typeValue = resolvePrintLocationDecorationType(location);
                const selectValue = decorationTypeChoices.some(
                  (entry) => entry.value === typeValue
                )
                  ? typeValue
                  : decorationTypeChoices[0]?.value ?? "screen_print";

                return (
                  <div
                    key={location.value}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-2 sm:px-5"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <GripVertical className="size-4 shrink-0 text-[#d4d4d4]" />
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#f6f6f7] text-[11px] font-semibold tabular-nums text-[#8a8a8a]">
                        {index + 1}
                      </span>
                      <Input
                        value={location.label}
                        disabled={!isAdmin}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            printLocations: (current.printLocations ?? []).map(
                              (entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, label: event.target.value }
                                  : entry
                            ),
                          }))
                        }
                        className="h-9 min-w-0 flex-1"
                        placeholder="Location name"
                      />
                    </div>

                    <div className="flex items-center gap-2 sm:contents">
                      <div className="min-w-0 flex-1 sm:w-[180px] sm:flex-none">
                        <Select
                          value={selectValue}
                          disabled={!isAdmin}
                          onValueChange={(value) => {
                            if (!value) return;
                            setDraft((current) => ({
                              ...current,
                              printLocations: (current.printLocations ?? []).map(
                                (entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, decorationType: value }
                                    : entry
                              ),
                            }));
                          }}
                        >
                          <SelectTrigger className="h-9 w-full rounded-lg border-[#e3e3e3] bg-white text-xs">
                            <LabeledSelectValue
                              value={selectValue}
                              options={decorationTypeChoices}
                              placeholder="Decoration type"
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {decorationTypeChoices.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {isAdmin ? (
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveLocation(index, -1)}
                            className="rounded-md px-2 py-1 text-[12px] text-[#616161] hover:bg-[#f1f1f1] disabled:opacity-30"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            disabled={index === locations.length - 1}
                            onClick={() => moveLocation(index, 1)}
                            className="rounded-md px-2 py-1 text-[12px] text-[#616161] hover:bg-[#f1f1f1] disabled:opacity-30"
                          >
                            Down
                          </button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setDraft((current) => ({
                                ...current,
                                printLocations: (
                                  current.printLocations ?? []
                                ).filter(
                                  (_, entryIndex) => entryIndex !== index
                                ),
                              }))
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </SettingsPanel>

      {isAdmin ? (
        <SettingsPanel
          title="Add a location"
          description="Use the names your team already uses on the floor — left pocket, back yoke, cap front, etc."
        >
          <div className="flex flex-col gap-2 lg:flex-row">
            <Input
              value={newLocation}
              onChange={(event) => setNewLocation(event.target.value)}
              placeholder="e.g. Neck label, Left chest pocket"
              className="h-10 min-w-0 flex-1"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addLocation();
                }
              }}
            />
            <Select
              value={safeNewLocationType}
              onValueChange={(value) => {
                if (value) setNewLocationDecorationType(value);
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-lg border-[#e3e3e3] bg-white lg:w-[200px]">
                <LabeledSelectValue
                  value={safeNewLocationType}
                  options={decorationTypeChoices}
                  placeholder="Decoration type"
                />
              </SelectTrigger>
              <SelectContent>
                {decorationTypeChoices.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              className={cn("h-10 shrink-0 gap-1.5")}
              onClick={addLocation}
              disabled={!newLocation.trim()}
            >
              <Plus className="size-3.5" />
              Add location
            </Button>
          </div>
        </SettingsPanel>
      ) : null}
    </SettingsMain>
  );
}
