"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  STARTER_SUBCONTRACT_SERVICES,
  normalizeSubcontractServicePreset,
  slugifySubcontractServiceId,
  type ShopProductionDefaults,
  type SubcontractServicePreset,
} from "@/lib/shop-settings";
import { cn } from "@/lib/utils";

function emptyService(): SubcontractServicePreset {
  return {
    id: slugifySubcontractServiceId(`service-${Date.now()}`),
    name: "",
    description: "",
    enabled: true,
    defaultVendorName: "",
  };
}

export function SubcontractingSection() {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const initial = useMemo(
    () => ({
      subcontractServices: settings.productionDefaults.subcontractServices ?? [],
    }),
    [settings.productionDefaults.subcontractServices]
  );
  const { draft, setDraft, dirty, discard } = useSectionDraft<{
    subcontractServices: SubcontractServicePreset[];
  }>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const subcontractServices: SubcontractServicePreset[] = draft.subcontractServices
        .map((service, index) =>
          normalizeSubcontractServicePreset(
            {
              ...service,
              id: service.id || slugifySubcontractServiceId(service.name || `service-${index}`),
            },
            index
          )
        )
        .filter((service): service is SubcontractServicePreset => service !== null);
      const nextSettings = await updateSettings({
        productionDefaults: {
          ...settings.productionDefaults,
          subcontractServices,
        } satisfies ShopProductionDefaults,
      });
      const confirmed =
        nextSettings.productionDefaults.subcontractServices ?? [];
      const missing = subcontractServices.filter(
        (service) => !confirmed.some((entry) => entry.id === service.id)
      );
      if (missing.length > 0) {
        throw new Error(
          "Subcontract services did not save. Redeploy updateTenantSettings, getTenantSettings, and getMe, then try again."
        );
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save subcontracting setup"
      );
    } finally {
      setSaving(false);
    }
  };

  useRegisterSectionUnsavedChanges({
    dirty,
    saving,
    enabled: isAdmin,
    label: "Unsaved subcontracting settings",
    onSave: () => handleSave(),
    onDiscard: discard,
    id: "settings-subcontracting",
  });

  const updateService = (
    index: number,
    patch: Partial<SubcontractServicePreset>
  ) => {
    setDraft((current) => ({
      subcontractServices: current.subcontractServices.map((service, i) =>
        i === index ? { ...service, ...patch } : service
      ),
    }));
  };

  return (
    <SettingsMain>
      <SettingsHeader
        title="Subcontracting"
        description="Define the outside-vendor services your shop uses — sew-on patches, specialty sew, laser etch, and more. These show up when adding a subcontract event on an order."
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
        title="Subcontract services"
        description="Each service is a type of work you send out and receive back. Optional default vendor fills in on new events."
        action={
          isAdmin ? (
            <div className="flex gap-2">
              {draft.subcontractServices.length === 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft({
                      subcontractServices: STARTER_SUBCONTRACT_SERVICES.map(
                        (item) => ({ ...item })
                      ),
                    })
                  }
                >
                  Load common services
                </Button>
              ) : null}
              <Button
                size="sm"
                onClick={() => {
                  const service = emptyService();
                  setDraft((current) => ({
                    subcontractServices: [
                      ...current.subcontractServices,
                      service,
                    ],
                  }));
                  setExpandedId(service.id);
                }}
              >
                <Plus className="size-3.5" />
                Add service
              </Button>
            </div>
          ) : null
        }
        bodyClassName="p-0"
      >
        {draft.subcontractServices.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-brand-muted">
            No subcontract services yet. Load common ones or add sew-on
            patches, specialty embroidery, and other outside work.
          </p>
        ) : (
          <div className="divide-y divide-[#ebebeb]">
            {draft.subcontractServices.map((service, index) => {
              const open = expandedId === service.id;
              return (
                <div key={service.id} className="bg-white">
                  <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded-lg text-[#8a8a8a] hover:bg-[#f6f6f7]"
                      onClick={() =>
                        setExpandedId(open ? null : service.id)
                      }
                      aria-expanded={open}
                    >
                      <ChevronDown
                        className={cn(
                          "size-4 transition-transform",
                          open && "rotate-180"
                        )}
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#303030]">
                        {service.name.trim() || "Untitled service"}
                      </p>
                      <p className="truncate text-xs text-brand-muted">
                        {service.defaultVendorName?.trim()
                          ? `Default vendor · ${service.defaultVendorName.trim()}`
                          : service.description?.trim() ||
                            "No description yet"}
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs text-brand-muted">
                      <input
                        type="checkbox"
                        checked={service.enabled !== false}
                        disabled={!isAdmin}
                        onChange={(event) =>
                          updateService(index, {
                            enabled: event.target.checked,
                          })
                        }
                        className="size-4 rounded border-[#c9c9c9]"
                      />
                      Active
                    </label>
                    {isAdmin ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-[#8a8a8a] hover:text-[#b42318]"
                        onClick={() =>
                          setDraft((current) => ({
                            subcontractServices:
                              current.subcontractServices.filter(
                                (_, i) => i !== index
                              ),
                          }))
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                  {open ? (
                    <div className="grid gap-3 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Service name</Label>
                        <Input
                          value={service.name}
                          disabled={!isAdmin}
                          placeholder="e.g. Sew-on patches"
                          className="h-10 rounded-xl"
                          onChange={(event) =>
                            updateService(index, {
                              name: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Description</Label>
                        <Input
                          value={service.description}
                          disabled={!isAdmin}
                          placeholder="What this vendor work covers"
                          className="h-10 rounded-xl"
                          onChange={(event) =>
                            updateService(index, {
                              description: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Default vendor (optional)</Label>
                        <Input
                          value={service.defaultVendorName || ""}
                          disabled={!isAdmin}
                          placeholder="e.g. Apex Patch Co."
                          className="h-10 rounded-xl"
                          onChange={(event) =>
                            updateService(index, {
                              defaultVendorName: event.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </SettingsPanel>
    </SettingsMain>
  );
}
