import { format, parseISO } from "date-fns";
import { formatCurrency, formatDate } from "@/lib/format";
import { buildResult } from "@/lib/reports/report-utils";
import type { ReportDefinition } from "@/lib/reports/types";
import type { ShopReportData } from "@/lib/reports/shop-report-data";

const teamRosterReport: ReportDefinition<ShopReportData> = {
  id: "team-roster",
  title: "Team roster",
  description: "All team members with role, email, and account status.",
  category: "Team",
  contexts: ["reports_hub"],
  run: ({ teamMembers }) =>
    buildResult(
      teamRosterReport,
      [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "role", label: "Role" },
        { key: "status", label: "Status" },
        { key: "joined", label: "Joined" },
      ],
      teamMembers.map((member) => ({
        name: member.name,
        email: member.email,
        role: member.role,
        status: member.status ?? "active",
        joined: member.createdAt ? formatDate(member.createdAt) : "",
      })),
      "team-roster"
    ),
};

const inventoryStatusReport: ReportDefinition<ShopReportData> = {
  id: "inventory-status",
  title: "Inventory status",
  description: "On-hand quantities, reorder points, and stock health per SKU.",
  category: "Inventory",
  contexts: ["reports_hub"],
  run: ({ inventory }) =>
    buildResult(
      inventoryStatusReport,
      [
        { key: "name", label: "Item" },
        { key: "sku", label: "SKU" },
        { key: "warehouse", label: "Warehouse" },
        { key: "onHand", label: "On hand", align: "right" },
        { key: "reorderAt", label: "Reorder at", align: "right" },
        { key: "status", label: "Status" },
      ],
      inventory.map((item) => ({
        name: item.name,
        sku: item.sku,
        warehouse: item.warehouse,
        onHand: item.onHand,
        reorderAt: item.reorderAt,
        status:
          item.onHand <= 0
            ? "Out of stock"
            : item.onHand <= item.reorderAt
              ? "Low stock"
              : "In stock",
      })),
      "inventory-status"
    ),
};

const lowStockReport: ReportDefinition<ShopReportData> = {
  id: "low-stock",
  title: "Low stock items",
  description: "SKUs at or below their reorder point.",
  category: "Inventory",
  contexts: ["reports_hub"],
  run: ({ inventory }) => {
    const rows = inventory
      .filter((item) => item.onHand <= item.reorderAt)
      .map((item) => ({
        name: item.name,
        sku: item.sku,
        warehouse: item.warehouse,
        onHand: item.onHand,
        reorderAt: item.reorderAt,
        shortBy: Math.max(0, item.reorderAt - item.onHand),
      }));

    return buildResult(
      lowStockReport,
      [
        { key: "name", label: "Item" },
        { key: "sku", label: "SKU" },
        { key: "warehouse", label: "Warehouse" },
        { key: "onHand", label: "On hand", align: "right" },
        { key: "reorderAt", label: "Reorder at", align: "right" },
        { key: "shortBy", label: "Short by", align: "right" },
      ],
      rows,
      "low-stock"
    );
  },
};

const purchaseOrdersReport: ReportDefinition<ShopReportData> = {
  id: "purchase-orders",
  title: "Purchase orders",
  description: "PO status, vendor, totals, and line item counts.",
  category: "Inventory",
  contexts: ["reports_hub"],
  run: ({ purchaseOrders }) =>
    buildResult(
      purchaseOrdersReport,
      [
        { key: "number", label: "PO #" },
        { key: "vendor", label: "Vendor" },
        { key: "status", label: "Status" },
        { key: "orderedAt", label: "Ordered" },
        { key: "expectedAt", label: "Expected" },
        { key: "lineItems", label: "Lines", align: "right" },
        { key: "total", label: "Total", align: "right" },
        { key: "notes", label: "Notes" },
      ],
      purchaseOrders.map((po) => ({
        number: po.number,
        vendor: po.supplier,
        status: po.status,
        orderedAt: po.orderedAt
          ? format(parseISO(po.orderedAt), "MMM d, yyyy")
          : "",
        expectedAt: po.receivedAt
          ? format(parseISO(po.receivedAt), "MMM d, yyyy")
          : "",
        lineItems: po.lineItems.length,
        total: formatCurrency(po.total),
        notes: po.notes ?? "",
      })),
      "purchase-orders"
    ),
};

export const OPERATIONS_REPORTS: ReportDefinition<ShopReportData>[] = [
  teamRosterReport,
  inventoryStatusReport,
  lowStockReport,
  purchaseOrdersReport,
];
