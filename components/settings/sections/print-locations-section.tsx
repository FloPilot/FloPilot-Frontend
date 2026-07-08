"use client";

import { useState } from "react";
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
  DEFAULT_PRINT_LOCATIONS,
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

export function PrintLocationsSection() {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const { draft, setDraft, dirty } = useSectionDraft<ShopProductionDefaults>(
    settings.productionDefaults
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newLocation, setNewLocation] = useState("");

  const locations = draft.printLocations ?? [];

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
        err instanceof Error ? err.message : "Could not save print locations"
      );
    } finally {
      setSaving(false);
    }
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

    setDraft((current) => ({
      ...current,
      printLocations: [
        ...(current.printLocations ?? []),
        { value, label } satisfies PrintLocationOption,
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

  return (
    <SettingsMain>
      <SettingsHeader
        title="Print locations"
        description="Define the decoration placements your team picks when adding events to orders — front chest, sleeve, pocket, and anything custom for your shop."
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
        title="Your locations"
        description="These appear in the placement dropdown when creating or editing decoration events. Reorder them to match how your team thinks about the floor."
        action={
          isAdmin && (
            <div className="flex flex-wrap gap-2">
              {locations.length === 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      printLocations: DEFAULT_PRINT_LOCATIONS.map((item) => ({
                        ...item,
                      })),
                    }))
                  }
                >
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
              No print locations yet. Add your own names or load the FloPilot
              starter list.
            </p>
            {isAdmin ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      printLocations: DEFAULT_PRINT_LOCATIONS.map((item) => ({
                        ...item,
                      })),
                    }))
                  }
                >
                  Load FloPilot defaults
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-[#ebebeb]">
            {locations.map((location, index) => (
              <div
                key={location.value}
                className="flex items-center gap-2 px-4 py-3 sm:px-5"
              >
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
                {isAdmin ? (
                  <div className="flex items-center gap-0.5">
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
                          printLocations: (current.printLocations ?? []).filter(
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
            ))}
          </div>
        )}
      </SettingsPanel>

      {isAdmin ? (
        <SettingsPanel
          title="Add a location"
          description="Use the names your team already uses on the floor — left pocket, back yoke, cap front, etc."
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newLocation}
              onChange={(event) => setNewLocation(event.target.value)}
              placeholder="e.g. Left chest pocket"
              className="h-10"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addLocation();
                }
              }}
            />
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
