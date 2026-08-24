"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, PackageCheck, PackageOpen } from "lucide-react";
import {
  DepartmentCardTitle,
  DepartmentEmptyState,
  DepartmentOrderLink,
  DepartmentQueueCard,
  departmentStatusPill,
} from "@/components/departments/department-shared";
import { DepartmentsShell } from "@/components/departments/departments-shell";
import { useSchedule } from "@/components/providers/schedule-provider";
import {
  applyDtfLineReceive,
  getDtfReceivingLines,
  materialReceiveOverage,
  mergeOrderMaterials,
  receiveAllDtfLines,
} from "@/lib/order-materials";
import { collectDtfQueue, type DtfQueueEntry } from "@/lib/department-queues";
import {
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DtfFilter = "pending" | "completed" | "all";

const FILTERS: Array<{ value: DtfFilter; label: string }> = [
  { value: "pending", label: "Needs receiving" },
  { value: "completed", label: "Received" },
  { value: "all", label: "All" },
];

function DtfReceiveRow({
  entry,
  saving,
  onReceive,
}: {
  entry: DtfQueueEntry;
  saving: boolean;
  onReceive: (quantity: number) => void;
}) {
  const [draft, setDraft] = useState(String(entry.line.receivedQty || ""));
  const overage = materialReceiveOverage(entry.line);

  useEffect(() => {
    setDraft(String(entry.line.receivedQty || ""));
  }, [entry.line.receivedQty, entry.line.id]);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2",
        entry.line.status === "received" ? "bg-white" : "bg-[#fff8f8]",
        overage > 0 && "border-amber-300 bg-[#fffbeb]"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-[#303030]">
          {entry.imprintLabel}
        </p>
        <p className={dashboardTaskDetailClass}>{entry.jobName}</p>
      </div>
      <span className="text-[12px] tabular-nums text-[#616161]">
        {entry.line.receivedQty}/{entry.line.expectedQty} transfers
      </span>
      <Input
        aria-label={`Received transfers for ${entry.imprintLabel}`}
        type="number"
        min={0}
        value={draft}
        disabled={saving}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const quantity = Math.max(0, Math.floor(Number(draft) || 0));
          setDraft(String(quantity));
          if (quantity !== entry.line.receivedQty) onReceive(quantity);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className={cn(
          "h-8 w-16 text-center text-[12px] tabular-nums",
          overage > 0 && "border-amber-300 bg-[#fffbeb]"
        )}
      />
      <button
        type="button"
        disabled={saving || entry.line.receivedQty === entry.line.expectedQty}
        onClick={() => onReceive(entry.line.expectedQty)}
        className={cn(
          dashboardGhostButtonClass,
          "h-8 px-2 text-[11px] font-semibold"
        )}
      >
        <Check className="size-3.5" />
        All
      </button>
      {overage > 0 ? (
        <p className="basis-full text-right text-[11px] font-medium text-amber-800">
          {entry.line.notes?.trim() ||
            `${overage} extra transfer${overage === 1 ? "" : "s"} received`}
        </p>
      ) : null}
    </div>
  );
}

export function DtfDepartmentPanel() {
  const { orders, getCustomerById, updateOrderMaterials } = useSchedule();
  const [filter, setFilter] = useState<DtfFilter>("pending");
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);

  const entries = useMemo(
    () => collectDtfQueue(orders, { includeCompleted: true }),
    [orders]
  );
  const filtered = useMemo(() => {
    if (filter === "pending") {
      return entries.filter((entry) => entry.line.status !== "received");
    }
    if (filter === "completed") {
      return entries.filter((entry) => entry.line.status === "received");
    }
    return entries;
  }, [entries, filter]);

  const groupedByOrder = useMemo(() => {
    const groups = new Map<string, DtfQueueEntry[]>();
    for (const entry of filtered) {
      groups.set(entry.order.id, [...(groups.get(entry.order.id) ?? []), entry]);
    }
    return [...groups.values()];
  }, [filtered]);

  const saveLine = async (entry: DtfQueueEntry, quantity: number) => {
    setSavingOrderId(entry.order.id);
    try {
      await updateOrderMaterials(
        entry.order.id,
        applyDtfLineReceive(
          mergeOrderMaterials(entry.order),
          entry.line.id,
          quantity,
          "Shop"
        )
      );
    } finally {
      setSavingOrderId(null);
    }
  };

  const receiveAll = async (orderId: string) => {
    const order = orders.find((entry) => entry.id === orderId);
    if (!order) return;
    setSavingOrderId(orderId);
    try {
      await updateOrderMaterials(
        orderId,
        receiveAllDtfLines(mergeOrderMaterials(order), "Shop")
      );
    } finally {
      setSavingOrderId(null);
    }
  };

  return (
    <DepartmentsShell
      activeSlug="dtf"
      title="DTF receiving"
      description="Check in DTF transfers by print location. Received transfers update the order’s materials checkpoint and production readiness."
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cn(
                dashboardControlClass,
                "h-8 px-3 text-xs font-semibold",
                filter === option.value
                  ? "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
                  : "text-[#303030]"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className={dashboardTaskDetailClass}>
          {entries.filter((entry) => entry.line.status !== "received").length}{" "}
          location{entries.filter((entry) => entry.line.status !== "received").length === 1 ? "" : "s"} waiting
        </p>
      </div>

      {groupedByOrder.length === 0 ? (
        <DepartmentEmptyState
          icon={PackageOpen}
          title="No DTF transfers to receive"
          description="Orders with DTF print locations will appear here when their transfers are ready to check in."
        />
      ) : (
        <div className="space-y-3">
          {groupedByOrder.map((group) => {
            const order = group[0]!.order;
            const customer = getCustomerById(order.customerId);
            const saving = savingOrderId === order.id;
            const allReceived = getDtfReceivingLines(
              mergeOrderMaterials(order)
            ).every((line) => line.status === "received");

            return (
              <div
                key={order.id}
                className={cn(
                  dashboardInsetSurfaceClass,
                  "rounded-xl border border-[#ebebeb] p-3.5"
                )}
              >
                <DepartmentQueueCard
                  customerId={order.customerId}
                  company={customer?.company ?? order.company}
                  logoUrl={customer?.logoUrl}
                  accentColorKey={customer?.accentColorKey}
                  fallbackKey={order.id}
                  rush={order.rush}
                  title={
                    <div className="flex flex-wrap items-center gap-2">
                      <DepartmentCardTitle>DTF transfers</DepartmentCardTitle>
                      {departmentStatusPill(
                        allReceived ? "Received" : "Waiting",
                        allReceived ? "success" : "neutral"
                      )}
                    </div>
                  }
                  subtitle={
                    <DepartmentOrderLink
                      orderId={order.id}
                      orderNumber={order.number}
                      customLabel={order.customLabel}
                    />
                  }
                  meta={
                    <p className={dashboardTaskDetailClass}>
                      {group.length} print location{group.length === 1 ? "" : "s"} ·
                      In hands {formatDate(order.inHandsDate)}
                    </p>
                  }
                  actions={
                    !allReceived ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void receiveAll(order.id)}
                        className={cn(
                          dashboardPrimaryButtonClass,
                          "h-8 px-3 text-xs"
                        )}
                      >
                        {saving ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <PackageCheck className="size-3.5" />
                        )}
                        Receive all
                      </button>
                    ) : null
                  }
                />
                <div className="mt-3 space-y-2">
                  {group.map((entry) => (
                    <DtfReceiveRow
                      key={entry.line.id}
                      entry={entry}
                      saving={saving}
                      onReceive={(quantity) => void saveLine(entry, quantity)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DepartmentsShell>
  );
}
