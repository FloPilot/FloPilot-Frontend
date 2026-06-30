"use client";

import { useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSchedule } from "@/components/providers/schedule-provider";
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
  dashboardCardClass,
  dashboardControlClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { isArchivedOrder } from "@/lib/order-archive";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

export function OrderArchivePanel({ order }: { order: Order }) {
  const router = useRouter();
  const { archiveOrder, restoreOrder } = useSchedule();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const archived = isArchivedOrder(order);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      if (archived) {
        await restoreOrder(order.id);
        setOpen(false);
      } else {
        await archiveOrder(order.id);
        setOpen(false);
        router.push("/app/orders?scope=archived");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className={dashboardCardClass}>
        <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
          <h2 className={dashboardTaskTitleClass}>Archive</h2>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            {archived
              ? "This order is hidden from active lists. Restore it to work on it again."
              : "Remove this order from active lists without deleting it. You can restore it later."}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <Button
            type="button"
            variant="outline"
            className={cn(
              dashboardControlClass,
              "h-9 w-full justify-center gap-1.5",
              archived
                ? "border-[#2c6ecb]/30 text-[#2c6ecb] hover:bg-[#f4f7fd]"
                : "border-[#f5b5b5] bg-[#fff1f1] text-[#8f1f1f] hover:bg-[#fde2e2] hover:text-[#8f1f1f]"
            )}
            onClick={() => setOpen(true)}
          >
            {archived ? (
              <>
                <ArchiveRestore className="size-3.5" />
                Restore order
              </>
            ) : (
              <>
                <Archive className="size-3.5" />
                Archive order
              </>
            )}
          </Button>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {archived ? "Restore this order?" : "Archive this order?"}
            </DialogTitle>
            <DialogDescription>
              {archived ? (
                <>
                  Order <span className="font-medium text-[#303030]">{order.number}</span>{" "}
                  will return to your active orders list.
                </>
              ) : (
                <>
                  Order <span className="font-medium text-[#303030]">{order.number}</span>{" "}
                  will be hidden from active and historical lists. Find it anytime
                  under <span className="font-medium text-[#303030]">Archived</span> on
                  the orders page.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className={cn(dashboardControlClass, "sm:min-w-[96px]")}
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={cn(
                dashboardControlClass,
                "sm:min-w-[128px]",
                archived
                  ? "border-[#2c6ecb]/30 bg-[#f4f7fd] text-[#2c6ecb] hover:bg-[#e8f0fb]"
                  : "border-[#f5b5b5] bg-[#fff1f1] text-[#8f1f1f] hover:bg-[#fde2e2] hover:text-[#8f1f1f]"
              )}
              disabled={saving}
              onClick={handleConfirm}
            >
              {saving
                ? archived
                  ? "Restoring…"
                  : "Archiving…"
                : archived
                  ? "Restore order"
                  : "Archive order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
