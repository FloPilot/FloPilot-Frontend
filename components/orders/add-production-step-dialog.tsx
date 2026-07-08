"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type {
  DecorationType,
  ImprintLocationKey,
  Job,
} from "@/types";
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
import { decorationLabel, DECORATION_TYPE_OPTIONS } from "@/lib/format";
import {
  defaultPrintLocationKey,
  getPrintLocationOptions,
} from "@/lib/shop-settings";
import { imprintLocationLabel } from "@/lib/job-imprints";
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
      <DialogContent className="sm:max-w-lg rounded-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-lg font-semibold">
            Add {eventLabel.toLowerCase()}
          </DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">
            Each event can be scheduled on a machine — decoration hits, labels,
            bagging, and more.
          </p>
        </DialogHeader>

        <div className="px-6 py-5">
          <div className="flex rounded-full border border-border bg-muted/30 p-1 mb-5">
            <button
              type="button"
              onClick={() => setMode("quick")}
              className={cn(
                "flex-1 rounded-full py-2 text-sm font-medium transition-colors",
                mode === "quick"
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Quick picks
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={cn(
                "flex-1 rounded-full py-2 text-sm font-medium transition-colors",
                mode === "custom"
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Custom {eventLabel.toLowerCase()}
            </button>
          </div>

          {mode === "quick" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {quickPicks.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  disabled={saving}
                  onClick={() => handleTemplate(template)}
                  className="rounded-xl border border-border bg-white p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-60"
                >
                  <p className="font-medium text-sm">{template.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {template.kind === "finishing"
                      ? "Finishing · no press"
                      : `${decorationLabel(template.decoration)} · ${imprintLocationLabel(
                          template.locationKey,
                          printLocationOptions
                        )}`}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleCustom} className="space-y-4">
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
                <>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Select
                      value={locationKey}
                      onValueChange={(v) =>
                        setLocationKey((v as ImprintLocationKey) ?? "other")
                      }
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
                    <Label>Method</Label>
                    <Select
                      value={decoration}
                      onValueChange={(v) =>
                        setDecoration((v as DecorationType) ?? "screen_print")
                      }
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <LabeledSelectValue
                          value={decoration}
                          options={DECORATION_TYPE_OPTIONS}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          [
                            "screen_print",
                            "embroidery",
                            "dtf",
                            "vinyl",
                          ] as DecorationType[]
                        ).map((type) => (
                          <SelectItem key={type} value={type}>
                            {decorationLabel(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <Button
                type="submit"
                disabled={!customName.trim() || saving}
                className={cn(dashboardPrimaryButtonClass, "h-11 w-full rounded-full")}
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
      </DialogContent>
    </Dialog>
  );
}
