"use client";

import { Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { rateSheetSummary } from "@/lib/customer-pricing";
import type { CustomerNegotiatedRateSheet } from "@/types";
import { cn } from "@/lib/utils";

export function CustomerRateSheetDeleteDialog({
  open,
  sheet,
  deleting,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  sheet: CustomerNegotiatedRateSheet | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  if (!sheet) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!deleting) onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton
        className="gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <DialogHeader className="border-b border-[#ebebeb] px-5 py-4">
          <DialogTitle className={dashboardTaskTitleClass}>
            Delete rate sheet
          </DialogTitle>
          <p className={dashboardTaskDetailClass}>
            This removes the negotiated pricing matrix from this customer.
            Orders will use shop standard pricing unless you add another rate
            sheet. This can&apos;t be undone.
          </p>
        </DialogHeader>

        <div className="px-5 py-4">
          <div
            className={cn(
              dashboardInsetSurfaceClass,
              "flex items-center gap-3 px-4 py-3"
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f6f6f7] text-[#616161]">
              <Tag className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[#303030]">
                {sheet.name || "Negotiated rates"}
              </p>
              <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                {rateSheetSummary(sheet)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            disabled={deleting}
            className="h-9 rounded-lg"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={deleting}
            className="h-9 rounded-lg bg-[#c0392b] px-4 text-[13px] font-medium text-white hover:bg-[#a93226] focus-visible:ring-[#c0392b]/30"
            onClick={onConfirm}
          >
            {deleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete rate sheet"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
