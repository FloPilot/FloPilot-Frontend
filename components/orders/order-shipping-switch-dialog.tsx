"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export type ShippingModeSwitch =
  | { direction: "to_will_call"; shipmentCount: number }
  | { direction: "to_carrier"; pickupCount: number };

export function OrderShippingSwitchDialog({
  open,
  switchInfo,
  onOpenChange,
  onConfirmClear,
  onConfirmConvert,
}: {
  open: boolean;
  switchInfo: ShippingModeSwitch | null;
  onOpenChange: (open: boolean) => void;
  onConfirmClear: () => void;
  onConfirmConvert: () => void;
}) {
  if (!switchInfo) return null;

  const toWillCall = switchInfo.direction === "to_will_call";
  const count = toWillCall ? switchInfo.shipmentCount : switchInfo.pickupCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl border-[#ebebeb] p-0">
        <DialogHeader className="border-b border-[#ebebeb] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fff1d6] text-[#8a6116]">
              <AlertTriangle className="size-5" />
            </span>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-[15px] font-semibold text-[#303030]">
                {toWillCall ? "Switch to Will Call?" : "Switch to carrier shipping?"}
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed text-[#616161]">
                {toWillCall ? (
                  <>
                    This order has {count} planned shipment
                    {count !== 1 ? "s" : ""} with ship-to addresses. Will Call
                    means the customer picks up from your shop — those shipment
                    locations won&apos;t apply.
                  </>
                ) : (
                  <>
                    This order has {count} planned pickup
                    {count !== 1 ? "s" : ""}. Switching to carrier shipping will
                    remove pickup plans so you can add shipments with addresses
                    instead.
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4">
          <p className="text-[13px] text-[#616161]">
            {toWillCall
              ? "You can clear everything and start fresh, or keep your piece splits as separate pickups."
              : "Clear pickups and plan carrier shipments with customer addresses."}
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 border-t border-[#ebebeb] px-5 py-4 sm:flex-col">
          {toWillCall ? (
            <>
              <Button
                type="button"
                className={cn(dashboardPrimaryButtonClass, "h-10 w-full rounded-lg")}
                onClick={onConfirmConvert}
              >
                Convert to pickups (keep splits)
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn(dashboardControlClass, "h-10 w-full rounded-lg")}
                onClick={onConfirmClear}
              >
                Clear all & start Will Call
              </Button>
            </>
          ) : (
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "h-10 w-full rounded-lg")}
              onClick={onConfirmClear}
            >
              Clear pickups & switch to shipping
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-full text-[13px] text-[#616161]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
