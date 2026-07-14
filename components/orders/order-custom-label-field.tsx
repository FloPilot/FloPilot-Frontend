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
        placeholder="e.g. CUSTOM NAME"
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
  className,
}: {
  order: { id: string; number: string; customLabel?: string };
  onSave: (customLabel: string) => Promise<void | unknown>;
  className?: string;
}) {
  const [draft, setDraft] = useState(order.customLabel ?? "");
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState(false);

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

  const hasValue = Boolean(draft.trim());

  return (
    <div className={cn("min-w-0 w-[min(100%,20rem)] sm:w-[22rem]", className)}>
      <Label htmlFor={`order-custom-label-${order.id}`} className="sr-only">
        Custom order name
      </Label>
      <input
        id={`order-custom-label-${order.id}`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          void saveIfChanged();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            (event.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Custom order name (optional)"
        disabled={saving}
        maxLength={120}
        className={cn(
          "h-8 w-full rounded-md border bg-transparent px-2.5 text-[13px] font-medium outline-none transition-colors",
          "placeholder:font-normal placeholder:text-[#b0b0b0]",
          focused || hasValue
            ? "border-[#d8d8d8] text-[#303030]"
            : "border-[#ebebeb] text-[#8a8a8a] hover:border-[#d8d8d8]",
          "focus:border-[#c4d7f2] focus:bg-white focus:text-[#303030] focus:ring-2 focus:ring-[#2c6ecb]/10",
          saving && "opacity-60"
        )}
      />
    </div>
  );
}
