"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Mail,
  MapPin,
  Phone,
  Search,
  StickyNote,
  User,
} from "lucide-react";
import { CustomerOrderDialog } from "@/components/customers/customer-order-dialog";
import { formatCustomerFullName } from "@/lib/customers";
import { ReportsLauncher } from "@/components/reports/reports-launcher";
import { useSchedule } from "@/components/providers/schedule-provider";
import { NewOrderButton } from "@/components/providers/new-order-provider";
import { OrderStatusBadge, RushBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  computeCustomerOrderStats,
  filterCustomerOrders,
  ORDER_STATUS_FILTER_OPTIONS,
  sortCustomerOrders,
  type OrderHistorySort,
} from "@/lib/customer-orders";
import type { Order, OrderStatus } from "@/types";
import { cn } from "@/lib/utils";

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const {
    getCustomerById,
    getOrdersByCustomerId,
    createReorderFromOrder,
    shopDataLoading,
  } = useSchedule();
  const customer = getCustomerById(customerId);
  const allOrders = getOrdersByCustomerId(customerId);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [sort, setSort] = useState<OrderHistorySort>("newest");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [reorderToast, setReorderToast] = useState<string | null>(null);
  const [welcomeVisible, setWelcomeVisible] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      setWelcomeVisible(true);
    }
  }, []);

  const filteredOrders = useMemo(() => {
    const filtered = filterCustomerOrders(allOrders, search, statusFilter);
    return sortCustomerOrders(filtered, sort);
  }, [allOrders, search, statusFilter, sort]);

  const stats = useMemo(
    () => computeCustomerOrderStats(allOrders),
    [allOrders]
  );

  const handleReorder = async (sourceOrderId: string) => {
    const created = await createReorderFromOrder(sourceOrderId);
    if (!created) return;
    setSelectedOrderId(created.id);
    setReorderToast(
      `Created ${created.number} as a new quote — review artwork and schedule when ready.`
    );
    setTimeout(() => setReorderToast(null), 6000);
  };

  if (!customer) {
    return (
      <main className="flex-1 p-8 text-center">
        <p className="text-muted-foreground">
          {shopDataLoading ? "Loading customer…" : "Customer not found."}
        </p>
        <Button
          className="mt-4 rounded-full"
          nativeButton={false}
          render={<Link href="/app/customers" />}
        >
          Back to customers
        </Button>
      </main>
    );
  }

  return (
    <>
      <header className="border-b border-border bg-white px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shrink-0 mt-0.5"
              nativeButton={false}
              render={<Link href="/app/customers" />}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-brand-ink truncate">
                {customer.company}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <User className="size-3.5" />
                  {formatCustomerFullName(customer)}
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <ReportsLauncher
              context="customer_detail"
              contextLabel={customer.company}
              data={{ customer, orders: allOrders }}
            />
            <NewOrderButton customerId={customer.id} size="default" />
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {welcomeVisible && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-brand-primary/20 bg-brand-primary/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-brand-ink">
              <span className="font-medium">{customer.company}</span>
              {" was added to your customer list. Start their first order when you're ready."}
            </p>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <NewOrderButton
                customerId={customer.id}
                size="sm"
                onOpen={() => setWelcomeVisible(false)}
              />
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={() => setWelcomeVisible(false)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {reorderToast && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {reorderToast}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <MetricCard
            label="Open balance"
            value={
              stats.totalOrders === 0
                ? "—"
                : stats.openBalance > 0
                  ? formatCurrency(stats.openBalance)
                  : "All paid"
            }
            detail={stats.totalOrders === 0 ? "No orders yet" : undefined}
            tone={
              stats.totalOrders === 0
                ? "neutral"
                : stats.openBalance > 0
                  ? "warning"
                  : "good"
            }
          />
          <MetricCard
            label="Active orders"
            value={String(stats.activeCount)}
            detail={`${stats.totalOrders} total`}
          />
          <MetricCard
            label="Completed"
            value={String(stats.completedCount)}
          />
          <MetricCard
            label="Last order"
            value={stats.lastOrderNumber ?? "—"}
            detail={
              stats.lastOrderDate
                ? formatDate(stats.lastOrderDate)
                : undefined
            }
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <a
                  href={`mailto:${customer.email}`}
                  className="flex items-center gap-2 text-brand-primary hover:underline"
                >
                  <Mail className="size-4 shrink-0" />
                  {customer.email}
                </a>
                <a
                  href={`tel:${customer.phone.replace(/\D/g, "")}`}
                  className="flex items-center gap-2 text-brand-primary hover:underline"
                >
                  <Phone className="size-4 shrink-0" />
                  {customer.phone}
                </a>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4 shrink-0" />
                  {customer.city}, {customer.state}
                </p>
                {customer.customerSince && (
                  <p className="flex items-center gap-2 text-muted-foreground text-xs pt-2 border-t border-border">
                    <Calendar className="size-3.5" />
                    Customer since {formatDate(customer.customerSince)}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div>
                    <p className="text-muted-foreground text-xs">Orders</p>
                    <p className="text-xl font-semibold">
                      {customer.totalOrders}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Lifetime</p>
                    <p className="text-xl font-semibold">
                      {formatCurrency(customer.lifetimeValue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {customer.notes && (
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <StickyNote className="size-4" />
                    Account notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {customer.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="border-border/60 shadow-sm lg:col-span-2">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Order history</CardTitle>
                  <CardDescription className="mt-1">
                    Search past orders and open details without leaving this
                    customer.
                  </CardDescription>
                </div>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {filteredOrders.length} of {allOrders.length}
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by order #, event name, status…"
                    className="pl-9 rounded-full h-10"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(v) =>
                    setStatusFilter((v ?? "all") as OrderStatus | "all")
                  }
                >
                  <SelectTrigger className="w-full sm:w-[160px] rounded-full h-10">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUS_FILTER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={sort}
                  onValueChange={(v) =>
                    setSort((v ?? "newest") as OrderHistorySort)
                  }
                >
                  <SelectTrigger className="w-full sm:w-[140px] rounded-full h-10">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="due_soon">Due date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="space-y-2 pt-0">
              {filteredOrders.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground rounded-xl border border-dashed">
                  {allOrders.length === 0
                    ? "No orders yet for this customer."
                    : "No orders match your search. Try a different term or filter."}
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <OrderHistoryRow
                    key={order.id}
                    order={order}
                    onClick={() => setSelectedOrderId(order.id)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <CustomerOrderDialog
        orderId={selectedOrderId}
        open={Boolean(selectedOrderId)}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
        onReorder={handleReorder}
      />
    </>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "good" | "warning" | "neutral";
}) {
  const styles =
    tone === "good"
      ? "bg-emerald-50 border-emerald-200/80 text-emerald-900"
      : tone === "warning"
        ? "bg-amber-50 border-amber-200/80 text-amber-950"
        : "bg-white border-border/60";

  return (
    <div className={cn("rounded-xl border px-4 py-3", styles)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="text-lg font-semibold mt-0.5 truncate">{value}</p>
      {detail && (
        <p className="text-xs opacity-70 mt-0.5 truncate">{detail}</p>
      )}
    </div>
  );
}

function OrderHistoryRow({
  order,
  onClick,
}: {
  order: Order;
  onClick: () => void;
}) {
  const jobSummary =
    order.jobs.length > 0
      ? order.jobs.map((j) => j.name).join(", ")
      : order.type.replace("_", " ");

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-4 text-left transition-colors hover:bg-brand-primary/5 hover:border-brand-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
    >
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{order.number}</span>
          <OrderStatusBadge status={order.status} />
          {order.rush && <RushBadge />}
        </div>
        <p className="text-sm text-muted-foreground truncate">{jobSummary}</p>
        <p className="text-xs text-muted-foreground">
          {order.type.replace("_", " ")} · Due {formatDate(order.inHandsDate)}{" "}
          · Created {formatDate(order.createdAt)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-semibold">{formatCurrency(order.total)}</p>
        {order.balance > 0 && (
          <p className="text-xs text-amber-700 font-medium">
            {formatCurrency(order.balance)} due
          </p>
        )}
      </div>
    </button>
  );
}
