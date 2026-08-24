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
import { formatOrderDisplayLine } from "@/lib/order-display";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

export function OrderArchivePanel({ order }: { order: Order }) {
  const router = useRouter();
  const { archiveOrder, restoreOrder } = useSchedule();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const archived = isArchivedOrder(order);

  const handleRestore = async () => {
    setSaving(true);
    setError(null);
    try {
      await restoreOrder(order.id);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not restore this order.");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (includeOrderData: boolean) => {
    setSaving(true);
    setError(null);
    try {
      await archiveOrder(order.id, { includeOrderData });
      setOpen(false);
      router.push("/app/orders?scope=archived");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive this order.");
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
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
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

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (saving) return;
          setError(null);
          setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {archived ? "Restore this order?" : "Archive this order?"}
            </DialogTitle>
            <DialogDescription>
              {archived ? (
                <>
                  Order{" "}
                  <span className="font-medium text-[#303030]">
                    {formatOrderDisplayLine(order)}
                  </span>{" "}
                  will return to your active orders list. Designs archived with
                  this order are restored too.
                </>
              ) : (
                <>
                  Order{" "}
                  <span className="font-medium text-[#303030]">
                    {formatOrderDisplayLine(order)}
                  </span>{" "}
                  will be hidden from active lists. Find it anytime under{" "}
                  <span className="font-medium text-[#303030]">Archived</span>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {!archived ? (
            <div className="space-y-3 py-1">
              <div className="rounded-lg border border-[#e3e3e3] bg-[#fafafa] px-3.5 py-3 text-[13px] text-[#616161]">
                <p className="font-medium text-[#303030]">Archive order</p>
                <p className="mt-1 leading-relaxed">
                  Hide this order from active work. Artwork stays on the archived
                  order.
                </p>
              </div>
              <div className="rounded-lg border border-[#f0d9a8] bg-[#fff8eb] px-3.5 py-3 text-[13px] text-[#8a6116]">
                <p className="font-medium text-[#8a6116]">
                  Archive order and all order data
                </p>
                <p className="mt-1 leading-relaxed">
                  Also archive designs in the design library created from this
                  order.
                </p>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
              {error}
            </p>
          ) : null}

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className={cn(dashboardControlClass, "sm:min-w-[96px]")}
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            {archived ? (
              <Button
                type="button"
                className={cn(
                  dashboardControlClass,
                  "border-[#2c6ecb]/30 bg-[#f4f7fd] text-[#2c6ecb] hover:bg-[#e8f0fb] sm:min-w-[128px]"
                )}
                disabled={saving}
                onClick={() => void handleRestore()}
              >
                {saving ? "Restoring…" : "Restore order"}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    dashboardControlClass,
                    "border-[#f5b5b5] bg-[#fff1f1] text-[#8f1f1f] hover:bg-[#fde2e2] hover:text-[#8f1f1f] sm:min-w-[140px]"
                  )}
                  disabled={saving}
                  onClick={() => void handleArchive(false)}
                >
                  {saving ? "Archiving…" : "Archive order"}
                </Button>
                <Button
                  type="button"
                  className={cn(
                    dashboardControlClass,
                    "border-[#8f1f1f] bg-[#8f1f1f] text-white hover:bg-[#751919] hover:text-white sm:min-w-[180px]"
                  )}
                  disabled={saving}
                  onClick={() => void handleArchive(true)}
                >
                  {saving ? "Archiving…" : "Archive order + data"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
