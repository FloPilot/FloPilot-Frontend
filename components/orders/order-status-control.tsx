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
import {
  getStaffStatusTransitions,
  getStatusTransitionLabel,
  ORDER_STATUS_DESCRIPTIONS,
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
    <div className={cn(!compact && "space-y-2")}>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled || pending}
          className={cn(
            "items-center gap-2 border border-border/70 bg-white text-sm outline-none",
            "hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-brand-primary/25",
            fullWidth
              ? "flex h-9 w-full justify-between rounded-xl px-3"
              : "inline-flex h-8 rounded-full px-2.5",
            (disabled || pending) && "pointer-events-none opacity-60"
          )}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin text-brand-muted" />
          ) : (
            <OrderStatusBadge status={status} />
          )}
          {!disabled && transitions.length > 0 && (
            <ChevronDown className="size-3.5 shrink-0 text-brand-muted" />
          )}
        </DropdownMenuTrigger>
        {transitions.length > 0 && (
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-brand-muted font-normal">
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
      {!compact && (
        <p className="text-xs text-brand-muted max-w-xl leading-relaxed">
          {ORDER_STATUS_DESCRIPTIONS[status]}
        </p>
      )}
    </div>
  );
}
