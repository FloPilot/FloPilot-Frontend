"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Layers3, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  countOrderPieces,
  productionRunCompanions,
  productionRunMemberLabel,
} from "@/lib/order-production-run";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

export function OrderProductionRunEditor({
  order,
  orders,
  onSave,
}: {
  order: Order;
  orders: Order[];
  onSave: (linkedOrderIds: string[]) => Promise<unknown>;
}) {
  const companions = productionRunCompanions(order);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(
    companions.map((member) => member.orderId)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelected(companions.map((member) => member.orderId));
      setQuery("");
      setError(null);
    }
  }, [open, order.productionRun?.updatedAt]);

  const candidates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders
      .filter(
        (candidate) =>
          candidate.id !== order.id &&
          candidate.customerId === order.customerId &&
          !candidate.archived
      )
      .filter((candidate) => {
        if (!needle) return true;
        return (
          candidate.number.toLowerCase().includes(needle) ||
          candidate.customLabel?.toLowerCase().includes(needle)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [orders, order.id, order.customerId, query]);

  const selectedOrders = selected
    .map((id) => orders.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is Order => Boolean(candidate));
  const combinedQuantity =
    countOrderPieces(order) +
    selectedOrders.reduce(
      (total, candidate) => total + countOrderPieces(candidate),
      0
    );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(selected);
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update this run."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-[13px]">
        <span className="shrink-0 font-semibold text-[#303030]">
          Multi-job run
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border px-2 text-[12px] transition-colors",
            companions.length
              ? "border-[#bfd8c8] bg-[#f2f8f4] font-medium text-[#245c3c]"
              : "border-[#ebebeb] text-[#8a8a8a] hover:border-[#d8d8d8] hover:text-[#303030]"
          )}
        >
          <Layers3 className="size-3.5" />
          {companions.length
            ? `${order.productionRun?.members.length} orders · ${order.productionRun?.combinedQuantity.toLocaleString()} pcs`
            : "Add orders"}
        </button>
        {companions.slice(0, 3).map((member) => (
          <Link
            key={member.orderId}
            href={`/app/orders/${member.orderId}`}
            className="truncate text-[12px] font-medium text-[#2c6ecb] hover:underline"
          >
            {productionRunMemberLabel(member)}
          </Link>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers3 className="size-5 text-[#2d6a4f]" />
              Multi-job run
            </DialogTitle>
            <DialogDescription>
              Link orders for this customer that will run together. The combined
              piece count selects the pricing tier; every order keeps its own
              quantities, estimate, invoice, and fulfillment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-[#cfe3d6] bg-[#f4faf6] px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold text-[#245c3c]">
                    Combined pricing quantity
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#52705d]">
                    {selected.length + 1} order
                    {selected.length === 0 ? "" : "s"} in this run
                  </p>
                </div>
                <p className="text-lg font-semibold tabular-nums text-[#245c3c]">
                  {combinedQuantity.toLocaleString()} pcs
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by order number or custom order name…"
                className="h-10 pl-9"
              />
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-[#e3e3e3]">
              {candidates.length ? (
                candidates.map((candidate) => {
                  const active = selected.includes(candidate.id);
                  const inAnotherRun =
                    Boolean(candidate.productionRun?.id) &&
                    candidate.productionRun?.id !== order.productionRun?.id;
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      disabled={inAnotherRun}
                      onClick={() =>
                        setSelected((current) =>
                          active
                            ? current.filter((id) => id !== candidate.id)
                            : [...current, candidate.id]
                        )
                      }
                      className={cn(
                        "flex w-full items-center gap-3 border-b border-[#f0f0f0] px-3 py-3 text-left last:border-b-0",
                        active ? "bg-[#f4faf6]" : "hover:bg-[#fafafa]",
                        inAnotherRun && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded border",
                          active
                            ? "border-[#2d6a4f] bg-[#2d6a4f] text-white"
                            : "border-[#cfcfcf] bg-white"
                        )}
                      >
                        {active ? <Check className="size-3.5" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-[#303030]">
                          {candidate.number}
                          {candidate.customLabel?.trim()
                            ? ` — ${candidate.customLabel.trim()}`
                            : ""}
                        </span>
                        <span className="block text-[12px] text-[#616161]">
                          {countOrderPieces(candidate).toLocaleString()} pcs
                          {inAnotherRun ? " · Already in another run" : ""}
                        </span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center text-[13px] text-[#8a8a8a]">
                  No matching orders for this customer.
                </div>
              )}
            </div>

            {selected.length ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedOrders.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() =>
                      setSelected((current) =>
                        current.filter((id) => id !== candidate.id)
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-full bg-[#eef4fb] px-2.5 py-1 text-[11px] font-medium text-[#2c6ecb]"
                  >
                    {candidate.number}
                    <X className="size-3" />
                  </button>
                ))}
              </div>
            ) : null}

            {error ? (
              <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[12px] text-[#8f1f1f]">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {selected.length ? "Save multi-job run" : "Remove run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
