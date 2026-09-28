"use client";

import { UserRound } from "lucide-react";
import { StaffRepSelect } from "@/components/staff/staff-rep-select";
import {
  dashboardCardClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function CustomerSalesRepSection({
  salesRepId,
  onChange,
  className,
}: {
  salesRepId?: string | null;
  onChange: (salesRepId: string | null) => void;
  className?: string;
}) {
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
        <div className={cn(dashboardInsetSurfaceClass, "max-w-md rounded-lg p-3.5")}>
          <StaffRepSelect
            id="customer-sales-rep"
            value={salesRepId ?? undefined}
            onChange={onChange}
          />
        </div>
      </div>
    </section>
  );
}
