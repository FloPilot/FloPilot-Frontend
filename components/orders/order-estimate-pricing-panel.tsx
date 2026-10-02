"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterUnsavedChanges } from "@/components/layout/staff-unsaved-changes-provider";
import { ShopPresetSelect } from "@/components/orders/shop-preset-select";
import { PricingMatrixEditor } from "@/components/pricing/pricing-matrix-editor";
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
  applyOneTimeRateSheetEdits,
  buildOneTimeRateSheet,
  isOneTimeRateSheetId,
  ONE_TIME_RATE_SHEET_ID,
  oneTimeRateSheetSummary,
  oneTimeSheetAsEditableMatrix,
} from "@/lib/order-one-time-rate-sheet";
import {
  buildFeeEstimateRows,
  createEstimateAdjustmentId,
  emptyManualAdjustment,
  isContractFeeDeselected,
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
  OrderOneTimeRateSheet,
} from "@/types";
import { cn } from "@/lib/utils";

export type OrderEstimatePricingDraft = {
  selectedRateSheetId: string | null;
  estimateOneTimeRateSheet: OrderOneTimeRateSheet | null;
  estimateAdjustments: OrderEstimateAdjustment[];
  /** Explicit skip list. `null` = never configured → all fees deselected. */
  excludedContractFeeIds: string[] | null;
};

export function OrderEstimatePricingPanel({
  order,
  customer,
  onPersist,
  onDraftChange,
  readOnly = false,
}: {
  order: Order;
  customer?: Customer | null;
  /** When set, used instead of updateOrderEstimatePricing (order-request mode). */
  onPersist?: (updates: {
    selectedRateSheetId?: string | null;
    estimateOneTimeRateSheet?: OrderOneTimeRateSheet | null;
    estimateAdjustments?: OrderEstimateAdjustment[];
    excludedContractFeeIds?: string[];
  }) => Promise<void>;
  /** Live draft for estimate preview (totals + pricing matrix) before save. */
  onDraftChange?: (draft: OrderEstimatePricingDraft) => void;
  readOnly?: boolean;
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
  const [draft, setDraft] = useState<OrderEstimatePricingDraft>({
    selectedRateSheetId: order.selectedRateSheetId ?? null,
    estimateOneTimeRateSheet: order.estimateOneTimeRateSheet ?? null,
    estimateAdjustments: order.estimateAdjustments ?? [],
    excludedContractFeeIds: Array.isArray(order.excludedContractFeeIds)
      ? order.excludedContractFeeIds
      : null,
  });

  useEffect(() => {
    setDraft({
      selectedRateSheetId: order.selectedRateSheetId ?? null,
      estimateOneTimeRateSheet: order.estimateOneTimeRateSheet ?? null,
      estimateAdjustments: order.estimateAdjustments ?? [],
      excludedContractFeeIds: Array.isArray(order.excludedContractFeeIds)
        ? order.excludedContractFeeIds
        : null,
    });
  }, [
    order.id,
    order.selectedRateSheetId,
    order.estimateOneTimeRateSheet,
    order.estimateAdjustments,
    order.excludedContractFeeIds,
  ]);

  useEffect(() => {
    onDraftChange?.(draft);
  }, [draft, onDraftChange]);

  const workingOrder = useMemo(
    () => ({
      ...order,
      selectedRateSheetId: draft.selectedRateSheetId,
      estimateOneTimeRateSheet: draft.estimateOneTimeRateSheet,
      estimateAdjustments: draft.estimateAdjustments,
      excludedContractFeeIds: draft.excludedContractFeeIds ?? undefined,
    }),
    [order, draft]
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
    () => resolveRateSheetForOrder(customer, workingOrder, settings),
    [customer, workingOrder, settings]
  );

  const selectedRateSheetId = useMemo(() => {
    const current = workingOrder.selectedRateSheetId;
    if (isOneTimeRateSheetId(current) && workingOrder.estimateOneTimeRateSheet) {
      return ONE_TIME_RATE_SHEET_ID;
    }
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
    workingOrder.selectedRateSheetId,
    workingOrder.estimateOneTimeRateSheet,
    settings,
    shopRateSheets,
    customerRateSheets,
    activeRateSheet?.id,
  ]);

  const oneTimeActive = isOneTimeRateSheetId(selectedRateSheetId);
  const oneTimeSheet = draft.estimateOneTimeRateSheet;

  const selectedRateSheetLabel = useMemo(() => {
    if (oneTimeActive && oneTimeSheet) {
      return oneTimeSheet.name || "One-time override";
    }
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
    oneTimeActive,
    oneTimeSheet,
    selectedRateSheetId,
    shopRateSheets,
    customerRateSheets,
    activeRateSheet?.name,
  ]);

  const defaultFallbackSheetId = useMemo(() => {
    return (
      shopRateSheets.find((sheet) => sheet.isDefault)?.id ??
      shopRateSheets[0]?.id ??
      customerRateSheets.find((sheet) => sheet.isDefault)?.id ??
      customerRateSheets[0]?.id ??
      SHOP_PRICING_SHEET_ID
    );
  }, [shopRateSheets, customerRateSheets]);

  const feePresets = useMemo(
    () =>
      buildOrderFeePresets({
        customer,
        shopMatrix: settings.pricingMatrix,
        shopSettings: settings,
        order: workingOrder,
        selectedRateSheetId,
      }),
    [customer, settings, workingOrder, selectedRateSheetId]
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
    () => buildFeeEstimateRows(workingOrder, customer, settings),
    [workingOrder, customer, settings]
  );

  const autoFeeCandidates = useMemo(
    () => listAutoContractFeeCandidates(workingOrder, customer, settings),
    [workingOrder, customer, settings]
  );

  const autoFeeCandidateIds = useMemo(
    () =>
      autoFeeCandidates
        .map((fee) => fee.contractFeeId)
        .filter((id): id is string => Boolean(id)),
    [autoFeeCandidates]
  );

  const manualFees = feeRows.filter((row) => row.source === "manual");

  const isDirty = useMemo(() => {
    const normalizeExcluded = (ids: string[] | null | undefined) => {
      if (!Array.isArray(ids)) {
        // Unset and "all deselected" are the same effective default.
        return [...autoFeeCandidateIds].sort();
      }
      return [...ids].sort();
    };
    return (
      JSON.stringify({
        selectedRateSheetId: draft.selectedRateSheetId,
        estimateOneTimeRateSheet: draft.estimateOneTimeRateSheet,
        estimateAdjustments: draft.estimateAdjustments,
        excludedContractFeeIds: normalizeExcluded(draft.excludedContractFeeIds),
      }) !==
      JSON.stringify({
        selectedRateSheetId: order.selectedRateSheetId ?? null,
        estimateOneTimeRateSheet: order.estimateOneTimeRateSheet ?? null,
        estimateAdjustments: order.estimateAdjustments ?? [],
        excludedContractFeeIds: normalizeExcluded(order.excludedContractFeeIds),
      })
    );
  }, [
    draft,
    order.selectedRateSheetId,
    order.estimateOneTimeRateSheet,
    order.estimateAdjustments,
    order.excludedContractFeeIds,
    autoFeeCandidateIds,
  ]);

  const discardChanges = useCallback(() => {
    setDraft({
      selectedRateSheetId: order.selectedRateSheetId ?? null,
      estimateOneTimeRateSheet: order.estimateOneTimeRateSheet ?? null,
      estimateAdjustments: order.estimateAdjustments ?? [],
      excludedContractFeeIds: Array.isArray(order.excludedContractFeeIds)
        ? order.excludedContractFeeIds
        : null,
    });
    setAddingFee(false);
    setSelectedPresetValue("");
    setShowCustomFeeForm(false);
    setDraftManual(null);
  }, [
    order.selectedRateSheetId,
    order.estimateOneTimeRateSheet,
    order.estimateAdjustments,
    order.excludedContractFeeIds,
  ]);

  const saveChanges = useCallback(async () => {
    if (readOnly || !isDirty) return;
    setSaving(true);
    try {
      const updates = {
        selectedRateSheetId: draft.selectedRateSheetId,
        estimateOneTimeRateSheet: draft.estimateOneTimeRateSheet,
        estimateAdjustments: draft.estimateAdjustments,
        excludedContractFeeIds: draft.excludedContractFeeIds ?? undefined,
      };
      if (onPersist) {
        await onPersist(updates);
      } else {
        await updateOrderEstimatePricing(order.id, updates);
      }
    } finally {
      setSaving(false);
    }
  }, [
    readOnly,
    isDirty,
    draft,
    onPersist,
    order.id,
    updateOrderEstimatePricing,
  ]);

  useRegisterUnsavedChanges(
    !readOnly && (isDirty || saving)
      ? {
          dirty: true,
          saving,
          label: "Unsaved estimate pricing",
          persistAcrossTabs: true,
          onSave: () => saveChanges(),
          onDiscard: discardChanges,
        }
      : null,
    `order-estimate-pricing-${order.id}`
  );

  const activateOneTimeOverride = useCallback(
    (
      baseSheetId?: string | null,
      options?: { preserveEdits?: boolean }
    ) => {
      const preserve = options?.preserveEdits !== false;
      const baseId =
        baseSheetId ??
        (isOneTimeRateSheetId(draft.selectedRateSheetId)
          ? draft.estimateOneTimeRateSheet?.baseSheetId
          : draft.selectedRateSheetId) ??
        defaultFallbackSheetId;
      const next = buildOneTimeRateSheet({
        baseSheetId: baseId,
        settings,
        customer,
        existing: preserve ? draft.estimateOneTimeRateSheet : null,
        name: draft.estimateOneTimeRateSheet?.name,
        blankMarkupPercent: preserve
          ? draft.estimateOneTimeRateSheet?.blankMarkupPercent
          : undefined,
        decorationRateAdjustPercent: preserve
          ? draft.estimateOneTimeRateSheet?.decorationRateAdjustPercent
          : 0,
      });
      setDraft((current) => ({
        ...current,
        selectedRateSheetId: ONE_TIME_RATE_SHEET_ID,
        estimateOneTimeRateSheet: next,
      }));
    },
    [
      draft.selectedRateSheetId,
      draft.estimateOneTimeRateSheet,
      defaultFallbackSheetId,
      settings,
      customer,
    ]
  );

  const handleRateSheetChange = (value: string | null) => {
    if (!value) return;
    if (isOneTimeRateSheetId(value)) {
      if (draft.estimateOneTimeRateSheet) {
        setDraft((current) => ({
          ...current,
          selectedRateSheetId: ONE_TIME_RATE_SHEET_ID,
        }));
        return;
      }
      activateOneTimeOverride(undefined, { preserveEdits: false });
      return;
    }
    setDraft((current) => ({ ...current, selectedRateSheetId: value }));
  };

  const clearOneTimeOverride = () => {
    const fallback =
      draft.estimateOneTimeRateSheet?.baseSheetId ?? defaultFallbackSheetId;
    setDraft((current) => ({
      ...current,
      selectedRateSheetId: fallback,
      estimateOneTimeRateSheet: null,
    }));
  };

  const updateOneTimeField = (
    edits: Parameters<typeof applyOneTimeRateSheetEdits>[1]
  ) => {
    setDraft((current) => {
      if (!current.estimateOneTimeRateSheet) return current;
      return {
        ...current,
        estimateOneTimeRateSheet: applyOneTimeRateSheetEdits(
          current.estimateOneTimeRateSheet,
          edits
        ),
      };
    });
  };

  const resetOneTimeFromBase = (baseSheetId: string) => {
    activateOneTimeOverride(baseSheetId, { preserveEdits: false });
  };

  const toggleAutoFee = (contractFeeId: string) => {
    setDraft((current) => {
      const baseline = Array.isArray(current.excludedContractFeeIds)
        ? current.excludedContractFeeIds
        : autoFeeCandidateIds;
      const next = new Set(baseline);
      if (next.has(contractFeeId)) {
        next.delete(contractFeeId);
      } else {
        next.add(contractFeeId);
      }
      return { ...current, excludedContractFeeIds: [...next] };
    });
  };

  const removeManualFee = (id: string) => {
    setDraft((current) => ({
      ...current,
      estimateAdjustments: current.estimateAdjustments.filter(
        (row) => row.id !== id
      ),
    }));
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

    setDraft((current) => ({
      ...current,
      estimateAdjustments: [
        ...current.estimateAdjustments.filter((row) => row.source === "manual"),
        { ...draftManual, label: trimmed },
      ],
    }));
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

  const canSaveFee =
    draftManual &&
    draftManual.label.trim() &&
    draftManual.unitPrice >= 0 &&
    draftManual.qty >= 1;

  const oneTimeBlankDraft = String(oneTimeSheet?.blankMarkupPercent ?? 0);
  const oneTimeMatrix = useMemo(
    () =>
      oneTimeSheet ? oneTimeSheetAsEditableMatrix(oneTimeSheet) : null,
    [oneTimeSheet]
  );
  const currency = settings.companyProfile?.currency || "USD";

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
            Choose which rate sheet sets fees and blank markup. Need different
            numbers for this order only? Use a one-time override — shop and
            customer sheets stay unchanged.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="max-w-xl space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Rate sheet
          </Label>
          <Select
            value={selectedRateSheetId}
            onValueChange={handleRateSheetChange}
            disabled={readOnly || saving}
          >
            <SelectTrigger className={cn(dashboardControlClass, "h-9 w-full")}>
              <SelectValue placeholder="Select pricing">
                {selectedRateSheetLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
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
              <SelectSeparator />
              <SelectItem value={ONE_TIME_RATE_SHEET_ID}>
                {oneTimeSheet
                  ? "One-time override (this order)"
                  : "One-time override…"}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {oneTimeActive && oneTimeSheet && oneTimeMatrix ? (
          <div className="w-full rounded-xl border border-[#d7e3fb] bg-[#f7f9fd] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-3.5 text-[#2c6ecb]" />
                  <p className="text-[13px] font-semibold text-[#1a1a1a]">
                    One-time pricing
                  </p>
                </div>
                <p className={cn("mt-1", dashboardTaskDetailClass)}>
                  Build unit costs for this order only — same as a rate sheet,
                  without changing shop or customer pricing.{" "}
                  {oneTimeRateSheetSummary(oneTimeSheet)}.
                </p>
              </div>
              {!readOnly ? (
                <button
                  type="button"
                  onClick={clearOneTimeOverride}
                  disabled={saving}
                  className={cn(
                    dashboardControlClass,
                    "inline-flex h-8 items-center gap-1.5 px-2.5 text-[12px] text-[#616161]"
                  )}
                >
                  <X className="size-3.5" />
                  Clear override
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Override name
                </Label>
                <Input
                  value={oneTimeSheet.name}
                  disabled={readOnly || saving}
                  onChange={(event) =>
                    updateOneTimeField({ name: event.target.value })
                  }
                  placeholder="e.g. Single shirt rush"
                  className="h-9 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Blank markup
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={500}
                    step={0.1}
                    value={oneTimeBlankDraft}
                    disabled={readOnly || saving}
                    onChange={(event) =>
                      updateOneTimeField({
                        blankMarkupPercent: Number(event.target.value),
                      })
                    }
                    className="h-9 bg-white pr-7 text-right tabular-nums"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#8a8a8a]">
                    %
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Copy from sheet
                </Label>
                <Select
                  value={oneTimeSheet.baseSheetId ?? defaultFallbackSheetId}
                  onValueChange={(value) => {
                    if (value) resetOneTimeFromBase(value);
                  }}
                  disabled={readOnly || saving}
                >
                  <SelectTrigger
                    className={cn(dashboardControlClass, "h-9 w-full bg-white")}
                  >
                    <SelectValue placeholder="Optional seed">
                      {oneTimeSheet.baseSheetName || "Shop standard"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start" alignItemWithTrigger={false}>
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
                <p className="text-[11px] text-[#8a8a8a]">
                  Optional — recopies rates into this override so you can edit
                  them.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[#e3e3e3] bg-white p-3 sm:p-4">
              <div className="mb-3">
                <p className="text-[13px] font-semibold text-[#1a1a1a]">
                  Decoration rates
                </p>
                <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                  Enter cost / unit by quantity tier — same editor as your rate
                  sheets.
                </p>
              </div>
              <PricingMatrixEditor
                value={oneTimeMatrix}
                disabled={readOnly || saving}
                currency={currency}
                productionDefaults={settings.productionDefaults}
                onChange={(matrix) =>
                  updateOneTimeField({
                    methods: matrix.methods,
                    decorationRateAdjustPercent: 0,
                  })
                }
              />
            </div>
          </div>
        ) : null}
      </div>

      {autoFeeCandidates.length > 0 ? (
        <div className="space-y-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Additional fees
            </p>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              Off by default — add only the fees that apply to this order.
            </p>
          </div>
          <div className="space-y-2">
            {autoFeeCandidates.map((fee) => {
              const excludedFee = fee.contractFeeId
                ? isContractFeeDeselected(workingOrder, fee.contractFeeId)
                : true;
              const lineTotal = fee.qty * fee.unitPrice;
              return (
                <div
                  key={fee.id}
                  className={cn(
                    "relative z-0 flex flex-wrap items-center justify-between gap-3 scroll-mt-20 rounded-lg border px-3 py-2.5",
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
                        {excludedFee ? "Available" : "Added"}
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
                        className="relative z-20 h-8 px-2 text-[12px]"
                        onClick={() => toggleAutoFee(fee.contractFeeId!)}
                        disabled={readOnly || saving}
                      >
                        {excludedFee ? (
                          <>
                            <Plus className="size-3.5" />
                            Add
                          </>
                        ) : (
                          <>
                            <X className="size-3.5" />
                            Remove
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
                    <SelectContent align="start" alignItemWithTrigger={false}>
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
      ) : !readOnly ? (
        <Button
          type="button"
          variant="outline"
          className={cn(dashboardControlClass, "h-9 gap-1.5 px-3 text-[13px]")}
          disabled={saving}
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
      ) : null}
    </div>
  );
}
