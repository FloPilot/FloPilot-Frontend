"use client";

import { ProductionCalendar } from "@/components/calendar/production-calendar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { ScheduleBlock } from "@/types";

interface StationCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machineId: string;
  machineName: string;
  onScheduleBlockClick?: (block: ScheduleBlock) => void;
}

export function StationCalendarDialog({
  open,
  onOpenChange,
  machineId,
  machineName,
  onScheduleBlockClick,
}: StationCalendarDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex max-h-[min(92vh,920px)] w-[calc(100vw-1.25rem)] max-w-[calc(100vw-1.25rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0",
          "sm:max-w-[min(96vw,90rem)] sm:w-[min(96vw,90rem)]"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
          <DialogTitle className="text-sm font-bold tracking-widest uppercase text-brand-ink">
            Production calendar
          </DialogTitle>
          <DialogDescription className="text-brand-muted">
            Shop-wide schedule — your station ({machineName}) is highlighted.
            View only from the floor.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto px-3 py-4 sm:px-5 sm:py-5">
          <ProductionCalendar
            highlightMachineId={machineId}
            readOnly
            hideFooter
            className="min-w-0"
            onScheduleBlockClick={onScheduleBlockClick}
          />
        </div>

        <div className="flex shrink-0 items-center justify-end border-t border-border bg-muted/30 px-5 py-4 sm:px-6">
          <Button
            className="rounded-full px-8 h-11"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
