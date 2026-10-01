"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  useRegisterUnsavedChanges,
  useStaffUnsavedChanges,
} from "@/components/layout/staff-unsaved-changes-provider";
import { useGuardedRouter } from "@/hooks/use-guarded-router";
import { OrderMaterialsPanel } from "@/components/orders/order-materials-panel";
import { OrderDesignTab } from "@/components/orders/order-design-tab";
import { OrderArtworkApprovalPanel } from "@/components/orders/order-artwork-approval-panel";
import { OrderFilesTab } from "@/components/orders/order-files-tab";
import { OrderPurchaseOrderTab } from "@/components/orders/order-purchase-order-tab";
import { OrderEstimateTab } from "@/components/orders/order-estimate-tab";
import { SendProofsEstimateDialog } from "@/components/orders/send-proofs-estimate-dialog";
import { OrderInvoiceTab } from "@/components/orders/order-invoice-tab";
import {
  OrderProducedGoodsCallout,
  OrderProducedGoodsPanel,
} from "@/components/orders/order-produced-goods-panel";
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
import {
  defaultBillToSelection,
} from "@/lib/order-addresses";
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

type CustomerSection = "messages" | "payment";

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
  const router = useGuardedRouter();
  const { isAdmin } = useStaffAccess();
  const searchParams = useSearchParams();
  const parsedTab = parseOrderDetailTab(searchParams.get("tab"));
  const { requestLeave } = useStaffUnsavedChanges();
  const {
    getOrderById,
    getCustomerById,
    orders,
    scheduleBlocks,
    machines,
    jobRuns,
    addProductionJob,
    updateOrderStatus,
    setOrderRush,
    updateOrderCustomLabel,
    updateOrderEndBusiness,
    updateOrderSalesRep,
    updateOrderAddresses,
    updateOrderProductionRun,
    updateCustomer,
    shopDataLoading,
  } = useSchedule();

  const order = getOrderById(orderId);
  const customer = order ? getCustomerById(order.customerId) : undefined;
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [pendingEventJobs, setPendingEventJobs] = useState<Job[]>([]);
  const [eventsSaving, setEventsSaving] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [sendProofsOpen, setSendProofsOpen] = useState(false);
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
  const [headerDraft, setHeaderDraft] = useState({
    customLabel: "",
    salesRepId: null as string | null,
    subCustomerId: null as string | null,
    billTo: null as import("@/types").OrderAddressSelection | null,
    shipTo: null as import("@/types").OrderAddressSelection | null,
  });
  const [headerSaving, setHeaderSaving] = useState(false);
  const headerBaselineRef = useRef({
    customLabel: "",
    salesRepId: null as string | null,
    subCustomerId: null as string | null,
    billTo: null as import("@/types").OrderAddressSelection | null,
    shipTo: null as import("@/types").OrderAddressSelection | null,
  });

  useEffect(() => {
    if (!order) return;
    const scope = { subCustomerId: order.subCustomerId };
    const next = {
      customLabel: order.customLabel ?? "",
      salesRepId: order.salesRepId ?? null,
      subCustomerId: order.subCustomerId ?? null,
      billTo:
        order.billTo ?? defaultBillToSelection(customer, scope),
      shipTo: order.shipTo ?? null,
    };
    headerBaselineRef.current = next;
    setHeaderDraft(next);
  }, [
    order?.id,
    order?.customLabel,
    order?.salesRepId,
    order?.subCustomerId,
    order?.billTo,
    order?.shipTo,
    customer?.id,
  ]);

  const addressSelectionEqual = (
    a: import("@/types").OrderAddressSelection | null | undefined,
    b: import("@/types").OrderAddressSelection | null | undefined
  ) =>
    (a?.locationId ?? null) === (b?.locationId ?? null) &&
    JSON.stringify(a?.address ?? null) === JSON.stringify(b?.address ?? null);

  const headerDirty =
    Boolean(order) &&
    (headerDraft.customLabel.trim() !==
      (headerBaselineRef.current.customLabel.trim() || "") ||
      (headerDraft.salesRepId ?? null) !==
        (headerBaselineRef.current.salesRepId ?? null) ||
      (headerDraft.subCustomerId ?? null) !==
        (headerBaselineRef.current.subCustomerId ?? null) ||
      !addressSelectionEqual(
        headerDraft.billTo,
        headerBaselineRef.current.billTo
      ) ||
      !addressSelectionEqual(
        headerDraft.shipTo,
        headerBaselineRef.current.shipTo
      ));

  const saveHeaderDraft = useCallback(async () => {
    if (!order || !headerDirty) return;
    setHeaderSaving(true);
    try {
      const baseline = headerBaselineRef.current;
      if (headerDraft.customLabel.trim() !== baseline.customLabel.trim()) {
        await updateOrderCustomLabel(order.id, headerDraft.customLabel.trim());
      }
      if ((headerDraft.salesRepId ?? null) !== (baseline.salesRepId ?? null)) {
        await updateOrderSalesRep(order.id, headerDraft.salesRepId);
      }
      if (
        (headerDraft.subCustomerId ?? null) !== (baseline.subCustomerId ?? null)
      ) {
        await updateOrderEndBusiness(order.id, headerDraft.subCustomerId);
      }
      if (
        !addressSelectionEqual(headerDraft.billTo, baseline.billTo) ||
        !addressSelectionEqual(headerDraft.shipTo, baseline.shipTo)
      ) {
        await updateOrderAddresses(order.id, {
          billTo: headerDraft.billTo,
          shipTo: headerDraft.shipTo,
        });
      }
    } finally {
      setHeaderSaving(false);
    }
  }, [
    order,
    headerDirty,
    headerDraft,
    updateOrderCustomLabel,
    updateOrderSalesRep,
    updateOrderEndBusiness,
    updateOrderAddresses,
  ]);

  const discardHeaderDraft = useCallback(() => {
    setHeaderDraft(headerBaselineRef.current);
  }, []);

  useRegisterUnsavedChanges(
    order && (headerDirty || headerSaving)
      ? {
          dirty: true,
          saving: headerSaving,
          label: "Unsaved order details",
          persistAcrossTabs: true,
          onSave: () => saveHeaderDraft(),
          onDiscard: discardHeaderDraft,
        }
      : null,
    `order-header-${orderId}`
  );

  const headerOrder = useMemo(() => {
    if (!order) return order;
    const subName =
      headerDraft.subCustomerId == null
        ? ""
        : customer?.subCustomers?.find(
            (entry) => entry.id === headerDraft.subCustomerId
          )?.name ||
          order.subCustomerName ||
          "";
    return {
      ...order,
      customLabel: headerDraft.customLabel,
      salesRepId: headerDraft.salesRepId ?? undefined,
      subCustomerId: headerDraft.subCustomerId ?? undefined,
      subCustomerName: subName,
      billTo: headerDraft.billTo,
      shipTo: headerDraft.shipTo,
    };
  }, [order, headerDraft, customer?.subCustomers]);

  const changeTab = useCallback(
    (tab: OrderDetailTab) => {
      if (tab === activeTab) return;
      if (!requestLeave(undefined, { inPage: true })) return;
      setActiveTab(tab);
    },
    [activeTab, requestLeave]
  );

  useEffect(() => {
    setPendingEventJobs([]);
    setEventsSaving(false);
  }, [orderId]);

  const pendingEventIds = useMemo(
    () => new Set(pendingEventJobs.map((job) => job.id)),
    [pendingEventJobs]
  );

  const eventsOrder = useMemo(() => {
    if (!order || pendingEventJobs.length === 0) return order;
    const existingIds = new Set(order.jobs.map((job) => job.id));
    const extras = pendingEventJobs.filter((job) => !existingIds.has(job.id));
    if (extras.length === 0) return order;
    return { ...order, jobs: [...order.jobs, ...extras] };
  }, [order, pendingEventJobs]);

  const eventsDirty = pendingEventJobs.some(
    (job) => !order?.jobs.some((entry) => entry.id === job.id)
  );

  const savePendingEvents = useCallback(async () => {
    if (!eventsDirty) return;
    setEventsSaving(true);
    try {
      const queue = pendingEventJobs.filter(
        (job) => !order?.jobs.some((entry) => entry.id === job.id)
      );
      for (const job of queue) {
        await addProductionJob(orderId, job);
        setPendingEventJobs((current) =>
          current.filter((entry) => entry.id !== job.id)
        );
      }
      setPendingEventJobs([]);
    } finally {
      setEventsSaving(false);
    }
  }, [
    eventsDirty,
    pendingEventJobs,
    order?.jobs,
    addProductionJob,
    orderId,
  ]);

  const discardPendingEvents = useCallback(() => {
    setPendingEventJobs([]);
  }, []);

  useRegisterUnsavedChanges(
    eventsDirty
      ? {
          dirty: true,
          saving: eventsSaving,
          label: "Unsaved events",
          persistAcrossTabs: false,
          onSave: () => savePendingEvents(),
          onDiscard: discardPendingEvents,
        }
      : null,
    `order-events-${orderId}`
  );

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
    ["approved", "in_production", "ready_to_ship"].includes(order.status);

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
    if (!requestLeave(undefined, { inPage: true })) return;
    setFilesFocus({ jobId, imprintId });
    setActiveTab("files");
  };

  const handleAddProductionJob = (job: Job) => {
    if (activeTab !== "events") {
      // Leave gate first so other dirty tabs still shake; stage after switch.
      if (!requestLeave(undefined, { inPage: true })) return;
      setActiveTab("events");
    }
    setPendingEventJobs((current) => {
      if (current.some((entry) => entry.id === job.id)) return current;
      return [...current, job];
    });
  };

  const removePendingEventJob = useCallback((jobId: string) => {
    setPendingEventJobs((current) =>
      current.filter((entry) => entry.id !== jobId)
    );
  }, []);

  const handlePanelAction = async (actionId: OrderActionId) => {
    if (!order) return;

    switch (actionId) {
      case "send_estimate":
      case "send_proofs": {
        changeTab("proof");
        setSendProofsOpen(true);
        break;
      }
      case "mark_ready_to_ship":
        await updateOrderStatus(order.id, "ready_to_ship");
        break;
      case "schedule":
        if (firstUnscheduledStep) {
          openScheduleStep(firstUnscheduledStep);
        } else {
          changeTab("events");
        }
        break;
      case "add_production":
        setAddStepOpen(true);
        break;
      case "message_customer":
        changeTab("customer");
        setCustomerSection("messages");
        break;
      case "finish_receiving":
        changeTab(defaultReceivingTab(order));
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
      <div>
        <OrderDetailHeader
          order={headerOrder ?? order}
          summary={summary}
          activeTab={activeTab}
          onTabChange={changeTab}
          customer={customer}
          subCustomers={customer?.subCustomers}
          onCustomLabelDraftChange={(customLabel) =>
            setHeaderDraft((current) => ({ ...current, customLabel }))
          }
          onEndBusinessDraftChange={(subCustomerId) =>
            setHeaderDraft((current) => ({ ...current, subCustomerId }))
          }
          onSalesRepDraftChange={(salesRepId) =>
            setHeaderDraft((current) => ({ ...current, salesRepId }))
          }
          billTo={headerDraft.billTo}
          shipTo={headerDraft.shipTo}
          onBillToDraftChange={(billTo) =>
            setHeaderDraft((current) => ({ ...current, billTo }))
          }
          onShipToDraftChange={(shipTo) =>
            setHeaderDraft((current) => ({ ...current, shipTo }))
          }
          onCustomerLocationsSave={async (locations) => {
            if (!customer) return;
            return updateCustomer(customer.id, { shippingLocations: locations });
          }}
          onPersistAddresses={async (addresses) => {
            const next = {
              billTo: addresses.billTo ?? headerDraft.billTo,
              shipTo: addresses.shipTo ?? headerDraft.shipTo,
            };
            setHeaderDraft((current) => ({
              ...current,
              billTo: next.billTo,
              shipTo: next.shipTo,
            }));
            headerBaselineRef.current = {
              ...headerBaselineRef.current,
              billTo: next.billTo,
              shipTo: next.shipTo,
            };
            await updateOrderAddresses(order.id, next);
          }}
          orders={orders}
          onProductionRunSave={(linkedOrderIds) =>
            updateOrderProductionRun(order.id, linkedOrderIds)
          }
        />
      </div>

      {activeTab !== "produced_goods" &&
      activeTab !== "invoice" ? (
        <OrderProducedGoodsCallout order={order} />
      ) : null}

      {actionToast ? (
        <div
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2.5 text-[13px] font-medium",
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

      <div
        className="grid gap-5 xl:items-start xl:grid-cols-[minmax(0,1fr)_300px]"
      >
        <div
          className="order-2 min-w-0 space-y-4 xl:order-none"
        >
          {activeTab === "events" ? (
            <>
              <OrderEventsTab
                order={eventsOrder ?? order}
                scheduleBlocks={scheduleBlocks}
                jobRuns={jobRuns}
                pendingJobIds={pendingEventIds}
                onRemovePendingJob={removePendingEventJob}
                onAddEvent={() => setAddStepOpen(true)}
                onScheduleStep={openScheduleStep}
                onOpenDesign={openFiles}
                onOpenTab={changeTab}
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
                  <OrderDesignTab
                    order={order}
                    onAddEvents={() => {
                      changeTab("events");
                      setAddStepOpen(true);
                    }}
                  />
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "estimate" ? <OrderEstimateTab order={order} /> : null}

          {activeTab === "purchase_order" ? (
            <OrderPurchaseOrderTab order={order} />
          ) : null}

          {activeTab === "received_goods" ? (
            <div className="space-y-4">
              <OrderMaterialsPanel order={order} section="received_goods" />
              <OrderInternalNotes
                orderId={orderId}
                title="Receiving notes"
                description="Saved as an order note — also available on the Notes tab. Use this for carton counts, shortages, vendor issues, or anything the team should know about this shipment."
                placeholder="e.g. Short 2 Mediums — vendor reshipping Thursday…"
              />
            </div>
          ) : null}

          {activeTab === "shipping" ? <OrderShippingTab order={order} /> : null}

          {activeTab === "produced_goods" ? (
            <OrderProducedGoodsPanel order={order} />
          ) : null}

          {activeTab === "invoice" ? <OrderInvoiceTab order={order} /> : null}

          {activeTab === "files" ? (
            <section className={dashboardCardClass}>
              <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
                <h2 className={dashboardTaskTitleClass}>Order files</h2>
                <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                  Mockups, separations, and production art. Image previews are
                  stored inline for files under 600 KB.
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

          {activeTab === "notes" ? (
            <OrderInternalNotes orderId={orderId} />
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
                </div>
              </section>
            </div>
          ) : null}

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

        <div className="order-1 space-y-4 xl:order-none xl:sticky xl:top-6 xl:z-0 xl:self-start">
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

      <SendProofsEstimateDialog
        order={order}
        open={sendProofsOpen}
        onOpenChange={setSendProofsOpen}
        onSent={(message) => showActionToast(message, "success")}
      />
    </main>
  );
}
