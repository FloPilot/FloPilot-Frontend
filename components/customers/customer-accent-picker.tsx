"use client";

import {
  CUSTOMER_ACCENT_OPTIONS,
  getCustomerAccent,
  isCustomerAccentKey,
  type CustomerAccentKey,
} from "@/lib/production-customer-colors";
import { cn } from "@/lib/utils";

export function CustomerAccentPicker({
  value,
  onChange,
  customerId,
  fallbackKey = "",
}: {
  value?: CustomerAccentKey | null;
  onChange: (value: CustomerAccentKey | null) => void;
  customerId?: string;
  fallbackKey?: string;
}) {
  const autoAccent = getCustomerAccent(customerId, fallbackKey);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[12px] font-medium transition-colors",
            value == null
              ? "border-[#2c6ecb] bg-[#f4f7fd] text-[#2c6ecb]"
              : "border-[#e3e3e3] bg-white text-[#616161] hover:border-[#c9cccf]"
          )}
        >
          <span
            className={cn("size-3 rounded-full", autoAccent.dot)}
            aria-hidden
          />
          Auto
        </button>
        {CUSTOMER_ACCENT_OPTIONS.map((accent) => {
          const selected = value === accent.key;
          return (
            <button
              key={accent.key}
              type="button"
              title={accent.label}
              aria-label={accent.label}
              aria-pressed={selected}
              onClick={() => onChange(accent.key)}
              className={cn(
                "flex size-9 items-center justify-center rounded-lg border transition-all",
                selected
                  ? "border-[#2c6ecb] ring-2 ring-[#2c6ecb]/20"
                  : "border-[#e3e3e3] hover:border-[#c9cccf]"
              )}
            >
              <span
                className={cn("size-5 rounded-md", accent.swatch)}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-[#8a8a8a]">
        Used on production boards and customer lists. Auto picks a consistent
        color from the account name.
      </p>
    </div>
  );
}

export function normalizeAccentPickerValue(
  value: string | null | undefined
): CustomerAccentKey | null {
  return isCustomerAccentKey(value ?? undefined)
    ? (value as CustomerAccentKey)
    : null;
}
