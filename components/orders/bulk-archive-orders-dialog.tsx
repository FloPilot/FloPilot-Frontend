"use client";

import { useState } from "react";
import { Archive, Loader2 } from "lucide-react";
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
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export type BulkArchiveMode = "orders" | "orders_and_data";

export function BulkArchiveOrdersDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (mode: BulkArchiveMode) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const countLabel =
    selectedCount === 1 ? "1 order" : `${selectedCount.toLocaleString()} orders`;

  const handleConfirm = async (mode: BulkArchiveMode) => {
    setSaving(true);
    setError(null);
    try {
      await onConfirm(mode);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not archive the selected orders."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Archive {countLabel}?</DialogTitle>
          <DialogDescription className={dashboardTaskDetailClass}>
            Archived orders leave active lists but stay recoverable under{" "}
            <span className="font-medium text-[#303030]">Archived</span>. Choose
            whether linked design-library artwork should be archived too.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="rounded-lg border border-[#e3e3e3] bg-[#fafafa] px-3.5 py-3 text-[13px] text-[#616161]">
            <p className="font-medium text-[#303030]">Archive orders</p>
            <p className="mt-1 leading-relaxed">
              Hide the selected orders from active work. Artwork files on the
              order stay with the archived order.
            </p>
          </div>
          <div className="rounded-lg border border-[#f0d9a8] bg-[#fff8eb] px-3.5 py-3 text-[13px] text-[#8a6116]">
            <p className="font-medium text-[#8a6116]">
              Archive orders and all order data
            </p>
            <p className="mt-1 leading-relaxed">
              Also archive designs in the design library that were created from
              these orders — useful when wiping test work clean.
            </p>
          </div>
          {error ? (
            <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={cn(dashboardControlClass, "sm:min-w-[96px]")}
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(
              dashboardControlClass,
              "border-[#f5b5b5] bg-[#fff1f1] text-[#8f1f1f] hover:bg-[#fde2e2] hover:text-[#8f1f1f] sm:min-w-[140px]"
            )}
            disabled={saving || selectedCount <= 0}
            onClick={() => void handleConfirm("orders")}
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Archive className="size-3.5" />
            )}
            Archive orders
          </Button>
          <Button
            type="button"
            className={cn(
              dashboardControlClass,
              "border-[#8f1f1f] bg-[#8f1f1f] text-white hover:bg-[#751919] hover:text-white sm:min-w-[180px]"
            )}
            disabled={saving || selectedCount <= 0}
            onClick={() => void handleConfirm("orders_and_data")}
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Archive className="size-3.5" />
            )}
            Archive orders + data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
