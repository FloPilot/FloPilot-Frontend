"use client";

import { useState } from "react";
import { History, Loader2, RotateCcw } from "lucide-react";
import { MockupPreview } from "@/components/orders/artwork/mockup-preview";
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
  dashboardGhostButtonClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { decorationLabel, formatDateTime } from "@/lib/format";
import type { DesignVersionSnapshot, SavedDesign } from "@/types";
import { cn } from "@/lib/utils";

export function DesignVersionModal({
  design,
  version,
  open,
  onOpenChange,
  onRestore,
  restoring,
}: {
  design: SavedDesign;
  version: DesignVersionSnapshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (versionId: string) => Promise<void>;
  restoring: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!version) return null;

  const snapshot = version.snapshot;
  const inkColors = (snapshot.inkColors ?? []).filter((row) => !row.isFlash);

  const handleRestore = async () => {
    setConfirming(true);
    try {
      await onRestore(version.id);
      onOpenChange(false);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[90vh] w-[min(94vw,42rem)] flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="border-b border-[#ebebeb] bg-[#fafafa] px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-[#303030]">
            <History className="size-4 text-[#616161]" />
            {version.label || `Version ${version.version}`}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#616161]">
            Saved {formatDateTime(version.createdAt)}
            {version.createdBy ? ` · ${version.createdBy}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {snapshot.artwork ? (
            <MockupPreview
              entry={{
                job: {
                  id: design.sourceJobId || "library",
                  name: design.locationLabel,
                  imprints: [],
                  tasks: [],
                },
                imprint: {
                  id: design.sourceImprintId || design.id,
                  locationKey: design.locationKey,
                  label: design.locationLabel,
                  decoration: design.decoration,
                  artwork: snapshot.artwork,
                  inkColors: snapshot.inkColors,
                  notes: snapshot.notes,
                },
              }}
              compact
            />
          ) : null}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-[#8a8a8a]">
                Decoration
              </p>
              <p className="mt-0.5 text-sm font-medium text-[#303030]">
                {decorationLabel(design.decoration)}
              </p>
            </div>
            {snapshot.notes?.dimensions ? (
              <div className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-[#8a8a8a]">
                  Print size
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#303030]">
                  {snapshot.notes.dimensions}
                </p>
              </div>
            ) : null}
          </div>

          {inkColors.length > 0 ? (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                Ink colors
              </p>
              <ul className="mt-2 divide-y divide-[#ebebeb] overflow-hidden rounded-lg border border-[#e3e3e3]">
                {inkColors.map((color) => (
                  <li
                    key={color.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="text-[#303030]">{color.name || "Color"}</span>
                    <span className="font-mono text-xs text-[#616161]">
                      {color.pmsCode || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {snapshot.notes?.instructions ? (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                Notes
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#303030]">
                {snapshot.notes.instructions}
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
          <Button
            type="button"
            className={cn(dashboardGhostButtonClass, "h-9")}
            onClick={() => onOpenChange(false)}
            disabled={restoring}
          >
            Close
          </Button>
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-9 gap-1.5")}
            onClick={handleRestore}
            disabled={restoring || confirming}
          >
            {restoring || confirming ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RotateCcw className="size-3.5" />
            )}
            Set as active
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
