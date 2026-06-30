"use client";

import { Loader2 } from "lucide-react";
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
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import type { OrderMaterialLine } from "@/types";
import { cn } from "@/lib/utils";

export function RemoveBlankSizeDialog({
  open,
  onOpenChange,
  line,
  blockedReason,
  saving,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line: OrderMaterialLine | null;
  blockedReason?: string | null;
  saving?: boolean;
  onConfirm: () => void;
}) {
  const product = line?.productName ?? line?.label ?? "Blank";
  const color = line?.color ?? "—";
  const size = line?.size ?? "—";
  const quantity = line?.expectedQty ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md" showCloseButton>
        <DialogHeader className="border-b border-[#ebebeb] px-5 py-4">
          <DialogTitle className={dashboardTaskTitleClass}>
            Remove this size?
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-snug text-[#616161]">
            {blockedReason ? (
              blockedReason
            ) : (
              <>
                This removes{" "}
                <span className="font-medium text-[#303030]">
                  {quantity} {size}
                </span>{" "}
                from{" "}
                <span className="font-medium text-[#303030]">{product}</span> in{" "}
                <span className="font-medium text-[#303030]">{color}</span>.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col-reverse gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            className={cn(dashboardControlClass, "h-9")}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving || Boolean(blockedReason)}
            className={cn(
              dashboardControlClass,
              "h-9 border-[#f5b5b5] bg-[#fff1f1] text-[#8f1f1f] hover:bg-[#fde2e2] hover:text-[#8f1f1f]"
            )}
            onClick={onConfirm}
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Removing…
              </>
            ) : (
              "Remove size"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
