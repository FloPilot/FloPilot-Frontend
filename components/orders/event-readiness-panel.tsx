"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { CheckpointStatusBadge } from "@/components/orders/order-checkpoint-pills";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { computeEventStatusCards } from "@/lib/event-status-checkpoints";
import type { OrderDetailTab } from "@/lib/order-detail-tabs";
import {
  getInkPrepLine,
  getScreenSetupLine,
  mergeOrderMaterials,
} from "@/lib/order-materials";
import { inkPrepLineMarkAll } from "@/lib/ink-prep";
import type { OrderCheckpoint } from "@/lib/order-list-summary";
import type { ResolvedProductionEvent } from "@/lib/production-event-status";
import type { Job, JobImprint, Order } from "@/types";
import { cn } from "@/lib/utils";

type ReadinessAction = {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: "primary" | "secondary";
  disabled?: boolean;
};

function ReadinessRow({
  checkpoint,
  action,
  saving,
}: {
  checkpoint: OrderCheckpoint;
  action: ReadinessAction | null;
  saving?: boolean;
}) {
  const isDone = checkpoint.status === "done";

  return (
    <div
      className={cn(
        dashboardInsetSurfaceClass,
        "flex flex-wrap items-center justify-between gap-3 px-3.5 py-3",
        isDone && "bg-[#f6fbf5]/60"
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[#303030]">
            {checkpoint.label}
          </p>
          <CheckpointStatusBadge checkpoint={checkpoint} compact />
        </div>
        <p className={cn(dashboardTaskDetailClass, "text-[12px]")}>
          {checkpoint.title}
        </p>
      </div>

      {action && !isDone ? (
        <Button
          type="button"
          size="sm"
          variant={action.variant === "primary" ? "default" : "outline"}
          disabled={action.disabled || saving}
          className={cn(
            action.variant === "primary"
              ? cn(dashboardPrimaryButtonClass, "h-8 px-3 text-[12px]")
              : cn(dashboardControlClass, "h-8 shrink-0 text-[12px]")
          )}
          onClick={() => void action.onClick()}
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : action.variant === "primary" ? (
            <CheckCircle2 className="size-3.5" />
          ) : (
            <ArrowRight className="size-3.5" />
          )}
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

export function EventReadinessPanel({
  order,
  job,
  imprint,
  resolved,
  onOpenTab,
  onSchedule,
  onClose,
}: {
  order: Order;
  job: Job;
  imprint: JobImprint;
  resolved: ResolvedProductionEvent;
  onOpenTab?: (tab: OrderDetailTab) => void;
  onSchedule?: () => void;
  onClose?: () => void;
}) {
  const {
    setArtworkStatus,
    updateOrderMaterials,
    updateProductionEventWorkflow,
  } = useSchedule();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const statusCards = useMemo(
    () => computeEventStatusCards(order, job, imprint, resolved),
    [order, job, imprint, resolved]
  );

  const applicableCards = statusCards.filter(
    (card) => card.status !== "not_applicable"
  );

  const openTab = (tab: OrderDetailTab) => {
    onClose?.();
    onOpenTab?.(tab);
  };

  const runAction = async (key: string, action: () => Promise<void>) => {
    setSavingKey(key);
    try {
      await action();
    } finally {
      setSavingKey(null);
    }
  };

  const markScreensReady = async () => {
    const materials = mergeOrderMaterials(order);
    const screenLine = getScreenSetupLine(materials);
    if (!screenLine) {
      openTab("screens");
      return;
    }

    const lines = materials.lines.map((line) =>
      line.id === screenLine.id
        ? {
            ...line,
            expectedQty: 1,
            receivedQty: 1,
            status: "received" as const,
          }
        : line
    );

    await updateOrderMaterials(order.id, {
      lines,
      blankSource: materials.blankSource,
    });
  };

  const markInkReady = async () => {
    const materials = mergeOrderMaterials(order);
    const inkLine = getInkPrepLine(materials, job.id, imprint.id);
    if (!inkLine) {
      openTab("inks");
      return;
    }

    const lines = materials.lines.map((line) =>
      line.id === inkLine.id
        ? inkPrepLineMarkAll(line, imprint, true)
        : line
    );

    await updateOrderMaterials(order.id, {
      lines,
      blankSource: materials.blankSource,
    });
  };

  const markSetupDone = async () => {
    await updateProductionEventWorkflow(order.id, job.id, imprint.id, {
      checkpoints: {
        ...imprint.workflow?.checkpoints,
        prep: "done",
      },
    });
  };

  const actionForCheckpoint = (
    checkpoint: OrderCheckpoint
  ): ReadinessAction | null => {
    if (checkpoint.status === "done") return null;

    switch (checkpoint.key) {
      case "artwork":
        return {
          label: "Approve proof",
          variant: "primary",
          onClick: () =>
            runAction("artwork", async () => {
              await setArtworkStatus(
                order.id,
                job.id,
                imprint.id,
                "approved"
              );
            }),
        };

      case "ink":
        return {
          label: "Mark ink ready",
          variant: "primary",
          onClick: () => runAction("ink", markInkReady),
        };

      case "screens":
        return {
          label: "Mark screens ready",
          variant: "primary",
          onClick: () => runAction("screens", markScreensReady),
        };

      case "blanks":
        return {
          label: "Receive blanks",
          onClick: () => openTab("blanks"),
        };

      case "dtf_transfers":
        return {
          label: "Receive DTF sheets",
          onClick: () => openTab("dtf_sheets"),
        };

      case "blank_source":
        return {
          label: "Set goods source",
          onClick: () => openTab("blanks"),
        };

      case "prep":
        if (imprint.decoration === "screen_print") {
          return {
            label: "Confirm screens",
            onClick: () => runAction("prep", markScreensReady),
          };
        }
        return {
          label: "Mark setup done",
          onClick: () => runAction("prep", markSetupDone),
        };

      case "scheduled":
        return onSchedule
          ? {
              label: "Schedule",
              variant: "primary",
              onClick: () => {
                onClose?.();
                onSchedule();
              },
            }
          : null;

      case "floor":
        return null;

      default:
        return null;
    }
  };

  if (applicableCards.length === 0) return null;

  return (
    <div className="space-y-2">
      {applicableCards.map((checkpoint) => (
        <ReadinessRow
          key={checkpoint.key}
          checkpoint={checkpoint}
          action={actionForCheckpoint(checkpoint)}
          saving={savingKey === checkpoint.key}
        />
      ))}
    </div>
  );
}
