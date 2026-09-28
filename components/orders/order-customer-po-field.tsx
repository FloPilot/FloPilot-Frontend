"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  dashboardControlClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function OrderCustomerPoField({
  order,
  onSave,
  className,
}: {
  order: { id: string; customerPoNumber?: string | null };
  onSave: (customerPoNumber: string) => Promise<void | unknown>;
  className?: string;
}) {
  const [draft, setDraft] = useState(order.customerPoNumber ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(order.customerPoNumber ?? "");
  }, [order.customerPoNumber]);

  const saveIfChanged = async () => {
    const trimmed = draft.trim();
    const current = order.customerPoNumber?.trim() ?? "";
    if (trimmed === current || saving) return;

    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
    }
  };

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
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void saveIfChanged()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            (event.target as HTMLInputElement).blur();
          }
        }}
        placeholder="e.g. PO-10482"
        disabled={saving}
        maxLength={80}
        className={cn(dashboardControlClass, "h-10")}
      />
      <p className={dashboardTaskDetailClass}>
        Optional reference from the customer&apos;s purchase order.
      </p>
    </div>
  );
}
