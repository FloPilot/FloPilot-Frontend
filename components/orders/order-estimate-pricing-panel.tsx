"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  Sparkles,
  Tag,
  ToggleLeft,
  Trash2,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShopPresetSelect } from "@/components/orders/shop-preset-select";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import {
  listCustomerRateSheets,
  resolveRateSheetForOrder,
  SHOP_PRICING_SHEET_ID,
} from "@/lib/customer-pricing";
import {
  listShopRateSheets,
  isShopRateSheetId,
} from "@/lib/shop-pricing";
import {
  buildFeeEstimateRows,
  createEstimateAdjustmentId,
  emptyManualAdjustment,
  listAutoContractFeeCandidates,
} from "@/lib/order-contract-fees";
import {
  FEE_CATEGORY_OPTIONS,
  defaultLabelForFeeCategory,
  feeCategoryLabel,
} from "@/lib/estimate-fee-categories";
import {
  buildOrderFeePresets,
  findOrderFeePreset,
  presetOptionsForSelect,
} from "@/lib/order-fee-presets";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatCurrency } from "@/lib/format";
import type {
  Customer,
  Order,
  OrderEstimateAdjustment,
  OrderEstimateFeeCategory,
} from "@/types";
import { cn } from "@/lib/utils";

export function OrderEstimatePricingPanel({
  order,
  customer,
}: {
  order: Order;
  customer?: Customer | null;
}) {
  const { settings } = useShopSettings();
  const { updateOrderEstimatePricing } = useSchedule();
  const [saving, setSaving] = useState(false);
  const [addingFee, setAddingFee] = useState(false);
  const [selectedPresetValue, setSelectedPresetValue] = useState("");
  const [showCustomFeeForm, setShowCustomFeeForm] = useState(false);
  const [draftManual, setDraftManual] = useState<OrderEstimateAdjustment | null>(
    null
  );

  const customerRateSheets = useMemo(
    () => listCustomerRateSheets(customer),
    [customer]
  );

  const shopRateSheets = useMemo(
    () => listShopRateSheets(settings),
    [settings]
  );

  const activeRateSheet = useMemo(
    () => resolveRateSheetForOrder(customer, order, settings),
    [customer, order, settings]
  );

  const selectedRateSheetId = useMemo(() => {
    const current = order.selectedRateSheetId;
    if (current && isShopRateSheetId(settings, current)) {
      if (current === SHOP_PRICING_SHEET_ID) {
        return (
          shopRateSheets.find((sheet) => sheet.isDefault)?.id ??
          shopRateSheets[0]?.id ??
          SHOP_PRICING_SHEET_ID
        );
      }
      return current;
    }
    if (current && customerRateSheets.some((sheet) => sheet.id === current)) {
      return current;
    }
    if (activeRateSheet?.id) return activeRateSheet.id;
    if (customerRateSheets.length > 0) {
      return (
        customerRateSheets.find((sheet) => sheet.isDefault)?.id ??
        customerRateSheets[0].id
      );
    }
    return (
      shopRateSheets.find((sheet) => sheet.isDefault)?.id ??
      shopRateSheets[0]?.id ??
      SHOP_PRICING_SHEET_ID
    );
  }, [
    order.selectedRateSheetId,
    settings,
    shopRateSheets,
    customerRateSheets,
    activeRateSheet?.id,
  ]);

  const selectedRateSheetLabel = useMemo(() => {
    const shopSheet = shopRateSheets.find(
      (entry) => entry.id === selectedRateSheetId
    );
    if (shopSheet) {
      return shopSheet.isDefault
        ? `${shopSheet.name} (shop default)`
        : shopSheet.name;
    }
    const sheet = customerRateSheets.find(
      (entry) => entry.id === selectedRateSheetId
    );
    if (sheet) {
      return sheet.isDefault ? `${sheet.name} (default)` : sheet.name;
    }
    return activeRateSheet?.name ?? "Select pricing";
  }, [
    selectedRateSheetId,
    shopRateSheets,
    customerRateSheets,
    activeRateSheet?.name,
  ]);

  const feePresets = useMemo(
    () =>
      buildOrderFeePresets({
        customer,
        shopMatrix: settings.pricingMatrix,
        shopSettings: settings,
        order,
        selectedRateSheetId,
      }),
    [customer, settings, order, selectedRateSheetId]
  );

  const presetOptions = useMemo(
    () => presetOptionsForSelect(feePresets),
    [feePresets]
  );

  const selectedPreset = useMemo(
    () => findOrderFeePreset(feePresets, selectedPresetValue),
    [feePresets, selectedPresetValue]
  );

  const feeRows = useMemo(
    () => buildFeeEstimateRows(order, customer, settings),
    [order, customer, settings]
  );

  const autoFeeCandidates = useMemo(
    () => listAutoContractFeeCandidates(order, customer, settings),
    [order, customer, settings]
  );

  const manualFees = feeRows.filter((row) => row.source === "manual");
  const excluded = new Set(order.excludedContractFeeIds ?? []);

  const persist = useCallback(
    async (updates: {
      selectedRateSheetId?: string | null;
      estimateAdjustments?: OrderEstimateAdjustment[];
      excludedContractFeeIds?: string[];
    }) => {
      setSaving(true);
      try {
        await updateOrderEstimatePricing(order.id, updates);
      } finally {
        setSaving(false);
      }
    },
    [order.id, updateOrderEstimatePricing]
  );

  const handleRateSheetChange = (value: string | null) => {
    if (!value) return;
    void persist({ selectedRateSheetId: value });
  };

  const toggleAutoFee = (contractFeeId: string) => {
    const next = new Set(excluded);
    if (next.has(contractFeeId)) {
      next.delete(contractFeeId);
    } else {
      next.add(contractFeeId);
    }
    void persist({ excludedContractFeeIds: [...next] });
  };

  const removeManualFee = (id: string) => {
    void persist({
      estimateAdjustments: (order.estimateAdjustments ?? []).filter(
        (row) => row.id !== id
      ),
    });
  };

  const resetAddFeeForm = () => {
    setAddingFee(false);
    setSelectedPresetValue("");
    setShowCustomFeeForm(false);
    setDraftManual(null);
  };

  const applyPreset = (value: string) => {
    setSelectedPresetValue(value);
    setShowCustomFeeForm(false);
    const preset = findOrderFeePreset(feePresets, value);
    if (!preset) return;
    setDraftManual({
      id: createEstimateAdjustmentId(),
      label: preset.feeLabel,
      detail: preset.detail,
      qty: preset.qty,
      unitPrice: preset.unitPrice,
      source: "manual",
      category: preset.category,
      contractFeeId: preset.contractFeeId,
    });
  };

  const saveManualFee = () => {
    if (!draftManual) return;
    const trimmed = draftManual.label.trim();
    if (!trimmed) return;

    void persist({
      estimateAdjustments: [
        ...(order.estimateAdjustments ?? []).filter((row) => row.source === "manual"),
        { ...draftManual, label: trimmed },
      ],
    });
    resetAddFeeForm();
  };

  const setDraftCategory = (category: OrderEstimateFeeCategory) => {
    setDraftManual((current) => {
      const base = current ?? emptyManualAdjustment(category);
      const usingDefault =
        !current?.label ||
        FEE_CATEGORY_OPTIONS.some(
          (option) => option.defaultLabel === current.label
        );
      return {
        ...base,
        category,
        label: usingDefault ? defaultLabelForFeeCategory(category) : base.label,
      };
    });
  };

  const showRateSheetPicker =
    shopRateSheets.length > 1 || customerRateSheets.length > 0;
  const canSaveFee =
    draftManual &&
    draftManual.label.trim() &&
    draftManual.unitPrice >= 0 &&
    draftManual.qty >= 1;

  return (
    <div className={cn(dashboardInsetSurfaceClass, "space-y-5 p-4")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-[#616161]" />
            <h3 className={dashboardTaskTitleClass}>Pricing & contract fees</h3>
            {saving ? <Loader2 className="size-3.5 animate-spin text-[#8a8a8a]" /> : null}
          </div>
          <p className={cn("mt-1", dashboardTaskDetailClass)}>
            Choose which rate sheet applies to this order. Enabled additional
            fees apply automatically — skip any you do not want on this order,
            or add more from saved presets.
          </p>
        </div>
      </div>

      {showRateSheetPicker ? (
        <div className="max-w-md space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Rate sheet
          </Label>
          <Select value={selectedRateSheetId} onValueChange={handleRateSheetChange}>
            <SelectTrigger className={cn(dashboardControlClass, "h-9 w-full")}>
              <SelectValue placeholder="Select pricing">
                {selectedRateSheetLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {shopRateSheets.map((sheet) => (
                <SelectItem key={sheet.id} value={sheet.id}>
                  {sheet.name}
                  {sheet.isDefault ? " (shop default)" : ""}
                </SelectItem>
              ))}
              {customerRateSheets.map((sheet) => (
                <SelectItem key={sheet.id} value={sheet.id}>
                  {sheet.name}
                  {sheet.isDefault ? " (customer default)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {autoFeeCandidates.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Additional fees
          </p>
          <div className="space-y-2">
            {autoFeeCandidates.map((fee) => {
              const excludedFee = fee.contractFeeId
                ? excluded.has(fee.contractFeeId)
                : false;
              const lineTotal = fee.qty * fee.unitPrice;
              return (
                <div
                  key={fee.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5",
                    excludedFee
                      ? "border-[#ebebeb] bg-[#fafafa] opacity-60"
                      : "border-[#dbeafe] bg-[#f8fbff]"
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Sparkles className="size-3.5 shrink-0 text-[#2c6ecb]" />
                      <span className="rounded-md bg-[#eef4ff] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
                        {feeCategoryLabel(fee.category)}
                      </span>
                      <span className="text-[13px] font-medium text-[#303030]">
                        {fee.label}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161] ring-1 ring-[#e3e3e3]">
                        {excludedFee ? "Skipped" : "Auto"}
                      </span>
                    </div>
                    {fee.detail ? (
                      <p className={cn("mt-1 pl-5", dashboardTaskDetailClass)}>
                        {fee.detail}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] tabular-nums text-[#303030]">
                      {excludedFee
                        ? "Not charged"
                        : `${fee.qty} × ${formatCurrency(fee.unitPrice)} = ${formatCurrency(lineTotal)}`}
                    </span>
                    {fee.contractFeeId ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-[12px]"
                        onClick={() => toggleAutoFee(fee.contractFeeId!)}
                      >
                        {excludedFee ? (
                          <>
                            <ToggleLeft className="size-3.5" />
                            Include
                          </>
                        ) : (
                          <>
                            <X className="size-3.5" />
                            Skip
                          </>
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {manualFees.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Additional order fees
          </p>
          {manualFees.map((fee) => (
            <div
              key={fee.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#ebebeb] bg-white px-3 py-2.5"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[#f4f4f4] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
                    {feeCategoryLabel(fee.category)}
                  </span>
                  <p className="text-[13px] font-medium text-[#303030]">
                    {fee.label}
                  </p>
                </div>
                {fee.detail ? (
                  <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                    {fee.detail}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] tabular-nums text-[#303030]">
                  {fee.qty} × {formatCurrency(fee.unitPrice)} ={" "}
                  {formatCurrency(fee.qty * fee.unitPrice)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-[#8f1f1f]"
                  onClick={() => removeManualFee(fee.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {addingFee ? (
        <div className="space-y-4 rounded-lg border border-dashed border-[#d7e3fb] bg-[#f8fbff] p-4">
          {!showCustomFeeForm ? (
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Saved fee
              </Label>
              <ShopPresetSelect
                value={selectedPresetValue}
                options={presetOptions}
                onChange={applyPreset}
                className={cn(dashboardControlClass, "h-9")}
                placeholder={
                  presetOptions.length > 0
                    ? "Select a saved fee…"
                    : "No saved fees yet"
                }
              />
              {presetOptions.length === 0 ? (
                <p className={dashboardTaskDetailClass}>
                  Configure fee presets under Settings → Pricing or on the
                  customer&apos;s negotiated rate sheet.
                </p>
              ) : null}
              <button
                type="button"
                className="text-[12px] font-medium text-[#2c6ecb] hover:underline"
                onClick={() => {
                  setShowCustomFeeForm(true);
                  setSelectedPresetValue("");
                  setDraftManual(emptyManualAdjustment("setup"));
                }}
              >
                Enter custom fee instead
              </button>
            </div>
          ) : null}

          {showCustomFeeForm ? (
            <div className={cn("space-y-3", !showCustomFeeForm || presetOptions.length > 0 ? "border-t border-[#dbeafe] pt-4" : "")}>
              <p className="text-[13px] font-medium text-[#303030]">Custom fee</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Fee type
                  </Label>
                  <Select
                    value={draftManual?.category ?? "setup"}
                    onValueChange={(value) =>
                      value && setDraftCategory(value as OrderEstimateFeeCategory)
                    }
                  >
                    <SelectTrigger className="h-9 w-full rounded-lg border-[#e3e3e3]">
                      <SelectValue>
                        {feeCategoryLabel(draftManual?.category ?? "setup")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {FEE_CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Description
                  </Label>
                  <Input
                    value={draftManual?.label ?? ""}
                    onChange={(event) =>
                      setDraftManual((current) =>
                        current
                          ? { ...current, label: event.target.value }
                          : { ...emptyManualAdjustment("setup"), label: event.target.value }
                      )
                    }
                    placeholder="What is this charge for?"
                    className="h-9 rounded-lg border-[#e3e3e3]"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Qty
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={draftManual?.qty ?? 1}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) =>
                      setDraftManual((current) =>
                        current
                          ? {
                              ...current,
                              qty: Math.max(1, Number(event.target.value) || 1),
                            }
                          : current
                      )
                    }
                    className="h-9 rounded-lg border-[#e3e3e3]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Unit price
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={draftManual?.unitPrice ?? 0}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) =>
                      setDraftManual((current) =>
                        current
                          ? {
                              ...current,
                              unitPrice: Number(event.target.value) || 0,
                            }
                          : current
                      )
                    }
                    className="h-9 rounded-lg border-[#e3e3e3]"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {draftManual && !showCustomFeeForm && selectedPreset ? (
            <div className="rounded-lg border border-[#dbeafe] bg-white px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-[#eef4ff] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
                  {feeCategoryLabel(draftManual.category)}
                </span>
                <span className="text-[13px] font-medium text-[#303030]">
                  {draftManual.label}
                </span>
                <span className="text-[12px] text-[#8a8a8a]">
                  from {selectedPreset.sourceName}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[100px_1fr]">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Qty
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={draftManual.qty}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) =>
                      setDraftManual((current) =>
                        current
                          ? {
                              ...current,
                              qty: Math.max(1, Number(event.target.value) || 1),
                            }
                          : current
                      )
                    }
                    className="h-9 rounded-lg border-[#e3e3e3]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Notes (optional)
                  </Label>
                  <Input
                    value={draftManual.detail ?? ""}
                    onChange={(event) =>
                      setDraftManual((current) =>
                        current ? { ...current, detail: event.target.value } : current
                      )
                    }
                    placeholder="Shown on estimate for customer"
                    className="h-9 rounded-lg border-[#e3e3e3]"
                  />
                </div>
              </div>
              <p className="mt-2 text-[13px] tabular-nums text-[#303030]">
                {draftManual.qty} × {formatCurrency(draftManual.unitPrice)} ={" "}
                <span className="font-semibold">
                  {formatCurrency(draftManual.qty * draftManual.unitPrice)}
                </span>
              </p>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "h-9 px-3 text-[13px]")}
              disabled={!canSaveFee}
              onClick={saveManualFee}
            >
              Add fee
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-2"
              onClick={resetAddFeeForm}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className={cn(dashboardControlClass, "h-9 gap-1.5 px-3 text-[13px]")}
          onClick={() => {
            setAddingFee(true);
            if (presetOptions.length === 0) {
              setShowCustomFeeForm(true);
              setDraftManual(emptyManualAdjustment("setup"));
            }
          }}
        >
          <Plus className="size-3.5" />
          Add order fee
        </Button>
      )}
    </div>
  );
}
