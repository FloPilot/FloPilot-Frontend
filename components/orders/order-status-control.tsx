"use client";

import { ChevronDown, Loader2 } from "lucide-react";
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
  getStaffStatusTransitions,
  getStatusTransitionLabel,
} from "@/lib/order-status";
import type { OrderStatus } from "@/types";
import { cn } from "@/lib/utils";

export function OrderStatusControl({
  status,
  disabled,
  compact,
  fullWidth,
  onStatusChange,
}: {
  status: OrderStatus;
  disabled?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
  onStatusChange: (next: OrderStatus) => Promise<void> | void;
}) {
  const [pending, setPending] = useState(false);
  const transitions = getStaffStatusTransitions(status);

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
          <OrderStatusBadge status={status} />
        )}
        {!disabled && transitions.length > 0 && (
          <ChevronDown className="size-3.5 shrink-0 text-[#8a8a8a]" />
        )}
      </DropdownMenuTrigger>
      {transitions.length > 0 && (
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-[#8a8a8a]">
              Update status
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {transitions.map((next) => (
              <DropdownMenuItem
                key={next}
                onClick={() => void handleSelect(next)}
              >
                {getStatusTransitionLabel(status, next)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
