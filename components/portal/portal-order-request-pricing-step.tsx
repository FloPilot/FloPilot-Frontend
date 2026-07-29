"use client";

import { useMemo, useState, type FocusEvent } from "react";
import { ChevronDown, Layers3, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { PortalEstimateBreakdown } from "@/components/portal/portal-estimate-breakdown";
import {
  FEE_CATEGORY_OPTIONS,
  defaultLabelForFeeCategory,
} from "@/lib/estimate-fee-categories";
import { formatCurrency } from "@/lib/format";
import type {
  OrderRequestEstimateTotals,
  OrderRequestSummary,
} from "@/lib/order-requests";
import type { OrderEstimateFeeCategory } from "@/types";
import { cn } from "@/lib/utils";

export type PortalAutoFee = {
  id: string;
  label: string;
  detail?: string;
  qty: number;
  unitPrice: number;
  category?: string;
  contractFeeId?: string | null;
  skipped?: boolean;
};

export type PortalAvailableFee = {
  id: string;
  kind: string;
  label: string;
  amount: number;
  notes?: string;
  chargeMode?: string;
};

export type PortalManualFee = {
  id: string;
  label: string;
  detail?: string;
  qty: number;
  unitPrice: number;
  category: OrderEstimateFeeCategory;
  source: "manual";
  contractFeeId?: string;
};

const inputClass =
  "h-10 w-full rounded-lg border border-[#ebebeb] bg-white px-3 text-[13px] text-[#303030] outline-none focus:border-[#c9cccf]";
const selectClass = `${inputClass} appearance-none pr-10`;
const labelClass = "mb-1.5 block text-[12px] font-medium text-[#616161]";

function selectOnFocus(event: FocusEvent<HTMLInputElement>) {
  event.currentTarget.select();
}

function createFeeId() {
  return `fee-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function PortalOrderRequestPricingStep({
  accent,
  estimate,
  loading,
  error,
  message,
  pricingReady,
  autoFees,
  availableFees,
  manualFees,
  excludedContractFeeIds,
  onManualFeesChange,
  onExcludedChange,
  blankSource,
  lineItems,
  runCandidates = [],
  runCandidatesLoading = false,
  linkedRequestIds = [],
  onLinkedRequestIdsChange,
}: {
  accent: string;
  estimate: OrderRequestEstimateTotals | null;
  loading?: boolean;
  error?: string | null;
  message?: string | null;
  pricingReady?: boolean;
  autoFees: PortalAutoFee[];
  availableFees: PortalAvailableFee[];
  manualFees: PortalManualFee[];
  excludedContractFeeIds: string[];
  onManualFeesChange: (next: PortalManualFee[]) => void;
  onExcludedChange: (next: string[]) => void;
  blankSource?: "shop_orders" | "customer_supplies";
  lineItems?: {
    brand?: string;
    productName?: string;
    color?: string;
    sizes?: Record<string, number>;
  }[];
  runCandidates?: OrderRequestSummary[];
  runCandidatesLoading?: boolean;
  linkedRequestIds?: string[];
  onLinkedRequestIdsChange?: (next: string[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftDetail, setDraftDetail] = useState("");
  const [draftCategory, setDraftCategory] =
    useState<OrderEstimateFeeCategory>("setup");
  const [draftAmount, setDraftAmount] = useState("0");
  const [draftQty, setDraftQty] = useState("1");

  const totalGoods = useMemo(() => {
    return (lineItems || []).reduce((sum, item) => {
      const sizes = item.sizes || {};
      return (
        sum +
        Object.values(sizes).reduce(
          (inner, qty) => inner + (Number(qty) || 0),
          0
        )
      );
    }, 0);
  }, [lineItems]);

  const linkedCandidates = useMemo(
    () =>
      runCandidates.filter((row) => linkedRequestIds.includes(row.id)),
    [runCandidates, linkedRequestIds]
  );

  const combinedPieces = useMemo(() => {
    const linkedQty = linkedCandidates.reduce(
      (sum, row) => sum + (row.pieceCount || 0),
      0
    );
    return totalGoods + linkedQty;
  }, [linkedCandidates, totalGoods]);

  const toggleLinked = (id: string) => {
    if (!onLinkedRequestIdsChange) return;
    if (linkedRequestIds.includes(id)) {
      onLinkedRequestIdsChange(linkedRequestIds.filter((entry) => entry !== id));
    } else {
      onLinkedRequestIdsChange([...linkedRequestIds, id]);
    }
  };

  const rateLabel = estimate?.usingShopPricing
    ? "Shop rates"
    : estimate?.rateSheetName || "Your negotiated rates";

  const suggestedFees = useMemo(() => {
    const used = new Set(
      manualFees.map((fee) => fee.contractFeeId).filter(Boolean)
    );
    return availableFees.filter((fee) => !used.has(fee.id)).slice(0, 6);
  }, [availableFees, manualFees]);

  const toggleAutoFee = (contractFeeId: string | null | undefined) => {
    if (!contractFeeId) return;
    if (excludedContractFeeIds.includes(contractFeeId)) {
      onExcludedChange(
        excludedContractFeeIds.filter((id) => id !== contractFeeId)
      );
    } else {
      onExcludedChange([...excludedContractFeeIds, contractFeeId]);
    }
  };

  const addSuggested = (fee: PortalAvailableFee) => {
    onManualFeesChange([
      ...manualFees,
      {
        id: createFeeId(),
        label: fee.label,
        detail: fee.notes || undefined,
        qty: 1,
        unitPrice: fee.amount || 0,
        category:
          fee.kind === "setup"
            ? "setup"
            : fee.kind === "additional_location"
              ? "decoration"
              : "other",
        source: "manual",
        contractFeeId: fee.id,
      },
    ]);
  };

  const saveDraft = () => {
    const label = draftLabel.trim() || defaultLabelForFeeCategory(draftCategory);
    const unitPrice = Math.max(0, Number(draftAmount) || 0);
    const qty = Math.max(1, Math.floor(Number(draftQty) || 1));
    onManualFeesChange([
      ...manualFees,
      {
        id: createFeeId(),
        label,
        detail: draftDetail.trim() || undefined,
        qty,
        unitPrice,
        category: draftCategory,
        source: "manual",
      },
    ]);
    setAdding(false);
    setDraftLabel("");
    setDraftDetail("");
    setDraftAmount("0");
    setDraftQty("1");
    setDraftCategory("setup");
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#ebebeb] bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f6f6f7]"
            style={{ color: accent }}
          >
            <Layers3 className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-[#303030]">
              Run with another job?
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[#616161]">
              Link open requests that will print together. Combined quantity can
              unlock a better decoration tier on this estimate.
            </p>
          </div>
        </div>

        {runCandidatesLoading ? (
          <p className="mt-4 flex items-center gap-2 text-[12px] text-[#8a8a8a]">
            <Loader2 className="size-3.5 animate-spin" style={{ color: accent }} />
            Loading open requests…
          </p>
        ) : runCandidates.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-[#ebebeb] bg-[#fafafa] px-3 py-3 text-[12px] text-[#8a8a8a]">
            No other open requests to link yet. You can still submit this one on
            its own, or link jobs later from the requests list.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {runCandidates.map((row) => {
              const selected = linkedRequestIds.includes(row.id);
              return (
                <label
                  key={row.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors",
                    selected
                      ? "border-[#c9cccf] bg-[#fafafa]"
                      : "border-[#ebebeb] bg-white hover:bg-[#fafafa]"
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-1 size-4 rounded border-[#c9cccf]"
                    style={selected ? { accentColor: accent } : undefined}
                    checked={selected}
                    onChange={() => toggleLinked(row.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#303030]">
                        {row.number}
                      </span>
                      {row.customLabel ? (
                        <span className="text-[12px] text-[#616161]">
                          {row.customLabel}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-[#8a8a8a]">
                      {(row.pieceCount || 0).toLocaleString()} pcs
                      {row.subCustomerName
                        ? ` · ${row.subCustomerName}`
                        : ""}
                      {row.inHandsDate ? ` · In-hands ${row.inHandsDate}` : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {linkedCandidates.length > 0 ? (
          <p
            className="mt-3 rounded-xl border px-3 py-2.5 text-[12px] font-medium"
            style={{
              borderColor: `${accent}33`,
              backgroundColor: `${accent}0d`,
              color: accent,
            }}
          >
            Running with {linkedCandidates.length} other job
            {linkedCandidates.length === 1 ? "" : "s"} ·{" "}
            {combinedPieces.toLocaleString()} combined pcs. Pricing below uses
            that combined tier.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[#ebebeb] bg-white px-4 py-4 shadow-sm sm:px-5">
        <h2 className="text-[15px] font-semibold text-[#303030]">Pricing</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[#616161]">
          This is your initial cost from{" "}
          <span className="font-medium text-[#303030]">{rateLabel}</span>.
          Include one-time fees you know you need — setup, neck-label removal,
          bagging, and similar. The shop can still adjust later; every change is
          saved as a versioned estimate.
        </p>
      </section>

      {!pricingReady && !loading ? (
        <section className="rounded-2xl border border-[#f0e2b8] bg-[#fffbeb] px-4 py-4 text-[13px] text-[#7a5b12] sm:px-5">
          {message ||
            "We don’t have enough order details yet to price this from your rate sheet. Add garments, decoration locations, and print colors, then come back here."}
        </section>
      ) : null}

      {pricingReady && message ? (
        <section className="rounded-2xl border border-[#ebebeb] bg-[#fafafa] px-4 py-3 text-[13px] text-[#616161] sm:px-5">
          {message}
        </section>
      ) : null}

      <PortalEstimateBreakdown
        estimate={estimate}
        accent={accent}
        loading={loading}
        error={error}
        blankSource={blankSource}
        lineItems={lineItems}
      />

      <section className="overflow-hidden rounded-2xl border border-[#ebebeb] bg-white shadow-sm">
        <div className="border-b border-[#ebebeb] px-4 py-3 sm:px-5">
          <h3 className="text-[15px] font-semibold text-[#303030]">
            One-time & contract fees
          </h3>
          <p className="mt-0.5 text-[12px] text-[#616161]">
            Skip fees that don’t apply this time, or add extras like neck-label
            removal.
          </p>
        </div>

        <div className="divide-y divide-[#f1f1f1]">
          {autoFees.length === 0 && manualFees.length === 0 ? (
            <p className="px-4 py-5 text-[13px] text-[#8a8a8a] sm:px-5">
              No automatic fees on your rate sheet yet. You can still add a
              one-time fee below.
            </p>
          ) : null}

          {autoFees.map((fee) => {
            const skipped = Boolean(
              fee.contractFeeId &&
                excludedContractFeeIds.includes(fee.contractFeeId)
            );
            return (
              <div
                key={fee.id}
                className={cn(
                  "flex flex-wrap items-start justify-between gap-3 px-4 py-3.5 sm:px-5",
                  skipped && "opacity-55"
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold text-[#303030]">
                      {fee.label}
                    </p>
                    <span className="rounded-md bg-[#ebf4ff] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
                      Auto
                    </span>
                    {fee.category ? (
                      <span className="rounded-md bg-[#f6f6f7] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
                        {fee.category}
                      </span>
                    ) : null}
                  </div>
                  {fee.detail ? (
                    <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                      {fee.detail}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[12px] tabular-nums text-[#616161]">
                    {fee.qty} × {formatCurrency(fee.unitPrice)} ={" "}
                    {formatCurrency(fee.qty * fee.unitPrice)}
                  </p>
                </div>
                {fee.contractFeeId ? (
                  <button
                    type="button"
                    onClick={() => toggleAutoFee(fee.contractFeeId)}
                    className="text-[12px] font-semibold text-[#616161] hover:text-[#303030]"
                  >
                    {skipped ? "Include" : "Skip"}
                  </button>
                ) : null}
              </div>
            );
          })}

          {manualFees.map((fee) => (
            <div
              key={fee.id}
              className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5 sm:px-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-semibold text-[#303030]">
                    {fee.label}
                  </p>
                  <span className="rounded-md bg-[#f6f6f7] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
                    {fee.category}
                  </span>
                </div>
                {fee.detail ? (
                  <p className="mt-0.5 text-[12px] text-[#8a8a8a]">{fee.detail}</p>
                ) : null}
                <p className="mt-1 text-[12px] tabular-nums text-[#616161]">
                  {fee.qty} × {formatCurrency(fee.unitPrice)} ={" "}
                  {formatCurrency(fee.qty * fee.unitPrice)}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onManualFeesChange(manualFees.filter((row) => row.id !== fee.id))
                }
                className="inline-flex size-8 items-center justify-center rounded-lg text-[#8f1f1f] hover:bg-[#fff1f1]"
                aria-label="Remove fee"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t border-[#ebebeb] px-4 py-4 sm:px-5">
          {suggestedFees.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {suggestedFees.map((fee) => (
                <button
                  key={fee.id}
                  type="button"
                  onClick={() => addSuggested(fee)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-[#fafafa] px-2.5 text-[12px] font-medium text-[#303030] hover:bg-white"
                >
                  <Sparkles className="size-3" />
                  {fee.label}
                  {fee.amount > 0 ? ` · ${formatCurrency(fee.amount)}` : ""}
                </button>
              ))}
            </div>
          ) : null}

          {adding ? (
            <div className="space-y-3 rounded-xl border border-[#ebebeb] bg-[#fafafa] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-[#303030]">
                  Add a one-time fee
                </p>
                <div className="flex items-center gap-2">
                  {totalGoods > 0 ? (
                    <p className="rounded-md border border-[#ebebeb] bg-white px-2.5 py-1 text-[12px] text-[#616161]">
                      Total goods{" "}
                      <span className="font-semibold tabular-nums text-[#303030]">
                        {totalGoods.toLocaleString()}
                      </span>
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setAdding(false)}
                    className="inline-flex size-7 items-center justify-center rounded-md text-[#8a8a8a] hover:bg-white"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Category</label>
                  <div className="relative">
                    <select
                      className={selectClass}
                      value={draftCategory}
                      onChange={(e) => {
                        const category = e.target
                          .value as OrderEstimateFeeCategory;
                        setDraftCategory(category);
                        if (
                          !draftLabel.trim() ||
                          FEE_CATEGORY_OPTIONS.some(
                            (opt) => opt.defaultLabel === draftLabel.trim()
                          )
                        ) {
                          setDraftLabel(defaultLabelForFeeCategory(category));
                        }
                      }}
                    >
                      {FEE_CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      aria-hidden
                      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Label</label>
                  <input
                    className={inputClass}
                    value={draftLabel}
                    onChange={(e) => setDraftLabel(e.target.value)}
                    onFocus={selectOnFocus}
                    placeholder="Neck label removal"
                  />
                </div>
                <div>
                  <label className={labelClass}>Amount (each)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={inputClass}
                    value={draftAmount}
                    onChange={(e) => setDraftAmount(e.target.value)}
                    onFocus={selectOnFocus}
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className="text-[12px] font-medium text-[#616161]">
                      Qty
                    </label>
                    {totalGoods > 0 ? (
                      <button
                        type="button"
                        onClick={() => setDraftQty(String(totalGoods))}
                        className="text-[11px] font-semibold hover:underline"
                        style={{ color: accent }}
                      >
                        Use {totalGoods.toLocaleString()} goods
                      </button>
                    ) : null}
                  </div>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className={inputClass}
                    value={draftQty}
                    onChange={(e) => setDraftQty(e.target.value)}
                    onFocus={selectOnFocus}
                  />
                  {totalGoods > 0 ? (
                    <p className="mt-1.5 text-[11px] leading-snug text-[#8a8a8a]">
                      This order has{" "}
                      <span className="font-semibold text-[#616161]">
                        {totalGoods.toLocaleString()} garments
                      </span>
                      . Use that qty if this fee applies to every piece.
                    </p>
                  ) : null}
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Notes (optional)</label>
                  <input
                    className={inputClass}
                    value={draftDetail}
                    onChange={(e) => setDraftDetail(e.target.value)}
                    onFocus={selectOnFocus}
                    placeholder="First order / one-time"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={saveDraft}
                className="inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                Add fee
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAdding(true);
                setDraftLabel(defaultLabelForFeeCategory("setup"));
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-3 text-[13px] font-semibold text-[#303030] hover:bg-[#fafafa]"
            >
              <Plus className="size-3.5" />
              Add one-time fee
            </button>
          )}
        </div>
      </section>

      {loading ? (
        <p className="flex items-center gap-2 text-[12px] text-[#8a8a8a]">
          <Loader2 className="size-3.5 animate-spin" style={{ color: accent }} />
          Updating price…
        </p>
      ) : null}
    </div>
  );
}
