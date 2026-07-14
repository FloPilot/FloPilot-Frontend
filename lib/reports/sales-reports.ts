import { format, parseISO, startOfDay } from "date-fns";
import { formatCurrency, formatDate, decorationLabel } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";
import { buildResult, orderStatusLabel } from "@/lib/reports/report-utils";
import type { ReportDefinition } from "@/lib/reports/types";
import type { ShopReportData } from "@/lib/reports/shop-report-data";
import { resolveOrderFinancialsInContext } from "@/lib/order-financial-context";
import type { Order, OrderStatus } from "@/types";

const DONE_STATUSES: OrderStatus[] = ["completed", "shipped"];

function isPastDue(order: Order, today = startOfDay(new Date())): boolean {
  if (DONE_STATUSES.includes(order.status)) return false;
  return parseISO(order.inHandsDate) < today;
}

const revenueByOrderReport: ReportDefinition<ShopReportData> = {
  id: "revenue-by-order",
  title: "Revenue by order",
  description:
    "Order totals, payments, and balances with customer and status breakdown.",
  category: "Sales",
  contexts: ["reports_hub"],
  run: ({ orders, financials }) => {
    const rows = orders.map((order) => {
      const fin = financials
        ? resolveOrderFinancialsInContext(order, financials)
        : {
            subtotal: order.subtotal ?? 0,
            tax: order.tax ?? 0,
            total: order.total ?? 0,
            paid: order.paid ?? 0,
            balance: order.balance ?? 0,
          };

      return {
        orderNumber: formatOrderDisplayLine(order),
        customer: order.customerName,
        status: orderStatusLabel(order.status),
        created: formatDate(order.createdAt),
        inHands: formatDate(order.inHandsDate),
        rush: order.rush ? "Yes" : "",
        subtotal: formatCurrency(fin.subtotal),
        tax: formatCurrency(fin.tax),
        total: formatCurrency(fin.total),
        paid: formatCurrency(fin.paid),
        balance: formatCurrency(fin.balance),
      };
    });

    return buildResult(
      revenueByOrderReport,
      [
        { key: "orderNumber", label: "Order" },
        { key: "customer", label: "Customer" },
        { key: "status", label: "Status" },
        { key: "created", label: "Created" },
        { key: "inHands", label: "In-hands" },
        { key: "rush", label: "Rush" },
        { key: "subtotal", label: "Subtotal", align: "right" },
        { key: "tax", label: "Tax", align: "right" },
        { key: "total", label: "Total", align: "right" },
        { key: "paid", label: "Paid", align: "right" },
        { key: "balance", label: "Balance", align: "right" },
      ],
      rows,
      "revenue-by-order"
    );
  },
};

const salesByCustomerReport: ReportDefinition<ShopReportData> = {
  id: "sales-by-customer",
  title: "Sales by customer",
  description:
    "Lifetime value, open balance, and order counts grouped by customer.",
  category: "Sales",
  contexts: ["reports_hub"],
  run: ({ customers, orders, financials }) => {
    const rows = customers.map((customer) => {
      const customerOrders = orders.filter(
        (order) => order.customerId === customer.id
      );
      let openBalance = 0;
      let revenue = 0;

      for (const order of customerOrders) {
        const fin = financials
          ? resolveOrderFinancialsInContext(order, financials)
          : {
              total: order.total ?? 0,
              balance: order.balance ?? 0,
            };
        openBalance += fin.balance;
        revenue += fin.total;
      }

      return {
        company: customer.company,
        contact: customer.name,
        email: customer.email,
        totalOrders: customerOrders.length,
        activeOrders: customerOrders.filter(
          (order) => !DONE_STATUSES.includes(order.status)
        ).length,
        revenue,
        openBalance,
        customerSince: customer.customerSince
          ? formatDate(customer.customerSince)
          : "",
      };
    });

    const sorted = rows
      .sort((a, b) => b.revenue - a.revenue)
      .map((row) => ({
        company: row.company,
        contact: row.contact,
        email: row.email,
        totalOrders: row.totalOrders,
        activeOrders: row.activeOrders,
        lifetimeValue: formatCurrency(row.revenue),
        openBalance: formatCurrency(row.openBalance),
        customerSince: row.customerSince,
      }));

    return buildResult(
      salesByCustomerReport,
      [
        { key: "company", label: "Company" },
        { key: "contact", label: "Contact" },
        { key: "email", label: "Email" },
        { key: "totalOrders", label: "Total orders", align: "right" },
        { key: "activeOrders", label: "Active orders", align: "right" },
        { key: "lifetimeValue", label: "Revenue", align: "right" },
        { key: "openBalance", label: "Open balance", align: "right" },
        { key: "customerSince", label: "Customer since" },
      ],
      sorted,
      "sales-by-customer"
    );
  },
};

const salesByDecorationReport: ReportDefinition<ShopReportData> = {
  id: "sales-by-decoration",
  title: "Sales by decoration",
  description: "Revenue and event count grouped by decoration type.",
  category: "Sales",
  contexts: ["reports_hub"],
  run: ({ orders, financials }) => {
    const totals = new Map<
      string,
      { events: number; pieces: number; revenue: number }
    >();

    for (const order of orders) {
      const fin = financials
        ? resolveOrderFinancialsInContext(order, financials)
        : { total: order.total ?? 0 };
      const orderTotal = fin.total;
      let eventCount = 0;

      for (const job of order.jobs) {
        for (const imprint of job.imprints) {
          eventCount++;
          const label = decorationLabel(imprint.decoration);
          const entry = totals.get(label) ?? {
            events: 0,
            pieces: 0,
            revenue: 0,
          };
          entry.events++;
          totals.set(label, entry);
        }
      }

      if (eventCount > 0) {
        const share = orderTotal / eventCount;
        for (const job of order.jobs) {
          for (const imprint of job.imprints) {
            const label = decorationLabel(imprint.decoration);
            const entry = totals.get(label)!;
            entry.revenue += share;
          }
        }
      }

      for (const job of order.jobs) {
        for (const lineItemId of job.lineItemIds ?? []) {
          const item = order.lineItems.find((li) => li.id === lineItemId);
          if (!item) continue;
          const qty = item.sizes.reduce((sum, row) => sum + row.quantity, 0);
          for (const imprint of job.imprints) {
            const label = decorationLabel(imprint.decoration);
            const entry = totals.get(label);
            if (entry) entry.pieces += qty;
          }
        }
      }
    }

    const rows = [...totals.entries()].map(([decoration, entry]) => ({
      decoration,
      events: entry.events,
      pieces: entry.pieces,
      estimatedRevenue: formatCurrency(Math.round(entry.revenue)),
      avgRevenuePerEvent:
        entry.events > 0
          ? formatCurrency(Math.round(entry.revenue / entry.events))
          : formatCurrency(0),
    }));

    return buildResult(
      salesByDecorationReport,
      [
        { key: "decoration", label: "Decoration" },
        { key: "events", label: "Events", align: "right" },
        { key: "pieces", label: "Pieces", align: "right" },
        { key: "estimatedRevenue", label: "Est. revenue", align: "right" },
        { key: "avgRevenuePerEvent", label: "Avg / event", align: "right" },
      ],
      rows.sort((a, b) => b.events - a.events),
      "sales-by-decoration"
    );
  },
};

const pipelineReport: ReportDefinition<ShopReportData> = {
  id: "pipeline-summary",
  title: "Pipeline summary",
  description:
    "Open orders grouped by status with total value and in-hands dates.",
  category: "Sales",
  contexts: ["reports_hub"],
  run: ({ orders, financials }) => {
    const groups = new Map<
      OrderStatus,
      { count: number; value: number; rush: number }
    >();

    for (const order of orders) {
      if (DONE_STATUSES.includes(order.status)) continue;
      const fin = financials
        ? resolveOrderFinancialsInContext(order, financials)
        : { total: order.total ?? 0 };
      const entry = groups.get(order.status) ?? {
        count: 0,
        value: 0,
        rush: 0,
      };
      entry.count++;
      entry.value += fin.total;
      if (order.rush) entry.rush++;
      groups.set(order.status, entry);
    }

    const rows = [...groups.entries()].map(([status, entry]) => ({
      status: orderStatusLabel(status),
      orders: entry.count,
      rushOrders: entry.rush,
      pipelineValue: formatCurrency(entry.value),
      avgOrderValue:
        entry.count > 0
          ? formatCurrency(Math.round(entry.value / entry.count))
          : formatCurrency(0),
    }));

    return buildResult(
      pipelineReport,
      [
        { key: "status", label: "Status" },
        { key: "orders", label: "Orders", align: "right" },
        { key: "rushOrders", label: "Rush", align: "right" },
        { key: "pipelineValue", label: "Pipeline value", align: "right" },
        { key: "avgOrderValue", label: "Avg order", align: "right" },
      ],
      rows,
      "pipeline-summary"
    );
  },
};

const rushOrdersReport: ReportDefinition<ShopReportData> = {
  id: "rush-orders",
  title: "Rush orders",
  description: "All rush-flagged orders with status, dates, and balance.",
  category: "Sales",
  contexts: ["reports_hub"],
  run: ({ orders, financials }) => {
    const rows = orders
      .filter((order) => order.rush)
      .map((order) => {
        const fin = financials
          ? resolveOrderFinancialsInContext(order, financials)
          : {
              total: order.total ?? 0,
              balance: order.balance ?? 0,
            };

        return {
          orderNumber: formatOrderDisplayLine(order),
          customer: order.customerName,
          status: orderStatusLabel(order.status),
          inHands: formatDate(order.inHandsDate),
          pastDue: isPastDue(order) ? "Yes" : "No",
          total: formatCurrency(fin.total),
          balance: formatCurrency(fin.balance),
        };
      });

    return buildResult(
      rushOrdersReport,
      [
        { key: "orderNumber", label: "Order" },
        { key: "customer", label: "Customer" },
        { key: "status", label: "Status" },
        { key: "inHands", label: "In-hands" },
        { key: "pastDue", label: "Past due" },
        { key: "total", label: "Total", align: "right" },
        { key: "balance", label: "Balance", align: "right" },
      ],
      rows,
      "rush-orders"
    );
  },
};

export const SALES_REPORTS: ReportDefinition<ShopReportData>[] = [
  revenueByOrderReport,
  salesByCustomerReport,
  salesByDecorationReport,
  pipelineReport,
  rushOrdersReport,
];
