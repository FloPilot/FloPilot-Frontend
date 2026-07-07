"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatOrderDisplayLine } from "@/lib/order-display";
import { dashboardControlClass } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function OrderCustomLabelField({
  orderNumber,
  value,
  onChange,
  id = "order-custom-label",
  className,
}: {
  orderNumber: string;
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-[13px] font-medium text-[#303030]">
        Custom order name{" "}
        <span className="font-normal text-[#8a8a8a]">(optional)</span>
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. LEGENDS SPIRIT OF DRIVING"
        className={cn(dashboardControlClass, "h-10 rounded-lg")}
        maxLength={120}
      />
      <p className="text-[12px] text-[#616161]">
        Shows as{" "}
        <span className="font-medium text-[#303030]">
          {formatOrderDisplayLine({
            number: orderNumber,
            customLabel: value,
          })}
        </span>
        . Calendar events will use this name by default.
      </p>
    </div>
  );
}

export function OrderCustomLabelEditor({
  order,
  onSave,
}: {
  order: { id: string; number: string; customLabel?: string };
  onSave: (customLabel: string) => Promise<void | unknown>;
}) {
  const [draft, setDraft] = useState(order.customLabel ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(order.customLabel ?? "");
  }, [order.customLabel]);

  const saveIfChanged = async () => {
    const trimmed = draft.trim();
    const current = order.customLabel?.trim() ?? "";
    if (trimmed === current || saving) return;

    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-1.5">
      <Label htmlFor={`order-custom-label-${order.id}`} className="sr-only">
        Custom order name
      </Label>
      <Input
        id={`order-custom-label-${order.id}`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void saveIfChanged()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void saveIfChanged();
          }
        }}
        placeholder="Add a custom order name (optional)"
        disabled={saving}
        className={cn(
          dashboardControlClass,
          "h-9 rounded-lg text-[13px] placeholder:text-[#a8a8a8]"
        )}
        maxLength={120}
      />
      <p className="text-[12px] text-[#8a8a8a]">
        {saving
          ? "Saving…"
          : "Used on the calendar by default when scheduling events."}
      </p>
    </div>
  );
}
