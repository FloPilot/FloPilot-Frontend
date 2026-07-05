"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Calendar, Copy, ExternalLink, MessageSquare, Package, Wrench } from "lucide-react";
import { useSchedule } from "@/components/providers/schedule-provider";
import { OrderStatusBadge, RushBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { formatCurrency, formatDate } from "@/lib/format";
import { resolveOrderFinancialsInContext } from "@/lib/order-financial-context";
import { formatOrderBalanceLabel } from "@/lib/order-payment";
import { countScheduledSteps } from "@/lib/order-production";
import { cn } from "@/lib/utils";

export function CustomerOrderDialog({
  orderId,
  open,
  onOpenChange,
  onReorder,
}: {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReorder: (sourceOrderId: string) => void;
}) {
  const { getOrderById, scheduleBlocks, getCustomerById } = useSchedule();
  const order = orderId ? getOrderById(orderId) : undefined;

  const { settings } = useShopSettings();
  const financials = useMemo(
    () =>
      order
        ? resolveOrderFinancialsInContext(order, {
            taxRate: settings.taxRate,
            pricingMatrix: settings.pricingMatrix,
            getCustomer: getCustomerById,
          })
        : null,
    [order, settings.taxRate, settings.pricingMatrix, getCustomerById]
  );
  const paymentOrder = useMemo(
    () => (order && financials ? { ...order, ...financials } : order),
    [order, financials]
  );

  const progress = useMemo(
    () => (order ? countScheduledSteps(order, scheduleBlocks) : null),
    [order, scheduleBlocks]
  );

  const pieceCount = useMemo(() => {
    if (!order) return 0;
    return order.lineItems.reduce(
      (sum, item) =>
        sum + item.sizes.reduce((s, size) => s + size.quantity, 0),
      0
    );
  }, [order]);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl rounded-2xl p-0 gap-0 overflow-hidden max-h-[min(90vh,720px)] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div>
              <DialogTitle className="text-xl font-semibold flex flex-wrap items-center gap-2">
                {order.number}
                {order.rush && <RushBadge />}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {order.company} · Created {formatDate(order.createdAt)}
              </DialogDescription>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatChip label="In-hands" value={formatDate(order.inHandsDate)} />
            <StatChip
              label="Total"
              value={formatCurrency(financials?.total ?? 0)}
            />
            <StatChip
              label="Payment"
              value={
                paymentOrder
                  ? formatOrderBalanceLabel(paymentOrder)
                  : "Not invoiced"
              }
              highlight={
                !!paymentOrder &&
                (financials?.balance ?? 0) > 0 &&
                formatOrderBalanceLabel(paymentOrder) !== "Not invoiced"
              }
            />
            <StatChip
              label="Production"
              value={
                progress && progress.total > 0
                  ? `${progress.scheduled}/${progress.total} scheduled`
                  : "—"
              }
            />
          </div>

          {order.lineItems.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2 mb-2">
                <Package className="size-3.5" />
                Products
                <span className="font-normal normal-case">
                  · {pieceCount} pieces
                </span>
              </h3>
              <div className="space-y-2">
                {order.lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm"
                  >
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {item.brand} · {item.color}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.sizes.map((size) => (
                        <span
                          key={size.size}
                          className="rounded-md bg-white border border-border/60 px-2 py-0.5 text-xs"
                        >
                          {size.size}: {size.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {order.jobs.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2 mb-2">
                <Wrench className="size-3.5" />
                Production events
              </h3>
              <ul className="space-y-2">
                {order.jobs.map((job) => (
                  <li
                    key={job.id}
                    className="rounded-xl border border-border/60 px-4 py-2.5 text-sm"
                  >
                    <p className="font-medium">{job.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {job.imprints.map((i) => i.label).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {order.messages.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2 mb-2">
                <MessageSquare className="size-3.5" />
                Latest message
              </h3>
              <p className="text-sm rounded-xl bg-muted/30 border border-border/60 p-3 leading-relaxed">
                {order.messages[order.messages.length - 1].content}
              </p>
            </section>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-6 py-4 flex flex-wrap gap-2 bg-muted/20">
          <Button
            className="rounded-full flex-1 sm:flex-none"
            onClick={() => onReorder(order.id)}
          >
            <Copy className="size-4" />
            Reorder
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            nativeButton={false}
            render={
              <Link
                href={`/app/orders/${order.id}`}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <ExternalLink className="size-4" />
            Full workspace
          </Button>
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatChip({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        highlight
          ? "border-amber-200 bg-amber-50/80"
          : "border-border/60 bg-white"
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold mt-0.5 truncate">{value}</p>
    </div>
  );
}
