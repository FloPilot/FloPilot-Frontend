import type { OrderListScope } from "@/lib/order-list-filters";

export type OrdersListColumnId =
  | "order"
  | "customer"
  | "in_hands"
  | "created"
  | "total"
  | "balance"
  | "paid"
  | "subtotal"
  | "tax"
  | "piece_count"
  | "rush"
  | "decoration"
  | "contact_email"
  | "proofs"
  | "ink"
  | "screens"
  | "blanks"
  | "dtf"
  | "goods_source"
  | "scheduled"
  | "production"
  | "order_status"
  | "estimate_status"
  | "job_type";

export type OrdersListColumnGroup =
  | "order"
  | "financial"
  | "production"
  | "status";

export type OrdersListColumnDef = {
  id: OrdersListColumnId;
  label: string;
  group: OrdersListColumnGroup;
  description?: string;
  minWidth: string;
  productionOnly?: boolean;
  sticky?: boolean;
};

export const ORDERS_LIST_COLUMN_DEFS: OrdersListColumnDef[] = [
  {
    id: "order",
    label: "Order",
    group: "order",
    minWidth: "132px",
    sticky: true,
  },
  {
    id: "customer",
    label: "Customer",
    group: "order",
    minWidth: "160px",
    sticky: true,
  },
  {
    id: "in_hands",
    label: "In-hands",
    group: "order",
    minWidth: "108px",
  },
  {
    id: "created",
    label: "Created",
    group: "order",
    minWidth: "108px",
  },
  {
    id: "piece_count",
    label: "Pieces",
    group: "order",
    minWidth: "80px",
  },
  {
    id: "rush",
    label: "Rush",
    group: "order",
    minWidth: "72px",
  },
  {
    id: "decoration",
    label: "Decoration",
    group: "order",
    minWidth: "140px",
  },
  {
    id: "contact_email",
    label: "Contact email",
    group: "order",
    minWidth: "180px",
  },
  {
    id: "total",
    label: "Total",
    group: "financial",
    minWidth: "92px",
  },
  {
    id: "balance",
    label: "Balance",
    group: "financial",
    minWidth: "92px",
  },
  {
    id: "paid",
    label: "Paid",
    group: "financial",
    minWidth: "92px",
  },
  {
    id: "subtotal",
    label: "Subtotal",
    group: "financial",
    minWidth: "92px",
  },
  {
    id: "tax",
    label: "Tax",
    group: "financial",
    minWidth: "80px",
  },
  {
    id: "proofs",
    label: "Proofs",
    group: "production",
    minWidth: "108px",
    productionOnly: true,
  },
  {
    id: "ink",
    label: "Ink",
    group: "production",
    minWidth: "88px",
    productionOnly: true,
  },
  {
    id: "screens",
    label: "Screens",
    group: "production",
    minWidth: "96px",
    productionOnly: true,
  },
  {
    id: "blanks",
    label: "Blanks / Garments",
    group: "production",
    minWidth: "108px",
    productionOnly: true,
  },
  {
    id: "dtf",
    label: "DTF",
    group: "production",
    minWidth: "88px",
    productionOnly: true,
  },
  {
    id: "goods_source",
    label: "Goods source",
    group: "production",
    minWidth: "120px",
    productionOnly: true,
  },
  {
    id: "scheduled",
    label: "Scheduled",
    group: "production",
    minWidth: "108px",
    productionOnly: true,
  },
  {
    id: "production",
    label: "Production",
    group: "production",
    minWidth: "108px",
    productionOnly: true,
  },
  {
    id: "order_status",
    label: "Order status",
    group: "status",
    minWidth: "120px",
  },
  {
    id: "estimate_status",
    label: "Estimate status",
    group: "status",
    minWidth: "128px",
  },
  {
    id: "job_type",
    label: "Job type",
    group: "status",
    minWidth: "140px",
  },
];

export const DEFAULT_ORDERS_LIST_COLUMNS: OrdersListColumnId[] = [
  "order",
  "customer",
  "in_hands",
  "total",
  "order_status",
  "estimate_status",
  "proofs",
  "ink",
  "screens",
  "blanks",
  "dtf",
  "goods_source",
  "scheduled",
  "production",
  "job_type",
];

const COLUMN_DEF_MAP = new Map(
  ORDERS_LIST_COLUMN_DEFS.map((def) => [def.id, def])
);

export function getOrdersListColumnDef(id: OrdersListColumnId) {
  return COLUMN_DEF_MAP.get(id);
}

export function normalizeOrdersListColumns(
  input?: OrdersListColumnId[] | null
): OrdersListColumnId[] {
  const allowed = new Set(ORDERS_LIST_COLUMN_DEFS.map((def) => def.id));
  const seen = new Set<OrdersListColumnId>();
  const columns: OrdersListColumnId[] = [];

  for (const raw of input || DEFAULT_ORDERS_LIST_COLUMNS) {
    if (!allowed.has(raw) || seen.has(raw)) continue;
    seen.add(raw);
    columns.push(raw);
  }

  if (!columns.includes("order")) {
    return ["order", ...columns];
  }

  return ["order", ...columns.filter((id) => id !== "order")];
}

/** Default view always uses the app default layout, not stale server columns. */
export function resolveActiveOrdersListColumns(
  activeViewId: string | null,
  activeColumns?: OrdersListColumnId[] | null
): OrdersListColumnId[] {
  if (!activeViewId) {
    return normalizeOrdersListColumns(DEFAULT_ORDERS_LIST_COLUMNS);
  }
  return normalizeOrdersListColumns(activeColumns);
}

export function resolveOrdersListColumnsForScope(
  columns: OrdersListColumnId[],
  scope: OrderListScope
): OrdersListColumnId[] {
  const showProduction = scope !== "historical" && scope !== "archived";
  return normalizeOrdersListColumns(columns).filter((id) => {
    const def = getOrdersListColumnDef(id);
    if (!def) return false;
    if (def.productionOnly && !showProduction) return false;
    return true;
  });
}

export function inHandsColumnLabel(scope: OrderListScope): string {
  return scope === "historical" ? "Completed" : "In-hands";
}

export type OrderListViewRecord = {
  id: string;
  name: string;
  columns: OrdersListColumnId[];
  shared: boolean;
  ownerUserId: string;
  ownerName: string;
  createdAt?: string;
  updatedAt?: string;
  isOwner?: boolean;
};

export type OrderListViewsState = {
  views: OrderListViewRecord[];
  activeViewId: string | null;
  activeColumns: OrdersListColumnId[];
  defaultColumns: OrdersListColumnId[];
};

export const ORDERS_LIST_COLUMN_GROUP_LABELS: Record<
  OrdersListColumnGroup,
  string
> = {
  order: "Order info",
  financial: "Financial",
  production: "Production checkpoints",
  status: "Status",
};
