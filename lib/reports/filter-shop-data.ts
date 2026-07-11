import type { ReportDateRange } from "@/lib/reports/report-date-range";
import { isDateInReportRange } from "@/lib/reports/report-date-range";
import type { ShopReportData } from "@/lib/reports/shop-report-data";
import type { Order, Shipment, Task } from "@/types";

export function flattenTasksFromOrders(orders: Order[]): Task[] {
  const tasks: Task[] = [];
  for (const order of orders) {
    for (const job of order.jobs) {
      for (const task of job.tasks ?? []) {
        tasks.push({
          ...task,
          orderId: order.id,
          orderNumber: order.number,
          orderCustomLabel: order.customLabel,
          customerId: order.customerId,
          customerName: order.customerName,
        });
      }
    }
  }
  return tasks;
}

export type FlatShipmentRow = Shipment & {
  orderId: string;
  orderNumber: string;
  customerName: string;
};

export function flattenShipmentsFromOrders(orders: Order[]): FlatShipmentRow[] {
  const rows: FlatShipmentRow[] = [];
  for (const order of orders) {
    for (const shipment of order.shipments ?? []) {
      rows.push({
        ...shipment,
        orderId: order.id,
        orderNumber: order.number,
        customerName: order.customerName,
      });
    }
  }
  return rows;
}

export function filterShopDataByDateRange(
  data: ShopReportData,
  range: ReportDateRange
): ShopReportData {
  const orders = data.orders.filter((order) =>
    isDateInReportRange(order.createdAt, range)
  );
  const orderIds = new Set(orders.map((order) => order.id));

  return {
    ...data,
    orders,
    scheduleBlocks: data.scheduleBlocks.filter(
      (block) =>
        orderIds.has(block.orderId) &&
        isDateInReportRange(block.startAt, range)
    ),
    jobRuns: data.jobRuns.filter((run) => {
      const block = data.scheduleBlocks.find(
        (entry) => entry.id === run.scheduleBlockId
      );
      if (!block) return isDateInReportRange(run.startedAt, range);
      return (
        orderIds.has(block.orderId) &&
        isDateInReportRange(run.startedAt ?? block.startAt, range)
      );
    }),
    issueReports: data.issueReports.filter((issue) =>
      isDateInReportRange(issue.reportedAt, range)
    ),
    purchaseOrders: data.purchaseOrders.filter(
      (po) =>
        isDateInReportRange(po.createdAt, range) ||
        isDateInReportRange(po.orderedAt, range)
    ),
  };
}

export function enrichShopReportData(data: ShopReportData): ShopReportData & {
  tasks: Task[];
  shipments: FlatShipmentRow[];
} {
  return {
    ...data,
    tasks: flattenTasksFromOrders(data.orders),
    shipments: flattenShipmentsFromOrders(data.orders),
  };
}
