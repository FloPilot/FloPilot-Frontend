"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
  DEFAULT_DESIGN_PLACEMENT_PRESETS,
  getPrintLocationOptions,
  type DesignPlacementPreset,
  type ShopProductionDefaults,
} from "@/lib/shop-settings";
import { cn } from "@/lib/utils";

function createPresetId(): string {
  return `placement-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function DesignPlacementsSection() {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const { draft, setDraft, dirty } = useSectionDraft<ShopProductionDefaults>(
    settings.productionDefaults
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locationOptions = useMemo(
    () => getPrintLocationOptions(settings.productionDefaults),
    [settings.productionDefaults]
  );

  const presets =
    draft.designPlacementPresets && draft.designPlacementPresets.length > 0
      ? draft.designPlacementPresets
      : DEFAULT_DESIGN_PLACEMENT_PRESETS;

  const updatePresets = (next: DesignPlacementPreset[]) => {
    setDraft((current) => ({
      ...current,
      designPlacementPresets: next,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateSettings({
        productionDefaults: {
          ...draft,
          designPlacementPresets: presets,
        },
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save design placements"
      );
    } finally {
      setSaving(false);
    }
  };

  const addPreset = () => {
    const unused = locationOptions.find(
      (option) => !presets.some((preset) => preset.locationKey === option.value)
    );
    const location = unused ?? locationOptions[0];
    if (!location) return;
    updatePresets([
      ...presets,
      {
        id: createPresetId(),
        locationKey: location.value,
        label: location.label,
        x: 32,
        y: 28,
        width: 36,
        height: 24,
        maxPrintWidthIn: 10,
        maxPrintHeightIn: 10,
        enabled: true,
      },
    ]);
  };

  const resetDefaults = () => {
    updatePresets(DEFAULT_DESIGN_PLACEMENT_PRESETS.map((preset) => ({ ...preset })));
  };

  return (
    <SettingsMain>
      <SettingsHeader
        title="Design placements"
        description="Default art boxes for the order Design editor — left chest, full front, back, and more. Staff can still nudge artwork per mockup."
      >
        {isAdmin ? (
          <SaveButton
            dirty={dirty}
            saving={saving}
            saved={saved}
            onSave={() => void handleSave()}
          />
        ) : null}
      </SettingsHeader>

      {!isAdmin ? <AdminLockNotice /> : null}
      {error ? <SettingsError message={error} /> : null}

      <SettingsPanel
        title="Placement presets"
        description="Each preset maps a decoration location to a default size and position on the blank."
      >
        <div className="space-y-3">
          {presets.map((preset, index) => (
            <div
              key={preset.id}
              className="rounded-lg border border-[#ebebeb] bg-white p-4"
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Label
                  </label>
                  <Input
                    value={preset.label}
                    disabled={!isAdmin}
                    onChange={(event) => {
                      const next = [...presets];
                      next[index] = { ...preset, label: event.target.value };
                      updatePresets(next);
                    }}
                    className="h-9 rounded-lg border-[#e3e3e3]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Location
                  </label>
                  <Select
                    value={preset.locationKey}
                    disabled={!isAdmin}
                    onValueChange={(value) => {
                      if (!value) return;
                      const match = locationOptions.find(
                        (option) => option.value === value
                      );
                      const next = [...presets];
                      next[index] = {
                        ...preset,
                        locationKey: value,
                        label: match?.label ?? preset.label,
                      };
                      updatePresets(next);
                    }}
                  >
                    <SelectTrigger className="h-9 w-full justify-between rounded-lg border-[#e3e3e3]">
                      <LabeledSelectValue
                        value={preset.locationKey}
                        options={locationOptions.map((option) => ({
                          value: option.value,
                          label: option.label,
                        }))}
                        placeholder="Select location"
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end justify-end gap-2">
                  <label className="mb-2 flex items-center gap-2 text-[12px] text-[#616161]">
                    <input
                      type="checkbox"
                      checked={preset.enabled !== false}
                      disabled={!isAdmin}
                      onChange={(event) => {
                        const next = [...presets];
                        next[index] = {
                          ...preset,
                          enabled: event.target.checked,
                        };
                        updatePresets(next);
                      }}
                      className="size-4 rounded border-[#c9c9c9]"
                    />
                    Enabled
                  </label>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() =>
                        updatePresets(presets.filter((entry) => entry.id !== preset.id))
                      }
                      className="mb-1 rounded-lg p-2 text-[#8a8a8a] hover:bg-[#fff1f1] hover:text-[#8f1f1f]"
                      aria-label="Remove placement"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                {(
                  [
                    ["x", "Left %"],
                    ["y", "Top %"],
                    ["width", "Width %"],
                    ["height", "Height %"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      {label}
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      disabled={!isAdmin}
                      value={preset[key]}
                      onChange={(event) => {
                        const next = [...presets];
                        next[index] = {
                          ...preset,
                          [key]: Number(event.target.value) || 0,
                        };
                        updatePresets(next);
                      }}
                      className="h-9 rounded-lg border-[#e3e3e3]"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Max width (in)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    disabled={!isAdmin}
                    value={preset.maxPrintWidthIn ?? ""}
                    onChange={(event) => {
                      const next = [...presets];
                      next[index] = {
                        ...preset,
                        maxPrintWidthIn: event.target.value
                          ? Number(event.target.value)
                          : undefined,
                      };
                      updatePresets(next);
                    }}
                    className="h-9 rounded-lg border-[#e3e3e3]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Max height (in)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    disabled={!isAdmin}
                    value={preset.maxPrintHeightIn ?? ""}
                    onChange={(event) => {
                      const next = [...presets];
                      next[index] = {
                        ...preset,
                        maxPrintHeightIn: event.target.value
                          ? Number(event.target.value)
                          : undefined,
                      };
                      updatePresets(next);
                    }}
                    className="h-9 rounded-lg border-[#e3e3e3]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {isAdmin ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn("h-9 rounded-lg")}
              onClick={addPreset}
            >
              <Plus className="size-3.5" />
              Add placement
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-lg"
              onClick={resetDefaults}
            >
              Reset to defaults
            </Button>
          </div>
        ) : null}
      </SettingsPanel>
    </SettingsMain>
  );
}
