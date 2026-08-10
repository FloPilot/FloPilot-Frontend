"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  AdminLockNotice,
  DecorationMethodOffNotice,
  SaveButton,
  SettingsError,
  SettingsHeader,
  SettingsMain,
  SettingsPanel,
  useRegisterSectionUnsavedChanges,
  useSectionDraft,
} from "@/components/settings/settings-kit";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEFAULT_EMBROIDERY_BACKING_TYPES,
  isDecorationMethodEnabled,
  STARTER_EMBROIDERY_HOOP_SIZES,
  type ShopProductionDefaults,
} from "@/lib/shop-settings";

function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function EmbroiderySection() {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const { draft, setDraft, dirty, discard } = useSectionDraft<ShopProductionDefaults>(
    settings.productionDefaults
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newBackingType, setNewBackingType] = useState("");

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
        err instanceof Error ? err.message : "Could not save embroidery setup"
      );
    } finally {
      setSaving(false);
    }
  };

  useRegisterSectionUnsavedChanges({
    dirty,
    saving,
    enabled: isAdmin,
    label: "Unsaved embroidery",
    onSave: () => handleSave(),
    onDiscard: discard,
    id: "settings-embroidery",
  });

  const addHoop = () => {
    setDraft((current) => ({
      ...current,
      embroideryHoopSizes: [
        ...(current.embroideryHoopSizes ?? []),
        {
          id: newId("hoop"),
          label: "",
          widthIn: 4,
          heightIn: 4,
          notes: "",
        },
      ],
    }));
  };

  const addBackingType = () => {
    const label = newBackingType.trim();
    if (!label) return;
    const value = `custom-${label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}`;
    const existing = [
      ...DEFAULT_EMBROIDERY_BACKING_TYPES,
      ...(draft.embroideryBackingTypes ?? []),
    ].some((option) => option.label.toLowerCase() === label.toLowerCase());
    if (existing) return;
    setDraft((current) => ({
      ...current,
      embroideryBackingTypes: [
        ...(current.embroideryBackingTypes ?? []),
        { value, label },
      ],
    }));
    setNewBackingType("");
  };

  return (
    <SettingsMain>
      <SettingsHeader
        title="Embroidery setup"
        description="Define hoop sizes and backing types your team picks from on embroidery orders."
      >
        {isAdmin ? (
          <SaveButton
            headerBar
            dirty={dirty}
            saving={saving}
            saved={saved}
            onSave={() => void handleSave()}
          />
        ) : null}
      </SettingsHeader>

      {!isAdmin ? <AdminLockNotice /> : null}
      {error ? <SettingsError message={error} /> : null}
      {!isDecorationMethodEnabled(settings, "embroidery") ? (
        <DecorationMethodOffNotice methodLabel="Embroidery" />
      ) : null}

      <SettingsPanel
        title="Hoop sizes"
        description="Common hoop dimensions for left chest, jackets, hats, and large fronts."
        action={
          isAdmin ? (
            <div className="flex gap-2">
              {(draft.embroideryHoopSizes ?? []).length === 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      embroideryHoopSizes: STARTER_EMBROIDERY_HOOP_SIZES.map(
                        (item) => ({ ...item })
                      ),
                    }))
                  }
                >
                  Load common sizes
                </Button>
              ) : null}
              <Button size="sm" onClick={addHoop}>
                <Plus className="size-3.5" />
                Add hoop
              </Button>
            </div>
          ) : null
        }
        bodyClassName="p-0"
      >
        {(draft.embroideryHoopSizes ?? []).length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-brand-muted">
            No hoop sizes yet. Load common presets or add your own.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#ebebeb] hover:bg-transparent">
                  <TableHead className="h-9 bg-[#fafafa] pl-5 text-[12px] font-medium text-[#616161]">
                    Label
                  </TableHead>
                  <TableHead className="h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                    Width (in)
                  </TableHead>
                  <TableHead className="h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                    Height (in)
                  </TableHead>
                  <TableHead className="h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                    Notes
                  </TableHead>
                  {isAdmin ? (
                    <TableHead className="h-9 w-12 bg-[#fafafa] pr-5" />
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(draft.embroideryHoopSizes ?? []).map((row, index) => (
                  <TableRow key={row.id} className="border-[#ebebeb]">
                    <TableCell className="pl-5">
                      <Input
                        value={row.label}
                        disabled={!isAdmin}
                        placeholder={`${row.widthIn} × ${row.heightIn}`}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            embroideryHoopSizes: (
                              current.embroideryHoopSizes ?? []
                            ).map((item, i) =>
                              i === index
                                ? { ...item, label: event.target.value }
                                : item
                            ),
                          }))
                        }
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0.5}
                        step={0.5}
                        disabled={!isAdmin}
                        value={row.widthIn}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            embroideryHoopSizes: (
                              current.embroideryHoopSizes ?? []
                            ).map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    widthIn: Number(event.target.value) || 0,
                                  }
                                : item
                            ),
                          }))
                        }
                        className="h-9 w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0.5}
                        step={0.5}
                        disabled={!isAdmin}
                        value={row.heightIn}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            embroideryHoopSizes: (
                              current.embroideryHoopSizes ?? []
                            ).map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    heightIn: Number(event.target.value) || 0,
                                  }
                                : item
                            ),
                          }))
                        }
                        className="h-9 w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.notes}
                        disabled={!isAdmin}
                        placeholder="Optional"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            embroideryHoopSizes: (
                              current.embroideryHoopSizes ?? []
                            ).map((item, i) =>
                              i === index
                                ? { ...item, notes: event.target.value }
                                : item
                            ),
                          }))
                        }
                        className="h-9"
                      />
                    </TableCell>
                    {isAdmin ? (
                      <TableCell className="pr-5 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-[#616161] hover:text-destructive"
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              embroideryHoopSizes: (
                                current.embroideryHoopSizes ?? []
                              ).filter((_, i) => i !== index),
                            }))
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SettingsPanel>

      <SettingsPanel
        title="Backing types"
        description="Built-in cutaway / tearaway / washaway, plus any custom backing your shop uses."
      >
        <ul className="mb-4 space-y-1.5 text-[13px] text-[#616161]">
          {DEFAULT_EMBROIDERY_BACKING_TYPES.map((option) => (
            <li key={option.value} className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[#c9c9c9]" />
              {option.label}
              <span className="text-[11px] text-[#8a8a8a]">(built-in)</span>
            </li>
          ))}
          {(draft.embroideryBackingTypes ?? []).map((option) => (
            <li
              key={option.value}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-brand-primary" />
                {option.label}
              </span>
              {isAdmin ? (
                <button
                  type="button"
                  className="text-[12px] text-[#8a8a8a] hover:text-destructive"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      embroideryBackingTypes: (
                        current.embroideryBackingTypes ?? []
                      ).filter((entry) => entry.value !== option.value),
                    }))
                  }
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {isAdmin ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newBackingType}
              onChange={(event) => setNewBackingType(event.target.value)}
              placeholder="e.g. Cap backing, Specialty fusible"
              className="h-10"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addBackingType();
                }
              }}
            />
            <Button
              type="button"
              className="h-10 shrink-0 gap-1.5"
              onClick={addBackingType}
              disabled={!newBackingType.trim()}
            >
              <Plus className="size-3.5" />
              Add backing
            </Button>
          </div>
        ) : null}
      </SettingsPanel>
    </SettingsMain>
  );
}
