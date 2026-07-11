import { format, parseISO } from "date-fns";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";
import { buildResult, orderStatusLabel } from "@/lib/reports/report-utils";
import type { ReportDefinition } from "@/lib/reports/types";
import type { ShopReportData } from "@/lib/reports/shop-report-data";
import {
  flattenShipmentsFromOrders,
  flattenTasksFromOrders,
} from "@/lib/reports/filter-shop-data";

const shopTasksReport: ReportDefinition<ShopReportData> = {
  id: "shop-tasks",
  title: "Shop tasks",
  description:
    "All tasks across orders with assignee, department, status, and due date.",
  category: "Team",
  contexts: ["reports_hub"],
  run: ({ orders }) => {
    const tasks = flattenTasksFromOrders(orders);

    return buildResult(
      shopTasksReport,
      [
        { key: "title", label: "Task" },
        { key: "assignee", label: "Assignee" },
        { key: "department", label: "Department" },
        { key: "status", label: "Status" },
        { key: "dueDate", label: "Due date" },
        { key: "orderNumber", label: "Order" },
        { key: "customer", label: "Customer" },
        { key: "phase", label: "Phase" },
      ],
      tasks.map((task) => ({
        title: task.title,
        assignee: task.assignee,
        department: task.department,
        status: task.status,
        dueDate: formatDate(task.dueDate),
        orderNumber: task.orderCustomLabel
          ? `${task.orderNumber} — ${task.orderCustomLabel}`
          : task.orderNumber,
        customer: task.customerName,
        phase: task.phase ?? "",
      })),
      "shop-tasks"
    );
  },
};

const shipmentsReport: ReportDefinition<ShopReportData> = {
  id: "shipments",
  title: "Shipments & pickups",
  description:
    "Every shipment and pickup with destination, status, and tracking.",
  category: "Orders",
  contexts: ["reports_hub"],
  run: ({ orders }) => {
    const shipments = flattenShipmentsFromOrders(orders);

    return buildResult(
      shipmentsReport,
      [
        { key: "orderNumber", label: "Order" },
        { key: "customer", label: "Customer" },
        { key: "label", label: "Label" },
        { key: "method", label: "Method" },
        { key: "status", label: "Status" },
        { key: "destination", label: "Destination" },
        { key: "tracking", label: "Tracking" },
      ],
      shipments.map((shipment) => ({
        orderNumber: shipment.orderNumber,
        customer: shipment.customerName,
        label: shipment.label ?? "",
        method: shipment.method,
        status: shipment.status,
        destination: shipment.destination,
        tracking: shipment.trackingNumber ?? "",
      })),
      "shipments"
    );
  },
};

const pastDueOrdersReport: ReportDefinition<ShopReportData> = {
  id: "past-due-orders",
  title: "Past due orders",
  description: "Active orders past their in-hands date.",
  category: "Sales",
  contexts: ["reports_hub"],
  run: ({ orders }) => {
    const today = new Date();
    const rows = orders
      .filter((order) => {
        if (order.status === "completed" || order.status === "shipped") {
          return false;
        }
        return parseISO(order.inHandsDate) < today;
      })
      .map((order) => ({
        orderNumber: formatOrderDisplayLine(order),
        customer: order.customerName,
        status: orderStatusLabel(order.status),
        inHands: formatDate(order.inHandsDate),
        rush: order.rush ? "Yes" : "",
        balance: formatCurrency(order.balance ?? 0),
      }));

    return buildResult(
      pastDueOrdersReport,
      [
        { key: "orderNumber", label: "Order" },
        { key: "customer", label: "Customer" },
        { key: "status", label: "Status" },
        { key: "inHands", label: "In-hands" },
        { key: "rush", label: "Rush" },
        { key: "balance", label: "Balance", align: "right" },
      ],
      rows,
      "past-due-orders"
    );
  },
};

export const EXTENDED_REPORTS: ReportDefinition<ShopReportData>[] = [
  shopTasksReport,
  shipmentsReport,
  pastDueOrdersReport,
];
