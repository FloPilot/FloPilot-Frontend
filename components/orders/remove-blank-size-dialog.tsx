"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  dashboardControlClass,
  dashboardTaskDetailClass,
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
      <DialogContent
        className={cn(
          "w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-xl border border-[#ebebeb] bg-white p-0 shadow-lg sm:max-w-md"
        )}
      >
        <DialogHeader className="space-y-0 border-b border-[#ebebeb] px-5 py-4 pr-12 text-left">
          <DialogTitle className={dashboardTaskTitleClass}>
            Remove this size?
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4">
          <DialogDescription
            className={cn(dashboardTaskDetailClass, "text-[13px] leading-relaxed")}
          >
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
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-3.5 sm:flex-row sm:justify-end">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
