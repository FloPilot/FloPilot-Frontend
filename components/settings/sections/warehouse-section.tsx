"use client";

import { useMemo, useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
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
  STARTER_FINISHING_STEPS,
  type FinishingStepPreset,
  type ShopProductionDefaults,
  type ShopWarehouse,
} from "@/lib/shop-settings";
import { cn } from "@/lib/utils";

function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type WarehouseDraft = {
  warehouses: ShopWarehouse[];
  finishingSteps: FinishingStepPreset[];
};

export function WarehouseSection() {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const initial = useMemo<WarehouseDraft>(
    () => ({
      warehouses: settings.warehouses ?? [],
      finishingSteps: settings.productionDefaults.finishingSteps ?? [],
    }),
    [settings.warehouses, settings.productionDefaults.finishingSteps]
  );
  const { draft, setDraft, dirty } = useSectionDraft<WarehouseDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const productionDefaults: ShopProductionDefaults = {
        ...settings.productionDefaults,
        finishingSteps: draft.finishingSteps,
      };
      await updateSettings({
        warehouses: draft.warehouses,
        productionDefaults,
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save warehouse setup"
      );
    } finally {
      setSaving(false);
    }
  };

  const addWarehouse = () => {
    setDraft((current) => ({
      ...current,
      warehouses: [
        ...current.warehouses,
        {
          id: newId("warehouse"),
          name: "",
          code: "",
          description: "",
          isDefault: current.warehouses.length === 0,
        },
      ],
    }));
  };

  const setDefaultWarehouse = (id: string) => {
    setDraft((current) => ({
      ...current,
      warehouses: current.warehouses.map((w) => ({
        ...w,
        isDefault: w.id === id,
      })),
    }));
  };

  const addFinishingStep = () => {
    setDraft((current) => ({
      ...current,
      finishingSteps: [
        ...current.finishingSteps,
        {
          id: newId("finishing"),
          name: "",
          description: "",
          enabled: true,
        },
      ],
    }));
  };

  return (
    <SettingsMain>
      <SettingsHeader
        title="Warehouse & finishing"
        description="Set up storage locations for inventory and the finishing steps your team runs after production."
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
        title="Warehouses & locations"
        description="Used when receiving inventory and creating purchase orders. The default location is pre-selected."
        action={
          isAdmin && (
            <Button size="sm" onClick={addWarehouse}>
              <Plus className="size-3.5" />
              Add location
            </Button>
          )
        }
        bodyClassName="p-0"
      >
        {draft.warehouses.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-brand-ink">No locations yet</p>
            <p className="mt-1 text-sm text-brand-muted">
              Add your main warehouse or stockroom to use in inventory.
            </p>
            {isAdmin && (
              <Button className="mt-4" size="sm" onClick={addWarehouse}>
                <Plus className="size-3.5" />
                Add location
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="border-[#ebebeb] hover:bg-transparent">
                  <TableHead className="h-9 bg-[#fafafa] pl-5 text-[12px] font-medium text-[#616161]">
                    Name
                  </TableHead>
                  <TableHead className="h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                    Code
                  </TableHead>
                  <TableHead className="h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                    Description
                  </TableHead>
                  <TableHead className="h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                    Default
                  </TableHead>
                  {isAdmin && (
                    <TableHead className="h-9 w-12 bg-[#fafafa] pr-5" />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.warehouses.map((row, index) => (
                  <TableRow key={row.id} className="border-[#ebebeb]">
                    <TableCell className="pl-5">
                      <Input
                        value={row.name}
                        disabled={!isAdmin}
                        placeholder="Main warehouse"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            warehouses: current.warehouses.map((item, i) =>
                              i === index
                                ? { ...item, name: event.target.value }
                                : item
                            ),
                          }))
                        }
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.code}
                        disabled={!isAdmin}
                        placeholder="MAIN"
                        maxLength={12}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            warehouses: current.warehouses.map((item, i) =>
                              i === index
                                ? { ...item, code: event.target.value.toUpperCase() }
                                : item
                            ),
                          }))
                        }
                        className="h-9 w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.description}
                        disabled={!isAdmin}
                        placeholder="Optional notes"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            warehouses: current.warehouses.map((item, i) =>
                              i === index
                                ? { ...item, description: event.target.value }
                                : item
                            ),
                          }))
                        }
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => setDefaultWarehouse(row.id)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                          row.isDefault
                            ? "border-amber-100 bg-amber-50 text-amber-700"
                            : "border-[#e3e3e3] bg-white text-[#616161] hover:bg-[#fafafa]"
                        )}
                      >
                        <Star
                          className={cn(
                            "size-3",
                            row.isDefault ? "fill-current" : "opacity-40"
                          )}
                        />
                        {row.isDefault ? "Default" : "Set default"}
                      </button>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="pr-5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            setDraft((current) => {
                              const next = current.warehouses.filter(
                                (_, i) => i !== index
                              );
                              if (
                                row.isDefault &&
                                next.length > 0 &&
                                !next.some((w) => w.isDefault)
                              ) {
                                next[0] = { ...next[0], isDefault: true };
                              }
                              return { ...current, warehouses: next };
                            })
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
        title="Finishing steps"
        description="Bagging, labeling, folding, and other post-production work your shop offers."
        action={
          isAdmin && (
            <div className="flex gap-2">
              {draft.finishingSteps.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      finishingSteps: STARTER_FINISHING_STEPS.map((item) => ({
                        ...item,
                      })),
                    }))
                  }
                >
                  Load common steps
                </Button>
              )}
              <Button size="sm" onClick={addFinishingStep}>
                <Plus className="size-3.5" />
                Add step
              </Button>
            </div>
          )
        }
        bodyClassName="p-0"
      >
        {draft.finishingSteps.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-brand-muted">
            No finishing steps yet. These can be pulled into orders later.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#ebebeb] hover:bg-transparent">
                  <TableHead className="h-9 bg-[#fafafa] pl-5 text-[12px] font-medium text-[#616161]">
                    Step
                  </TableHead>
                  <TableHead className="h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                    Description
                  </TableHead>
                  <TableHead className="h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                    Offered
                  </TableHead>
                  {isAdmin && (
                    <TableHead className="h-9 w-12 bg-[#fafafa] pr-5" />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.finishingSteps.map((row, index) => (
                  <TableRow key={row.id} className="border-[#ebebeb]">
                    <TableCell className="pl-5">
                      <Input
                        value={row.name}
                        disabled={!isAdmin}
                        placeholder="Bagging"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            finishingSteps: current.finishingSteps.map((item, i) =>
                              i === index
                                ? { ...item, name: event.target.value }
                                : item
                            ),
                          }))
                        }
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.description}
                        disabled={!isAdmin}
                        placeholder="What this step includes"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            finishingSteps: current.finishingSteps.map((item, i) =>
                              i === index
                                ? { ...item, description: event.target.value }
                                : item
                            ),
                          }))
                        }
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          disabled={!isAdmin}
                          checked={row.enabled}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              finishingSteps: current.finishingSteps.map(
                                (item, i) =>
                                  i === index
                                    ? { ...item, enabled: event.target.checked }
                                    : item
                              ),
                            }))
                          }
                          className="size-4 rounded border-input"
                        />
                        <span className="text-[12px] text-[#616161]">
                          {row.enabled ? "Yes" : "No"}
                        </span>
                      </label>
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
                              finishingSteps: current.finishingSteps.filter(
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
        title="How this connects"
        description="Warehouse locations appear in inventory and purchase orders. Finishing steps will be available when building production workflows on orders."
      >
        <ul className="space-y-2 text-sm text-brand-muted">
          <li>
            Inventory items and POs can tag which warehouse stock lives in.
          </li>
          <li>
            Finishing steps like bagging and labeling map to the finishing
            decoration type on orders.
          </li>
          <li>
            Screen print presets from the previous tab feed ink and mesh fields
            on order imprints.
          </li>
        </ul>
      </SettingsPanel>

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
