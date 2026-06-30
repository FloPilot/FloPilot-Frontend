"use client";

import { useMemo, useState } from "react";
import { Package, PackageCheck, PackageMinus } from "lucide-react";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import {
  countExpectedGarmentPieces,
  garmentStatusHint,
  garmentStatusLabel,
  resolveOrderGarments,
} from "@/lib/order-garments";
import type { GarmentReceiveStatus, Order, OrderGarments } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: {
  value: GarmentReceiveStatus;
  label: string;
  icon: typeof Package;
}[] = [
  { value: "waiting", label: "Waiting", icon: Package },
  { value: "partial", label: "Partial", icon: PackageMinus },
  { value: "received", label: "All received", icon: PackageCheck },
];

export function OrderGarmentsPanel({ order }: { order: Order }) {
  const { updateOrderGarments } = useSchedule();
  const [saving, setSaving] = useState(false);
  const [partialCount, setPartialCount] = useState("");

  const garments = useMemo(() => resolveOrderGarments(order), [order]);
  const expectedCount = countExpectedGarmentPieces(order);

  if (expectedCount === 0) {
    return (
      <section className={dashboardCardClass}>
        <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
          <h2 className={dashboardTaskTitleClass}>Blank garments</h2>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Add line items first to track when blanks arrive for this order.
          </p>
        </div>
      </section>
    );
  }

  const current = garments ?? {
    status: "waiting" as const,
    expectedCount,
    receivedCount: 0,
  };

  const save = async (next: OrderGarments) => {
    setSaving(true);
    try {
      await updateOrderGarments(order.id, next);
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (status: GarmentReceiveStatus) => {
    if (status === "partial") {
      const parsed = Number(partialCount);
      const receivedCount =
        Number.isFinite(parsed) && parsed > 0
          ? Math.min(Math.floor(parsed), current.expectedCount)
          : Math.max(1, current.receivedCount || 1);
      await save({ ...current, status, receivedCount });
      return;
    }

    await save({
      ...current,
      status,
      receivedCount: status === "received" ? current.expectedCount : 0,
    });
  };

  const markAllReceived = () =>
    save({
      ...current,
      status: "received",
      receivedCount: current.expectedCount,
    });

  return (
    <section className={dashboardCardClass}>
      <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
        <h2 className={dashboardTaskTitleClass}>Blank garments</h2>
        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
          One status for the whole order — when all {current.expectedCount}{" "}
          pieces are in, every production event shows materials ready.
        </p>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className={cn(dashboardInsetSurfaceClass, "px-4 py-3.5")}>
          <p className="text-sm font-semibold text-[#303030]">
            {garmentStatusLabel(current.status)}
          </p>
          <p className={cn("mt-1", dashboardTaskDetailClass)}>
            {garmentStatusHint(current)}
          </p>
          <p className="mt-2 text-[12px] font-medium text-[#616161]">
            {current.receivedCount} of {current.expectedCount} pieces
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = current.status === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={saving}
                onClick={() => handleStatus(option.value)}
                className={cn(
                  dashboardControlClass,
                  "h-9 gap-1.5 text-[12px]",
                  active && "border-[#2c6ecb]/40 bg-[#f4f7fd] text-[#2c6ecb]"
                )}
              >
                <Icon className="size-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>

        {current.status === "partial" || partialCount ? (
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="partial-count" className="text-[#303030]">
              Pieces received so far
            </Label>
            <div className="flex gap-2">
              <Input
                id="partial-count"
                type="number"
                min={1}
                max={current.expectedCount}
                value={partialCount || String(current.receivedCount || "")}
                onChange={(event) => setPartialCount(event.target.value)}
                className="h-9 rounded-lg border-[#e3e3e3]"
              />
              <Button
                type="button"
                variant="outline"
                className={cn(dashboardControlClass, "h-9 shrink-0")}
                disabled={saving}
                onClick={() => handleStatus("partial")}
              >
                Save
              </Button>
            </div>
          </div>
        ) : null}

        {current.status !== "received" ? (
          <Button
            type="button"
            className="h-9 rounded-lg text-[13px] font-semibold"
            disabled={saving}
            onClick={markAllReceived}
          >
            <PackageCheck className="size-3.5" />
            Mark all {current.expectedCount} received
          </Button>
        ) : null}
      </div>
    </section>
  );
}
