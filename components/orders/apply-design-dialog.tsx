"use client";

import { useEffect, useMemo, useState } from "react";
import { BookMarked, Loader2, Search, Shirt, X } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listDesigns } from "@/lib/api";
import { decorationLabel } from "@/lib/format";
import { formatImprintOptionLabel } from "@/lib/imprint-display";
import { formatOrderDisplayLine } from "@/lib/order-display";
import { dashboardPrimaryButtonClass } from "@/lib/dashboard-styles";
import { getOrderProductionSteps } from "@/lib/order-production";
import { getDecorationTypeOptions } from "@/lib/shop-settings";
import { useImageBackgroundColor } from "@/lib/use-image-background-color";
import type { Order, SavedDesign } from "@/types";
import { cn } from "@/lib/utils";

type DecorationFilter = "all" | string;

function ActiveFilterChip({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <div className="inline-flex max-w-full items-stretch overflow-hidden rounded-lg border border-[#e3e3e3] bg-white text-xs shadow-sm">
      <span className="flex shrink-0 items-center border-r border-[#e3e3e3] px-2 py-1.5 text-[#616161]">
        {label}
      </span>
      <span className="flex max-w-[200px] items-center truncate bg-[#f0f5ff] px-2 py-1.5 font-medium text-[#303030]">
        {value}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center border-l border-[#e3e3e3] px-1.5 text-[#8a8a8a] hover:bg-[#f6f6f7] hover:text-[#303030]"
        aria-label={`Remove ${label} filter`}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function DesignPreview({ design }: { design: SavedDesign | null }) {
  const bgColor = useImageBackgroundColor(design?.artwork.previewUrl);

  if (!design) {
    return (
      <div className="flex aspect-[5/4] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#e3e3e3] bg-[#fafafa] text-[#8a8a8a]">
        <Shirt className="size-8" strokeWidth={1.5} />
        <p className="text-sm font-medium">Select a design to preview</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border border-[#e3e3e3] bg-white">
      <div
        className="relative flex aspect-[5/4] w-full items-center justify-center overflow-hidden bg-[#f6f6f7] p-3 transition-colors"
        style={bgColor ? { backgroundColor: bgColor } : undefined}
      >
        {design.artwork.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={design.artwork.previewUrl}
            alt={design.name}
            // Match the crossOrigin mode used by useImageBackgroundColor so the
            // browser caches a CORS-clean response and the canvas isn't tainted.
            crossOrigin="anonymous"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <Shirt className="size-10 text-[#a3a3a3]" strokeWidth={1.5} />
        )}
      </div>
      <div className="space-y-1 border-t border-[#ebebeb] px-3.5 py-2.5">
        <p className="truncate text-[13px] font-semibold text-[#303030]">
          {design.name}
        </p>
        <p className="truncate text-[11px] text-[#8a8a8a]">
          {decorationLabel(design.decoration)} · {design.locationLabel}
          {design.imprintCustomLabel
            ? ` · ${design.imprintCustomLabel}`
            : ""}
        </p>
        {design.sourceOrderNumber || design.sourceOrderCustomLabel ? (
          <p className="truncate text-[11px] text-[#a3a3a3]">
            From {design.sourceOrderNumber || "order"}
            {design.sourceOrderCustomLabel
              ? ` — ${design.sourceOrderCustomLabel}`
              : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DesignGridCard({
  design,
  selected,
  onSelect,
}: {
  design: SavedDesign;
  selected: boolean;
  onSelect: () => void;
}) {
  const bgColor = useImageBackgroundColor(design.artwork.previewUrl);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "overflow-hidden rounded-xl border text-left transition-colors",
        selected
          ? "border-[#2c6ecb] bg-[#f7faff] ring-1 ring-[#2c6ecb]/25"
          : "border-[#e3e3e3] bg-white hover:border-[#c9d7ef]"
      )}
    >
      <div
        className="flex h-28 items-center justify-center bg-[#f6f6f7] p-3 transition-colors"
        style={bgColor ? { backgroundColor: bgColor } : undefined}
      >
        {design.artwork.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={design.artwork.previewUrl}
            alt=""
            crossOrigin="anonymous"
            className="h-full w-full object-contain"
          />
        ) : (
          <Shirt className="size-7 text-[#a3a3a3]" strokeWidth={1.5} />
        )}
      </div>
      <div className="space-y-0.5 px-3 py-2.5">
        <p className="truncate text-[13px] font-semibold text-[#303030]">
          {design.name}
        </p>
        <p className="truncate text-[11px] text-[#8a8a8a]">
          {decorationLabel(design.decoration)} · {design.locationLabel}
        </p>
      </div>
    </button>
  );
}

export function ApplyDesignDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { getIdToken } = useAuth();
  const { applyDesignToOrder } = useSchedule();
  const { settings } = useShopSettings();
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(false);
  const [designId, setDesignId] = useState("");
  const [targetKey, setTargetKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [decorationFilter, setDecorationFilter] =
    useState<DecorationFilter>("all");
  /** Defaults to the order's billing customer; clearable so the full library can be browsed. */
  const [customerFilterId, setCustomerFilterId] = useState<string | null>(null);

  const customerFilterLabel =
    order.company || order.customerName || "This customer";

  const decorationTypeOptions = useMemo(
    () => getDecorationTypeOptions(settings.productionDefaults),
    [settings.productionDefaults]
  );

  const steps = useMemo(
    () =>
      getOrderProductionSteps(order).filter(
        ({ job, imprint }) =>
          job.kind !== "finishing" && imprint.decoration !== "finishing"
      ),
    [order]
  );

  useEffect(() => {
    if (!open) return;
    setDesignId("");
    setTargetKey("");
    setQuery("");
    setDecorationFilter("all");
    // Always scope to the order's primary customer (not end-business / broker).
    setCustomerFilterId(order.customerId || null);
    setLoading(true);
    void (async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        // Load the full library so the customer chip can be cleared without a re-fetch.
        const { designs: next } = await listDesigns(token);
        setDesigns(next);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, getIdToken, order.customerId]);

  const customerScopedDesigns = useMemo(() => {
    if (!customerFilterId) return designs;
    return designs.filter((design) => design.customerId === customerFilterId);
  }, [designs, customerFilterId]);

  const filteredDesigns = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return customerScopedDesigns.filter((design) => {
      if (
        decorationFilter !== "all" &&
        design.decoration !== decorationFilter
      ) {
        return false;
      }
      if (!needle) return true;
      const haystack = [
        design.name,
        design.locationLabel,
        design.imprintCustomLabel,
        design.sourceOrderCustomLabel,
        design.sourceOrderNumber,
        design.company,
        design.customerName,
        decorationLabel(design.decoration),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [customerScopedDesigns, query, decorationFilter]);

  const selectedDesign = useMemo(
    () => designs.find((design) => design.id === designId) ?? null,
    [designs, designId]
  );

  const filterPills = useMemo(() => {
    const counts = new Map<string, number>();
    for (const design of customerScopedDesigns) {
      counts.set(design.decoration, (counts.get(design.decoration) ?? 0) + 1);
    }
    const pills: { value: DecorationFilter; label: string; count: number }[] = [
      { value: "all", label: "All", count: customerScopedDesigns.length },
    ];
    for (const option of decorationTypeOptions) {
      const count = counts.get(option.value) ?? 0;
      if (count > 0) {
        pills.push({ value: option.value, label: option.label, count });
      }
    }
    for (const [value, count] of counts) {
      if (pills.some((pill) => pill.value === value)) continue;
      pills.push({ value, label: decorationLabel(value), count });
    }
    return pills;
  }, [customerScopedDesigns, decorationTypeOptions]);

  const handleApply = async () => {
    const step = steps.find(
      (entry) => `${entry.job.id}-${entry.imprint.id}` === targetKey
    );
    if (!step || !designId) return;
    setSaving(true);
    try {
      await applyDesignToOrder(
        designId,
        order.id,
        step.job.id,
        step.imprint.id
      );
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,820px)] w-full flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-6 pb-4 pt-6">
          <DialogTitle className="text-lg font-semibold text-[#303030]">
            Apply from library
          </DialogTitle>
          <p className="pt-1 text-sm text-[#8a8a8a]">
            Choose a saved design for{" "}
            <span className="font-medium text-[#616161]">
              {formatOrderDisplayLine(order)}
            </span>
            , then pick which proof location to apply it to.
          </p>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1fr_280px]">
          <div className="flex min-h-0 flex-col gap-3 border-b border-[#ebebeb] p-5 lg:border-b-0 lg:border-r">
            {(customerFilterId || order.customerId) && (
              <div className="flex flex-wrap items-center gap-2">
                {customerFilterId ? (
                  <ActiveFilterChip
                    label="Customer"
                    value={customerFilterLabel}
                    onRemove={() => {
                      setCustomerFilterId(null);
                      setDecorationFilter("all");
                      setDesignId("");
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerFilterId(order.customerId);
                      setDecorationFilter("all");
                      setDesignId("");
                    }}
                    className="inline-flex h-8 items-center rounded-lg border border-dashed border-[#c9d7ef] bg-[#f7faff] px-2.5 text-xs font-medium text-[#2c6ecb] hover:border-[#2c6ecb]/50"
                  >
                    Filter to {customerFilterLabel}
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {filterPills.map((pill) => {
                const active = decorationFilter === pill.value;
                return (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => setDecorationFilter(pill.value)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
                      active
                        ? "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
                        : "border-[#e3e3e3] bg-white text-[#616161] hover:border-[#c9c9c9]"
                    )}
                  >
                    {pill.label}
                    <span
                      className={cn(
                        "inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                        active
                          ? "bg-[#2c6ecb] text-white"
                          : "bg-[#f1f1f1] text-[#616161]"
                      )}
                    >
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, location, or order…"
                className="h-9 w-full rounded-lg border border-[#e3e3e3] bg-white pl-9 pr-3 text-xs text-[#303030] outline-none placeholder:text-[#8a8a8a] focus:border-[#2c6ecb]/50 focus:ring-2 focus:ring-[#2c6ecb]/15"
              />
            </div>

            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-[#8a8a8a]">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              ) : filteredDesigns.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-12 text-center">
                  <p className="text-sm font-medium text-[#303030]">
                    {customerScopedDesigns.length === 0
                      ? customerFilterId
                        ? `No saved designs for ${customerFilterLabel}`
                        : "No saved designs"
                      : "No designs match"}
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-[13px] text-[#8a8a8a]">
                    {customerScopedDesigns.length === 0
                      ? customerFilterId
                        ? "Clear the customer filter to browse the full library, or wait until artwork syncs from proofs."
                        : "Designs sync automatically from proofs once artwork is on an order."
                      : "Try another decoration type, clear the search, or remove the customer filter."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {filteredDesigns.map((design) => (
                    <DesignGridCard
                      key={design.id}
                      design={design}
                      selected={design.id === designId}
                      onSelect={() => setDesignId(design.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="scrollbar-none flex min-h-0 flex-col gap-4 overflow-y-auto bg-[#fafafa] p-5">
            <DesignPreview design={selectedDesign} />

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Apply to proof
              </p>
              {steps.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#e3e3e3] bg-white px-3 py-4 text-center text-[12px] text-[#8a8a8a]">
                  Add a decoration event on this order first.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {steps.map(({ job, imprint }) => {
                    const key = `${job.id}-${imprint.id}`;
                    const selected = targetKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTargetKey(key)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                          selected
                            ? "border-[#2c6ecb] bg-white ring-1 ring-[#2c6ecb]/20"
                            : "border-[#e3e3e3] bg-white hover:border-[#c9c9c9]"
                        )}
                      >
                        <p className="text-[13px] font-semibold text-[#303030]">
                          {formatImprintOptionLabel(imprint)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
                          {decorationLabel(imprint.decoration)} · {job.name}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "mt-auto h-11 w-full")}
              disabled={!designId || !targetKey || saving}
              onClick={() => void handleApply()}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BookMarked className="size-4" />
              )}
              Apply design
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
