import { format, parseISO, startOfDay } from "date-fns";
import { formatCurrency, formatDate, decorationLabel } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";
import { formatCustomerFullName } from "@/lib/customers";
import {
  documentTypeLabel,
  orderStatusLabel,
  reportTimestamp,
  slugifyFilename,
} from "@/lib/reports/format";
import type { ReportDefinition, ReportResult, ReportContext } from "@/lib/reports/types";
import type { Customer, LineItem, Order, OrderStatus } from "@/types";
import { excludeArchivedOrders } from "@/lib/order-archive";
import { resolveOrderFinancials } from "@/lib/order-estimate";
import type { CustomerListFinancialContext } from "@/lib/customer-list-summary";
import { resolveOrderFinancialsInContext } from "@/lib/order-financial-context";
import { buildResult } from "@/lib/reports/report-utils";
import type { ShopReportData, CustomerDetailReportData } from "@/lib/reports/shop-report-data";

export type {
  ShopReportData,
  CustomersListReportData,
  CustomerDetailReportData,
} from "@/lib/reports/shop-report-data";

const DONE_STATUSES: OrderStatus[] = ["completed", "shipped"];

function isPastDue(order: Order, today = startOfDay(new Date())): boolean {
  if (DONE_STATUSES.includes(order.status)) return false;
  return parseISO(order.inHandsDate) < today;
}

function lineItemQuantity(item: LineItem): number {
  return item.sizes.reduce((sum, row) => sum + row.quantity, 0);
}

function sizeBreakdown(item: LineItem): string {
  return item.sizes.map((row) => `${row.size}:${row.quantity}`).join(" ");
}

function resolveReportFinancials(
  order: Order,
  financials?: CustomerListFinancialContext
) {
  if (financials) {
    return resolveOrderFinancialsInContext(order, financials);
  }

  return {
    subtotal: order.subtotal ?? 0,
    tax: order.tax ?? 0,
    total: order.total ?? 0,
    paid: order.paid ?? 0,
    balance: order.balance ?? 0,
  };
}

const customerDirectoryReport: ReportDefinition<ShopReportData> = {
  id: "customer-directory",
  title: "Customer directory",
  description: "Contact details, names, and lifetime value for every customer.",
  category: "Accounts",
  contexts: ["customers_list"],
  run: ({ customers }) =>
    buildResult(
      customerDirectoryReport,
      [
        { key: "company", label: "Company" },
        { key: "firstName", label: "First name" },
        { key: "lastName", label: "Last name" },
        { key: "contact", label: "Full name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "city", label: "City" },
        { key: "state", label: "State" },
        { key: "customerSince", label: "Customer since" },
        { key: "notes", label: "Notes" },
        { key: "totalOrders", label: "Total orders", align: "right" },
        { key: "lifetimeValue", label: "Lifetime value", align: "right" },
      ],
      customers.map((customer) => ({
        company: customer.company,
        firstName: customer.firstName ?? customer.name.split(" ")[0] ?? "",
        lastName:
          customer.lastName ??
          customer.name.split(" ").slice(1).join(" ") ??
          "",
        contact: formatCustomerFullName(customer),
        email: customer.email,
        phone: customer.phone,
        city: customer.city,
        state: customer.state,
        customerSince: customer.customerSince
          ? formatDate(customer.customerSince)
          : "",
        notes: customer.notes ?? "",
        totalOrders: customer.totalOrders,
        lifetimeValue: formatCurrency(customer.lifetimeValue),
      })),
      "customer-directory"
    ),
};

const customersOpenBalancesReport: ReportDefinition<ShopReportData> = {
  id: "customers-open-balances",
  title: "Customers with open balances",
  description: "Outstanding balances rolled up by customer with order counts.",
  category: "Billing",
  contexts: ["customers_list"],
  run: ({ customers, orders, financials }) => {
    const rows = customers
      .map((customer) => {
        const customerOrders = orders.filter((order) => {
          if (order.customerId !== customer.id) return false;
          return resolveReportFinancials(order, financials).balance > 0;
        });
        if (customerOrders.length === 0) return null;

        const openBalance = customerOrders.reduce(
          (sum, order) =>
            sum + resolveReportFinancials(order, financials).balance,
          0
        );
        const oldestDue = customerOrders
          .map((order) => parseISO(order.inHandsDate))
          .sort((a, b) => a.getTime() - b.getTime())[0];

        return {
          company: customer.company,
          contact: formatCustomerFullName(customer),
          openBalanceValue: openBalance,
          openBalance: formatCurrency(openBalance),
          ordersWithBalance: customerOrders.length,
          oldestDueDate: oldestDue ? format(oldestDue, "MMM d, yyyy") : "",
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.openBalanceValue - a.openBalanceValue)
      .map(({ openBalanceValue: _omit, ...row }) => row);

    return buildResult(
      customersOpenBalancesReport,
      [
        { key: "company", label: "Company" },
        { key: "contact", label: "Contact" },
        { key: "openBalance", label: "Open balance", align: "right" },
        {
          key: "ordersWithBalance",
          label: "Orders with balance",
          align: "right",
        },
        { key: "oldestDueDate", label: "Oldest due date" },
      ],
      rows,
      "customers-open-balances"
    );
  },
};

const allCustomerOrdersReport: ReportDefinition<ShopReportData> = {
  id: "all-customer-orders",
  title: "All customer orders",
  description: "Every order across your customer base — status, due dates, and totals.",
  category: "Orders",
  contexts: ["customers_list"],
  run: ({ orders, financials }) =>
    buildResult(
      allCustomerOrdersReport,
      [
        { key: "orderNumber", label: "Order #" },
        { key: "company", label: "Company" },
        { key: "contact", label: "Contact" },
        { key: "type", label: "Type" },
        { key: "status", label: "Status" },
        { key: "inHandsDate", label: "In-hands date" },
        { key: "createdAt", label: "Created" },
        { key: "total", label: "Total", align: "right" },
        { key: "balance", label: "Balance", align: "right" },
        { key: "rush", label: "Rush" },
      ],
      [...orders]
        .sort(
          (a, b) =>
            parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime()
        )
        .map((order) => {
          const amounts = resolveReportFinancials(order, financials);
          return {
            orderNumber: formatOrderDisplayLine(order),
            company: order.company,
            contact: order.customerName,
            type: documentTypeLabel(order.type),
            status: orderStatusLabel(order.status),
            inHandsDate: formatDate(order.inHandsDate),
            createdAt: formatDate(order.createdAt),
            total: formatCurrency(amounts.total),
            balance: formatCurrency(amounts.balance),
            rush: order.rush ? "Yes" : "No",
          };
        }),
      "all-customer-orders"
    ),
};

const orderHistoryReport: ReportDefinition<CustomerDetailReportData> = {
  id: "order-history",
  title: "Order history",
  description: "Complete order list for this customer with totals and balances.",
  category: "Orders",
  contexts: ["customer_detail"],
  run: ({ customer, orders, financials }) =>
    buildResult(
      orderHistoryReport,
      [
        { key: "orderNumber", label: "Order #" },
        { key: "type", label: "Type" },
        { key: "status", label: "Status" },
        { key: "jobs", label: "Events" },
        { key: "inHandsDate", label: "In-hands date" },
        { key: "createdAt", label: "Created" },
        { key: "total", label: "Total", align: "right" },
        { key: "paid", label: "Paid", align: "right" },
        { key: "balance", label: "Balance", align: "right" },
        { key: "rush", label: "Rush" },
      ],
      [...orders]
        .sort(
          (a, b) =>
            parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime()
        )
        .map((order) => {
          const amounts = resolveReportFinancials(order, financials);
          return {
            orderNumber: formatOrderDisplayLine(order),
            type: documentTypeLabel(order.type),
            status: orderStatusLabel(order.status),
            jobs:
              order.jobs.length > 0
                ? order.jobs.map((job) => job.name).join("; ")
                : "—",
            inHandsDate: formatDate(order.inHandsDate),
            createdAt: formatDate(order.createdAt),
            total: formatCurrency(amounts.total),
            paid: formatCurrency(amounts.paid),
            balance: formatCurrency(amounts.balance),
            rush: order.rush ? "Yes" : "No",
          };
        }),
      `${slugifyFilename(customer.company)}-order-history`
    ),
};

const pastDueOrdersReport: ReportDefinition<CustomerDetailReportData> = {
  id: "past-due-orders",
  title: "Past due orders",
  description: "Open orders past their in-hands date that still need attention.",
  category: "Orders",
  contexts: ["customer_detail"],
  run: ({ customer, orders, financials }) => {
    const today = startOfDay(new Date());
    const pastDue = orders.filter((order) => isPastDue(order, today));

    return buildResult(
      pastDueOrdersReport,
      [
        { key: "orderNumber", label: "Order #" },
        { key: "status", label: "Status" },
        { key: "jobs", label: "Events" },
        { key: "inHandsDate", label: "In-hands date" },
        { key: "daysPastDue", label: "Days past due", align: "right" },
        { key: "balance", label: "Balance", align: "right" },
      ],
      pastDue
        .sort(
          (a, b) =>
            parseISO(a.inHandsDate).getTime() -
            parseISO(b.inHandsDate).getTime()
        )
        .map((order) => {
          const amounts = resolveReportFinancials(order, financials);
          const daysPastDue = Math.max(
            0,
            Math.floor(
              (today.getTime() - parseISO(order.inHandsDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          );
          return {
            orderNumber: formatOrderDisplayLine(order),
            status: orderStatusLabel(order.status),
            jobs: order.jobs.map((job) => job.name).join("; "),
            inHandsDate: formatDate(order.inHandsDate),
            daysPastDue,
            balance: formatCurrency(amounts.balance),
          };
        }),
      `${slugifyFilename(customer.company)}-past-due-orders`
    );
  },
};

const openBalancesReport: ReportDefinition<CustomerDetailReportData> = {
  id: "open-balances",
  title: "Open balances",
  description: "Orders with an outstanding balance for this customer.",
  category: "Billing",
  contexts: ["customer_detail"],
  run: ({ customer, orders, financials }) =>
    buildResult(
      openBalancesReport,
      [
        { key: "orderNumber", label: "Order #" },
        { key: "status", label: "Status" },
        { key: "inHandsDate", label: "In-hands date" },
        { key: "total", label: "Total", align: "right" },
        { key: "paid", label: "Paid", align: "right" },
        { key: "balance", label: "Balance due", align: "right" },
      ],
      orders
        .map((order) => ({
          order,
          amounts: resolveReportFinancials(order, financials),
        }))
        .filter(({ amounts }) => amounts.balance > 0)
        .sort((a, b) => b.amounts.balance - a.amounts.balance)
        .map(({ order, amounts }) => ({
          orderNumber: formatOrderDisplayLine(order),
          status: orderStatusLabel(order.status),
          inHandsDate: formatDate(order.inHandsDate),
          total: formatCurrency(amounts.total),
          paid: formatCurrency(amounts.paid),
          balance: formatCurrency(amounts.balance),
        })),
      `${slugifyFilename(customer.company)}-open-balances`
    ),
};

const mostCommonBlanksReport: ReportDefinition<CustomerDetailReportData> = {
  id: "most-common-blanks",
  title: "Most common blanks",
  description: "Garments and products this customer orders most often, ranked by quantity.",
  category: "Products",
  contexts: ["customer_detail"],
  run: ({ customer, orders }) => {
    const totals = new Map<
      string,
      {
        productName: string;
        brand: string;
        color: string;
        quantity: number;
        orderCount: number;
        orderNumbers: Set<string>;
      }
    >();

    for (const order of orders) {
      for (const item of order.lineItems) {
        const key = `${item.brand}|${item.productName}|${item.color}`;
        const qty = lineItemQuantity(item);
        const existing = totals.get(key);
        if (existing) {
          existing.quantity += qty;
          existing.orderNumbers.add(order.number);
          existing.orderCount = existing.orderNumbers.size;
        } else {
          totals.set(key, {
            productName: item.productName,
            brand: item.brand,
            color: item.color,
            quantity: qty,
            orderCount: 1,
            orderNumbers: new Set([order.number]),
          });
        }
      }
    }

    const rows = [...totals.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .map((row, index) => ({
        rank: index + 1,
        productName: row.productName,
        brand: row.brand,
        color: row.color,
        totalQuantity: row.quantity,
        orderCount: row.orderCount,
      }));

    return buildResult(
      mostCommonBlanksReport,
      [
        { key: "rank", label: "Rank", align: "right" },
        { key: "productName", label: "Product" },
        { key: "brand", label: "Brand" },
        { key: "color", label: "Color" },
        { key: "totalQuantity", label: "Total qty", align: "right" },
        { key: "orderCount", label: "Orders used on", align: "right" },
      ],
      rows,
      `${slugifyFilename(customer.company)}-most-common-blanks`
    );
  },
};

const lineItemDetailReport: ReportDefinition<CustomerDetailReportData> = {
  id: "line-item-detail",
  title: "Line item detail",
  description: "Every blank and product line across all orders for this customer.",
  category: "Products",
  contexts: ["customer_detail"],
  run: ({ customer, orders }) =>
    buildResult(
      lineItemDetailReport,
      [
        { key: "orderNumber", label: "Order #" },
        { key: "orderDate", label: "Order date" },
        { key: "productName", label: "Product" },
        { key: "brand", label: "Brand" },
        { key: "color", label: "Color" },
        { key: "sizes", label: "Size breakdown" },
        { key: "quantity", label: "Qty", align: "right" },
        { key: "unitCost", label: "Unit cost", align: "right" },
      ],
      orders.flatMap((order) =>
        order.lineItems.map((item) => ({
          orderNumber: formatOrderDisplayLine(order),
          orderDate: formatDate(order.createdAt),
          productName: item.productName,
          brand: item.brand,
          color: item.color,
          sizes: sizeBreakdown(item),
          quantity: lineItemQuantity(item),
          unitCost: formatCurrency(item.unitCost),
        }))
      ),
      `${slugifyFilename(customer.company)}-line-items`
    ),
};

const productionJobsReport: ReportDefinition<CustomerDetailReportData> = {
  id: "production-jobs",
  title: "Production events",
  description: "Decoration events with methods and order status for this customer.",
  category: "Production",
  contexts: ["customer_detail"],
  run: ({ customer, orders }) =>
    buildResult(
      productionJobsReport,
      [
        { key: "orderNumber", label: "Order #" },
        { key: "orderStatus", label: "Order status" },
        { key: "jobName", label: "Event" },
        { key: "decorations", label: "Decorations" },
        { key: "locations", label: "Locations" },
        { key: "inHandsDate", label: "In-hands date" },
        { key: "rush", label: "Rush" },
      ],
      orders.flatMap((order) =>
        order.jobs.map((job) => ({
          orderNumber: formatOrderDisplayLine(order),
          orderStatus: orderStatusLabel(order.status),
          jobName: job.name,
          decorations: [
            ...new Set(job.imprints.map((imprint) => decorationLabel(imprint.decoration))),
          ].join("; "),
          locations: job.imprints.map((imprint) => imprint.label).join("; "),
          inHandsDate: formatDate(order.inHandsDate),
          rush: order.rush ? "Yes" : "No",
        }))
      ),
      `${slugifyFilename(customer.company)}-production-jobs`
    ),
};

function summarizeLineItems(order: Order): string {
  if (order.lineItems.length === 0) return "";
  return order.lineItems
    .map((item) => {
      const qty = lineItemQuantity(item);
      return `${item.brand} ${item.productName} (${item.color}) ×${qty} [${sizeBreakdown(item)}]`;
    })
    .join("; ");
}

function summarizeJobs(order: Order): string {
  if (order.jobs.length === 0) return "";
  return order.jobs.map((job) => job.name).join("; ");
}

function summarizeProduction(order: Order): string {
  if (order.jobs.length === 0) return "";
  return order.jobs
    .flatMap((job) =>
      job.imprints.map(
        (imprint) =>
          `${job.name}: ${decorationLabel(imprint.decoration)} @ ${imprint.label}`
      )
    )
    .join("; ");
}

function summarizeInternalNotes(order: Order): string {
  if (!order.internalNotes?.length) return "";
  return order.internalNotes
    .map((note) => `${note.author}: ${note.content}`)
    .join(" | ");
}

function summarizeOrderFiles(order: Order): string {
  if (!order.files?.length) return "";
  return order.files.map((file) => file.name).join("; ");
}

function summarizeMessages(order: Order): string {
  if (!order.messages?.length) return "";
  return order.messages
    .map((msg) => `${msg.author} (${msg.role}): ${msg.content}`)
    .join(" | ");
}

function summarizeShipments(order: Order): string {
  if (!order.shipments?.length) return "";
  return order.shipments
    .map(
      (shipment) =>
        `${shipment.method} → ${shipment.destination} (${shipment.status}${shipment.trackingNumber ? `, ${shipment.trackingNumber}` : ""})`
    )
    .join("; ");
}

function customerBaseRow(customer: Customer) {
  return {
    customerId: customer.id,
    company: customer.company,
    firstName: customer.firstName ?? customer.name.split(" ")[0] ?? "",
    lastName:
      customer.lastName ?? customer.name.split(" ").slice(1).join(" ") ?? "",
    contactName: formatCustomerFullName(customer),
    email: customer.email,
    phone: customer.phone,
    city: customer.city,
    state: customer.state,
    customerSince: customer.customerSince
      ? formatDate(customer.customerSince)
      : "",
    customerNotes: customer.notes ?? "",
    customerTotalOrders: customer.totalOrders,
    customerLifetimeValue: formatCurrency(customer.lifetimeValue),
  };
}

const completeCustomerExportReport: ReportDefinition<ShopReportData> = {
  id: "complete-customer-export",
  title: "Complete customer export",
  description:
    "Full shop export — every customer with notes, metadata, and all associated order details in one file.",
  category: "Export",
  contexts: ["customers_list", "reports_hub"],
  run: ({ customers, orders, financials }) => {
    const rows: ReportResult["rows"] = [];

    for (const customer of customers) {
      const customerOrders = orders.filter(
        (order) => order.customerId === customer.id
      );
      const base = customerBaseRow(customer);

      if (customerOrders.length === 0) {
        rows.push({
          ...base,
          orderId: "",
          orderNumber: "",
          orderType: "",
          orderStatus: "",
          orderCreated: "",
          inHandsDate: "",
          subtotal: "",
          tax: "",
          total: "",
          paid: "",
          balance: "",
          rush: "",
          jobs: "",
          lineItems: "",
          productionDetails: "",
          internalNotes: "",
          orderFiles: "",
          messages: "",
          shipments: "",
        });
        continue;
      }

      for (const order of customerOrders) {
        const amounts = resolveReportFinancials(order, financials);
        rows.push({
          ...base,
          orderId: order.id,
          orderNumber: formatOrderDisplayLine(order),
          orderType: documentTypeLabel(order.type),
          orderStatus: orderStatusLabel(order.status),
          orderCreated: formatDate(order.createdAt),
          inHandsDate: formatDate(order.inHandsDate),
          subtotal: formatCurrency(amounts.subtotal),
          tax: formatCurrency(amounts.tax),
          total: formatCurrency(amounts.total),
          paid: formatCurrency(amounts.paid),
          balance: formatCurrency(amounts.balance),
          rush: order.rush ? "Yes" : "No",
          jobs: summarizeJobs(order),
          lineItems: summarizeLineItems(order),
          productionDetails: summarizeProduction(order),
          internalNotes: summarizeInternalNotes(order),
          orderFiles: summarizeOrderFiles(order),
          messages: summarizeMessages(order),
          shipments: summarizeShipments(order),
        });
      }
    }

    return buildResult(
      completeCustomerExportReport,
      [
        { key: "customerId", label: "Customer ID" },
        { key: "company", label: "Company" },
        { key: "firstName", label: "First name" },
        { key: "lastName", label: "Last name" },
        { key: "contactName", label: "Full name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "city", label: "City" },
        { key: "state", label: "State" },
        { key: "customerSince", label: "Customer since" },
        { key: "customerNotes", label: "Customer notes" },
        { key: "customerTotalOrders", label: "Customer total orders", align: "right" },
        { key: "customerLifetimeValue", label: "Customer lifetime value", align: "right" },
        { key: "orderId", label: "Order ID" },
        { key: "orderNumber", label: "Order #" },
        { key: "orderType", label: "Order type" },
        { key: "orderStatus", label: "Order status" },
        { key: "orderCreated", label: "Order created" },
        { key: "inHandsDate", label: "In-hands date" },
        { key: "subtotal", label: "Subtotal", align: "right" },
        { key: "tax", label: "Tax", align: "right" },
        { key: "total", label: "Total", align: "right" },
        { key: "paid", label: "Paid", align: "right" },
        { key: "balance", label: "Balance", align: "right" },
        { key: "rush", label: "Rush" },
        { key: "jobs", label: "Events" },
        { key: "lineItems", label: "Line items" },
        { key: "productionDetails", label: "Production details" },
        { key: "internalNotes", label: "Internal notes" },
        { key: "orderFiles", label: "Order files" },
        { key: "messages", label: "Messages" },
        { key: "shipments", label: "Shipments" },
      ],
      rows,
      "complete-customer-export"
    );
  },
};

const customerProfilesExportReport: ReportDefinition<ShopReportData> = {
  id: "customer-profiles-export",
  title: "Customer profiles",
  description:
    "One row per customer — contact info, notes, and a summary of their order history.",
  category: "Export",
  contexts: ["customers_list", "reports_hub"],
  run: ({ customers, orders, financials }) =>
    buildResult(
      customerProfilesExportReport,
      [
        { key: "customerId", label: "Customer ID" },
        { key: "company", label: "Company" },
        { key: "firstName", label: "First name" },
        { key: "lastName", label: "Last name" },
        { key: "contactName", label: "Full name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "city", label: "City" },
        { key: "state", label: "State" },
        { key: "customerSince", label: "Customer since" },
        { key: "notes", label: "Notes" },
        { key: "totalOrders", label: "Total orders", align: "right" },
        { key: "lifetimeValue", label: "Lifetime value", align: "right" },
        { key: "openBalance", label: "Open balance", align: "right" },
        { key: "orderNumbers", label: "Order numbers" },
        { key: "activeOrderCount", label: "Active orders", align: "right" },
      ],
      customers.map((customer) => {
        const customerOrders = orders.filter(
          (order) => order.customerId === customer.id
        );
        const openBalance = customerOrders.reduce(
          (sum, order) =>
            sum + resolveReportFinancials(order, financials).balance,
          0
        );
        const lifetimeValue = customerOrders.reduce(
          (sum, order) =>
            sum + resolveReportFinancials(order, financials).total,
          0
        );
        const activeCount = customerOrders.filter(
          (order) => !DONE_STATUSES.includes(order.status)
        ).length;

        return {
          customerId: customer.id,
          company: customer.company,
          firstName: customer.firstName ?? customer.name.split(" ")[0] ?? "",
          lastName:
            customer.lastName ??
            customer.name.split(" ").slice(1).join(" ") ??
            "",
          contactName: formatCustomerFullName(customer),
          email: customer.email,
          phone: customer.phone,
          city: customer.city,
          state: customer.state,
          customerSince: customer.customerSince
            ? formatDate(customer.customerSince)
            : "",
          notes: customer.notes ?? "",
          totalOrders: customerOrders.length,
          lifetimeValue: formatCurrency(lifetimeValue),
          openBalance: formatCurrency(openBalance),
          orderNumbers: customerOrders.map((order) => formatOrderDisplayLine(order)).join("; "),
          activeOrderCount: activeCount,
        };
      }),
      "customer-profiles"
    ),
};

export const CUSTOMER_LIST_REPORTS: ReportDefinition<ShopReportData>[] =
  [
    completeCustomerExportReport,
    customerProfilesExportReport,
    customerDirectoryReport,
    customersOpenBalancesReport,
    allCustomerOrdersReport,
  ];

export const REPORTS_HUB_REPORTS: ReportDefinition<ShopReportData>[] =
  CUSTOMER_LIST_REPORTS;

export const CUSTOMER_DETAIL_REPORTS: ReportDefinition<CustomerDetailReportData>[] =
  [
    orderHistoryReport,
    pastDueOrdersReport,
    openBalancesReport,
    mostCommonBlanksReport,
    lineItemDetailReport,
    productionJobsReport,
  ];

export function runReport<TData>(
  report: ReportDefinition<TData>,
  data: TData
): ReportResult {
  const normalized = normalizeReportData(data);
  return report.run(normalized);
}

function normalizeReportData<TData>(data: TData): TData {
  if (!data || typeof data !== "object" || !("orders" in data)) {
    return data;
  }

  const withOrders = data as { orders?: Order[] };
  if (!Array.isArray(withOrders.orders)) {
    return data;
  }

  return {
    ...(data as object),
    orders: excludeArchivedOrders(withOrders.orders),
  } as TData;
}
