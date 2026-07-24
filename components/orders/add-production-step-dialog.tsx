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
  resolvePrintLocationDecorationType,
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

export function AddProductionStepDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (job: Job) => void | Promise<void>;
}) {
  const { settings } = useShopSettings();
  const printLocationOptions = useMemo(
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
  const [mode, setMode] = useState<"quick" | "custom">("quick");
  const [saving, setSaving] = useState(false);
  const [customName, setCustomName] = useState("");
  const [locationKey, setLocationKey] =
    useState<ImprintLocationKey>(defaultLocationKey);
  const [decoration, setDecoration] = useState<DecorationType>("screen_print");
  const [kind, setKind] = useState<"decoration" | "finishing">("decoration");

  const reset = () => {
    setMode("quick");
    setCustomName("");
    setLocationKey(defaultLocationKey);
    setDecoration("screen_print");
    setKind("decoration");
  };

  const submitJob = async (job: Job) => {
    setSaving(true);
    try {
      await onAdd(job);
      onOpenChange(false);
      reset();
    } finally {
      setSaving(false);
    }
  };

  const handleTemplate = (template: ProductionStepTemplate) => {
    void submitJob(buildJobFromTemplate(template, settings.productionDefaults));
  };

  const handleCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || saving) return;
    void submitJob(
      buildCustomProductionJob(
        {
          name: customName,
          locationKey,
          decoration: kind === "finishing" ? "finishing" : decoration,
          kind,
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
              printLocationOptions={printLocationOptions}
              onSelect={handleTemplate}
              disabled={saving}
            />
          ) : (
            <form
              onSubmit={handleCustom}
              className="mx-auto w-full max-w-lg space-y-4 overflow-y-auto"
            >
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

              <div className="space-y-2">
                <Label>{eventLabel} type</Label>
                <Select
                  value={kind}
                  onValueChange={(v) =>
                    setKind((v as "decoration" | "finishing") ?? "decoration")
                  }
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
                    <SelectItem value="finishing">
                      Finishing (bagging, labeling)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {kind === "decoration" && (
                <div className="grid gap-4 sm:grid-cols-2">
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
                        setDecoration(
                          resolvePrintLocationDecorationType(
                            match
                          ) as DecorationType
                        );
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

                  <div className="space-y-2">
                    <Label>Decoration type</Label>
                    <Select
                      value={decoration}
                      onValueChange={(v) =>
                        setDecoration((v as DecorationType) ?? "screen_print")
                      }
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
                </div>
              )}

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
                    Adding…
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
