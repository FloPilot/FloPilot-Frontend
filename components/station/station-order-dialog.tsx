"use client";

import { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  Clock,
  CreditCard,
  FileImage,
  MessageSquare,
  Package,
  Send,
  Truck,
  User,
} from "lucide-react";
import { useSchedule } from "@/components/providers/schedule-provider";
import { OrderStatusBadge, RushBadge } from "@/components/status-badges";
import { isWillCallOrder } from "@/lib/order-shipping";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  decorationLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";
import {
  collectOrderMockups,
  scheduleFocusFromBlock,
} from "@/lib/job-imprints";
import { getOrderPaymentDisplay } from "@/lib/order-payment";
import { MockupPreview } from "@/components/orders/artwork/mockup-preview";
import { ImprintInkColorsEditor } from "@/components/orders/imprint-ink-colors-editor";
import type { Message, Order, ScheduleBlock } from "@/types";
import { cn } from "@/lib/utils";

function OrderCustomerMessages({ orderId }: { orderId: string }) {
  const { getOrderMessages, sendOrderMessage } = useSchedule();
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const messages = getOrderMessages(orderId);

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages.length]);

  const handleSend = () => {
    if (!draft.trim()) return;
    sendOrderMessage(orderId, draft);
    setDraft("");
  };

  return (
    <section className="rounded-2xl border border-border bg-white overflow-hidden">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-brand-muted flex items-center gap-2">
          <MessageSquare className="size-3.5" />
          Message customer
        </h3>
        <p className="text-xs text-brand-muted mt-1.5 leading-relaxed">
          Ask the client a question here — they&apos;ll see it in their portal.
          For internal-only notes, use floor notes on the active event.
        </p>
      </div>

      <div
        ref={threadRef}
        className="max-h-56 overflow-y-auto px-4 py-4 sm:px-5 space-y-3"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-brand-muted text-center py-6">
            No messages yet. Send a question if you need something from the
            customer.
          </p>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
      </div>

      <div className="border-t border-border bg-brand-surface/40 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. Can you confirm the heather gray matches last year's order?"
            rows={2}
            className="rounded-xl resize-none flex-1 min-h-[72px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            type="button"
            className="rounded-full h-11 shrink-0 sm:px-6"
            disabled={!draft.trim()}
            onClick={handleSend}
          >
            <Send className="size-4" />
            Send
          </Button>
        </div>
        <p className="text-[11px] text-brand-muted mt-2">
          ⌘/Ctrl + Enter to send
        </p>
      </div>
    </section>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isStaff = message.role === "staff";

  return (
    <div
      className={cn(
        "rounded-xl p-3.5 text-sm border",
        isStaff
          ? "ml-6 sm:ml-10 bg-brand-primary/5 border-brand-primary/15"
          : "mr-6 sm:mr-10 bg-muted/50 border-border"
      )}
    >
      <div className="flex justify-between gap-2 mb-1">
        <p className="font-medium text-brand-ink">{message.author}</p>
        <p className="text-xs text-brand-muted shrink-0">
          {formatDateTime(message.timestamp)}
        </p>
      </div>
      <p className="leading-relaxed text-brand-ink/90">{message.content}</p>
    </div>
  );
}

function OrderDetailBody({
  order,
  scheduleBlock,
}: {
  order: Order;
  scheduleBlock?: ScheduleBlock;
}) {
  const totalPieces = order.lineItems.reduce(
    (sum, item) =>
      sum + item.sizes.reduce((sizeSum, s) => sizeSum + s.quantity, 0),
    0
  );

  const { pinned, others } = collectOrderMockups(
    order,
    scheduleFocusFromBlock(scheduleBlock)
  );
  const hasMockups = order.jobs.some((j) => j.imprints.length > 0);
  const paymentDisplay = getOrderPaymentDisplay(order);

  return (
    <div className="space-y-8">
      <OrderCustomerMessages orderId={order.id} />

      {scheduleBlock && (
        <section className="rounded-2xl border-2 border-brand-primary/20 bg-brand-primary/5 p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-primary">
            Scheduled on this station
          </p>
          <p className="mt-2 text-lg font-semibold text-brand-ink">
            {scheduleBlock.imprintLabel}
          </p>
          <p className="text-sm text-brand-muted">{scheduleBlock.jobName}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-brand-muted">
            <span className="inline-flex items-center gap-2">
              <Clock className="size-4 shrink-0" />
              {format(parseISO(scheduleBlock.startAt), "EEE, MMM d · h:mm a")} –{" "}
              {format(parseISO(scheduleBlock.endAt), "h:mm a")}
            </span>
            {scheduleBlock.pieceCount != null && scheduleBlock.pieceCount > 0 && (
              <span className="inline-flex items-center gap-2">
                <Package className="size-4 shrink-0" />
                {scheduleBlock.pieceCount} pieces this run
              </span>
            )}
          </div>
          {scheduleBlock.notes && (
            <p className="mt-3 rounded-xl bg-white/80 border border-border/60 px-3 py-2.5 text-sm text-brand-ink">
              {scheduleBlock.notes}
            </p>
          )}
        </section>
      )}

      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-brand-muted mb-4">
          Mockups by location
        </h3>
        {!hasMockups ? (
          <p className="text-sm text-brand-muted">No artwork on file yet.</p>
        ) : (
          <div className="space-y-6">
            {pinned && (
              <MockupPreview entry={pinned} pinned />
            )}
            {others.length > 0 && (
              <div>
                {pinned && (
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-muted mb-3">
                    Other locations on this order
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  {others.map((entry) => (
                    <MockupPreview key={entry.imprint.id} entry={entry} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-brand-muted mb-4">
          Production specs
        </h3>
        <div className="space-y-4">
          {order.jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-2xl border border-border bg-white overflow-hidden"
            >
              <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
                <p className="font-semibold text-brand-ink">{job.name}</p>
                <p className="text-xs text-brand-muted mt-0.5">
                  {job.imprints.length} imprint location
                  {job.imprints.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="divide-y divide-border">
                {job.imprints.map((imprint) => {
                  const isActiveRun =
                    scheduleBlock?.jobId === job.id &&
                    scheduleBlock.imprintId === imprint.id;

                  return (
                    <div
                      key={imprint.id}
                      className={cn(
                        "p-4 sm:p-5",
                        isActiveRun && "bg-brand-primary/[0.04]"
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-brand-ink">
                          {imprint.label}
                        </p>
                        <div className="flex items-center gap-2">
                          {isActiveRun && (
                            <span className="rounded-full bg-brand-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              This run
                            </span>
                          )}
                          <span className="rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-medium text-brand-primary">
                            {decorationLabel(imprint.decoration)}
                          </span>
                        </div>
                      </div>
                      {(imprint.notes || (imprint.inkColors?.length ?? 0) > 0) && (
                        <div className="mt-3 space-y-3">
                          {imprint.notes && (
                            <dl className="grid gap-2 text-sm sm:grid-cols-2">
                              {imprint.notes.dimensions && (
                                <div>
                                  <dt className="text-brand-muted">Print size</dt>
                                  <dd className="font-medium text-brand-ink">
                                    {imprint.notes.dimensions}
                                  </dd>
                                </div>
                              )}
                              {imprint.notes.placement && (
                                <div>
                                  <dt className="text-brand-muted">Placement</dt>
                                  <dd className="font-medium text-brand-ink">
                                    {imprint.notes.placement}
                                  </dd>
                                </div>
                              )}
                              {imprint.notes.inkType && (
                                <div>
                                  <dt className="text-brand-muted">Ink</dt>
                                  <dd className="font-medium text-brand-ink">
                                    {imprint.notes.inkType}
                                  </dd>
                                </div>
                              )}
                              {imprint.notes.colors && (
                                <div>
                                  <dt className="text-brand-muted">Colors</dt>
                                  <dd className="font-medium text-brand-ink">
                                    {imprint.notes.colors}
                                  </dd>
                                </div>
                              )}
                              {imprint.notes.instructions && (
                                <div className="sm:col-span-2">
                                  <dt className="text-brand-muted">Instructions</dt>
                                  <dd className="font-medium text-brand-ink">
                                    {imprint.notes.instructions}
                                  </dd>
                                </div>
                              )}
                            </dl>
                          )}
                          {(imprint.inkColors?.length ?? 0) > 0 && (
                            <ImprintInkColorsEditor
                              inkColors={imprint.inkColors ?? []}
                              readOnly
                              compact
                              onChange={() => undefined}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-brand-muted mb-4 flex items-center gap-2">
          <Package className="size-3.5" />
          Garments · {totalPieces} pieces
        </h3>
        <div className="space-y-3">
          {order.lineItems.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-border bg-white p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-brand-ink">{item.productName}</p>
                  <p className="text-sm text-brand-muted">
                    {item.brand} · {item.color}
                  </p>
                </div>
                <p className="text-xs text-brand-muted">
                  {formatCurrency(item.unitCost)}/ea
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.sizes.map((size) => (
                  <span
                    key={size.size}
                    className="rounded-lg bg-brand-surface px-3 py-1.5 text-sm font-semibold text-brand-ink"
                  >
                    {size.size}: {size.quantity}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-brand-muted mb-4 flex items-center gap-2">
            <Truck className="size-3.5" />
            Shipping
          </h3>
          {order.shipments.length === 0 ? (
            <p className="text-sm text-brand-muted">No shipments yet.</p>
          ) : (
            <div className="space-y-2">
              {order.shipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className="rounded-2xl border border-border bg-white p-4"
                >
                  <p className="font-medium text-brand-ink">{shipment.method}</p>
                  <p className="text-sm text-brand-muted">{shipment.destination}</p>
                  <p className="mt-1 text-xs capitalize text-brand-muted">
                    {shipment.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-brand-muted mb-4 flex items-center gap-2">
            <CreditCard className="size-3.5" />
            Payment
          </h3>
          <div className="rounded-2xl border border-border bg-white p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-brand-muted">Status</span>
              <span className="font-semibold text-brand-ink">
                {paymentDisplay.label}
              </span>
            </div>
            {paymentDisplay.detail && (
              <p className="text-xs text-brand-muted">{paymentDisplay.detail}</p>
            )}
            <div className="flex justify-between">
              <span className="text-brand-muted">Total</span>
              <span className="font-semibold">{formatCurrency(order.total)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Paid</span>
              <span className="font-medium">{formatCurrency(order.paid)}</span>
            </div>
            {order.balance > 0 && (
              <div className="flex justify-between text-amber-800 font-medium">
                <span>Balance</span>
                <span>{formatCurrency(order.balance)}</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export interface StationOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  scheduleBlock?: ScheduleBlock;
}

export function StationOrderDialog({
  open,
  onOpenChange,
  orderId,
  scheduleBlock,
}: StationOrderDialogProps) {
  const { getOrderById } = useSchedule();
  const order = orderId ? getOrderById(orderId) : undefined;
  const paymentDisplay = order ? getOrderPaymentDisplay(order) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex max-h-[min(94vh,960px)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0",
          "sm:max-w-[min(96vw,56rem)] sm:w-[min(96vw,56rem)]"
        )}
      >
        {order ? (
          <>
            <DialogHeader className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
                <div className="min-w-0">
                  <DialogTitle className="text-xl font-semibold text-brand-ink">
                    {formatOrderDisplayLine(order)}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-base text-brand-ink/90">
                    {order.customerName}
                    {order.company ? ` · ${order.company}` : ""}
                  </DialogDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <OrderStatusBadge
                    status={order.status}
                    willCall={isWillCallOrder(
                      order.shipping,
                      order.shipments ?? []
                    )}
                  />
                  {order.rush && <RushBadge />}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-brand-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-4" />
                  In hands {formatDate(order.inHandsDate)}
                </span>
                <span className="inline-flex items-center gap-1.5 capitalize">
                  <FileImage className="size-4" />
                  {order.type.replace("_", " ")}
                </span>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
              <aside className="mb-8 flex flex-wrap gap-4 rounded-2xl border border-border bg-brand-surface/50 p-4 sm:gap-6">
                <div className="flex items-start gap-3 min-w-[140px]">
                  <User className="size-5 text-brand-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-muted">
                      Customer
                    </p>
                    <p className="font-semibold text-brand-ink">{order.customerName}</p>
                    <p className="text-sm text-brand-muted">{order.company}</p>
                  </div>
                </div>
                <Separator orientation="vertical" className="hidden sm:block h-auto" />
                <div className="flex items-start gap-3">
                  <Package className="size-5 text-brand-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-muted">
                      Order total
                    </p>
                    <p className="font-semibold text-brand-ink">
                      {formatCurrency(order.total)}
                    </p>
                    <p className="text-sm text-brand-muted">
                      {paymentDisplay?.label}
                      {paymentDisplay &&
                      (paymentDisplay.status === "invoiced" ||
                        paymentDisplay.status === "partial")
                        ? ` · ${formatCurrency(order.balance)} due`
                        : null}
                    </p>
                  </div>
                </div>
              </aside>

              <OrderDetailBody order={order} scheduleBlock={scheduleBlock} />
            </div>

            <div className="flex shrink-0 items-center justify-end border-t border-border bg-muted/30 px-5 py-4 sm:px-6">
              <Button
                className="rounded-full px-8 h-11"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-brand-muted">
            <p>Order not found.</p>
            <Button className="mt-4 rounded-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
