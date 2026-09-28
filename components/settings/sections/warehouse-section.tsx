"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Star, Trash2 } from "lucide-react";
import {
  AdminLockNotice,
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
  DEFAULT_COMPANY_ADDRESS,
  type ShopWarehouse,
} from "@/lib/shop-settings";
import { cn } from "@/lib/utils";

function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function WarehouseSection() {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const initial = useMemo(
    () => ({
      warehouses: settings.warehouses ?? [],
    }),
    [settings.warehouses]
  );
  const { draft, setDraft, dirty, discard } = useSectionDraft<{
    warehouses: ShopWarehouse[];
  }>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateSettings({
        warehouses: draft.warehouses,
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

  useRegisterSectionUnsavedChanges({
    dirty,
    saving,
    enabled: isAdmin,
    label: "Unsaved warehouse",
    onSave: () => handleSave(),
    onDiscard: discard,
    id: "settings-warehouse",
  });

  const addWarehouse = () => {
    setDraft((current) => {
      const next: ShopWarehouse = {
        id: newId("warehouse"),
        name: "",
        code: "",
        description: "",
        isDefault: current.warehouses.length === 0,
        address: { ...DEFAULT_COMPANY_ADDRESS },
      };
      return {
        warehouses: [...current.warehouses, next],
      };
    });
  };

  const setDefaultWarehouse = (id: string) => {
    setDraft({
      warehouses: draft.warehouses.map((w) => ({
        ...w,
        isDefault: w.id === id,
      })),
    });
  };

  return (
    <SettingsMain>
      <SettingsHeader
        title="Warehouse"
        description="Set up storage locations for inventory and purchase orders."
      >
        {isAdmin && (
          <SaveButton
            headerBar
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
                            warehouses: current.warehouses.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    code: event.target.value.toUpperCase(),
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
                        value={row.description}
                        disabled={!isAdmin}
                        placeholder="Optional notes"
                        onChange={(event) =>
                          setDraft((current) => ({
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
                              return { warehouses: next };
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
        title="Finishing pricing"
        description="Bagging, labeling, and fold & bag rates now live under Shop Setup → Finishing."
      >
        <p className="text-sm text-brand-muted">
          Configure quantity price breaks for finishing services, then add those
          steps on an order to pull the rates onto the estimate automatically.
        </p>
        <Link
          href="/app/settings/shop/finishing"
          className="mt-3 inline-flex h-8 items-center rounded-md border border-[#e3e3e3] bg-white px-3 text-[12px] font-medium text-[#303030] hover:bg-[#fafafa]"
        >
          Open Finishing setup
        </Link>
      </SettingsPanel>

      {isAdmin && dirty && (
        <div className="flex justify-end">
          <SaveButton
            headerBar
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
