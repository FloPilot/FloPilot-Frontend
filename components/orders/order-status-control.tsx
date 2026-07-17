"use client";

import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { OrderStatusBadge } from "@/components/status-badges";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dashboardControlClass } from "@/lib/dashboard-styles";
import {
  ORDER_STATUS_ORDER,
  orderStatusLabel,
  orderStatusesForFulfillment,
} from "@/lib/order-status";
import type { OrderStatus } from "@/types";
import { cn } from "@/lib/utils";

export function OrderStatusControl({
  status,
  disabled,
  compact,
  fullWidth,
  willCall,
  onStatusChange,
}: {
  status: OrderStatus;
  disabled?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
  willCall?: boolean;
  onStatusChange: (next: OrderStatus) => Promise<void> | void;
}) {
  const [pending, setPending] = useState(false);
  const statuses = orderStatusesForFulfillment(willCall);

  const handleSelect = async (next: OrderStatus) => {
    if (next === status || pending) return;
    setPending(true);
    try {
      await onStatusChange(next);
    } finally {
      setPending(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled || pending}
        className={cn(
          dashboardControlClass,
          "items-center gap-2 bg-white text-sm outline-none hover:bg-[#fafafa]",
          "focus-visible:ring-2 focus-visible:ring-brand-primary/30",
          fullWidth
            ? "flex h-9 w-full justify-between px-3"
            : "inline-flex h-8 px-2.5",
          (disabled || pending) && "pointer-events-none opacity-60"
        )}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin text-[#8a8a8a]" />
        ) : (
          <OrderStatusBadge status={status} willCall={willCall} />
        )}
        {!disabled ? (
          <ChevronDown className="size-3.5 shrink-0 text-[#8a8a8a]" />
        ) : null}
      </DropdownMenuTrigger>
      {!disabled ? (
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-[#8a8a8a]">
              Update status
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {statuses.map((next) => {
              const selected = next === status;
              return (
                <DropdownMenuItem
                  key={next}
                  disabled={selected || pending}
                  onClick={() => void handleSelect(next)}
                  className={cn(
                    "flex items-center justify-between gap-2",
                    selected && "bg-[#f6f6f7] font-medium text-[#303030]"
                  )}
                >
                  <span>{orderStatusLabel(next, { willCall })}</span>
                  {selected ? (
                    <Check className="size-3.5 shrink-0 text-brand-primary" />
                  ) : null}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      ) : null}
    </DropdownMenu>
  );
}
