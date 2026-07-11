"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Loader2, PackageOpen, Search } from "lucide-react";
import { useSchedule } from "@/components/providers/schedule-provider";
import { RushBadge } from "@/components/status-badges";
import { Input } from "@/components/ui/input";
import {
  DepartmentCardTitle,
  DepartmentEmptyState,
  DepartmentOrderLink,
  DepartmentQueueCard,
  departmentStatusPill,
} from "@/components/departments/department-shared";
import { DepartmentsShell } from "@/components/departments/departments-shell";
import {
  applyGarmentLineReceive,
  GARMENT_RECEIVE_STATUS_STYLES,
  mergeOrderMaterials,
  receiveAllGarmentLines,
} from "@/lib/order-materials";
import { blankSourceLabel } from "@/lib/order-receiving-checkpoints";
import {
  buildReceivingQueue,
  filterReceivingQueue,
  receivingQueueStats,
  type ReceivingFilter,
} from "@/lib/receiving-queue";
import {
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import type { OrderMaterialLine } from "@/types";
import { cn } from "@/lib/utils";

const FILTER_TABS: { value: ReceivingFilter; label: string }[] = [
  { value: "open", label: "Needs receiving" },
  { value: "partial", label: "Partial" },
  { value: "all", label: "All" },
];

function GarmentLineRow({
  line,
  saving,
  onReceive,
}: {
  line: OrderMaterialLine;
  saving: boolean;
  onReceive: (qty: number) => void;
}) {
  const [draft, setDraft] = useState(String(line.receivedQty || ""));
  const styles = GARMENT_RECEIVE_STATUS_STYLES[line.status];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2",
        styles.row
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-[#303030]">
          {line.productName}
        </p>
        <p className={dashboardTaskDetailClass}>
          {[line.brand, line.color, line.size].filter(Boolean).join(" · ")}
        </p>
      </div>
      <span className="text-[12px] tabular-nums text-[#616161]">
        {line.receivedQty}/{line.expectedQty}
      </span>
      <Input
        type="number"
        min={0}
        max={line.expectedQty}
        value={draft}
        disabled={saving || line.status === "received"}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const parsed = Number.parseInt(draft, 10);
          const qty = Number.isFinite(parsed) ? parsed : 0;
          if (qty !== line.receivedQty) onReceive(qty);
        }}
        className="h-8 w-16 text-center text-[12px]"
      />
      <button
        type="button"
        disabled={saving || line.status === "received"}
        onClick={() => onReceive(line.expectedQty)}
        className={cn(dashboardGhostButtonClass, "h-8 px-2 text-[11px] font-semibold")}
      >
        <Check className="size-3.5" />
        All
      </button>
    </div>
  );
}

export function ReceivingDepartmentPanel() {
  const { orders, getCustomerById, updateOrderMaterials } = useSchedule();
  const [filter, setFilter] = useState<ReceivingFilter>("open");
  const [search, setSearch] = useState("");
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);

  const queue = useMemo(() => buildReceivingQueue(orders), [orders]);
  const filtered = useMemo(
    () => filterReceivingQueue(queue, filter, search),
    [queue, filter, search]
  );
  const stats = useMemo(() => receivingQueueStats(queue), [queue]);

  const saveGarments = async (
    orderId: string,
    updater: (materials: ReturnType<typeof mergeOrderMaterials>) => ReturnType<typeof mergeOrderMaterials>
  ) => {
    const order = orders.find((entry) => entry.id === orderId);
    if (!order) return;
    setSavingOrderId(orderId);
    try {
      const materials = mergeOrderMaterials(order);
      await updateOrderMaterials(orderId, updater(materials));
    } finally {
      setSavingOrderId(null);
    }
  };

  return (
    <DepartmentsShell
      activeSlug="receiving"
      title="Receiving queue"
      description="Blank garments and inbound goods waiting to be checked in. Full warehouse inventory stays under Warehouse in the sidebar."
    >
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={cn(
                dashboardControlClass,
                "h-8 px-3 text-xs font-semibold",
                filter === tab.value
                  ? "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
                  : "text-[#303030]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search orders or blanks…"
            className="h-8 pl-8 text-[13px]"
          />
        </div>
      </div>

      <p className={cn("mb-3", dashboardTaskDetailClass)}>
        {stats.openOrders} order{stats.openOrders !== 1 ? "s" : ""} waiting ·{" "}
        {stats.piecesOutstanding} piece{stats.piecesOutstanding !== 1 ? "s" : ""}{" "}
        outstanding
        <span className="mx-2 text-[#d4d4d4]">·</span>
        <Link href="/app/inventory" className="text-[#2c6ecb] hover:underline">
          Open warehouse
        </Link>
      </p>

      {filtered.length === 0 ? (
        <DepartmentEmptyState
          icon={PackageOpen}
          title="Nothing to receive"
          description="Orders with blank garments to check in will appear here."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((group) => {
            const customer = getCustomerById(group.order.customerId);
            const saving = savingOrderId === group.order.id;
            const linesToShow =
              filter === "open" ? group.openGarmentLines : group.garmentLines;

            return (
              <div
                key={group.order.id}
                className={cn(dashboardInsetSurfaceClass, "rounded-xl border border-[#ebebeb] p-3.5")}
              >
                <DepartmentQueueCard
                  customerId={group.order.customerId}
                  company={customer?.company ?? group.order.company}
                  logoUrl={customer?.logoUrl}
                  accentColorKey={customer?.accentColorKey}
                  fallbackKey={group.order.id}
                  rush={group.order.rush}
                  title={
                    <div className="flex flex-wrap items-center gap-2">
                      <DepartmentCardTitle>
                        {blankSourceLabel(group.blankSource)}
                      </DepartmentCardTitle>
                      {departmentStatusPill(
                        group.openLineCount === 0
                          ? "Complete"
                          : group.aggregateStatus === "partial"
                            ? "Partial"
                            : "Waiting",
                        group.openLineCount === 0
                          ? "success"
                          : group.aggregateStatus === "partial"
                            ? "warning"
                            : "neutral"
                      )}
                    </div>
                  }
                  subtitle={
                    <DepartmentOrderLink
                      orderId={group.order.id}
                      orderNumber={group.order.number}
                      customLabel={group.order.customLabel}
                    />
                  }
                  meta={
                    <p className={dashboardTaskDetailClass}>
                      {group.totalReceived}/{group.totalExpected} pieces · In
                      hands {formatDate(group.order.inHandsDate)}
                    </p>
                  }
                  actions={
                    group.openLineCount > 0 ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          void saveGarments(group.order.id, (materials) =>
                            receiveAllGarmentLines(materials, "Shop")
                          );
                        }}
                        className={cn(dashboardPrimaryButtonClass, "h-8 px-3 text-xs")}
                      >
                        {saving ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                        Receive all
                      </button>
                    ) : null
                  }
                />

                <div className="mt-3 space-y-2">
                  {linesToShow.map((line) => (
                    <GarmentLineRow
                      key={line.id}
                      line={line}
                      saving={saving}
                      onReceive={(qty) => {
                        void saveGarments(group.order.id, (materials) =>
                          applyGarmentLineReceive(
                            materials,
                            line.id,
                            qty,
                            "Shop"
                          )
                        );
                      }}
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
