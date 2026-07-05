"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ClipboardList,
  Loader2,
  Package,
  PackageCheck,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { PurchaseOrderDialog } from "@/components/inventory/purchase-order-dialog";
import { ReceivingView } from "@/components/inventory/receiving-view";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deletePurchaseOrder,
  listInventory,
  listPurchaseOrders,
  updatePurchaseOrder,
  type InventoryItem,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from "@/lib/api";
import { getWarehouseNames } from "@/lib/shop-settings";
import {
  buildReceivingQueue,
  receivingQueueStats,
} from "@/lib/receiving-queue";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardInsetSurfaceClass,
  dashboardKpiCardClass,
  dashboardKpiTitleClass,
  dashboardPrimaryButtonClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type StockStatus = "healthy" | "low" | "out";
type StatusFilter = "all" | StockStatus;
type Tab = "stock" | "orders" | "receiving";

function getStockStatus(item: InventoryItem): StockStatus {
  if (item.onHand <= 0) return "out";
  if (item.onHand <= item.reorderAt) return "low";
  return "healthy";
}

const STATUS_META: Record<
  StockStatus,
  { label: string; badge: string; bar: string }
> = {
  healthy: {
    label: "In stock",
    badge: "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]",
    bar: "bg-[#0d8a43]",
  },
  low: {
    label: "Low stock",
    badge: "border-[#f0d9a8] bg-[#fff8eb] text-[#8a6116]",
    bar: "bg-[#b6831f]",
  },
  out: {
    label: "Out of stock",
    badge: "border-[#f5b5b5] bg-[#fff1f1] text-[#8f1f1f]",
    bar: "bg-[#c43d3d]",
  },
};

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "healthy", label: "In stock" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
];

const PO_STATUS_META: Record<
  PurchaseOrderStatus,
  { label: string; badge: string }
> = {
  draft: {
    label: "Draft",
    badge: "border-[#e3e3e3] bg-[#f6f6f7] text-[#616161]",
  },
  ordered: {
    label: "Ordered",
    badge: "border-[#c4d7f2] bg-[#f4f7fd] text-[#2c6ecb]",
  },
  received: {
    label: "Received",
    badge: "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]",
  },
  cancelled: {
    label: "Cancelled",
    badge: "border-[#f5b5b5] bg-[#fff1f1] text-[#8f1f1f]",
  },
};

export function InventoryView() {
  const { getIdToken, profile } = useAuth();
  const { activeOrders } = useSchedule();
  const { settings } = useShopSettings();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("receiving");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [warehouse, setWarehouse] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [prefillItems, setPrefillItems] = useState<InventoryItem[] | undefined>(
    undefined
  );
  const [actingId, setActingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const token = await getIdToken();
    if (!token) throw new Error("Not signed in");
    const [inventoryRes, poRes] = await Promise.all([
      listInventory(token),
      listPurchaseOrders(token),
    ]);
    setItems(inventoryRes.items);
    setPurchaseOrders(poRes.purchaseOrders);
  }, [getIdToken]);

  useEffect(() => {
    if (profile?.type !== "staff") return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        await loadData();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load inventory"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [loadData, profile]);

  const warehouses = useMemo(() => {
    const set = new Set<string>(getWarehouseNames(settings.warehouses));
    for (const item of items) {
      if (item.warehouse) set.add(item.warehouse);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items, settings.warehouses]);

  const kpis = useMemo(() => {
    let units = 0;
    let low = 0;
    let out = 0;
    for (const item of items) {
      units += Math.max(0, item.onHand);
      const status = getStockStatus(item);
      if (status === "low") low += 1;
      if (status === "out") out += 1;
    }
    return { skus: items.length, units, low, out };
  }, [items]);

  const reorderItems = useMemo(
    () => items.filter((item) => getStockStatus(item) !== "healthy"),
    [items]
  );

  const openOrders = useMemo(
    () =>
      purchaseOrders.filter(
        (po) => po.status === "draft" || po.status === "ordered"
      ).length,
    [purchaseOrders]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (warehouse !== "all" && item.warehouse !== warehouse) return false;
      if (statusFilter !== "all" && getStockStatus(item) !== statusFilter) {
        return false;
      }
      if (query) {
        const haystack =
          `${item.name} ${item.sku} ${item.warehouse}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [items, search, statusFilter, warehouse]);

  const hasActiveFilters =
    statusFilter !== "all" || warehouse !== "all" || search.trim() !== "";

  const attention = kpis.low + kpis.out;

  const receivingStats = useMemo(() => {
    const queue = buildReceivingQueue(activeOrders);
    return receivingQueueStats(queue);
  }, [activeOrders]);

  const openCreateDialog = (prefill?: InventoryItem[]) => {
    setPrefillItems(prefill);
    setDialogOpen(true);
  };

  const handleCreated = async () => {
    try {
      await loadData();
    } catch {
      // surfaced on next manual refresh
    }
    setTab("orders");
  };

  const runPoAction = async (
    po: PurchaseOrder,
    action: () => Promise<unknown>
  ) => {
    setActingId(po.id);
    setError(null);
    try {
      await action();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update purchase order"
      );
    } finally {
      setActingId(null);
    }
  };

  const handleReceive = async (po: PurchaseOrder) => {
    const token = await getIdToken();
    if (!token) return;
    if (
      !confirm(
        `Receive ${po.number}? This adds the ordered quantities to your on-hand stock.`
      )
    ) {
      return;
    }
    await runPoAction(po, () =>
      updatePurchaseOrder(token, po.id, { status: "received" })
    );
  };

  const handleSetStatus = async (
    po: PurchaseOrder,
    status: PurchaseOrderStatus
  ) => {
    const token = await getIdToken();
    if (!token) return;
    await runPoAction(po, () =>
      updatePurchaseOrder(token, po.id, { status })
    );
  };

  const handleDelete = async (po: PurchaseOrder) => {
    const token = await getIdToken();
    if (!token) return;
    if (!confirm(`Delete ${po.number}? This cannot be undone.`)) return;
    await runPoAction(po, () => deletePurchaseOrder(token, po.id));
  };

  const kpiConfig: {
    key: "skus" | "units" | "low" | "out";
    label: string;
    hint: string;
    icon: LucideIcon;
    surface: string;
    border: string;
    iconWrap: string;
    iconColor: string;
    valueColor: string;
    filter?: StatusFilter;
  }[] = [
    {
      key: "skus",
      label: "Tracked items",
      hint: "Distinct SKUs in inventory",
      icon: Package,
      surface: "bg-white",
      border: "border-[#e3e3e3]",
      iconWrap: "bg-[#f1f1f1]",
      iconColor: "text-[#303030]",
      valueColor: "text-[#303030]",
      filter: "all",
    },
    {
      key: "units",
      label: "Units on hand",
      hint: "Total stock across all items",
      icon: Archive,
      surface: "bg-white",
      border: "border-[#e3e3e3]",
      iconWrap: "bg-[#f1f1f1]",
      iconColor: "text-[#303030]",
      valueColor: "text-[#303030]",
    },
    {
      key: "low",
      label: "Low stock",
      hint: "At or below reorder point",
      icon: AlertTriangle,
      surface: "bg-[#fff8eb]",
      border: "border-[#f0d9a8]",
      iconWrap: "bg-[#fff1d6]",
      iconColor: "text-[#8a6116]",
      valueColor: "text-[#8a6116]",
      filter: "low",
    },
    {
      key: "out",
      label: "Out of stock",
      hint: "Nothing left on the shelf",
      icon: AlertCircle,
      surface: "bg-[#fff1f1]",
      border: "border-[#f5b5b5]",
      iconWrap: "bg-[#fde2e2]",
      iconColor: "text-[#8f1f1f]",
      valueColor: "text-[#8f1f1f]",
      filter: "out",
    },
  ];

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={dashboardSectionTitleClass}>Warehouse</h1>
          <p className={cn("mt-1 max-w-2xl", dashboardTaskDetailClass)}>
            {tab === "receiving"
              ? "Receive blank garments for production orders. Qty received updates the order, jobs, and missing-blank alerts."
              : tab === "orders"
                ? "Create and track purchase orders for shop supplies and stock."
                : attention > 0
                  ? `${attention} item${attention !== 1 ? "s" : ""} need attention — restock before you run out`
                  : "Stock levels, blank receiving, and purchase orders in one place"}
          </p>
        </div>
        {tab !== "receiving" ? (
        <div className="flex flex-wrap items-center gap-2">
          {attention > 0 ? (
            <button
              type="button"
              onClick={() => openCreateDialog(reorderItems)}
              className={cn(dashboardControlClass, "h-9")}
            >
              <PackageCheck className="size-3.5" strokeWidth={1.75} />
              Restock low items
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => openCreateDialog()}
            className={cn(dashboardPrimaryButtonClass, "h-9")}
          >
            <Plus className="size-3.5" strokeWidth={2} />
            Create purchase order
          </button>
        </div>
        ) : null}
      </div>

      <div className="flex w-fit max-w-full overflow-x-auto rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] p-0.5">
        {(
          [
            { value: "receiving", label: "Receiving" },
            { value: "stock", label: "Stock levels" },
            { value: "orders", label: "Purchase orders" },
          ] as { value: Tab; label: string }[]
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTab(option.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              tab === option.value
                ? "bg-white text-[#303030] shadow-sm"
                : "text-[#616161] hover:text-[#303030]"
            )}
          >
            {option.label}
            {option.value === "orders" && openOrders > 0 ? (
              <span className="ml-1.5 rounded-full bg-[#2c6ecb]/10 px-1.5 py-0.5 text-[11px] font-semibold text-[#2c6ecb]">
                {openOrders}
              </span>
            ) : null}
            {option.value === "receiving" &&
            receivingStats.openOrders > 0 ? (
              <span className="ml-1.5 rounded-full bg-[#fde2e2] px-1.5 py-0.5 text-[11px] font-semibold text-[#8f1f1f]">
                {receivingStats.openOrders}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-4 py-3 text-[13px] text-[#8f1f1f]">
          {error}
        </p>
      )}

      {loading && tab !== "receiving" ? (
        <AppLoadingScreen label="Loading warehouse…" />
      ) : tab === "receiving" ? (
        <ReceivingView />
      ) : tab === "stock" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpiConfig.map((config) => {
              const Icon = config.icon;
              const value = kpis[config.key];
              const clickable = Boolean(config.filter);
              const active =
                config.filter !== undefined &&
                config.filter !== "all" &&
                statusFilter === config.filter;

              return (
                <button
                  key={config.key}
                  type="button"
                  disabled={!clickable}
                  onClick={() => {
                    if (!config.filter) return;
                    if (config.filter === "all") {
                      setStatusFilter("all");
                      return;
                    }
                    setStatusFilter((current) =>
                      current === config.filter ? "all" : config.filter!
                    );
                  }}
                  className={cn(
                    dashboardKpiCardClass,
                    "min-h-[128px] border text-left",
                    config.surface,
                    config.border,
                    !clickable && "cursor-default",
                    active && "ring-2 ring-[#2c6ecb]/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        config.iconWrap
                      )}
                    >
                      <Icon
                        className={cn("size-3.5", config.iconColor)}
                        strokeWidth={1.75}
                      />
                    </div>
                    <p className={dashboardKpiTitleClass}>{config.label}</p>
                  </div>
                  <p
                    className={cn(
                      dashboardValueClass,
                      "mt-2.5 tabular-nums",
                      config.valueColor
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

          <section className={dashboardCardClass}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-[15px] font-semibold text-[#303030]">
                  Stock levels
                </h2>
                <p className="mt-0.5 text-[13px] text-[#616161]">
                  {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                  {statusFilter !== "all"
                    ? ` · ${STATUS_META[statusFilter].label}`
                    : ""}
                  {warehouse !== "all" ? ` · ${warehouse}` : ""}
                </p>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search items or SKUs"
                  className="h-9 w-56 rounded-lg border border-[#e3e3e3] bg-white pl-8 pr-8 text-[13px] text-[#303030] shadow-[0_1px_0_rgba(26,26,26,0.04)] outline-none transition-colors placeholder:text-[#8a8a8a] focus:border-[#2c6ecb] focus:ring-2 focus:ring-[#2c6ecb]/20"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#8a8a8a] hover:text-[#303030]"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" strokeWidth={2} />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="space-y-0 p-4 sm:p-5">
              <div className={cn(dashboardInsetSurfaceClass, "overflow-visible")}>
                <div className="flex flex-wrap items-center gap-2 border-b border-[#ebebeb] px-3 py-2.5">
                  <div className="flex rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] p-0.5">
                    {STATUS_TABS.map((statusTab) => (
                      <button
                        key={statusTab.value}
                        type="button"
                        onClick={() => setStatusFilter(statusTab.value)}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                          statusFilter === statusTab.value
                            ? "bg-white text-[#303030] shadow-sm"
                            : "text-[#616161] hover:text-[#303030]"
                        )}
                      >
                        {statusTab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {warehouses.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                        Warehouse
                      </span>
                      <FilterChip
                        active={warehouse === "all"}
                        onClick={() => setWarehouse("all")}
                      >
                        All
                      </FilterChip>
                      {warehouses.map((name) => (
                        <FilterChip
                          key={name}
                          active={warehouse === name}
                          onClick={() => setWarehouse(name)}
                        >
                          {name}
                        </FilterChip>
                      ))}
                    </div>
                    {hasActiveFilters ? (
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("all");
                          setWarehouse("all");
                          setSearch("");
                        }}
                        className={cn(
                          dashboardControlClass,
                          "h-8 shrink-0 gap-1.5 px-2.5 text-[12px] text-[#616161] hover:text-[#303030]"
                        )}
                      >
                        <X className="size-3.5 shrink-0" strokeWidth={2} />
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <InventoryTable
                items={filtered}
                emptyMessage={
                  items.length === 0
                    ? "No inventory items yet. Add stock through your shop setup or backend seed."
                    : "No items match your filters. Try adjusting or clearing them."
                }
              />
            </div>
          </section>
        </>
      ) : (
        <PurchaseOrdersSection
          purchaseOrders={purchaseOrders}
          actingId={actingId}
          onReceive={handleReceive}
          onSetStatus={handleSetStatus}
          onDelete={handleDelete}
          onCreate={() => openCreateDialog()}
        />
      )}

      <PurchaseOrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        items={items}
        warehouses={warehouses}
        prefillItems={prefillItems}
        onCreated={handleCreated}
      />
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors",
        active
          ? "border-[#2c6ecb]/30 bg-[#f4f7fd] text-[#303030]"
          : "border-transparent text-[#616161] hover:bg-[#f6f6f7] hover:text-[#303030]"
      )}
    >
      {children}
    </button>
  );
}

function StockLevelBar({ item }: { item: InventoryItem }) {
  const status = getStockStatus(item);
  const denom = Math.max(item.reorderAt * 2, item.onHand, 1);
  const pct = Math.min(
    100,
    Math.max(item.onHand > 0 ? 4 : 0, (item.onHand / denom) * 100)
  );
  const reorderPct = Math.min(100, Math.max(0, (item.reorderAt / denom) * 100));

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-[#ebebeb]">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            STATUS_META[status].bar
          )}
          style={{ width: `${pct}%` }}
        />
        {item.reorderAt > 0 ? (
          <span
            className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-[#8a8a8a]/70"
            style={{ left: `${reorderPct}%` }}
            title={`Reorder at ${item.reorderAt}`}
          />
        ) : null}
      </div>
    </div>
  );
}

function InventoryTable({
  items,
  emptyMessage,
}: {
  items: InventoryItem[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] py-14 text-center text-[13px] text-[#616161]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="mt-4 -mx-4 overflow-x-auto border-t border-[#ebebeb] sm:-mx-5">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow className="border-[#ebebeb] hover:bg-transparent">
            <TableHead className="h-9 min-w-[200px] bg-[#fafafa] pl-4 text-[12px] font-medium text-[#616161] sm:pl-5">
              Item
            </TableHead>
            <TableHead className="h-9 min-w-[120px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
              SKU
            </TableHead>
            <TableHead className="h-9 min-w-[120px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
              Warehouse
            </TableHead>
            <TableHead className="h-9 min-w-[88px] bg-[#fafafa] text-right text-[12px] font-medium text-[#616161]">
              On hand
            </TableHead>
            <TableHead className="h-9 min-w-[88px] bg-[#fafafa] text-right text-[12px] font-medium text-[#616161]">
              Reorder at
            </TableHead>
            <TableHead className="h-9 min-w-[140px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
              Stock level
            </TableHead>
            <TableHead className="h-9 min-w-[120px] bg-[#fafafa] pr-4 text-[12px] font-medium text-[#616161] sm:pr-5">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const status = getStockStatus(item);
            const meta = STATUS_META[status];

            return (
              <TableRow
                key={item.id ?? item.sku}
                className="border-[#ebebeb] hover:bg-[#f6f6f7]"
              >
                <TableCell className="py-2.5 pl-4 text-[13px] font-medium text-[#303030] sm:pl-5">
                  {item.name}
                </TableCell>
                <TableCell className="py-2.5 font-mono text-[12px] text-[#616161]">
                  {item.sku}
                </TableCell>
                <TableCell className="py-2.5 text-[13px] text-[#303030]">
                  {item.warehouse || "—"}
                </TableCell>
                <TableCell className="py-2.5 text-right text-[13px] font-medium tabular-nums text-[#303030]">
                  {item.onHand.toLocaleString()}
                </TableCell>
                <TableCell className="py-2.5 text-right text-[13px] tabular-nums text-[#616161]">
                  {item.reorderAt.toLocaleString()}
                </TableCell>
                <TableCell className="py-2.5">
                  <StockLevelBar item={item} />
                </TableCell>
                <TableCell className="py-2.5 pr-4 sm:pr-5">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                      meta.badge
                    )}
                  >
                    {meta.label}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function PurchaseOrdersSection({
  purchaseOrders,
  actingId,
  onReceive,
  onSetStatus,
  onDelete,
  onCreate,
}: {
  purchaseOrders: PurchaseOrder[];
  actingId: string | null;
  onReceive: (po: PurchaseOrder) => void;
  onSetStatus: (po: PurchaseOrder, status: PurchaseOrderStatus) => void;
  onDelete: (po: PurchaseOrder) => void;
  onCreate: () => void;
}) {
  return (
    <section className={dashboardCardClass}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-[15px] font-semibold text-[#303030]">
            Purchase orders
          </h2>
          <p className="mt-0.5 text-[13px] text-[#616161]">
            {purchaseOrders.length} order
            {purchaseOrders.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {purchaseOrders.length === 0 ? (
        <div className="px-4 py-14 text-center sm:px-5">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[#f1f1f1]">
            <ClipboardList className="size-5 text-[#8a8a8a]" strokeWidth={1.75} />
          </div>
          <p className="mt-3 text-[14px] font-semibold text-[#303030]">
            No purchase orders yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-[#616161]">
            Create a purchase order to restock supplies. When it arrives, mark it
            received and the quantities flow straight into your on-hand counts.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className={cn(dashboardPrimaryButtonClass, "mt-4 h-9")}
          >
            <Plus className="size-3.5" strokeWidth={2} />
            Create purchase order
          </button>
        </div>
      ) : (
        <div className="-mx-px overflow-x-auto">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow className="border-[#ebebeb] hover:bg-transparent">
                <TableHead className="h-9 min-w-[120px] bg-[#fafafa] pl-4 text-[12px] font-medium text-[#616161] sm:pl-5">
                  PO
                </TableHead>
                <TableHead className="h-9 min-w-[160px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                  Supplier
                </TableHead>
                <TableHead className="h-9 min-w-[120px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                  Items
                </TableHead>
                <TableHead className="h-9 min-w-[100px] bg-[#fafafa] text-right text-[12px] font-medium text-[#616161]">
                  Total
                </TableHead>
                <TableHead className="h-9 min-w-[110px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                  Created
                </TableHead>
                <TableHead className="h-9 min-w-[100px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                  Status
                </TableHead>
                <TableHead className="h-9 min-w-[200px] bg-[#fafafa] pr-4 text-right text-[12px] font-medium text-[#616161] sm:pr-5">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.map((po) => {
                const meta = PO_STATUS_META[po.status];
                const units = po.lineItems.reduce(
                  (sum, li) => sum + li.quantity,
                  0
                );
                const busy = actingId === po.id;
                const canReceive =
                  po.status === "draft" || po.status === "ordered";

                return (
                  <TableRow
                    key={po.id}
                    className="border-[#ebebeb] hover:bg-[#f6f6f7]"
                  >
                    <TableCell className="py-2.5 pl-4 text-[13px] font-semibold text-[#303030] sm:pl-5">
                      {po.number}
                    </TableCell>
                    <TableCell className="py-2.5 text-[13px] text-[#303030]">
                      {po.supplier || (
                        <span className="text-[#8a8a8a]">—</span>
                      )}
                      {po.warehouse ? (
                        <span className="block text-[12px] text-[#8a8a8a]">
                          {po.warehouse}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="py-2.5 text-[13px] text-[#616161]">
                      {po.lineItems.length} item
                      {po.lineItems.length !== 1 ? "s" : ""} ·{" "}
                      <span className="tabular-nums">{units}</span> units
                    </TableCell>
                    <TableCell className="py-2.5 text-right text-[13px] font-medium tabular-nums text-[#303030]">
                      {formatCurrency(po.total)}
                    </TableCell>
                    <TableCell className="py-2.5 text-[13px] text-[#616161]">
                      {po.createdAt ? formatDate(po.createdAt) : "—"}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                          meta.badge
                        )}
                      >
                        {meta.label}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 pr-4 text-right sm:pr-5">
                      <div className="flex items-center justify-end gap-1.5">
                        {busy ? (
                          <Loader2 className="size-4 animate-spin text-[#8a8a8a]" />
                        ) : (
                          <>
                            {canReceive ? (
                              <button
                                type="button"
                                onClick={() => onReceive(po)}
                                className={cn(
                                  dashboardControlClass,
                                  "h-8 gap-1.5 px-2.5 text-[12px] text-[#0d5c2e]"
                                )}
                              >
                                <PackageCheck
                                  className="size-3.5"
                                  strokeWidth={1.75}
                                />
                                Receive
                              </button>
                            ) : null}
                            {canReceive ? (
                              <button
                                type="button"
                                onClick={() => onSetStatus(po, "cancelled")}
                                className={cn(
                                  dashboardGhostButtonClass,
                                  "h-8 px-2.5 text-[12px]"
                                )}
                              >
                                Cancel
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onDelete(po)}
                                className={cn(
                                  dashboardGhostButtonClass,
                                  "h-8 px-2.5 text-[12px] text-[#8f1f1f] hover:bg-[#fff1f1]"
                                )}
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
