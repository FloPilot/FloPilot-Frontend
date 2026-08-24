"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { OrderDesignStudioTab } from "@/components/orders/order-design-studio-tab";
import type { Order } from "@/types";

/**
 * Keeps proof work in one place while reusing the order Design Studio editor.
 * The selected proof location opens directly, so staff do not need a separate
 * order-level Design tab to create a mockup.
 */
export function OrderProofDesignStudioDialog({
  order,
  jobId,
  imprintId,
  open,
  onOpenChange,
}: {
  order: Order;
  jobId: string;
  imprintId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(94vh,920px)] max-h-[min(94vh,920px)] w-full flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[min(96vw,1400px)]"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-5">
          <OrderDesignStudioTab
            order={order}
            initialImprintKey={`${jobId}:${imprintId}`}
            onProofAttached={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
