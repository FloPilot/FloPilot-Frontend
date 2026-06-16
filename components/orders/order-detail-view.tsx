"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  FileImage,
  FolderOpen,
  MessageSquare,
  Package,
  Palette,
  Plus,
  Shirt,
  Truck,
  Wrench,
} from "lucide-react";
import { OrderApparelTab } from "@/components/orders/order-apparel-tab";
import { OrderDesignTab } from "@/components/orders/order-design-tab";
import { OrderArtworkApprovalPanel } from "@/components/orders/order-artwork-approval-panel";
import { OrderFilesTab } from "@/components/orders/order-files-tab";
import { OrderActivityFeed } from "@/components/orders/order-activity-feed";
import {
  OrderDueBanner,
  OrderHealthStrip,
} from "@/components/orders/order-health-strip";
import { OrderInternalNotes } from "@/components/orders/order-internal-notes";
import { AddProductionStepDialog } from "@/components/orders/add-production-step-dialog";
import {
  getStepJobKey,
  OrderProductionSteps,
} from "@/components/orders/order-production-steps";
import { OrderScheduleTimeline } from "@/components/orders/order-schedule-timeline";
import { ScheduleJobDialog } from "@/components/calendar/schedule-job-dialog";
import { StaffHeader } from "@/components/layout/staff-header";
import { useSchedule } from "@/components/providers/schedule-provider";
import { OrderPriorityToggle } from "@/components/orders/order-priority-toggle";
import { OrderStatusControl } from "@/components/orders/order-status-control";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { getOrderPaymentDisplay } from "@/lib/order-payment";
import { countScheduledSteps, type ProductionStep } from "@/lib/order-production";
import { computeOrderHealth, getArtworkApprovalSummary, getDueDateUrgency } from "@/lib/order-health";
import type { ScheduleBlock } from "@/types";
import { cn } from "@/lib/utils";

function OrderMessagesPanel({ orderId }: { orderId: string }) {
  const { getOrderMessages, sendOrderMessage } = useSchedule();
  const [draft, setDraft] = useState("");
  const messages = getOrderMessages(orderId);

  const handleSend = () => {
    if (!draft.trim()) return;
    sendOrderMessage(orderId, draft);
    setDraft("");
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="size-4" />
          Messages
        </CardTitle>
        <CardDescription>
          Conversation with your customer — they see this in their portal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No messages yet. Reach out if you need artwork approval or order
            details.
          </p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "rounded-xl p-4 text-sm border",
                  message.role === "staff"
                    ? "ml-4 sm:ml-8 bg-primary/5 border-primary/10"
                    : "mr-4 sm:mr-8 bg-muted/40 border-border/60"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-medium">{message.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(message.timestamp)}
                  </p>
                </div>
                <p className="leading-relaxed">{message.content}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end pt-2 border-t border-border">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message to the customer…"
            rows={2}
            className="rounded-xl resize-none flex-1"
          />
          <Button
            type="button"
            className="rounded-full h-11 shrink-0 sm:px-6"
            disabled={!draft.trim()}
            onClick={handleSend}
          >
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function OrderDetailView({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const {
    getOrderById,
    scheduleBlocks,
    machines,
    jobRuns,
    addProductionJob,
    removeProductionJob,
    sendProofToCustomer,
    updateOrderStatus,
    setOrderRush,
    shopDataLoading,
  } = useSchedule();

  const order = getOrderById(orderId);
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [prefillJobKey, setPrefillJobKey] = useState<string>();
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock>();
  const [activeTab, setActiveTab] = useState(() => {
    if (
      initialTab === "apparel" ||
      initialTab === "design" ||
      initialTab === "production" ||
      initialTab === "files" ||
      initialTab === "messages" ||
      initialTab === "overview"
    ) {
      return initialTab;
    }
    return "overview";
  });
  const [filesFocus, setFilesFocus] = useState<{
    jobId: string;
    imprintId: string;
  } | null>(null);

  const orderBlocks = useMemo(
    () => scheduleBlocks.filter((b) => b.orderId === orderId),
    [scheduleBlocks, orderId]
  );

  const progress = useMemo(
    () => (order ? countScheduledSteps(order, scheduleBlocks) : null),
    [order, scheduleBlocks]
  );

  const canSchedule =
    order?.type === "sales_order" &&
    ["draft", "approved", "in_production"].includes(order.status);

  const openScheduleStep = (step: ProductionStep) => {
    setEditingBlock(undefined);
    setPrefillJobKey(getStepJobKey(orderId, step));
    setScheduleOpen(true);
  };

  const openEditSchedule = (block: ScheduleBlock) => {
    setPrefillJobKey(undefined);
    setEditingBlock(block);
    setScheduleOpen(true);
  };

  const openFiles = (jobId: string, imprintId: string) => {
    setFilesFocus({ jobId, imprintId });
    setActiveTab("files");
  };

  const health = useMemo(
    () =>
      order
        ? computeOrderHealth(order, scheduleBlocks, machines, jobRuns)
        : null,
    [order, scheduleBlocks, machines, jobRuns]
  );
  const paymentDisplay = useMemo(
    () => (order ? getOrderPaymentDisplay(order) : null),
    [order]
  );

  const dueUrgency = useMemo(
    () => (order ? getDueDateUrgency(order) : null),
    [order]
  );

  const artworkSummary = useMemo(
    () => (order ? getArtworkApprovalSummary(order) : null),
    [order]
  );

  const handleSendAllProofs = () => {
    if (!order || !artworkSummary) return;
    const pending = artworkSummary.items.filter(
      (item) => item.artwork.status !== "approved"
    );
    pending.forEach((item) => {
      sendProofToCustomer(order.id, item.job.id, item.imprint.id);
    });
  };

  if (!order) {
    return (
      <main className="flex-1 p-8 text-center">
        <p className="text-muted-foreground">
          {shopDataLoading ? "Loading order…" : "Order not found."}
        </p>
        <Button
          className="mt-4 rounded-full"
          nativeButton={false}
          render={<Link href="/app/orders" />}
        >
          Back to orders
        </Button>
      </main>
    );
  }

  const totalPieces = order.lineItems.reduce(
    (sum, item) =>
      sum + item.sizes.reduce((sizeSum, s) => sizeSum + s.quantity, 0),
    0
  );

  return (
    <>
      <StaffHeader
        title={order.number}
        description={`${order.company} · Due ${formatDate(order.inHandsDate)}`}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-full bg-white hidden sm:flex"
              nativeButton={false}
              render={<Link href="/app/orders" />}
            >
              <ArrowLeft className="size-4" />
              All orders
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              disabled={
                !artworkSummary ||
                artworkSummary.total === 0 ||
                artworkSummary.allApproved
              }
              onClick={handleSendAllProofs}
            >
              <FileImage className="size-4" />
              <span className="hidden sm:inline">Send proofs</span>
            </Button>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {dueUrgency && (
          <OrderDueBanner
            label={dueUrgency.label}
            status={dueUrgency.status}
            inHandsFormatted={formatDate(order.inHandsDate)}
          />
        )}

        {health && (
          <div className="mb-6">
            <OrderHealthStrip health={health} />
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="apparel" className="gap-1.5">
                  <Shirt className="size-3.5 hidden sm:block" />
                  Apparel
                </TabsTrigger>
                <TabsTrigger value="design" className="gap-1.5">
                  <Palette className="size-3.5 hidden sm:block" />
                  Design
                </TabsTrigger>
                <TabsTrigger value="production">Production</TabsTrigger>
                <TabsTrigger value="files" className="gap-1.5">
                  <FolderOpen className="size-3.5 hidden sm:block" />
                  Files
                </TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                <OrderArtworkApprovalPanel
                  order={order}
                  onOpenFiles={openFiles}
                />

                <Card className="border-border/60 shadow-sm overflow-hidden gap-2">
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Wrench className="size-4" />
                          Production events
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {progress && progress.total > 0
                            ? `${progress.scheduled} of ${progress.total} scheduled on the floor`
                            : "Break this order into events, then schedule each one"}
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-full shrink-0"
                        onClick={() => setAddStepOpen(true)}
                      >
                        <Plus className="size-3.5" />
                        Add event
                      </Button>
                    </div>
                    {progress && progress.total > 0 && (
                      <div className="mt-2.5 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${Math.round((progress.scheduled / progress.total) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    <OrderProductionSteps
                      order={order}
                      scheduleBlocks={scheduleBlocks}
                      machines={machines}
                      onScheduleStep={openScheduleStep}
                      onEditSchedule={openEditSchedule}
                      onViewArtwork={openFiles}
                      onRemoveStep={(jobId) =>
                        removeProductionJob(orderId, jobId)
                      }
                      compact
                    />
                  </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarDays className="size-4" />
                      Schedule for this order
                    </CardTitle>
                    <CardDescription>
                      {canSchedule
                        ? "Same timeline as the floor station — drag events up/down to change time, side to side for days."
                        : "Approve this sales order to schedule production."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                    {canSchedule ? (
                      <OrderScheduleTimeline
                        orderId={orderId}
                        onEditBlock={openEditSchedule}
                      />
                    ) : (
                      <div className="px-6 pb-6 text-sm text-muted-foreground">
                        {order.type !== "sales_order"
                          ? "Convert to a sales order when the customer approves, then build production events here."
                          : "Move this order to Approved or In Production to unlock scheduling."}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="size-4" />
                      Line items
                    </CardTitle>
                    <CardDescription>
                      {totalPieces} pieces · {order.lineItems.length} product
                      {order.lineItems.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {order.lineItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border/60 p-4"
                      >
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.brand} · {item.color}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.sizes.map((size) => (
                            <span
                              key={size.size}
                              className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium"
                            >
                              {size.size}: {size.quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="apparel" className="mt-6">
                <OrderApparelTab order={order} />
              </TabsContent>

              <TabsContent value="design" className="mt-6">
                <OrderDesignTab order={order} />
              </TabsContent>

              <TabsContent value="production" className="space-y-6 mt-6">
                <Card className="border-brand-primary/20 bg-brand-primary/5">
                  <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">
                        Build your production plan
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 max-w-lg">
                        Add each decoration hit, label, and finishing task as its
                        own event. Schedule them when this order is approved.
                      </p>
                    </div>
                    <Button
                      className="rounded-full shrink-0"
                      onClick={() => setAddStepOpen(true)}
                    >
                      <Plus className="size-4" />
                      Add event
                    </Button>
                  </CardContent>
                </Card>

                <OrderProductionSteps
                  order={order}
                  scheduleBlocks={scheduleBlocks}
                  machines={machines}
                  onScheduleStep={openScheduleStep}
                  onEditSchedule={openEditSchedule}
                  onViewArtwork={openFiles}
                  onRemoveStep={(jobId) => removeProductionJob(orderId, jobId)}
                />

                {canSchedule && orderBlocks.length > 0 && (
                  <Card className="border-border/60 shadow-sm overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Timeline by machine
                      </CardTitle>
                      <CardDescription>
                        Switch machines to adjust where each event runs on the
                        floor.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0">
                      <OrderScheduleTimeline
                        orderId={orderId}
                        onEditBlock={openEditSchedule}
                      />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="files" className="mt-6">
                <OrderFilesTab
                  order={order}
                  focusImprint={filesFocus}
                  onFocusHandled={() => setFilesFocus(null)}
                />
              </TabsContent>

              <TabsContent value="messages" className="mt-6">
                <OrderMessagesPanel orderId={orderId} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <Card className="gap-0 border-border/60 py-0 shadow-sm">
                <CardContent className="px-3 py-2.5">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                    Order status
                  </p>
                  <OrderStatusControl
                    status={order.status}
                    compact
                    fullWidth
                    onStatusChange={(status) =>
                      updateOrderStatus(order.id, status)
                    }
                  />
                </CardContent>
              </Card>
              <Card className="gap-0 border-border/60 py-0 shadow-sm">
                <CardContent className="px-3 py-2.5">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                    Priority
                  </p>
                  <OrderPriorityToggle
                    rush={order.rush}
                    compact
                    fullWidth
                    onChange={(rush) => setOrderRush(order.id, rush)}
                  />
                </CardContent>
              </Card>
            </div>

            <OrderActivityFeed order={order} limit={6} />

            <OrderInternalNotes orderId={orderId} />

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{order.customerName}</p>
                <p className="text-muted-foreground">{order.company}</p>
                <Button
                  variant="link"
                  className="h-auto p-0"
                  nativeButton={false}
                  render={
                    <Link href={`/app/customers/${order.customerId}`} />
                  }
                >
                  View customer profile
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="size-4" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold text-foreground">
                    {paymentDisplay?.label ?? "—"}
                  </span>
                </div>
                {paymentDisplay?.detail && (
                  <p className="text-xs text-muted-foreground">
                    {paymentDisplay.detail}
                  </p>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Paid</span>
                  <span>{formatCurrency(order.paid)}</span>
                </div>
                {(order.balance > 0 ||
                  paymentDisplay?.status === "invoiced" ||
                  paymentDisplay?.status === "partial") && (
                  <div className="flex justify-between text-amber-700 font-medium">
                    <span>Balance</span>
                    <span>{formatCurrency(order.balance)}</span>
                  </div>
                )}
                <Separator />
                {paymentDisplay?.status === "not_invoiced" ? (
                  <Button
                    className="w-full rounded-full"
                    variant="outline"
                    disabled={order.total <= 0}
                  >
                    Send invoice
                  </Button>
                ) : paymentDisplay?.status === "paid" ? (
                  <p className="text-center text-xs text-muted-foreground py-1">
                    No balance remaining
                  </p>
                ) : (
                  <Button className="w-full rounded-full">Record payment</Button>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="size-4" />
                  Shipments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {order.shipments.length === 0 ? (
                  <p className="text-muted-foreground">No shipments yet.</p>
                ) : (
                  order.shipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="rounded-lg border border-border/60 p-3"
                    >
                      <p className="font-medium">{shipment.method}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {shipment.destination}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <AddProductionStepDialog
        open={addStepOpen}
        onOpenChange={setAddStepOpen}
        onAdd={(job) => addProductionJob(orderId, job)}
      />

      <ScheduleJobDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        filterOrderId={orderId}
        prefillJobKey={prefillJobKey}
        editingBlock={editingBlock}
      />
    </>
  );
}
