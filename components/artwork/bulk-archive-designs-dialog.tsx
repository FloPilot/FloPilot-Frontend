"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";
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

export function BulkArchiveDesignsDialog({
  open,
  onOpenChange,
  selectedCount,
  mode,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  mode: "archive" | "restore";
  onConfirm: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isArchive = mode === "archive";
  const countLabel =
    selectedCount === 1
      ? "1 design"
      : `${selectedCount.toLocaleString()} designs`;

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isArchive
            ? "Could not archive the selected designs."
            : "Could not restore the selected designs."
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isArchive ? `Archive ${countLabel}?` : `Restore ${countLabel}?`}
          </DialogTitle>
          <DialogDescription className={dashboardTaskDetailClass}>
            {isArchive
              ? "Archived designs leave the Active library but stay recoverable under Archived. Order artwork and files are not deleted."
              : "Restored designs return to the Active library for everyone on this shop."}
          </DialogDescription>
        </DialogHeader>

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
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={cn(
              dashboardControlClass,
              isArchive
                ? "border-[#8f1f1f] bg-[#8f1f1f] text-white hover:bg-[#751919] hover:text-white sm:min-w-[150px]"
                : "sm:min-w-[150px]"
            )}
            disabled={saving || selectedCount <= 0}
            onClick={() => void handleConfirm()}
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : isArchive ? (
              <Archive className="size-3.5" />
            ) : (
              <ArchiveRestore className="size-3.5" />
            )}
            {isArchive ? "Archive designs" : "Restore designs"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
