"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { customerNotePriorityLabel } from "@/lib/customer-notes";
import {
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import type { Customer, CustomerNote } from "@/types";
import { cn } from "@/lib/utils";

export function CustomerWarningDialog({
  open,
  onOpenChange,
  customer,
  warnings,
  confirmLabel = "Got it",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Pick<Customer, "company"> | null;
  warnings: CustomerNote[];
  confirmLabel?: string;
  onConfirm?: () => void;
}) {
  if (warnings.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-xl border border-[#ebebeb] bg-white p-0 shadow-lg sm:max-w-md"
        )}
      >
        <DialogHeader className="space-y-0 border-b border-[#ebebeb] px-5 py-4 pr-12 text-left">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#fff1f1] text-[#b42318]">
              <AlertTriangle className="size-4" />
            </span>
            <div className="min-w-0 space-y-1 pt-0.5">
              <DialogTitle className="text-[15px] font-semibold leading-snug text-[#303030]">
                Customer warning
              </DialogTitle>
              <DialogDescription
                className={cn(
                  dashboardTaskDetailClass,
                  "text-[13px] leading-snug"
                )}
              >
                {customer?.company
                  ? `Internal heads-up for ${customer.company} before you continue.`
                  : "Internal heads-up for this account before you continue."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2.5 px-5 py-4">
          {warnings.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3.5 py-3"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#b42318]">
                {customerNotePriorityLabel(note.priority)}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[#303030]">
                {note.content}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-[#ebebeb] bg-[#fafafa] px-5 py-3.5">
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-9 px-4")}
            onClick={() => {
              onConfirm?.();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
