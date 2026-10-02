"use client";

import { Plus } from "lucide-react";
import {
  orderHeaderComboAddClass,
  orderHeaderComboShellClass,
  orderHeaderFieldLabelClass,
} from "@/lib/order-addresses";
import { cn } from "@/lib/utils";

/** Label + control stack used across order header editors. */
export function OrderHeaderField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className={orderHeaderFieldLabelClass}>{label}</span>
      {children}
    </div>
  );
}

/**
 * Shopify-style control shell: one elevated box hosting a select (and optional +).
 */
export function OrderHeaderCombo({
  children,
  onAdd,
  addLabel = "Add address",
  addDisabled,
  className,
}: {
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
  addDisabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(orderHeaderComboShellClass, className)}>
      <div className="min-w-0 flex-1">{children}</div>
      {onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          disabled={addDisabled}
          aria-label={addLabel}
          title={addLabel}
          className={orderHeaderComboAddClass}
        >
          <Plus className="size-3.5" strokeWidth={2.25} />
        </button>
      ) : null}
    </div>
  );
}
