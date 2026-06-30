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
  DEFAULT_DTF_TRANSFER_TYPES,
  STARTER_DTF_IMPRINT_AREAS,
  type ShopProductionDefaults,
} from "@/lib/shop-settings";

function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function DtfSection() {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const { draft, setDraft, dirty } = useSectionDraft<ShopProductionDefaults>(
    settings.productionDefaults
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTransferType, setNewTransferType] = useState("");

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
        err instanceof Error ? err.message : "Could not save DTF setup"
      );
    } finally {
      setSaving(false);
    }
  };

  const addImprintArea = () => {
    setDraft((current) => ({
      ...current,
      dtfImprintAreas: [
        ...(current.dtfImprintAreas ?? []),
        {
          id: newId("dtf"),
          label: "",
          widthIn: 5,
          heightIn: 5,
          notes: "",
        },
      ],
    }));
  };

  const addTransferType = () => {
    const label = newTransferType.trim();
    if (!label) return;
    const value = `custom-${label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}`;
    const existing = [
      ...DEFAULT_DTF_TRANSFER_TYPES,
      ...(draft.dtfTransferTypes ?? []),
    ].some((option) => option.label.toLowerCase() === label.toLowerCase());
    if (existing) return;
    setDraft((current) => ({
      ...current,
      dtfTransferTypes: [
        ...(current.dtfTransferTypes ?? []),
        { value, label },
      ],
    }));
    setNewTransferType("");
  };

  return (
    <SettingsMain>
      <SettingsHeader
        title="DTF setup"
        description="Define imprint areas your team picks from on DTF orders. Pricing tiers live in the pricing matrix — these sizes match those columns."
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
        title="Imprint areas"
        description="Transfer sizes available on the proofs tab for DTF decoration (e.g. 5 × 5 chest, 12 × 18 full back)."
        action={
          isAdmin && (
            <div className="flex gap-2">
              {(draft.dtfImprintAreas ?? []).length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      dtfImprintAreas: STARTER_DTF_IMPRINT_AREAS.map(
                        (item) => ({ ...item })
                      ),
                    }))
                  }
                >
                  Load common sizes
                </Button>
              )}
              <Button size="sm" onClick={addImprintArea}>
                <Plus className="size-3.5" />
                Add area
              </Button>
            </div>
          )
        }
        bodyClassName="p-0"
      >
        {(draft.dtfImprintAreas ?? []).length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-brand-muted">
            No imprint areas yet. Load common presets or add your own.
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
                {(draft.dtfImprintAreas ?? []).map((row, index) => (
                  <TableRow key={row.id} className="border-[#ebebeb]">
                    <TableCell className="pl-5">
                      <Input
                        value={row.label}
                        disabled={!isAdmin}
                        placeholder={`${row.widthIn} × ${row.heightIn}`}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            dtfImprintAreas: (
                              current.dtfImprintAreas ?? []
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
                            dtfImprintAreas: (
                              current.dtfImprintAreas ?? []
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
                            dtfImprintAreas: (
                              current.dtfImprintAreas ?? []
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
                            dtfImprintAreas: (
                              current.dtfImprintAreas ?? []
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
                    {isAdmin && (
                      <TableCell className="pr-5 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-[#616161] hover:text-destructive"
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              dtfImprintAreas: (
                                current.dtfImprintAreas ?? []
                              ).filter((_, i) => i !== index),
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
        title="Transfer types"
        description="Cold peel and hot peel are included. Add custom peel types your team uses on the floor."
      >
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_DTF_TRANSFER_TYPES.map((option) => (
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
          {(draft.dtfTransferTypes ?? []).map((option) => (
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
                      dtfTransferTypes: (current.dtfTransferTypes ?? []).filter(
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
              value={newTransferType}
              placeholder="e.g. Warm peel"
              onChange={(event) => setNewTransferType(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTransferType();
                }
              }}
              className="h-9"
            />
            <Button variant="outline" onClick={addTransferType}>
              Add
            </Button>
          </div>
        )}
      </SettingsPanel>
    </SettingsMain>
  );
}
