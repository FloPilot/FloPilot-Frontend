"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type {
  DecorationType,
  ImprintLocationKey,
  Job,
} from "@/types";
import { EventQuickPickBrowser } from "@/components/orders/event-quick-picks";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  LabeledSelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import {
  defaultPrintLocationKey,
  getDecorationTypeOptions,
  getPrintLocationOptions,
  getPrintLocationOptionsForDecoration,
  getSubcontractServiceOptions,
  rematchPrintLocationForDecoration,
  resolvePrintLocationDecorationType,
  slugifySubcontractServiceId,
  type SubcontractServicePreset,
} from "@/lib/shop-settings";
import {
  buildCustomProductionJob,
  buildJobFromTemplate,
  getProductionStepQuickPicks,
  type ProductionStepTemplate,
} from "@/lib/order-production";
import { eventLabel } from "@/lib/terminology";
import { dashboardPrimaryButtonClass } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const NEW_SUBCONTRACT_SERVICE = "__new__";

export function AddProductionStepDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (job: Job) => void | Promise<void>;
}) {
  const { settings, updateSettings } = useShopSettings();
  const allPrintLocationOptions = useMemo(
    () => getPrintLocationOptions(settings.productionDefaults),
    [settings.productionDefaults]
  );
  const decorationTypeOptions = useMemo(
    () => getDecorationTypeOptions(settings.productionDefaults),
    [settings.productionDefaults]
  );
  const defaultLocationKey = useMemo(
    () => defaultPrintLocationKey(settings.productionDefaults),
    [settings.productionDefaults]
  );
  const quickPicks = useMemo(
    () => getProductionStepQuickPicks(settings.productionDefaults),
    [settings.productionDefaults]
  );
  const subcontractServices = useMemo(
    () => getSubcontractServiceOptions(settings.productionDefaults),
    [settings.productionDefaults]
  );
  const [mode, setMode] = useState<"quick" | "custom">("quick");
  const [saving, setSaving] = useState(false);
  const [customName, setCustomName] = useState("");
  const [locationKey, setLocationKey] =
    useState<ImprintLocationKey>(defaultLocationKey);
  const [decoration, setDecoration] = useState<DecorationType>("screen_print");
  const [kind, setKind] = useState<"decoration" | "finishing" | "subcontract">(
    "decoration"
  );
  const [subcontractServiceId, setSubcontractServiceId] = useState<string>(
    NEW_SUBCONTRACT_SERVICE
  );
  const [newServiceDescription, setNewServiceDescription] = useState("");
  const [newServiceVendor, setNewServiceVendor] = useState("");
  const [saveServiceToSettings, setSaveServiceToSettings] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const printLocationOptions = useMemo(
    () =>
      getPrintLocationOptionsForDecoration(
        settings.productionDefaults,
        decoration,
        { includeValue: locationKey }
      ),
    [settings.productionDefaults, decoration, locationKey]
  );

  const subcontractSelectOptions = useMemo(
    () => [
      ...subcontractServices.map((service) => ({
        value: service.id,
        label: service.name,
      })),
      { value: NEW_SUBCONTRACT_SERVICE, label: "Create new service…" },
    ],
    [subcontractServices]
  );

  const selectedSubcontractService = useMemo(
    () =>
      subcontractServices.find((service) => service.id === subcontractServiceId),
    [subcontractServices, subcontractServiceId]
  );

  const creatingNewSubcontract =
    kind === "subcontract" &&
    (subcontractServiceId === NEW_SUBCONTRACT_SERVICE ||
      subcontractServices.length === 0);

  const reset = () => {
    setMode("quick");
    setCustomName("");
    setLocationKey(defaultLocationKey);
    setDecoration("screen_print");
    setKind("decoration");
    setSubcontractServiceId(
      subcontractServices[0]?.id || NEW_SUBCONTRACT_SERVICE
    );
    setNewServiceDescription("");
    setNewServiceVendor("");
    setSaveServiceToSettings(true);
    setError(null);
  };

  const submitJob = async (job: Job) => {
    setSaving(true);
    setError(null);
    try {
      await onAdd(job);
      onOpenChange(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add event.");
    } finally {
      setSaving(false);
    }
  };

  const handleTemplate = (template: ProductionStepTemplate) => {
    void submitJob(buildJobFromTemplate(template, settings.productionDefaults));
  };

  const persistNewSubcontractService = async (
    name: string
  ): Promise<SubcontractServicePreset> => {
    const service: SubcontractServicePreset = {
      id: slugifySubcontractServiceId(name),
      name: name.trim(),
      description: newServiceDescription.trim(),
      enabled: true,
      ...(newServiceVendor.trim()
        ? { defaultVendorName: newServiceVendor.trim() }
        : {}),
    };
    const existing = settings.productionDefaults.subcontractServices ?? [];
    const withoutDup = existing.filter(
      (entry) =>
        entry.id !== service.id &&
        entry.name.trim().toLowerCase() !== service.name.toLowerCase()
    );
    const nextSettings = await updateSettings({
      productionDefaults: {
        ...settings.productionDefaults,
        subcontractServices: [...withoutDup, service],
      },
    });
    const confirmed = (
      nextSettings.productionDefaults.subcontractServices ?? []
    ).find((entry) => entry.id === service.id);
    if (!confirmed) {
      throw new Error(
        "Could not save this subcontract service to settings. Ask an admin to redeploy updateTenantSettings / getTenantSettings, or add it under Settings → Subcontracting."
      );
    }
    return confirmed;
  };

  const handleCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (kind === "subcontract") {
      const serviceName = creatingNewSubcontract
        ? customName.trim()
        : selectedSubcontractService?.name.trim() || "";
      if (!serviceName) return;

      setSaving(true);
      setError(null);
      try {
        let serviceId = selectedSubcontractService?.id;
        let vendorName = selectedSubcontractService?.defaultVendorName;
        if (creatingNewSubcontract) {
          if (saveServiceToSettings) {
            const saved = await persistNewSubcontractService(serviceName);
            serviceId = saved.id;
            vendorName = saved.defaultVendorName;
          } else {
            serviceId = slugifySubcontractServiceId(serviceName);
            vendorName = newServiceVendor.trim() || undefined;
          }
        }

        await onAdd(
          buildCustomProductionJob(
            {
              name: serviceName,
              locationKey: "other",
              decoration: "subcontract",
              kind: "subcontract",
              subcontractServiceId: serviceId,
              defaultVendorName: vendorName,
            },
            settings.productionDefaults
          )
        );
        onOpenChange(false);
        reset();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not add subcontract event."
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!customName.trim()) return;
    const matchedStep =
      kind === "finishing"
        ? (settings.productionDefaults.finishingSteps ?? []).find(
            (step) =>
              step.enabled !== false &&
              step.name.trim().toLowerCase() === customName.trim().toLowerCase()
          )
        : undefined;
    void submitJob(
      buildCustomProductionJob(
        {
          name: customName,
          locationKey,
          decoration: kind === "finishing" ? "finishing" : decoration,
          kind,
          finishingStepId: matchedStep?.id,
        },
        settings.productionDefaults
      )
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[min(92vh,760px)] w-full flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-6 pb-4 pt-6">
          <DialogTitle className="text-lg font-semibold text-[#303030]">
            Add {eventLabel.toLowerCase()}
          </DialogTitle>
          <p className="pt-1 text-sm text-[#8a8a8a]">
            Filter by decoration type, then pick a location — or build a custom
            event.
          </p>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
          <div className="mb-4 flex shrink-0 rounded-full border border-[#e3e3e3] bg-[#f6f6f7] p-1">
            <button
              type="button"
              onClick={() => setMode("quick")}
              className={cn(
                "flex-1 rounded-full py-2.5 text-sm font-semibold transition-colors",
                mode === "quick"
                  ? "bg-white text-[#303030] shadow-sm"
                  : "text-[#8a8a8a] hover:text-[#303030]"
              )}
            >
              Quick picks
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={cn(
                "flex-1 rounded-full py-2.5 text-sm font-semibold transition-colors",
                mode === "custom"
                  ? "bg-white text-[#303030] shadow-sm"
                  : "text-[#8a8a8a] hover:text-[#303030]"
              )}
            >
              Custom {eventLabel.toLowerCase()}
            </button>
          </div>

          {mode === "quick" ? (
            <EventQuickPickBrowser
              className="min-h-0 flex-1"
              templates={quickPicks}
              decorationTypeOptions={decorationTypeOptions}
              printLocationOptions={allPrintLocationOptions}
              onSelect={handleTemplate}
              disabled={saving}
            />
          ) : (
            <form
              onSubmit={(event) => void handleCustom(event)}
              className="mx-auto w-full max-w-lg space-y-4 overflow-y-auto"
            >
              <div className="space-y-2">
                <Label>{eventLabel} type</Label>
                <Select
                  value={kind}
                  onValueChange={(v) => {
                    const next =
                      (v as "decoration" | "finishing" | "subcontract") ??
                      "decoration";
                    setKind(next);
                    if (next === "subcontract") {
                      setSubcontractServiceId(
                        subcontractServices[0]?.id || NEW_SUBCONTRACT_SERVICE
                      );
                      if (subcontractServices[0]) {
                        setCustomName(subcontractServices[0].name);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <LabeledSelectValue
                      value={kind}
                      options={[
                        {
                          value: "decoration",
                          label: "Decoration (press / embroidery)",
                        },
                        {
                          value: "subcontract",
                          label: "Subcontract (outside vendor)",
                        },
                        {
                          value: "finishing",
                          label: "Finishing (bagging, labeling)",
                        },
                      ]}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="decoration">
                      Decoration (press / embroidery)
                    </SelectItem>
                    <SelectItem value="subcontract">
                      Subcontract (outside vendor)
                    </SelectItem>
                    <SelectItem value="finishing">
                      Finishing (bagging, labeling)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {kind === "subcontract" ? (
                <>
                  <div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] px-3.5 py-3 text-[13px] leading-relaxed text-[#9a3412]">
                    Pick a shop subcontract service, or create a new one — new
                    services can be saved under Settings → Subcontracting for
                    next time.
                  </div>

                  {subcontractServices.length > 0 ? (
                    <div className="space-y-2">
                      <Label>Subcontract service</Label>
                      <Select
                        value={
                          creatingNewSubcontract
                            ? NEW_SUBCONTRACT_SERVICE
                            : subcontractServiceId
                        }
                        onValueChange={(value) => {
                          if (!value) return;
                          setSubcontractServiceId(value);
                          if (value === NEW_SUBCONTRACT_SERVICE) {
                            setCustomName("");
                            return;
                          }
                          const match = subcontractServices.find(
                            (service) => service.id === value
                          );
                          if (match) setCustomName(match.name);
                        }}
                      >
                        <SelectTrigger className="h-11 rounded-xl">
                          <LabeledSelectValue
                            value={
                              creatingNewSubcontract
                                ? NEW_SUBCONTRACT_SERVICE
                                : subcontractServiceId
                            }
                            options={subcontractSelectOptions}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {subcontractSelectOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {creatingNewSubcontract ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="subcontract-service-name">
                          New service name
                        </Label>
                        <Input
                          id="subcontract-service-name"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="e.g. Sew-on patches"
                          className="h-11 rounded-xl"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subcontract-service-desc">
                          Description (optional)
                        </Label>
                        <Input
                          id="subcontract-service-desc"
                          value={newServiceDescription}
                          onChange={(e) =>
                            setNewServiceDescription(e.target.value)
                          }
                          placeholder="What this vendor work covers"
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subcontract-service-vendor">
                          Default vendor (optional)
                        </Label>
                        <Input
                          id="subcontract-service-vendor"
                          value={newServiceVendor}
                          onChange={(e) => setNewServiceVendor(e.target.value)}
                          placeholder="e.g. Apex Patch Co."
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <label className="flex items-start gap-2.5 rounded-xl border border-[#e3e3e3] bg-[#fafafa] px-3.5 py-3 text-[13px] text-[#616161]">
                        <input
                          type="checkbox"
                          checked={saveServiceToSettings}
                          onChange={(event) =>
                            setSaveServiceToSettings(event.target.checked)
                          }
                          className="mt-0.5 size-4 rounded border-[#c9c9c9]"
                        />
                        <span>
                          Save this service to{" "}
                          <span className="font-medium text-[#303030]">
                            Settings → Subcontracting
                          </span>{" "}
                          so the team can reuse it on other orders.
                        </span>
                      </label>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label>{eventLabel} name</Label>
                      <Input
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Service name on this order"
                        className="h-11 rounded-xl"
                      />
                      {selectedSubcontractService?.description ? (
                        <p className="text-[12px] text-[#8a8a8a]">
                          {selectedSubcontractService.description}
                        </p>
                      ) : null}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="step-name">{eventLabel} name</Label>
                  <Input
                    id="step-name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Left sleeve hit"
                    className="h-11 rounded-xl"
                    autoFocus
                  />
                </div>
              )}

              {kind === "decoration" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Decoration type</Label>
                    <Select
                      value={decoration}
                      onValueChange={(v) => {
                        const next =
                          (v as DecorationType) ?? "screen_print";
                        setDecoration(next);
                        const matched = rematchPrintLocationForDecoration(
                          locationKey,
                          next,
                          settings.productionDefaults
                        );
                        setLocationKey(
                          matched.locationKey as ImprintLocationKey
                        );
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <LabeledSelectValue
                          value={decoration}
                          options={decorationTypeOptions}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {decorationTypeOptions.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Select
                      value={locationKey}
                      onValueChange={(v) => {
                        const nextKey = (v as ImprintLocationKey) ?? "other";
                        setLocationKey(nextKey);
                        const match = printLocationOptions.find(
                          (option) => option.value === nextKey
                        );
                        if (match) {
                          setDecoration(
                            resolvePrintLocationDecorationType(
                              match
                            ) as DecorationType
                          );
                        }
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <LabeledSelectValue
                          value={locationKey}
                          options={printLocationOptions}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {printLocationOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {error ? (
                <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#b42318]">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={!customName.trim() || saving}
                className={cn(
                  dashboardPrimaryButtonClass,
                  "h-11 w-full rounded-full"
                )}
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {creatingNewSubcontract && saveServiceToSettings
                      ? "Saving service…"
                      : "Adding…"}
                  </>
                ) : (
                  <>Add {eventLabel.toLowerCase()}</>
                )}
              </Button>
            </form>
          )}
        </div>

        {mode === "quick" && saving ? (
          <div className="shrink-0 border-t border-[#ebebeb] bg-[#fafafa] px-6 py-3 text-center text-xs font-medium text-[#616161]">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin" />
              Adding {eventLabel.toLowerCase()}…
            </span>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
