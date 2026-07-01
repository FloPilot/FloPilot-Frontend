"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { OrderMaterialsPanel } from "@/components/orders/order-materials-panel";
import { OrderDesignTab } from "@/components/orders/order-design-tab";
import { OrderArtworkApprovalPanel } from "@/components/orders/order-artwork-approval-panel";
import { OrderFilesTab } from "@/components/orders/order-files-tab";
import { OrderEstimateTab } from "@/components/orders/order-estimate-tab";
import { OrderShippingTab } from "@/components/orders/order-shipping-tab";
import { OrderActivityFeed } from "@/components/orders/order-activity-feed";
import { OrderActionPanel } from "@/components/orders/order-action-panel";
import {
  OrderDetailHeader,
  parseOrderDetailTab,
  resolveOrderDetailTab,
  type OrderDetailTab,
} from "@/components/orders/order-detail-header";
import { OrderEventsTab } from "@/components/orders/order-events-tab";
import { OrderInternalNotes } from "@/components/orders/order-internal-notes";
import { AddProductionStepDialog } from "@/components/orders/add-production-step-dialog";
import { OrderDetailSection } from "@/components/orders/order-production-section";
import { OrderCustomerPaymentPanel } from "@/components/orders/order-customer-payment-panel";
import { OrderFinancialSummary } from "@/components/orders/order-products-table";
import { getStepJobKey } from "@/components/orders/order-production-steps";
import { OrderScheduleTimeline } from "@/components/orders/order-schedule-timeline";
import { ScheduleJobDialog } from "@/components/calendar/schedule-job-dialog";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useStaffAccess } from "@/hooks/use-staff-access";
import { OrderArchivePanel } from "@/components/orders/order-archive-panel";
import { isArchivedOrder } from "@/lib/order-archive";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatDateTime } from "@/lib/format";
import { computeOrderListSummary } from "@/lib/order-list-summary";
import type { OrderActionId } from "@/lib/order-detail-actions";
import { defaultReceivingTab } from "@/lib/order-detail-tabs";
import { getArtworkApprovalSummary } from "@/lib/order-health";
import { getOrderProductionSteps, type ProductionStep } from "@/lib/order-production";
import type { ScheduleBlock, Job } from "@/types";
import { cn } from "@/lib/utils";

type CustomerSection = "messages" | "payment" | "notes";

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
    <div className="space-y-4">
      {messages.length === 0 ? (
        <p className={dashboardTaskDetailClass}>
          No messages yet. Write to the customer when you need artwork approval
          or order details.
        </p>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                dashboardInsetSurfaceClass,
                "px-3 py-3 text-[13px]",
                message.role === "staff" ? "ml-4 sm:ml-8" : "mr-4 sm:mr-8"
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="font-medium text-[#303030]">{message.author}</p>
                <p className="text-[11px] text-[#8a8a8a]">
                  {formatDateTime(message.timestamp)}
                </p>
              </div>
              <p className="leading-relaxed text-[#616161]">{message.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-[#ebebeb] pt-4 sm:flex-row sm:items-end">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message to the customer…"
          rows={2}
          className="min-h-[72px] flex-1 resize-none rounded-lg border-[#e3e3e3]"
        />
        <Button
          type="button"
          className={cn(dashboardPrimaryButtonClass, "h-10 shrink-0")}
          disabled={!draft.trim()}
          onClick={handleSend}
        >
          Send
        </Button>
      </div>
    </div>
  );
}

function CustomerSubNav({
  active,
  onChange,
}: {
  active: CustomerSection;
  onChange: (section: CustomerSection) => void;
}) {
  const items: { id: CustomerSection; label: string }[] = [
    { id: "messages", label: "Messages" },
    { id: "payment", label: "Payment" },
    { id: "notes", label: "Notes" },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            dashboardControlClass,
            "h-8 px-2.5 text-[12px]",
            active === item.id && "border-[#2c6ecb]/40 bg-[#f4f7fd] text-[#2c6ecb]"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function OrderDetailView({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { isAdmin } = useStaffAccess();
  const searchParams = useSearchParams();
  const parsedTab = parseOrderDetailTab(searchParams.get("tab"));
  const {
    getOrderById,
    scheduleBlocks,
    machines,
    jobRuns,
    addProductionJob,
    updateOrderStatus,
    setOrderRush,
    sendProofsAndEstimate,
    shopDataLoading,
  } = useSchedule();

  const order = getOrderById(orderId);
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [prefillJobKey, setPrefillJobKey] = useState<string>();
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock>();
  const [activeTab, setActiveTab] = useState<OrderDetailTab>(parsedTab);
  const [customerSection, setCustomerSection] =
    useState<CustomerSection>("messages");
  const [filesFocus, setFilesFocus] = useState<{
    jobId: string;
    imprintId: string;
  } | null>(null);
  const [actionToast, setActionToast] = useState<{
    message: string;
    type: "success" | "error" | "loading";
  } | null>(null);

  const showActionToast = (
    message: string,
    type: "success" | "error" | "loading" = "success",
    autoHide = true
  ) => {
    setActionToast({ message, type });
    if (autoHide) window.setTimeout(() => setActionToast(null), 5000);
  };

  const orderBlocks = useMemo(
    () => scheduleBlocks.filter((block) => block.orderId === orderId),
    [scheduleBlocks, orderId]
  );

  const summary = useMemo(
    () =>
      order
        ? computeOrderListSummary(order, scheduleBlocks, jobRuns)
        : null,
    [order, scheduleBlocks, jobRuns]
  );

  const artworkSummary = useMemo(
    () => (order ? getArtworkApprovalSummary(order) : null),
    [order]
  );

  useEffect(() => {
    if (!order) return;
    setActiveTab((current) => resolveOrderDetailTab(order, current));
  }, [order]);

  const canSchedule =
    order?.type === "sales_order" &&
    ["draft", "approved", "in_production"].includes(order.status);

  const firstUnscheduledStep = useMemo(() => {
    if (!order) return undefined;
    return getOrderProductionSteps(order).find(({ job, imprint }) => {
      return !scheduleBlocks.some(
        (block) =>
          block.orderId === order.id &&
          block.jobId === job.id &&
          block.imprintId === imprint.id
      );
    });
  }, [order, scheduleBlocks]);

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

  const handleAddProductionJob = async (job: Job) => {
    try {
      await addProductionJob(orderId, job);
      setActiveTab("events");
    } catch (err) {
      showActionToast(
        err instanceof Error ? err.message : "Could not add event. Please try again.",
        "error"
      );
    }
  };

  const handlePanelAction = async (actionId: OrderActionId) => {
    if (!order) return;

    switch (actionId) {
      case "send_estimate":
      case "send_proofs": {
        setActiveTab("proof");
        showActionToast("Sending proofs & estimate…", "loading", false);
        try {
          const email = await sendProofsAndEstimate(order.id);
          showActionToast(`Proofs & estimate emailed to ${email.to}.`, "success");
        } catch (err) {
          showActionToast(
            err instanceof Error
              ? err.message
              : "Could not send the email. Please try again.",
            "error"
          );
        }
        break;
      }
      case "mark_ready_to_ship":
        await updateOrderStatus(order.id, "ready_to_ship");
        break;
      case "schedule":
        if (firstUnscheduledStep) {
          openScheduleStep(firstUnscheduledStep);
        } else {
          setActiveTab("events");
        }
        break;
      case "add_production":
        setAddStepOpen(true);
        break;
      case "message_customer":
        setActiveTab("customer");
        setCustomerSection("messages");
        break;
      case "finish_receiving":
        setActiveTab(defaultReceivingTab(order));
        break;
      case "view_tasks":
        router.push("/app/tasks");
        break;
    }
  };

  if (!order || !summary) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <p className={dashboardTaskDetailClass}>
          {shopDataLoading ? "Loading order…" : "Order not found."}
        </p>
        <Button
          className={cn(dashboardControlClass, "mt-4 h-9")}
          nativeButton={false}
          render={<Link href="/app/orders" />}
        >
          Back to orders
        </Button>
      </main>
    );
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <OrderDetailHeader
        order={order}
        summary={summary}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {actionToast ? (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-[13px] font-medium",
            actionToast.type === "error"
              ? "border-[#e7b4b4] bg-[#fdf2f2] text-[#b42318]"
              : actionToast.type === "loading"
                ? "border-[#c4d7f2] bg-[#f4f7fd] text-[#2c6ecb]"
                : "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]"
          )}
        >
          {actionToast.type === "loading" ? (
            <Loader2 className="size-4 shrink-0 animate-spin" />
          ) : actionToast.type === "error" ? (
            <AlertCircle className="size-4 shrink-0" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0" />
          )}
          {actionToast.message}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
        <div className="order-2 min-w-0 space-y-4 xl:order-none">
          {activeTab === "events" ? (
            <>
              <OrderEventsTab
                order={order}
                scheduleBlocks={scheduleBlocks}
                jobRuns={jobRuns}
                onAddEvent={() => setAddStepOpen(true)}
                onScheduleStep={openScheduleStep}
                onOpenDesign={openFiles}
                onOpenTab={setActiveTab}
              />

              {canSchedule && orderBlocks.length > 0 ? (
                <OrderDetailSection
                  title="Calendar"
                  description="When events run on the floor — expand only if you need to move times."
                  defaultOpen={false}
                >
                  <OrderScheduleTimeline
                    orderId={orderId}
                    onEditBlock={openEditSchedule}
                  />
                </OrderDetailSection>
              ) : null}
            </>
          ) : null}

          {activeTab === "blanks" ? (
            <div className="space-y-4">
              <OrderMaterialsPanel order={order} section="blanks" />

              <section className={dashboardCardClass}>
                <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
                  <h2 className={dashboardTaskTitleClass}>Order total</h2>
                  <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                    Live estimate from garment costs, decoration pricing, and
                    shop tax — matches the orders list and estimate tab.
                  </p>
                </div>
                <div className="p-4 sm:p-5">
                  <OrderFinancialSummary order={order} />
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "dtf_sheets" ? (
            <OrderMaterialsPanel order={order} section="dtf" />
          ) : null}

          {activeTab === "screens" ? (
            <OrderMaterialsPanel order={order} section="screens" />
          ) : null}

          {activeTab === "inks" ? (
            <OrderMaterialsPanel order={order} section="inks" />
          ) : null}

          {activeTab === "proof" ? (
            <div className="space-y-4">
              {artworkSummary && artworkSummary.total > 0 ? (
                <OrderArtworkApprovalPanel
                  order={order}
                  onOpenFiles={(jobId, imprintId) =>
                    openFiles(jobId, imprintId)
                  }
                />
              ) : null}

              <section className={dashboardCardClass}>
                <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
                  <h2 className={dashboardTaskTitleClass}>Proof</h2>
                  <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                    Mockups and specs per decoration location — send to the
                    customer for approval before production.
                  </p>
                </div>
                <div className="p-4 sm:p-5">
                  <OrderDesignTab order={order} />
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "estimate" ? <OrderEstimateTab order={order} /> : null}

          {activeTab === "files" ? (
            <section className={dashboardCardClass}>
              <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
                <h2 className={dashboardTaskTitleClass}>Order files</h2>
                <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                  Mockups, separations, POs, and production art. Image previews
                  are stored inline for files under 600 KB.
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <OrderFilesTab
                  order={order}
                  focusImprint={filesFocus}
                  onFocusHandled={() => setFilesFocus(null)}
                />
              </div>
            </section>
          ) : null}

          {activeTab === "customer" ? (
            <div className="space-y-4">
              <section className={dashboardCardClass}>
                <div className="space-y-3 border-b border-[#ebebeb] px-4 py-4 sm:px-5">
                  <div>
                    <h2 className={dashboardTaskTitleClass}>
                      {order.customerName}
                    </h2>
                    <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                      {order.company}
                    </p>
                    <Button
                      variant="link"
                      className="mt-1 h-auto p-0 text-[13px] text-[#2c6ecb]"
                      nativeButton={false}
                      render={
                        <Link href={`/app/customers/${order.customerId}`} />
                      }
                    >
                      View customer profile
                    </Button>
                  </div>
                  <CustomerSubNav
                    active={customerSection}
                    onChange={setCustomerSection}
                  />
                </div>

                <div className="p-4 sm:p-5">
                  {customerSection === "messages" ? (
                    <OrderMessagesPanel orderId={orderId} />
                  ) : null}

                  {customerSection === "payment" ? (
                    <OrderCustomerPaymentPanel order={order} />
                  ) : null}

                  {customerSection === "notes" ? (
                    <OrderInternalNotes orderId={orderId} />
                  ) : null}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "shipping" ? <OrderShippingTab order={order} /> : null}

          {activeTab === "activity" ? (
            <section className={dashboardCardClass}>
              <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
                <h2 className={dashboardTaskTitleClass}>Activity</h2>
                <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                  A complete paper trail for this order — approvals, artwork,
                  materials, scheduling, and customer actions.
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <OrderActivityFeed order={order} variant="timeline" />
              </div>
            </section>
          ) : null}
        </div>

        <div className="order-1 space-y-4 xl:order-none xl:sticky xl:top-6 xl:z-10 xl:self-start">
          <OrderActionPanel
            order={order}
            summary={summary}
            canSchedule={canSchedule}
            onAction={handlePanelAction}
            onStatusChange={(status) => updateOrderStatus(order.id, status)}
            onRushChange={(rush) => setOrderRush(order.id, rush)}
          />
          {isAdmin ? <OrderArchivePanel order={order} /> : null}
        </div>
      </div>

      <AddProductionStepDialog
        open={addStepOpen}
        onOpenChange={setAddStepOpen}
        onAdd={handleAddProductionJob}
      />

      <ScheduleJobDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        filterOrderId={orderId}
        prefillJobKey={prefillJobKey}
        editingBlock={editingBlock}
      />
    </main>
  );
}
