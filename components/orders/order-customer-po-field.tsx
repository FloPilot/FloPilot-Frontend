"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dashboardControlClass } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function OrderCustomerPoField({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string;
  onChange: (customerPoNumber: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label
        htmlFor="order-customer-po"
        className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]"
      >
        Customer PO #
      </Label>
      <Input
        id="order-customer-po"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        maxLength={80}
        className={cn(dashboardControlClass, "h-10")}
      />
    </div>
  );
}
