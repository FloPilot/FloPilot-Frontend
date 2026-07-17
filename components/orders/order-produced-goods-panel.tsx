"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, PackageCheck } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Input } from "@/components/ui/input";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import {
  applyProducedQty,
  confirmProducedGoods,
  countOrderedPieces,
  countProducedPieces,
  hasProducedGoodsVariance,
  mergeOrderProducedGoods,
  PRODUCED_STATUS_STYLES,
  setAllProducedToOrdered,
  varianceCallout,
} from "@/lib/order-produced-goods";
import type { Order, OrderProducedGoodsLine } from "@/types";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";

function QtyProducedInput({
  line,
  saving,
  onSave,
}: {
  line: OrderProducedGoodsLine;
  saving: boolean;
  onSave: (producedQty: number) => void;
}) {
  const [value, setValue] = useState(String(line.producedQty ?? ""));

  useEffect(() => {
    setValue(String(line.producedQty ?? ""));
  }, [line.producedQty]);

  const commit = () => {
    const parsed = Number(value);
    const producedQty =
      Number.isFinite(parsed) && parsed >= 0 ? Math.max(0, Math.floor(parsed)) : 0;
    setValue(String(producedQty));
    if (producedQty !== line.producedQty) {
      onSave(producedQty);
    }
  };

  const delta = line.producedQty - line.orderedQty;

  return (
    <div className="flex flex-col items-end gap-1">
      <Input
        type="number"
        min={0}
        value={value}
        disabled={saving}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className={cn(
          "h-8 w-[80px] rounded-lg border-[#e3e3e3] text-right text-sm tabular-nums",
          delta !== 0 && "border-amber-300 bg-[#fffbeb]"
        )}
      />
      {delta !== 0 ? (
        <span
          className={cn(
            "text-[10px] font-medium",
            delta > 0 ? "text-amber-800" : "text-[#8f1f1f]"
          )}
        >
          {delta > 0 ? `+${delta}` : delta} vs ordered
        </span>
      ) : null}
    </div>
  );
}

export function OrderProducedGoodsPanel({
  order,
  compact = false,
}: {
  order: Order;
  /** Tighter layout for finishing department sheet */
  compact?: boolean;
}) {
  const { updateOrderProducedGoods } = useSchedule();
  const { profile } = useAuth();
  const produced = useMemo(() => mergeOrderProducedGoods(order), [order]);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(produced.notes || "");

  useEffect(() => {
    setNotes(produced.notes || "");
  }, [produced.notes]);

  const callout = varianceCallout(produced);
  const orderedTotal = countOrderedPieces(produced);
  const producedTotal = countProducedPieces(produced);
  const hasVariance = hasProducedGoodsVariance(produced);

  const recorder =
    (profile?.type === "staff" && profile.user.name) ||
    (profile?.type === "staff" && profile.user.email) ||
    "Shop";

  const persist = async (next: ReturnType<typeof mergeOrderProducedGoods>) => {
    setSaving(true);
    try {
      await updateOrderProducedGoods(order.id, next);
    } finally {
      setSaving(false);
    }
  };

  const handleQty = (lineId: string, qty: number) => {
    void persist(applyProducedQty(produced, lineId, qty, recorder));
  };

  const handleMatchOrdered = () => {
    void persist(setAllProducedToOrdered(produced, recorder));
  };

  const handleConfirm = () => {
    void persist({
      ...confirmProducedGoods(produced, recorder),
      notes: notes.trim() || undefined,
    });
  };

  const handleNotesBlur = () => {
    const trimmed = notes.trim();
    if ((produced.notes || "") === trimmed) return;
    void persist({ ...produced, notes: trimmed || undefined });
  };

  if (produced.lines.length === 0) {
    return (
      <section className={dashboardCardClass}>
        <div className="px-4 py-8 text-center sm:px-5">
          <PackageCheck className="mx-auto size-8 text-[#b0b0b0]" />
          <p className={cn("mt-3 font-medium text-[#303030]")}>
            No garments to record yet
          </p>
          <p className={cn("mt-1", dashboardTaskDetailClass)}>
            Add blank line items to this order before tracking produced goods.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {callout ? (
        <div
          className={cn(
            "flex gap-3 rounded-xl border px-4 py-3",
            callout.tone === "match" && "border-[#86d4a8] bg-[#e8f5ee]",
            callout.tone === "over" && "border-amber-300 bg-[#fffbeb]",
            callout.tone === "under" && "border-[#f5b5b5] bg-[#fff1f1]",
            callout.tone === "pending" && "border-[#e3e3e3] bg-[#fafafa]"
          )}
        >
          {callout.tone === "match" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#0d5c2e]" />
          ) : (
            <AlertTriangle
              className={cn(
                "mt-0.5 size-4 shrink-0",
                callout.tone === "under"
                  ? "text-[#8f1f1f]"
                  : callout.tone === "over"
                    ? "text-amber-800"
                    : "text-[#616161]"
              )}
            />
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#303030]">
              {callout.title}
            </p>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              {callout.detail}
            </p>
          </div>
        </div>
      ) : null}

      <section className={dashboardCardClass}>
        <div className="flex flex-col gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h2 className={dashboardTaskTitleClass}>
              {compact ? "Produced goods" : "Produced goods"}
            </h2>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              Enter what the shop actually printed. Counts can be higher or lower
              than ordered — the invoice uses these quantities.
            </p>
            {produced.confirmedAt ? (
              <p className="mt-1 text-[12px] text-[#616161]">
                Confirmed {formatDateTime(produced.confirmedAt)}
                {produced.confirmedBy ? ` · ${produced.confirmedBy}` : ""}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {saving ? (
              <Loader2 className="size-4 animate-spin text-[#616161]" />
            ) : null}
            <button
              type="button"
              disabled={saving}
              onClick={handleMatchOrdered}
              className={cn(
                dashboardControlClass,
                "h-9 px-3 text-[13px] disabled:opacity-60"
              )}
            >
              Match ordered
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleConfirm}
              className={cn(
                dashboardPrimaryButtonClass,
                "h-9 px-3 text-[13px] disabled:opacity-60"
              )}
            >
              Confirm counts
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 border-b border-[#ebebeb] px-4 py-3 text-[13px] sm:px-5">
          <div>
            <span className="text-[#616161]">Ordered</span>{" "}
            <span className="font-semibold tabular-nums text-[#303030]">
              {orderedTotal}
            </span>
          </div>
          <div>
            <span className="text-[#616161]">Produced</span>{" "}
            <span className="font-semibold tabular-nums text-[#303030]">
              {producedTotal}
            </span>
          </div>
          {hasVariance ? (
            <div>
              <span className="text-[#616161]">Delta</span>{" "}
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  producedTotal - orderedTotal > 0
                    ? "text-amber-900"
                    : "text-[#8f1f1f]"
                )}
              >
                {producedTotal - orderedTotal > 0 ? "+" : ""}
                {producedTotal - orderedTotal}
              </span>
            </div>
          ) : null}
        </div>

        <div className={cn(dashboardInsetSurfaceClass, "m-4 overflow-hidden sm:m-5")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-[#ebebeb] bg-[#fafafa]">
                  <th className="px-4 py-2.5 text-left font-medium text-[#616161]">
                    Product
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-[#616161]">
                    Size
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                    Ordered
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                    Produced
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {produced.lines.map((line) => {
                  const style = PRODUCED_STATUS_STYLES[line.status];
                  const delta = line.producedQty - line.orderedQty;
                  return (
                    <tr
                      key={line.id}
                      className={cn(
                        "border-b border-[#ebebeb] last:border-0",
                        delta !== 0 && "bg-[#fffdf5]"
                      )}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#303030]">
                          {[line.brand, line.productName].filter(Boolean).join(" · ") ||
                            "Item"}
                        </p>
                        {line.color ? (
                          <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                            {line.color}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 font-semibold text-[#303030]">
                        {line.size}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-[#303030]">
                        {line.orderedQty}
                      </td>
                      <td className="px-3 py-3">
                        <QtyProducedInput
                          line={line}
                          saving={saving}
                          onSave={(qty) => handleQty(line.id, qty)}
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          className={cn(
                            "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium",
                            style.badge
                          )}
                        >
                          {style.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {!compact ? (
          <div className="border-t border-[#ebebeb] px-4 py-4 sm:px-5">
            <label className="text-[13px] font-medium text-[#303030]">
              Production notes
            </label>
            <p className={cn("mt-0.5 mb-2", dashboardTaskDetailClass)}>
              Optional — why counts differ, overs left in stock, customer notes, etc.
            </p>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onBlur={handleNotesBlur}
              rows={2}
              disabled={saving}
              placeholder="e.g. Printed 12 extras for stock / customer requested extras"
              className="w-full resize-none rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] text-[#303030] outline-none focus:border-brand-primary"
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}

/** Compact banner for order header when produced ≠ ordered */
export function OrderProducedGoodsCallout({ order }: { order: Order }) {
  const produced = useMemo(() => mergeOrderProducedGoods(order), [order]);
  const callout = varianceCallout(produced);
  if (!callout || callout.tone === "pending" || callout.tone === "match") {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-[13px]",
        callout.tone === "over" && "border-amber-300 bg-[#fffbeb] text-amber-950",
        callout.tone === "under" && "border-[#f5b5b5] bg-[#fff1f1] text-[#5c1010]"
      )}
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      <div>
        <p className="font-semibold">{callout.title}</p>
        <p className="mt-0.5 opacity-90">{callout.detail}</p>
      </div>
    </div>
  );
}
