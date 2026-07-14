"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronRight,
  ClipboardList,
  Loader2,
  PackageOpen,
  Search,
  Shirt,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { RushBadge } from "@/components/status-badges";
import { Input } from "@/components/ui/input";
import { formatOrderDisplayLine } from "@/lib/order-display";
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
  type ReceivingOrderGroup,
} from "@/lib/receiving-queue";
import {
  dashboardCardClass,
  dashboardGhostButtonClass,
  dashboardInsetSurfaceClass,
  dashboardKpiCardClass,
  dashboardKpiTitleClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import { formatDate, formatDateTime } from "@/lib/format";
import type { OrderMaterialLine } from "@/types";
import { cn } from "@/lib/utils";

const FILTER_TABS: { value: ReceivingFilter; label: string }[] = [
  { value: "open", label: "Needs receiving" },
  { value: "partial", label: "Partial" },
  { value: "complete", label: "Complete" },
  { value: "all", label: "All orders" },
];

type ReceivingKpiKey =
  | "openOrders"
  | "missingLines"
  | "partialLines"
  | "piecesOutstanding";

function ReceivingKpiGrid({
  stats,
  filter,
  onFilterChange,
}: {
  stats: ReturnType<typeof receivingQueueStats>;
  filter: ReceivingFilter;
  onFilterChange: (filter: ReceivingFilter) => void;
}) {
  const neutralStyles = {
    surface: "bg-white",
    border: "border-[#e3e3e3]",
    iconWrap: "bg-[#f1f1f1]",
    iconColor: "text-[#303030]",
    valueColor: "text-[#303030]",
  };

  const redStyles = {
    surface: "bg-[#fff1f1]",
    border: "border-[#f5b5b5]",
    iconWrap: "bg-[#fde2e2]",
    iconColor: "text-[#8f1f1f]",
    valueColor: "text-[#8f1f1f]",
  };

  const yellowStyles = {
    surface: "bg-[#fff8eb]",
    border: "border-[#f0d9a8]",
    iconWrap: "bg-[#fff1d6]",
    iconColor: "text-[#8a6116]",
    valueColor: "text-[#8a6116]",
  };

  const kpiConfig: {
    key: ReceivingKpiKey;
    label: string;
    hint: string;
    icon: LucideIcon;
    filter?: ReceivingFilter;
    resolveStyles: (value: number) => typeof neutralStyles;
  }[] = [
    {
      key: "openOrders",
      label: "Orders awaiting",
      hint: "Production orders still missing blanks",
      icon: ClipboardList,
      filter: "open",
      resolveStyles: () => neutralStyles,
    },
    {
      key: "missingLines",
      label: "Missing size lines",
      hint: "Sizes with zero pieces received",
      icon: AlertCircle,
      filter: "open",
      resolveStyles: (value) => (value > 0 ? redStyles : neutralStyles),
    },
    {
      key: "partialLines",
      label: "Partially received",
      hint: "Lines with some qty in, not complete",
      icon: AlertTriangle,
      filter: "partial",
      resolveStyles: (value) => (value > 0 ? yellowStyles : neutralStyles),
    },
    {
      key: "piecesOutstanding",
      label: "Pieces outstanding",
      hint: "Total blank pieces still to receive",
      icon: Shirt,
      resolveStyles: (value) =>
        value > 0
          ? { ...neutralStyles, valueColor: redStyles.valueColor }
          : neutralStyles,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpiConfig.map((config) => {
        const Icon = config.icon;
        const value = stats[config.key];
        const styles = config.resolveStyles(value);
        const clickable = Boolean(config.filter);
        const active = config.filter !== undefined && filter === config.filter;

        return (
          <button
            key={config.key}
            type="button"
            disabled={!clickable}
            onClick={() => {
              if (!config.filter) return;
              onFilterChange(
                filter === config.filter ? "all" : config.filter!
              );
            }}
            className={cn(
              dashboardKpiCardClass,
              "min-h-[128px] border text-left transition-[box-shadow,background-color,border-color] duration-200",
              styles.surface,
              styles.border,
              !clickable && "cursor-default",
              clickable && "hover:shadow-sm",
              active && "ring-2 ring-[#2c6ecb]/30"
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg",
                  styles.iconWrap
                )}
              >
                <Icon
                  className={cn("size-3.5", styles.iconColor)}
                  strokeWidth={1.75}
                />
              </div>
              <p className={dashboardKpiTitleClass}>{config.label}</p>
            </div>
            <p
              className={cn(
                dashboardValueClass,
                "mt-2.5 tabular-nums",
                styles.valueColor
              )}
            >
              {value.toLocaleString()}
            </p>
            <p className="mt-1.5 text-xs leading-snug text-[#616161]">
              {config.hint}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function GarmentReceiveRow({
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

  useEffect(() => {
    setDraft(String(line.receivedQty || ""));
  }, [line.receivedQty, line.id]);

  return (
    <tr className={cn("border-t border-[#ebebeb]", styles.row)}>
      <td className="px-4 py-3 align-top sm:pl-5">
        <p className="text-[13px] font-semibold text-[#303030]">
          {line.productName}
        </p>
        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
          {[line.brand, line.color].filter(Boolean).join(" · ")}
        </p>
      </td>
      <td className="px-3 py-3 align-top">
        <span className="inline-flex rounded-md border border-[#e3e3e3] bg-white px-2 py-1 text-[12px] font-semibold tabular-nums text-[#303030]">
          {line.size}
        </span>
      </td>
      <td className="px-3 py-3 align-top text-right text-[13px] font-medium tabular-nums text-[#303030]">
        {line.expectedQty}
      </td>
      <td className="px-3 py-3 align-top">
        <div className="flex items-center justify-end gap-1.5">
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
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            className="h-9 w-[72px] rounded-lg border-[#e3e3e3] text-right text-[13px] tabular-nums"
          />
          {line.status !== "received" ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => onReceive(line.expectedQty)}
              className={cn(
                dashboardGhostButtonClass,
                "h-9 shrink-0 px-2.5 text-[12px] font-semibold"
              )}
              title="Receive remaining quantity"
            >
              All
            </button>
          ) : (
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-[#e8f5ee] text-[#0d5c2e]">
              <Check className="size-4" strokeWidth={2.25} />
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3 align-top">
        <span
          className={cn(
            "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            styles.badge
          )}
        >
          {styles.label}
        </span>
        {line.receivedBy ? (
          <p className={cn("mt-1.5 max-w-[140px]", dashboardTaskDetailClass)}>
            {line.receivedBy}
            {line.receivedAt ? (
              <span className="block text-[11px] text-[#8a8a8a]">
                {formatDateTime(line.receivedAt)}
              </span>
            ) : null}
          </p>
        ) : null}
      </td>
    </tr>
  );
}

function ReceivingOrderCard({
  group,
  saving,
  onReceiveLine,
  onReceiveAll,
}: {
  group: ReceivingOrderGroup;
  saving: boolean;
  onReceiveLine: (lineId: string, qty: number) => void;
  onReceiveAll: () => void;
}) {
  const {
    order,
    openGarmentLines,
    jobs,
    blankSource,
    totalExpected,
    totalReceived,
  } = group;
  const styles = GARMENT_RECEIVE_STATUS_STYLES[group.aggregateStatus];
  const progress =
    totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;
  const linesToShow =
    group.openLineCount > 0 ? openGarmentLines : group.garmentLines;

  return (
    <article className={cn(dashboardCardClass, "overflow-hidden")}>
      <div
        className={cn(
          "border-b border-[#ebebeb] px-4 py-4 sm:px-5",
          group.aggregateStatus === "waiting"
            ? "bg-[#fff8f8]"
            : group.aggregateStatus === "partial"
              ? "bg-[#fffdf5]"
              : "bg-[#fafafa]"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/app/orders/${order.id}?tab=blanks`}
                className="text-[15px] font-semibold text-[#303030] hover:text-[#2c6ecb]"
              >
                {formatOrderDisplayLine(order)}
              </Link>
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  styles.badge
                )}
              >
                {styles.label}
              </span>
              {order.rush ? <RushBadge /> : null}
            </div>
            <p className={cn("mt-1", dashboardTaskDetailClass)}>
              {order.customerName}
              <span className="mx-1.5 text-[#c9c9c9]">·</span>
              Client ETA {formatDate(order.inHandsDate)}
              <span className="mx-1.5 text-[#c9c9c9]">·</span>
              {blankSourceLabel(blankSource)}
            </p>
            {jobs.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {jobs.map((job) => (
                  <span
                    key={job.id}
                    className="rounded-md border border-[#e3e3e3] bg-white px-2 py-0.5 text-[11px] font-medium text-[#616161]"
                  >
                    {job.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <p className="text-[13px] font-semibold tabular-nums text-[#303030]">
              {totalReceived}/{totalExpected} pcs
            </p>
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[#ebebeb]">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  group.aggregateStatus === "received"
                    ? "bg-[#0d8a43]"
                    : group.aggregateStatus === "partial"
                      ? "bg-[#b6831f]"
                      : "bg-[#c43d3d]"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            {group.openLineCount > 0 ? (
              <button
                type="button"
                disabled={saving}
                onClick={onReceiveAll}
                className={cn(dashboardPrimaryButtonClass, "h-8 px-3 text-[12px]")}
              >
                Receive all open
              </button>
            ) : null}
            <Link
              href={`/app/orders/${order.id}?tab=blanks`}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-[#2c6ecb] hover:underline"
            >
              Open order
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-[#ebebeb] bg-[#fafafa] text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              <th className="px-4 py-2.5 font-medium sm:pl-5">Blank</th>
              <th className="px-3 py-2.5 font-medium">Size</th>
              <th className="px-3 py-2.5 text-right font-medium">Ordered</th>
              <th className="px-3 py-2.5 text-right font-medium">Received</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {linesToShow.map((line) => (
              <GarmentReceiveRow
                key={line.id}
                line={line}
                saving={saving}
                onReceive={(qty) => onReceiveLine(line.id, qty)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export function ReceivingView() {
  const { profile } = useAuth();
  const { activeOrders, updateOrderMaterials, shopDataLoading } = useSchedule();
  const [filter, setFilter] = useState<ReceivingFilter>("open");
  const [query, setQuery] = useState("");
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const receiverName = profile?.type === "staff" ? profile.user.name : "Staff";

  const queue = useMemo(
    () => buildReceivingQueue(activeOrders),
    [activeOrders]
  );

  const filtered = useMemo(
    () => filterReceivingQueue(queue, filter, query),
    [queue, filter, query]
  );

  const stats = useMemo(() => receivingQueueStats(queue), [queue]);

  const persistMaterials = async (
    orderId: string,
    materials: ReturnType<typeof mergeOrderMaterials>
  ) => {
    setSavingOrderId(orderId);
    setError(null);
    try {
      await updateOrderMaterials(orderId, materials);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save receiving update."
      );
    } finally {
      setSavingOrderId(null);
    }
  };

  const handleReceiveLine = async (
    group: ReceivingOrderGroup,
    lineId: string,
    qty: number
  ) => {
    const materials = mergeOrderMaterials(group.order);
    const next = applyGarmentLineReceive(
      materials,
      lineId,
      qty,
      receiverName
    );
    await persistMaterials(group.order.id, next);
  };

  const handleReceiveAll = async (group: ReceivingOrderGroup) => {
    const materials = mergeOrderMaterials(group.order);
    const next = receiveAllGarmentLines(materials, receiverName);
    await persistMaterials(group.order.id, next);
  };

  if (shopDataLoading) {
    return (
      <div className={cn(dashboardCardClass, "flex items-center justify-center px-6 py-16")}>
        <Loader2 className="size-6 animate-spin text-[#8a8a8a]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ReceivingKpiGrid
        stats={stats}
        filter={filter}
        onFilterChange={setFilter}
      />

      <div
        className={cn(
          dashboardInsetSurfaceClass,
          "flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
        )}
      >
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search order, customer, blank, size, job…"
            className="h-10 rounded-lg border-[#e3e3e3] bg-white pl-9 text-[13px]"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] p-0.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                filter === tab.value
                  ? "bg-white text-[#303030] shadow-sm"
                  : "text-[#616161] hover:text-[#303030]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-4 py-3 text-[13px] text-[#8f1f1f]">
          {error}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <div
          className={cn(
            dashboardCardClass,
            "flex flex-col items-center px-6 py-14 text-center"
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-[#e8f5ee] text-[#0d5c2e]">
            <PackageOpen className="size-6" strokeWidth={1.75} />
          </div>
          <h3 className="mt-4 text-[15px] font-semibold text-[#303030]">
            {filter === "complete"
              ? "No fully received orders in this view"
              : "Nothing waiting to receive"}
          </h3>
          <p className={cn("mt-2 max-w-md", dashboardTaskDetailClass)}>
            {filter === "open"
              ? "Orders with blank garments still waiting to arrive show up here. Mark received qty by size to update the order and production jobs."
              : "Try a different filter or search term."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((group) => (
            <ReceivingOrderCard
              key={group.order.id}
              group={group}
              saving={savingOrderId === group.order.id}
              onReceiveLine={(lineId, qty) =>
                void handleReceiveLine(group, lineId, qty)
              }
              onReceiveAll={() => void handleReceiveAll(group)}
            />
          ))}
        </div>
      )}

      <p
        className={cn(
          "flex items-center gap-2 px-1 text-[12px] text-[#616161]",
          dashboardTaskDetailClass
        )}
      >
        <Truck className="size-3.5 shrink-0" strokeWidth={1.75} />
        Receiving here updates blank status on the linked order and production
        events. Missing blanks show in red until qty is received.
        {savingOrderId ? (
          <Loader2 className="ml-1 size-3.5 animate-spin text-[#616161]" />
        ) : null}
      </p>
    </div>
  );
}
