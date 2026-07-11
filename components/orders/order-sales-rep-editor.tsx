"use client";

import { useState } from "react";
import { StaffRepSelect } from "@/components/staff/staff-rep-select";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

export function OrderSalesRepEditor({
  order,
  onSave,
  className,
}: {
  order: Pick<Order, "id" | "salesRepId" | "salesRepName">;
  onSave: (salesRepId: string | null) => Promise<void | unknown>;
  className?: string;
}) {
  const [saving, setSaving] = useState(false);
  const hasSelection = Boolean(order.salesRepId);

  const handleChange = async (salesRepId: string | null) => {
    const currentId = order.salesRepId ?? null;
    if (salesRepId === currentId || saving) return;

    setSaving(true);
    try {
      await onSave(salesRepId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px]",
        className
      )}
    >
      <span className="shrink-0 font-semibold text-[#303030]">Sales rep</span>
      <StaffRepSelect
        id={`order-sales-rep-${order.id}`}
        value={order.salesRepId}
        onChange={handleChange}
        disabled={saving}
        placeholder="None"
        triggerClassName={cn(
          "h-7 w-auto max-w-[min(100%,18rem)] gap-1 rounded-md border bg-transparent px-2 text-[13px] shadow-none",
          hasSelection
            ? "border-[#d8d8d8] font-medium text-[#303030]"
            : "border-[#ebebeb] font-normal text-[#8a8a8a] hover:border-[#d8d8d8]",
          "focus-visible:border-[#c4d7f2] focus-visible:ring-2 focus-visible:ring-[#2c6ecb]/10"
        )}
      />
      {saving ? (
        <span className="text-[12px] text-[#8a8a8a]">Saving…</span>
      ) : null}
    </div>
  );
}
