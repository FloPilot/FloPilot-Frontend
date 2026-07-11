"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  LabeledSelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import { sortSubCustomers } from "@/lib/sub-customers";
import type { Order, SubCustomer } from "@/types";
import { cn } from "@/lib/utils";

export function OrderEndBusinessEditor({
  order,
  subCustomers,
  customerId,
  onSave,
  className,
}: {
  order: Pick<Order, "id" | "subCustomerId" | "subCustomerName">;
  subCustomers: SubCustomer[];
  customerId: string;
  onSave: (subCustomerId: string | null) => Promise<void | unknown>;
  className?: string;
}) {
  const sorted = useMemo(() => sortSubCustomers(subCustomers), [subCustomers]);

  const selectItems = useMemo(() => {
    const items = [
      { value: "none", label: "General account order" },
      ...sorted.map((entry) => ({
        value: entry.id,
        label: entry.name,
      })),
    ];

    if (
      order.subCustomerId &&
      !sorted.some((entry) => entry.id === order.subCustomerId)
    ) {
      items.push({
        value: order.subCustomerId,
        label: order.subCustomerName
          ? `${order.subCustomerName} (removed)`
          : "Unknown business (removed)",
      });
    }

    return items;
  }, [sorted, order.subCustomerId, order.subCustomerName]);

  const currentValue = order.subCustomerId || "none";
  const [saving, setSaving] = useState(false);
  const hasSelection = Boolean(order.subCustomerId);

  const handleChange = async (value: string | null) => {
    const nextId = !value || value === "none" ? null : value;
    const currentId = order.subCustomerId ?? null;
    if (nextId === currentId || saving) return;

    setSaving(true);
    try {
      await onSave(nextId);
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
      <span className="shrink-0 font-semibold text-[#303030]">End business</span>
      <Select
        value={currentValue}
        onValueChange={(value) => void handleChange(value)}
        disabled={saving}
      >
        <SelectTrigger
          id={`order-end-business-${order.id}`}
          className={cn(
            "h-7 w-auto max-w-[min(100%,18rem)] gap-1 rounded-md border bg-transparent px-2 text-[13px] shadow-none",
            hasSelection
              ? "border-[#d8d8d8] font-medium text-[#303030]"
              : "border-[#ebebeb] font-normal text-[#8a8a8a] hover:border-[#d8d8d8]",
            "focus-visible:border-[#c4d7f2] focus-visible:ring-2 focus-visible:ring-[#2c6ecb]/10"
          )}
        >
          <LabeledSelectValue
            value={currentValue}
            options={selectItems}
            placeholder="None"
          />
        </SelectTrigger>
        <SelectContent>
          {selectItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {saving ? (
        <span className="text-[12px] text-[#8a8a8a]">Saving…</span>
      ) : (
        <Link
          href={`/app/customers/${customerId}`}
          className="text-[12px] text-[#8a8a8a] transition-colors hover:text-[#2c6ecb]"
        >
          Manage
        </Link>
      )}
    </div>
  );
}
