"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { StaffRepSelect } from "@/components/staff/staff-rep-select";
import {
  dashboardCardClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import type { Customer } from "@/types";
import { cn } from "@/lib/utils";

export function CustomerSalesRepSection({
  customer,
  onSave,
  className,
}: {
  customer: Customer;
  onSave: (salesRepId: string | null) => Promise<void>;
  className?: string;
}) {
  const [saving, setSaving] = useState(false);

  const handleChange = async (salesRepId: string | null) => {
    const current = customer.salesRepId ?? null;
    if (salesRepId === current || saving) return;
    setSaving(true);
    try {
      await onSave(salesRepId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={cn(dashboardCardClass, className)}>
      <div className="border-b border-[#ebebeb] px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#303030]">
          <UserRound className="size-4 text-[#2c6ecb]" />
          Sales rep
        </h2>
        <p className={cn("mt-1", dashboardTaskDetailClass)}>
          Default rep for new orders on this account. Order-level assignments
          can still be changed per order.
        </p>
      </div>
      <div className="p-4 sm:p-5">
        <div
          className={cn(dashboardInsetSurfaceClass, "max-w-md space-y-2 rounded-lg p-3.5")}
        >
          <StaffRepSelect
            id={`customer-sales-rep-${customer.id}`}
            value={customer.salesRepId}
            onChange={handleChange}
            disabled={saving}
          />
          {saving ? (
            <p className={dashboardTaskDetailClass}>Saving…</p>
          ) : customer.salesRepName ? (
            <p className={dashboardTaskDetailClass}>
              Currently <span className="font-medium text-[#303030]">{customer.salesRepName}</span>
            </p>
          ) : (
            <p className={dashboardTaskDetailClass}>No default rep assigned.</p>
          )}
        </div>
      </div>
    </section>
  );
}
