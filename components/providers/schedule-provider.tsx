"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  ArtworkFile,
  Customer,
  ImprintInkColor,
  ImprintProductionNotes,
  Job,
  LineItem,
  Machine,
  MachineIssueReport,
  MachineIssueType,
  Message,
  Order,
  OrderFile,
  OrderFileKind,
  OrderEstimateAdjustment,
  ProductionEventWorkflow,
  ScheduleBlock,
  StationJobRun,
  Task,
  TaskStatus,
} from "@/types";
import { type NewCustomerInput } from "@/lib/customers";
import {
  addJobRunNote as apiAddJobRunNote,
  addOrderFile as apiAddOrderFile,
  uploadOrderFile as apiUploadOrderFile,
  deleteOrderFile as apiDeleteOrderFile,
  addOrderInternalNote as apiAddOrderInternalNote,
  addOrderLineItem as apiAddOrderLineItem,
  addProductionJob as apiAddProductionJob,
  createCustomer as apiCreateCustomer,
  updateCustomer as apiUpdateCustomer,
  archiveCustomer as apiArchiveCustomer,
  restoreCustomer as apiRestoreCustomer,
  type CustomerUpdate,
  createOrderFromForm as apiCreateOrderFromForm,
  createMachine as apiCreateMachine,
  createScheduleBlock as apiCreateScheduleBlock,
  deleteMachine as apiDeleteMachine,
  deleteScheduleBlock as apiDeleteScheduleBlock,
  fetchDashboardStats,
  listCustomers as apiListCustomers,
  listJobRuns as apiListJobRuns,
  listMachines as apiListMachines,
  listOrders as apiListOrders,
  getOrder as apiGetOrder,
  listScheduleBlocks as apiListScheduleBlocks,
  removeOrderLineItem as apiRemoveOrderLineItem,
  removeProductionJob as apiRemoveProductionJob,
  archiveOrder as apiArchiveOrder,
  restoreOrder as apiRestoreOrder,
  reorderOrder as apiReorderOrder,
  reportMachineIssue as apiReportMachineIssue,
  scanAndStartJob as apiScanAndStartJob,
  sendOrderMessage as apiSendOrderMessage,
  sendProofToCustomer as apiSendProofToCustomer,
  sendProofsAndEstimate as apiSendProofsAndEstimate,
  previewOrderDocument as apiPreviewOrderDocument,
  type OrderDocumentScope,
  setArtworkStatus as apiSetArtworkStatus,
  addArtworkProofNote as apiAddArtworkProofNote,
  approveOrderEstimate as apiApproveOrderEstimate,
  setMachineOnline as apiSetMachineOnline,
  updateImprintInkColors as apiUpdateImprintInkColors,
  updateImprintNotes as apiUpdateImprintNotes,
  updateProductionEventWorkflow as apiUpdateProductionEventWorkflow,
  updateJobRunStatus as apiUpdateJobRunStatus,
  updateMachine as apiUpdateMachine,
  updateOrder as apiUpdateOrder,
  updateOrderGarments as apiUpdateOrderGarments,
  updateOrderMaterials as apiUpdateOrderMaterials,
  backfillDesignLibrary as apiBackfillDesignLibrary,
  createDesignFromImprint as apiCreateDesignFromImprint,
  applyDesignToOrder as apiApplyDesignToOrder,
  updateOrderLineItem as apiUpdateOrderLineItem,
  updateScheduleBlock as apiUpdateScheduleBlock,
  uploadArtworkVersion as apiUploadArtworkVersion,
  type DashboardStatsResponse,
} from "@/lib/api";
import type { NewOrderFormInput } from "@/lib/create-order";
import {
  excludeArchivedOrders,
  excludeScheduleBlocksForArchivedOrders,
  getArchivedOrderIds,
} from "@/lib/order-archive";
import { useAuth } from "@/components/providers/auth-provider";
import type { DashboardStats } from "@/types";
import {
  buildInitialJobRuns,
  getRunForBlock,
} from "@/lib/station-runs";
import {
  boardStatusToWorkflow,
  buildProductionBoardTasks,
  parseProductionEventTaskId,
} from "@/lib/production-events-board";

/** Prefer the copy with at least as many production jobs - avoids stale list refreshes wiping a just-added event. */
function mergeOrdersFromServer(current: Order[], incoming: Order[]): Order[] {
  if (incoming.length === 0) return current;

  const incomingById = new Map(incoming.map((order) => [order.id, order]));
  const merged = current.map((existing) => {
    const fresh = incomingById.get(existing.id);
    if (!fresh) return existing;

    const existingJobCount = existing.jobs?.length ?? 0;
    const freshJobCount = fresh.jobs?.length ?? 0;
    if (freshJobCount < existingJobCount) return existing;

    incomingById.delete(existing.id);
    return fresh;
  });

  for (const order of incomingById.values()) {
    merged.push(order);
  }

  return merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

type ScheduleContextValue = {
  customers: Customer[];
  getCustomerById: (id: string) => Customer | undefined;
  addCustomer: (input: NewCustomerInput) => Promise<Customer>;
  updateCustomer: (id: string, updates: CustomerUpdate) => Promise<Customer>;
  archiveCustomer: (id: string) => Promise<number>;
  restoreCustomer: (id: string) => Promise<number>;
  createOrderFromForm: (form: NewOrderFormInput) => Promise<Order>;
  addOrder: (order: Order) => Order;
  orders: Order[];
  /** Non-archived orders for operational dashboards, calendar, and reports. */
  activeOrders: Order[];
  dashboardStats: DashboardStats | null;
  recentOrders: Order[];
  shopDataLoading: boolean;
  shopDataError: string | null;
  refreshShopData: () => Promise<void>;
  /** Refreshes calendar queue + timelines without the global shop loading state. */
  refreshCalendarData: () => Promise<void>;
  getOrderById: (id: string) => Order | undefined;
  getOrdersByCustomerId: (customerId: string) => Order[];
  createReorderFromOrder: (
    sourceOrderId: string
  ) => Promise<{ id: string; number: string } | null>;
  archiveOrder: (orderId: string) => Promise<void>;
  restoreOrder: (orderId: string) => Promise<void>;
  addProductionJob: (orderId: string, job: Job) => Promise<void>;
  removeProductionJob: (orderId: string, jobId: string) => void;
  machines: Machine[];
  scheduleBlocks: ScheduleBlock[];
  /** Schedule blocks excluding archived orders - use on shop floor views. */
  activeScheduleBlocks: ScheduleBlock[];
  addMachine: (machine: Omit<Machine, "id">) => void;
  updateMachine: (id: string, machine: Omit<Machine, "id">) => void;
  deleteMachine: (id: string) => void;
  addScheduleBlock: (block: Omit<ScheduleBlock, "id">) => Promise<void>;
  updateScheduleBlock: (
    id: string,
    block: Omit<ScheduleBlock, "id">
  ) => Promise<void>;
  removeScheduleBlock: (id: string) => Promise<void>;
  getMachineById: (id: string) => Machine | undefined;
  issueReports: MachineIssueReport[];
  reportMachineIssue: (params: {
    machineId: string;
    issueType: MachineIssueType;
    message: string;
    takeOffline: boolean;
  }) => void;
  setMachineOnline: (machineId: string, note?: string) => void;
  jobRuns: StationJobRun[];
  getJobRun: (scheduleBlockId: string) => StationJobRun | undefined;
  scanAndStartJob: (
    machineId: string,
    barcode: string
  ) => Promise<
    { ok: true; run: StationJobRun } | { ok: false; error: string }
  >;
  pauseJobRun: (runId: string) => void;
  startJobRun: (runId: string) => Promise<void>;
  resumeJobRun: (runId: string) => Promise<void>;
  finishJobRun: (runId: string) => Promise<void>;
  cancelJobRun: (runId: string) => void;
  addJobRunNote: (runId: string, content: string, author?: string) => void;
  getOrderMessages: (orderId: string) => Message[];
  sendOrderMessage: (
    orderId: string,
    content: string,
    author?: string
  ) => void;
  setArtworkStatus: (
    orderId: string,
    jobId: string,
    imprintId: string,
    status: ArtworkFile["status"],
    options?: {
      message?: string;
      messageRole?: "staff" | "customer";
      notifyOrderMessage?: boolean;
    }
  ) => void;
  addArtworkProofNote: (
    orderId: string,
    jobId: string,
    imprintId: string,
    message: string,
    options?: { notifyOrderMessage?: boolean }
  ) => Promise<void>;
  approveOrderEstimate: (orderId: string) => Promise<void>;
  uploadArtworkVersion: (
    orderId: string,
    jobId: string,
    imprintId: string,
    fileName: string,
    mockupLabel?: string,
    kind?: OrderFileKind,
    previewUrl?: string
  ) => void;
  updateOrderGarments: (
    orderId: string,
    garments: import("@/types").OrderGarments
  ) => Promise<void>;
  updateOrderMaterials: (
    orderId: string,
    materials: import("@/types").OrderMaterials
  ) => Promise<Order>;
  createDesignFromImprint: (
    orderId: string,
    jobId: string,
    imprintId: string,
    name?: string
  ) => Promise<import("@/types").SavedDesign | null>;
  applyDesignToOrder: (
    designId: string,
    orderId: string,
    jobId: string,
    imprintId: string
  ) => Promise<void>;
  addOrderFile: (
    orderId: string,
    file: Omit<OrderFile, "id" | "uploadedAt">
  ) => void;
  uploadOrderFile: (
    orderId: string,
    payload: {
      name: string;
      kind: OrderFile["kind"];
      uploadedBy: string;
      contentBase64: string;
      contentType: string;
      notes?: string;
    }
  ) => Promise<void>;
  deleteOrderFile: (orderId: string, fileId: string) => Promise<void>;
  addInternalNote: (
    orderId: string,
    content: string,
    author?: string
  ) => void;
  sendProofToCustomer: (
    orderId: string,
    jobId: string,
    imprintId: string
  ) => Promise<{ sent: boolean; to: string }>;
  sendProofsAndEstimate: (
    orderId: string
  ) => Promise<{ sent: boolean; to: string }>;
  previewOrderDocument: (
    orderId: string,
    scope?: OrderDocumentScope
  ) => Promise<{ pdfBase64: string; filename: string }>;
  updateOrderStatus: (
    orderId: string,
    status: import("@/types").OrderStatus
  ) => Promise<void>;
  setOrderRush: (orderId: string, rush: boolean) => Promise<void>;
  updateOrderCustomLabel: (
    orderId: string,
    customLabel: string
  ) => Promise<Order>;
  updateOrderEstimatePricing: (
    orderId: string,
    updates: {
      selectedRateSheetId?: string | null;
      estimateAdjustments?: OrderEstimateAdjustment[];
      excludedContractFeeIds?: string[];
    }
  ) => Promise<Order>;
  updateOrderShipments: (
    orderId: string,
    shipments: import("@/types").Shipment[],
    shipping?: import("@/types").OrderShippingSettings
  ) => Promise<import("@/types").Order | void>;
  updateOrderLineItem: (
    orderId: string,
    lineItemId: string,
    lineItem: LineItem
  ) => Promise<Order>;
  addOrderLineItem: (
    orderId: string,
    lineItem?: LineItem
  ) => Promise<Order>;
  removeOrderLineItem: (orderId: string, lineItemId: string) => Promise<Order>;
  updateImprintNotes: (
    orderId: string,
    jobId: string,
    imprintId: string,
    notes: ImprintProductionNotes
  ) => void;
  updateImprintInkColors: (
    orderId: string,
    jobId: string,
    imprintId: string,
    inkColors: ImprintInkColor[]
  ) => void;
  linkImprintArtworkFromFile: (
    orderId: string,
    jobId: string,
    imprintId: string,
    fileId: string | null
  ) => void;
  productionTasks: Task[];
  /** Production events as kanban cards - synced with Tasks screen workflow */
  productionBoardTasks: Task[];
  updateProductionTaskStatus: (taskId: string, status: TaskStatus) => void;
  updateProductionEventWorkflow: (
    orderId: string,
    jobId: string,
    imprintId: string,
    workflow: ProductionEventWorkflow
  ) => Promise<void>;
};

function deriveProductionTasks(orders: Order[]): Task[] {
  const tasks: Task[] = [];

  for (const order of orders) {
    if (order.archived) continue;
    for (const job of order.jobs) {
      for (const task of job.tasks ?? []) {
        tasks.push({
          ...task,
          orderId: order.id,
          orderNumber: order.number,
          customerName: order.company,
        });
      }
    }
  }

  return tasks;
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const { profile, getIdToken, user } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [issueReports, setIssueReports] = useState<MachineIssueReport[]>([]);
  const [jobRuns, setJobRuns] = useState<StationJobRun[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null
  );
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [shopDataLoading, setShopDataLoading] = useState(true);
  const [shopDataError, setShopDataError] = useState<string | null>(null);
  const [productionTasks, setProductionTasks] = useState<Task[]>([]);

  const activeOrders = useMemo(() => excludeArchivedOrders(orders), [orders]);
  const activeScheduleBlocks = useMemo(
    () =>
      excludeScheduleBlocksForArchivedOrders(
        scheduleBlocks,
        getArchivedOrderIds(orders)
      ),
    [scheduleBlocks, orders]
  );

  const refreshCalendarData = useCallback(async () => {
    if (profile?.type !== "staff") return;

    const token = await getIdToken();
    if (!token) return;

    try {
      const [blocksRes, runsRes, ordersRes] = await Promise.all([
        apiListScheduleBlocks(token),
        apiListJobRuns(token),
        apiListOrders(token, { archived: "include" }),
      ]);

      setScheduleBlocks(blocksRes.blocks);
      setJobRuns(
        runsRes.runs.length > 0
          ? runsRes.runs
          : buildInitialJobRuns(blocksRes.blocks)
      );
      setOrders((prev) => {
        const next = mergeOrdersFromServer(prev, ordersRes.orders);
        setProductionTasks(deriveProductionTasks(next));
        return next;
      });
      setRecentOrders((prev) =>
        excludeArchivedOrders(mergeOrdersFromServer(prev, ordersRes.orders)).slice(
          0,
          6
        )
      );
    } catch {
      // Keep the last known calendar state on transient errors.
    }
  }, [profile, getIdToken]);

  const refreshShopData = useCallback(async () => {
    if (profile?.type !== "staff") return;

    const token = await getIdToken(true);
    if (!token) return;

    setShopDataLoading(true);
    setShopDataError(null);

    try {
      const [
        customersRes,
        ordersRes,
        statsRes,
        machinesRes,
        blocksRes,
        runsRes,
      ] = await Promise.all([
        apiListCustomers(token),
        apiListOrders(token, { archived: "include" }),
        fetchDashboardStats(token),
        apiListMachines(token),
        apiListScheduleBlocks(token),
        apiListJobRuns(token),
      ]);

      setCustomers(customersRes.customers);
      setOrders(ordersRes.orders);
      setProductionTasks(deriveProductionTasks(ordersRes.orders));
      setMachines(machinesRes.machines);
      setScheduleBlocks(blocksRes.blocks);
      setJobRuns(
        runsRes.runs.length > 0
          ? runsRes.runs
          : buildInitialJobRuns(blocksRes.blocks)
      );

      const stats: DashboardStatsResponse = statsRes.stats;
      setDashboardStats({
        openQuotes: stats.openQuotes,
        activeOrders: stats.activeOrders,
        dueThisWeek: stats.dueThisWeek,
        awaitingApproval: stats.awaitingApproval,
        productionTasks: stats.productionTasks,
        lowStockItems: stats.lowStockItems,
      });
      setRecentOrders(
        ordersRes.orders.filter((order) => !order.archived).slice(0, 6)
      );

      const tenantId =
        profile?.type === "staff" ? profile.tenant.id : null;
      const backfillKey = tenantId
        ? `design-library-sync:v1:${tenantId}`
        : null;
      if (
        backfillKey &&
        typeof window !== "undefined" &&
        !window.localStorage.getItem(backfillKey)
      ) {
        try {
          const { result } = await apiBackfillDesignLibrary(token);
          window.localStorage.setItem(backfillKey, "1");
          if (result.ordersTouched > 0) {
            const refreshed = await apiListOrders(token, { archived: "include" });
            setOrders(refreshed.orders);
            setProductionTasks(deriveProductionTasks(refreshed.orders));
            setRecentOrders(
              refreshed.orders.filter((order) => !order.archived).slice(0, 6)
            );
          }
        } catch (backfillErr) {
          console.error("Design library backfill failed:", backfillErr);
        }
      }
    } catch (err) {
      setShopDataError(
        err instanceof Error ? err.message : "Failed to load shop data"
      );
    } finally {
      setShopDataLoading(false);
    }
  }, [profile, getIdToken]);

  const staffSessionKey =
    profile?.type === "staff"
      ? `${profile.tenant.id}:${profile.user.id}`
      : null;

  useEffect(() => {
    if (staffSessionKey) {
      setShopDataLoading(true);
      void refreshShopData();
      return;
    }

    if (!user) {
      setCustomers([]);
      setOrders([]);
      setMachines([]);
      setScheduleBlocks([]);
      setJobRuns([]);
      setProductionTasks([]);
      setDashboardStats(null);
      setRecentOrders([]);
      setShopDataError(null);
      setShopDataLoading(false);
    }
  }, [staffSessionKey, user, refreshShopData]);

  const applyOrderUpdate = useCallback((order: Order) => {
    setOrders((prev) => {
      const next = prev.map((entry) => (entry.id === order.id ? order : entry));
      setProductionTasks(deriveProductionTasks(next));
      return next;
    });
    setRecentOrders((prev) =>
      prev.map((entry) => (entry.id === order.id ? order : entry))
    );
  }, []);

  const refreshScheduleData = useCallback(async (token: string) => {
    const [blocksRes, runsRes] = await Promise.all([
      apiListScheduleBlocks(token),
      apiListJobRuns(token),
    ]);
    setScheduleBlocks(blocksRes.blocks);
    setJobRuns(
      runsRes.runs.length > 0
        ? runsRes.runs
        : buildInitialJobRuns(blocksRes.blocks)
    );
  }, []);

  const getCustomerById = useCallback(
    (id: string) => customers.find((customer) => customer.id === id),
    [customers]
  );

  const addCustomer = useCallback(
    async (input: NewCustomerInput) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const { customer } = await apiCreateCustomer(token, input);
      setCustomers((prev) =>
        [...prev, customer].sort((a, b) => a.company.localeCompare(b.company))
      );
      return customer;
    },
    [getIdToken]
  );

  const updateCustomer = useCallback(
    async (id: string, updates: CustomerUpdate) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const { customer } = await apiUpdateCustomer(token, id, updates);
      setCustomers((prev) =>
        prev
          .map((existing) => (existing.id === id ? customer : existing))
          .sort((a, b) => a.company.localeCompare(b.company))
      );
      return customer;
    },
    [getIdToken]
  );

  const archiveCustomer = useCallback(
    async (id: string) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const { customer, archivedOrders } = await apiArchiveCustomer(token, id);
      setCustomers((prev) =>
        prev.map((existing) => (existing.id === id ? customer : existing))
      );
      // The cascade touched orders - reload so archived state is consistent.
      if (archivedOrders > 0) await refreshShopData();
      return archivedOrders;
    },
    [getIdToken, refreshShopData]
  );

  const restoreCustomer = useCallback(
    async (id: string) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const { customer, restoredOrders } = await apiRestoreCustomer(token, id);
      setCustomers((prev) =>
        prev.map((existing) => (existing.id === id ? customer : existing))
      );
      if (restoredOrders > 0) await refreshShopData();
      return restoredOrders;
    },
    [getIdToken, refreshShopData]
  );

  const createOrderFromForm = useCallback(
    async (form: NewOrderFormInput) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const { order } = await apiCreateOrderFromForm(token, form);
      setOrders((prev) => {
        const next = [order, ...prev].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setProductionTasks(deriveProductionTasks(next));
        return next;
      });
      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === order.customerId
            ? {
                ...customer,
                totalOrders: customer.totalOrders + 1,
                lifetimeValue: customer.lifetimeValue + order.total,
              }
            : customer
        )
      );
      setRecentOrders((prev) => [order, ...prev].slice(0, 5));
      setDashboardStats((prev) =>
        prev
          ? {
              ...prev,
              activeOrders:
                order.status === "approved" ||
                order.status === "in_production" ||
                order.status === "ready_to_ship"
                  ? prev.activeOrders + 1
                  : prev.activeOrders,
            }
          : prev
      );
      return order;
    },
    [getIdToken]
  );

  const addOrder = useCallback((order: Order) => {
    setOrders((prev) => [...prev, order]);
    setCustomers((prev) =>
      prev.map((customer) =>
        customer.id === order.customerId
          ? {
              ...customer,
              totalOrders: customer.totalOrders + 1,
              lifetimeValue: customer.lifetimeValue + order.total,
            }
          : customer
      )
    );
    return order;
  }, []);

  const addMachine = useCallback(
    async (machine: Omit<Machine, "id">) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const { machine: saved } = await apiCreateMachine(token, machine);
      setMachines((prev) => [...prev, saved]);
    },
    [getIdToken]
  );

  const updateMachine = useCallback(
    async (id: string, machine: Omit<Machine, "id">) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const { machine: saved } = await apiUpdateMachine(token, id, machine);
      setMachines((prev) =>
        prev.map((entry) => (entry.id === id ? saved : entry))
      );
    },
    [getIdToken]
  );

  const deleteMachine = useCallback(
    async (id: string) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      await apiDeleteMachine(token, id);
      setMachines((prev) => prev.filter((entry) => entry.id !== id));
      setScheduleBlocks((prev) => prev.filter((block) => block.machineId !== id));
      setJobRuns((prev) => prev.filter((run) => run.machineId !== id));
    },
    [getIdToken]
  );

  const addScheduleBlock = useCallback(
    async (block: Omit<ScheduleBlock, "id">) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const { block: saved, order } = await apiCreateScheduleBlock(token, block);
      setScheduleBlocks((prev) => [...prev, saved]);
      setJobRuns((prev) => [
        ...prev,
        {
          id: `run-${saved.id}`,
          scheduleBlockId: saved.id,
          machineId: saved.machineId,
          status: "upcoming",
          notes: [],
        },
      ]);
      if (order) {
        applyOrderUpdate(order);
      }
      await refreshCalendarData();
    },
    [getIdToken, applyOrderUpdate, refreshCalendarData]
  );

  const updateScheduleBlock = useCallback(
    async (id: string, block: Omit<ScheduleBlock, "id">) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const { block: saved } = await apiUpdateScheduleBlock(token, id, block);
      setScheduleBlocks((prev) =>
        prev.map((entry) => (entry.id === id ? saved : entry))
      );
      setJobRuns((prev) =>
        prev.map((run) =>
          run.scheduleBlockId === id
            ? { ...run, machineId: saved.machineId }
            : run
        )
      );
      await refreshCalendarData();
    },
    [getIdToken, refreshCalendarData]
  );

  const removeScheduleBlock = useCallback(
    async (id: string) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      await apiDeleteScheduleBlock(token, id);
      setScheduleBlocks((prev) => prev.filter((block) => block.id !== id));
      setJobRuns((prev) => prev.filter((run) => run.scheduleBlockId !== id));
      await refreshCalendarData();
    },
    [getIdToken, refreshCalendarData]
  );

  const getJobRun = useCallback(
    (scheduleBlockId: string) => getRunForBlock(jobRuns, scheduleBlockId),
    [jobRuns]
  );

  const scanAndStartJob = useCallback(
    async (machineId: string, barcode: string) => {
      const token = await getIdToken();
      if (!token) {
        return { ok: false as const, error: "Not signed in" };
      }

      try {
        const { run } = await apiScanAndStartJob(token, { machineId, barcode });
        setJobRuns((prev) =>
          prev.map((entry) => (entry.id === run.id ? run : entry))
        );
        return { ok: true as const, run };
      } catch (err) {
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Could not start event",
        };
      }
    },
    [getIdToken]
  );

  const updateJobRun = useCallback((run: StationJobRun) => {
    setJobRuns((prev) =>
      prev.map((entry) => (entry.id === run.id ? run : entry))
    );
  }, []);

  const pauseJobRun = useCallback(
    async (runId: string) => {
      const token = await getIdToken();
      if (!token) return;
      const { run } = await apiUpdateJobRunStatus(token, runId, "paused");
      updateJobRun(run);
    },
    [getIdToken, updateJobRun]
  );

  const startJobRun = useCallback(
    async (runId: string) => {
      const token = await getIdToken();
      if (!token) return;
      const { run } = await apiUpdateJobRunStatus(token, runId, "running");
      updateJobRun(run);
    },
    [getIdToken, updateJobRun]
  );

  const resumeJobRun = useCallback(
    async (runId: string) => {
      const token = await getIdToken();
      if (!token) return;
      const { run } = await apiUpdateJobRunStatus(token, runId, "running");
      updateJobRun(run);
    },
    [getIdToken, updateJobRun]
  );

  const finishJobRun = useCallback(
    async (runId: string) => {
      const token = await getIdToken();
      if (!token) return;
      const { run } = await apiUpdateJobRunStatus(token, runId, "finished");
      updateJobRun(run);
    },
    [getIdToken, updateJobRun]
  );

  const cancelJobRun = useCallback(
    async (runId: string) => {
      const token = await getIdToken();
      if (!token) return;
      const { run } = await apiUpdateJobRunStatus(token, runId, "cancelled");
      updateJobRun(run);
    },
    [getIdToken, updateJobRun]
  );

  const addJobRunNote = useCallback(
    async (runId: string, content: string, author = "Floor") => {
      const trimmed = content.trim();
      if (!trimmed) return;
      const token = await getIdToken();
      if (!token) return;
      const { run } = await apiAddJobRunNote(token, runId, trimmed, author);
      updateJobRun(run);
    },
    [getIdToken, updateJobRun]
  );

  const getOrderById = useCallback(
    (id: string) => orders.find((o) => o.id === id),
    [orders]
  );

  const getOrdersByCustomerId = useCallback(
    (customerId: string) =>
      orders
        .filter((o) => o.customerId === customerId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [orders]
  );

  const createReorderFromOrder = useCallback(
    async (sourceOrderId: string): Promise<{ id: string; number: string } | null> => {
      const token = await getIdToken();
      if (!token) return null;

      const { id, number, order } = await apiReorderOrder(token, sourceOrderId);
      setOrders((prev) => {
        const next = [order, ...prev].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setProductionTasks(deriveProductionTasks(next));
        return next;
      });
      return { id, number };
    },
    [getIdToken]
  );

  const archiveOrder = useCallback(
    async (orderId: string) => {
      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiArchiveOrder(token, orderId);
      applyOrderUpdate(order);
    },
    [getIdToken, applyOrderUpdate]
  );

  const restoreOrder = useCallback(
    async (orderId: string) => {
      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiRestoreOrder(token, orderId);
      applyOrderUpdate(order);
    },
    [getIdToken, applyOrderUpdate]
  );

  const addProductionJob = useCallback(
    async (orderId: string, job: Job) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      setOrders((prev) => {
        const existing = prev.find((entry) => entry.id === orderId);
        if (!existing) return prev;

        const optimistic: Order = {
          ...existing,
          jobs: [...(existing.jobs ?? []), job],
        };
        const next = prev.map((entry) =>
          entry.id === orderId ? optimistic : entry
        );
        setProductionTasks(deriveProductionTasks(next));
        return next;
      });

      try {
        const { order } = await apiAddProductionJob(token, orderId, job);
        applyOrderUpdate(order);
      } catch (err) {
        try {
          const { order } = await apiGetOrder(token, orderId);
          applyOrderUpdate(order);
        } catch {
          setOrders((prev) => {
            const existing = prev.find((entry) => entry.id === orderId);
            if (!existing) return prev;

            const reverted: Order = {
              ...existing,
              jobs: (existing.jobs ?? []).filter((entry) => entry.id !== job.id),
            };
            const next = prev.map((entry) =>
              entry.id === orderId ? reverted : entry
            );
            setProductionTasks(deriveProductionTasks(next));
            return next;
          });
        }
        throw err;
      }
    },
    [getIdToken, applyOrderUpdate]
  );

  const removeProductionJob = useCallback(
    async (orderId: string, jobId: string) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const { order } = await apiRemoveProductionJob(token, orderId, jobId);
      applyOrderUpdate(order);
      await refreshScheduleData(token);
    },
    [getIdToken, applyOrderUpdate, refreshScheduleData]
  );

  const getOrderMessages = useCallback(
    (orderId: string): Message[] =>
      orders.find((o) => o.id === orderId)?.messages ?? [],
    [orders]
  );

  const sendOrderMessage = useCallback(
    async (orderId: string, content: string, author = "Shop") => {
      const trimmed = content.trim();
      if (!trimmed) return;
      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiSendOrderMessage(token, orderId, trimmed, author);
      applyOrderUpdate(order);
    },
    [getIdToken, applyOrderUpdate]
  );

  const setArtworkStatus = useCallback(
    async (
      orderId: string,
      jobId: string,
      imprintId: string,
      status: ArtworkFile["status"],
      options?: {
        message?: string;
        messageRole?: "staff" | "customer";
        notifyOrderMessage?: boolean;
      }
    ) => {
      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiSetArtworkStatus(
        token,
        orderId,
        jobId,
        imprintId,
        status,
        options
      );
      applyOrderUpdate(order);
    },
    [getIdToken, applyOrderUpdate]
  );

  const addArtworkProofNote = useCallback(
    async (
      orderId: string,
      jobId: string,
      imprintId: string,
      message: string,
      options?: { notifyOrderMessage?: boolean }
    ) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiAddArtworkProofNote(
        token,
        orderId,
        jobId,
        imprintId,
        trimmed,
        options
      );
      applyOrderUpdate(order);
    },
    [getIdToken, applyOrderUpdate]
  );

  const approveOrderEstimate = useCallback(
    async (orderId: string) => {
      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiApproveOrderEstimate(token, orderId);
      applyOrderUpdate(order);
    },
    [getIdToken, applyOrderUpdate]
  );

  const updateProductionEventWorkflow = useCallback(
    async (
      orderId: string,
      jobId: string,
      imprintId: string,
      workflow: ProductionEventWorkflow
    ) => {
      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiUpdateProductionEventWorkflow(
        token,
        orderId,
        jobId,
        imprintId,
        workflow
      );
      applyOrderUpdate(order);
    },
    [getIdToken, applyOrderUpdate]
  );

  const uploadArtworkVersion = useCallback(
    async (
      orderId: string,
      jobId: string,
      imprintId: string,
      fileName: string,
      mockupLabel?: string,
      kind: OrderFileKind = "production_art",
      previewUrl?: string
    ) => {
      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiUploadArtworkVersion(
        token,
        orderId,
        jobId,
        imprintId,
        fileName,
        mockupLabel,
        kind,
        previewUrl
      );
      applyOrderUpdate(order);
    },
    [getIdToken, applyOrderUpdate]
  );

  const updateOrderGarments = useCallback(
    async (
      orderId: string,
      garments: import("@/types").OrderGarments
    ) => {
      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiUpdateOrderGarments(token, orderId, garments);
      applyOrderUpdate(order);
    },
    [getIdToken, applyOrderUpdate]
  );

  const updateOrderMaterials = useCallback(
    async (
      orderId: string,
      materials: import("@/types").OrderMaterials
    ) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const { order } = await apiUpdateOrderMaterials(token, orderId, materials);
      applyOrderUpdate(order);
      return order;
    },
    [getIdToken, applyOrderUpdate]
  );

  const createDesignFromImprint = useCallback(
    async (
      orderId: string,
      jobId: string,
      imprintId: string,
      name?: string
    ) => {
      const token = await getIdToken();
      if (!token) return null;

      const { design } = await apiCreateDesignFromImprint(token, {
        orderId,
        jobId,
        imprintId,
        name,
      });
      return design;
    },
    [getIdToken]
  );

  const applyDesignToOrder = useCallback(
    async (
      designId: string,
      orderId: string,
      jobId: string,
      imprintId: string
    ) => {
      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiApplyDesignToOrder(token, {
        designId,
        orderId,
        jobId,
        imprintId,
      });
      applyOrderUpdate(order);
    },
    [getIdToken, applyOrderUpdate]
  );

  const addOrderFile = useCallback(
    async (orderId: string, file: Omit<OrderFile, "id" | "uploadedAt">) => {
      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiAddOrderFile(token, orderId, file);
      applyOrderUpdate(order);
    },
    [getIdToken, applyOrderUpdate]
  );

  const uploadOrderFile = useCallback(
    async (
      orderId: string,
      payload: {
        name: string;
        kind: OrderFile["kind"];
        uploadedBy: string;
        contentBase64: string;
        contentType: string;
        notes?: string;
      }
    ) => {
      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiUploadOrderFile(token, orderId, payload);
      applyOrderUpdate(order);
    },
    [getIdToken, applyOrderUpdate]
  );

  const deleteOrderFile = useCallback(
    async (orderId: string, fileId: string) => {
      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiDeleteOrderFile(token, orderId, fileId);
      applyOrderUpdate(order);
    },
    [getIdToken, applyOrderUpdate]
  );

  const addInternalNote = useCallback(
    async (orderId: string, content: string, author = "Shop") => {
      const trimmed = content.trim();
      if (!trimmed) return;
      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiAddOrderInternalNote(
        token,
        orderId,
        trimmed,
        author
      );
      applyOrderUpdate(order);
    },
    [getIdToken, applyOrderUpdate]
  );

  const sendProofToCustomer = useCallback(
    async (orderId: string, jobId: string, imprintId: string) => {
      const token = await getIdToken();
      if (!token) throw new Error("You need to be signed in to send proofs.");

      const { order, email } = await apiSendProofToCustomer(
        token,
        orderId,
        jobId,
        imprintId
      );
      applyOrderUpdate(order);
      return email;
    },
    [getIdToken, applyOrderUpdate]
  );

  const sendProofsAndEstimate = useCallback(
    async (orderId: string) => {
      const token = await getIdToken();
      if (!token) throw new Error("You need to be signed in to send proofs.");

      const { order, email } = await apiSendProofsAndEstimate(token, orderId);
      applyOrderUpdate(order);
      return email;
    },
    [getIdToken, applyOrderUpdate]
  );

  const previewOrderDocument = useCallback(
    async (orderId: string, scope: OrderDocumentScope = "all") => {
      const token = await getIdToken();
      if (!token) throw new Error("You need to be signed in to preview documents.");

      return apiPreviewOrderDocument(token, orderId, scope);
    },
    [getIdToken]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: Order["status"]) => {
      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiUpdateOrder(token, orderId, { status });
      applyOrderUpdate(order);
    },
    [getIdToken, applyOrderUpdate]
  );

  const setOrderRush = useCallback(
    async (orderId: string, rush: boolean) => {
      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiUpdateOrder(token, orderId, { rush });
      applyOrderUpdate(order);
    },
    [getIdToken, applyOrderUpdate]
  );

  const updateOrderCustomLabel = useCallback(
    async (orderId: string, customLabel: string) => {
      const token = await getIdToken();
      if (!token) {
        throw new Error("You must be signed in to update the order name.");
      }

      const trimmed = customLabel.trim();
      const { order } = await apiUpdateOrder(token, orderId, {
        customLabel: trimmed || undefined,
      });
      applyOrderUpdate(order);
      return order;
    },
    [getIdToken, applyOrderUpdate]
  );

  const updateOrderEstimatePricing = useCallback(
    async (
      orderId: string,
      updates: {
        selectedRateSheetId?: string | null;
        estimateAdjustments?: OrderEstimateAdjustment[];
        excludedContractFeeIds?: string[];
      }
    ) => {
      const token = await getIdToken();
      if (!token) {
        throw new Error("You must be signed in to update pricing.");
      }

      const { order } = await apiUpdateOrder(token, orderId, updates);
      applyOrderUpdate(order);
      return order;
    },
    [getIdToken, applyOrderUpdate]
  );

  const updateOrderShipments = useCallback(
    async (
      orderId: string,
      shipments: import("@/types").Shipment[],
      shipping?: import("@/types").OrderShippingSettings
    ) => {
      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiUpdateOrder(token, orderId, {
        shipments,
        shipping,
      });
      applyOrderUpdate(order);
      return order;
    },
    [getIdToken, applyOrderUpdate]
  );

  const updateOrderLineItem = useCallback(
    async (orderId: string, lineItemId: string, lineItem: LineItem) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const { order } = await apiUpdateOrderLineItem(
        token,
        orderId,
        lineItemId,
        lineItem
      );
      applyOrderUpdate(order);
      return order;
    },
    [getIdToken, applyOrderUpdate]
  );

  const addOrderLineItem = useCallback(
    async (orderId: string, lineItem?: LineItem) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const { order } = await apiAddOrderLineItem(token, orderId, lineItem);
      applyOrderUpdate(order);
      return order;
    },
    [getIdToken, applyOrderUpdate]
  );

  const removeOrderLineItem = useCallback(
    async (orderId: string, lineItemId: string) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const { order } = await apiRemoveOrderLineItem(token, orderId, lineItemId);
      applyOrderUpdate(order);
      return order;
    },
    [getIdToken, applyOrderUpdate]
  );

  const updateImprintNotes = useCallback(
    async (
      orderId: string,
      jobId: string,
      imprintId: string,
      notes: ImprintProductionNotes
    ) => {
      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiUpdateImprintNotes(
        token,
        orderId,
        jobId,
        imprintId,
        notes
      );
      applyOrderUpdate(order);
    },
    [getIdToken, applyOrderUpdate]
  );

  const updateImprintInkColors = useCallback(
    async (
      orderId: string,
      jobId: string,
      imprintId: string,
      inkColors: ImprintInkColor[]
    ) => {
      const token = await getIdToken();
      if (!token) return;

      const { order } = await apiUpdateImprintInkColors(
        token,
        orderId,
        jobId,
        imprintId,
        inkColors
      );
      applyOrderUpdate(order);
    },
    [getIdToken, applyOrderUpdate]
  );

  const linkImprintArtworkFromFile = useCallback(
    async (
      orderId: string,
      jobId: string,
      imprintId: string,
      fileId: string | null
    ) => {
      if (!fileId) return;

      const order = orders.find((entry) => entry.id === orderId);
      const file = order?.files?.find((entry) => entry.id === fileId);
      if (!order || !file) return;

      const updatedJobs = order.jobs.map((job) =>
        job.id !== jobId
          ? job
          : {
              ...job,
              imprints: job.imprints.map((imprint) => {
                if (imprint.id !== imprintId) return imprint;
                const previous = imprint.artwork;
                return {
                  ...imprint,
                  artwork: {
                    ...previous,
                    id: `art-${Date.now()}`,
                    name: file.name,
                    version:
                      previous.name === file.name
                        ? previous.version
                        : previous.version + 1,
                    status: "pending" as const,
                    uploadedAt: new Date().toISOString(),
                    uploadedBy: file.uploadedBy,
                    kind: file.kind,
                    history: previous.name
                      ? [
                          ...(previous.history ?? []),
                          {
                            id: previous.id,
                            name: previous.name,
                            version: previous.version,
                            uploadedAt: previous.uploadedAt,
                            uploadedBy: previous.uploadedBy ?? "Shop",
                            mockupLabel: previous.mockupLabel,
                          },
                        ]
                      : previous.history,
                  },
                };
              }),
            }
      );

      const updatedFiles = (order.files ?? []).map((orderFile) =>
        orderFile.id === fileId
          ? { ...orderFile, jobId, imprintId }
          : orderFile
      );

      const token = await getIdToken();
      if (!token) return;

      const { order: saved } = await apiUpdateOrder(token, orderId, {
        jobs: updatedJobs,
        files: updatedFiles,
      });
      applyOrderUpdate(saved);
    },
    [orders, getIdToken, applyOrderUpdate]
  );

  const updateProductionTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      const eventRef = parseProductionEventTaskId(taskId);
      if (eventRef) {
        const token = await getIdToken();
        if (!token) return;

        const { order } = await apiUpdateProductionEventWorkflow(
          token,
          eventRef.orderId,
          eventRef.jobId,
          eventRef.imprintId,
          { status: boardStatusToWorkflow(status) }
        );
        applyOrderUpdate(order);
        return;
      }

      const order = orders.find((entry) =>
        entry.jobs.some((job) => job.tasks?.some((task) => task.id === taskId))
      );
      if (!order) return;

      const updatedJobs = order.jobs.map((job) => ({
        ...job,
        tasks: job.tasks?.map((task) =>
          task.id === taskId ? { ...task, status } : task
        ),
      }));

      const token = await getIdToken();
      if (!token) return;

      const { order: saved } = await apiUpdateOrder(token, order.id, {
        jobs: updatedJobs,
      });
      applyOrderUpdate(saved);
    },
    [orders, getIdToken, applyOrderUpdate]
  );

  const productionBoardTasks = useMemo(
    () =>
      buildProductionBoardTasks({
        orders: activeOrders,
        scheduleBlocks: activeScheduleBlocks,
        jobRuns,
        includeCompleted: true,
      }),
    [activeOrders, activeScheduleBlocks, jobRuns]
  );

  const getMachineById = useCallback(
    (id: string) => machines.find((m) => m.id === id),
    [machines]
  );

  const reportMachineIssue = useCallback(
    async ({
      machineId,
      issueType,
      message,
      takeOffline,
    }: {
      machineId: string;
      issueType: MachineIssueType;
      message: string;
      takeOffline: boolean;
    }) => {
      const token = await getIdToken();
      if (!token) return;

      const now = new Date().toISOString();
      const report: MachineIssueReport = {
        id: `issue-${Date.now()}`,
        machineId,
        issueType,
        message,
        reportedAt: now,
        takeOffline,
      };
      setIssueReports((prev) => [report, ...prev].slice(0, 50));

      const { machine } = await apiReportMachineIssue(token, {
        machineId,
        issueType,
        message,
        takeOffline,
      });
      setMachines((prev) =>
        prev.map((entry) => (entry.id === machine.id ? machine : entry))
      );
    },
    [getIdToken]
  );

  const setMachineOnline = useCallback(
    async (machineId: string, note?: string) => {
      const token = await getIdToken();
      if (!token) return;

      const { machine } = await apiSetMachineOnline(token, machineId, note);
      setMachines((prev) =>
        prev.map((entry) => (entry.id === machine.id ? machine : entry))
      );
    },
    [getIdToken]
  );

  const value = useMemo(
    () => ({
      customers,
      getCustomerById,
      addCustomer,
      updateCustomer,
      archiveCustomer,
      restoreCustomer,
      createOrderFromForm,
      addOrder,
      orders,
      activeOrders,
      dashboardStats,
      recentOrders,
      shopDataLoading,
      shopDataError,
      refreshShopData,
      refreshCalendarData,
      getOrderById,
      getOrdersByCustomerId,
      createReorderFromOrder,
      archiveOrder,
      restoreOrder,
      addProductionJob,
      removeProductionJob,
      machines,
      scheduleBlocks,
      activeScheduleBlocks,
      addMachine,
      updateMachine,
      deleteMachine,
      addScheduleBlock,
      updateScheduleBlock,
      removeScheduleBlock,
      getMachineById,
      issueReports,
      reportMachineIssue,
      setMachineOnline,
      jobRuns,
      getJobRun,
      scanAndStartJob,
      pauseJobRun,
      startJobRun,
      resumeJobRun,
      finishJobRun,
      cancelJobRun,
      addJobRunNote,
      getOrderMessages,
      sendOrderMessage,
      setArtworkStatus,
      addArtworkProofNote,
      approveOrderEstimate,
      uploadArtworkVersion,
      updateOrderGarments,
      updateOrderMaterials,
      createDesignFromImprint,
      applyDesignToOrder,
      addOrderFile,
      uploadOrderFile,
      deleteOrderFile,
      addInternalNote,
      sendProofToCustomer,
      sendProofsAndEstimate,
      previewOrderDocument,
      updateOrderStatus,
      setOrderRush,
      updateOrderCustomLabel,
      updateOrderEstimatePricing,
      updateOrderShipments,
      updateOrderLineItem,
      addOrderLineItem,
      removeOrderLineItem,
      updateImprintNotes,
      updateImprintInkColors,
      linkImprintArtworkFromFile,
      productionTasks,
      productionBoardTasks,
      updateProductionTaskStatus,
      updateProductionEventWorkflow,
    }),
    [
      customers,
      getCustomerById,
      addCustomer,
      updateCustomer,
      archiveCustomer,
      restoreCustomer,
      createOrderFromForm,
      addOrder,
      orders,
      activeOrders,
      dashboardStats,
      recentOrders,
      shopDataLoading,
      shopDataError,
      refreshShopData,
      refreshCalendarData,
      getOrderById,
      getOrdersByCustomerId,
      createReorderFromOrder,
      archiveOrder,
      restoreOrder,
      addProductionJob,
      removeProductionJob,
      machines,
      scheduleBlocks,
      activeScheduleBlocks,
      addMachine,
      updateMachine,
      deleteMachine,
      addScheduleBlock,
      updateScheduleBlock,
      removeScheduleBlock,
      getMachineById,
      issueReports,
      reportMachineIssue,
      setMachineOnline,
      jobRuns,
      getJobRun,
      scanAndStartJob,
      pauseJobRun,
      startJobRun,
      resumeJobRun,
      finishJobRun,
      cancelJobRun,
      addJobRunNote,
      getOrderMessages,
      sendOrderMessage,
      setArtworkStatus,
      addArtworkProofNote,
      approveOrderEstimate,
      uploadArtworkVersion,
      updateOrderGarments,
      updateOrderMaterials,
      createDesignFromImprint,
      applyDesignToOrder,
      addOrderFile,
      uploadOrderFile,
      deleteOrderFile,
      addInternalNote,
      sendProofToCustomer,
      sendProofsAndEstimate,
      previewOrderDocument,
      updateOrderStatus,
      setOrderRush,
      updateOrderCustomLabel,
      updateOrderEstimatePricing,
      updateOrderShipments,
      updateOrderLineItem,
      addOrderLineItem,
      removeOrderLineItem,
      updateImprintNotes,
      updateImprintInkColors,
      linkImprintArtworkFromFile,
      productionTasks,
      productionBoardTasks,
      updateProductionTaskStatus,
      updateProductionEventWorkflow,
      updateOrderGarments,
      updateOrderMaterials,
      createDesignFromImprint,
      applyDesignToOrder,
    ]
  );

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) {
    throw new Error("useSchedule must be used within ScheduleProvider");
  }
  return ctx;
}
