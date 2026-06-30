"use client";

import { useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEFAULT_INK_TYPE_OPTIONS,
  DEFAULT_SQUEEGEE_OPTIONS,
  STARTER_MESH_PRESETS,
  STARTER_SCREEN_SIZES,
  type ShopProductionDefaults,
} from "@/lib/shop-settings";
import { cn } from "@/lib/utils";

function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ScreenPrintSection() {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const { draft, setDraft, dirty } = useSectionDraft<ShopProductionDefaults>(
    settings.productionDefaults
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newSqueegee, setNewSqueegee] = useState("");
  const [newInkType, setNewInkType] = useState("");

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
        err instanceof Error ? err.message : "Could not save screen print setup"
      );
    } finally {
      setSaving(false);
    }
  };

  const addSqueegee = () => {
    const label = newSqueegee.trim();
    if (!label) return;
    const value = `custom-${label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}`;
    const existing = [
      ...DEFAULT_SQUEEGEE_OPTIONS,
      ...(draft.squeegeeOptions ?? []),
    ].some((o) => o.label.toLowerCase() === label.toLowerCase());
    if (existing) return;
    setDraft((current) => ({
      ...current,
      squeegeeOptions: [...(current.squeegeeOptions ?? []), { value, label }],
    }));
    setNewSqueegee("");
  };

  const addInkType = () => {
    const label = newInkType.trim();
    if (!label) return;
    const value = `custom-${label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}`;
    const existing = [
      ...DEFAULT_INK_TYPE_OPTIONS,
      ...(draft.inkTypes ?? []),
    ].some((o) => o.label.toLowerCase() === label.toLowerCase());
    if (existing) return;
    setDraft((current) => ({
      ...current,
      inkTypes: [...(current.inkTypes ?? []), { value, label }],
    }));
    setNewInkType("");
  };

  const addScreenSize = () => {
    setDraft((current) => ({
      ...current,
      screenSizes: [
        ...(current.screenSizes ?? []),
        {
          id: newId("screen"),
          label: "",
          widthIn: 23,
          heightIn: 31,
          notes: "",
        },
      ],
    }));
  };

  const addMeshPreset = () => {
    setDraft((current) => ({
      ...current,
      meshPresets: [
        ...(current.meshPresets ?? []),
        { mesh: 156, label: "", notes: "" },
      ],
    }));
  };

  return (
    <SettingsMain>
      <SettingsHeader
        title="Screen print setup"
        description="Define the screen sizes, mesh counts, squeegees, and ink types your team picks from on orders."
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
        title="Screen sizes"
        description="Frame sizes available when burning screens and planning production."
        action={
          isAdmin && (
            <div className="flex gap-2">
              {(draft.screenSizes ?? []).length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      screenSizes: STARTER_SCREEN_SIZES.map((item) => ({
                        ...item,
                      })),
                    }))
                  }
                >
                  Load common sizes
                </Button>
              )}
              <Button size="sm" onClick={addScreenSize}>
                <Plus className="size-3.5" />
                Add size
              </Button>
            </div>
          )
        }
        bodyClassName="p-0"
      >
        {(draft.screenSizes ?? []).length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-brand-muted">
            No screen sizes yet. Load common presets or add your own.
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
                  {isAdmin && (
                    <TableHead className="h-9 w-12 bg-[#fafafa] pr-5" />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(draft.screenSizes ?? []).map((row, index) => (
                  <TableRow key={row.id} className="border-[#ebebeb]">
                    <TableCell className="pl-5">
                      <Input
                        value={row.label}
                        disabled={!isAdmin}
                        placeholder={`${row.widthIn} × ${row.heightIn}`}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            screenSizes: (current.screenSizes ?? []).map((item, i) =>
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
                        min={1}
                        step={0.5}
                        disabled={!isAdmin}
                        value={row.widthIn}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            screenSizes: (current.screenSizes ?? []).map((item, i) =>
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
                        min={1}
                        step={0.5}
                        disabled={!isAdmin}
                        value={row.heightIn}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            screenSizes: (current.screenSizes ?? []).map((item, i) =>
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
                            screenSizes: (current.screenSizes ?? []).map((item, i) =>
                              i === index
                                ? { ...item, notes: event.target.value }
                                : item
                            ),
                          }))
                        }
                        className="h-9"
                      />
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="pr-5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              screenSizes: (current.screenSizes ?? []).filter(
                                (_, i) => i !== index
                              ),
                            }))
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SettingsPanel>

      <SettingsPanel
        title="Mesh presets"
        description="Common mesh counts for underbases, spot colors, and halftones."
        action={
          isAdmin && (
            <div className="flex gap-2">
              {(draft.meshPresets ?? []).length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      meshPresets: STARTER_MESH_PRESETS.map((item) => ({
                        ...item,
                      })),
                    }))
                  }
                >
                  Load common mesh
                </Button>
              )}
              <Button size="sm" onClick={addMeshPreset}>
                <Plus className="size-3.5" />
                Add mesh
              </Button>
            </div>
          )
        }
        bodyClassName="p-0"
      >
        {(draft.meshPresets ?? []).length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-brand-muted">
            No mesh presets yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#ebebeb] hover:bg-transparent">
                  <TableHead className="h-9 bg-[#fafafa] pl-5 text-[12px] font-medium text-[#616161]">
                    Mesh
                  </TableHead>
                  <TableHead className="h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                    Label
                  </TableHead>
                  <TableHead className="h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                    Notes
                  </TableHead>
                  {isAdmin && (
                    <TableHead className="h-9 w-12 bg-[#fafafa] pr-5" />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(draft.meshPresets ?? []).map((row, index) => (
                  <TableRow key={`${row.mesh}-${index}`} className="border-[#ebebeb]">
                    <TableCell className="pl-5">
                      <Input
                        type="number"
                        min={20}
                        max={500}
                        disabled={!isAdmin}
                        value={row.mesh}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            meshPresets: (current.meshPresets ?? []).map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    mesh: Number(event.target.value) || 0,
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
                        value={row.label}
                        disabled={!isAdmin}
                        placeholder={`${row.mesh} mesh`}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            meshPresets: (current.meshPresets ?? []).map((item, i) =>
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
                        value={row.notes}
                        disabled={!isAdmin}
                        placeholder="Optional"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            meshPresets: (current.meshPresets ?? []).map((item, i) =>
                              i === index
                                ? { ...item, notes: event.target.value }
                                : item
                            ),
                          }))
                        }
                        className="h-9"
                      />
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="pr-5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              meshPresets: (current.meshPresets ?? []).filter(
                                (_, i) => i !== index
                              ),
                            }))
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SettingsPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsPanel
          title="Squeegee types"
          description="Soft, medium, and hard are included. Add custom durometers or blade types."
        >
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_SQUEEGEE_OPTIONS.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#e3e3e3] bg-[#fafafa] px-2.5 py-1 text-[12px] font-medium text-[#616161]"
              >
                <span className="size-1.5 rounded-full bg-current opacity-50" />
                {option.label}
                <span className="text-[10px] uppercase tracking-wide opacity-60">
                  Built-in
                </span>
              </span>
            ))}
            {(draft.squeegeeOptions ?? []).map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1.5 rounded-md border border-violet-100 bg-violet-50 px-2.5 py-1 text-[12px] font-medium text-violet-700"
              >
                <span className="size-1.5 rounded-full bg-current opacity-70" />
                {option.label}
                {isAdmin && (
                  <button
                    type="button"
                    className="ml-0.5 rounded p-0.5 hover:bg-violet-100"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        squeegeeOptions: (current.squeegeeOptions ?? []).filter(
                          (item) => item.value !== option.value
                        ),
                      }))
                    }
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
          {isAdmin && (
            <div className="mt-4 flex gap-2">
              <Input
                value={newSqueegee}
                placeholder="e.g. 70 durometer"
                onChange={(event) => setNewSqueegee(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSqueegee();
                  }
                }}
                className="h-9"
              />
              <Button variant="outline" onClick={addSqueegee}>
                Add
              </Button>
            </div>
          )}
        </SettingsPanel>

        <SettingsPanel
          title="Ink types"
          description="Built-in ink systems plus any custom types your shop uses."
        >
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_INK_TYPE_OPTIONS.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#e3e3e3] bg-[#fafafa] px-2.5 py-1 text-[12px] font-medium text-[#616161]"
              >
                <span className="size-1.5 rounded-full bg-current opacity-50" />
                {option.label}
                <span className="text-[10px] uppercase tracking-wide opacity-60">
                  Built-in
                </span>
              </span>
            ))}
            {(draft.inkTypes ?? []).map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1.5 rounded-md border border-sky-100 bg-sky-50 px-2.5 py-1 text-[12px] font-medium text-sky-700"
              >
                <span className="size-1.5 rounded-full bg-current opacity-70" />
                {option.label}
                {isAdmin && (
                  <button
                    type="button"
                    className="ml-0.5 rounded p-0.5 hover:bg-sky-100"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        inkTypes: (current.inkTypes ?? []).filter(
                          (item) => item.value !== option.value
                        ),
                      }))
                    }
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
          {isAdmin && (
            <div className="mt-4 flex gap-2">
              <Input
                value={newInkType}
                placeholder="e.g. High-opacity plastisol"
                onChange={(event) => setNewInkType(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addInkType();
                  }
                }}
                className="h-9"
              />
              <Button variant="outline" onClick={addInkType}>
                Add
              </Button>
            </div>
          )}
        </SettingsPanel>
      </div>

      {isAdmin && dirty && (
        <div className="flex justify-end">
          <SaveButton
            dirty={dirty}
            saving={saving}
            saved={saved}
            onSave={() => void handleSave()}
          />
        </div>
      )}
    </SettingsMain>
  );
}
