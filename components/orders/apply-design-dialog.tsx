"use client";

import { useEffect, useMemo, useState } from "react";
import { BookMarked, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listDesigns } from "@/lib/api";
import { decorationLabel } from "@/lib/format";
import { dashboardPrimaryButtonClass } from "@/lib/dashboard-styles";
import { getOrderProductionSteps } from "@/lib/order-production";
import type { Order, SavedDesign } from "@/types";
import { cn } from "@/lib/utils";

export function ApplyDesignDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { getIdToken } = useAuth();
  const { applyDesignToOrder } = useSchedule();
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [designId, setDesignId] = useState("");
  const [targetKey, setTargetKey] = useState("");
  const [saving, setSaving] = useState(false);

  const steps = useMemo(
    () =>
      getOrderProductionSteps(order).filter(
        ({ job, imprint }) =>
          job.kind !== "finishing" && imprint.decoration !== "finishing"
      ),
    [order]
  );

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const token = await getIdToken();
      if (!token) return;
      const { designs: next } = await listDesigns(token, {
        customerId: order.customerId,
      });
      setDesigns(next);
    })();
  }, [open, getIdToken, order.customerId]);

  const handleApply = async () => {
    const step = steps.find(
      (entry) => `${entry.job.id}-${entry.imprint.id}` === targetKey
    );
    if (!step || !designId) return;
    setSaving(true);
    try {
      await applyDesignToOrder(
        designId,
        order.id,
        step.job.id,
        step.imprint.id
      );
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle>Apply from library</DialogTitle>
          <DialogDescription>
            Pull a saved design onto a decoration location for {order.number}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-[#303030]">Saved design</p>
            <Select value={designId} onValueChange={(value) => setDesignId(value ?? "")}>
              <SelectTrigger className="h-10 rounded-lg">
                <SelectValue placeholder="Choose design" />
              </SelectTrigger>
              <SelectContent>
                {designs.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No saved designs for this customer
                  </SelectItem>
                ) : (
                  designs.map((design) => (
                    <SelectItem key={design.id} value={design.id}>
                      {design.name} · {decorationLabel(design.decoration)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-[#303030]">Apply to location</p>
            <Select value={targetKey} onValueChange={(value) => setTargetKey(value ?? "")}>
              <SelectTrigger className="h-10 rounded-lg">
                <SelectValue placeholder="Choose event" />
              </SelectTrigger>
              <SelectContent>
                {steps.map((step) => (
                  <SelectItem
                    key={`${step.job.id}-${step.imprint.id}`}
                    value={`${step.job.id}-${step.imprint.id}`}
                  >
                    {step.imprint.label} · {decorationLabel(step.imprint.decoration)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-10 w-full")}
            disabled={!designId || !targetKey || saving}
            onClick={handleApply}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <BookMarked className="size-4" />
            )}
            Apply design
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
