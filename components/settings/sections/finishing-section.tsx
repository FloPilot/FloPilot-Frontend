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
  STARTER_FINISHING_STEPS,
  normalizeFinishingPriceTiers,
  resolveFinishingStepPrice,
  type FinishingStepPreset,
  type ShopProductionDefaults,
} from "@/lib/shop-settings";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyStep(): FinishingStepPreset {
  return {
    id: newId("finishing"),
    name: "",
    description: "",
    enabled: true,
    chargeMode: "per_piece",
    unitPrice: 0,
    quantityTiers: [
      { minQty: 50, unitPrice: 0 },
      { minQty: 100, unitPrice: 0 },
      { minQty: 250, unitPrice: 0 },
    ],
  };
}

export function FinishingSection() {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const initial = useMemo(
    () => ({
      finishingSteps: settings.productionDefaults.finishingSteps ?? [],
    }),
    [settings.productionDefaults.finishingSteps]
  );
  const { draft, setDraft, dirty, discard } = useSectionDraft<{
    finishingSteps: FinishingStepPreset[];
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
      const finishingSteps: FinishingStepPreset[] = draft.finishingSteps
        .map((step, index) => ({
          ...step,
          name: step.name.trim(),
          description: (step.description || "").trim(),
          chargeMode:
            step.chargeMode === "per_order"
              ? ("per_order" as const)
              : ("per_piece" as const),
          unitPrice: Math.max(0, Number(step.unitPrice) || 0),
          quantityTiers: normalizeFinishingPriceTiers(step.quantityTiers),
          id: step.id || `finishing-${index}`,
        }))
        .filter((step) => step.name);
      await updateSettings({
        productionDefaults: {
          ...settings.productionDefaults,
          finishingSteps,
        } satisfies ShopProductionDefaults,
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save finishing setup"
      );
    } finally {
      setSaving(false);
    }
  };

  useRegisterSectionUnsavedChanges({
    dirty,
    saving,
    enabled: isAdmin,
    label: "Unsaved finishing settings",
    onSave: () => handleSave(),
    onDiscard: discard,
    id: "settings-finishing",
  });

  const updateStep = (
    index: number,
    patch: Partial<FinishingStepPreset>
  ) => {
    setDraft((current) => ({
      finishingSteps: current.finishingSteps.map((step, i) =>
        i === index ? { ...step, ...patch } : step
      ),
    }));
  };

  return (
    <SettingsMain>
      <SettingsHeader
        title="Finishing"
        description="Price bagging, labeling, folding, and other post-production services with quantity breaks. When those steps are added on an order, estimates pull these rates automatically."
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
        title="Finishing services"
        description="Each service can bill per piece (with qty breaks) or as a flat order charge."
        action={
          isAdmin ? (
            <div className="flex gap-2">
              {draft.finishingSteps.length === 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft({
                      finishingSteps: STARTER_FINISHING_STEPS.map((item) => ({
                        ...item,
                        quantityTiers: [...(item.quantityTiers || [])],
                      })),
                    })
                  }
                >
                  Load common services
                </Button>
              ) : null}
              <Button
                size="sm"
                onClick={() => {
                  const step = emptyStep();
                  setDraft((current) => ({
                    finishingSteps: [...current.finishingSteps, step],
                  }));
                  setExpandedId(step.id);
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
        {draft.finishingSteps.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-brand-muted">
            No finishing services yet. Load common ones or add bagging,
            labeling, and fold &amp; bag with your shop rates.
          </p>
        ) : (
          <div className="divide-y divide-[#ebebeb]">
            {draft.finishingSteps.map((step, index) => {
              const open = expandedId === step.id;
              const samplePrice = resolveFinishingStepPrice(step, 100);
              return (
                <div key={step.id} className="bg-white">
                  <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded-lg text-[#8a8a8a] hover:bg-[#f6f6f7]"
                      onClick={() =>
                        setExpandedId(open ? null : step.id)
                      }
                      aria-label={open ? "Collapse" : "Expand pricing"}
                    >
                      <ChevronDown
                        className={cn(
                          "size-4 transition-transform",
                          open && "rotate-180"
                        )}
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <Input
                        value={step.name}
                        disabled={!isAdmin}
                        placeholder="Bagging"
                        onChange={(e) =>
                          updateStep(index, { name: e.target.value })
                        }
                        className="h-9 border-[#e3e3e3] text-[13px] font-medium"
                      />
                      <Input
                        value={step.description}
                        disabled={!isAdmin}
                        placeholder="Short description for staff"
                        onChange={(e) =>
                          updateStep(index, { description: e.target.value })
                        }
                        className="mt-1.5 h-8 border-transparent bg-transparent px-0 text-[12px] text-[#8a8a8a] shadow-none focus-visible:border-[#e3e3e3] focus-visible:bg-white focus-visible:px-2.5"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[#8a8a8a]">
                        {step.chargeMode === "per_order"
                          ? "Per order"
                          : "At 100 pcs"}
                      </p>
                      <p className="text-[14px] font-semibold tabular-nums text-[#121a2e]">
                        {formatCurrency(samplePrice)}
                        {step.chargeMode !== "per_order" ? (
                          <span className="text-[11px] font-normal text-[#8a8a8a]">
                            /ea
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-[12px] text-[#616161]">
                      <input
                        type="checkbox"
                        checked={step.enabled !== false}
                        disabled={!isAdmin}
                        onChange={(e) =>
                          updateStep(index, { enabled: e.target.checked })
                        }
                      />
                      Offered
                    </label>
                    {isAdmin ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="size-8 p-0 text-[#8a8a8a] hover:text-red-700"
                        onClick={() =>
                          setDraft((current) => ({
                            finishingSteps: current.finishingSteps.filter(
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
                    <div className="space-y-4 border-t border-[#f0f0f1] bg-[#fafafa] px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            ["per_piece", "Per piece"],
                            ["per_order", "Flat per order"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            disabled={!isAdmin}
                            onClick={() =>
                              updateStep(index, { chargeMode: value })
                            }
                            className={cn(
                              "rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors",
                              step.chargeMode === value
                                ? "border-[#303030] bg-[#303030] text-white"
                                : "border-[#e3e3e3] bg-white text-[#616161] hover:border-[#c9cccf]"
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div className="max-w-xs">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                          {step.chargeMode === "per_order"
                            ? "Order price"
                            : "Base unit price"}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          disabled={!isAdmin}
                          value={step.unitPrice ?? 0}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) =>
                            updateStep(index, {
                              unitPrice: Math.max(
                                0,
                                Number(e.target.value) || 0
                              ),
                            })
                          }
                          className="mt-1.5 h-9 border-[#e3e3e3]"
                        />
                        <p className="mt-1 text-[11px] text-[#8a8a8a]">
                          {step.chargeMode === "per_order"
                            ? "Charged once when this finishing step is on the order."
                            : "Used below the first qty break (or when no breaks are set)."}
                        </p>
                      </div>

                      {step.chargeMode !== "per_order" ? (
                        <div>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                              Quantity price breaks
                            </Label>
                            {isAdmin ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-[12px]"
                                onClick={() => {
                                  const tiers = [
                                    ...(step.quantityTiers || []),
                                  ];
                                  const last = tiers[tiers.length - 1];
                                  tiers.push({
                                    minQty: last ? last.minQty + 100 : 50,
                                    unitPrice: Math.max(
                                      0,
                                      Number(step.unitPrice) || 0
                                    ),
                                  });
                                  updateStep(index, {
                                    quantityTiers:
                                      normalizeFinishingPriceTiers(tiers),
                                  });
                                }}
                              >
                                <Plus className="size-3.5" />
                                Add break
                              </Button>
                            ) : null}
                          </div>
                          {(step.quantityTiers || []).length === 0 ? (
                            <p className="text-[12px] text-[#8a8a8a]">
                              No breaks — every piece uses the base unit price.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              <div className="hidden grid-cols-[1fr_1fr_auto] gap-2 px-1 text-[11px] font-medium text-[#8a8a8a] sm:grid">
                                <span>Min. qty</span>
                                <span>Unit price</span>
                                <span className="w-8" />
                              </div>
                              {(step.quantityTiers || []).map(
                                (tier, tierIndex) => (
                                  <div
                                    key={`${step.id}-tier-${tierIndex}`}
                                    className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
                                  >
                                    <Input
                                      type="number"
                                      min={1}
                                      step={1}
                                      disabled={!isAdmin}
                                      value={tier.minQty}
                                      onFocus={(e) =>
                                        e.currentTarget.select()
                                      }
                                      onChange={(e) => {
                                        const next = [
                                          ...(step.quantityTiers || []),
                                        ];
                                        next[tierIndex] = {
                                          ...next[tierIndex],
                                          minQty: Math.max(
                                            1,
                                            Math.floor(
                                              Number(e.target.value) || 1
                                            )
                                          ),
                                        };
                                        updateStep(index, {
                                          quantityTiers: next,
                                        });
                                      }}
                                      onBlur={() =>
                                        updateStep(index, {
                                          quantityTiers:
                                            normalizeFinishingPriceTiers(
                                              step.quantityTiers
                                            ),
                                        })
                                      }
                                      className="h-9 border-[#e3e3e3] bg-white"
                                    />
                                    <Input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      disabled={!isAdmin}
                                      value={tier.unitPrice}
                                      onFocus={(e) =>
                                        e.currentTarget.select()
                                      }
                                      onChange={(e) => {
                                        const next = [
                                          ...(step.quantityTiers || []),
                                        ];
                                        next[tierIndex] = {
                                          ...next[tierIndex],
                                          unitPrice: Math.max(
                                            0,
                                            Number(e.target.value) || 0
                                          ),
                                        };
                                        updateStep(index, {
                                          quantityTiers: next,
                                        });
                                      }}
                                      className="h-9 border-[#e3e3e3] bg-white"
                                    />
                                    {isAdmin ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-9 w-9 p-0 text-[#8a8a8a] hover:text-red-700"
                                        onClick={() => {
                                          const next = (
                                            step.quantityTiers || []
                                          ).filter((_, i) => i !== tierIndex);
                                          updateStep(index, {
                                            quantityTiers:
                                              normalizeFinishingPriceTiers(
                                                next
                                              ),
                                          });
                                        }}
                                      >
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    ) : null}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      ) : null}
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
