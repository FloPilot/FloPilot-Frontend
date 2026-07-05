"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { CustomerActivityFeed } from "@/components/customers/customer-activity-feed";
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
import type { Customer } from "@/types";
import { cn } from "@/lib/utils";

export function CustomerActivityLauncher({
  customer,
  className,
}: {
  customer: Customer;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={cn(dashboardControlClass, "h-9", className)}
        onClick={() => setOpen(true)}
      >
        <History className="size-3.5" />
        Activity
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(90vh,760px)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-xl">
          <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4 text-left">
            <DialogTitle className={dashboardTaskTitleClass}>
              Customer activity
            </DialogTitle>
            <DialogDescription className={dashboardTaskDetailClass}>
              Updates to {customer.company} — contact info, shipping locations,
              negotiated pricing, and account changes.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <CustomerActivityFeed customer={customer} variant="timeline" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
