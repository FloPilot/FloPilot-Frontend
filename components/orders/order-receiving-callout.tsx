"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Megaphone,
  Package,
  PackageCheck,
  Truck,
} from "lucide-react";
import { useRegisterUnsavedChanges } from "@/components/layout/staff-unsaved-changes-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { mergeOrderMaterials } from "@/lib/order-materials";
import {
  computeReceivingOverview,
  receivingStatusLabel,
  receivingStatusTone,
  type ReceivingRollupStatus,
} from "@/lib/order-receiving-status";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

function LaneIcon({
  laneKey,
  className,
}: {
  laneKey: "blanks" | "subcontract";
  className?: string;
}) {
  if (laneKey === "subcontract") {
    return <Truck className={className} />;
  }
  return <Package className={className} />;
}

function StatusIcon({
  status,
  className,
}: {
  status: ReceivingRollupStatus;
  className?: string;
}) {
  if (status === "received") {
    return <CheckCircle2 className={className} />;
  }
  if (status === "partial") {
    return <AlertCircle className={className} />;
  }
  return <PackageCheck className={className} />;
}

export function OrderReceivingStatusBar({ order }: { order: Order }) {
  const overview = computeReceivingOverview(order);
  const tone = receivingStatusTone(overview.status);

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3.5 sm:px-5",
        tone.bar
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white/80",
              tone.icon
            )}
          >
            <StatusIcon status={overview.status} className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14px] font-semibold text-[#303030]">
                {overview.title}
              </p>
              <span
                className={cn(
                  "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  tone.badge
                )}
              >
                {receivingStatusLabel(overview.status)}
              </span>
            </div>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              {overview.detail}
            </p>
          </div>
        </div>
      </div>

      {overview.lanes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {overview.lanes.map((lane) => {
            const laneTone = receivingStatusTone(lane.status);
            return (
              <div
                key={lane.key}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border bg-white/80 px-2.5 py-1.5 text-[12px]",
                  laneTone.badge
                )}
              >
                <LaneIcon laneKey={lane.key} className="size-3.5" />
                <span className="font-medium text-[#303030]">{lane.label}</span>
                <span className="tabular-nums text-[#616161]">{lane.detail}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function OrderReceivingTeamCallout({ order }: { order: Order }) {
  const { updateOrderMaterials } = useSchedule();
  const saved = order.materials?.receivingCallout?.trim() || "";
  const [draft, setDraft] = useState(saved);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setDraft(saved);
  }, [saved, editing]);

  const dirty = draft.trim() !== saved;

  const discard = useCallback(() => {
    setDraft(saved);
    setEditing(false);
    setError(null);
  }, [saved]);

  const save = useCallback(async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      const materials = mergeOrderMaterials(order);
      await updateOrderMaterials(order.id, {
        ...materials,
        lines: materials.lines,
        blankSource: materials.blankSource ?? order.materials?.blankSource,
        receivingCallout: draft.trim() || null,
      });
      setEditing(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save receiving callout."
      );
    } finally {
      setSaving(false);
    }
  }, [dirty, saving, order, updateOrderMaterials, draft]);

  useRegisterUnsavedChanges(
    dirty || saving
      ? {
          dirty: true,
          saving,
          label: "Unsaved receiving callout",
          persistAcrossTabs: false,
          onSave: () => save(),
          onDiscard: discard,
        }
      : null,
    `order-receiving-callout-${order.id}`
  );

  if (!saved && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-3 text-left text-[13px] text-[#8a8a8a] transition-colors hover:border-[#c9c9c9] hover:bg-white hover:text-[#616161]"
      >
        <Megaphone className="size-4 shrink-0" />
        Add a callout for the receiving team…
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[#f5d0a8] bg-[#fff8eb] px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Megaphone className="size-4 text-[#8a6116]" />
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8a6116]">
            Receiving callout
          </p>
        </div>
        {!editing ? (
          <Button
            type="button"
            variant="ghost"
            className="h-7 px-2 text-[12px] text-[#8a6116] hover:bg-white/70"
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-2.5 space-y-2.5">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            placeholder="e.g. Watch for short Mediums — vendor reshipping Thursday. Subcontract patches ETA Friday."
            className="min-h-[64px] resize-none rounded-lg border-[#f5d0a8] bg-white text-[13px]"
            disabled={saving}
            autoFocus
          />
          {error ? (
            <p className="text-[12px] font-medium text-[#b42318]">{error}</p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn(dashboardControlClass, "h-8 text-[12px]")}
              disabled={saving}
              onClick={discard}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "h-8 px-3 text-[12px]")}
              disabled={!dirty || saving}
              onClick={() => void save()}
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save callout"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[#303030]">
          {saved}
        </p>
      )}
    </div>
  );
}
